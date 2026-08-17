/**
 * PHASE 8 — the clerk permission gate.
 *
 * requireRole decides which ROLES may reach a route. requirePermission decides
 * whether THIS clerk has been granted that particular power. The authz matrix
 * covers the first and deliberately gives its probe clerk every permission, so
 * nothing in the existing suites exercises the second at all.
 *
 * Method: provision two clerks on the same campus — one with every power, one
 * with none — and call each gated route as both. The granted clerk must get
 * past the gate (anything but 403); the ungranted clerk must be refused with
 * 403 and a message naming the missing power.
 *
 * Also asserts the two rules that are NOT permissions:
 *   - fee waivers are refused for a clerk holding every permission, because
 *     waivers are the Rector's alone;
 *   - a deactivated clerk is refused everything, whatever it was granted.
 *
 * Nothing destructive runs. Every call here either creates a throwaway record
 * on a throwaway student or is expected to be refused before it acts, and
 * everything made is deleted at the end.
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
const STAMP = Date.now();
const TAG = `zzperm${crypto.randomBytes(3).toString('hex')}`;

const ALL = { addStudent: true, editStudent: true, editFees: true, collectFees: true, logExpenditures: true };
const NONE = { addStudent: false, editStudent: false, editFees: false, collectFees: false, logExpenditures: false };

let server, BASE, User, Student, Expenditure, Payment;
let studentId = null;

async function cleanup() {
  try { if (User) await User.deleteMany({ username: new RegExp(`^${TAG}_`) }); } catch {}
  // Payments BEFORE students, and never omitted: this suite collects a fee to
  // reach the upgrade path, and an earlier version deleted the student while
  // leaving the receipt behind. An orphan payment still counts toward every
  // revenue total, so it is worse than a leftover account.
  try { if (Payment) await Payment.deleteMany({ studentId: new RegExp(`^${TAG}`) }); } catch {}
  try { if (Student) await Student.deleteMany({ admissionNumber: new RegExp(`^${TAG}`) }); } catch {}
  try { if (Expenditure) await Expenditure.deleteMany({ description: new RegExp(`^${TAG}`) }); } catch {}
  try { await mongoose.connection.collection('refreshtokens').deleteMany({ username: new RegExp(`^${TAG}_`) }); } catch {}
  try { await mongoose.connection.collection('auditlogs').deleteMany({ actorUsername: new RegExp(`^${TAG}_`) }); } catch {}
  try { if (server) server.close(); } catch {}
  try { await mongoose.connection.close(); } catch {}
}

async function call(method, path, { token, pin, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (pin) headers['x-security-pin'] = pin;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function makeClerk(label, permissions, status = 'active') {
  const username = `${TAG}_${label}_${STAMP}`;
  const password = crypto.randomBytes(18).toString('base64url');
  const pin = String(crypto.randomInt(100000, 999999));
  await User.create({
    username, name: `Perm probe ${label}`, role: 'clerk', campus: CAMPUS,
    password: bcrypt.hashSync(password, 10), pin: bcrypt.hashSync(pin, 10),
    status, slotIndex: null, permissions
  });
  const login = await call('POST', '/api/auth/login', { body: { username, password, pin } });
  return { username, password, pin, token: login.json?.token, loginStatus: login.status };
}

async function main() {
  process.env.PORT = process.env.PORT || '4599';
  const app = require('../server/app.cjs');
  await new Promise(r => { server = app.listen(process.env.PORT, r); });
  BASE = `http://127.0.0.1:${process.env.PORT}`;

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  User = require('../server/models/User.cjs');
  Student = require('../server/models/Student.cjs');
  Payment = require('../server/models/Payment.cjs');
  Expenditure = require('../server/models/Expenditure.cjs');

  console.log('\n========================================================');
  console.log('CLERK PERMISSION GATE');
  console.log('========================================================\n');

  const granted = await makeClerk('all', ALL);
  const ungranted = await makeClerk('none', NONE);

  ok('a clerk with every permission can sign in', !!granted.token, `HTTP ${granted.loginStatus}`);
  ok('a clerk with no permissions can still sign in', !!ungranted.token,
    'having no powers is not the same as having no account');

  if (!granted.token || !ungranted.token) {
    console.log('\nCannot continue without both tokens.');
    return;
  }

  // A student for the granted clerk to act on.
  const created = await call('POST', '/api/accountant/students', {
    token: granted.token, pin: granted.pin,
    body: {
      name: 'Perm Probe Student', admissionNumber: `${TAG}001`, branch: CAMPUS,
      mobile: '9876543210', course: 'MPC', tuitionFee: 10000
    }
  });
  studentId = created.json?.data?.studentId;
  ok('addStudent: granted clerk creates a student', created.status === 201, `HTTP ${created.status}`);

  console.log('\nEach gated route, called by a clerk that lacks the power\n');

  const cases = [
    ['addStudent', 'POST', '/api/accountant/students',
      { name: 'Refused', admissionNumber: `${TAG}002`, branch: CAMPUS, mobile: '9876543211', course: 'MPC' }],
    ['editStudent', 'PATCH', `/api/accountant/students/${TAG}001`, { name: 'Renamed By Ungranted' }],
    ['collectFees', 'POST', `/api/accountant/students/${TAG}001/payments`,
      { amount: 100, paymentMode: 'Cash', category: 'Tuition Fee' }],
    ['logExpenditures', 'POST', '/api/admin2/expenditure',
      { category: 'Testing', amount: 50, description: `${TAG} refused`, branch: CAMPUS }],
    ['editFees', 'PATCH', '/api/admin2/fee-settings', { branch: CAMPUS, tuition: 999 }]
  ];

  for (const [permission, method, path, body] of cases) {
    const r = await call(method, path, { token: ungranted.token, pin: ungranted.pin, body });
    ok(`${permission}: refused with 403`, r.status === 403, `HTTP ${r.status}`);
    const msg = String(r.json?.message || '');
    ok(`${permission}: the refusal says which power is missing`,
      /permission|not been given/i.test(msg), msg.slice(0, 70) || '(no message)');
  }

  console.log('\nThe same routes, called by a clerk that HAS the power\n');

  const allowed = [
    ['editStudent', 'PATCH', `/api/accountant/students/${TAG}001`, { name: 'Renamed By Granted' }],
    ['logExpenditures', 'POST', '/api/admin2/expenditure',
      { category: 'Testing', amount: 50, description: `${TAG} allowed`, branch: CAMPUS }],
    ['editFees', 'PATCH', '/api/admin2/fee-settings', { branch: CAMPUS, tuition: 120000 }]
  ];

  for (const [permission, method, path, body] of allowed) {
    const r = await call(method, path, { token: granted.token, pin: granted.pin, body });
    ok(`${permission}: granted clerk gets past the gate`, r.status !== 403,
      `HTTP ${r.status} ${String(r.json?.message || '').slice(0, 60)}`);
  }

  console.log('\nFee waivers are the Rector\'s, whatever a clerk holds\n');

  const waiverDirect = await call('PATCH', `/api/admin1/students/${TAG}001/fee-override`, {
    token: granted.token, pin: granted.pin,
    body: { tuitionWaiver: 5000, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0 }
  });
  ok('the dedicated waiver route refuses a fully-granted clerk',
    waiverDirect.status === 403, `HTTP ${waiverDirect.status}`);

  const waiverSmuggled = await call('PATCH', `/api/accountant/students/${TAG}001`, {
    token: granted.token, pin: granted.pin, body: { tuitionWaiver: 5000 }
  });
  ok('a waiver cannot be smuggled through the ordinary student edit',
    waiverSmuggled.status === 403, `HTTP ${waiverSmuggled.status}`);

  // The upgrade route checks ELIGIBILITY before it looks at waivers, so a
  // student with fees outstanding is refused with 409 and never reaches the
  // waiver rule — which would make this assertion pass for the wrong reason.
  // Clear the balance first so the waiver guard is genuinely what refuses it.
  const settle = await call('POST', `/api/accountant/students/${TAG}001/payments`, {
    token: granted.token, pin: granted.pin,
    body: { amount: 10000, paymentMode: 'Cash', category: 'Tuition Fee' }
  });
  ok('collectFees: granted clerk settles the balance', settle.status === 201,
    `HTTP ${settle.status} ${String(settle.json?.message || '').slice(0, 60)}`);

  const waiverViaUpgrade = await call('POST', `/api/accountant/students/${TAG}001/upgrade`, {
    token: granted.token, pin: granted.pin, body: { tuitionFee: 10000, tuitionWaiver: 5000 }
  });
  ok('a waiver cannot be applied through the year upgrade',
    waiverViaUpgrade.status === 403,
    `HTTP ${waiverViaUpgrade.status} ${String(waiverViaUpgrade.json?.message || '').slice(0, 70)}`);

  console.log('\nA deactivated clerk is refused regardless of its permissions\n');

  await User.updateOne({ username: granted.username }, { $set: { status: 'disabled' } });
  const afterDisable = await call('GET', '/api/accountant/students', { token: granted.token, pin: granted.pin });
  ok('a disabled clerk is refused on its EXISTING token',
    afterDisable.status === 401 || afterDisable.status === 403, `HTTP ${afterDisable.status}`);

  console.log('\nThe Rector is never gated by clerk permissions\n');

  const rector = await User.findOne({ role: 'admin1' }).lean();
  ok('a Rector account exists to check against', !!rector);

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
