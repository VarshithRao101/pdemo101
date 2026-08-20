/**
 * Phase 6 — student CRUD.
 *
 * The first phase that WRITES, so it runs against a scratch database
 * (jc_erp_verify) and drops it at the end. Nothing here touches jc_erp_prod.
 * A create-and-delete test against the live register would leave debris in the
 * college's records every time it half-failed, and the one thing worse than an
 * untested delete path is a tested one that deleted something real.
 *
 * autoIndex is off in db.cjs, so a fresh database starts with no unique
 * constraints at all. syncIndexes() is called first — otherwise the duplicate
 * admission number test would pass for the worst possible reason: the
 * constraint that should have refused it was never built.
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

const PORT = 4606;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';
const OTHER = 'Erragattugutta C1';

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
const admission = () => `ZZT${String(Date.now()).slice(-6)}${String(++seq).padStart(2, '0')}`;
const validStudent = (over = {}) => ({
  name: 'Test Student', admissionNumber: admission(), branch: CAMPUS,
  course: 'MPC', section: 'A', studentYear: 'First Year',
  mobile: '9876543210', parentMobile: '9876543211',
  tuitionFee: 50000, hostelFee: 0, transportFee: 0,
  miscellaneousFee: 0, previousPending: 0,
  ...over
});

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 6 — STUDENT CRUD  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') {
    throw new Error(`refusing to run against ${mongoose.connection.name}`);
  }
  const db = mongoose.connection.db;
  console.log(`        connected to ${mongoose.connection.name}`);

  // Build the constraints the schemas declare. Without this the fresh
  // database has none, and every uniqueness test would pass vacuously.
  await Student.syncIndexes();
  await Payment.syncIndexes();
  console.log('        indexes built from the schemas\n');

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All', perms: true },
    { key: 'clerk', role: 'clerk', campus: CAMPUS, perms: true },
    { key: 'bare', role: 'clerk', campus: CAMPUS, perms: false }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzcrud${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      const on = a.perms;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '445566',
        role: a.role, campus: a.campus, name: `CRUD ${a.key}`, status: 'active',
        permissions: { addStudent: on, editStudent: on, editFees: on,
                       collectFees: on, logExpenditures: on, manageStaff: on },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}: ${login.raw.slice(0, 200)}`);
      tokens[a.key] = login.json.token;
    }

    // =================================================================
    section('Creating');

    const created = await req('POST', '/api/accountant/students', tokens.clerk, validStudent());
    ok('a valid student is created', created.status < 300, `status ${created.status}: ${created.raw.slice(0, 160)}`);
    const student = created.json?.data;
    ok('the created student comes back', !!student?.studentId, created.raw.slice(0, 160));

    // The studentId used to be `STU-${Date.now().toString().slice(-6)}`, which
    // repeats every 16 minutes 40 seconds against a unique index. Nine of
    // eleven live students ended up with an id that matched nobody.
    ok('the studentId is derived from the admission number, not the clock',
      student && !/^STU-\d{6}$/.test(student.studentId),
      `got ${student && student.studentId}`);

    const dup = await req('POST', '/api/accountant/students', tokens.clerk,
      validStudent({ admissionNumber: student.admissionNumber }));
    ok('a duplicate admission number is refused', dup.status >= 400, `status ${dup.status}`);
    ok('the duplicate did not land in the database',
      await Student.countDocuments({ admissionNumber: student.admissionNumber }) === 1);

    // --- Rejections -------------------------------------------------
    const REJECT = [
      ['no name', validStudent({ name: '' })],
      ['no admission number', validStudent({ admissionNumber: '' })],
      ['a 50,000 character name', validStudent({ name: 'x'.repeat(50000) })],
      ['a 9 digit mobile', validStudent({ mobile: '987654321' })],
      ['a lettered mobile', validStudent({ mobile: '98765abcde' })],
      ['a 9 digit parent mobile', validStudent({ parentMobile: '987654321' })],
      ['a negative fee', validStudent({ tuitionFee: -1 })],
      ['a fee of NaN', validStudent({ tuitionFee: 'NaN' })],
      ['a fee of Infinity', validStudent({ tuitionFee: 'Infinity' })],
      ['an absurd fee', validStudent({ tuitionFee: 1e18 })],
      ['a campus that does not exist', validStudent({ branch: 'Nowhere C9' })],
      ['a Mongo operator as the admission number',
        validStudent({ admissionNumber: { $ne: null } })],
      ['an object as the name', validStudent({ name: { toString: 'x' } })],
      ['an array as the branch', validStudent({ branch: [CAMPUS, OTHER] })]
    ];
    const before = await Student.countDocuments();
    for (const [label, body] of REJECT) {
      const res = await req('POST', '/api/accountant/students', tokens.clerk, body);
      ok(`${label} is refused`, res.status >= 400 && res.status < 500,
        `status ${res.status}: ${res.raw.slice(0, 120)}`);
    }
    ok('none of the refused creates wrote a row',
      await Student.countDocuments() === before,
      `${before} -> ${await Student.countDocuments()}`);

    const noPerm = await req('POST', '/api/accountant/students', tokens.bare, validStudent());
    ok('a clerk without addStudent cannot create', noPerm.status === 403, `status ${noPerm.status}`);

    // The shared register is deliberate: a student standing at the wrong
    // counter should still get enrolled, so a clerk may register into any
    // campus. Asserted so that a later change to that rule is visible here.
    const cross = await req('POST', '/api/accountant/students', tokens.clerk,
      validStudent({ branch: OTHER }));
    ok('a clerk may register into another campus (shared register, by design)',
      cross.status < 300, `status ${cross.status}: ${cross.raw.slice(0, 140)}`);

    // =================================================================
    section('Reading');

    const byStudentId = await req('GET', `/api/accountant/students/${student.studentId}`, tokens.clerk);
    ok('a student can be read by studentId', byStudentId.status === 200 &&
      byStudentId.json?.data?.studentId === student.studentId, `status ${byStudentId.status}`);

    const byAdmission = await req('GET', `/api/accountant/students/${student.admissionNumber}`, tokens.clerk);
    ok('a student can be read by admission number', byAdmission.status === 200 &&
      byAdmission.json?.data?.admissionNumber === student.admissionNumber, `status ${byAdmission.status}`);

    const missing = await req('GET', '/api/accountant/students/ZZ-does-not-exist', tokens.clerk);
    ok('an unknown student is a 404, not a 500', missing.status === 404, `status ${missing.status}`);

    // =================================================================
    section('Updating');

    const edit = await req('PATCH', `/api/accountant/students/${student.studentId}/bio`,
      tokens.clerk, { name: 'Renamed Student', mobile: '9000000001' });
    ok('a bio edit is accepted', edit.status < 300, `status ${edit.status}: ${edit.raw.slice(0, 140)}`);
    const after = await Student.findOne({ studentId: student.studentId }).lean();
    ok('the edit actually persisted', after?.name === 'Renamed Student', `name is ${after?.name}`);

    const badEdit = await req('PATCH', `/api/accountant/students/${student.studentId}/bio`,
      tokens.clerk, { mobile: '12345' });
    ok('an invalid mobile is refused on edit', badEdit.status >= 400, `status ${badEdit.status}`);
    const stillGood = await Student.findOne({ studentId: student.studentId }).lean();
    ok('the refused edit changed nothing', stillGood?.mobile === '9000000001',
      `mobile is ${stillGood?.mobile}`);

    const bareEdit = await req('PATCH', `/api/accountant/students/${student.studentId}/bio`,
      tokens.bare, { name: 'Should Not Apply' });
    ok('a clerk without editStudent cannot edit', bareEdit.status === 403, `status ${bareEdit.status}`);

    // =================================================================
    section('Deleting');

    // A student with money against their name. Deleting one is the case that
    // matters: the payment must not be left pointing at nobody, because
    // Mongo will not stop it and the ledger would never balance again.
    const paid = (await req('POST', '/api/accountant/students', tokens.clerk, validStudent())).json.data;
    await Payment.create({
      receiptNumber: `ZZREC-${crypto.randomBytes(4).toString('hex')}`,
      studentId: paid.studentId, admissionNumber: paid.admissionNumber,
      studentName: paid.name, amount: 1000, branch: CAMPUS,
      category: 'Tuition Fee', installment: 'Installment 1',
      paymentMode: 'Cash', cashier: 'zz-test', date: new Date()
    });

    const bareDel = await req('DELETE', `/api/accountant/students/${paid.studentId}`, tokens.bare);
    ok('a clerk without editStudent cannot delete', bareDel.status === 403, `status ${bareDel.status}`);
    ok('the refused delete left the student in place',
      await Student.countDocuments({ studentId: paid.studentId }) === 1);

    const del = await req('DELETE', `/api/accountant/students/${paid.studentId}`, tokens.clerk);
    ok('a permitted delete succeeds', del.status < 300, `status ${del.status}: ${del.raw.slice(0, 140)}`);
    ok('the student is gone',
      await Student.countDocuments({ studentId: paid.studentId }) === 0);

    const strays = await Payment.countDocuments({ studentId: paid.studentId });
    ok('deleting a student leaves no payment pointing at nobody', strays === 0,
      `${strays} orphaned payment(s) — the ledger can never balance again`);

    const delMissing = await req('DELETE', '/api/accountant/students/ZZ-not-a-student', tokens.clerk);
    ok('deleting an unknown student is a 404, not a 500', delMissing.status === 404,
      `status ${delMissing.status}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 6 — STUDENT CRUD: ${pass} passed, ${fail} failed`);
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
