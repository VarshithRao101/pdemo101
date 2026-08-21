/**
 * Payment reversal.
 *
 * A clerk who types 25,000 instead of 2,500 needs the money put back. Until
 * now there was no way to do it at all, so the only repair was editing MongoDB
 * by hand — which breaks the audit trail and the ledger invariant in the same
 * motion.
 *
 * The two invariants must survive a reversal exactly as they survive a
 * collection:
 *
 *     gross - waivers - totalPaid          ==  remainingBalance
 *     sum(payments where not reversed)     ==  totalPaid
 *
 * The second is the one that changes shape: a reversed payment stays in the
 * collection and stops counting. If any total forgot to filter, the college
 * would overstate what it has taken and the figure would look perfectly
 * reasonable.
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

const PORT = 4626;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';
const CLERK_PIN = '606162';

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

/** The invariants, recomputed from the collections. */
const reconcile = async (studentId) => {
  const s = await Student.findOne({ studentId }).lean();
  const all = await Payment.find({ studentId }).lean();
  const live = all.filter(p => !p.reversed);
  const gross = (s.tuitionFee || 0) + (s.hostelFee || 0) + (s.transportFee || 0)
    + (s.miscellaneousFee || 0) + (s.previousPending || 0)
    + (s.customFeeSlots || []).reduce((a, x) => a + (x.amount || 0), 0);
  const waivers = (s.tuitionWaiver || 0) + (s.hostelWaiver || 0)
    + (s.transportWaiver || 0) + (s.miscWaiver || 0);
  return {
    totalPaid: r2(s.totalPaid), balance: r2(s.remainingBalance),
    liveSum: r2(live.reduce((a, p) => a + p.amount, 0)),
    rows: all.length, liveRows: live.length,
    receipts: (s.receipts || []).length,
    balanceHolds: r2(Math.max(0, gross - waivers - (s.totalPaid || 0))) === r2(s.remainingBalance),
    sumHolds: r2(live.reduce((a, p) => a + p.amount, 0)) === r2(s.totalPaid)
  };
};

