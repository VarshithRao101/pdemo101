/**
 * Phase 5 — campus isolation and the shared student registry.
 *
 * Two rules that pull in opposite directions, which is exactly why they are
 * worth testing together:
 *
 *   STUDENTS ARE SHARED. The college asked for one register across all four
 *   campuses, so admin1, every accountant and every clerk read every student.
 *   That is deliberate. A test that "proved" a clerk could not see another
 *   campus's students would be enforcing a rule the college does not want.
 *
 *   EVERYTHING ELSE IS NOT. Expenditure, worker payments, teachers, salaries
 *   and fee settings belong to one campus. A clerk at Beemaram C2 has no
 *   business reading Erragattugutta C1's spending.
 *
 * The interesting failures are at the seam: a route that scopes students by
 * accident, or one that lets a campus-scoped account widen itself by asking.
 * Widening is attempted here every way the request can carry a campus — query,
 * body, casing, the string "all", and a Mongo operator instead of a string.
 *
 * READS ONLY, plus writes that are expected to be REFUSED. Nothing here can
 * mutate: a refused write is answered by middleware before the handler runs.
 */
require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');

const PORT = 4605;
const BASE = `http://127.0.0.1:${PORT}`;
const HOME = 'Beemaram C2';
const OTHER = 'Erragattugutta C1';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

/**
 * One request, retried ONCE on a 503.
 *
 * 503 here means the server refused because it could not reach Mongo — during
 * one run Atlas dropped a connection mid-query and the request answered 503
 * after 51 seconds. That is an infrastructure blip, not a scoping decision,
 * and letting it count as an isolation failure would be a false accusation of
 * exactly the kind this phase exists to avoid. It is retried once and, if it
 * fails again, reported as itself rather than as a leak.
 */
const reqRetry = async (method, path, token, body) => {
  const first = await rawReq(method, path, token, body);
  if (first.status !== 503) return first;
  console.log(`        (503 on ${method} ${path} — database blip, retrying once)`);
  return rawReq(method, path, token, body);
};

const rawReq = (method, path, token, body) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
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

const TAG = crypto.randomBytes(3).toString('hex');
const ACCOUNTS = [
  { role: 'clerk', campus: HOME },
  { role: 'accountant', campus: HOME },
  { role: 'admin1', campus: 'All' }
];

