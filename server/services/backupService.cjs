const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const Student = require('../models/Student.cjs');
const Teacher = require('../models/Teacher.cjs');
const FeeSettings = require('../models/FeeSettings.cjs');
const Expenditure = require('../models/Expenditure.cjs');
const WorkerPayment = require('../models/WorkerPayment.cjs');
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');

const { uploadBackupFile, listBackupFiles, downloadBackupFile, cleanupOldBackups } = require('./googleDriveService.cjs');

// No fallback literal. If this were allowed to default, a deployment missing
// the env var would silently encrypt every backup of the entire database with
// a key published in a public repository — the backups would be readable by
// anyone who obtained the file.
const BACKUP_KEY_RAW = process.env.BACKUP_ENCRYPTION_KEY;
if (!BACKUP_KEY_RAW || BACKUP_KEY_RAW.length < 32) {
  throw new Error('BACKUP_ENCRYPTION_KEY is not configured (or is shorter than 32 characters). Refusing to start.');
}
const ENCRYPTION_KEY = crypto.scryptSync(BACKUP_KEY_RAW, 'inspire-erp-salt-2026', 32);

// Local encrypted backup storage directory
const LOCAL_BACKUP_DIR = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? path.join('/tmp', 'backups')
  : path.join(__dirname, '../backups');

try {
  if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.warn('⚠️ [BackupService]: Safe notice - Could not create local backup directory:', dirErr.message);
}

// How many local encrypted copies to keep. These are a convenience for
// recovery when Drive is unreachable; Drive remains the system of record, so
// a deep local history buys little and costs disk on a shared host.
const LOCAL_BACKUP_KEEP = Number(process.env.LOCAL_BACKUP_KEEP) || 5;

/** Keeps the newest LOCAL_BACKUP_KEEP encrypted copies and deletes the rest. */
function pruneLocalBackups(keep = LOCAL_BACKUP_KEEP) {
  try {
    const files = fs.readdirSync(LOCAL_BACKUP_DIR)
      .filter(f => f.startsWith('inspire-erp-backup-') && f.endsWith('.json.enc'))
      .map(f => {
        const full = path.join(LOCAL_BACKUP_DIR, f);
        return { full, name: f, mtime: fs.statSync(full).mtimeMs };
      })
      // Newest first. Sorting explicitly rather than trusting readdir order,
      // because getting this backwards deletes the recent copies and keeps
      // the useless old ones.
      .sort((a, b) => b.mtime - a.mtime);

    let removed = 0;
    for (const stale of files.slice(keep)) {
      fs.unlinkSync(stale.full);
      removed++;
    }
    if (removed) console.log(`[BackupService]: Pruned ${removed} local backup copy(ies), keeping ${keep}.`);
    return removed;
  } catch (err) {
    console.warn('⚠️ [BackupService]: Local backup prune skipped:', err.message);
    return 0;
  }
}

// Retrievable backup audit log memory
const backupLogs = [];

function addBackupLog(entry) {
  const logItem = {
    timestamp: new Date().toISOString(),
    ...entry
  };
  backupLogs.unshift(logItem);
  if (backupLogs.length > 50) backupLogs.pop();
  console.log(`📦 [Backup Audit Log]: [${logItem.type || 'INFO'}] ${logItem.message}`);
}

function getBackupLogs() {
  return backupLogs;
}

/**
 * Encrypts plain text string using AES-256-GCM
 */
function encryptPayload(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag,
    ciphertext: encrypted
  });
}

/**
 * Decrypts AES-256-GCM encrypted payload
 */
