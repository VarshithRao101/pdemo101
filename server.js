/**
 * Hostinger Root Entry Point Bridge (server.js)
 * Bridges Hostinger's default "server.js" startup file expectation
 * to the persistent Express server entry point in server/start.cjs.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('./server/start.cjs');
