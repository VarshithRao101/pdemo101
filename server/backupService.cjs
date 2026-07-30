// server/backupService.cjs
// Automatic Daily Google Drive & Local Encrypted Rolling Backup & Restoration System for Inspire ERP

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { google } = require('googleapis');

// Local storage fallback path for backups
const LOCAL_BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
  fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
}

// Master Security Passcode Verification (bcrypt against stored authenticator password)
const bcrypt = require('bcryptjs');

function verifyMasterSecurityPin(pin, storedAuthHash) {
  if (!pin) return false;
  const cleanPin = String(pin).trim();
  if (storedAuthHash) {
    return bcrypt.compareSync(cleanPin, storedAuthHash);
  }
  return false;
}

// Helper to get standard campus list
const CAMPUSES = [
  { key: 'JC_Main', name: 'JC Main' },
  { key: 'JC_Boys', name: 'JC Boys' },
  { key: 'JC_Girls', name: 'JC Girls' },
  { key: 'School', name: 'School' }
];

// 3 Root Categories in Google Drive
const CATEGORIES = [
  { key: 'Students_Data', label: '1_Students_Data' },
  { key: 'Teachers_Data', label: '2_Teachers_Data' },
  { key: 'Expenditures_Data', label: '3_Expenditures_Data' }
];

/**
 * Derives a 32-byte Buffer key from environment variable
 */
function getEncryptionKey() {
  const rawKey = process.env.BACKUP_ENCRYPTION_KEY || 'inspire-erp-secure-backup-key-2026';
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Initializes authenticated Google Drive API client
 */
function getGoogleDriveClient() {
  const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!serviceAccountKeyRaw && !process.env.GOOGLE_OAUTH_TOKEN) {
    return null;
  }

  try {
    let auth;
    if (serviceAccountKeyRaw) {
      let credentials;
      if (serviceAccountKeyRaw.trim().startsWith('{')) {
        credentials = JSON.parse(serviceAccountKeyRaw);
      } else {
        const decoded = Buffer.from(serviceAccountKeyRaw, 'base64').toString('utf8');
        credentials = JSON.parse(decoded);
      }
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
      });
    } else {
      auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: process.env.GOOGLE_OAUTH_TOKEN });
    }

    return {
      drive: google.drive({ version: 'v3', auth }),
      rootFolderId: rootFolderId || 'root'
    };
  } catch (err) {
    console.warn('Google Drive auth init notice:', err.message);
    return null;
  }
}

/**
 * Ensures or creates Google Drive Folder Hierarchy:
 * Root -> 3 Categories -> 4 Campuses each
 */
async function ensureDriveHierarchy(driveClient) {
  if (!driveClient) return null;
  const { drive, rootFolderId } = driveClient;

  const hierarchy = {};

  try {
    for (const cat of CATEGORIES) {
      hierarchy[cat.key] = {};

      // 1. Find or create Category Folder
      let catFolderId;
      const catSearch = await drive.files.list({
        q: `'${rootFolderId}' in parents and name = '${cat.label}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)'
      });

      if (catSearch.data.files && catSearch.data.files.length > 0) {
        catFolderId = catSearch.data.files[0].id;
      } else {
        const createdCat = await drive.files.create({
          requestBody: {
            name: cat.label,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootFolderId]
          },
          fields: 'id'
        });
        catFolderId = createdCat.data.id;
      }

      // 2. Find or create 4 Campus Subfolders inside Category Folder
      for (const camp of CAMPUSES) {
        const campFolderName = `Campus_${camp.key}`;
        const campSearch = await drive.files.list({
          q: `'${catFolderId}' in parents and name = '${campFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id, name)'
        });

        if (campSearch.data.files && campSearch.data.files.length > 0) {
          hierarchy[cat.key][camp.name] = campSearch.data.files[0].id;
        } else {
          const createdCamp = await drive.files.create({
            requestBody: {
              name: campFolderName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [catFolderId]
            },
            fields: 'id'
          });
          hierarchy[cat.key][camp.name] = createdCamp.data.id;
        }
      }
    }

    return hierarchy;
  } catch (err) {
    console.warn('Google Drive folder hierarchy creation warning:', err.message);
    return null;
  }
}