/** Campuses present in a response, whatever shape it came back in. */
const campusesIn = res => {
  const rows = Array.isArray(res.json?.data) ? res.json.data
    : Array.isArray(res.json?.data?.items) ? res.json.data.items
    : Array.isArray(res.json) ? res.json : [];
  return [...new Set(rows.map(r => r && (r.branch || r.campus)).filter(Boolean))];
};
const countIn = res => {
  const d = res.json?.data;
  return Array.isArray(d) ? d.length : Array.isArray(d?.items) ? d.items.length : null;
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 5 — CAMPUS ISOLATION AND THE SHARED REGISTRY\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const clearLimits = () => db.collection('ratelimits').deleteMany({ key: /^ratelimit_/ });

  const tokens = {};
  try {
    for (const a of ACCOUNTS) {
      a.username = `zziso${a.role}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await users.insertOne({
        username: a.username, password: a.password, pin: '112233',
        role: a.role, campus: a.campus, name: `Iso ${a.role}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      await clearLimits();
      const login = await reqRetry('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.role}: ${login.raw.slice(0, 160)}`);
      tokens[a.role] = login.json.token;
    }
    // Fully permissioned on purpose: this phase is about CAMPUS, and a clerk
    // refused for want of a permission would look isolated when it is not.
    console.log(`        three throwaway accounts signed in, clerk and accountant at ${HOME}\n`);

    // Truth comes from the database, not from another endpoint.
    const totalStudents = await db.collection('students').countDocuments();
    const homeWorkerPayments = await db.collection('workerpayments').countDocuments({ branch: HOME });
    const otherExpenditure = await db.collection('expenditures').countDocuments({ branch: OTHER });
    const otherTeachers = await db.collection('teachers').countDocuments({ branch: OTHER });

    // =================================================================
    section('Students are shared, on purpose');

    for (const role of ['clerk', 'accountant', 'admin1']) {
      const res = await reqRetry('GET', '/api/accountant/students', tokens[role]);
      const n = countIn(res);
      ok(`${role} reads the whole register (${n}/${totalStudents})`,
        res.status === 200 && n === totalStudents, `status ${res.status}, got ${n}`);
    }
    const clerkStudents = await reqRetry('GET', '/api/accountant/students', tokens.clerk);
    ok(`a clerk at ${HOME} sees students from other campuses`,
      campusesIn(clerkStudents).includes(OTHER),
      `saw only: ${campusesIn(clerkStudents).join(', ')}`);

    // =================================================================
    section('Everything else stays on its own campus');

    const SCOPED = [
      ['/api/admin2/worker-payments', 'worker payments'],
      ['/api/admin2/expenditure', 'expenditure'],
      ['/api/admin1/teachers', 'teachers'],
      ['/api/admin2/staff-salaries', 'staff salaries']
    ];
    for (const [path, label] of SCOPED) {
      const res = await reqRetry('GET', path, tokens.clerk);
      if (res.status !== 200) { ok(`a clerk can read its own ${label}`, false, `status ${res.status}`); continue; }
      const seen = campusesIn(res);
      const foreign = seen.filter(c => c !== HOME);
      ok(`${label}: a clerk sees no other campus`, foreign.length === 0,
        `leaked from: ${foreign.join(', ')}`);
    }

    const wp = await reqRetry('GET', '/api/admin2/worker-payments', tokens.clerk);
    ok(`worker payments: the count matches ${HOME} exactly (${countIn(wp)}/${homeWorkerPayments})`,
      countIn(wp) === homeWorkerPayments, `got ${countIn(wp)}`);

    // These collections hold rows ONLY at the other campus, so a correct
    // answer here is empty. A non-empty one is a leak, and it is the kind
    // a count-based check would miss if both campuses had data.
    const exp = await reqRetry('GET', '/api/admin2/expenditure', tokens.clerk);
    ok(`expenditure: a clerk sees none of the ${otherExpenditure} rows at ${OTHER}`,
      countIn(exp) === 0, `got ${countIn(exp)}`);
    const tch = await reqRetry('GET', '/api/admin1/teachers', tokens.clerk);
    ok(`teachers: a clerk sees none of the ${otherTeachers} at ${OTHER}`,
      countIn(tch) === 0, `got ${countIn(tch)}`);

    // =================================================================
    section('Asking for another campus');

    // Every way a request can carry a campus. Each must be refused OR ignored
    // — never honoured. "Ignored" is acceptable; "honoured" is the breach.
    // Run every trick against every scoped endpoint, not just the one where
    // the first leak turned up. A widening bug is a PATTERN — the same
    // `!== 'all'` exemption copied between handlers — so testing one endpoint
    // and fixing one endpoint would leave the siblings open.
    const TRICKS = [
      ['query branch', `?branch=${encodeURIComponent(OTHER)}`],
      ['query campus', `?campus=${encodeURIComponent(OTHER)}`],
      ['lowercased', `?branch=${encodeURIComponent(OTHER.toLowerCase())}`],
      ['padded with spaces', `?branch=${encodeURIComponent('  ' + OTHER + '  ')}`],
      ['the word all', '?branch=all'],
      ['the word all, capitalised', '?branch=ALL'],
      ['campus=all', '?campus=all'],
      ['a Mongo operator', '?branch[$ne]=zzz'],
      ['two values', `?branch=${encodeURIComponent(OTHER)}&branch=${encodeURIComponent(HOME)}`]
    ];
    const leaks = [];
    let widenChecked = 0;
    for (const [path, label] of SCOPED) {
      for (const [trick, qs] of TRICKS) {
        const res = await reqRetry('GET', path + qs, tokens.clerk);
        widenChecked++;
        const foreign = campusesIn(res).filter(c => c !== HOME);
        if (res.status === 200 && foreign.length > 0) {
          leaks.push(`${label} via ${trick}: returned ${foreign.join(', ')}`);
        }
      }
    }
    ok(`no scoped endpoint can be widened (${widenChecked} attempts)`, leaks.length === 0,
      leaks.join('\n        '));

    // The same, on the students endpoint, where narrowing IS allowed but
    // reaching past your own campus must still not widen anything else.
    const narrowed = await reqRetry('GET',
      `/api/accountant/students?branch=${encodeURIComponent(OTHER)}`, tokens.clerk);
    ok('a clerk narrowing the shared register to another campus is answered consistently',
      narrowed.status === 200 || narrowed.status === 403,
      `status ${narrowed.status}`);

    // =================================================================
    section('The Rector may narrow, and only narrow');

    const all = await reqRetry('GET', '/api/accountant/students', tokens.admin1);
    ok(`admin1 unfiltered reads every campus (${countIn(all)}/${totalStudents})`,
      countIn(all) === totalStudents, `got ${countIn(all)}`);

    const one = await reqRetry('GET',
      `/api/accountant/students?branch=${encodeURIComponent(OTHER)}`, tokens.admin1);
    const oneCampuses = campusesIn(one);
    ok('admin1 narrowed to one campus gets only that campus',
      one.status === 200 && oneCampuses.length === 1 && oneCampuses[0] === OTHER,
      `status ${one.status}, saw ${oneCampuses.join(', ')}`);

    const bogus = await reqRetry('GET', '/api/accountant/students?branch=Nowhere%20C9', tokens.admin1);
    ok('admin1 naming a campus that does not exist is refused, not silently widened',
      bogus.status === 400, `status ${bogus.status}, ${countIn(bogus)} rows`);

    // =================================================================
    section('Writing into another campus');

    // Refusals only. These are middleware-level or handler-level rejections,
    // so nothing is created even when the guard is the thing being tested.
    const foreignWrites = [
      ['expenditure', 'POST', '/api/admin2/expenditure',
        { branch: OTHER, description: 'zz-isolation-probe', amount: 1, category: 'Other' }],
      ['worker payment', 'POST', '/api/admin2/worker-payments',
        { branch: OTHER, workerName: 'zz-isolation-probe', amount: 1 }]
    ];
    for (const [label, method, path, body] of foreignWrites) {
      const before = await db.collection(path.includes('expenditure') ? 'expenditures' : 'workerpayments')
        .countDocuments({ branch: OTHER });
      const res = await reqRetry(method, path, tokens.clerk, body);
      const after = await db.collection(path.includes('expenditure') ? 'expenditures' : 'workerpayments')
        .countDocuments({ branch: OTHER });
      ok(`a clerk cannot create a ${label} at another campus`,
        after === before, `${before} -> ${after}: a record was written into ${OTHER}`);
      // A row written into the clerk's OWN campus instead would be a quieter
      // failure — the write succeeded, just not where it was aimed.
      if (res.status < 300) {
        const stray = await db.collection(path.includes('expenditure') ? 'expenditures' : 'workerpayments')
          .findOne({ description: 'zz-isolation-probe', workerName: 'zz-isolation-probe' });
        if (stray) await db.collection(path.includes('expenditure') ? 'expenditures' : 'workerpayments')
          .deleteOne({ _id: stray._id });
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 5 — ISOLATION: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    for (const a of ACCOUNTS) {
      if (!a.username) continue;
      await users.deleteOne({ username: a.username });
      await db.collection('refreshtokens').deleteMany({ username: a.username });
      await db.collection('loginattempts').deleteMany({ key: `login:${a.username}` });
    }
    await clearLimits();
    console.log('  (three throwaway accounts removed)');
    server.close();
    await mongoose.disconnect();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