let seq = 0;

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPAYMENT REVERSAL  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  await mongoose.connection.dropDatabase();
  const db = mongoose.connection.db;
  await Student.syncIndexes();
  await Payment.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const CLERK = { username: `zzrev${TAG}`, password: `Pw-${crypto.randomBytes(9).toString('hex')}`, pin: CLERK_PIN };
  const BARE = { username: `zzrevbare${TAG}`, password: `Pw-${crypto.randomBytes(9).toString('hex')}`, pin: '070809' };
  let clerk, bare;

  try {
    await db.collection('users').insertMany([
      { username: CLERK.username, password: CLERK.password, pin: CLERK.pin,
        role: 'clerk', campus: CAMPUS, name: 'Reversal Clerk', status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date() },
      { username: BARE.username, password: BARE.password, pin: BARE.pin,
        role: 'clerk', campus: CAMPUS, name: 'No Collect', status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: false, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date() }
    ]);
    clerk = (await req('POST', '/api/auth/login', null, CLERK)).json?.token;
    bare = (await req('POST', '/api/auth/login', null, BARE)).json?.token;
    if (!clerk || !bare) throw new Error('sign-in failed');

    const newStudent = async (fee = 30000) => {
      const n = ++seq;
      const res = await req('POST', '/api/accountant/students', clerk, {
        name: `Reversal Student ${n}`,
        admissionNumber: `ZZV${String(Date.now()).slice(-6)}${String(n).padStart(2, '0')}`,
        branch: CAMPUS, course: 'MPC', section: 'A', studentYear: 'First Year',
        academicYear: '2026-2027', mobile: '9876543210', parentMobile: '9876543211',
        tuitionFee: fee, hostelFee: 0, transportFee: 0, miscellaneousFee: 0, previousPending: 0
      });
      if (!res.json?.data) throw new Error(`create failed: ${res.raw.slice(0, 200)}`);
      return res.json.data;
    };
    const collect = (id, amount) =>
      req('POST', `/api/accountant/students/${id}/payments`, clerk, { amount });
    const reverse = (id, receipt, token, pin, reason = 'Wrong amount entered') =>
      req('POST', `/api/accountant/students/${id}/payments/${encodeURIComponent(receipt)}/reverse`,
        token, { reason }, pin ? { 'x-security-pin': pin } : {});

    // =================================================================
    section('Undoing a payment taken in error');

    const s = await newStudent(30000);
    const wrong = await collect(s.studentId, 25000);
    const receipt = wrong.json.data.payment.receiptNumber;
    let r = await reconcile(s.studentId);
    ok(`the wrong amount is on the books (paid ${r.totalPaid}, balance ${r.balance})`,
      r.totalPaid === 25000 && r.balance === 5000);

    const done = await reverse(s.studentId, receipt, clerk, CLERK_PIN);
    ok('the reversal is accepted', done.status === 200, `status ${done.status}: ${done.raw.slice(0, 180)}`);

    r = await reconcile(s.studentId);
    ok(`the money is put back (paid ${r.totalPaid}, balance ${r.balance})`,
      r.totalPaid === 0 && r.balance === 30000, JSON.stringify(r));
    ok('the invariant holds after a reversal', r.balanceHolds && r.sumHolds, JSON.stringify(r));

    // The row stays; it just stops counting.
    ok('the payment row is kept, not deleted', r.rows === 1, `${r.rows} rows`);
    ok('it no longer counts towards what was paid', r.liveRows === 0, `${r.liveRows} still counting`);
    const row = await Payment.findOne({ receiptNumber: receipt }).lean();
    ok('it records who reversed it', row.reversedBy === CLERK.username, `by ${row.reversedBy}`);
    ok('it records when', !!row.reversedAt);
    ok('it records why', row.reversalReason === 'Wrong amount entered', row.reversalReason);
    ok('the original amount is untouched', row.amount === 25000, `amount ${row.amount}`);

    ok('the receipt is off the student\'s list, so it cannot be reprinted',
      r.receipts === 0, `${r.receipts} receipts remain`);

    const audit = await db.collection('auditlogs').findOne({ action: 'payment.reverse' });
    ok('the reversal is in the audit trail', !!audit, 'a reversal with no trail is unaccountable');
    ok('the audit entry carries the amount', Number(audit?.amount) === 25000, `${audit?.amount}`);
    ok('the audit entry carries the reason',
      /Wrong amount entered/.test(audit?.summary || ''), audit?.summary);

    // And the counter can now take the right amount.
    const right = await collect(s.studentId, 2500);
    ok('the correct amount can then be collected', right.status < 300, `status ${right.status}`);
    r = await reconcile(s.studentId);
    ok(`the books are right afterwards (paid ${r.totalPaid}, balance ${r.balance})`,
      r.totalPaid === 2500 && r.balance === 27500, JSON.stringify(r));
    ok('the invariant still holds', r.balanceHolds && r.sumHolds, JSON.stringify(r));

    // =================================================================
    section('The PIN gate');

    const s2 = await newStudent(10000);
    const rec2 = (await collect(s2.studentId, 5000)).json.data.payment.receiptNumber;

    const noPin = await reverse(s2.studentId, rec2, clerk, null);
    ok('no PIN is refused', noPin.status === 403, `status ${noPin.status}`);
    ok('the refusal asks for one', noPin.json?.requiresSecurityPin === true, noPin.raw.slice(0, 140));

    await db.collection('loginattempts').deleteMany({});
    const wrongPin = await reverse(s2.studentId, rec2, clerk, '000000');
    ok('a wrong PIN is refused', wrongPin.status === 403 || wrongPin.status === 429,
      `status ${wrongPin.status}`);

    await db.collection('loginattempts').deleteMany({});
    const otherPin = await reverse(s2.studentId, rec2, clerk, BARE.pin);
    ok("another account's PIN does not open it", otherPin.status === 403 || otherPin.status === 429,
      `status ${otherPin.status}`);

    let r2s = await reconcile(s2.studentId);
    ok('none of the refused reversals moved the money',
      r2s.totalPaid === 5000 && r2s.liveRows === 1, JSON.stringify(r2s));

    await db.collection('loginattempts').deleteMany({});

    // =================================================================
    section('What must be refused');

    const noPerm = await reverse(s2.studentId, rec2, bare, BARE.pin);
    ok('a clerk without collectFees cannot reverse', noPerm.status === 403, `status ${noPerm.status}`);

    const noReason = await req('POST',
      `/api/accountant/students/${s2.studentId}/payments/${encodeURIComponent(rec2)}/reverse`,
      clerk, {}, { 'x-security-pin': CLERK_PIN });
    ok('a reversal with no reason is refused', noReason.status === 400, `status ${noReason.status}`);

    const unknown = await reverse(s2.studentId, 'REC-does-not-exist', clerk, CLERK_PIN);
    ok('an unknown receipt is a 404', unknown.status === 404, `status ${unknown.status}`);

    // A receipt that belongs to somebody else must not be reversible through
    // this student, or a clerk could clear one family's balance using another
    // family's receipt number.
    const s3 = await newStudent(8000);
    const rec3 = (await collect(s3.studentId, 4000)).json.data.payment.receiptNumber;
    const crossed = await reverse(s2.studentId, rec3, clerk, CLERK_PIN);
    ok("another student's receipt cannot be reversed through this one",
      crossed.status === 400, `status ${crossed.status}`);
    ok('the other student is untouched', (await reconcile(s3.studentId)).totalPaid === 4000);

    // =================================================================
    section('Reversing twice');

    const first = await reverse(s2.studentId, rec2, clerk, CLERK_PIN);
    ok('the first reversal succeeds', first.status === 200, `status ${first.status}`);
    const again = await reverse(s2.studentId, rec2, clerk, CLERK_PIN);
    ok('the second is refused as a conflict', again.status === 409, `status ${again.status}`);
    r2s = await reconcile(s2.studentId);
    ok(`the money came back once, not twice (paid ${r2s.totalPaid})`,
      r2s.totalPaid === 0 && r2s.balance === 10000, JSON.stringify(r2s));

    // Two clerks pressing undo at the same instant.
    const s4 = await newStudent(20000);
    const rec4 = (await collect(s4.studentId, 20000)).json.data.payment.receiptNumber;
    const race = await Promise.all(Array.from({ length: 5 }, () =>
      reverse(s4.studentId, rec4, clerk, CLERK_PIN)));
    const accepted = race.filter(x => x.status === 200).length;
    const r4 = await reconcile(s4.studentId);
    ok(`five simultaneous undos apply exactly once (${accepted} accepted)`,
      accepted === 1, `${accepted} accepted`);
    ok(`the balance is restored once (paid ${r4.totalPaid}, balance ${r4.balance})`,
      r4.totalPaid === 0 && r4.balance === 20000, JSON.stringify(r4));
    ok('the invariant survives the race', r4.balanceHolds && r4.sumHolds, JSON.stringify(r4));

    // =================================================================
    section('A reversed receipt stops working for the parent');

    const s5 = await newStudent(15000);
    const paid5 = (await collect(s5.studentId, 15000)).json.data.payment;
    const key = crypto.createHmac('sha256', process.env.JWT_SECRET).update('receipt-link-v1').digest();
    const tok = crypto.createHmac('sha256', key).update(String(paid5.receiptNumber))
      .digest('base64url').slice(0, 22);

    // The GET is only the four-digit form and reads no collection at all —
    // that is what makes WhatsApp's preview fetch harmless — so it still
    // answers 200 after a reversal. The refusal has to come from the POST,
    // which is the request that would otherwise render the document.
    const openReceipt = () => new Promise((resolve, reject) => {
      const body = `last4=3211`;
      const rq = http.request(`${BASE}/r/${encodeURIComponent(paid5.receiptNumber)}/${tok}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      }, res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, raw })); });
      rq.on('error', reject); rq.write(body); rq.end();
    });

    const before5 = await openReceipt();
    ok('the parent can open the receipt before the reversal',
      before5.status === 200 && before5.raw.includes('Amount Received'), `status ${before5.status}`);

    await reverse(s5.studentId, paid5.receiptNumber, clerk, CLERK_PIN);

    const afterGate = await req('GET', `/r/${encodeURIComponent(paid5.receiptNumber)}/${tok}`, null);
    ok('the gate still answers, because it reads nothing', afterGate.status === 200,
      `status ${afterGate.status}`);

    const after5 = await openReceipt();
    ok('the receipt itself stops opening after the reversal', after5.status === 410,
      `status ${after5.status} — a link already sent by WhatsApp cannot be recalled`);
    ok('it says the receipt was cancelled', /cancelled/i.test(after5.raw), after5.raw.slice(0, 200));

    // =================================================================
    section('A closed year cannot be unwound here');

    const s6 = await newStudent(12000);
    const rec6 = (await collect(s6.studentId, 12000)).json.data.payment.receiptNumber;
    const upgraded = await req('POST', `/api/accountant/students/${s6.studentId}/upgrade`,
      clerk, { tuitionFee: 14000 });
    ok('the year closes', upgraded.status < 300, `status ${upgraded.status}`);
    const archivedTry = await reverse(s6.studentId, rec6, clerk, CLERK_PIN);
    ok('a receipt from a closed year is refused', archivedTry.status === 409,
      `status ${archivedTry.status} — its money is archived and its fee structure is gone`);
    const s6after = await Student.findOne({ studentId: s6.studentId }).lean();
    ok('the closed year is untouched',
      (s6after.yearHistory || [])[0]?.totalPaid === 12000,
      `archived ${(s6after.yearHistory || [])[0]?.totalPaid}`);

    // =================================================================
    section('Every total excludes it');

    const dash = await req('GET', '/api/accountant/dashboard-summary', clerk);
    const livePayments = await Payment.find({ reversed: { $ne: true } }).lean();
    const liveTotal = r2(livePayments.reduce((a, p) => a + p.amount, 0));
    ok(`the dashboard counts only live payments (${dash.json?.data?.collectionToday}/${liveTotal})`,
      r2(dash.json?.data?.collectionToday) === liveTotal,
      `reported ${dash.json?.data?.collectionToday}, live total ${liveTotal}`);

    const reversedTotal = r2((await Payment.find({ reversed: true }).lean())
      .reduce((a, p) => a + p.amount, 0));
    ok(`there are reversed payments to exclude (Rs. ${reversedTotal.toLocaleString('en-IN')})`,
      reversedTotal > 0, 'nothing was reversed, so this proves nothing');

    const analytics = await req('GET', '/api/admin1/analytics', clerk);
    const flat = JSON.stringify(analytics.json?.data || {});
    ok('the analytics do not report the reversed money as collected',
      !flat.includes(String(reversedTotal + liveTotal)),
      `analytics appear to include the reversed amount`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PAYMENT REVERSAL: ${pass} passed, ${fail} failed`);
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