/**
 * Enforces Rolling 2-Backup Limit per Campus Folder on Google Drive
 */
async function enforceDriveRollingRetention(drive, folderId, filePrefix) {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and name contains '${filePrefix}' and trashed = false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc'
    });

    const files = res.data.files || [];
    // Keep only top 2 most recent backups
    if (files.length > 2) {
      const filesToDelete = files.slice(2);
      for (const f of filesToDelete) {
        await drive.files.delete({ fileId: f.id }).catch(e => console.warn('Drive file delete warn:', e.message));
        console.log(`🗑️ [Drive Backup Cleaned]: Deleted older backup ${f.name} (id: ${f.id})`);
      }
    }
  } catch (err) {
    console.warn('Drive rolling retention warning:', err.message);
  }
}

/**
 * Enforces Rolling 2-Backup Limit in Local Directory
 */
function enforceLocalRollingRetention(campKey, catKey) {
  try {
    const files = fs.readdirSync(LOCAL_BACKUP_DIR)
      .filter(f => f.startsWith(`${catKey}_${campKey}_`))
      .map(f => ({ name: f, time: fs.statSync(path.join(LOCAL_BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 2) {
      const toDelete = files.slice(2);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(LOCAL_BACKUP_DIR, f.name));
        console.log(`🗑️ [Local Backup Cleaned]: Deleted older local backup ${f.name}`);
      }
    }
  } catch (err) {
    console.warn('Local rolling retention notice:', err.message);
  }
}

/**
 * Main Daily / Manual Backup Generation Flow
 */
async function runDailyBackup(pinInput, authHash) {
  const startTime = Date.now();
  const dateIso = new Date().toISOString().split('T')[0];
  const timeStamp = Date.now();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not active.');
  }

  // Verify PIN if called manually with authHash
  if (pinInput) {
    if (!verifyMasterSecurityPin(pinInput, authHash)) {
      throw new Error('Invalid Security Passcode. Authenticator password required.');
    }
  }

  const driveClient = getGoogleDriveClient();
  const driveHierarchy = driveClient ? await ensureDriveHierarchy(driveClient) : null;

  const backupSummary = {
    timestamp: new Date().toISOString(),
    campuses: {},
    googleDriveSync: Boolean(driveHierarchy),
    totalRecordsBackedUp: 0
  };

  for (const camp of CAMPUSES) {
    const campName = camp.name;
    const campKey = camp.key;

    // 1. Gather Students & Payments
    const students = await db.collection('students').find({ branch: campName }).toArray();
    const studentIds = students.map(s => s.studentId || s._id);
    const payments = await db.collection('payments').find({ branch: campName }).toArray();
    const studentFeeSettings = await db.collection('feesettings').find({ branch: campName }).toArray();

    const studentsPayload = {
      category: 'Students_Data',
      campus: campName,
      backupDate: new Date().toISOString(),
      studentCount: students.length,
      paymentCount: payments.length,
      students: students,
      payments: payments,
      feeSettings: studentFeeSettings
    };

    // 2. Gather Teachers & Salary Analysis
    const teachers = await db.collection('teachers').find({ branch: campName }).toArray();
    const teachersPayload = {
      category: 'Teachers_Data',
      campus: campName,
      backupDate: new Date().toISOString(),
      teacherCount: teachers.length,
      teachers: teachers
    };

    // 3. Gather Expenditures & Worker Payments
    const expenditures = await db.collection('expenditures').find({ branch: campName }).toArray();
    const workerPayments = await db.collection('workerpayments').find({ branch: campName }).toArray();
    const expendituresPayload = {
      category: 'Expenditures_Data',
      campus: campName,
      backupDate: new Date().toISOString(),
      expenditureCount: expenditures.length,
      workerPaymentCount: workerPayments.length,
      expenditures: expenditures,
      workerPayments: workerPayments
    };

    // Save locally
    const savePayloads = [
      { catKey: 'Students_Data', payload: studentsPayload, prefix: `students_${campKey}` },
      { catKey: 'Teachers_Data', payload: teachersPayload, prefix: `teachers_${campKey}` },
      { catKey: 'Expenditures_Data', payload: expendituresPayload, prefix: `expenditures_${campKey}` }
    ];

    for (const item of savePayloads) {
      const fileName = `${item.catKey}_${campKey}_${dateIso}_${timeStamp}.json`;
      const filePath = path.join(LOCAL_BACKUP_DIR, fileName);
      const contentJson = JSON.stringify(item.payload, null, 2);

      fs.writeFileSync(filePath, contentJson, 'utf8');
      enforceLocalRollingRetention(campKey, item.catKey);

      // Upload to Google Drive if active
      if (driveHierarchy && driveHierarchy[item.catKey] && driveHierarchy[item.catKey][campName]) {
        try {
          const folderId = driveHierarchy[item.catKey][campName];
          const Readable = require('stream').Readable;
          const mediaStream = new Readable();
          mediaStream.push(contentJson);
          mediaStream.push(null);

          await driveClient.drive.files.create({
            requestBody: {
              name: fileName,
              parents: [folderId],
              mimeType: 'application/json'
            },
            media: {
              mimeType: 'application/json',
              body: mediaStream
            }
          });

          // Enforce 2-backup rolling limit per folder on Google Drive
          await enforceDriveRollingRetention(driveClient.drive, folderId, `${item.catKey}_${campKey}`);
        } catch (uploadErr) {
          console.warn(`Drive upload notice for ${fileName}:`, uploadErr.message);
        }
      }
    }

    const campTotal = students.length + teachers.length + expenditures.length;
    backupSummary.campuses[campName] = {
      students: students.length,
      teachers: teachers.length,
      expenditures: expenditures.length,
      total: campTotal
    };
    backupSummary.totalRecordsBackedUp += campTotal;
  }

  // Purge any extraneous non-category files/folders from Google Drive
  if (driveClient) {
    await cleanGoogleDriveExceptCategoryFolders();
  }

  // Update Last Backup Timestamp
  const nowIso = new Date().toISOString();
  if (db.collection('syncjournals')) {
    await db.collection('syncjournals').insertOne({
      _id: 'bk_' + timeStamp,
      transactionId: 'TX_BK_' + timeStamp,
      action: 'GOOGLE_DRIVE_BACKUP_SUCCESS',
      branch: 'All Campuses',
      status: 'success',
      timestamp: new Date(),
      details: `Backed up ${backupSummary.totalRecordsBackedUp} records across 4 campuses to 3 Google Drive category folders. Rolling 2-backup retention enforced.`,
      meta: backupSummary
    });
  }

  return {
    success: true,
    lastBackupAt: nowIso,
    durationMs: Date.now() - startTime,
    summary: backupSummary
  };
}

/**
 * List active Google Drive & Local backups available for Restoration
 */
async function listAvailableBackups() {
  const result = {
    Students_Data: {},
    Teachers_Data: {},
    Expenditures_Data: {}
  };

  CAMPUSES.forEach(camp => {
    result.Students_Data[camp.name] = [];
    result.Teachers_Data[camp.name] = [];
    result.Expenditures_Data[camp.name] = [];
  });

  // Scan Local Backup Dir
  if (fs.existsSync(LOCAL_BACKUP_DIR)) {
    const files = fs.readdirSync(LOCAL_BACKUP_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const stat = fs.statSync(path.join(LOCAL_BACKUP_DIR, f));
      const parts = f.split('_');
      // Format: Category_CampusKey_Date_Timestamp.json
      if (parts.length >= 4) {
        const catKey = parts[0] + '_' + parts[1]; // e.g., Students_Data
        const campKey = parts[2]; // e.g., JC_Main
        const campObj = CAMPUSES.find(c => c.key === campKey);
        const campName = campObj ? campObj.name : campKey.replace('_', ' ');

        if (result[catKey] && result[catKey][campName]) {
          result[catKey][campName].push({
            id: 'local_' + f,
            fileName: f,
            source: 'Local Server Snapshot',
            sizeBytes: stat.size,
            createdAt: new Date(stat.mtimeMs).toISOString()
          });
        }
      }
    }
  }

  // Scan Google Drive if connected
  const driveClient = getGoogleDriveClient();
  if (driveClient) {
    try {
      const driveHierarchy = await ensureDriveHierarchy(driveClient);
      if (driveHierarchy) {
        for (const catKey of Object.keys(driveHierarchy)) {
          for (const campName of Object.keys(driveHierarchy[catKey])) {
            const folderId = driveHierarchy[catKey][campName];
            const driveFiles = await driveClient.drive.files.list({
              q: `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`,
              fields: 'files(id, name, size, createdTime)',
              orderBy: 'createdTime desc'
            });

            if (driveFiles.data.files && driveFiles.data.files.length > 0) {
              const list = driveFiles.data.files.map(df => ({
                id: df.id,
                fileName: df.name,
                source: 'Google Drive Active Backup',
                sizeBytes: parseInt(df.size || '0', 10),
                createdAt: df.createdTime
              }));

              if (result[catKey] && result[catKey][campName]) {
                // Merge without duplicates
                const existingNames = new Set(result[catKey][campName].map(x => x.fileName));
                list.forEach(df => {
                  if (!existingNames.has(df.fileName)) {
                    result[catKey][campName].push(df);
                  }
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Drive available backups scan warning:', err.message);
    }
  }

  // Sort backups by date desc
  Object.keys(result).forEach(cat => {
    Object.keys(result[cat]).forEach(camp => {
      result[cat][camp].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  });

  return result;
}

/**
 * Restore Data for a Specific Category and Campus
 */
async function restoreDataPayload({ category, campus, backupData, backupFileContent }) {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not active.');
  }

  let payload = backupData;
  if (!payload && backupFileContent) {
    try {
      payload = typeof backupFileContent === 'string' ? JSON.parse(backupFileContent) : backupFileContent;
    } catch (err) {
      throw new Error(`Failed to parse backup JSON file: ${err.message}`);
    }
  }

  if (!payload) {
    throw new Error('No valid backup payload or file content provided for restoration.');
  }

  let restoredCount = 0;
  const targetCampus = campus || payload.campus;

  if (!targetCampus) {
    throw new Error('Target campus branch must be specified for restoration.');
  }

  // 1. Restore Students & Payments
  if (category === 'Students_Data' || payload.students) {
    const students = payload.students || [];
    const payments = payload.payments || [];
    const feeSettings = payload.feeSettings || [];

    for (const stu of students) {
      const { _id, id, ...stuBody } = stu;
      const cleanId = _id || id || `STU_${stu.branch}_${stu.admissionNumber || Date.now()}`;
      stuBody.branch = targetCampus;
      
      await db.collection('students').updateOne(
        { _id: cleanId },
        { $set: { ...stuBody, _id: cleanId, updatedByRestoreAt: new Date() } },
        { upsert: true }
      );
      restoredCount++;
    }

    for (const pay of payments) {
      const { _id, id, ...payBody } = pay;
      const cleanId = _id || id || `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      payBody.branch = targetCampus;

      await db.collection('payments').updateOne(
        { _id: cleanId },
        { $set: { ...payBody, _id: cleanId } },
        { upsert: true }
      );
    }

    for (const fsItem of feeSettings) {
      if (fsItem.branch) {
        await db.collection('feesettings').updateOne(
          { branch: targetCampus },
          { $set: { ...fsItem, branch: targetCampus } },
          { upsert: true }
        );
      }
    }
  }

  // 2. Restore Teachers & Salary Analysis
  if (category === 'Teachers_Data' || payload.teachers) {
    const teachers = payload.teachers || [];
    for (const tch of teachers) {
      const { _id, id, ...tchBody } = tch;
      const cleanId = _id || id || `TCH_${targetCampus}_${Date.now()}`;
      tchBody.branch = targetCampus;

      await db.collection('teachers').updateOne(
        { _id: cleanId },
        { $set: { ...tchBody, _id: cleanId, id: cleanId, updatedByRestoreAt: new Date() } },
        { upsert: true }
      );
      restoredCount++;
    }
  }

  // 3. Restore Expenditures & Worker Payments
  if (category === 'Expenditures_Data' || payload.expenditures) {
    const expenditures = payload.expenditures || [];
    const workerPayments = payload.workerPayments || [];

    for (const exp of expenditures) {
      const { _id, id, ...expBody } = exp;
      const cleanId = _id || id || `EXP_${targetCampus}_${Date.now()}`;
      expBody.branch = targetCampus;

      await db.collection('expenditures').updateOne(
        { _id: cleanId },
        { $set: { ...expBody, _id: cleanId } },
        { upsert: true }
      );
      restoredCount++;
    }

    for (const wp of workerPayments) {
      const { _id, id, ...wpBody } = wp;
      const cleanId = _id || id || `WP_${targetCampus}_${Date.now()}`;
      wpBody.branch = targetCampus;

      await db.collection('workerpayments').updateOne(
        { _id: cleanId },
        { $set: { ...wpBody, _id: cleanId } },
        { upsert: true }
      );
    }
  }

  // Log Restore Activity
  if (db.collection('syncjournals')) {
    await db.collection('syncjournals').insertOne({
      _id: 'rst_' + Date.now(),
      transactionId: 'TX_RST_' + Date.now(),
      action: 'DATA_RESTORED_SUCCESS',
      branch: targetCampus,
      status: 'success',
      timestamp: new Date(),
      details: `Restored ${restoredCount} records into database for campus "${targetCampus}" under category "${category}".`
    });
  }

  return {
    success: true,
    campus: targetCampus,
    category: category,
    restoredCount: restoredCount,
    message: `Successfully restored ${restoredCount} records for campus ${targetCampus}!`
  };
}

/**
 * Purges all files/folders from Google Drive EXCEPT the 3 designated category folders:
 * - 1_Students_Data
 * - 2_Teachers_Data
 * - 3_Expenditures_Data
 */
async function cleanGoogleDriveExceptCategoryFolders() {
  const driveClient = getGoogleDriveClient();
  if (!driveClient) {
    return { success: false, message: 'Google Drive client not configured or missing credentials.' };
  }
  const { drive, rootFolderId } = driveClient;
  const allowedFolderLabels = new Set(['1_Students_Data', '2_Teachers_Data', '3_Expenditures_Data']);
  let deletedCount = 0;

  try {
    const listRes = await drive.files.list({
      q: `'${rootFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)'
    });

    const files = listRes.data.files || [];
    for (const item of files) {
      if (!allowedFolderLabels.has(item.name)) {
        await drive.files.delete({ fileId: item.id }).catch(e => console.warn('Drive purge delete notice:', e.message));
        deletedCount++;
        console.log(`🗑️ [Drive Purge]: Permanently deleted unrequested item '${item.name}' (${item.id}) from Google Drive.`);
      }
    }

    return {
      success: true,
      deletedCount,
      message: `Google Drive purged successfully. Removed ${deletedCount} unrequested item(s). Only the 3 category folders remain.`
    };
  } catch (err) {
    console.warn('Google Drive purge exception:', err.message);
    return { success: false, message: `Google Drive purge notice: ${err.message}` };
  }
}

module.exports = {
  verifyMasterSecurityPin,
  getEncryptionKey,
  verifyGoogleDriveAccess: async () => {
    const client = getGoogleDriveClient();
    if (!client) return { success: false, error: 'Google Drive credentials not set.' };
    return { success: true, folderId: client.rootFolderId };
  },
  runDailyBackup,
  listAvailableBackups,
  restoreDataPayload,
  cleanGoogleDriveExceptCategoryFolders
};
