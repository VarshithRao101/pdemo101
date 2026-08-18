/**
 * supervisor.cjs — keeps the server process alive.
 *
 * The server exits deliberately on an uncaught exception, because after one
 * the process state is undefined and continuing to serve from it is how this
 * app previously ended up alive but answering nothing. Exiting is only the
 * right trade if something starts a clean process afterwards. Nothing in this
 * repository was doing that, and whether the host does has never been
 * confirmed — so this does it, and the answer stops depending on the platform.
 *
 * What it does NOT do:
 *
 *   - Restart after a clean exit (code 0) or a deliberate signal. Stopping the
 *     server should stop the server.
 *   - Restart forever at full speed. A process that dies instantly on boot —
 *     a bad environment variable, a syntax error — would otherwise be
 *     relaunched hundreds of times a second, burning CPU and filling the log
 *     with the same line while hiding the real fault. Backoff grows with
 *     consecutive quick failures.
 *   - Hide anything. Every restart is logged with why and how long the child
 *     lived, because "it keeps restarting" and "it crashed once at 3am" need
 *     completely different responses.
 *
 * Usage: node server/supervisor.cjs
 */

const { fork } = require('child_process');
const path = require('path');

const CHILD = path.join(__dirname, 'start.cjs');

// A child that lives at least this long is treated as a real run, so a crash
// hours later starts from a clean slate rather than an old backoff.
const HEALTHY_UPTIME_MS = 60_000;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
// Enough attempts to ride out a transient dependency, few enough that a
// genuinely broken build stops rather than looping all night.
const MAX_CONSECUTIVE_FAILURES = 10;

let child = null;
let consecutiveFailures = 0;
let shuttingDown = false;

function log(message) {
  console.log(`[Supervisor] ${new Date().toISOString()} ${message}`);
}

function backoffDelay() {
  const delay = Math.min(BASE_DELAY_MS * 2 ** Math.max(0, consecutiveFailures - 1), MAX_DELAY_MS);
  // Jitter, so several instances restarting after a shared outage do not
  // reconnect to the database in lockstep.
  return Math.round(delay * (0.8 + Math.random() * 0.4));
}

function start() {
  if (shuttingDown) return;

  const startedAt = Date.now();
  child = fork(CHILD, [], { stdio: 'inherit' });
  log(`started child PID ${child.pid}`);

  child.on('exit', (code, signal) => {
    child = null;
    const lived = Date.now() - startedAt;
    const livedText = lived < 90_000 ? `${(lived / 1000).toFixed(1)}s` : `${(lived / 60000).toFixed(1)} min`;

    if (shuttingDown) {
      log(`child exited during shutdown (${signal || code}) after ${livedText}`);
      process.exit(code === null ? 0 : code);
    }

    // A clean exit is a decision, not a fault.
    if (code === 0) {
      log(`child exited cleanly after ${livedText}; not restarting`);
      process.exit(0);
    }

    // Neither is a stop signal. A platform stopping the app usually signals
    // the whole process GROUP, so the child can receive SIGTERM before this
    // process does — and without this the supervisor would read a deliberate
    // shutdown as a crash and start a replacement, leaving a server running
    // that everyone believes was stopped.
    if (signal === 'SIGTERM' || signal === 'SIGINT' || code === 143 || code === 130) {
      log(`child stopped on ${signal || (code === 143 ? 'SIGTERM' : 'SIGINT')} after ${livedText}; treating as a deliberate stop`);
      shuttingDown = true;
      process.exit(0);
    }

    // Only quick failures count toward backoff. Surviving a minute means the
    // last fault was not a boot loop.
    if (lived >= HEALTHY_UPTIME_MS) {
      consecutiveFailures = 0;
    }
    consecutiveFailures++;

    if (consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
      log(
        `child has failed ${consecutiveFailures} times in a row, the last after ${livedText}. ` +
        `Giving up rather than looping — this is a fault that restarting will not fix. ` +
        `Read the errors above.`
      );
      process.exit(1);
    }

    const delay = backoffDelay();
    log(
      `child exited (${signal ? 'signal ' + signal : 'code ' + code}) after ${livedText}. ` +
      `Restart ${consecutiveFailures} of ${MAX_CONSECUTIVE_FAILURES} in ${(delay / 1000).toFixed(1)}s.`
    );
    setTimeout(start, delay);
  });

  child.on('error', (err) => {
    log(`could not start the child: ${err.message}`);
  });
}

/** Pass a stop signal down and let the child close its own connections. */
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`${signal} received, stopping`);

  if (!child) {
    process.exit(0);
    return;
  }

  child.kill(signal);

  // If the child will not go quietly, do not hang forever holding the port.
  setTimeout(() => {
    if (child) {
      log('child did not exit in 10s, forcing');
      child.kill('SIGKILL');
    }
    process.exit(0);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// The supervisor's own job is small enough that a fault in it is a bug, not a
// condition to survive — but it must never take the child down silently.
process.on('uncaughtException', (err) => {
  log(`FAULT in the supervisor itself: ${err && err.stack ? err.stack : err}`);
  if (child) child.kill('SIGTERM');
  process.exit(1);
});

log('supervisor starting');
start();
