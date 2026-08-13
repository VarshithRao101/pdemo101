const mongoose = require('mongoose');

/**
 * MongoDB connection for a PERSISTENT Node process (Hostinger), not a
 * serverless one.
 *
 * What changed and why:
 *
 *  - The old module kept its cache on `global.mongoose`. That pattern exists to
 *    survive serverless invocation boundaries; in a long-lived process it just
 *    obscures ownership of the connection. It is now module-local.
 *
 *  - The old module had a 30-second `databaseBlockedUntil` circuit breaker:
 *    after a SINGLE failed connection attempt, every subsequent call threw
 *    immediately for 30 seconds, even after the database had recovered. On a
 *    persistent process that turns a one-second blip into a half-minute
 *    outage, and it fights mongoose's own reconnection logic. Removed —
 *    the driver already handles retry and backoff.
 *
 *  - `bufferCommands` stays false on purpose. When the connection is down we
 *    want queries to fail fast so the fail-closed route gate can return 503,
 *    rather than hanging until a timeout and holding the request open.
 */

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

// Index builds are not run automatically: on a large collection an unexpected
// build can stall startup. Indexes are created deliberately by
// scripts/rotateCredentials.cjs (and any future migration script).
mongoose.set('autoIndex', false);

/**
 * The few indexes the application's CORRECTNESS depends on, as opposed to its
 * speed. With autoIndex off nothing is built automatically, and an index that
 * was only ever declared in a schema is not an index — `loginattempts` was
 * declared with a unique key and a TTL and shipped with neither, so the row
 * enforcing the five-attempt lockout had no uniqueness behind it and expired
 * counters were never swept.
 *
 * Kept to small, ephemeral collections on purpose. Building an index over a
 * large collection at boot is exactly the stall autoIndex was turned off to
 * avoid; anything on students or payments still belongs in a migration run
 * deliberately.
 */
const CRITICAL_INDEXES = [
  ['loginattempts', { key: 1 }, { unique: true, name: 'key_1', background: true }],
  ['loginattempts', { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_1', background: true }]
];

let indexesEnsured = false;

async function ensureCriticalIndexes(connection) {
  if (indexesEnsured) return;
  indexesEnsured = true;
  for (const [collection, spec, options] of CRITICAL_INDEXES) {
    try {
      await connection.collection(collection).createIndex(spec, options);
    } catch (err) {
      // Never fatal. A duplicate-key failure here means real rows conflict and
      // needs a human; a mismatched existing definition means someone changed
      // it deliberately. Either way the app must still start, and the failure
      // must be visible rather than swallowed.
      console.error(`[Database]: Could not create index on ${collection}:`, err.message);
    }
  }
}

let connectionPromise = null;

mongoose.connection.on('connected', () => {
  console.log(`[Database]: Connected to MongoDB (${mongoose.connection.name})`);
});
mongoose.connection.on('disconnected', () => {
  console.warn('[Database]: Disconnected from MongoDB. The driver will keep retrying.');
});
mongoose.connection.on('error', (err) => {
  console.error('[Database]: Connection error:', err.message);
});

async function connectToDatabase() {
  // readyState 1 = connected. Reuse it; this is the hot path on every request.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // A connection attempt is already in flight — join it rather than opening a
  // second one and racing.
  if (connectionPromise) {
    return connectionPromise;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    // No fallback URI, deliberately: a default here is how an app ends up
    // silently reading and writing the wrong database.
    throw new Error('MONGODB_URI is not configured for this deployment.');
  }

  connectionPromise = mongoose
    .connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod',
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000
    })
    .then((m) => {
      connectionPromise = null;
      // Deliberately not awaited: the first request must not wait on an index
      // build, and a failure here is logged rather than allowed to fail the
      // connection every caller is holding.
      ensureCriticalIndexes(m.connection).catch(() => {});
      return m.connection;
    })
    .catch((err) => {
      // Clear the promise so the next request retries instead of being handed
      // a permanently rejected one.
      connectionPromise = null;
      console.error('[Database]: Connection attempt failed:', err.message);
      throw err;
    });

  return connectionPromise;
}

// Retained for callers that still import it. There is no artificial block
// window any more, so this reflects only the real connection state.
function isDatabaseTemporarilyBlocked() {
  return mongoose.connection.readyState !== 1;
}

module.exports = { connectToDatabase, isDatabaseTemporarilyBlocked };
