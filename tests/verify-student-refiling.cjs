/**
 * Correcting how a student is filed: admission number, campus and year.
 *
 * The fee-Excel import left 189 temporary admission numbers (TB2-001...),
 * 17 shared ones suffixed with a campus, and two campuses whose year was
 * inferred. All three used to be silently ignored by the student edit route,
 * so the college could not fix any of them from the app.
 *
 * Runs against the scratch database (jc_erp_verify) and drops it at the end.
 * Every edit here is sent the way the editor screens send it — the WHOLE
 * record — because a guard that tests presence instead of change breaks
 * editing entirely, and minimal payloads would not show it.
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

const PORT = 4611;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';
const OTHER = 'Beemaram C1';

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

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nSTUDENT RE-FILING — admission number, campus, year  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') {
    throw new Error(`refusing to run against ${mongoose.connection.name}`);
  }
  const db = mongoose.connection.db;
  await Student.syncIndexes();
  await Payment.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const tokens = {};
  try {
    for (const a of [
      { key: 'rector', role: 'admin1', campus: 'All', edit: true },
      { key: 'clerk', role: 'clerk', campus: CAMPUS, edit: true },
      { key: 'bare', role: 'clerk', campus: CAMPUS, edit: false }
    ]) {
      const username = `zzrefile${a.key}${TAG}`;
      const password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username, password, pin: '445566', role: a.role, campus: a.campus, name: `Refile ${a.key}`, status: 'active',
        permissions: { addStudent: a.edit, editStudent: a.edit, editFees: false, collectFees: a.edit, logExpenditures: false },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null, { username, password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}: ${login.raw.slice(0, 200)}`);
      tokens[a.key] = login.json.token;
    }

    // Shaped like the Excel import: studentId == the temporary number, two
    // opening-balance receipts pointing at it.
    const TEMP = `TB2-${TAG}`;
    const seed = (adm, name) => ({
      studentId: adm, admissionNumber: adm, name, branch: CAMPUS, status: 'Active',
      studentYear: 'Second Year', academicYear: '2026-2027', tuitionFee: 50000,
      customFeeSlots: [{ id: 'others', name: 'Others', amount: 15000 }],
      totalPaid: 20000, remainingBalance: 45000, receipts: [], importBatch: 'zz-refile'
    });
    await Student.create(seed(TEMP, 'Zz Temp Student'));
    await Student.create(seed(`ZZ${TAG}-other`, 'Zz Other Student'));
    for (const [k, amount] of [['TF', 5000], ['OT', 15000]]) {
      await Payment.create({
        receiptNumber: `XL-${TEMP}-${k}`, studentId: TEMP, admissionNumber: TEMP, studentName: 'Zz Temp Student',
        amount, category: k === 'TF' ? 'Tuition Fee' : 'Others', installment: 'Opening balance',
        paymentMode: 'Opening Balance', cashier: 'zz-refile', branch: CAMPUS, date: new Date('2026-06-01')
      });
    }
    // What the editor screens send: the whole record, as read.
    const whole = async (over) => ({ ...(await Student.findOne({ studentId: TEMP }).lean()), ...over });
    const patch = async (token, over) => req('PATCH', `/api/accountant/students/${encodeURIComponent(TEMP)}`, token, await whole(over));

    // =================================================================
    section('Unchanged filing is not an attempt to change it');

    const echo = await patch(tokens.clerk, { fatherName: 'Zz Father' });
    ok('a clerk saving the whole record with only the father\'s name changed succeeds',
      echo.status === 200, `status ${echo.status}: ${echo.raw.slice(0, 160)}`);

    // =================================================================
    section('Admission number');

    const NEW = `38${TAG}`;
    const renum = await patch(tokens.clerk, { admissionNumber: ` ${NEW} ` });
    ok('a clerk with editStudent can replace a temporary admission number', renum.status === 200,
      `status ${renum.status}: ${renum.raw.slice(0, 160)}`);
    const after = await Student.findOne({ studentId: TEMP }).lean();
    ok('the new number is stored, trimmed', after?.admissionNumber === NEW, `got ${after?.admissionNumber}`);
    ok('studentId is unchanged, so payments still point at the student', after?.studentId === TEMP);
    const pays = await Payment.find({ studentId: TEMP }).lean();
    ok('both payments now carry the new admission number',
      pays.length === 2 && pays.every(p => p.admissionNumber === NEW), JSON.stringify(pays.map(p => p.admissionNumber)));
    ok('receipt numbers are untouched, so links already sent still open',
      pays.map(p => p.receiptNumber).sort().join() === [`XL-${TEMP}-OT`, `XL-${TEMP}-TF`].join());
    ok('balance is unchanged by a renumber', after?.remainingBalance === 45000, `got ${after?.remainingBalance}`);

    const byNew = await req('GET', `/api/accountant/students/${encodeURIComponent(NEW)}`, tokens.clerk);
    ok('the student is found by the new number', byNew.status === 200 && byNew.json?.data?.name === 'Zz Temp Student',
      `status ${byNew.status}`);

    const clash = await patch(tokens.clerk, { admissionNumber: `zz${TAG}-OTHER` });
    ok('a number already used by another student is refused (case-insensitive)', clash.status === 409,
      `status ${clash.status}: ${clash.raw.slice(0, 160)}`);
    ok('and the refusal names who holds it', /Zz Other Student/.test(clash.raw), clash.raw.slice(0, 160));

    const blank = await patch(tokens.clerk, { admissionNumber: '   ' });
    ok('a blank admission number is refused', blank.status === 400, `status ${blank.status}`);
    const long = await patch(tokens.clerk, { admissionNumber: 'x'.repeat(200) });
    ok('an over-long admission number is refused', long.status === 400, `status ${long.status}`);
    const op = await patch(tokens.clerk, { admissionNumber: { $ne: null } });
    ok('an object as the admission number is refused', op.status >= 400 && op.status < 500, `status ${op.status}`);
    ok('none of the refusals changed the stored number',
      (await Student.findOne({ studentId: TEMP }).lean())?.admissionNumber === NEW);

    const bare = await patch(tokens.bare, { admissionNumber: `39${TAG}` });
    ok('a clerk without editStudent cannot renumber', bare.status === 403, `status ${bare.status}`);

    // =================================================================
    section('Year');

    const year = await patch(tokens.clerk, { studentYear: 'First Year' });
    ok('a clerk can correct the year', year.status === 200, `status ${year.status}: ${year.raw.slice(0, 160)}`);
    ok('the year is stored', (await Student.findOne({ studentId: TEMP }).lean())?.studentYear === 'First Year');
    const badYear = await patch(tokens.clerk, { studentYear: 'Third Year' });
    ok('a year that does not exist is refused', badYear.status === 400, `status ${badYear.status}`);

    // =================================================================
    section('Campus');

    const clerkMove = await patch(tokens.clerk, { branch: OTHER });
    ok('a clerk cannot move a student to another campus', clerkMove.status === 403,
      `status ${clerkMove.status}: ${clerkMove.raw.slice(0, 160)}`);
    ok('the refused move left the campus alone', (await Student.findOne({ studentId: TEMP }).lean())?.branch === CAMPUS);

    const badCampus = await patch(tokens.rector, { branch: 'Nowhere C9' });
    ok('an unknown campus is refused', badCampus.status === 400, `status ${badCampus.status}`);

    const move = await patch(tokens.rector, { branch: OTHER });
    ok('the Rector can move a student to another campus', move.status === 200,
      `status ${move.status}: ${move.raw.slice(0, 160)}`);
    ok('the campus is stored', (await Student.findOne({ studentId: TEMP }).lean())?.branch === OTHER);
    const moved = await Payment.find({ studentId: TEMP }).lean();
    ok('the student\'s payments move with them, so campus totals follow',
      moved.length === 2 && moved.every(p => p.branch === OTHER), JSON.stringify(moved.map(p => p.branch)));

    await new Promise(r => setTimeout(r, 500));   // audit writes are fire-and-forget
    const audit = await db.collection('auditlogs').find({ action: 'student.update', entityId: TEMP }).toArray();
    ok('the audit log records the old and new filing',
      audit.some(a => /admissionNumber TB2-/.test(a.summary) && a.details?.after?.admissionNumber === NEW)
      && audit.some(a => a.details?.before?.branch === CAMPUS && a.details?.after?.branch === OTHER),
      JSON.stringify(audit.map(a => a.summary)).slice(0, 400));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`STUDENT RE-FILING: ${pass} passed, ${fail} failed`);
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
