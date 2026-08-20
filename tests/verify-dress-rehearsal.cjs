/**
 * Phase 25 — the dress rehearsal.
 *
 * One academic cycle, end to end, the way the college will actually use it:
 * the Rector creates a clerk, the clerk admits students, collects fees, issues
 * receipts a parent can open, records spending and staff pay, closes the year,
 * and the Rector reads the reports and the audit trail.
 *
 * Every earlier phase tested a module. This tests the seams between them —
 * whether the numbers still agree after a full day's work rather than after
 * one operation.
 *
 * The invariant is checked after EVERY step, not only at the end, because a
 * ledger that breaks in step four and is repaired by step nine is still a
 * ledger that was wrong when somebody looked at it.
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
const Student = require('../server/models/Student.cjs');
const Payment = require('../server/models/Payment.cjs');
const Teacher = require('../server/models/Teacher.cjs');
const Expenditure = require('../server/models/Expenditure.cjs');
const WorkerPayment = require('../server/models/WorkerPayment.cjs');

const PORT = 4625;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';
const PIN = '424344';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);
const r2 = n => Math.round(Number(n || 0) * 100) / 100;

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

/** The whole-database invariant, recomputed from the collections. */
const reconcileAll = async () => {
  const students = await Student.find({}).lean();
  const payments = await Payment.find({}).lean();
  const problems = [];
  for (const s of students) {
    const gross = (s.tuitionFee || 0) + (s.hostelFee || 0) + (s.transportFee || 0)
      + (s.miscellaneousFee || 0) + (s.previousPending || 0)
      + (s.customFeeSlots || []).reduce((a, x) => a + (x.amount || 0), 0);
    const waivers = (s.tuitionWaiver || 0) + (s.hostelWaiver || 0)
      + (s.transportWaiver || 0) + (s.miscWaiver || 0);
    const expected = Math.max(0, r2(gross - waivers - (s.totalPaid || 0)));
    if (r2(s.remainingBalance) !== expected) {
      problems.push(`${s.studentId}: balance ${s.remainingBalance}, computes to ${expected}`);
    }
    const rows = r2(payments.filter(p => p.studentId === s.studentId)
      .reduce((a, p) => a + p.amount, 0));
    const claimed = r2((s.totalPaid || 0)
      + (s.yearHistory || []).reduce((a, y) => a + Number(y.totalPaid || 0), 0));
    if (rows !== claimed) problems.push(`${s.studentId}: ${rows} receipted, ${claimed} accounted for`);
  }
  return problems;
};

