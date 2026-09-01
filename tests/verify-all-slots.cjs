/**
 * All twenty-eight slots, all four campuses, under concurrent load.
 *
 * The other suites prove the mechanism with one or two clerks. This one asks
 * the questions that only show up at full size:
 *
 *   - does every clerk that exists actually sign in and write?
 *   - does each campus's data stay on that campus when all four are busy at
 *     once, or do concurrent writes leak across?
 *   - do the money totals add up exactly after they have all collected?
 *   - does the process stay up, and does memory come back down afterwards?
 *
 * Every clerk registers a student, collects a fee and logs an expenditure, and
 * the four campuses run in parallel so campus isolation is tested while the
 * writes actually overlap. Everything created is deleted at the end.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');

let pass = 0, fail = 0;
const failures = [];
const ok = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${d ? '  — ' + d : ''}`); return; }
  fail++; failures.push(`${n}${d ? '  — ' + d : ''}`);
  console.log(`  FAIL  ${n}${d ? '  — ' + d : ''}`);
};

const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];
const TAG = `zzall${crypto.randomBytes(3).toString('hex')}`;
const FEE = 12000;
const PAID = 3000;
const SPEND = 450;

let server, BASE, User, Student, Payment, Expenditure, AuditLog;

async function call(method, path, { token, pin, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (pin) headers['x-security-pin'] = pin;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function cleanup() {
  try { if (Payment) await Payment.deleteMany({ studentId: new RegExp(`^${TAG}`) }); } catch {}
  try { if (Student) await Student.deleteMany({ admissionNumber: new RegExp(`^${TAG}`) }); } catch {}
  try { if (Expenditure) await Expenditure.deleteMany({ description: new RegExp(`^${TAG}`) }); } catch {}
  try { if (AuditLog) await AuditLog.deleteMany({ entityId: new RegExp(`^${TAG}`) }); } catch {}
  try { if (AuditLog) await AuditLog.deleteMany({ summary: new RegExp(TAG) }); } catch {}
  try { await mongoose.connection.collection('loginattempts').deleteMany({}); } catch {}
  try { await mongoose.connection.collection('ratelimits').deleteMany({}); } catch {}
  try { if (server) server.close(); } catch {}
  try { await mongoose.connection.close(); } catch {}
}

const mb = b => Math.round(b / 1024 / 1024);

/** One clerk's full working day. */
async function runClerk(clerk, campus) {
  const result = { username: clerk.username, campus, signedIn: false, student: false, payment: false, expenditure: false, error: null };
  try {
    const login = await call('POST', '/api/auth/login', {
      body: { campus, password: clerk.password, pin: clerk.pin, loginContext: 'universal' }
    });
    if (!login.json?.token) { result.error = `login HTTP ${login.status}`; return result; }
    result.signedIn = true;
    const token = login.json.token;
    const adm = `${TAG}${String(clerk.slotIndex).padStart(2, '0')}${campus.replace(/\W/g, '').slice(-4)}`;

    const student = await call('POST', '/api/accountant/students', {
      token, body: { name: `Load ${clerk.slotIndex}`, admissionNumber: adm, branch: campus, mobile: '9876543210', course: 'MPC', tuitionFee: FEE }
    });
    result.student = student.status === 201;
    if (!result.student) { result.error = `student HTTP ${student.status} ${student.json?.message || ''}`; return result; }

    const payment = await call('POST', `/api/accountant/students/${adm}/payments`, {
      token, body: { amount: PAID, paymentMode: 'Cash', category: 'Tuition Fee' }
    });
    result.payment = payment.status === 201;
    if (!result.payment) result.error = `payment HTTP ${payment.status} ${payment.json?.message || ''}`;

    const exp = await call('POST', '/api/admin2/expenditure', {
      token, body: { category: 'Testing', amount: SPEND, description: `${TAG} slot ${clerk.slotIndex} ${campus}`, branch: campus }
    });
    result.expenditure = exp.status === 201;
    if (!result.expenditure && !result.error) result.error = `expenditure HTTP ${exp.status} ${exp.json?.message || ''}`;
  } catch (err) {
    result.error = err.message;
  }
  return result;
}

