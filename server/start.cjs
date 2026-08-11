/**
 * Hostinger Persistent Node.js Server Entry Point
 * Starts persistent Express HTTP listener and node-cron background scheduler.
 */

require('dotenv').config();
const cron = require('node-cron');
const app = require('./app.cjs');
const { connectToDatabase } = require('./db.cjs');
const campusBackup = require('./services/campusBackupService.cjs');

const PORT = process.env.PORT || 3000;

// Internal Node-Cron Scheduler (Daily backup at 00:00 UTC)
// Nightly backup, per campus and per type, into Backup/<Type>/<Campus>/.
//
// This used to write one flat file containing every collection for every
// campus, which meant restoring one campus's students necessarily overwrote
// all four. A partial run is reported as a failure rather than logged as a
// success with a shorter list — a silently incomplete backup is worse than an
// obviously missing one, because nobody goes looking for it.
cron.schedule('0 0 * * *', async () => {
  console.log('[Cron]: Starting nightly campus backups (00:00 UTC)...');
  try {
    await connectToDatabase();
    const result = await campusBackup.backupAllCampuses('scheduled_cron');
    if (result.success) {
      console.log(`[Cron]: Nightly backup complete — ${result.created.length} campus/type files written.`);
    } else {
      console.error(`[Cron]: Nightly backup INCOMPLETE — ${result.created.length} written, ${result.failures.length} failed:`);
      for (const f of result.failures) console.error(`  ${f.type}/${f.campus}: ${f.error}`);
    }
  } catch (err) {
    console.error('[Cron]: Nightly backup failed outright:', err.message);
  }
}, {
  scheduled: true,
  timezone: 'UTC'
});

// Start persistent HTTP server
async function startServer() {
  try {
    await connectToDatabase();
    console.log('✅ [Database]: Initial connection established at server startup.');
  } catch (dbErr) {
    console.warn('⚠️ [Database]: Initial connection warning at startup:', dbErr.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 [Hostinger Node.js Server]: Listening on port ${PORT} (PID: ${process.pid})`);
  });
}

startServer();
