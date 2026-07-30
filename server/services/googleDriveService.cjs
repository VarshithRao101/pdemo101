// server/services/googleDriveService.cjs
// Native Google Drive API v3 Service for 24-Hour Rolling Backups & Data Restoration
// Interacts with Service Account credentials & Parent Folder ID

const { google } = require('googleapis');
const stream = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    console.warn('WARN [GoogleDrive]: Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in environment.');
    return null;
  }

  // Sanitize double-escaped newlines in private key
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.JWT(
    email,
    null,
    privateKey,
    SCOPES
  );

  return google.drive({ version: 'v3', auth });
}

function getParentFolderId() {
  return process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '1BQIGgpPUYq--oN7Wz9xLQ9QRKoZnPz99';
}

const CATEGORIES = ['Students_Data', 'Teachers_Data', 'Expenditures_Data'];
const CAMPUSES = ['Erragattugutta_C1', 'Erragattugutta_C2', 'Beemaram_C1', 'Beemaram_C2'];

// Cache folder ID map in memory to reduce Drive API calls
const folderIdCache = {};

/**
 * Finds or creates a folder inside a parent folder.
 */
async function getOrCreateFolder(drive, name, parentId) {
  const cacheKey = `${parentId}:${name}`;
  if (folderIdCache[cacheKey]) return folderIdCache[cacheKey];

  try {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`;
    const res = await drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      const folderId = res.data.files[0].id;
      folderIdCache[cacheKey] = folderId;
      return folderId;
    }

    // Create folder
    const fileMetadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    const created = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });

    const newId = created.data.id;
    folderIdCache[cacheKey] = newId;
    return newId;
  } catch (err) {
    console.error(`ERROR [GoogleDrive]: Failed to get/create folder ${name}:`, err.message);
    throw err;
  }
}

/**
 * Ensures the full 3 Category x 4 Campus folder hierarchy exists in Google Drive.
 */
async function ensureFolderHierarchy(drive) {
  const parentId = getParentFolderId();
  const hierarchy = {};

  for (const cat of CATEGORIES) {
    const catFolderId = await getOrCreateFolder(drive, cat, parentId);
    hierarchy[cat] = { id: catFolderId, campuses: {} };

    for (const campus of CAMPUSES) {
      const campusFolderId = await getOrCreateFolder(drive, campus, catFolderId);
      hierarchy[cat].campuses[campus] = campusFolderId;
    }
  }

  return hierarchy;
}

/**
 * Enforces 2-snapshot rolling retention: Deletes oldest backups in target folder if count > maxSnapshots (default 2).
 */
async function enforceRollingRetention(drive, folderId, maxSnapshots = 2) {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
      orderBy: 'createdTime asc',
      fields: 'files(id, name, createdTime)',
    });

    const files = res.data.files || [];
    if (files.length > maxSnapshots) {
      const filesToDelete = files.slice(0, files.length - maxSnapshots);
      for (const file of filesToDelete) {
        console.log(`[GoogleDrive Rolling Retention]: Deleting old backup ${file.name} (${file.id})`);
        await drive.files.delete({ fileId: file.id }).catch(e => console.warn(`Failed deleting ${file.id}:`, e.message));
      }
    }
  } catch (err) {
    console.warn(`WARN [GoogleDrive]: Retention enforcement warning in folder ${folderId}:`, err.message);
  }
}

/**
 * Uploads a JSON backup payload to Google Drive under specified category & campus folder.
 */
async function uploadBackupSnapshot(category, campus, payloadData) {
  const drive = getDriveClient();
  if (!drive) {
    throw new Error('Google Drive API client is not configured. Check Service Account credentials in .env.');
  }

  const normCategory = CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase()) || CATEGORIES[0];
  const normCampus = CAMPUSES.find(c => c.toLowerCase() === campus.toLowerCase().replace(/\s+/g, '_')) || 'Erragattugutta_C1';

  const hierarchy = await ensureFolderHierarchy(drive);
  const targetFolderId = hierarchy[normCategory].campuses[normCampus];

  const nowIso = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup_${normCategory}_${normCampus}_${nowIso}.json`;

  const jsonString = JSON.stringify(payloadData, null, 2);

  const bufferStream = new stream.PassThrough();
  bufferStream.end(Buffer.from(jsonString, 'utf-8'));

  const fileMetadata = {
    name: fileName,
    parents: [targetFolderId],
    description: `Automated 24-hour Inspire ERP backup snapshot for ${normCategory} - ${normCampus}`,
  };

  const media = {
    mimeType: 'application/json',
    body: bufferStream,
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id, name, webViewLink, createdTime, size',
  });

  // Enforce 2-snapshot rolling retention rule in this campus folder
  await enforceRollingRetention(drive, targetFolderId, 2);

  return {
    fileId: file.data.id,
    fileName: file.data.name,
    category: normCategory,
    campus: normCampus,
    createdTime: file.data.createdTime,
    sizeBytes: file.data.size,
    driveLink: file.data.webViewLink,
  };
}

/**
 * Lists all available backup snapshots across all 3 category & 4 campus subfolders.
 */
async function listAvailableBackups() {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    const hierarchy = await ensureFolderHierarchy(drive);
    const result = {
      Students_Data: {},
      Teachers_Data: {},
      Expenditures_Data: {},
    };

    for (const cat of CATEGORIES) {
      for (const campus of CAMPUSES) {
        const folderId = hierarchy[cat].campuses[campus];
        const res = await drive.files.list({
          q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
          orderBy: 'createdTime desc',
          fields: 'files(id, name, createdTime, size, webViewLink)',
        });

        result[cat][campus] = (res.data.files || []).map(f => ({
          fileId: f.id,
          fileName: f.name,
          createdTime: f.createdTime,
          sizeBytes: f.size,
          driveLink: f.webViewLink,
        }));
      }
    }

    return result;
  } catch (err) {
    console.error('ERROR [GoogleDrive]: Failed to list backups:', err.message);
    return null;
  }
}

/**
 * Downloads content of a specific backup file by fileId.
 */
async function downloadBackupContent(fileId) {
  const drive = getDriveClient();
  if (!drive) throw new Error('Google Drive API client is not configured.');

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  );

  return JSON.parse(res.data);
}

/**
 * Purges all backup files in Google Drive while retaining folder structure.
 */
async function purgeAllDriveBackups() {
  const drive = getDriveClient();
  if (!drive) throw new Error('Google Drive API client is not configured.');

  const hierarchy = await ensureFolderHierarchy(drive);
  let totalDeleted = 0;

  for (const cat of CATEGORIES) {
    for (const campus of CAMPUSES) {
      const folderId = hierarchy[cat].campuses[campus];
      const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      const files = res.data.files || [];
      for (const file of files) {
        await drive.files.delete({ fileId: file.id }).catch(() => null);
        totalDeleted++;
      }
    }
  }

  return { totalDeleted };
}

module.exports = {
  getDriveClient,
  getParentFolderId,
  uploadBackupSnapshot,
  listAvailableBackups,
  downloadBackupContent,
  purgeAllDriveBackups,
  ensureFolderHierarchy,
};
