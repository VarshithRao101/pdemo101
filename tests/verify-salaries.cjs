/**
 * Phase 13 — staff salaries and the monthly ledger.
 *
 * The ledger is a year-keyed map: salaryLedger[academicYear][month]. Two rules
 * sit on top of it, and both are enforced by reading that map back:
 *
 *   - a month's payment may not exceed the teacher's agreed monthly salary
 *   - a new academic year does not open until all twelve months of the
 *     previous one are settled
 *
 * A rule that is enforced by reading a structure is only as strong as the
 * ways that structure can be written. So this phase asks not just "does the
 * guarded route enforce the rule" but "is there another way in".
 *
 * The frontend half of this — monthRecordFor, which decides whether a month
 * renders as paid — cannot be executed from Node without a TypeScript
 * toolchain, so it is checked statically instead. That is weaker than running
 * it and is called out where it happens, rather than dressed up as coverage.
 *
 * Scratch database, dropped at the end.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_verify';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_verify';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');
const Teacher = require('../server/models/Teacher.cjs');

const PORT = 4613;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';
const OTHER = 'Erragattugutta C1';
const MONTHS = ['June', 'July', 'August', 'September', 'October', 'November',
  'December', 'January', 'February', 'March', 'April', 'May'];

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, path, token, body) => new Promise((resolve, reject) => {
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

let seq = 0;

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 13 — STAFF SALARIES AND THE MONTHLY LEDGER  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Teacher.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All', staff: true },
    { key: 'clerk', role: 'clerk', campus: CAMPUS, staff: true },
    { key: 'bare', role: 'clerk', campus: CAMPUS, staff: false }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzsal${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '101112',
        role: a.role, campus: a.campus, name: `Sal ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: a.staff },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }

    const newTeacher = async (salary = 40000, branch = CAMPUS) => {
      // A distinct name AND mobile per teacher: the server refuses a duplicate
      // person, which is correct behaviour and not the thing under test here.
      const n = ++seq;
      const id = `ZZT${String(Date.now()).slice(-6)}${String(n).padStart(2, '0')}`;
      const res = await req('POST', '/api/admin1/teachers', tokens.admin1, {
        id, name: `Salary Test ${n}`, subject: 'Physics', branch,
        salary, mobile: `98765${String(40000 + n).slice(-5)}`, classification: 'Teaching'
      });
      if (res.status >= 300) throw new Error(`teacher create failed: ${res.raw.slice(0, 200)}`);
      return id;
    };
    const payMonth = (id, token, body) =>
      req('POST', `/api/admin1/teachers/${id}/salary-month`, token, body);

    // =================================================================
    section('Recording a month');

    const t1 = await newTeacher(40000);
    const paid = await payMonth(t1, tokens.clerk,
      { academicYear: '2026-2027', month: 'June', amountPaid: 40000 });
    ok('a valid month is recorded', paid.status < 300, `status ${paid.status}: ${paid.raw.slice(0, 160)}`);

    let teacher = await Teacher.findOne({ id: t1 }).lean();
    ok('it lands under the right year and month',
      !!teacher?.salaryLedger?.['2026-2027']?.June,
      `ledger: ${JSON.stringify(teacher?.salaryLedger || {}).slice(0, 200)}`);
    ok('the audit trail records it',
      !!await db.collection('auditlogs').findOne({ entityId: t1 }), 'no audit record');

    const REJECT = [
      ['no month', { academicYear: '2026-2027', amountPaid: 1000 }],
      ['a month that is not a month', { academicYear: '2026-2027', month: 'Smarch', amountPaid: 1000 }],
      ['a malformed academic year', { academicYear: 'not-a-year', month: 'July', amountPaid: 1000 }],
      ['a year outside the supported range', { academicYear: '2050-2051', month: 'July', amountPaid: 1000 }],
      ['a negative amount', { academicYear: '2026-2027', month: 'July', amountPaid: -1 }],
      ['more than the agreed salary', { academicYear: '2026-2027', month: 'July', amountPaid: 400000 }]
    ];
    for (const [label, body] of REJECT) {
      const res = await payMonth(t1, tokens.clerk, body);
      ok(`${label} is refused`, res.status >= 400 && res.status < 500, `status ${res.status}`);
    }

    // Paying less than the agreed salary is normal — a part payment, a month
    // someone joined midway — and must stay allowed.
    const partial = await payMonth(t1, tokens.clerk,
      { academicYear: '2026-2027', month: 'July', amountPaid: 15000 });
    ok('a part payment is allowed', partial.status < 300, `status ${partial.status}`);

    const noPerm = await payMonth(t1, tokens.bare,
      { academicYear: '2026-2027', month: 'August', amountPaid: 1000 });
    ok('a clerk without manageStaff cannot record a month', noPerm.status === 403, `status ${noPerm.status}`);

    const tOther = await newTeacher(30000, OTHER);
    const crossCampus = await payMonth(tOther, tokens.clerk,
      { academicYear: '2026-2027', month: 'June', amountPaid: 1000 });
    ok('a clerk cannot pay staff at another campus', crossCampus.status === 403,
      `status ${crossCampus.status}`);

    // =================================================================
    section('The year lock');

    const t2 = await newTeacher(20000);
    const early = await payMonth(t2, tokens.clerk,
      { academicYear: '2027-2028', month: 'June', amountPaid: 20000 });
    ok('a later year is locked while the previous one is unfinished',
      early.status === 403, `status ${early.status}: ${early.raw.slice(0, 140)}`);

    for (const m of MONTHS) {
      const res = await payMonth(t2, tokens.clerk,
        { academicYear: '2026-2027', month: m, amountPaid: 20000 });
      if (res.status >= 300) throw new Error(`could not pay ${m}: ${res.raw.slice(0, 160)}`);
    }
    teacher = await Teacher.findOne({ id: t2 }).lean();
    const paidCount = MONTHS.filter(m => {
      const r = teacher.salaryLedger?.['2026-2027']?.[m];
      return r && (r.status === 'Paid' || r.paid === true);
    }).length;
    ok(`all twelve months of the first year are settled (${paidCount}/12)`, paidCount === 12,
      `${paidCount} settled`);

    const nowOpen = await payMonth(t2, tokens.clerk,
      { academicYear: '2027-2028', month: 'June', amountPaid: 20000 });
    ok('the next year opens once twelve months are settled', nowOpen.status < 300,
      `status ${nowOpen.status}: ${nowOpen.raw.slice(0, 140)}`);

    // =================================================================
    section('A new year starts empty');

    teacher = await Teacher.findOne({ id: t2 }).lean();
    const secondYear = teacher.salaryLedger?.['2027-2028'] || {};
    const settledInSecond = MONTHS.filter(m => {
      const r = secondYear[m];
      return r && (r.status === 'Paid' || r.paid === true);
    });
    ok(`only the month actually paid is settled in the new year (${settledInSecond.length}/1)`,
      settledInSecond.length === 1 && settledInSecond[0] === 'June',
      `settled: ${settledInSecond.join(', ')}`);

    // The legacy flat map carries no year and is overwritten every time the
    // same month is paid again. The frontend must not fall back to it for a
    // later year, or a freshly opened 2027-2028 renders as fully paid.
    ok('the legacy flat map still holds last year\'s months',
      Object.keys(teacher.monthlySalaries || {}).length > 0,
      'nothing to fall back to, so the guard below is untestable');

    // STATIC CHECK, not an executed one. Called out because it is weaker:
    // it proves the guard is written, not that it behaves.
    const adminSrc = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'views', 'AdminPortalViews.tsx'), 'utf8');
    const helper = adminSrc.slice(adminSrc.indexOf('export function monthRecordFor'),
      adminSrc.indexOf('export function isMonthPaid'));
    ok('monthRecordFor reads the per-year ledger first',
      /salaryLedger\?\.\[year\]\?\.\[month\]/.test(helper), helper.slice(0, 200));
    ok('it falls back to the legacy map ONLY for the first academic year (static check)',
      /year === ACADEMIC_YEARS\[0\]/.test(helper) && /monthlySalaries/.test(helper),
      'without this guard a newly opened year renders as fully paid');

    // =================================================================
    section('Another way into the ledger');

    // The year lock and the per-month ceiling are both enforced by reading
    // salaryLedger. If that map can be written directly, neither rule holds:
    // a fabricated year of "Paid" months unlocks the next year and invents a
    // payment history that no salary-month request ever created.
    const t3 = await newTeacher(25000);
    const fabricated = {};
    for (const m of MONTHS) fabricated[m] = { status: 'Paid', amountPaid: 999999, paid: true };

    const inject = await req('PATCH', `/api/admin2/staff-salaries/${t3}`, tokens.clerk,
      { salaryLedger: { '2026-2027': fabricated } });
    const after = await Teacher.findOne({ id: t3 }).lean();
    const injected = MONTHS.filter(m => {
      const r = after.salaryLedger?.['2026-2027']?.[m];
      return r && (r.status === 'Paid' || r.paid === true);
    }).length;
    ok('the salary ledger cannot be written wholesale through the salary endpoint',
      injected === 0,
      `status ${inject.status}, ${injected} month(s) marked paid without a single payment — `
      + 'this unlocks the next year and invents a payment history');

    const bigSalary = await req('PATCH', `/api/admin2/staff-salaries/${t3}`, tokens.clerk,
      { salary: 1e15 });
    const salAfter = await Teacher.findOne({ id: t3 }).lean();
    ok('an absurd salary is refused',
      bigSalary.status === 400 && salAfter.salary === 25000,
      `status ${bigSalary.status}, salary is now ${salAfter.salary} — `
      + 'the monthly ceiling is derived from this figure');

    const negSalary = await req('PATCH', `/api/admin2/staff-salaries/${t3}`, tokens.clerk,
      { salary: -1 });
    ok('a negative salary is refused', negSalary.status === 400, `status ${negSalary.status}`);

    const bareSalary = await req('PATCH', `/api/admin2/staff-salaries/${t3}`, tokens.bare,
      { salary: 1 });
    ok('a clerk without manageStaff cannot change a salary', bareSalary.status === 403,
      `status ${bareSalary.status}`);

    const foreignSalary = await req('PATCH', `/api/admin2/staff-salaries/${tOther}`, tokens.clerk,
      { salary: 1 });
    ok('a clerk cannot change a salary at another campus', foreignSalary.status === 403,
      `status ${foreignSalary.status}`);

    // A legitimate raise must still work, and must lift the monthly ceiling.
    const raise = await req('PATCH', `/api/admin2/staff-salaries/${t3}`, tokens.clerk,
      { salary: 30000 });
    ok('a legitimate raise is accepted', raise.status < 300, `status ${raise.status}`);
    const afterRaise = await payMonth(t3, tokens.clerk,
      { academicYear: '2026-2027', month: 'June', amountPaid: 30000 });
    ok('the raise lifts the monthly ceiling with it', afterRaise.status < 300,
      `status ${afterRaise.status}: ${afterRaise.raw.slice(0, 140)}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 13 — SALARIES: ${pass} passed, ${fail} failed`);
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
