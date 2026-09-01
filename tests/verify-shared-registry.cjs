/**
 * One student registry, for everyone.
 *
 * Students are shared across all four campuses: the Rector, every accountant
 * and every clerk can find and correct any record without choosing a campus
 * first. Someone standing at a counter is served by whoever is on it.
 *
 * The boundary that still exists is MONEY. A payment is recorded against the
 * campus that owns the STUDENT, never the campus of whoever took it, and
 * expenditures stay pinned to the account's own campus. Without the first of
 * those, per-campus revenue would silently follow whoever happened to be on
 * the till — which is the kind of wrong that nobody notices until the books
 * are reconciled at year end.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let pass = 0, fail = 0;
const failures = [];
const ok = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${d ? '  — ' + d : ''}`); return; }
  fail++; failures.push(`${n}${d ? '  — ' + d : ''}`);
  console.log(`  FAIL  ${n}${d ? '  — ' + d : ''}`);
};

const HOME = 'Beemaram C2';
const AWAY = 'Erragattugutta C1';
const TAG = `zzreg${crypto.randomBytes(3).toString('hex')}`;
const ALL = { addStudent: true, editStudent: true, editFees: true, collectFees: true, logExpenditures: true };

let server, BASE, User, Student, Payment, AuditLog;

async function cleanup() {
  try { if (Payment) await Payment.deleteMany({ studentId: new RegExp(`^${TAG}`) }); } catch {}
  try { if (Student) await Student.deleteMany({ admissionNumber: new RegExp(`^${TAG}`) }); } catch {}
  try { if (User) await User.deleteMany({ username: new RegExp(`^${TAG}_`) }); } catch {}
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
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function account(label, role, campus, permissions) {
  const username = `${TAG}_${label}`;
  const password = crypto.randomBytes(18).toString('base64url');
  const pin = String(crypto.randomInt(100000, 999999));
  await User.create({
    username, name: `Registry ${label}`, role, campus,
    password: bcrypt.hashSync(password, 10), pin: bcrypt.hashSync(pin, 10),
    status: 'active', ...(permissions ? { permissions } : {})
  });
  const lg = await call('POST', '/api/auth/login', { body: { username, password, pin } });
  return { username, pin, token: lg.json?.token };
}

async function main() {
  process.env.PORT = process.env.PORT || '4651';
  const app = require('../server/app.cjs');
  await new Promise(r => { server = app.listen(process.env.PORT, r); });
  BASE = `http://127.0.0.1:${process.env.PORT}`;

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod', serverSelectionTimeoutMS: 20000 });
  User = require('../server/models/User.cjs');
  Student = require('../server/models/Student.cjs');
  Payment = require('../server/models/Payment.cjs');
  AuditLog = require('../server/models/AuditLog.cjs');

  console.log('\n========================================================');
  console.log('SHARED STUDENT REGISTRY');
  console.log('========================================================\n');

  const rector    = await account('rector', 'admin1', 'All');
  const homeAcct  = await account('acct_home', 'accountant', HOME);
  const awayAcct  = await account('acct_away', 'accountant', AWAY);
  const homeClerk = await account('clerk_home', 'clerk', HOME, ALL);
  ok('all four accounts signed in',
    !!(rector.token && homeAcct.token && awayAcct.token && homeClerk.token));
  if (!rector.token) return;

  const made = await call('POST', '/api/accountant/students', {
    token: homeAcct.token,
    body: { name: 'Registry Probe', admissionNumber: `${TAG}001`, branch: HOME,
            mobile: '9876543210', course: 'MPC', tuitionFee: 20000 }
  });
  ok(`a student exists at ${HOME}`, made.status === 201, `HTTP ${made.status}`);

  console.log('\nAn accountant at the OTHER campus — should reach it now\n');

  const list = await call('GET', '/api/accountant/students', { token: awayAcct.token });
  const rows = list.json?.data || [];
  ok('sees the other campus student in the list',
    rows.some(s => s.admissionNumber === `${TAG}001`), `${rows.length} rows`);

  const read = await call('GET', `/api/accountant/students/${TAG}001`, { token: awayAcct.token });
  ok('can open the record', read.status === 200, `HTTP ${read.status}`);

  const edit = await call('PATCH', `/api/accountant/students/${TAG}001`, {
    token: awayAcct.token, body: { name: 'Corrected By Away Campus' }
  });
  ok('can correct the record', edit.status === 200, `HTTP ${edit.status}`);
  const afterEdit = await Student.findOne({ admissionNumber: `${TAG}001` }).lean();
  ok('the correction stuck', afterEdit.name === 'Corrected By Away Campus', afterEdit.name);

  const pay = await call('POST', `/api/accountant/students/${TAG}001/payments`, {
    token: awayAcct.token, body: { amount: 5000, paymentMode: 'Cash', category: 'Tuition Fee' }
  });
  ok('can collect a fee', pay.status === 201, `HTTP ${pay.status}`);

  console.log('\n  ...and the money must land on the campus that owns the student\n');

  const receipt = await Payment.findOne({ receiptNumber: pay.json?.data?.payment?.receiptNumber }).lean();
  ok(`the receipt is recorded against ${HOME}, not the collector campus`,
    receipt && receipt.branch === HOME, receipt && receipt.branch);
  ok('the receipt names who actually took it',
    receipt && receipt.cashier === awayAcct.username, receipt && receipt.cashier);

  console.log('\nThe Rector — reaches everything\n');

  const rectorList = await call('GET', '/api/accountant/students', { token: rector.token });
  ok('sees the student without naming a campus',
    (rectorList.json?.data || []).some(s => s.admissionNumber === `${TAG}001`));

  const narrowed = await call('GET', `/api/accountant/students?branch=${encodeURIComponent(AWAY)}`, { token: rector.token });
  ok('can still narrow to one campus',
    !(narrowed.json?.data || []).some(s => s.admissionNumber === `${TAG}001`),
    'narrowing to the other campus correctly excludes it');
  console.log('\nA CLERK — reaches every student too\n');

  // Clerks were pinned to their own campus for students, and are no longer:
  // the client asked for one registry across the whole college. The boundary
  // that still exists for a clerk is MONEY — expenditures are booked to their
  // own campus — and that is checked below.
  const clerkOwn = await call('GET', `/api/accountant/students/${TAG}001`, { token: homeClerk.token });
  ok('reaches a student on its own campus', clerkOwn.status === 200, `HTTP ${clerkOwn.status}`);

  const away = await call('POST', '/api/accountant/students', {
    token: rector.token,
    body: { name: 'Away Probe', admissionNumber: `${TAG}002`, branch: AWAY,
            mobile: '9876543211', course: 'MPC', tuitionFee: 15000 }
  });
  ok(`a student exists at ${AWAY}`, away.status === 201, `HTTP ${away.status}`);

  const clerkRead = await call('GET', `/api/accountant/students/${TAG}002`, { token: homeClerk.token });
  ok('reaches a student at another campus', clerkRead.status === 200, `HTTP ${clerkRead.status}`);

  const clerkEdit = await call('PATCH', `/api/accountant/students/${TAG}002`, {
    token: homeClerk.token, body: { name: 'Corrected By Other Campus Clerk' }
  });
  ok('can edit a student at another campus', clerkEdit.status === 200, `HTTP ${clerkEdit.status}`);

  const clerkPay = await call('POST', `/api/accountant/students/${TAG}002/payments`, {
    token: homeClerk.token, body: { amount: 100, paymentMode: 'Cash' }
  });
  ok('can collect from a student at another campus', clerkPay.status === 201, `HTTP ${clerkPay.status}`);

  // ...and that payment must still be booked to the STUDENT's campus.
  const clerkReceipt = await Payment.findOne({ receiptNumber: clerkPay.json?.data?.payment?.receiptNumber }).lean();
  ok(`a clerk's cross-campus receipt is booked to ${AWAY}`,
    clerkReceipt && clerkReceipt.branch === AWAY, clerkReceipt && clerkReceipt.branch);

  const clerkList = await call('GET', '/api/accountant/students', { token: homeClerk.token });
  const clerkRows = clerkList.json?.data || [];
  ok('its list spans campuses',
    clerkRows.some(s => s.branch !== HOME),
    `${clerkRows.length} rows, campuses: ${[...new Set(clerkRows.map(s => s.branch))].join(', ')}`);


  console.log('\nMoney and staff stay campus-scoped\n');

  const awayExp = await call('POST', '/api/admin2/expenditure', {
    token: homeClerk.token,
    body: { category: 'Testing', amount: 10, description: `${TAG} away`, branch: AWAY }
  });
  ok('a clerk still cannot log an expenditure at another campus',
    awayExp.status === 403, `HTTP ${awayExp.status}`);

  console.log('\n========================================================');
  console.log(`${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log('  - ' + f));
  }
  console.log('========================================================\n');
}

main()
  .catch(e => { console.error('Suite crashed:', e); fail++; })
  .finally(async () => { await cleanup(); process.exit(fail > 0 ? 1 : 0); });
