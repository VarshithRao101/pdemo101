/**
 * Campus-scoped, type-scoped backup and restore.
 *
 * The previous system wrote ONE flat file containing every collection for
 * every campus into a single Drive folder, and restoring it deleted all data
 * and reinserted the file wholesale. Restoring Campus 1's students therefore
 * meant overwriting every other campus's records too.
 *
 * This module produces one file per (type, campus) pair, laid out as:
 *
 *   Backup/
 *     Student/     Erragattugutta C1/ ... Beemaram C2/
 *     Teacher/     Erragattugutta C1/ ... Beemaram C2/
 *     Expenditure/ Erragattugutta C1/ ... Beemaram C2/
 *
 * Two invariants hold throughout:
 *   1. A backup contains only the named campus's records — enforced by the
 *      query, then re-checked before upload.
 *   2. A restore touches only the named campus and type — enforced by scoping
 *      every write, and by refusing a file whose contents disagree with its
 *      own header.
 */
const crypto = require('crypto');

const Student = require('../models/Student.cjs');
const Teacher = require('../models/Teacher.cjs');
const Expenditure = require('../models/Expenditure.cjs');

const {
  ensureFolderPath, uploadFileToFolder, listFilesInFolder, downloadBackupFile
} = require('./googleDriveService.cjs');

const BACKUP_FORMAT_VERSION = '2.0.0';
const ROOT = 'Backup';

const VALID_CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];

// The three backup types. `folder` is the Drive directory name; `model` the
// collection; `identity` the field that makes a record unique, used both to
// detect duplicates inside a file and to upsert on restore.
const TYPES = {
  student:     { folder: 'Student',     model: Student,     identity: 'studentId',      required: ['studentId', 'admissionNumber', 'name', 'branch'] },
  teacher:     { folder: 'Teacher',     model: Teacher,     identity: 'id',             required: ['id', 'name', 'subject', 'branch'] },
  expenditure: { folder: 'Expenditure', model: Expenditure, identity: 'id',             required: ['id', 'category', 'amount', 'branch'] }
};

// Encryption key. No literal fallback: a default here would mean backups
// silently encrypted with a value that is public in the repository.
function getEncryptionKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw || String(raw).length < 16) {
    const err = new Error('BACKUP_ENCRYPTION_KEY is not configured (or is shorter than 16 characters). Refusing to write a backup that could not be trusted.');
    err.status = 500;
    throw err;
  }
  return crypto.scryptSync(String(raw), 'inspire-erp-salt-2026', 32);
}

