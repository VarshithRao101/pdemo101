/**
 * Phase 19 — the audit trail.
 *
 * An audit trail is worth exactly what it records about the things people
 * would rather it did not. So this phase does not check that a successful
 * action is logged and stop there — it performs actions that are REFUSED and
 * checks those are logged too, because an attacker's failed attempt is the
 * entry the college most needs and the one most likely to be missing.
 *
 * Two other properties matter as much as completeness: the entry must name a
 * person rather than a role, and it must never contain the credential that was
 * used. A log that leaks passwords is a second copy of the password file.
 *
 * Scratch database, dropped at the end.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_verify';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_verify';

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');
const { loadRoutes, rolesFor } = require('./lib/routes.cjs');

const PORT = 4619;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';
const OTHER = 'Erragattugutta C1';
const PIN = '246810';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, p, token, body, headers = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${p}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({ status: res.statusCode, raw, json: (() => { try { return JSON.parse(raw); } catch { return null; } })() }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

let seq = 0;

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 19 — THE AUDIT TRAIL  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  const logs = db.collection('auditlogs');
  const clearLimits = () => db.collection('ratelimits').deleteMany({ key: /^ratelimit_/ });

  const TAG = crypto.randomBytes(3).toString('hex');
  const RECTOR = { username: `zzaudadmin${TAG}`, password: `Pw-${crypto.randomBytes(9).toString('hex')}` };
  const CLERK = { username: `zzaudclerk${TAG}`, password: `Cw-${crypto.randomBytes(9).toString('hex')}`, pin: '135791' };
  let rector, clerk;

  // Every secret this run uses. None may appear anywhere in the trail.
  const SECRETS = [RECTOR.password, CLERK.password, CLERK.pin, PIN];

  try {
    await db.collection('users').insertMany([
      { username: RECTOR.username, password: RECTOR.password, pin: PIN,
        role: 'admin1', campus: 'All', name: 'Audit Rector', status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date() },
      { username: CLERK.username, password: CLERK.password, pin: CLERK.pin,
        role: 'clerk', campus: CAMPUS, name: 'Audit Clerk', status: 'active',
        permissions: { addStudent: true, editStudent: false, editFees: false,
                       collectFees: true, logExpenditures: false, manageStaff: false },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date() }
    ]);
    rector = (await req('POST', '/api/auth/login', null, RECTOR)).json?.token;
    clerk = (await req('POST', '/api/auth/login', null,
      { username: CLERK.username, password: CLERK.password, pin: CLERK.pin })).json?.token;
    if (!rector || !clerk) throw new Error('sign-in failed');

    const newStudent = async () => {
      const n = ++seq;
      const res = await req('POST', '/api/accountant/students', clerk, {
        name: `Audit Student ${n}`, admissionNumber: `ZZA${String(Date.now()).slice(-6)}${String(n).padStart(2, '0')}`,
        branch: CAMPUS, course: 'MPC', section: 'A', studentYear: 'First Year',
        mobile: '9876543210', parentMobile: '9876543211',
        tuitionFee: 20000, hostelFee: 0, transportFee: 0, miscellaneousFee: 0, previousPending: 0
      });
      if (!res.json?.data) throw new Error(`create failed: ${res.raw.slice(0, 200)}`);
      return res.json.data;
    };

    // =================================================================
    section('Successful actions leave a trail');

    const before = await logs.countDocuments();
    const s = await newStudent();
    await req('POST', `/api/accountant/students/${s.studentId}/payments`, clerk, { amount: 5000 });
    const after = await logs.countDocuments();
    ok(`actions add entries (${before} -> ${after})`, after > before, 'nothing was recorded');

    const created = await logs.findOne({ entityId: s.studentId, action: /student\.create/ });
    ok('the student creation is recorded', !!created, 'no student.create entry');
    ok('it names the person who did it', created?.actorUsername === CLERK.username,
      `actor ${created?.actorUsername} — a role is not accountable, a person is`);
    ok('it records their role', created?.actorRole === 'clerk', `role ${created?.actorRole}`);
    ok('it records the campus', created?.actorCampus === CAMPUS || created?.campus === CAMPUS,
      `campus ${created?.campus}/${created?.actorCampus}`);
    ok('it has a readable summary', typeof created?.summary === 'string' && created.summary.length > 10,
      `summary: ${created?.summary}`);
    ok('it is timestamped', !!created?.createdAt, 'no timestamp');
    ok('it is marked successful', created?.outcome === 'success', `outcome ${created?.outcome}`);

    const payLog = await logs.findOne({ action: 'payment.collect' });
    ok('the payment is recorded', !!payLog, 'money moved with no entry');
    ok('the payment entry carries the amount', Number(payLog?.amount) === 5000,
      `amount ${payLog?.amount}`);

    // =================================================================
    section('Refused actions leave a trail too');

    // The entries the college most needs are the ones somebody was trying not
    // to leave. A clerk without editFees attempting a write-off through the
    // upgrade form is the canonical case.
    const paid = await newStudent();
    await req('POST', `/api/accountant/students/${paid.studentId}/payments`, clerk, { amount: 20000 });
    const denied = await req('POST', `/api/accountant/students/${paid.studentId}/upgrade`,
      clerk, { tuitionFee: 20000, tuitionWaiver: 5000 });
    ok('the attempted write-off is refused', denied.status === 403, `status ${denied.status}`);
    // The permission gate is middleware and runs BEFORE the handler, so the
    // entry it writes names the POWER that was refused rather than the student
    // the caller was aiming at. Querying by student id found nothing and made
    // a working audit look absent.
    const deniedLog = await logs.findOne({ outcome: 'denied', actorUsername: CLERK.username });
    ok('the refusal is recorded', !!deniedLog, 'a refused write-off left no trace');
    ok('it says which power was refused',
      deniedLog?.entityType === 'permission' && !!deniedLog?.entityId,
      `entityType ${deniedLog?.entityType}, entityId ${deniedLog?.entityId}`);
    ok('it names who attempted it', deniedLog?.actorUsername === CLERK.username,
      `actor ${deniedLog?.actorUsername}`);
    ok('it is marked denied, not successful', deniedLog?.outcome === 'denied',
      `outcome ${deniedLog?.outcome}`);

    // =================================================================
    section('No secret is ever written to the trail');

    // Everything, not a sample: one entry carrying a password is one too many.
    const all = await logs.find({}).toArray();
    const leaked = [];
    for (const entry of all) {
      const text = JSON.stringify(entry);
      for (const secret of SECRETS) {
        if (secret && text.includes(secret)) {
          leaked.push(`${entry.action}: contains a credential used in this run`);
        }
      }
    }
    ok(`no audit entry contains a credential (${all.length} entries checked)`,
      leaked.length === 0, [...new Set(leaked)].join('\n        '));

    const fieldNames = new Set();
    all.forEach(e => Object.keys(e.details || {}).forEach(k => fieldNames.add(k)));
    ok('no entry carries a field named password or pin',
      ![...fieldNames].some(f => /^(password|pin|secret|token)$/i.test(f)),
      [...fieldNames].join(', '));

    // =================================================================
    section('Reading the trail');

    const anon = await req('GET', '/api/admin1/logs', null);
    ok('a stranger cannot read the logs', anon.status === 401, `status ${anon.status}`);
    const byClerk = await req('GET', '/api/admin1/logs', clerk);
    ok('a clerk cannot read the logs', byClerk.status === 403,
      `status ${byClerk.status} — the audited must not read the audit`);

    const read = await req('GET', '/api/admin1/logs', rector);
    ok('the Rector can read the logs', read.status === 200, `status ${read.status}`);
    const rows = read.json?.data?.entries || [];
    ok('entries come back', Array.isArray(rows) && rows.length > 0, `${rows.length} rows`);

    const byActor = await req('GET', `/api/admin1/logs?actor=${encodeURIComponent(CLERK.username)}`, rector);
    const actorRows = byActor.json?.data?.entries || [];
    ok('filtering by actor returns only that actor',
      actorRows.length > 0 && actorRows.every(r => r.actorUsername === CLERK.username),
      `${actorRows.length} rows, actors: ${[...new Set(actorRows.map(r => r.actorUsername))].join(', ')}`);

    const byOutcome = await req('GET', '/api/admin1/logs?outcome=denied', rector);
    const deniedRows = byOutcome.json?.data?.entries || [];
    ok('filtering by outcome returns only refusals',
      deniedRows.length > 0 && deniedRows.every(r => r.outcome === 'denied'),
      `outcomes: ${[...new Set(deniedRows.map(r => r.outcome))].join(', ')}`);

    const byCampus = await req('GET', `/api/admin1/logs?campus=${encodeURIComponent(OTHER)}`, rector);
    const otherRows = byCampus.json?.data?.entries || [];
    ok('filtering by a campus with no activity returns nothing',
      otherRows.length === 0, `${otherRows.length} rows for a campus nothing happened at`);

    // =================================================================
    section('The trail cannot be edited');

    // There is no route that updates or deletes an audit entry, and there
    // must not be. A log the audited can rewrite is not a log.
    // Anchored on the audit-log RESOURCE. A loose /log|audit/ also matches
    // /login and /logout, which are neither.
    const mutating = loadRoutes().filter(r =>
      r.method !== 'GET' && /\/(logs|audit-logs)(\/|$)/.test(r.path));
    ok('no route writes to the audit log', mutating.length === 0,
      mutating.map(r => `${r.method} ${r.path}`).join(', '));

    const logRoutes = loadRoutes().filter(r => /\/logs|audit-logs/.test(r.path));
    ok('every log route is Rector only',
      logRoutes.length > 0 && logRoutes.every(r => {
        const roles = rolesFor(r) || [];
        return roles.length === 1 && roles[0] === 'admin1';
      }),
      logRoutes.map(r => `${r.method} ${r.path}: ${(rolesFor(r) || []).join(',')}`).join('\n        '));

    // =================================================================
    section('Every write route still records something');

    // The static half of this is Phase 1's contract check, which covers all
    // 124 bindings. Repeated here against the LIVE parse so that a route
    // added since cannot slip past both.
    const unaudited = loadRoutes().filter(r =>
      r.method !== 'GET' &&
      r.chain.includes('authenticateToken') &&
      !/recordAudit\s*\(/.test(r.body));
    ok(`every authenticated write records an audit entry (${loadRoutes().filter(r => r.method !== 'GET').length} write routes)`,
      unaudited.length === 0,
      unaudited.map(r => `${r.method} ${r.path} (app.cjs:${r.line})`).join('\n        '));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 19 — AUDIT: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    if (mongoose.connection.name === 'jc_erp_verify') {
      await mongoose.connection.dropDatabase();
      console.log('  (scratch database dropped)');
    }
    server.close();
    await mongoose.disconnect();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
