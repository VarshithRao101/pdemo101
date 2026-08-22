/**
 * Reading the audit trail without racing the write that produces it.
 *
 * `recordAudit` in server/app.cjs is fire-and-forget ON PURPOSE, and the
 * reason is written out there: an audit write must never turn a successful fee
 * collection into a failed request. It is awaited nowhere, so a route answers
 * 201 with its AuditLog.create() still in flight.
 *
 * That makes `POST, then read auditlogs on the very next line` a race. It is a
 * race the test usually WINS on a warm local connection, which is the worst
 * kind: it passes on the machine of whoever wrote it and fails on a cold
 * containerised Mongo in CI, where four suites lost it at once and looked like
 * four unrelated regressions.
 *
 * So the fix belongs here and not in the server. Making recordAudit awaited
 * would trade a deliberate design for a green checkmark, and would put an
 * audit write back on the critical path of every payment.
 *
 * These poll instead of sleeping a fixed amount: the common case stays fast
 * (one query, no wait) and the slow case is bounded rather than guessed at.
 */

const DEFAULT_TIMEOUT_MS = 4000;
const INTERVAL_MS = 50;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** The collection, whether given a Db or the collection itself. */
function logsOf(dbOrCollection) {
  return typeof dbOrCollection.collection === 'function'
    ? dbOrCollection.collection('auditlogs')
    : dbOrCollection;
}

/**
 * The first audit entry matching `query`, or null if none arrives in time.
 *
 * A null return still means "not written" — the timeout is generous enough
 * that exhausting it is a real failure, not a slow machine. Assert on the
 * result exactly as you would have asserted on a bare findOne.
 */
async function awaitAudit(dbOrCollection, query, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const logs = logsOf(dbOrCollection);
  const deadline = Date.now() + timeout;
  for (;;) {
    const found = await logs.findOne(query);
    if (found) return found;
    if (Date.now() >= deadline) return null;
    await sleep(INTERVAL_MS);
  }
}

/**
 * Waits until at least `atLeast` entries match `query`, then returns the count.
 *
 * For the before/after counting checks. Returns whatever the count reached if
 * the deadline passes, so the assertion reports the real number rather than
 * throwing something less informative.
 */
async function awaitAuditCount(dbOrCollection, atLeast, query = {}, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const logs = logsOf(dbOrCollection);
  const deadline = Date.now() + timeout;
  for (;;) {
    const n = await logs.countDocuments(query);
    if (n >= atLeast) return n;
    if (Date.now() >= deadline) return n;
    await sleep(INTERVAL_MS);
  }
}

module.exports = { awaitAudit, awaitAuditCount };
