/**
 * Hostinger Root Entry Point Bridge (server.js)
 *
 * Starts the server IN THIS PROCESS. Supervision is opt-in via
 * ENABLE_SUPERVISOR=1 and must not be turned on here.
 *
 * WHY THE SUPERVISOR IS OFF ON THIS HOST
 *
 * Hostinger watches the process it started — this file — and requires IT to
 * call listen() within three seconds. The supervisor cannot: it fork()s a
 * child, the child binds the port, and the parent never listens at all. So the
 * platform concludes the app failed to start and starts a second instance,
 * whose child then collides on port 3000 with the first child, which was
 * serving perfectly well. The loser exits, the supervisor restarts it, it
 * loses again, and after ten of those the supervisor gives up and the site is
 * down until somebody restarts it by hand.
 *
 * That is not a theory. It is in the runtime log, in this order:
 *
 *   started child PID 1873896
 *   Listening on port 3000 (PID 1873896)          <- the child, healthy
 *   App did not call listen() within 3 seconds    <- the platform, watching the parent
 *   Starting under the supervisor                 <- a second instance
 *   Port 3000 is already in use                   <- which collides with the first
 *
 * and in the lifecycle collection as 105 EADDRINUSE exits since 14 August.
 * Every one of them was this, and none of them was a port bug.
 *
 * DISABLE_SUPERVISOR=1 was the documented escape hatch and it was set in the
 * panel. It did not reach the process — the log still says "Starting under
 * the supervisor", and NODE_OPTIONS did not arrive either. So the default is
 * inverted instead of relying on a variable that this host does not deliver.
 * Correct behaviour must not depend on a setting that can silently fail.
 *
 * What is given up by not supervising: nothing this platform does not already
 * do. Hostinger restarts the app itself. The supervisor was duplicating that
 * and fighting it.
 *
 * The heap ceiling from `npm start` is also lost, because the platform runs
 * this file directly rather than through npm. It is advisory — boot rss is
 * ~105MB — and the deaths in the log are SIGTERM from the platform, not
 * out-of-memory kills. Set NODE_OPTIONS in the panel if it ever starts
 * mattering.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Supervision is OPT-IN, and on this host it must stay off. See above.
const superviseRequested = String(process.env.ENABLE_SUPERVISOR || '').trim() === '1';

if (superviseRequested) {
  console.log('[Entry] ENABLE_SUPERVISOR=1 — starting under the supervisor; a crash will be restarted automatically.');
  require('./server/supervisor.cjs');
} else {
  console.log('[Entry] Starting the server in this process, so the platform sees it call listen().');
  require('./server/start.cjs');
}
