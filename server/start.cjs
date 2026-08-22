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
 * SIZED FOR THIS PLAN, WHICH IS 3072MB.
 *
 * The dashboard shows a 3072MB limit against roughly 247MB of actual use, so
 * memory pressure is NOT what has been taking this site down — an earlier
 * version of this comment assumed a much smaller plan and said otherwise.
 * V8's untold default of 4288MB still exceeds the real 3072MB cap, so a
 * ceiling is still worth setting; it just belongs well above normal usage
 * rather than close to it. 1536 yields a 1728MB ceiling: comfortably under
 * the plan, and roughly seven times the observed footprint, so it constrains
 * a runaway without ever constraining ordinary work.
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
/**
 * Leaves a permanent record of why this process stopped.
 *
 * The runtime log is the obvious place for this, and it is where the detail
 * lives — but it is also a scrollback that has to be caught in the act, and
 * the platform rotates it. Twice now the cause of an outage has been reasoned
 * about from symptoms rather than read off a log, and twice the reasoning was
 * wrong: first a zombie process, then memory exhaustion, which the dashboard
 * later showed at 8% of the limit.
 *
 * So the exit reason goes into the database, where it survives the process
 * and can be read hours later. A `lifecycle` document per boot and per death,
 * queryable afterwards, answers three things the log makes you catch live:
 * how long the process lived, why it stopped, and whether anything restarted
 * it — because a boot record with no death record before it means something
 * killed the process without warning it, which is a different fault entirely.
 *
 * Strictly best effort. It runs on the way out of a process that is already
 * failing, so it never throws, never blocks the exit for more than a moment,
 * and a database that is itself the problem simply produces no record.
 */
async function recordLifecycle(event, detail = {}) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    await mongoose.connection.collection('lifecycle').insertOne({
      event,
      instance: INSTANCE,
      pid: process.pid,
      at: new Date(),
      uptimeSeconds: Number(process.uptime().toFixed(1)),
      rssMb: Number((process.memoryUsage().rss / 1048576).toFixed(1)),
      node: process.version,
      ...detail
    });
  } catch {
    // A process on its way out must not fail harder because it could not
    // write down why it was leaving.
  }
}

function die(code, reason) {
  // How long this process actually lived is the single most useful number for
  // telling the failure modes apart, and it was not being recorded. Dying
  // seconds after boot is a startup fault looping; dying hours in is something
  // that accumulates; dying at midnight is the backup job.
  const up = process.uptime();
  const lived = up < 90 ? `${up.toFixed(1)}s` : `${(up / 60).toFixed(1)} min`;

  console.error(
    `💀 [Server]: Exiting (${reason}) after ${lived} of uptime, PID ${process.pid}, at ` +
    `${new Date().toISOString()}.`
  );
  // Deliberately not "the platform will restart this" — whether anything
  // supervises this process has never been confirmed, and the difference
  // matters enormously. If the runtime log shows this line and then no further
  // boot banner, nothing is restarting it, and exiting on a recoverable fault
  // is the wrong trade: the site stays down until someone restarts it by hand.
  // If a boot banner follows within seconds, a supervisor exists and exiting
  // is correct. The log now answers that question either way.
  console.error(
    '💀 [Server]: If no "Listening on port" banner follows this line, nothing restarted ' +
    'the process and the site is down until it is started by hand.'
  );
  // Give the record a moment to land, but never more than a moment — the
  // point is to exit, and a database that is itself the fault must not turn
  // a crash into a hang.
  const budgetMs = 1500;
  Promise.race([
    recordLifecycle('exit', { reason, code, lived }),
    new Promise(r => setTimeout(r, budgetMs))
  ]).finally(() => process.exit(code));
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
  // BIND FIRST. Nothing may be awaited before this line.
  //
  // Hostinger's watchdog declares the app failed if listen() has not been
  // called within THREE SECONDS of process start, and starts another instance.
  // That instance then collides on the port, and the loser exits — which is
  // the whole EADDRINUSE epidemic in the lifecycle collection: 105 exits since
  // the 14th, and never once a bug about ports.
  //
  // The database connect used to sit here, awaited, in front of the bind. Its
  // own serverSelectionTimeoutMS is 5000. A five-second timeout in front of a
  // three-second deadline does not sometimes lose; it loses every time the
  // database is not immediately available, which the runtime log shows it
  // repeatedly is not.
  //
  // Binding first is safe and was already the intended design: requireDatabase
  // answers a clean 503 per request until the database is up, so a server
  // listening without one is strictly better than no server at all.
  server = app.listen(PORT);

  server.on('listening', () => {
    // Timestamped so consecutive boots are countable in the runtime log. A
    // burst of these is a crash loop; one followed by silence and 502s is a
    // process that died with nothing to restart it. Both look identical from
    // outside the log, and they need opposite fixes.
    console.log(
      `🚀 [Server]: Listening on port ${PORT} (PID ${process.pid}, Node ${process.version}) ` +
      `at ${new Date().toISOString()}`
    );
    reportMemoryCeiling();
    // A boot record with no matching exit record before it means the previous
    // process was killed outright — SIGKILL, or the platform stopping it —
    // rather than exiting on a fault it noticed. Those need opposite fixes,
    // and without both records they are indistinguishable.
    recordLifecycle('boot', { port: PORT });
  });

  // The handler whose absence caused the outages.
  //
  // EADDRINUSE exits IMMEDIATELY, and a retry loop was tried here and reverted
  // within the hour. Waiting looked right — the port is held transiently on a
  // redeploy — but a process that is retrying has not called listen(), so it
  // trips the same three-second watchdog every three seconds and Hostinger
  // answers by starting yet more instances. It converted a fast collision into
  // a ninety-second one and made the outage worse, live. On a platform that
  // restarts the app for you, losing the race and exiting promptly IS the
  // correct move; the fix for colliding at all is binding first, above.
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

  // The database, AFTER the bind and deliberately not awaited. Every route is
  // already behind requireDatabase, so requests arriving before this resolves
  // are answered 503 rather than hanging.
  connectToDatabase()
    .then(() => console.log('✅ [Database]: Initial connection established at startup.'))
    .catch((dbErr) => console.warn(
      '⚠️ [Database]: Initial connection warning at startup:', dbErr.message));

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
  const up = process.uptime();
  console.log(
    `[Server]: ${signal} received after ${up < 90 ? up.toFixed(1) + 's' : (up / 60).toFixed(1) + ' min'} ` +
    `of uptime, shutting down.`
  );

  // Release the port promptly. A redeploy that leaves the old process holding
  // it is what produces the EADDRINUSE collision in the first place.
  const done = () => {
    mongoose.connection.close(false).catch(() => {}).finally(() => process.exit(0));
  };

  // Recorded so a platform-initiated stop — a redeploy, a plan-level idle
  // sleep, an operator restart — is distinguishable afterwards from the
  // process falling over on its own. They look identical from outside and
  // this is the only signal that separates them.
  recordLifecycle('signal', { signal }).catch(() => {});

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