function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let enc = cipher.update(plainText, 'utf8', 'hex');
  enc += cipher.final('hex');
  return JSON.stringify({ v: 1, iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex'), ciphertext: enc });
}

function decrypt(text) {
  let parsed;
  try {
    parsed = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    throw Object.assign(new Error('That file is not a valid backup: it is not JSON.'), { status: 400 });
  }
  // A plain (unencrypted) export is accepted too, so an operator can restore a
  // file they have inspected. It still has to pass every validation below.
  if (parsed && parsed.backupType && Array.isArray(parsed.records)) return parsed;

  const { iv, authTag, ciphertext } = parsed || {};
  if (!iv || !authTag || !ciphertext) {
    throw Object.assign(new Error('That file is not a valid backup: it is neither a readable export nor a complete encrypted payload.'), { status: 400 });
  }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let dec = decipher.update(ciphertext, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return JSON.parse(dec);
  } catch {
    // GCM auth failure means the file was truncated, altered, or encrypted
    // with a different key. All three are unsafe to restore.
    throw Object.assign(new Error('That backup could not be decrypted. It may be corrupted, altered, or encrypted with a different key.'), { status: 400 });
  }
}

function normaliseType(t) {
  const k = String(t || '').trim().toLowerCase();
  return TYPES[k] ? k : null;
}

/**
 * Builds and uploads one campus's records for one type.
 */
async function backupCampusType(type, campus, actor = 'system') {
  const key = normaliseType(type);
  if (!key) throw Object.assign(new Error(`Unknown backup type [${type}].`), { status: 400 });
  if (!VALID_CAMPUSES.includes(campus)) throw Object.assign(new Error(`Unknown campus [${campus}].`), { status: 400 });

  const spec = TYPES[key];
  const records = await spec.model.find({ branch: campus }).lean();

  // Re-check rather than trust the query. If this ever fails, something has
  // gone wrong upstream and shipping the file would leak another campus.
  const foreign = records.filter(r => r.branch !== campus);
  if (foreign.length) {
    throw Object.assign(
      new Error(`Refusing to write backup: ${foreign.length} record(s) belong to another campus.`),
      { status: 500 }
    );
  }

  const envelope = {
    backupType: key,
    campus,
    createdAt: new Date().toISOString(),
    version: BACKUP_FORMAT_VERSION,
    generatedBy: actor,
    recordCount: records.length,
    // A digest of the record payload. Restore recomputes it, so a file edited
    // by hand after export is detected even though it is still valid JSON.
    checksum: crypto.createHash('sha256').update(JSON.stringify(records)).digest('hex'),
    records
  };

  const payload = encrypt(JSON.stringify(envelope));
  const stamp = envelope.createdAt.replace(/[:.]/g, '-');
  const fileName = `${spec.folder}_${campus.replace(/\s+/g, '-')}_${stamp}.json.enc`;

  const folderId = await ensureFolderPath([ROOT, spec.folder, campus]);
  const uploaded = await uploadFileToFolder(folderId, fileName, payload);
  if (!uploaded || !uploaded.id) {
    throw Object.assign(new Error('Google Drive accepted the upload but returned no file id.'), { status: 502 });
  }

  return {
    success: true,
    backupType: key,
    campus,
    fileName,
    driveFileId: uploaded.id,
    driveFolder: `${ROOT}/${spec.folder}/${campus}`,
    recordCount: records.length,
    checksum: envelope.checksum,
    createdAt: envelope.createdAt
  };
}

/**
 * Validates a decrypted envelope without writing anything.
 *
 * Returns { ok, errors[], warnings[], summary } so the caller can show the
 * operator exactly what a restore would do before they confirm it.
 */
function validateEnvelope(envelope, { expectedType, expectedCampus } = {}) {
  const errors = [];
  const warnings = [];

  if (!envelope || typeof envelope !== 'object') {
    return { ok: false, errors: ['The backup file is empty or not an object.'], warnings, summary: null };
  }

  const key = normaliseType(envelope.backupType);
  if (!key) errors.push(`Unknown or missing backupType [${envelope.backupType}].`);
  if (expectedType && key && key !== normaliseType(expectedType)) {
    errors.push(`This is a ${key} backup, but a ${normaliseType(expectedType)} restore was requested.`);
  }

  if (!envelope.campus) errors.push('The backup does not say which campus it belongs to.');
  else if (!VALID_CAMPUSES.includes(envelope.campus)) errors.push(`Unknown campus [${envelope.campus}].`);
  if (expectedCampus && envelope.campus && envelope.campus !== expectedCampus) {
    errors.push(`This backup is for ${envelope.campus}, but ${expectedCampus} was requested.`);
  }

  if (!envelope.version) warnings.push('The backup has no format version.');
  else if (String(envelope.version).split('.')[0] !== BACKUP_FORMAT_VERSION.split('.')[0]) {
    errors.push(`Backup format ${envelope.version} is not compatible with ${BACKUP_FORMAT_VERSION}.`);
  }

  if (!Array.isArray(envelope.records)) {
    errors.push('The backup contains no records array.');
    return { ok: false, errors, warnings, summary: null };
  }

  if (typeof envelope.recordCount === 'number' && envelope.recordCount !== envelope.records.length) {
    errors.push(`Header says ${envelope.recordCount} records but the file contains ${envelope.records.length}.`);
  }

  if (envelope.checksum) {
    const actual = crypto.createHash('sha256').update(JSON.stringify(envelope.records)).digest('hex');
    if (actual !== envelope.checksum) {
      errors.push('Checksum mismatch — the records have been altered since this backup was written.');
    }
  } else {
    warnings.push('The backup has no checksum, so tampering cannot be ruled out.');
  }

  // Per-record checks. Only report the first few so a badly broken file
  // produces a readable message rather than thousands of lines.
  if (key) {
    const spec = TYPES[key];
    const seen = new Set();
    let malformed = 0, foreign = 0, duplicates = 0, missingId = 0;

    for (const rec of envelope.records) {
      if (!rec || typeof rec !== 'object' || Array.isArray(rec)) { malformed++; continue; }
      for (const field of spec.required) {
        if (rec[field] === undefined || rec[field] === null || rec[field] === '') { malformed++; break; }
      }
      if (envelope.campus && rec.branch !== envelope.campus) foreign++;
      const id = rec[spec.identity];
      if (!id) missingId++;
      else if (seen.has(id)) duplicates++;
      else seen.add(id);
    }

    if (malformed) errors.push(`${malformed} record(s) are malformed or missing a required field (${spec.required.join(', ')}).`);
    if (foreign) errors.push(`${foreign} record(s) belong to a different campus than the file claims. Refusing to restore.`);
    if (duplicates) errors.push(`${duplicates} duplicate ${spec.identity} value(s) inside the file.`);
    if (missingId) errors.push(`${missingId} record(s) have no ${spec.identity}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      backupType: key,
      campus: envelope.campus,
      createdAt: envelope.createdAt || null,
      version: envelope.version || null,
      recordCount: envelope.records.length
    }
  };
}

/**
 * Restores one campus + type from a Drive file.
 *
 * `dryRun` validates and reports what would change without writing, which is
 * what the confirmation screen calls.
 *
 * Records are upserted by their identity field and every write is scoped to
 * `{ branch: campus }`, so a restore can neither create a duplicate nor reach
 * another campus even if the file were crafted to try.
 */
async function restoreCampusType(fileId, { actor = 'authenticator', expectedType, expectedCampus, dryRun = false, deleteMissing = false } = {}) {
  const buffer = await downloadBackupFile(fileId);
  const envelope = decrypt(buffer.toString('utf-8'));

  const validation = validateEnvelope(envelope, { expectedType, expectedCampus });
  if (!validation.ok) {
    return { success: false, dryRun, validation, applied: null };
  }

  const key = normaliseType(envelope.backupType);
  const spec = TYPES[key];
  const campus = envelope.campus;

  const existing = await spec.model.find({ branch: campus }).select(spec.identity).lean();
  const existingIds = new Set(existing.map(d => d[spec.identity]));
  const incomingIds = new Set(envelope.records.map(r => r[spec.identity]));

  const plan = {
    willUpdate: envelope.records.filter(r => existingIds.has(r[spec.identity])).length,
    willInsert: envelope.records.filter(r => !existingIds.has(r[spec.identity])).length,
    presentButNotInBackup: existing.filter(d => !incomingIds.has(d[spec.identity])).length,
    deleteMissing: Boolean(deleteMissing)
  };

  if (dryRun) {
    return { success: true, dryRun: true, validation, plan, applied: null };
  }

  const ops = envelope.records.map(rec => {
    const doc = { ...rec };
    // Never let a file dictate identity or campus: _id is Mongo's, and branch
    // is pinned to the validated campus so a doctored record cannot land
    // somewhere else.
    delete doc._id;
    delete doc.__v;
    doc.branch = campus;

    return {
      updateOne: {
        filter: { [spec.identity]: rec[spec.identity], branch: campus },
        update: { $set: doc },
        upsert: true
      }
    };
  });

  let result = { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  if (ops.length) {
    // Ordered:false so one bad record cannot abort the rest; the write is
    // still confined to this campus by every filter above.
    result = await spec.model.bulkWrite(ops, { ordered: false });
  }

  let deleted = 0;
  if (deleteMissing && incomingIds.size) {
    const del = await spec.model.deleteMany({ branch: campus, [spec.identity]: { $nin: [...incomingIds] } });
    deleted = del.deletedCount || 0;
  }

  // Verify by reading back, rather than trusting the write result.
  const after = await spec.model.countDocuments({ branch: campus });
  const stillForeign = await spec.model.countDocuments({
    branch: { $ne: campus },
    [spec.identity]: { $in: [...incomingIds] }
  });

  console.log(`[Restore]: ${key}/${campus} by ${actor} — upserted ${result.upsertedCount || 0}, modified ${result.modifiedCount || 0}, deleted ${deleted}`);

  return {
    success: true,
    dryRun: false,
    validation,
    plan,
    applied: {
      backupType: key,
      campus,
      inserted: result.upsertedCount || 0,
      updated: result.modifiedCount || 0,
      deleted,
      campusTotalAfter: after,
      // Must be zero. Non-zero would mean an identity from this file also
      // exists under another campus, which restore must never create.
      recordsLeakedToOtherCampuses: stillForeign
    }
  };
}

/**
 * Backs up every type for every campus. Used by the scheduled job.
 */
async function backupAllCampuses(actor = 'scheduled') {
  const results = [];
  const failures = [];
  for (const type of Object.keys(TYPES)) {
    for (const campus of VALID_CAMPUSES) {
      try {
        results.push(await backupCampusType(type, campus, actor));
      } catch (err) {
        failures.push({ type, campus, error: err.message });
        console.error(`[Backup]: ${type}/${campus} failed:`, err.message);
      }
    }
  }
  // A partial run is reported as a failure. Silently returning success with a
  // shorter list is how a broken backup goes unnoticed for months.
  return { success: failures.length === 0, created: results, failures };
}

/**
 * The Drive tree with the files in each leaf, for the restore picker.
 */
async function listBackupTree(campusFilter = null) {
  const tree = {};
  for (const [key, spec] of Object.entries(TYPES)) {
    tree[key] = {};
    for (const campus of VALID_CAMPUSES) {
      if (campusFilter && campus !== campusFilter) continue;
      try {
        const folderId = await ensureFolderPath([ROOT, spec.folder, campus]);
        const files = await listFilesInFolder(folderId);
        tree[key][campus] = files.map(f => ({
          id: f.id, name: f.name, createdTime: f.createdTime, size: f.size,
          path: `${ROOT}/${spec.folder}/${campus}`
        }));
      } catch (err) {
        tree[key][campus] = { error: err.message };
      }
    }
  }
  return tree;
}

module.exports = {
  BACKUP_FORMAT_VERSION,
  VALID_CAMPUSES,
  TYPES,
  backupCampusType,
  backupAllCampuses,
  restoreCampusType,
  validateEnvelope,
  listBackupTree,
  encrypt,
  decrypt
};
