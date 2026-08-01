const { google } = require('googleapis');
const stream = require('stream');

async function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;

  // Use OAuth 2.0 User Credentials (No storage quota restrictions on personal Gmail accounts)
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      clientId.trim(),
      clientSecret.trim()
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken.trim() });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Fallback Service Account JWT
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google Drive credentials missing in environment variables. Specify GOOGLE_OAUTH_REFRESH_TOKEN or Service Account details.');
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: serviceAccountEmail.trim(),
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
  });

  await auth.authorize();
  return google.drive({ version: 'v3', auth });
}

function getFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!folderId) {
    throw new Error('Google Drive folder ID missing in environment variables.');
  }
  return folderId.trim();
}

/**
 * Uploads an encrypted backup file to Google Drive
 */
async function uploadBackupFile(fileName, fileBufferOrString) {
  const drive = await getGoogleDriveClient();
  const folderId = getFolderId();

  const buffer = Buffer.isBuffer(fileBufferOrString)
    ? fileBufferOrString
    : Buffer.from(fileBufferOrString, 'utf-8');

  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/octet-stream'
    },
    media: {
      mimeType: 'application/octet-stream',
      body: bufferStream
    },
    supportsAllDrives: true,
    supportsTeamDrives: true,
    fields: 'id, name, createdTime, size'
  });

  return response.data;
}

/**
 * Lists all backup files in the target Google Drive folder
 */
async function listBackupFiles() {
  const drive = await getGoogleDriveClient();
  const folderId = getFolderId();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name, createdTime, size, mimeType)',
    orderBy: 'createdTime desc'
  });

  return response.data.files || [];
}

/**
 * Downloads a backup file content from Google Drive
 */
async function downloadBackupFile(fileId) {
  const drive = await getGoogleDriveClient();
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data);
}

/**
 * Deletes a file from Google Drive
 */
async function deleteBackupFile(fileId) {
  const drive = await getGoogleDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
  return true;
}

/**
 * Cleans up backup files older than retentionHours (default: 24 hours)
 */
async function cleanupOldBackups(retentionHours = 24) {
  try {
    const files = await listBackupFiles();
    const cutoffTime = Date.now() - retentionHours * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const f of files) {
      const createdTime = new Date(f.createdTime).getTime();
      if (createdTime < cutoffTime && f.name.startsWith('inspire-erp-backup-')) {
        console.log(`🧹 [Drive Cleanup]: Deleting backup older than ${retentionHours}h: ${f.name} (ID: ${f.id})`);
        await deleteBackupFile(f.id);
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (err) {
    console.error('⚠️ [Drive Cleanup Notice]:', err.message);
    return 0;
  }
}

module.exports = {
  uploadBackupFile,
  listBackupFiles,
  downloadBackupFile,
  deleteBackupFile,
  cleanupOldBackups
};