function decryptPayload(encryptedJsonString) {
  let parsed;
  try {
    parsed = typeof encryptedJsonString === 'string' ? JSON.parse(encryptedJsonString) : encryptedJsonString;
  } catch {
    throw new Error('Invalid encrypted backup file format. Expected JSON containing ciphertext.');
  }

  const { iv, authTag, ciphertext } = parsed;
  if (!iv || !authTag || !ciphertext) {
    throw new Error('Encrypted backup payload is corrupted or missing decryption tokens (iv/authTag/ciphertext).');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

/**
 * Performs full database backup, encrypts payload, uploads directly to Google Drive.
 * SURFACES REAL DRIVE FAILURES explicitly per Step 1 requirement 4.
 */
/**
 * Everything a backup contains, read from the database.
 *
 * Separate from uploading it so the payload can be built and inspected
 * without Google Drive — which is what makes the restore path testable at
 * all. Credentials are excluded: a backup is copied to a third party, and a
 * password file that travels with it is a password file published.
 */
async function buildBackupPayload(triggeredBy = 'system') {
  const [students, teachers, feeSettings, expenditures, workerPayments, payments, users] =
    await Promise.all([
      Student.find({}), Teacher.find({}), FeeSettings.find({}),
      Expenditure.find({}), WorkerPayment.find({}), Payment.find({}),
      User.find({}).select('-password -pin')
    ]);

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    triggeredBy,
    collections: { students, teachers, feeSettings, expenditures, workerPayments, payments, users }
  };
}

async function generateAndUploadBackup(triggeredBy = 'system') {
  console.log(`📦 Starting system database backup triggered by [${triggeredBy}]...`);

  const backupData = await buildBackupPayload(triggeredBy);
  const serializedJson = JSON.stringify(backupData);
  const encryptedPayload = encryptPayload(serializedJson);

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `inspire-erp-backup-${dateStr}-${Date.now().toString().slice(-6)}.json.enc`;

  // Save encrypted copy locally if storage directory is writable, then prune.
  //
  // The prune is the point: this wrote a file on every run and never removed
  // one. Drive had a retention policy, local disk had none, so the directory
  // grew forever. On a shared host a full disk takes the whole site down, and
  // it does it in a way that looks like a mystery outage rather than a full
  // disk — which is the same class of failure this app has already had twice.
  try {
    const localFilePath = path.join(LOCAL_BACKUP_DIR, fileName);
    fs.writeFileSync(localFilePath, encryptedPayload, 'utf-8');
    pruneLocalBackups();
  } catch (localWriteErr) {
    console.warn('⚠️ [BackupService]: Safe notice - local backup file write skipped:', localWriteErr.message);
  }

  // Attempt Google Drive Upload - SURFACES ERRORS DIRECTLY IF DRIVE FAILS
  try {
    const driveResult = await uploadBackupFile(fileName, encryptedPayload);
    if (!driveResult || !driveResult.id) {
      throw new Error('Google Drive upload API returned no file ID.');
    }

    await cleanupOldBackups(24);

    addBackupLog({
      type: 'BACKUP_CREATED',
      triggeredBy,
      fileName,
      driveFileId: driveResult.id,
      driveUploaded: true,
      sizeBytes: driveResult.size || encryptedPayload.length,
      message: `Encrypted backup [${fileName}] uploaded to Google Drive successfully (Drive File ID: ${driveResult.id}).`
    });

    return {
      success: true,
      fileName,
      driveFileId: driveResult.id,
      driveUploaded: true,
      timestamp: backupData.timestamp,
      recordCounts: {
        students: students.length,
        teachers: teachers.length,
        feeSettings: feeSettings.length,
        expenditures: expenditures.length,
        workerPayments: workerPayments.length,
        payments: payments.length,
        users: users.length
      }
    };
  } catch (driveErr) {
    const errorMsg = `Google Drive upload failed: ${driveErr.message}`;
    addBackupLog({
      type: 'BACKUP_FAILED',
      triggeredBy,
      fileName,
      message: errorMsg
    });

    const err = new Error(errorMsg);
    err.status = 502;
    throw err;
  }
}

/**
 * Lists all available backup files directly from Google Drive API.
 */
async function getAllAvailableBackupFiles() {
  const driveFiles = await listBackupFiles();
  return driveFiles.map(f => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    size: f.size,
    source: 'Google Drive'
  }));
}

/**
 * Wipes data collections (Student, Teacher, FeeSettings, Expenditure, WorkerPayment, Payment).
 * Preserves User collection.
 */