let step = 0;
const checkpoint = async (what) => {
  const problems = await reconcileAll();
  ok(`the books still balance after ${what}`, problems.length === 0,
    problems.join('\n        '));
  step++;
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 25 — FULL ACADEMIC CYCLE  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  // Dropped at the START as well as the end. A previous run that crashed
  // half way leaves rows behind, and the next run then counts them as its own
  // — which is exactly what happened here: a worker payment created
  // successfully (201) was reported as missing because the collection already
  // held one from a run that never finished. Starting from empty makes every
  // count in this file mean what it says.
  await mongoose.connection.dropDatabase();
  const db = mongoose.connection.db;
  for (const M of [Student, Payment, Teacher, Expenditure, WorkerPayment]) await M.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const RECTOR = { username: `zzdress${TAG}`, password: `Pw-${crypto.randomBytes(9).toString('hex')}` };
  let rector, clerkToken;

  try {
    await db.collection('users').insertOne({
      username: RECTOR.username, password: RECTOR.password, pin: PIN,
      role: 'admin1', campus: 'All', name: 'Dress Rector', status: 'active',
      permissions: { addStudent: true, editStudent: true, editFees: true,
                     collectFees: true, logExpenditures: true, manageStaff: true },
      activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
    });
    rector = (await req('POST', '/api/auth/login', null, RECTOR)).json?.token;
    ok('the Rector signs in', !!rector);

    // =================================================================
    section('1. The Rector sets the campus up');

    const clerk = {
      campus: CAMPUS, name: 'Front Desk', username: `zzdesk${TAG}`,
      password: `Cw-${crypto.randomBytes(8).toString('hex')}`, pin: '505152',
      mobile: '9812345678', email: `desk${TAG}@example.com`,
      permissions: { addStudent: true, editStudent: true, editFees: true,
                     collectFees: true, logExpenditures: true, manageStaff: true }
    };
    const madeClerk = await req('POST', '/api/admin1/clerks', rector, clerk,
      { 'x-security-pin': PIN });
    ok('a clerk is created for the campus', madeClerk.status === 201,
      `status ${madeClerk.status}: ${madeClerk.raw.slice(0, 160)}`);

    clerkToken = (await req('POST', '/api/auth/login', null,
      { username: clerk.username, password: clerk.password, pin: clerk.pin })).json?.token;
    ok('the clerk signs in with what the Rector set', !!clerkToken);

    const fees = await req('PATCH', '/api/admin2/fee-settings', clerkToken,
      { branch: CAMPUS, tuition: 40000, hostel: 15000, transport: 5000, misc: 2000 });
    ok('the campus fee structure is set', fees.status < 300, `status ${fees.status}`);

    // =================================================================
    section('2. Admissions');

    const admitted = [];
    for (let i = 1; i <= 5; i++) {
      const res = await req('POST', '/api/accountant/students', clerkToken, {
        name: `Cycle Student ${i}`,
        admissionNumber: `ZZC${String(Date.now()).slice(-5)}${String(i).padStart(2, '0')}`,
        branch: CAMPUS, course: 'MPC', section: 'A', studentYear: 'First Year',
        academicYear: '2026-2027',
        mobile: `98${String(70000000 + i).slice(-8)}`,
        parentMobile: `97${String(70000000 + i).slice(-8)}`,
        tuitionFee: 40000, hostelFee: i <= 2 ? 15000 : 0, transportFee: 0,
        miscellaneousFee: 2000, previousPending: 0
      });
      if (!res.json?.data) throw new Error(`admission ${i} failed: ${res.raw.slice(0, 200)}`);
      admitted.push(res.json.data);
    }
    ok(`five students are admitted (${admitted.length}/5)`, admitted.length === 5);
    await checkpoint('admissions');

    // =================================================================
    section('3. A concession, then the fee counter');

    const waiver = await req('PATCH', `/api/admin1/students/${admitted[0].studentId}/fee-override`,
      rector, { tuitionWaiver: 10000, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0 });
    ok('the Rector grants a concession', waiver.status < 300, `status ${waiver.status}`);
    await checkpoint('a concession');

    let collected = 0;
    for (const s of admitted) {
      const owed = (await Student.findOne({ studentId: s.studentId }).lean()).remainingBalance;
      const part = Math.round(owed / 2);
      const res = await req('POST', `/api/accountant/students/${s.studentId}/payments`,
        clerkToken, { amount: part, category: 'Tuition Fee', installment: 'Installment 1' });
      if (res.status >= 300) throw new Error(`collection failed: ${res.raw.slice(0, 200)}`);
      collected += part;
    }
    ok(`five part payments are taken (Rs. ${collected.toLocaleString('en-IN')})`, collected > 0);
    await checkpoint('a morning at the fee counter');

    // =================================================================
    section("4. A parent opens their receipt");

    const payment = await Payment.findOne({ studentId: admitted[0].studentId }).lean();
    const key = crypto.createHmac('sha256', process.env.JWT_SECRET).update('receipt-link-v1').digest();
    const token = crypto.createHmac('sha256', key).update(String(payment.receiptNumber))
      .digest('base64url').slice(0, 22);
    const parentMobile = (await Student.findOne({ studentId: admitted[0].studentId }).lean()).parentMobile;

    const gate = await req('GET', `/r/${encodeURIComponent(payment.receiptNumber)}/${token}`, null);
    ok('the link opens a gate, not the receipt', gate.status === 200
      && !gate.raw.includes(String(payment.amount)), `status ${gate.status}`);

    const opened = await new Promise((resolve, reject) => {
      const body = `last4=${parentMobile.slice(-4)}`;
      const rq = http.request(`${BASE}/r/${encodeURIComponent(payment.receiptNumber)}/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      }, res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, raw })); });
      rq.on('error', reject); rq.write(body); rq.end();
    });
    ok('the right four digits open the receipt', opened.status === 200, `status ${opened.status}`);
    ok('it shows what was paid', opened.raw.includes('Amount Received'), opened.raw.slice(0, 160));
    await checkpoint('a parent opening a receipt');

    // =================================================================
    section('5. Running the campus');

    await req('POST', '/api/admin2/expenditure', clerkToken,
      { category: 'Maintenance', amount: 4500, description: 'Water tank' });
    const teacherId = `ZZDT${String(Date.now()).slice(-6)}`;
    await req('POST', '/api/admin1/teachers', clerkToken, {
      id: teacherId, name: 'Cycle Teacher', subject: 'Physics', branch: CAMPUS,
      salary: 35000, mobile: '9711111111', classification: 'Teaching'
    });
    await req('POST', `/api/admin1/teachers/${teacherId}/salary-month`, clerkToken,
      { academicYear: '2026-2027', month: 'June', amountPaid: 35000 });
    const wp = await req('POST', '/api/admin2/worker-payments', clerkToken,
      { workerName: 'Cycle Worker', role: 'Gardener', amount: 9000,
        monthPeriod: 'June 2026', paid: true });
    if (wp.status >= 300) console.log(`        worker payment refused: ${wp.status} ${wp.raw.slice(0, 200)}`);

    ok('the spend is recorded', await Expenditure.countDocuments() === 1);
    ok('the teacher is on the roll', await Teacher.countDocuments({ id: teacherId }) === 1);
    ok('the salary month is recorded',
      !!(await Teacher.findOne({ id: teacherId }).lean())?.salaryLedger?.['2026-2027']?.June);
    ok('the worker payment is recorded',
      await WorkerPayment.countDocuments({ workerName: 'Cycle Worker' }) === 1,
      `POST said ${wp.status}`);

    // Paying a teacher's salary month ALSO writes a worker-payment row, so the
    // history view shows every staff cost in one place. That is deliberate, and
    // it means a campus staff-cost total includes teacher salaries as well as
    // wages. Counting the collection as a whole and expecting one made a
    // correct system look broken, so the design is asserted rather than assumed.
    ok('paying a salary month also appears in the staff cost history',
      await WorkerPayment.countDocuments({ workerName: 'Cycle Teacher' }) === 1,
      'a teacher salary is missing from the staff cost history');
    await checkpoint('a week of campus running costs');

    // =================================================================
    section('6. Clearing the balance and closing the year');

    for (const s of admitted) {
      const owed = (await Student.findOne({ studentId: s.studentId }).lean()).remainingBalance;
      if (owed > 0) {
        const res = await req('POST', `/api/accountant/students/${s.studentId}/payments`,
          clerkToken, { amount: owed, category: 'Tuition Fee', installment: 'Installment 2' });
        if (res.status >= 300) console.log(`        final collection refused for ${s.studentId} (owed ${owed}): ${res.status} ${res.raw.slice(0, 180)}`);
      } else {
        console.log(`        ${s.studentId} already at ${owed}`);
      }
    }
    const cleared = await Student.countDocuments({ remainingBalance: 0 });
    ok(`every student is cleared (${cleared}/5)`, cleared === 5);
    await checkpoint('the year being paid off');

    let upgraded = 0;
    for (const s of admitted) {
      const res = await req('POST', `/api/accountant/students/${s.studentId}/upgrade`,
        clerkToken, { tuitionFee: 45000, hostelFee: 0, transportFee: 0, miscellaneousFee: 2000 });
      if (res.status < 300) upgraded++;
      else console.log(`        upgrade refused for ${s.studentId}: ${res.status} ${res.raw.slice(0, 180)}`);
    }
    ok(`every student moves to the second year (${upgraded}/5)`, upgraded === 5);
    const inSecond = await Student.countDocuments({ studentYear: 'Second Year' });
    ok(`the register agrees (${inSecond}/5)`, inSecond === 5);
    await checkpoint('closing the academic year');

    // Last year's money must still be findable.
    const archived = (await Student.find({}).lean())
      .reduce((a, s) => a + (s.yearHistory || []).reduce((b, y) => b + Number(y.totalPaid || 0), 0), 0);
    const receipted = (await Payment.find({}).lean()).reduce((a, p) => a + p.amount, 0);
    ok(`every rupee taken this year is archived (Rs. ${r2(archived).toLocaleString('en-IN')} of Rs. ${r2(receipted).toLocaleString('en-IN')})`,
      r2(archived) === r2(receipted),
      'money went missing when the year closed');

    // =================================================================
    section('7. The Rector reviews the year');

    const reports = await req('GET', '/api/admin1/reports', rector);
    ok('the reports load', reports.status === 200, `status ${reports.status}`);
    const stats = await req('GET', '/api/admin2/enrollment-stats', rector);
    const campusRow = (stats.json?.data || []).find(r => r.branch === CAMPUS);
    ok(`enrolment shows the five students (${campusRow?.totalStudents}/5)`,
      campusRow?.totalStudents === 5, `reported ${campusRow?.totalStudents}`);

    const logs = await req('GET', '/api/admin1/logs', rector);
    const entries = logs.json?.data?.entries || [];
    ok(`the day's work is in the audit trail (${entries.length} entries)`, entries.length > 15,
      `${entries.length} entries for a full cycle`);
    const actors = new Set(entries.map(e => e.actorUsername));
    ok('both the Rector and the clerk are named in it',
      actors.has(RECTOR.username) && actors.has(clerk.username),
      [...actors].join(', '));

    const secrets = [RECTOR.password, clerk.password, clerk.pin, PIN];
    const leaked = entries.filter(e => secrets.some(s => JSON.stringify(e).includes(s)));
    ok('no credential appears anywhere in the trail', leaked.length === 0,
      `${leaked.length} entries contain one`);

    // =================================================================
    section('8. Final reconciliation');

    const problems = await reconcileAll();
    ok(`the whole database reconciles after the full cycle (${step} checkpoints passed)`,
      problems.length === 0, problems.join('\n        '));

    const orphans = await Payment.countDocuments({
      studentId: { $nin: (await Student.find({}, { studentId: 1 }).lean()).map(s => s.studentId) }
    });
    ok('no payment points at a student that does not exist', orphans === 0, `${orphans} orphan(s)`);

    const receiptNos = await Payment.distinct('receiptNumber');
    ok(`every receipt number is unique (${receiptNos.length}/${await Payment.countDocuments()})`,
      receiptNos.length === await Payment.countDocuments());

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 25 — DRESS REHEARSAL: ${pass} passed, ${fail} failed`);
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
