// server/backupService.cjs
// Automatic Daily Encrypted Google Drive Backup Service for Inspire ERP

const crypto = require('crypto');
const mongoose = require('mongoose');
const { google } = require('googleapis');

/**
 * Derives a 32-byte Buffer key from environment variable BACKUP_ENCRYPTION_KEY
 */
function getEncryptionKey() {
  const rawKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-fallback-inspire-erp-backup-key-2026';
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts plaintext string using AES-256-GCM
 */
function encryptData(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Return formatted JSON envelope containing iv, authTag, ciphertext
  return JSON.stringify({
    format: 'INSPIRE_ENCRYPTED_BACKUP_V1',
    algo: 'aes-256-gcm',
    iv: iv.toString('hex'),
    authTag: authTag,
    ciphertext: encrypted
  });
}

/**
 * Initializes authenticated Google Drive API client
 */
function getGoogleDriveClient() {
  const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!serviceAccountKeyRaw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not configured.');
  }

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not configured.');
  }

  let credentials;
  try {
    // Handle plain JSON string or Base64 encoded JSON
    if (serviceAccountKeyRaw.trim().startsWith('{')) {
      credentials = JSON.parse(serviceAccountKeyRaw);
    } else {
      const decoded = Buffer.from(serviceAccountKeyRaw, 'base64').toString('utf8');
      credentials = JSON.parse(decoded);
    }
  } catch (err) {
    throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON: ${err.message}`);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  return {
    drive: google.drive({ version: 'v3', auth }),
    folderId,
    clientEmail: credentials.client_email
  };
}

/**
 * Verifies Google Drive credentials & folder access
 */
async function verifyGoogleDriveAccess() {
  try {
    const { drive, folderId } = getGoogleDriveClient();
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType'
    });
    return { success: true, folderName: res.data.name, folderId: res.data.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Main Backup Generation & Upload Workflow
 */
async function runDailyBackup() {
  const startTime = Date.now();
  const dateStamp = new Date().toISOString().split('T')[0];
  const timeStampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `inspire-erp-backup-${dateStamp}.enc`;

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB database connection is not active.');
    }

    // 1. Gather all collections snapshots
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const snapshotData = {};

    for (const collName of collectionNames) {
      const docs = await db.collection(collName).find({}).toArray();

      if (collName === 'users') {
        // EXCLUDE password hashes & sensitive credentials
        snapshotData[collName] = docs.map(u => {
          const { password, passwordHash, pinHash, jwtSecret, refreshSecret, ...safeUser } = u;
          return safeUser;
        });
      } else if (collName === 'syncjournals') {
        // Last 24 hours of mutating sync journal actions
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        snapshotData[collName] = docs.filter(item => {
          const createdAt = new Date(item.createdAt || item.timestamp || 0);
          return createdAt >= twentyFourHoursAgo;
        });
      } else {
        snapshotData[collName] = docs;
      }
    }

    const payload = {
      system: 'Inspire Educational Institutions ERP',
      backupDate: new Date().toISOString(),
      retentionPolicy: '24 Hours Daily Rotation',
      collectionsCount: Object.keys(snapshotData).length,
      data: snapshotData
    };

    const plainJson = JSON.stringify(payload, null, 2);

    // 2. Encrypt using AES-256-GCM
    const encryptedContent = encryptData(plainJson);

    // 3. Upload to Google Drive
    const { drive, folderId } = getGoogleDriveClient();
    const Readable = require('stream').Readable;
    const mediaStream = new Readable();
    mediaStream.push(encryptedContent);
    mediaStream.push(null);

    const uploadRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/octet-stream'
      },
      media: {
        mimeType: 'application/octet-stream',
        body: mediaStream
      },
      fields: 'id, name, createdTime, size'
    });

    const uploadedFileId = uploadRes.data.id;

    // 4. Cleanup backups older than 24 hours in the target folder
    let deletedCount = 0;
    try {
      const listRes = await drive.files.list({
        q: `'${folderId}' in parents and name contains 'inspire-erp-backup-' and trashed = false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc'
      });

      const files = listRes.data.files || [];
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const file of files) {
        // Keep the file we just uploaded
        if (file.id === uploadedFileId) continue;

        const fileCreated = new Date(file.createdTime);
        if (fileCreated < cutoffTime) {
          await drive.files.delete({ fileId: file.id });
          deletedCount++;
        }
      }
    } catch (cleanupErr) {
      console.warn('Backup cleanup notice:', cleanupErr.message);
    }

    const durationMs = Date.now() - startTime;

    // 5. Log success to SyncJournal
    const journalEntry = {
      actionType: 'BACKUP_CREATED',
      actorRole: 'SYSTEM_CRON',
      details: `Encrypted backup ${fileName} successfully uploaded to Google Drive. Deleted ${deletedCount} stale backup(s).`,
      meta: {
        fileId: uploadedFileId,
        fileName: fileName,
        encryptedSize: encryptedContent.length,
        durationMs: durationMs,
        deletedStaleFiles: deletedCount
      },
      timestamp: new Date()
    };

    if (db.collection('syncjournals')) {
      await db.collection('syncjournals').insertOne(journalEntry);
    }

    return {
      success: true,
      fileName,
      fileId: uploadedFileId,
      encryptedSize: encryptedContent.length,
      durationMs,
      deletedStaleFiles: deletedCount
    };
  } catch (error) {
    console.error('Daily Backup Failed:', error);

    // Log failure to SyncJournal
    try {
      const db = mongoose.connection.db;
      if (db && db.collection('syncjournals')) {
        await db.collection('syncjournals').insertOne({
          actionType: 'BACKUP_FAILED',
          actorRole: 'SYSTEM_CRON',
          details: `Daily Backup Failed: ${error.message}`,
          meta: { error: error.message, stack: error.stack },
          timestamp: new Date()
        });
      }
    } catch (logErr) {
      console.error('Failed to log BACKUP_FAILED to SyncJournal:', logErr);
    }

    throw error;
  }
}

module.exports = {
  getEncryptionKey,
  encryptData,
  verifyGoogleDriveAccess,
  runDailyBackup
};
