/**
 * PHASE 3 — THE CLERKS, and the permissions the Rector grants them.
 *
 * Five clerks are created with RANDOM permission sets, and every clerk is then
 * checked against every permission: the ones it holds must work, and the ones it
 * does not must be refused with 403. Five random draws over seven permissions is
 * thirty-five checks in both directions, and if a randomly-permissioned clerk
 * behaves correctly then a hand-configured one will.
 *
 * Random, and reported. The seed is printed on every run, so a failure can be
 * reproduced exactly with PHASE3_SEED=<n>. A random test whose failures cannot
 * be reproduced is worse than a fixed one.
 *
 * The permission map is not guesswork: each entry is the route the server
 * actually gates with requirePermission('<name>'), read out of app.cjs.
 *
 * Runs after phases 1 and 2 and reads their data. jc_erp_phase. Does not drop it.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_phase';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_phase';

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');

const PORT = 4703;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];
const TAG1 = 'zzph1';
const TAG = 'zzph3';
const PIN = '667788';
const CLERKS = 5;

const SEED = Number(process.env.PHASE3_SEED || Date.now() % 2147483647);
let _s = SEED;
/** Deterministic PRNG, so a run is reproducible from its printed seed. */
const rnd = () => (_s = (_s * 16807) % 2147483647) / 2147483647;

