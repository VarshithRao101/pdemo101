const { google } = require('googleapis');
const stream = require('stream');

async function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth2 credentials missing. Ensure GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN are set.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim()
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken.trim() });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

function getFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is missing.');
  }
  return folderId.trim();
}

/**
 * Resolves (creating if absent) a folder path beneath the configured root and
 * returns the id of the deepest folder.
 *
 *   ensureFolderPath(['Backup', 'Student', 'Beemaram C1'])
 *
 * Drive has no real paths — only parent/child links, and it happily allows two
 * folders with the same name under one parent. Each level is therefore looked
 * up by exact name within its parent before being created, so repeated calls
 * converge on one tree instead of growing duplicates. Resolved ids are cached
 * for the process lifetime; the tree is small and effectively static.
 */
const folderIdCache = new Map();

async function ensureFolderPath(segments) {
  const drive = await getGoogleDriveClient();
  let parentId = getFolderId();
  let cacheKey = parentId;

  for (const rawName of segments) {
    const name = String(rawName).trim();
    if (!name) continue;
    cacheKey += '/' + name;

    if (folderIdCache.has(cacheKey)) {
      parentId = folderIdCache.get(cacheKey);
      continue;
    }

    // Escape single quotes: campus names are operator-supplied and a stray
    // quote would otherwise break the query syntax.
    const safeName = name.replace(/'/g, "\\'");
    const found = await drive.files.list({
      q: `name = '${safeName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1
    });

    let id = found.data.files && found.data.files[0] && found.data.files[0].id;
    if (!id) {
      const created = await drive.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
        fields: 'id',
        supportsAllDrives: true
      });
      id = created.data.id;
      console.log(`[Drive]: Created folder ${cacheKey.split('/').slice(1).join('/')}`);
    }

    folderIdCache.set(cacheKey, id);
    parentId = id;
  }

  return parentId;
}

/**
 * Uploads a file into a specific folder rather than the configured root.
 */
async function uploadFileToFolder(folderId, fileName, contents) {
  const drive = await getGoogleDriveClient();
  const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, 'utf-8');
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const response = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId], mimeType: 'application/octet-stream' },
    media: { mimeType: 'application/octet-stream', body: bufferStream },
    supportsAllDrives: true,
    fields: 'id, name, createdTime, size, parents'
  });
  return response.data;
}

/**
 * Lists the files directly inside one folder.
 */
async function listFilesInFolder(folderId) {
  const drive = await getGoogleDriveClient();
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
    fields: 'files(id, name, createdTime, size)',
    orderBy: 'createdTime desc',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 100
  });
  return response.data.files || [];
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
  ensureFolderPath,
  uploadFileToFolder,
  listFilesInFolder,
  uploadBackupFile,
  listBackupFiles,
  downloadBackupFile,
  deleteBackupFile,
  cleanupOldBackups
};
