/**
 * The Drive-only client, not the googleapis umbrella package.
 *
 * `require('googleapis')` loads generated clients for every Google API there
 * is, and measured on this codebase that cost 93.3MB of resident memory —
 * more than express, mongoose, helmet, cors, morgan, jsonwebtoken, bcryptjs
 * and node-cron put together. This app uses exactly one of those APIs.
 *
 * That mattered because the host runs two instances of this process, so the
 * waste was paid twice, and a Node process that crosses its memory limit is
 * killed rather than slowed — which looks from the outside like the site
 * going down for no reason.
 *
 * @googleapis/drive is the same code from the same publisher, carrying only
 * Drive: 16.6MB against 93.3MB, saving roughly 77MB per instance. The API
 * surface used here — auth.OAuth2 and drive({ version: 'v3' }) — is identical.
 */
const { drive: driveApi, auth: driveAuth } = require('@googleapis/drive');
const stream = require('stream');

/**
 * Ceilings on how long a Drive call may take.
 *
 * There were none. googleapis has no default timeout, so a Drive request that
 * stalled never settled: the HTTP socket to our own client eventually closed
 * at the server's request timeout, but the promise inside the process stayed
 * pending forever, holding its connection and whatever it had allocated. A
 * handful of those is a leak; a Drive outage during the nightly backup is
 * twenty-four of them at once.
 *
 * Metadata calls are quick and get a short ceiling. Uploads and downloads
 * carry a whole encrypted backup and are given considerably longer.
 */
const DRIVE_META_TIMEOUT_MS = Number(process.env.DRIVE_TIMEOUT_MS) || 20000;
const DRIVE_TRANSFER_TIMEOUT_MS = Number(process.env.DRIVE_TRANSFER_TIMEOUT_MS) || 90000;

async function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth2 credentials missing. Ensure GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN are set.');
  }

  const oauth2Client = new driveAuth.OAuth2(
    clientId.trim(),
    clientSecret.trim()
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken.trim() });
  return driveApi({ version: 'v3', auth: oauth2Client });
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
    const found = await withRetry(() => drive.files.list({
      q: `name = '${safeName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1,
      timeout: DRIVE_META_TIMEOUT_MS
    }), { label: `folder lookup ${name}` });

    let id = found.data.files && found.data.files[0] && found.data.files[0].id;
    if (!id) {
      const created = await drive.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
        fields: 'id',
        supportsAllDrives: true,
        timeout: DRIVE_META_TIMEOUT_MS
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
    fields: 'id, name, createdTime, size, parents',
    timeout: DRIVE_TRANSFER_TIMEOUT_MS
  });
  return response.data;
}

/**
 * Retries a Drive call through rate limiting.
 *
 * Listing the backup tree touches two dozen folders at once, and Drive answers
 * bursts with 403 userRateLimitExceeded or 429. Those came back to the caller
 * as a folder-level error, and a folder that errors renders as EMPTY in the
 * restore panel — so a transient throttle looked exactly like "this campus has
 * no backups", which is the most misleading thing this screen could say.
 */
async function withRetry(fn, { attempts = 4, label = 'Drive call' } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const code = err.code || err.status || (err.response && err.response.status);
      const reason = String((err.errors && err.errors[0] && err.errors[0].reason) || err.message || '');
      const throttled = code === 429 || code === 403 &&
        /rateLimit|userRateLimitExceeded|quotaExceeded|backendError/i.test(reason);
      const transient = code === 500 || code === 502 || code === 503 || code === 504;

      if (!throttled && !transient) throw err;
      lastErr = err;

      // Exponential backoff with jitter, so parallel callers that were all
      // throttled together do not retry in lockstep and throttle again.
      const wait = Math.round((2 ** i) * 400 + Math.random() * 300);
      console.warn(`[Drive]: ${label} throttled (${code}); retrying in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/**
 * Lists the files inside MANY folders in one query.
 *
 * Drive accepts an OR of parent clauses, so the whole backup tree can be read
 * with a single paginated request instead of one request per folder. The tree
 * listing previously made roughly ninety sequential calls and took over forty
 * seconds on a cold process, which is long enough that the restore panel looks
 * broken and long enough to trigger the rate limiting described above.
 */
async function listFilesInFolders(folderIds) {
  const drive = await getGoogleDriveClient();
  const byParent = new Map(folderIds.map(id => [id, []]));
  if (!folderIds.length) return byParent;

  // Keep each query well inside Drive's query-length limit.
  const CHUNK = 25;
  for (let i = 0; i < folderIds.length; i += CHUNK) {
    const chunk = folderIds.slice(i, i + CHUNK);
    const parentClause = chunk.map(id => `'${id}' in parents`).join(' or ');

    let pageToken = null;
    do {
      const res = await withRetry(() => drive.files.list({
        q: `(${parentClause}) and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: 'nextPageToken, files(id, name, createdTime, size, parents)',
        orderBy: 'createdTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1000,
        pageToken: pageToken || undefined,
        timeout: DRIVE_META_TIMEOUT_MS
      }), { label: 'batch folder listing' });

      for (const f of res.data.files || []) {
        for (const parent of f.parents || []) {
          if (byParent.has(parent)) byParent.get(parent).push(f);
        }
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }

  // orderBy applies per query, not per parent, so sort each bucket explicitly
  // rather than assuming the global ordering survived the grouping.
  for (const list of byParent.values()) {
    list.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
  }
  return byParent;
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
    pageSize: 100,
    timeout: DRIVE_META_TIMEOUT_MS
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
    fields: 'id, name, createdTime, size',
    timeout: DRIVE_TRANSFER_TIMEOUT_MS
  });

  return response.data;
}

/**
 * Lists all backup files in the target Google Drive folder
 */
async function listBackupFiles() {
  const drive = await getGoogleDriveClient();
  const folderId = getFolderId();

  // Folders must be excluded explicitly. The campus-scoped system creates a
  // `Backup/` sub-folder inside this same root, and without this filter Drive
  // returned that folder alongside the real archives — newest first, so it
  // appeared at the TOP of the backup list as though it were the most recent
  // restorable snapshot. Selecting it fails with a 403 from Drive, because a
  // folder has no content to download.
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false ` +
       `and mimeType != 'application/vnd.google-apps.folder'`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name, createdTime, size, mimeType)',
    orderBy: 'createdTime desc',
    timeout: DRIVE_META_TIMEOUT_MS
  });

  return response.data.files || [];
}

/**
 * Downloads a backup file content from Google Drive
 */
async function downloadBackupFile(fileId) {
  const drive = await getGoogleDriveClient();
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true ,
      timeout: DRIVE_TRANSFER_TIMEOUT_MS
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data);
}

/**
 * Deletes a file from Google Drive
 */
async function deleteBackupFile(fileId) {
  const drive = await getGoogleDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true ,
    timeout: DRIVE_META_TIMEOUT_MS
  });
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
  listFilesInFolders,
  uploadBackupFile,
  listBackupFiles,
  downloadBackupFile,
  deleteBackupFile,
  cleanupOldBackups
};