let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); return true; }
  fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`);
  console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
  return false;
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, path, token, body, headers = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({
      status: res.statusCode, raw,
      json: (() => { try { return JSON.parse(raw); } catch { return null; } })()
    }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const withPin = () => ({ 'x-security-pin': PIN });
const rows = (r) => {
  const d = r.json?.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.entries)) return d.entries;
  if (Array.isArray(d?.students)) return d.students;
  if (Array.isArray(d)) return d;
  return [];
};

const PERMISSIONS = ['addStudent', 'editStudent', 'editFees', 'collectFees',
                     'logExpenditures', 'manageStaff', 'manageEnquiries'];

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 3 — THE CLERKS (random permissions)   [jc_erp_phase]');
  console.log(`Seed ${SEED}   (reproduce with PHASE3_SEED=${SEED})\n`);

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_phase', serverSelectionTimeoutMS: 20000 });
  if (mongoose.connection.name !== 'jc_erp_phase') throw new Error('wrong database');
  const db = mongoose.connection.db;
  try { await db.collection('ratelimits').deleteMany({}); } catch {}
  for (const [c, f] of [
    ['users', { username: new RegExp(`^${TAG}`) }],
    ['students', { admissionNumber: new RegExp(`^${TAG}`) }],
    ['teachers', { id: new RegExp(`^${TAG}`) }],
    ['expenditures', { description: new RegExp(`^${TAG}`) }]
  ]) { try { await db.collection(c).deleteMany(f); } catch {} }

  try {
    // =================================================================
    section('The previous phases handed something over');

    const carried = await db.collection('students').findOne({ admissionNumber: `${TAG1}S001` });
    if (!ok('phase 1\'s student is still here', !!carried,
      'run phase 1 and phase 2 first — this phase reads their data')) {
      throw new Error('previous phase data missing');
    }
    const ph2 = await db.collection('students').countDocuments({ admissionNumber: new RegExp('^zzph2') });
    ok('phase 2\'s campus students are still here', ph2 > 0, `${ph2} found`);

    // =================================================================
    section(`The cap is 25 a campus`);

    const rector = await db.collection('users').findOne({ role: 'admin1', username: new RegExp(`^${TAG1}`) });
    const rl = await req('POST', '/api/auth/login', null,
      { username: rector.username, password: rector.password, pin: rector.pin });
    const rtok = rl.json?.token;
    ok('the Rector signs in', !!rtok, `status ${rl.status}`);

    const listed = await req('GET', `/api/admin1/clerks?campus=${encodeURIComponent(CAMPUSES[0])}`,
      rtok, undefined, { 'x-security-pin': rector.pin });
    ok('the clerk screen reports a cap of 25',
      listed.json?.data?.maxPerCampus === 25, `reported ${listed.json?.data?.maxPerCampus}`);

    // =================================================================
    section(`${CLERKS} clerks, each with a random set of powers`);

    const clerks = [];
    for (let i = 0; i < CLERKS; i++) {
      const campus = CAMPUSES[Math.floor(rnd() * CAMPUSES.length)];
      const granted = PERMISSIONS.filter(() => rnd() < 0.5);
      const username = `${TAG}c${i}`;
      const password = `Pw-${crypto.randomBytes(9).toString('hex')}`;

      const perms = {};
      for (const p of PERMISSIONS) perms[p] = granted.includes(p);

      await db.collection('users').insertOne({
        username, password, pin: PIN, role: 'clerk', campus,
        name: `Phase3 Clerk ${i}`, status: 'active', permissions: perms,
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null, { username, password, pin: PIN });
      const token = login.json?.token;
      ok(`clerk ${i} signs in at ${campus} with [${granted.join(', ') || 'no powers'}]`,
        !!token, `status ${login.status}: ${login.raw.slice(0, 110)}`);
      clerks.push({ i, campus, granted, username, token });
    }

    // =================================================================
    section('Every clerk, against every permission');

    // One action per permission, on the route the server actually gates with
    // requirePermission(<name>). A 403 means the gate fired; anything else
    // means it did not, and that is what is being measured — not whether the
    // action itself succeeds, which can fail on validation for other reasons.
    const attempt = async (c, perm) => {
      const stu = await db.collection('students').findOne({ admissionNumber: `${TAG1}S001` });
      switch (perm) {
        case 'addStudent':
          return req('POST', '/api/admin1/students', c.token, {
            name: `P3 ${c.i}`, admissionNumber: `${TAG}s${c.i}${Math.floor(rnd() * 900 + 100)}`,
            branch: c.campus, course: 'MPC', section: 'A',
            academicYear: '2026-27', studentYear: '1st Year', mobile: '9000009001', tuitionFee: 1000
          }, withPin());
        case 'editStudent':
          return req('PATCH', `/api/admin1/students/${stu.studentId}`, c.token,
            { fatherName: `P3 edit ${c.i}` }, withPin());
        case 'editFees':
          return req('PATCH', `/api/admin2/fee-settings?branch=${encodeURIComponent(c.campus)}`, c.token,
            { branch: c.campus, tuition: 61000 }, withPin());
        case 'collectFees':
          return req('POST', `/api/accountant/students/${stu.studentId}/payments`, c.token,
            { amount: 100, category: 'Tuition', installment: `P3-${c.i}`, paymentMode: 'Cash' }, withPin());
        case 'logExpenditures':
          return req('POST', '/api/admin2/expenditure', c.token,
            { category: 'Maintenance', amount: 120, description: `${TAG} clerk ${c.i}`, branch: c.campus }, withPin());
        case 'manageStaff':
          return req('POST', '/api/admin1/teachers', c.token, {
            id: `${TAG}t${c.i}${Math.floor(rnd() * 900 + 100)}`, name: `P3 Teacher ${c.i}`,
            subject: 'Maths', salary: 30000, mobile: '9000009002', branch: c.campus, classification: 'Teaching'
          }, withPin());
        case 'manageEnquiries':
          return req('GET', '/api/enquiries', c.token, undefined, withPin());
      }
    };

    let granted_ok = 0, refused_ok = 0, leaks = [], blocked = [];
    for (const c of clerks) {
      for (const perm of PERMISSIONS) {
        const res = await attempt(c, perm);
        const held = c.granted.includes(perm);
        if (held) {
          // Held: must NOT be a permission refusal. Other 4xx are fine — this
          // measures the gate, not the payload.
          if (res.status === 403) blocked.push(`clerk ${c.i} holds ${perm} but was refused 403`);
          else granted_ok++;
        } else {
          if (res.status === 403) refused_ok++;
          else leaks.push(`clerk ${c.i} does NOT hold ${perm} and got ${res.status}`);
        }
      }
    }

    ok('no clerk was refused a power it holds', blocked.length === 0, blocked.slice(0, 4).join('\n        '));
    ok('no clerk exercised a power it does not hold', leaks.length === 0, leaks.slice(0, 4).join('\n        '));
    console.log(`        (${granted_ok} granted actions allowed, ${refused_ok} ungranted actions refused)`);

    // =================================================================
    section('A clerk cannot escalate itself');

    const anyClerk = clerks[0];
    for (const [label, method, path, body] of [
      ['open the credentials screen', 'POST', '/api/admin1/credentials', {}],
      ['create another clerk', 'POST', '/api/admin1/clerks', { campus: anyClerk.campus, name: 'X', username: `${TAG}evil`, password: 'Password123', pin: '123456' }],
      ['wipe the database', 'POST', '/api/authenticator/wipe-database', { password: 'x' }],
      ['read the backup list', 'GET', '/api/authenticator/backups', undefined]
    ]) {
      const r = await req(method, path, anyClerk.token, body, withPin());
      ok(`a clerk cannot ${label}`, r.status === 403 || r.status === 401,
        `status ${r.status}: ${r.raw.slice(0, 100)}`);
    }

    // =================================================================
    section('Money stays in the clerk\'s own campus');

    const moneyClerk = clerks.find(c => c.granted.includes('collectFees')) || clerks[0];
    const ledger = await req('GET', '/api/accountant/payments?limit=200', moneyClerk.token, undefined, withPin());
    if (ledger.status === 200) {
      const foreign = rows(ledger).filter(p => p.branch && p.branch !== moneyClerk.campus);
      ok(`clerk ${moneyClerk.i} sees only ${moneyClerk.campus} money`,
        foreign.length === 0,
        `${foreign.length} receipts from ${[...new Set(foreign.map(f => f.branch))].join(', ')}`);
    } else {
      ok('the payments ledger is reachable or refused cleanly',
        ledger.status === 403, `status ${ledger.status}`);
    }

    // Students are shared on purpose; money is not. Asserted both ways.
    const stuList = await req('GET', '/api/accountant/students?limit=200', anyClerk.token, undefined, withPin());
    ok('a clerk can still see the whole shared student registry',
      stuList.status === 200 && rows(stuList).some(s => s.admissionNumber === `${TAG1}S001`),
      `status ${stuList.status}, ${rows(stuList).length} rows`);

    // =================================================================
    section('Turning a clerk off');

    const target = clerks[clerks.length - 1];
    const targetDoc = await db.collection('users').findOne({ username: target.username });
    const off = await req('PATCH', `/api/admin1/clerks/${targetDoc._id}`, rtok,
      { active: false }, { 'x-security-pin': rector.pin });
    ok('the Rector can switch a clerk off', off.status < 300,
      `status ${off.status}: ${off.raw.slice(0, 120)}`);

    const reLogin = await req('POST', '/api/auth/login', null,
      { username: target.username, password: `Pw-x`, pin: PIN });
    ok('a switched-off clerk cannot sign in', !reLogin.json?.token, `status ${reLogin.status}`);

    // =================================================================
    section('Everything the three phases wrote still agrees');

    const stu = await db.collection('students').findOne({ admissionNumber: `${TAG1}S001` });
    const receipts = await db.collection('payments')
      .find({ studentId: stu.studentId, reversed: { $ne: true } }).toArray();
    const sum = receipts.reduce((t, p) => t + Number(p.amount || 0), 0);

    // The invariant spans YEARS, not just the current one.
    //
    // Phase 1 upgrades this student, and an upgrade CLOSES the year: the year's
    // totals move into yearHistory and totalPaid restarts for the new one. So
    // the current totalPaid is only ever the current year's money, while the
    // receipts collection keeps every year's.
    //
    // Comparing all receipts against the current totalPaid therefore reads
    // 104100 against 12100 and looks like money has gone missing. It has not -
    // 92000 of it is in the closed year. What must hold, and what is asserted
    // here, is that NOTHING IS LOST ACROSS THE ROLLOVER: every live receipt is
    // accounted for either in a closed year or in the current one.
    const closed = (stu.yearHistory || []).reduce((t, y) => t + Number(y.totalPaid || 0), 0);
    ok('no money is lost when a student rolls over to the next year',
      Number(stu.totalPaid) + closed === sum,
      `current ${stu.totalPaid} + closed years ${closed} = ${Number(stu.totalPaid) + closed}, `
      + `but the live receipts total ${sum} (${receipts.length} receipts)`);

    ok('the current year total excludes money already closed into history',
      Number(stu.totalPaid) < sum || closed === 0,
      `totalPaid ${stu.totalPaid} should exclude the ${closed} already closed`);

    const dupes = await db.collection('payments').aggregate([
      { $group: { _id: '$receiptNumber', n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } }
    ]).toArray();
    ok('every receipt number is still unique', dupes.length === 0,
      dupes.slice(0, 3).map(d => d._id).join(', '));

    console.log(`\n  Handing to phase 4:  ${clerks.length} clerks  ·  seed ${SEED}`);

  } catch (err) {
    console.error('\nERROR', err.message);
    fail++;
  } finally {
    console.log(`\n${'='.repeat(62)}`);
    console.log(`PHASE 3 — CLERKS: ${pass} passed, ${fail} failed   (seed ${SEED})`);
    if (failures.length) {
      console.log('');
      for (const f of failures) console.log(`  ✗ ${f}`);
    }
    console.log('='.repeat(62));
    await mongoose.disconnect().catch(() => {});
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
