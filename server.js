/**
 * Hostinger Root Entry Point Bridge (server.js)
 *
 * Hostinger starts the app by running this file. It hands off to the
 * supervisor, which forks the real server and restarts it if it dies.
 *
 * Why the supervisor is in the path at all: server/start.cjs exits on an
 * uncaught exception on purpose, because the process state is undefined after
 * one and serving from it is how this app once ended up alive but answering
 * nothing. Exiting is only the right trade if something starts a clean
 * process afterwards, and nothing in this repository was doing that.
 *
 * ESCAPE HATCH: if the platform turns out to supervise the process itself, or
 * forking interferes with how it detects that the app is ready, set
 *
 *     DISABLE_SUPERVISOR=1
 *
 * in the environment and this falls straight through to the server exactly as
 * it did before. No code change, no redeploy of a different file.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const supervisorDisabled = String(process.env.DISABLE_SUPERVISOR || '').trim() === '1';

if (supervisorDisabled) {
  console.log('[Entry] DISABLE_SUPERVISOR=1 — starting the server directly, unsupervised.');
  require('./server/start.cjs');
} else {
  require('./server/supervisor.cjs');
}
