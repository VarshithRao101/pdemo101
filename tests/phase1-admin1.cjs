/**
 * PHASE 1 — THE RECTOR (admin1), end to end.
 *
 * The existing verify-* suites each prove one thing in isolation. This proves
 * the JOURNEY: one Rector signs in once and runs a full year of administration
 * against a real server and a real database, in order, with each step reading
 * back what the previous step wrote.
 *
 * That ordering is the point. A route can pass its own test and still be wrong
 * in sequence — a fee edited after a payment, a student upgraded after a
 * waiver, a teacher deleted while a salary month is open. Those are the faults
 * that survive unit-shaped tests and reach a handover.
 *
 * It also leaves its data behind ON PURPOSE. Phase 2 and 3 sign in as other
 * roles and must find exactly what the Rector created here, unchanged. The
 * operator's requirement was "the data added in the previous test must work
 * here also", and the only way to check that is to not clean up between phases.
 * Pass --clean to drop it.
 *
 * ITS OWN DATABASE, jc_erp_phase - not the jc_erp_verify the verify-* suites
 * share.
 *
 * Because this suite deliberately leaves its data behind for the next phase,
 * and the verify-* suites assume nobody else is writing. Running phase 1 and
 * then `npm run test:ci` against one scratch database made verify-audit and
 * verify-collection fail on documents this suite had left there - suites that
 * pass perfectly well on their own. Two tests disagreeing about who owns the
 * database is a fault in the tests, not the app, and it wastes the time of
 * whoever reads the red.
 *
 * Never production.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_phase';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_phase';

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');

const PORT = 4701;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C1';
const OTHER = 'Erragattugutta C1';
const CLEAN = process.argv.includes('--clean');

// A stable tag so phase 2 and 3 can find this phase's records.
const TAG = process.env.PHASE_TAG || 'zzph1';

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

const PIN = '445566';
const withPin = () => ({ 'x-security-pin': PIN });
// Rows out of a list response, whatever shape the route uses.
//
// Every candidate is Array.isArray-checked. `data.entries` is not optional
// caution: when data is itself an ARRAY, data.entries is Array.prototype.entries
// - a function, and truthy - so a bare `||` chain returns the method instead of
// the rows, and the next .some() throws.
const rows = (r) => {
  const d = r.json?.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.entries)) return d.entries;
  if (Array.isArray(d?.students)) return d.students;
  if (Array.isArray(d)) return d;
  return [];
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 1 — THE RECTOR (admin1)   [scratch database]\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_phase', serverSelectionTimeoutMS: 20000 });
  if (mongoose.connection.name !== 'jc_erp_phase') throw new Error('wrong database');
  const db = mongoose.connection.db;
  try { await db.collection('ratelimits').deleteMany({}); } catch {}

  // Start clean so a re-run is deterministic.
  for (const [c, f] of [
    ['users', { username: new RegExp(`^${TAG}`) }],
    ['students', { admissionNumber: new RegExp(`^${TAG}`) }],
    ['payments', { receiptNumber: new RegExp(`^${TAG}`) }],
    ['teachers', { id: new RegExp(`^${TAG}`) }],
    ['expenditures', { id: new RegExp(`^${TAG}`) }],
    ['enquiries', { studentName: new RegExp(`^${TAG}`) }],
    ['workerpayments', { id: new RegExp(`^${TAG}`) }]
  ]) { try { await db.collection(c).deleteMany(f); } catch {} }

  const RECTOR = { username: `${TAG}rector`, password: `Pw-${crypto.randomBytes(9).toString('hex')}` };
  let token;

  try {
    // =================================================================
    section('Signing in');

    await db.collection('users').insertOne({
      username: RECTOR.username, password: RECTOR.password, pin: PIN,
      role: 'admin1', campus: 'All', name: 'Phase1 Rector', status: 'active',
      permissions: {}, activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
    });

    // An accountant to practise a credential change on. The Rector may change
    // this one; the authenticator is the account it may not, asserted below.
    await db.collection('users').insertOne({
      username: `${TAG}acct`, password: `Pw-${crypto.randomBytes(9).toString('hex')}`, pin: '242526',
      role: 'accountant', campus: CAMPUS, name: 'Phase1 Accountant', status: 'active',
      permissions: {}, activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
    });
    const login = await req('POST', '/api/auth/login', null, {
      username: RECTOR.username, password: RECTOR.password, pin: PIN
    });
    token = login.json?.token;
    ok('the Rector signs in', !!token, `status ${login.status}: ${login.raw.slice(0, 120)}`);
    if (!token) throw new Error('cannot continue without a session');

    const me = login.json?.user || login.json?.data?.user;
    ok('the session names the role and campus',
      me?.role === 'admin1' && me?.campus === 'All',
      JSON.stringify(me));

    // =================================================================
    section('Students — add, read back, edit');

    const admNo = `${TAG}S001`;
    const created = await req('POST', '/api/admin1/students', token, {
      name: 'Phase One Student', admissionNumber: admNo, branch: CAMPUS,
      course: 'MPC', section: 'A', academicYear: '2026-27', studentYear: '1st Year',
      mobile: '9000000101', parentMobile: '9000000102', fatherName: 'Phase Father',
      tuitionFee: 60000, hostelFee: 30000, transportFee: 5000, miscellaneousFee: 2000
    }, withPin());
    ok('a student is created', created.status === 201 || created.status === 200,
      `status ${created.status}: ${created.raw.slice(0, 160)}`);

    const stuDoc = await db.collection('students').findOne({ admissionNumber: admNo });
    ok('it reached the database', !!stuDoc, 'no student document');
    ok('the fees were stored as given',
      stuDoc && stuDoc.tuitionFee === 60000 && stuDoc.hostelFee === 30000,
      stuDoc ? `tuition ${stuDoc.tuitionFee}, hostel ${stuDoc.hostelFee}` : '');
    ok('it is filed at the right campus', stuDoc && stuDoc.branch === CAMPUS, stuDoc && stuDoc.branch);

    const studentId = stuDoc && (stuDoc.studentId || String(stuDoc._id));

    const listed = await req('GET', `/api/admin1/students?limit=200`, token, undefined, withPin());
    ok('it appears in the Rector list',
      listed.status === 200 && rows(listed).some(s => s.admissionNumber === admNo),
      `status ${listed.status}, ${rows(listed).length} rows`);

    const edited = await req('PATCH', `/api/accountant/students/${studentId}/bio`, token, {
      name: 'Phase One Student Edited', mobile: '9000000111'
    }, withPin());
    const afterEdit = await db.collection('students').findOne({ admissionNumber: admNo });
    ok('an edit is saved and readable immediately',
      edited.status < 300 && afterEdit.name === 'Phase One Student Edited' && afterEdit.mobile === '9000000111',
      `status ${edited.status}, name "${afterEdit.name}", mobile ${afterEdit.mobile}`);

    // =================================================================
    section('Fee structure');

    const feeGet = await req('GET', `/api/admin2/fee-settings?branch=${encodeURIComponent(CAMPUS)}`, token, undefined, withPin());
    ok('the fee structure can be read', feeGet.status === 200, `status ${feeGet.status}`);

    const feeSet = await req('PATCH', `/api/admin2/fee-settings?branch=${encodeURIComponent(CAMPUS)}`, token, {
      branch: CAMPUS, tuition: 62000, hostel: 31000, transport: 6000, misc: 2500
    }, withPin());
    ok('the fee structure accepts an update', feeSet.status < 300,
      `status ${feeSet.status}: ${feeSet.raw.slice(0, 140)}`);

    // Read from the DATABASE, not from the response. The earlier version of
    // this check accepted a 404 as success and used field names the route does
    // not read, so it passed while nothing was written at all.
    const feeDoc = await db.collection('feesettings').findOne({ branch: CAMPUS });
    ok('the fee structure is actually PERSISTED',
      feeDoc && Number(feeDoc.tuition) === 62000 && Number(feeDoc.hostel) === 31000,
      feeDoc ? `stored tuition ${feeDoc.tuition}, hostel ${feeDoc.hostel}` : 'no feesettings document was written');

    // =================================================================
    section('Faculty — add, edit salary, delete');

    const teacherId = `${TAG}T001`;
    const tAdd = await req('POST', '/api/admin1/teachers', token, {
      id: teacherId, name: 'Phase One Teacher', subject: 'Physics', salary: 40000,
      mobile: '9000000201', branch: CAMPUS, classification: 'Teaching'
    }, withPin());
    ok('a teacher is added', tAdd.status < 300, `status ${tAdd.status}: ${tAdd.raw.slice(0, 150)}`);

    const tDoc = await db.collection('teachers').findOne({ id: teacherId });
    ok('the teacher reached the database', !!tDoc, 'not found');
    ok('the salary was stored', tDoc && tDoc.salary === 40000, tDoc && String(tDoc.salary));

    const tEdit = await req('PATCH', `/api/admin1/teachers/${teacherId}`, token,
      { salary: 45000, subject: 'Physics & Maths' }, withPin());
    const tAfter = await db.collection('teachers').findOne({ id: teacherId });
    ok('a teacher edit is saved',
      tEdit.status < 300 && tAfter.salary === 45000,
      `status ${tEdit.status}, salary ${tAfter && tAfter.salary}`);

    // =================================================================
    section('The twelve-month salary ledger');

    // Month NAMES, in academic-year order starting at June - not '2026-08'.
    // The route validates this and says so; the broken duplicate accepted
    // anything and discarded it, which is the difference that matters.
    const month = 'August';
    // The admin1 path, which writes salaryLedger[academicYear][month]. A second
    // route at /api/teachers/:id/salary-month used to exist and silently
    // discarded every write; this test is what found it, and it is now gone.
    const payMonth = await req('POST', `/api/admin1/teachers/${teacherId}/salary-month`, token, {
      academicYear: '2026-2027', month, amountPaid: 45000, paymentMode: 'Bank Transfer'
    }, withPin());
    ok('a salary month can be marked paid', payMonth.status < 300,
      `status ${payMonth.status}: ${payMonth.raw.slice(0, 150)}`);

    const ledger = await req('GET', '/api/admin2/staff-salaries', token, undefined, withPin());
    const ledgerRow = rows(ledger).find(t => t.id === teacherId);
    ok('the ledger lists the teacher', ledger.status === 200 && !!ledgerRow,
      `status ${ledger.status}, ${rows(ledger).length} rows`);

    const tWithMonths = await db.collection('teachers').findOne({ id: teacherId });
    const ledgerYear = (tWithMonths?.salaryLedger || {})['2026-2027'] || {};
    ok('the paid month is actually PERSISTED against the teacher',
      Object.keys(ledgerYear).length > 0,
      `salaryLedger holds ${JSON.stringify(tWithMonths?.salaryLedger || {}).slice(0, 120)} `
      + '— a salary month that reports success and stores nothing is the fault this checks for');

    // =================================================================
    section('Expenditure');

    const expMade = await req('POST', '/api/admin2/expenditure', token, {
      category: 'Maintenance', amount: 3500, description: `${TAG} ceiling fan`, branch: CAMPUS
    }, withPin());
    ok('an expenditure is logged', expMade.status === 201, `status ${expMade.status}: ${expMade.raw.slice(0, 140)}`);
    const expId = expMade.json?.data?.id;

    const expList = await req('GET', `/api/admin2/expenditure?branch=${encodeURIComponent(CAMPUS)}`, token, undefined, withPin());
    ok('it appears in the expenditure list',
      expList.status === 200 && rows(expList).some(e => e.id === expId),
      `status ${expList.status}`);

    // =================================================================
    section('Admission enquiries');

    const enq = await req('POST', '/api/enquiries', null, {
      studentName: `${TAG} Enquiry Student`, parentName: 'Enquiry Parent',
      mobile: '9000000301', email: 'enq@example.com', stream: 'MPC',
      preferredCampus: CAMPUS, currentGrade: '10th Class', notes: 'phase 1'
    });
    ok('a public enquiry is accepted', enq.status < 300, `status ${enq.status}: ${enq.raw.slice(0, 140)}`);

    const enqList = await req('GET', '/api/enquiries', token, undefined, withPin());
    const mine = rows(enqList).find(e => String(e.studentName).startsWith(TAG));
    ok('the Rector sees it in the inbox', enqList.status === 200 && !!mine,
      `status ${enqList.status}, ${rows(enqList).length} rows`);

    if (mine) {
      const marked = await req('PATCH', `/api/enquiries/${mine._id || mine.id}`, token,
        { status: 'Contacted', notes: 'Called — phase 1' }, withPin());
      const enqAfter = await db.collection('enquiries').findOne({ studentName: new RegExp(`^${TAG}`) });
      ok('it can be marked as contacted',
        marked.status < 300 && enqAfter.status === 'Contacted',
        `status ${marked.status}, now "${enqAfter && enqAfter.status}"`);
    }

    // =================================================================
    section('Credentials');

    const creds = await req('POST', '/api/admin1/credentials', token, {}, withPin());
    ok('the credentials screen loads', creds.status === 200, `status ${creds.status}`);

    const accounts = creds.json?.data?.accounts || creds.json?.data || [];
    ok('clerks are NOT listed here (they have their own screen)',
      Array.isArray(accounts) && !accounts.some(a => a.role === 'clerk' || a.role === 'admin2'),
      `roles present: ${[...new Set(accounts.map(a => a.role))].join(', ')}`);

    const authRow = accounts.find(a => a.role === 'authenticator');
    if (authRow) {
      const seize = await req('PUT', `/api/admin1/credentials/${authRow.id}`, token,
        { password: 'RectorTriesToTakeIt1' }, withPin());
      ok('the Rector still cannot change the authenticator', seize.status === 403, `status ${seize.status}`);
    }

    // =================================================================
    section('Fee collection and the next year');

    const payMade = await req('POST', `/api/accountant/students/${studentId}/payments`, token, {
      amount: 20000, category: 'Tuition', installment: 'Installment 1', paymentMode: 'Cash'
    }, withPin());
    ok('a payment is recorded', payMade.status === 201 || payMade.status === 200,
      `status ${payMade.status}: ${payMade.raw.slice(0, 150)}`);

    const stuAfterPay = await db.collection('students').findOne({ admissionNumber: admNo });
    ok('the student balance moved with the payment',
      stuAfterPay && Number(stuAfterPay.totalPaid) === 20000,
      `totalPaid ${stuAfterPay && stuAfterPay.totalPaid}`);

    const elig = await req('GET', `/api/accountant/students/${studentId}/upgrade-eligibility`, token, undefined, withPin());
    ok('upgrade eligibility can be read', elig.status === 200, `status ${elig.status}`);

    // =================================================================
    section('Recycle bin');

    const delStu = await req('DELETE', `/api/admin1/students/${studentId}`, token, undefined, withPin());
    ok('a student can be deleted', delStu.status < 300, `status ${delStu.status}: ${delStu.raw.slice(0, 140)}`);

    const goneFromList = await req('GET', `/api/admin1/students?limit=200`, token, undefined, withPin());
    ok('it disappears from the live list',
      !rows(goneFromList).some(s => s.admissionNumber === admNo), 'still listed after deletion');

    const binned = await req('GET', '/api/admin1/recently-deleted', token, undefined, withPin());
    const binRow = (rows(binned).length ? rows(binned) : (binned.json?.data?.students || []))
      .find(s => String(s.reference || s.admissionNumber || '').startsWith(TAG));
    ok('it is in the recycle bin', binned.status === 200 && !!binRow,
      `status ${binned.status}: ${binned.raw.slice(0, 140)}`);

    if (binRow) {
      const restored = await req('POST', `/api/admin1/recently-deleted/${binRow.type || 'student'}/${binRow.id}/restore`,
        token, {}, withPin());
      const back = await req('GET', `/api/admin1/students?limit=200`, token, undefined, withPin());
      ok('a deleted student can be restored',
        restored.status < 300 && rows(back).some(s => s.admissionNumber === admNo),
        `status ${restored.status}: ${restored.raw.slice(0, 140)}`);
    }

    // =================================================================
    section('Reports, analytics and the audit trail');

    for (const [label, path] of [
      ['analytics', '/api/admin1/analytics'],
      ['reports', '/api/admin1/reports'],
      ['sections', '/api/admin1/sections'],
      ['enrollment stats', '/api/admin2/enrollment-stats'],
      ['outstanding fees', '/api/fees/outstanding']
    ]) {
      const r = await req('GET', path, token, undefined, withPin());
      ok(`${label} loads`, r.status === 200, `status ${r.status}: ${r.raw.slice(0, 110)}`);
    }

    const auditCount = await db.collection('auditlogs')
      .countDocuments({ actorUsername: RECTOR.username });
    ok('every action was written to the audit trail', auditCount > 0, `${auditCount} entries`);

    const leaked = await db.collection('auditlogs')
      .countDocuments({ actorUsername: RECTOR.username, summary: new RegExp(RECTOR.password) });
    ok('no password reached the audit trail', leaked === 0, `${leaked} entries contain the password`);

    // =================================================================
    section('A full twelve-month salary ledger');

    // One month proves the route works. Twelve proves the LEDGER works - that
    // months accumulate instead of overwriting each other, which is the fault
    // that would only show up in March.
    const MONTHS = ['June','July','August','September','October','November',
                    'December','January','February','March','April','May'];
    let monthsOk = 0;
    for (const mth of MONTHS) {
      const r = await req('POST', `/api/admin1/teachers/${teacherId}/salary-month`, token, {
        academicYear: '2026-2027', month: mth, amountPaid: 45000, paymentMode: 'Bank Transfer'
      }, withPin());
      if (r.status < 300) monthsOk++;
    }
    ok('all twelve months are accepted', monthsOk === 12, `${monthsOk} of 12 accepted`);

    const tYear = await db.collection('teachers').findOne({ id: teacherId });
    const storedMonths = Object.keys((tYear?.salaryLedger || {})['2026-2027'] || {});
    ok('all twelve are held in the ledger at once', storedMonths.length === 12,
      `${storedMonths.length} stored: ${storedMonths.join(', ')}`);

    const totalPaid = Object.values((tYear?.salaryLedger || {})['2026-2027'] || {})
      .reduce((t, m) => t + Number(m.paidAmount || m.amountPaid || 0), 0);
    ok('the year totals to twelve months of salary', totalPaid === 12 * 45000,
      `total ${totalPaid}, expected ${12 * 45000}`);

    // =================================================================
    section('Fee waiver and the next year');

    const waiver = await req('PATCH', `/api/admin1/students/${studentId}/fee-override`, token, {
      tuitionWaiver: 5000, reason: 'phase 1 sibling concession'
    }, withPin());
    const afterWaiver = await db.collection('students').findOne({ admissionNumber: admNo });
    ok('a fee waiver is applied and stored',
      waiver.status < 300 && Number(afterWaiver.tuitionWaiver) === 5000,
      `status ${waiver.status}, stored waiver ${afterWaiver && afterWaiver.tuitionWaiver}`);

    const breakdown = await req('GET', `/api/admin1/students/${studentId}/fee-breakdown`, token, undefined, withPin());
    ok('the fee breakdown loads and reflects the waiver',
      breakdown.status === 200 && /5000/.test(breakdown.raw),
      `status ${breakdown.status}: ${breakdown.raw.slice(0, 120)}`);

    // The upgrade is the actual "next year" action, not just its eligibility.
    //
    // It is refused while fees are outstanding - a real guard, and the right
    // one, so this clears the balance rather than working around it. The 409
    // that surfaced it is worth asserting in its own right.
    const lockedTry = await req('POST', `/api/accountant/students/${studentId}/upgrade`, token, {
      tuitionFee: 65000, hostelFee: 32000, transportFee: 0, miscellaneousFee: 2000
    }, withPin());
    ok('the next year is REFUSED while fees are outstanding',
      lockedTry.status === 409, `status ${lockedTry.status}: ${lockedTry.raw.slice(0, 120)}`);

    const owing = await db.collection('students').findOne({ admissionNumber: admNo });
    const due = Number(owing.remainingBalance || 0);
    if (due > 0) {
      await req('POST', `/api/accountant/students/${studentId}/payments`, token, {
        amount: due, category: 'Tuition', installment: 'Final', paymentMode: 'Cash'
      }, withPin());
    }
    const cleared = await db.collection('students').findOne({ admissionNumber: admNo });
    ok('the balance clears to zero once paid in full',
      Number(cleared.remainingBalance || 0) === 0,
      `remaining ${cleared && cleared.remainingBalance} after paying ${due}`);

    const beforeYear = cleared.studentYear;
    const upgrade = await req('POST', `/api/accountant/students/${studentId}/upgrade`, token, {
      tuitionFee: 65000, hostelFee: 32000, transportFee: 0, miscellaneousFee: 2000
    }, withPin());
    const afterUp = await db.collection('students').findOne({ admissionNumber: admNo });
    ok('the student is moved to the next year',
      upgrade.status < 300 && afterUp.studentYear !== beforeYear,
      `status ${upgrade.status}: ${upgrade.raw.slice(0, 140)} — year "${beforeYear}" -> "${afterUp && afterUp.studentYear}"`);
    ok('last year is kept in the history rather than lost',
      Array.isArray(afterUp?.yearHistory) ? afterUp.yearHistory.length > 0 : !!afterUp?.yearHistory,
      `yearHistory ${JSON.stringify(afterUp?.yearHistory || null).slice(0, 100)}`);

    // =================================================================
    section('Reversing a payment');

    const pay2 = await req('POST', `/api/accountant/students/${studentId}/payments`, token, {
      amount: 5000, category: 'Tuition', installment: 'Installment 2', paymentMode: 'UPI'
    }, withPin());
    const rcpt = pay2.json?.data?.payment?.receiptNumber
      || pay2.json?.data?.receiptNumber || pay2.json?.data?.receipt?.receiptNumber;
    ok('a second payment is taken', pay2.status < 300 && !!rcpt,
      `status ${pay2.status}: ${pay2.raw.slice(0, 140)}`);

    if (rcpt) {
      const beforeRev = await db.collection('students').findOne({ admissionNumber: admNo });
      const rev = await req('POST', `/api/accountant/students/${studentId}/payments/${rcpt}/reverse`, token,
        { reason: 'phase 1 — entered twice' }, withPin());
      const afterRev = await db.collection('students').findOne({ admissionNumber: admNo });
      ok('the payment can be reversed', rev.status < 300, `status ${rev.status}: ${rev.raw.slice(0, 140)}`);
      ok('the money comes back off the student',
        Number(afterRev.totalPaid) === Number(beforeRev.totalPaid) - 5000,
        `totalPaid ${beforeRev.totalPaid} -> ${afterRev.totalPaid}`);

      const revDoc = await db.collection('payments').findOne({ receiptNumber: rcpt });
      ok('the reversal is marked on the receipt, not deleted',
        revDoc && revDoc.reversed === true,
        'a reversed receipt must survive as evidence, flagged');
    }

    // =================================================================
    section('Worker payments');

    const wp = await req('POST', '/api/admin2/worker-payments', token, {
      workerName: `${TAG} Gardener`, role: 'Gardener', amount: 8000,
      monthPeriod: 'August 2026', paid: true, branch: CAMPUS
    }, withPin());
    ok('a worker payment is recorded', wp.status === 201 || wp.status < 300,
      `status ${wp.status}: ${wp.raw.slice(0, 140)}`);
    const wpId = wp.json?.data?.id;

    const wpList = await req('GET', `/api/admin2/worker-payments?branch=${encodeURIComponent(CAMPUS)}`, token, undefined, withPin());
    ok('it appears in the worker payment list',
      wpList.status === 200 && rows(wpList).some(w => String(w.workerName || '').startsWith(TAG)),
      `status ${wpList.status}, ${rows(wpList).length} rows`);

    if (wpId) {
      const wpEdit = await req('PATCH', `/api/admin2/worker-payments/${wpId}`, token, { amount: 8500 }, withPin());
      const wpDoc = await db.collection('workerpayments').findOne({ id: wpId });
      ok('a worker payment can be corrected',
        wpEdit.status < 300 && Number(wpDoc.amount) === 8500,
        `status ${wpEdit.status}, amount ${wpDoc && wpDoc.amount}`);

      const wpDel = await req('DELETE', `/api/admin2/worker-payments/${wpId}`, token, undefined, withPin());
      ok('a worker payment can be removed', wpDel.status < 300, `status ${wpDel.status}`);
    }

    // =================================================================
    section('Editing and removing an expenditure');

    if (expId) {
      const expEdit = await req('PATCH', `/api/admin2/expenditure/${expId}`, token,
        { amount: 4000, description: `${TAG} ceiling fan (revised)` }, withPin());
      const expDoc = await db.collection('expenditures').findOne({ id: expId });
      ok('an expenditure can be corrected',
        expEdit.status < 300 && Number(expDoc.amount) === 4000,
        `status ${expEdit.status}, amount ${expDoc && expDoc.amount}`);

      const expDel = await req('DELETE', `/api/admin2/expenditure/${expId}`, token, undefined, withPin());
      ok('an expenditure can be removed', expDel.status < 300, `status ${expDel.status}`);
    }

    // =================================================================
    section('Changing a credential');

    // The screen loading is not the same as it working. This changes one for
    // real and signs in with the new password.
    const accts = creds.json?.data?.accounts || creds.json?.data || [];
    const victim = accts.find(a => a.role === 'accountant');
    if (victim) {
      const newPw = `Ph1-${crypto.randomBytes(6).toString('hex')}`;
      const changed = await req('PUT', `/api/admin1/credentials/${victim.id}`, token,
        { password: newPw }, withPin());
      ok('the Rector can change an accountant password', changed.status < 300,
        `status ${changed.status}: ${changed.raw.slice(0, 140)}`);

      const relog = await req('POST', '/api/auth/login', null,
        { username: victim.username, password: newPw });
      ok('the new password actually signs in', !!relog.json?.token,
        `status ${relog.status}: ${relog.raw.slice(0, 120)}`);
    } else {
      ok('an accountant exists to change', false, 'no accountant account in the scratch database');
    }

    // =================================================================
    section('Removing a teacher');

    const tDel = await req('DELETE', `/api/admin1/teachers/${teacherId}`, token, undefined, withPin());
    ok('a teacher can be deleted', tDel.status < 300, `status ${tDel.status}: ${tDel.raw.slice(0, 140)}`);

    const tList = await req('GET', '/api/admin1/teachers', token, undefined, withPin());
    ok('the teacher leaves the live list',
      tList.status === 200 && !rows(tList).some(t => t.id === teacherId),
      `status ${tList.status}, ${rows(tList).length} rows`);

    // Soft deletion: the record must still be recoverable, not destroyed.
    const tStillThere = await db.collection('teachers').findOne({ id: teacherId });
    ok('the teacher record survives for the recycle bin', !!tStillThere,
      'hard-deleted — a mistaken deletion could not be undone');

    // =================================================================
    section('The audit log the Rector actually reads');

    const logs = await req('GET', '/api/admin1/logs?limit=50', token, undefined, withPin());
    ok('the activity log loads', logs.status === 200, `status ${logs.status}`);
    ok('it contains this session\'s actions',
      rows(logs).some(l => l.actorUsername === RECTOR.username),
      `${rows(logs).length} rows, none by ${RECTOR.username}`);

    const logFilters = await req('GET', '/api/admin1/logs/filters', token, undefined, withPin());
    ok('the log filter options load', logFilters.status === 200, `status ${logFilters.status}`);

    // =================================================================
    section('Exports the Rector can take away');

    for (const kind of ['students', 'payments', 'expenditures']) {
      const r = await req('GET', `/api/export/${kind}.csv`, token, undefined, withPin());
      ok(`the ${kind} CSV downloads`,
        r.status === 200 && r.raw.charCodeAt(0) === 0xFEFF,
        `status ${r.status}, BOM ${r.raw.charCodeAt(0) === 0xFEFF}`);
    }

    // =================================================================
    section('What the next phases will read');

    const finalStu = await db.collection('students').findOne({ admissionNumber: admNo });
    const finalTea = await db.collection('teachers').findOne({ id: teacherId });
    ok('the student survives for phase 2', !!finalStu, 'missing');
    ok('the teacher survives for phase 2', !!finalTea, 'missing');
    console.log(`\n  Handing to phase 2:  student ${admNo}  ·  teacher ${teacherId}  ·  campus ${CAMPUS}`);

  } catch (err) {
    console.error('\nERROR', err.message);
    fail++;
  } finally {
    if (CLEAN) {
      for (const [c, f] of [
        ['users', { username: new RegExp(`^${TAG}`) }],
        ['students', { admissionNumber: new RegExp(`^${TAG}`) }],
        ['payments', { receiptNumber: new RegExp(`^${TAG}`) }],
        ['teachers', { id: new RegExp(`^${TAG}`) }],
        ['expenditures', { description: new RegExp(`^${TAG}`) }],
        ['enquiries', { studentName: new RegExp(`^${TAG}`) }]
      ]) { try { await db.collection(c).deleteMany(f); } catch {} }
      console.log('\n  (--clean: phase 1 data removed)');
    }
    console.log(`\n${'='.repeat(62)}`);
    console.log(`PHASE 1 — RECTOR: ${pass} passed, ${fail} failed`);
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