async function wipeDataCollections(triggeredBy = 'authenticator') {
  try {
    console.log(`⚠️ [DATABASE WIPE]: Initiated by [${triggeredBy}]...`);

    const studentResult = await Student.deleteMany({});
    const teacherResult = await Teacher.deleteMany({});
    const feeSettingsResult = await FeeSettings.deleteMany({});
    const expenditureResult = await Expenditure.deleteMany({});
    const workerPaymentResult = await WorkerPayment.deleteMany({});
    const paymentResult = await Payment.deleteMany({});

    addBackupLog({
      type: 'DATABASE_WIPED',
      triggeredBy,
      message: `Database data collections wiped cleanly. Users preserved.`
    });

    return {
      success: true,
      deletedCounts: {
        students: studentResult.deletedCount,
        teachers: teacherResult.deletedCount,
        feeSettings: feeSettingsResult.deletedCount,
        expenditures: expenditureResult.deletedCount,
        workerPayments: workerPaymentResult.deletedCount,
        payments: paymentResult.deletedCount
      }
    };
  } catch (err) {
    addBackupLog({
      type: 'WIPE_FAILED',
      triggeredBy,
      message: `Database wipe error: ${err.message}`
    });
    throw err;
  }
}

/**
 * Downloads from Google Drive, decrypts, and restores database collections.
 */
/**
 * Apply a decrypted backup payload to the database.
 *
 * Split out from restoreBackupFromFile so that recovery can be REHEARSED. It
 * used to be one function that downloaded from Drive and wrote to the
 * database in the same breath, which meant the only way to find out whether a
 * restore worked was to need one — and the moment you need one is the worst
 * possible moment to discover it does not.
 *
 * Accounts are deliberately NOT restored. A backup carries them with the
 * passwords stripped, so writing them back would replace working credentials
 * with unusable ones and lock the college out of the system it is trying to
 * recover.
 */
async function restoreFromPayload(backupData, triggeredBy = 'authenticator') {
  const collections = (backupData && backupData.collections) || {};

  await Student.deleteMany({});
  await Teacher.deleteMany({});
  await FeeSettings.deleteMany({});
  await Expenditure.deleteMany({});
  await WorkerPayment.deleteMany({});
  await Payment.deleteMany({});

  const restored = {};
  for (const [key, Model] of [
    ['students', Student], ['teachers', Teacher], ['feeSettings', FeeSettings],
    ['expenditures', Expenditure], ['workerPayments', WorkerPayment], ['payments', Payment]
  ]) {
    const rows = Array.isArray(collections[key]) ? collections[key] : [];
    if (rows.length) await Model.insertMany(rows);
    restored[key] = rows.length;
  }

  return { success: true, restoredTimestamp: backupData && backupData.timestamp, restoredCounts: restored };
}

async function restoreBackupFromFile(fileId, triggeredBy = 'authenticator') {
  try {
    console.log(`🔄 [RESTORE]: Restoring database from Drive file ID [${fileId}] triggered by [${triggeredBy}]...`);

    const encryptedBuffer = await downloadBackupFile(fileId);
    const encryptedString = encryptedBuffer.toString('utf-8');

    const backupData = decryptPayload(encryptedString);
    const applied = await restoreFromPayload(backupData, triggeredBy);

    addBackupLog({
      type: 'DATABASE_RESTORED',
      triggeredBy,
      driveFileId: fileId,
      message: `Database restored cleanly from Drive file ID [${fileId}].`
    });

    return applied;
  } catch (err) {
    addBackupLog({
      type: 'RESTORE_FAILED',
      triggeredBy,
      message: `Database restoration failed: ${err.message}`
    });
    throw err;
  }
}

module.exports = {
  generateAndUploadBackup,
  wipeDataCollections,
  restoreBackupFromFile,
  restoreFromPayload,
  buildBackupPayload,
  getBackupLogs,
  getAllAvailableBackupFiles,
  encryptPayload,
  decryptPayload,
  pruneLocalBackups
};
