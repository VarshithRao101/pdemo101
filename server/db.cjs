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
 * Every index the application's CORRECTNESS depends on, as opposed to its
 * speed. With autoIndex off nothing is built automatically, and an index that
 * was only ever declared in a schema is not an index — `loginattempts` was
 * declared with a unique key and a TTL and shipped with neither, so the row
 * enforcing the five-attempt lockout had no uniqueness behind it and expired
 * counters were never swept.
 *
 * --- WHY THIS NO LONGER STOPS AT THE EPHEMERAL COLLECTIONS ---------------
 *
 * This list used to cover `loginattempts` alone, on the reasoning that
 * building an index over a large collection at boot is the stall autoIndex was
 * turned off to avoid, and that students and payments belonged in a migration
 * run deliberately. The migration exists — scripts/ensureIndexes.cjs — and
 * that reasoning has one hole in it: nothing runs it. Hostinger deploys by
 * pulling `main` and starting the process. There is no migration step, so on
 * any database nobody remembered to run the script against, the constraints
 * below simply do not exist.
 *
 * That is not an abstract risk. These are the UNIQUE constraints the money
 * path is built on, and Payment.idempotencyKey says so in its own schema: a
 * double-clicked "collect fee" is stopped by the unique index and by nothing
 * else, because two concurrent requests both read "not found" before either
 * inserts. Without the index the duplicate-key branch in the payment handler
 * is unreachable and the second click writes a second receipt against the same
 * money. `admissionNumber` and `receiptNumber` fail the same way, quietly,
 * into the permanent record.
 *
 * Three properties make doing this at boot safe, and all three have to hold:
 *
 *  1. It runs AFTER listen(). connectToDatabase() is called un-awaited from
 *     startServer(), past the bind, so nothing here can be in front of
 *     Hostinger's three-second deadline no matter how long it takes.
 *  2. createIndex NEVER DROPS. syncIndexes() — what the script uses — removes
 *     indexes absent from the schema, which is fine to run by hand and not
 *     fine to run unattended against production. This only ever adds.
 *  3. It is a no-op once built. On every boot after the first, each of these
 *     is an existence check costing a round trip and nothing else.
 *
 * A build that fails is LOGGED AND SURVIVED, never fatal — see the catch
 * below. The likeliest failure is a genuine one worth seeing: a unique build
 * rejected because duplicate rows already exist, which means the data needs a
 * human before the constraint can be enforced.
 *
 * Options must match the schema declarations EXACTLY. An existing index with
 * the same keys and different options raises IndexOptionsConflict rather than
 * being quietly adjusted, so the two definitions have to agree.
 */
const CRITICAL_INDEXES = [
  // Identity: two records for one student, or one receipt number on two
  // payments, are corruption of the permanent record rather than untidiness.
  ['students', { studentId: 1 }, { unique: true, name: 'studentId_1' }],
  ['students', { admissionNumber: 1 }, { unique: true, name: 'admissionNumber_1' }],
  ['payments', { receiptNumber: 1 }, { unique: true, name: 'receiptNumber_1' }],

  // The one that stops a double-click becoming a double charge. Sparse,
  // because rows written before the key existed legitimately have none.
  ['payments', { idempotencyKey: 1 }, { unique: true, sparse: true, name: 'idempotencyKey_1' }],

  ['users', { username: 1 }, { unique: true, name: 'username_1' }],
  ['teachers', { id: 1 }, { unique: true, name: 'id_1' }],
  ['expenditures', { id: 1 }, { unique: true, name: 'id_1' }],
  ['workerpayments', { id: 1 }, { unique: true, name: 'id_1' }],
  ['enquiries', { referenceCode: 1 }, { unique: true, name: 'referenceCode_1' }],
  ['feesettings', { branch: 1 }, { unique: true, name: 'branch_1' }],

  // Sessions and limiters. The rate limiter's atomic upsert is keyed on `key`
  // being unique; without it two requests racing the first window of a key
  // insert two documents and the budget doubles.
  ['refreshtokens', { tokenHash: 1 }, { unique: true, name: 'tokenHash_1' }],
  ['refreshtokens', { expiresAt: 1 }, { expireAfterSeconds: 604800, name: 'expiresAt_1' }],
  ['ratelimits', { key: 1 }, { unique: true, name: 'key_1' }],
  ['ratelimits', { resetAt: 1 }, { expireAfterSeconds: 900, name: 'resetAt_1' }],
  ['loginattempts', { key: 1 }, { unique: true, name: 'key_1', background: true }],
  ['loginattempts', { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_1', background: true }]
];

let indexesEnsured = false;

async function ensureCriticalIndexes(connection) {
  if (indexesEnsured) return;
  indexesEnsured = true;

  // What each collection already has, read once, so the summary can say which
  // indexes this boot actually built rather than just that it tried.
  const existing = new Map();
  for (const [collection] of CRITICAL_INDEXES) {
    if (existing.has(collection)) continue;
    const names = await connection.collection(collection).indexes()
      .then(ix => ix.map(i => i.name))
      .catch(() => []); // collection not created yet — everything is missing
    existing.set(collection, names);
  }

  const created = [];
  const failed = [];

  for (const [collection, spec, options] of CRITICAL_INDEXES) {
    const already = existing.get(collection).includes(options.name);
    try {
      await connection.collection(collection).createIndex(spec, options);
      if (!already) created.push(`${collection}.${options.name}`);
    } catch (err) {
      // Never fatal. A duplicate-key failure here means real rows conflict and
      // needs a human; a mismatched existing definition means someone changed
      // it deliberately. Either way the app must still start, and the failure
      // must be visible rather than swallowed.
      failed.push(`${collection}.${options.name}`);
      console.error(`[Database]: Could not create index ${collection}.${options.name}:`, err.message);
    }
  }

  // Silence on a healthy boot would be indistinguishable from this never
  // having run, which is the failure mode that put a production database into
  // service with no unique constraint on its receipt numbers.
  if (created.length) {
    console.log(`[Database]: Built ${created.length} missing index(es): ${created.join(', ')}`);
  }
  if (failed.length) {
    console.error(
      `[Database]: ${failed.length} index(es) COULD NOT BE BUILT: ${failed.join(', ')}. ` +
      'A unique index that will not build means duplicate rows already exist — ' +
      'the constraint is NOT being enforced until that data is resolved.'
    );
  }
  if (!created.length && !failed.length) {
    console.log(`[Database]: All ${CRITICAL_INDEXES.length} critical indexes present.`);
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
      // 45s was too long to be useful to anybody.
      //
      // When Atlas dropped a connection mid-query during testing, the socket
      // sat there for the full 45 seconds and the request finally answered 503
      // after 51. Nobody at a fee counter waits 51 seconds — they reload, and
      // now there are two requests in flight instead of one. The slowest real
      // query measured here is 2.5s (212 worker payments), so 20s is still
      // far above anything legitimate while failing fast enough that the
      // clerk sees an error and can retry deliberately.
      socketTimeoutMS: 20000,
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
