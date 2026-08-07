/**
 * Hostinger Persistent Node.js Server Entry Point
 * Starts persistent Express HTTP listener and node-cron background scheduler.
 */

require('dotenv').config();
const cron = require('node-cron');
const app = require('./app.cjs');
const { connectToDatabase } = require('./db.cjs');
const { generateAndUploadBackup } = require('./services/backupService.cjs');

const PORT = process.env.PORT || 3000;

// Internal Node-Cron Scheduler (Daily backup at 00:00 UTC)
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ [Cron]: Triggering daily automated backup (00:00 UTC)...');
  try {
    await connectToDatabase();
    const result = await generateAndUploadBackup('scheduled_cron');
    console.log('✅ [Cron]: Automated daily backup completed:', result.fileName || result);
  } catch (err) {
    console.error('❌ [Cron]: Automated daily backup failed:', err.message);
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
