/**
 * Hostinger Root Entry Point Bridge (server.js)
 *
 * Starts the server DIRECTLY by default. This is the arrangement the app has
 * always run under and the one the platform is known to work with.
 *
 * The supervisor in server/supervisor.cjs is opt-in via ENABLE_SUPERVISOR=1.
 * It is off by default because making it the default took the site down: it
 * starts the server with fork(), and fork does NOT pass V8 flags to the child.
 * `npm start` runs node with --max-old-space-size=1536, so the supervised
 * child lost its heap ceiling, sized itself from total machine memory, and was
 * killed by the platform for exceeding the plan long before V8 would collect.
 *
 * The supervisor now forwards execArgv and NODE_OPTIONS so the ceiling
 * survives, but the default stays direct: an auto-restart that is not there is
 * a smaller problem than a site that will not boot.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const superviseRequested = String(process.env.ENABLE_SUPERVISOR || '').trim() === '1';

if (superviseRequested) {
  console.log('[Entry] ENABLE_SUPERVISOR=1 — starting under the supervisor.');
  require('./server/supervisor.cjs');
} else {
  require('./server/start.cjs');
}
