/**
 * Hostinger Root Entry Point Bridge (server.js)
 *
 * Starts the server UNDER THE SUPERVISOR by default, so a crash is followed by
 * a restart rather than by an outage that lasts until somebody notices.
 *
 * This was not always the default, and the reason is worth keeping written
 * down. Making it the default the first time took the site down: the
 * supervisor starts the server with fork(), fork does NOT pass V8 flags to the
 * child, and `npm start` runs node with --max-old-space-size=1536. The
 * supervised child therefore lost its heap ceiling, sized itself from total
 * machine memory, believed it could grow to several gigabytes, and was killed
 * by the platform for exceeding the plan long before V8 would have collected.
 *
 * That cause is fixed — supervisor.cjs forwards execArgv and the environment —
 * and the fix is verified rather than assumed: tests/verify-supervisor.cjs
 * starts the real thing and reads the child's own boot line to confirm the
 * ceiling survived, and kills it twice to confirm it comes back.
 *
 * The supervisor deliberately does NOT restart after a clean exit or a stop
 * signal, and gives up after ten quick failures in a row rather than looping
 * on a broken build.
 *
 * Escape hatch: DISABLE_SUPERVISOR=1 runs the server directly. If supervision
 * ever misbehaves on the platform again, that is the switch — no redeploy of
 * code required.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const supervisionDisabled = String(process.env.DISABLE_SUPERVISOR || '').trim() === '1';

if (supervisionDisabled) {
  console.log('[Entry] DISABLE_SUPERVISOR=1 — starting the server directly, with no auto-restart.');
  require('./server/start.cjs');
} else {
  console.log('[Entry] Starting under the supervisor; a crash will be restarted automatically.');
  require('./server/supervisor.cjs');
}
