/**
 * PHASE 9 — where a clerk's work actually goes.
 *
 * The permission suite proves a clerk is ALLOWED to do things. This proves the
 * things they do land in the same places everyone else reads from — that a
 * clerk is a way into the existing books, not a parallel set of them.
 *
 * For each of the two money paths a clerk can have:
 *
 *   fee collection  -> the Payment collection the accountant portal reads,
 *                      the student's own balance and receipt list, the
 *                      Rector's payments report, and the audit trail
 *   expenditure     -> the Expenditure collection the campus reads, the
 *                      Rector's expenditure report, and the audit trail
 *
 * and for both: the record carries the CLERK'S campus, and an accountant on
 * another campus cannot see it.
 *
 * Everything created here is deleted at the end.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); return; }
  fail++; failures.push(`${name}${detail ? '  — ' + detail : ''}`);
  console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`);
};

const CAMPUS = 'Beemaram C2';
const OTHER_CAMPUS = 'Erragattugutta C1';
const TAG = `zzflow${crypto.randomBytes(3).toString('hex')}`;
const ALL = { addStudent: true, editStudent: true, editFees: true, collectFees: true, logExpenditures: true };

let server, BASE, User, Student, Payment, Expenditure, AuditLog;

async function cleanup() {
  try { if (User) await User.deleteMany({ username: new RegExp(`^${TAG}_`) }); } catch {}
  try { if (Student) await Student.deleteMany({ admissionNumber: new RegExp(`^${TAG}`) }); } catch {}
  try { if (Payment) await Payment.deleteMany({ studentId: new RegExp(`^${TAG}`) }); } catch {}
  try { if (Expenditure) await Expenditure.deleteMany({ description: new RegExp(`^${TAG}`) }); } catch {}
  try { if (AuditLog) await AuditLog.deleteMany({ actorUsername: new RegExp(`^${TAG}_`) }); } catch {}
  try { await mongoose.connection.collection('refreshtokens').deleteMany({ username: new RegExp(`^${TAG}_`) }); } catch {}
  try { if (server) server.close(); } catch {}
  try { await mongoose.connection.close(); } catch {}
}

async function call(method, path, { token, pin, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (pin) headers['x-security-pin'] = pin;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function makeAccount(label, role, campus, permissions = null) {
  const username = `${TAG}_${label}`;
  const password = crypto.randomBytes(18).toString('base64url');
  const pin = String(crypto.randomInt(100000, 999999));
  await User.create({
    username, name: `Flow ${label}`, role, campus,
    password: bcrypt.hashSync(password, 10), pin: bcrypt.hashSync(pin, 10),
    status: 'active', permissions: permissions || undefined
  });
  const login = await call('POST', '/api/auth/login', { body: { username, password, pin } });
  return { username, pin, token: login.json?.token, status: login.status };
}

async function main() {
  process.env.PORT = process.env.PORT || '4601';
  const app = require('../server/app.cjs');
  await new Promise(r => { server = app.listen(process.env.PORT, r); });
  BASE = `http://127.0.0.1:${process.env.PORT}`;

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  User = require('../server/models/User.cjs');
  Student = require('../server/models/Student.cjs');
  Payment = require('../server/models/Payment.cjs');
  Expenditure = require('../server/models/Expenditure.cjs');
  AuditLog = require('../server/models/AuditLog.cjs');

  console.log('\n========================================================');
  console.log('CLERK DATA FLOW');
  console.log('========================================================\n');

  const clerk = await makeAccount('clerk', 'clerk', CAMPUS, ALL);
  const accountant = await makeAccount('acct', 'accountant', CAMPUS);
  const foreign = await makeAccount('foreign', 'accountant', OTHER_CAMPUS);
  const rector = await makeAccount('rector', 'admin1', 'All');

  ok('clerk, accountant, foreign accountant and Rector all signed in',
    !!(clerk.token && accountant.token && foreign.token && rector.token));
  if (!clerk.token || !accountant.token || !rector.token) return;

  console.log('\nA student the clerk registers\n');

  const created = await call('POST', '/api/accountant/students', {
    token: clerk.token, pin: clerk.pin,
    body: {
      name: 'Flow Probe Student', admissionNumber: `${TAG}001`, branch: CAMPUS,
      mobile: '9876543210', course: 'MPC', tuitionFee: 20000
    }
  });
  ok('clerk creates a student', created.status === 201, `HTTP ${created.status}`);
  const studentId = created.json?.data?.studentId;
  ok('the student id is the admission number, not a generated one',
    studentId === `${TAG}001`, String(studentId));

  const dbStudent = await Student.findOne({ admissionNumber: `${TAG}001` }).lean();
  ok('the student is written to the shared Student collection', !!dbStudent);
  ok('it carries the CLERK\'S campus', dbStudent && dbStudent.branch === CAMPUS, dbStudent && dbStudent.branch);

  const seenByAccountant = await call('GET', '/api/accountant/students', { token: accountant.token });
  ok('the campus accountant sees the clerk\'s student immediately',
    Array.isArray(seenByAccountant.json?.data)
      && seenByAccountant.json.data.some(s => s.admissionNumber === `${TAG}001`));

  const seenByForeign = await call('GET', '/api/accountant/students', { token: foreign.token });
  ok('an accountant on ANOTHER campus cannot see it',
    Array.isArray(seenByForeign.json?.data)
      && !seenByForeign.json.data.some(s => s.admissionNumber === `${TAG}001`));

  console.log('\nFees the clerk collects\n');

  const paid = await call('POST', `/api/accountant/students/${TAG}001/payments`, {
    token: clerk.token, pin: clerk.pin,
    body: { amount: 7500, paymentMode: 'Cash', category: 'Tuition Fee' }
  });
  ok('clerk collects a fee', paid.status === 201, `HTTP ${paid.status}`);
  const receiptNumber = paid.json?.data?.payment?.receiptNumber;

  const dbPayment = await Payment.findOne({ receiptNumber }).lean();
  ok('the receipt lands in the SAME Payment collection the accountant reads', !!dbPayment);
  ok('the payment carries the clerk\'s campus', dbPayment && dbPayment.branch === CAMPUS, dbPayment && dbPayment.branch);
  ok('the cashier recorded is the clerk, not a generic account',
    dbPayment && String(dbPayment.cashier).includes(TAG), dbPayment && dbPayment.cashier);

  const afterPay = await Student.findOne({ admissionNumber: `${TAG}001` }).lean();
  ok('the student balance moved by exactly the amount collected',
    afterPay && Math.round(afterPay.totalPaid) === 7500, afterPay && `totalPaid ${afterPay.totalPaid}`);
  ok('the receipt is appended to the student\'s own list',
    afterPay && (afterPay.receipts || []).some(r => r.receiptNumber === receiptNumber));

  const acctSeesPayment = await call('GET', `/api/accountant/students/${TAG}001/payments`, { token: accountant.token });
  ok('the campus accountant sees the clerk\'s receipt',
    Array.isArray(acctSeesPayment.json?.data)
      && acctSeesPayment.json.data.some(p => p.receiptNumber === receiptNumber));

  const rectorPayments = await call('GET', `/api/admin1/payments?branch=${encodeURIComponent(CAMPUS)}`, { token: rector.token });
  const rectorRows = rectorPayments.json?.data || [];
  ok('the Rector\'s payments report includes it',
    Array.isArray(rectorRows) && rectorRows.some(p => p.receiptNumber === receiptNumber),
    `HTTP ${rectorPayments.status}, ${Array.isArray(rectorRows) ? rectorRows.length : 0} rows`);

  console.log('\nExpenditure the clerk logs\n');

  const exp = await call('POST', '/api/admin2/expenditure', {
    token: clerk.token, pin: clerk.pin,
    body: { category: 'Maintenance', amount: 1250, description: `${TAG} generator`, branch: CAMPUS }
  });
  ok('clerk logs an expenditure', exp.status === 201, `HTTP ${exp.status}`);

  const dbExp = await Expenditure.findOne({ description: `${TAG} generator` }).lean();
  ok('it lands in the shared Expenditure collection', !!dbExp);
  ok('it carries the clerk\'s campus', dbExp && dbExp.branch === CAMPUS, dbExp && dbExp.branch);

  const rectorExp = await call('GET', `/api/admin1/expenditures?branch=${encodeURIComponent(CAMPUS)}`, { token: rector.token });
  const expRows = rectorExp.json?.data || [];
  ok('the Rector\'s expenditure report includes it',
    Array.isArray(expRows) && expRows.some(e => e.description === `${TAG} generator`),
    `HTTP ${rectorExp.status}`);

  console.log('\nEverything the clerk did is in the Rector\'s activity log\n');

  // The audit trail is written fire-and-forget, so give it a moment to land
  // rather than racing it. It is not awaited by the request on purpose.
  await new Promise(r => setTimeout(r, 1200));

  const logs = await call('GET', `/api/admin1/logs?actor=${encodeURIComponent(clerk.username)}&limit=50`, { token: rector.token });
  const entries = logs.json?.data?.entries || [];
  const actions = entries.map(e => e.action);

  ok('the log is readable by the Rector', logs.status === 200, `HTTP ${logs.status}`);
  ok('student.create was recorded', actions.includes('student.create'), actions.join(', '));
  ok('payment.collect was recorded', actions.includes('payment.collect'), actions.join(', '));
  ok('expenditure.create was recorded', actions.includes('expenditure.create'), actions.join(', '));

  const payEntry = entries.find(e => e.action === 'payment.collect');
  ok('the payment entry names the clerk who took it',
    payEntry && payEntry.actorUsername === clerk.username, payEntry && payEntry.actorUsername);
  ok('the payment entry carries the amount for totalling',
    payEntry && Number(payEntry.amount) === 7500, payEntry && String(payEntry.amount));
  ok('the payment entry is scoped to the campus',
    payEntry && payEntry.campus === CAMPUS, payEntry && payEntry.campus);

  console.log('\nDeactivating the clerk closes the portal immediately\n');

  await User.updateOne({ username: clerk.username }, { $set: { status: 'disabled' } });
  const afterClose = await call('GET', '/api/accountant/students', { token: clerk.token, pin: clerk.pin });
  ok('a deactivated clerk is refused on its existing token',
    afterClose.status === 401 || afterClose.status === 403, `HTTP ${afterClose.status}`);

  const dataSurvives = await Payment.findOne({ receiptNumber }).lean();
  ok('the money they collected survives their deactivation', !!dataSurvives);

  console.log('\n========================================================');
  console.log(`${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log('  - ' + f));
  }
  console.log('========================================================\n');
}

main()
  .catch(err => { console.error('Suite crashed:', err); fail++; })
  .finally(async () => {
    await cleanup();
    process.exit(fail > 0 ? 1 : 0);
  });