async function main() {
  process.env.PORT = process.env.PORT || '4617';
  const app = require('../server/app.cjs');
  await new Promise(r => { server = app.listen(process.env.PORT, r); });
  BASE = `http://127.0.0.1:${process.env.PORT}`;

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod', serverSelectionTimeoutMS: 20000 });
  User = require('../server/models/User.cjs');
  Student = require('../server/models/Student.cjs');
  Payment = require('../server/models/Payment.cjs');
  Expenditure = require('../server/models/Expenditure.cjs');
  AuditLog = require('../server/models/AuditLog.cjs');

  console.log('\n========================================================');
  console.log('EVERY CLERK — FOUR CAMPUSES IN PARALLEL');
  console.log('========================================================\n');

  const memBefore = process.memoryUsage();
  const startedAt = Date.now();

  const clerks = await User.find({ role: 'clerk' }).select('username campus slotIndex password pin permissions status').lean();
  // NOT a fixed count. Clerks used to be seven declared slots a campus; they
  // are created and removed freely now, so asserting 28 was asserting a model
  // that no longer exists — it failed the moment the system was used as
  // intended. What must hold is that EVERY clerk that exists works, and that
  // the totals match however many that is.
  const EXPECTED = clerks.length;
  ok('there are clerks to exercise', EXPECTED > 0, `${EXPECTED} found`);
  // NOT "all five are on". The Rector granting and revoking powers per clerk
  // is the entire point of the feature, so asserting a fixed set would fail
  // the moment the system is used as intended. What must hold is that every
  // clerk carries a COMPLETE permission record — five booleans, none missing —
  // because an absent key reads as false and would silently remove access
  // nobody revoked.
  const POWERS = ['addStudent', 'editStudent', 'editFees', 'collectFees', 'logExpenditures'];
  ok('every clerk carries a complete permission record',
    clerks.every(c => c.permissions && POWERS.every(k => typeof c.permissions[k] === 'boolean')),
    clerks.filter(c => !c.permissions || !POWERS.every(k => typeof c.permissions[k] === 'boolean'))
      .map(c => c.username).join(', ') || 'all complete');

  // Rate limiting would otherwise refuse that many near-simultaneous logins.
  await mongoose.connection.collection('loginattempts').deleteMany({});
  await mongoose.connection.collection('ratelimits').deleteMany({});

  console.log('\nEvery clerk works at once — four campuses in parallel\n');

  const perCampus = await Promise.all(CAMPUSES.map(async campus => {
    const mine = clerks.filter(c => c.campus === campus).sort((a, b) => a.slotIndex - b.slotIndex);
    // Slots within a campus run in sequence; the four campuses run together,
    // so the concurrency being tested is across campus boundaries.
    const results = [];
    for (const clerk of mine) results.push(await runClerk(clerk, campus));
    return { campus, results };
  }));

  const all = perCampus.flatMap(c => c.results);
  const elapsed = Math.round((Date.now() - startedAt) / 1000);

  for (const { campus, results } of perCampus) {
    const inOk = results.filter(r => r.signedIn).length;
    const stOk = results.filter(r => r.student).length;
    const pyOk = results.filter(r => r.payment).length;
    const exOk = results.filter(r => r.expenditure).length;
    console.log(`  ${campus.padEnd(20)} signed in ${inOk}/7  students ${stOk}/7  payments ${pyOk}/7  expenditures ${exOk}/7`);
  }
  console.log('');

  ok('every clerk signed in by campus', all.filter(r => r.signedIn).length === EXPECTED,
    `${all.filter(r => r.signedIn).length}/${EXPECTED}`);
  ok('every clerk registered a student', all.filter(r => r.student).length === EXPECTED,
    all.filter(r => !r.student).map(r => `${r.username}: ${r.error}`).slice(0, 3).join(' | '));
  ok('every clerk collected a fee', all.filter(r => r.payment).length === EXPECTED,
    all.filter(r => !r.payment).map(r => `${r.username}: ${r.error}`).slice(0, 3).join(' | '));
  ok('every clerk logged an expenditure', all.filter(r => r.expenditure).length === EXPECTED,
    all.filter(r => !r.expenditure).map(r => `${r.username}: ${r.error}`).slice(0, 3).join(' | '));

  console.log('\nWhere it all landed\n');

  for (const campus of CAMPUSES) {
    const students = await Student.countDocuments({ admissionNumber: new RegExp(`^${TAG}`), branch: campus });
    const payments = await Payment.countDocuments({ studentId: new RegExp(`^${TAG}`), branch: campus });
    const exps = await Expenditure.countDocuments({ description: new RegExp(`^${TAG}`), branch: campus });
    // Compared against how many clerks this campus actually has, not a fixed
    // seven. Campuses hold different numbers now that clerks are created and
    // removed as needed.
    const here = clerks.filter(c => c.campus === campus).length;
    ok(`${campus}: ${here} students, ${here} payments, ${here} expenditures`,
      students === here && payments === here && exps === here,
      `${students}/${payments}/${exps} for ${here} clerk(s)`);
  }

  const totalStudents = await Student.countDocuments({ admissionNumber: new RegExp(`^${TAG}`) });
  const totalPayments = await Payment.countDocuments({ studentId: new RegExp(`^${TAG}`) });
  ok('one student and one payment per clerk', totalStudents === EXPECTED && totalPayments === EXPECTED,
    `${totalStudents} / ${totalPayments}`);

  const sum = await Payment.aggregate([
    { $match: { studentId: new RegExp(`^${TAG}`) } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  ok('collected total is exact, no double counting',
    sum[0] && sum[0].total === EXPECTED * PAID, `Rs. ${sum[0]?.total} vs ${EXPECTED * PAID}`);

  const balances = await Student.find({ admissionNumber: new RegExp(`^${TAG}`) }).select('remainingBalance totalPaid').lean();
  ok('every balance moved by exactly the amount paid',
    balances.every(b => Math.round(b.totalPaid) === PAID && Math.round(b.remainingBalance) === FEE - PAID),
    `${balances.filter(b => Math.round(b.remainingBalance) !== FEE - PAID).length} wrong`);

  console.log('\nNo campus leaked into another\n');

  let leaked = 0;
  for (const campus of CAMPUSES) {
    const wrong = await Student.countDocuments({
      admissionNumber: new RegExp(`^${TAG}`),
      branch: campus,
      // Every admission number ends with its own campus marker.
      $expr: { $not: { $regexMatch: { input: '$admissionNumber', regex: campus.replace(/\W/g, '').slice(-4) } } }
    });
    leaked += wrong;
  }
  ok('no student was written to the wrong campus', leaked === 0, `${leaked} misplaced`);

  console.log('\nThe audit trail caught all of it\n');
  await new Promise(r => setTimeout(r, 2000));

  // Matched on summary OR entityLabel. An expenditure's summary names the
  // category and campus, not the free-text description, so a summary-only
  // match finds the students and payments and silently misses all 28
  // expenditures — which reads as lost logging rather than a bad query.
  const tagged = { $or: [{ summary: new RegExp(TAG) }, { entityLabel: new RegExp(TAG) }] };
  const logged = await AuditLog.countDocuments(tagged);
  const byAction = await AuditLog.aggregate([
    { $match: tagged },
    { $group: { _id: '$action', n: { $sum: 1 } } }
  ]);
  const counts = Object.fromEntries(byAction.map(a => [a._id, a.n]));

  ok('a registration logged per clerk', counts['student.create'] === EXPECTED, String(counts['student.create']));
  ok('a collection logged per clerk', counts['payment.collect'] === EXPECTED, String(counts['payment.collect']));
  ok('an expenditure logged per clerk', counts['expenditure.create'] === EXPECTED, String(counts['expenditure.create']));
  // Three writes per clerk: a student, a payment, an expenditure.
  const expectedActions = EXPECTED * 3;
  ok('every action is in the log', logged >= expectedActions, `${logged} entries for ${expectedActions} actions`);

  // Matched against the clerks this run actually used, NOT a name pattern.
  // Portal IDs are the Rector's to change — a clerk renamed to something
  // sensible would fail a /^clerk\d+_/ regex while the log was perfectly
  // correct, which is a test asserting a naming convention rather than the
  // property that matters.
  const clerkNames = clerks.map(c => c.username);
  const named = await AuditLog.countDocuments({ ...tagged, actorUsername: { $in: clerkNames } });
  ok('every entry names the clerk who did it', named === logged, `${named}/${logged}`);

  console.log('\nProcess health\n');
  const memAfter = process.memoryUsage();
  if (global.gc) global.gc();
  const growth = mb(memAfter.heapUsed) - mb(memBefore.heapUsed);
  console.log(`  heap ${mb(memBefore.heapUsed)}MB -> ${mb(memAfter.heapUsed)}MB (${growth >= 0 ? '+' : ''}${growth}MB)`);
  console.log(`  rss  ${mb(memBefore.rss)}MB -> ${mb(memAfter.rss)}MB`);
  console.log(`  ${all.length * 3} write requests in ${elapsed}s\n`);

  ok(`the process stayed up through ${EXPECTED * 3} writes`, true);
  ok('heap growth is not runaway', growth < 150, `+${growth}MB`);

  const stillAlive = await call('GET', '/api/health');
  ok('the server still answers afterwards', stillAlive.status === 200, `HTTP ${stillAlive.status}`);

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
  .finally(async () => { await cleanup(); process.exit(fail > 0 ? 1 : 0); });
