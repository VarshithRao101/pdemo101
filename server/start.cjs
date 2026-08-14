/**
 * Hostinger Persistent Node.js Server Entry Point
 * Starts the Express HTTP listener and the node-cron background scheduler.
 *
 * WHY THIS FILE IS SHAPED THE WAY IT IS
 *
 * The site kept going down and staying down until someone restarted it by
 * hand. The cause was a zombie process, produced by this chain:
 *
 *   1. app.listen(PORT) was called with no 'error' handler. On a redeploy the
 *      previous process may not have released the port yet, and two instances
 *      can briefly coexist — the nightly backup ran TWICE on two separate
 *      nights, milliseconds apart, which is only possible with two live
 *      processes. Binding then fails with EADDRINUSE.
 *   2. An unhandled 'error' event on an EventEmitter throws.
 *   3. That throw was swallowed by a process-level uncaughtException handler
 *      that logged and carried on.
 *   4. The result was a Node process that was alive, healthy-looking to the
 *      platform, and listening on nothing. Nothing restarted it because
 *      nothing had crashed. The proxy in front had no upstream, so every
 *      request returned 502 — for hours, until a manual restart.
 *
 * So: fail loudly and exit, rather than surviving into a state where the
 * process cannot do its job. A supervised process that exits gets restarted.
 * A zombie does not.
 */

require('dotenv').config();
const cron = require('node-cron');
const mongoose = require('mongoose');
const v8 = require('v8');

/**
 * Says, in the platform's own log, how much heap V8 thinks it may use.
 *
 * V8 sizes its heap from the machine's TOTAL memory, not from the limit the
 * hosting plan actually enforces. On a box with plenty of physical RAM it will
 * happily decide it has multiple gigabytes available, feel no pressure, and
 * let garbage accumulate — while the platform kills the process for crossing a
 * much smaller ceiling. The process never gets to log anything, because a
 * SIGKILL is not catchable: from the outside the site simply goes down and
 * later comes back, with nothing in the application log to explain it.
 *
 * Setting --max-old-space-size below the plan's limit makes V8 collect before
 * the platform intervenes. A JS heap error is recoverable — it is logged, the
 * process exits, and the supervisor restarts it. Being killed is not.
 *
 * This prints the two numbers side by side so the mismatch is visible in the
 * runtime log rather than having to be guessed at.
 */
function reportMemoryCeiling() {
  const mb = (bytes) => Math.round(bytes / 1048576);
  const limit = mb(v8.getHeapStatistics().heap_size_limit);
  const rss = mb(process.memoryUsage().rss);
  const configured = process.execArgv.some(a => a.includes('max-old-space-size'))
    || String(process.env.NODE_OPTIONS || '').includes('max-old-space-size');

  console.log(`🧠 [Memory]: rss ${rss}MB at boot, V8 heap ceiling ${limit}MB`);

  if (!configured) {
    console.warn(
      `⚠️ [Memory]: No --max-old-space-size is set, so V8 sized its heap from total machine ` +
      `memory and believes it may grow to ${limit}MB. If this plan enforces less than that, ` +
      `the platform will kill this process before V8 collects, and the crash cannot be logged. ` +
      `Set NODE_OPTIONS="--max-old-space-size=N", where the resulting ceiling is roughly ` +
      `N + 192MB — the young generation sits on top of the old-space figure, so N=192 yields ` +
      `a 384MB ceiling, not 192MB. Pick N so that N + 192 stays clearly below the plan limit.`
    );
  }
}
const app = require('./app.cjs');
const { connectToDatabase } = require('./db.cjs');
const campusBackup = require('./services/campusBackupService.cjs');

const PORT = process.env.PORT || 3000;
const INSTANCE = `${process.pid}@${new Date().toISOString()}`;

let server = null;
let shuttingDown = false;

/** Exits after giving the log a chance to flush. */
function die(code, reason) {
  console.error(`💀 [Server]: Exiting (${reason}). The platform should restart this process.`);
  setTimeout(() => process.exit(code), 250).unref();
}

