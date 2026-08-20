/**
 * Phase 8 — fee collection and receipts.
 *
 * The write path where money enters the system. The invariant that has to hold
 * after every single operation, successful or refused:
 *
 *     gross - waivers - totalPaid  ==  remainingBalance
 *     sum(payments.amount)         ==  totalPaid
 *
 * Anything that breaks either one is unrecoverable in practice: the college
 * cannot tell afterwards whether the money arrived, and no report will ever
 * balance again.
 *
 * The interesting cases are not the happy path. They are two tills collecting
 * from the same student in the same second, a receipt written before the
 * ledger moved, and a browser that resubmits because the first response was
 * slow. Each is tested here against a real server and a real database.
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

const PORT = 4608;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';

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
const newStudent = async (token, fee = 30000) => {
  const res = await req('POST', '/api/accountant/students', token, {
    name: 'Pay Test', admissionNumber: `ZZP${String(Date.now()).slice(-6)}${String(++seq).padStart(2, '0')}`,
    branch: CAMPUS, course: 'MPC', section: 'A', studentYear: 'First Year',
    mobile: '9876543210', parentMobile: '9876543211',
    tuitionFee: fee, hostelFee: 0, transportFee: 0, miscellaneousFee: 0, previousPending: 0
  });
  if (!res.json?.data) throw new Error(`create failed: ${res.raw.slice(0, 200)}`);
  return res.json.data;
};

/** The invariant, read straight from the database. */
const reconcile = async (studentId) => {
  const s = await Student.findOne({ studentId }).lean();
  const rows = await Payment.find({ studentId }).lean();
  const gross = (s.tuitionFee || 0) + (s.hostelFee || 0) + (s.transportFee || 0)
    + (s.miscellaneousFee || 0) + (s.previousPending || 0)
    + (s.customFeeSlots || []).reduce((a, x) => a + (x.amount || 0), 0);
  const waivers = (s.tuitionWaiver || 0) + (s.hostelWaiver || 0)
    + (s.transportWaiver || 0) + (s.miscWaiver || 0);
  const paidRows = rows.reduce((a, p) => a + p.amount, 0);
  return {
    gross, waivers,
    totalPaid: s.totalPaid || 0,
    balance: s.remainingBalance || 0,
    paidRows,
    receipts: (s.receipts || []).length,
    rows: rows.length,
    balanceHolds: Math.round((gross - waivers - (s.totalPaid || 0)) * 100) / 100 === Math.round((s.remainingBalance || 0) * 100) / 100,
    rowsMatchTotal: Math.round(paidRows * 100) / 100 === Math.round((s.totalPaid || 0) * 100) / 100
  };
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 8 — FEE COLLECTION AND RECEIPTS  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Student.syncIndexes();
  await Payment.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'clerk', role: 'clerk', campus: CAMPUS, collect: true },
    { key: 'bare', role: 'clerk', campus: CAMPUS, collect: false }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzpay${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '223344',
        role: a.role, campus: a.campus, name: `Pay ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: a.collect, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }
    const pay = (id, body) => req('POST', `/api/accountant/students/${id}/payments`, tokens.clerk, body);

    // =================================================================
    section('Taking a payment');

    const s1 = await newStudent(tokens.clerk, 30000);
    const p1 = await pay(s1.studentId, { amount: 10000, category: 'Tuition Fee', installment: 'Installment 1' });
    ok('a valid payment is accepted', p1.status === 200 || p1.status === 201, `status ${p1.status}: ${p1.raw.slice(0, 160)}`);
    ok('a receipt number comes back', !!p1.json?.data?.payment?.receiptNumber, p1.raw.slice(0, 160));
    ok('a receipt link token comes back', !!p1.json?.data?.payment?.receiptToken);

    let r = await reconcile(s1.studentId);
    ok(`the balance falls by exactly the payment (${r.balance}/20000)`, r.balance === 20000, `got ${r.balance}`);
    ok(`totalPaid rises by exactly the payment (${r.totalPaid}/10000)`, r.totalPaid === 10000, `got ${r.totalPaid}`);
    ok('the payment row matches totalPaid', r.rowsMatchTotal, `${r.paidRows} vs ${r.totalPaid}`);
    ok('a receipt is recorded on the student', r.receipts === 1, `${r.receipts} receipts`);
    ok('the invariant holds', r.balanceHolds, JSON.stringify(r));

    const row = await Payment.findOne({ studentId: s1.studentId }).lean();
    ok('the payment records who took it', row.cashier === ACCOUNTS[0].username, `cashier ${row.cashier}`);
    ok("the payment carries the student's campus", row.branch === CAMPUS, `branch ${row.branch}`);

    // =================================================================
    section('What must be refused');

    const REJECT = [
      ['zero', { amount: 0 }],
      ['a negative amount', { amount: -500 }],
      ['NaN', { amount: 'NaN' }],
      ['Infinity', { amount: 'Infinity' }],
      ['an empty amount', { amount: '' }],
      ['an object', { amount: { $gt: 0 } }],
      ['an array', { amount: [100] }],
      ['more than the per-transaction cap', { amount: 99999999 }],
      ['more than is owed', { amount: 25000 }]
    ];
    for (const [label, body] of REJECT) {
      const before = await reconcile(s1.studentId);
      const res = await pay(s1.studentId, body);
      const after = await reconcile(s1.studentId);
      ok(`${label} is refused`, res.status >= 400 && res.status < 500, `status ${res.status}`);
      ok(`${label} left the ledger untouched`,
        after.totalPaid === before.totalPaid && after.rows === before.rows,
        `paid ${before.totalPaid}->${after.totalPaid}, rows ${before.rows}->${after.rows}`);
    }

    const unknown = await pay('ZZ-no-such-student', { amount: 100 });
    ok('an unknown student is a 404', unknown.status === 404, `status ${unknown.status}`);

    const noPerm = await req('POST', `/api/accountant/students/${s1.studentId}/payments`,
      tokens.bare, { amount: 100 });
    ok('a clerk without collectFees cannot collect', noPerm.status === 403, `status ${noPerm.status}`);

    // Clearing the balance exactly must work, and then nothing more may be taken.
    const clear = await pay(s1.studentId, { amount: 20000 });
    ok('a payment that clears the balance exactly is accepted', clear.status === 200 || clear.status === 201, `status ${clear.status}`);
    r = await reconcile(s1.studentId);
    ok('the balance reaches zero, not below', r.balance === 0, `got ${r.balance}`);
    const afterClear = await pay(s1.studentId, { amount: 1 });
    ok('nothing can be collected once cleared', afterClear.status >= 400, `status ${afterClear.status}`);

    // =================================================================
    section('A resubmitted payment');

    const s2 = await newStudent(tokens.clerk, 30000);
    const key = `zz-idem-${crypto.randomBytes(6).toString('hex')}`;
    const first = await pay(s2.studentId, { amount: 5000, idempotencyKey: key });
    const again = await pay(s2.studentId, { amount: 5000, idempotencyKey: key });
    ok('the resubmission is answered, not refused', again.status === 200 || again.status === 201, `status ${again.status}`);
    ok('it is marked as a duplicate', again.json?.duplicate === true, JSON.stringify(again.json).slice(0, 160));
    ok('it returns the ORIGINAL receipt',
      again.json?.data?.payment?.receiptNumber === first.json?.data?.payment?.receiptNumber,
      `${first.json?.data?.payment?.receiptNumber} vs ${again.json?.data?.payment?.receiptNumber}`);

    r = await reconcile(s2.studentId);
    ok(`the family was charged once, not twice (paid ${r.totalPaid})`, r.totalPaid === 5000, `got ${r.totalPaid}`);
    ok('only one payment row exists', r.rows === 1, `${r.rows} rows`);
    ok('the invariant still holds', r.balanceHolds, JSON.stringify(r));

    // =================================================================
    section('Two tills at once');

    // Eight simultaneous payments of 10,000 against a balance of 30,000.
    // Exactly three can be afforded. The rest must be refused AND must leave
    // no payment row behind — a receipt written but never applied inflates
    // every reconciliation the college runs afterwards.
    const s3 = await newStudent(tokens.clerk, 30000);
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        pay(s3.studentId, { amount: 10000, transactionRef: `zz-race-${i}` })));
    const accepted = results.filter(x => (x.status === 200 || x.status === 201) && !x.json?.duplicate).length;
    const refused = results.filter(x => x.status >= 400).length;

    r = await reconcile(s3.studentId);
    ok(`exactly three of eight were accepted (${accepted} accepted, ${refused} refused)`,
      accepted === 3, `${accepted} accepted`);
    ok(`totalPaid is exactly the balance (${r.totalPaid}/30000)`, r.totalPaid === 30000, `got ${r.totalPaid}`);
    ok('the balance is zero, never negative', r.balance === 0, `got ${r.balance}`);
    ok(`no unapplied receipt was left behind (${r.rows} rows)`, r.rows === 3, `${r.rows} rows for 3 payments`);
    ok('payment rows still sum to totalPaid', r.rowsMatchTotal, `${r.paidRows} vs ${r.totalPaid}`);
    ok('the invariant survives the race', r.balanceHolds, JSON.stringify(r));

    // =================================================================
    section('Across the whole scratch ledger');

    const allStudents = await Student.find({}).lean();
    const drift = [];
    for (const st of allStudents) {
      const c = await reconcile(st.studentId);
      if (!c.balanceHolds) drift.push(`${st.studentId}: balance ${c.balance} != ${c.gross - c.waivers - c.totalPaid}`);
      if (!c.rowsMatchTotal) drift.push(`${st.studentId}: rows ${c.paidRows} != totalPaid ${c.totalPaid}`);
    }
    ok(`every student reconciles (${allStudents.length} checked)`, drift.length === 0,
      drift.join('\n        '));

    const orphans = await Payment.countDocuments({
      studentId: { $nin: allStudents.map(x => x.studentId) }
    });
    ok('no payment points at a student that does not exist', orphans === 0, `${orphans} orphan(s)`);

    const receiptNos = await Payment.distinct('receiptNumber');
    const totalRows = await Payment.countDocuments();
    ok(`every receipt number is unique (${receiptNos.length}/${totalRows})`,
      receiptNos.length === totalRows, `${totalRows - receiptNos.length} duplicate(s)`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 8 — COLLECTION: ${pass} passed, ${fail} failed`);
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