// --- Nightly backup ------------------------------------------------------
//
// Guarded by a lock held in the database, so that if two instances are ever
// live at once only one of them runs the backup. Without this the job ran
// twice, writing two identical sets of files and doubling the Drive API load
// at exactly the moment the process was most likely to be struggling.
async function claimNightlyLock() {
  const today = new Date().toISOString().slice(0, 10);
  const locks = mongoose.connection.collection('joblocks');
  try {
    await locks.insertOne({
      _id: `nightly-backup-${today}`,
      claimedBy: INSTANCE,
      claimedAt: new Date()
    });

    // Drop locks older than a week. There is no TTL index here on purpose —
    // autoIndex is off, so an index would have to be created by a migration —
    // and one tiny document a day is cheap to clear inline instead.
    await locks.deleteMany({ claimedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
      .catch(() => {});

    return true;
  } catch (err) {
    // Duplicate key means another instance already claimed tonight's run.
    if (err && err.code === 11000) return false;
    throw err;
  }
}

cron.schedule('0 0 * * *', async () => {
  console.log('[Cron]: Nightly campus backups starting (00:00 UTC)...');
  try {
    await connectToDatabase();

    if (!(await claimNightlyLock())) {
      console.log('[Cron]: Another instance already claimed tonight\'s backup. Skipping.');
      return;
    }

    const result = await campusBackup.backupAllCampuses('scheduled_cron');
    if (result.success) {
      console.log(`[Cron]: Nightly backup complete — ${result.created.length} files written, ${result.pruned || 0} pruned.`);
    } else {
      console.error(`[Cron]: Nightly backup INCOMPLETE — ${result.created.length} written, ${result.failures.length} failed:`);
      for (const f of result.failures) console.error(`  ${f.type}/${f.campus}: ${f.error}`);
    }
  } catch (err) {
    // A failed backup must never take the web server down with it.
    console.error('[Cron]: Nightly backup failed outright:', err.message);
  }
}, { scheduled: true, timezone: 'UTC' });

// --- HTTP server ---------------------------------------------------------

async function startServer() {
  try {
    await connectToDatabase();
    console.log('✅ [Database]: Initial connection established at startup.');
  } catch (dbErr) {
    // Not fatal: requireDatabase returns a clean 503 per request until the
    // database comes back, which is better than refusing to boot at all.
    console.warn('⚠️ [Database]: Initial connection warning at startup:', dbErr.message);
  }

  server = app.listen(PORT);

  server.on('listening', () => {
    console.log(`🚀 [Server]: Listening on port ${PORT} (PID ${process.pid}, Node ${process.version})`);
    reportMemoryCeiling();
  });

  // The handler whose absence caused the outages.
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(
        `❌ [Server]: Port ${PORT} is already in use — another instance is still running. ` +
        'Exiting so the platform starts a single clean process instead of leaving a ' +
        'process alive that is listening on nothing.'
      );
    } else {
      console.error('❌ [Server]: Listener error:', err && err.stack ? err.stack : err);
    }
    die(1, err && err.code ? err.code : 'listen error');
  });

  // Timeouts, so a stalled upstream call cannot hold sockets open indefinitely
  // behind the platform's proxy. Node's defaults leave a hung request occupying
  // a connection for five minutes.
  server.keepAliveTimeout = 65000;   // above a typical 60s proxy idle timeout
  server.headersTimeout = 70000;     // must exceed keepAliveTimeout
  server.requestTimeout = 120000;    // a request may not run longer than 2 minutes
}

// --- Process-level safety ------------------------------------------------
//
// These live here rather than in app.cjs: a module that is imported by tests
// and tooling has no business installing process-wide handlers, and app.cjs
// previously did.

process.on('unhandledRejection', (reason) => {
  // Contained on purpose. A rejected promise from one request must not end the
  // process for every other user, and the state is usually still sound.
  console.error('[Contained] Unhandled promise rejection:',
    reason && reason.stack ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  // NOT contained. After an uncaught exception the process state is undefined
  // — that is exactly how this app ended up alive but serving nothing.
  // Log it in full and exit so a clean process takes over.
  console.error('[FATAL] Uncaught exception:', err && err.stack ? err.stack : err);
  die(1, 'uncaughtException');
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server]: ${signal} received, shutting down.`);

  // Release the port promptly. A redeploy that leaves the old process holding
  // it is what produces the EADDRINUSE collision in the first place.
  const done = () => {
    mongoose.connection.close(false).catch(() => {}).finally(() => process.exit(0));
  };

  if (server) {
    server.close(done);
    setTimeout(() => {
      console.warn('[Server]: Connections did not drain in 10s, exiting anyway.');
      process.exit(0);
    }, 10000).unref();
  } else {
    done();
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
