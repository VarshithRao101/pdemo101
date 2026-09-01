/**
 * Phase 14 — teachers.
 *
 * The staff register, and the record every salary payment hangs off. The
 * interesting questions are at the edges rather than in the middle: whether a
 * teacher can be moved between campuses by editing them, whether the same
 * person can be entered twice under different ids, and what happens to a
 * salary ledger when the teacher it belongs to is deleted.
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
const Teacher = require('../server/models/Teacher.cjs');
const { awaitAudit } = require('./lib/audit.cjs');

const PORT = 4614;
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
const teacherBody = (over = {}) => {
  const n = ++seq;
  return {
    id: `ZZTE${String(Date.now()).slice(-6)}${String(n).padStart(2, '0')}`,
    name: `Teacher ${n}`, subject: 'Physics', branch: CAMPUS,
    salary: 40000, mobile: `97${String(1000000000 + n).slice(-8)}`,
    email: `t${n}@example.com`, classification: 'Teaching', role: 'Senior Lecturer',
    ...over
  };
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 14 — TEACHERS  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Teacher.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All', staff: true },
    { key: 'clerk', role: 'clerk', campus: CAMPUS, staff: true },
    { key: 'bare', role: 'clerk', campus: CAMPUS, staff: false }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zztea${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '131415',
        role: a.role, campus: a.campus, name: `Tea ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: a.staff },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }
    const create = (token, body) => req('POST', '/api/admin1/teachers', token, body);

    // =================================================================
    section('Adding a teacher');

    const body = teacherBody();
    const made = await create(tokens.clerk, body);
    ok('a valid teacher is added', made.status < 300, `status ${made.status}: ${made.raw.slice(0, 160)}`);
    const t = await Teacher.findOne({ id: body.id }).lean();
    ok('the record is stored', !!t, 'not found after a successful create');
    ok('it is filed at the right campus', t?.branch === CAMPUS, `branch ${t?.branch}`);
    ok('the salary is stored', t?.salary === 40000, `salary ${t?.salary}`);
    ok('the entry is audited',
      !!await awaitAudit(db, { entityId: body.id }), 'no audit record');

    // Staff joined the SHARED REGISTRY on 2026-09-01, so the campus named on
    // the form is the campus the record is filed at — for a clerk too.
    //
    // This used to assert the opposite, and the old behaviour was worse than
    // merely restrictive: the campus was silently OVERWRITTEN with the
    // clerk's own, so a clerk who deliberately chose another campus got a
    // success and a record filed somewhere they did not choose. Whatever the
    // rule is, the answer must not disagree with the form.
    const elsewhere = teacherBody({ branch: OTHER });
    const elsewhereRes = await create(tokens.clerk, elsewhere);
    const elsewhereRow = await Teacher.findOne({ id: elsewhere.id }).lean();
    ok('a clerk may file staff at another campus',
      elsewhereRes.status < 300 && !!elsewhereRow,
      `status ${elsewhereRes.status}: ${elsewhereRes.raw.slice(0, 160)}`);
    ok('the campus named on the form is the campus used',
      elsewhereRow?.branch === OTHER,
      `asked for ${OTHER}, filed at ${elsewhereRow?.branch}`);

    // =================================================================
    section('Duplicates');

    const dupId = await create(tokens.clerk, teacherBody({ id: body.id }));
    ok('the same teacher id twice is refused', dupId.status >= 400, `status ${dupId.status}`);
    ok('only one row carries that id',
      await Teacher.countDocuments({ id: body.id }) === 1);

    const dupPerson = await create(tokens.clerk,
      teacherBody({ name: body.name, mobile: body.mobile }));
    ok('the same person under a new id is refused', dupPerson.status >= 400,
      `status ${dupPerson.status} — the same teacher would appear twice on the payroll`);

    // =================================================================
    section('What must be refused');

    const REJECT = [
      ['no id', teacherBody({ id: '' })],
      ['no name', teacherBody({ name: '' })],
      ['no subject', teacherBody({ subject: '' })],
      ['a campus that does not exist', teacherBody({ branch: 'Nowhere C9' })],
      ['the campus "all"', teacherBody({ branch: 'all' })],
      ['a negative salary', teacherBody({ salary: -1 })],
      ['a salary of NaN', teacherBody({ salary: 'NaN' })],
      ['a salary of Infinity', teacherBody({ salary: 'Infinity' })],
      ['a salary as an array', teacherBody({ salary: [40000] })],
      ['an absurd salary', teacherBody({ salary: 1e15 })],
      ['a 50,000 character name', teacherBody({ name: 'x'.repeat(50000) })],
      ['a 50,000 character subject', teacherBody({ subject: 'x'.repeat(50000) })]
    ];
    const before = await Teacher.countDocuments();
    for (const [label, b] of REJECT) {
      const res = await create(tokens.admin1, b);
      ok(`${label} is refused`, res.status >= 400 && res.status < 500, `status ${res.status}`);
    }
    ok('none of the refused teachers were written',
      await Teacher.countDocuments() === before,
      `${before} -> ${await Teacher.countDocuments()}`);

    const noPerm = await create(tokens.bare, teacherBody());
    ok('a clerk without manageStaff cannot add one', noPerm.status === 403, `status ${noPerm.status}`);

    // =================================================================
    section('Editing');

    const edit = await req('PATCH', `/api/admin1/teachers/${body.id}`, tokens.clerk,
      { subject: 'Chemistry', salary: 45000 });
    ok('a teacher can be edited', edit.status < 300, `status ${edit.status}: ${edit.raw.slice(0, 140)}`);
    const edited = await Teacher.findOne({ id: body.id }).lean();
    ok('the edit persisted', edited?.subject === 'Chemistry' && edited?.salary === 45000,
      `subject ${edited?.subject}, salary ${edited?.salary}`);

    // Blocking creation at another campus is worth nothing if an edit can
    // relocate the record afterwards.
    const move = await req('PATCH', `/api/admin1/teachers/${body.id}`, tokens.clerk,
      { branch: OTHER });
    const moved = await Teacher.findOne({ id: body.id }).lean();
    ok('a clerk cannot move a teacher to another campus', moved?.branch === CAMPUS,
      `status ${move.status}, now at ${moved?.branch}`);

    const badBranch = await req('PATCH', `/api/admin1/teachers/${body.id}`, tokens.admin1,
      { branch: 'Nowhere C9' });
    ok('an edit to a campus that does not exist is refused', badBranch.status === 400,
      `status ${badBranch.status}`);

    const bareEdit = await req('PATCH', `/api/admin1/teachers/${body.id}`, tokens.bare,
      { subject: 'Biology' });
    ok('a clerk without manageStaff cannot edit', bareEdit.status === 403, `status ${bareEdit.status}`);

    const editMissing = await req('PATCH', '/api/admin1/teachers/ZZ-nope', tokens.admin1,
      { subject: 'Biology' });
    ok('editing one that does not exist is a 404', editMissing.status === 404,
      `status ${editMissing.status}`);

    // =================================================================
    section('Deleting, and what goes with them');

    // A teacher with a salary history. Deleting the person removes the ledger
    // too, because it lives on the same document — so the money already paid
    // to them stops being visible anywhere. That is worth knowing about
    // explicitly rather than discovering at audit time.
    const withLedger = teacherBody();
    await create(tokens.admin1, withLedger);
    await req('POST', `/api/admin1/teachers/${withLedger.id}/salary-month`, tokens.admin1,
      { academicYear: '2026-2027', month: 'June', amountPaid: 40000 });
    const beforeDel = await Teacher.findOne({ id: withLedger.id }).lean();
    ok('the teacher has a salary history before deletion',
      !!beforeDel?.salaryLedger?.['2026-2027']?.June, 'no ledger to lose');

    const bareDel = await req('DELETE', `/api/admin1/teachers/${withLedger.id}`, tokens.bare);
    ok('a clerk without manageStaff cannot delete', bareDel.status === 403, `status ${bareDel.status}`);
    ok('the refused delete left the record in place',
      await Teacher.countDocuments({ id: withLedger.id }) === 1);

    const del = await req('DELETE', `/api/admin1/teachers/${withLedger.id}`, tokens.admin1);
    ok('a teacher can be deleted', del.status < 300, `status ${del.status}`);
    ok('the record is gone', await Teacher.countDocuments({ id: withLedger.id }) === 0);
    ok('the deletion is audited',
      !!await awaitAudit(db, { entityId: withLedger.id, action: /teacher\.delete/ }),
      'a deleted staff member with no trail is unaccountable');

    const delMissing = await req('DELETE', '/api/admin1/teachers/ZZ-nope', tokens.admin1);
    ok('deleting one that does not exist is a 404', delMissing.status === 404,
      `status ${delMissing.status}`);

    // =================================================================
    section('Reading');

    const list = await req('GET', '/api/admin1/teachers', tokens.clerk);
    ok('a clerk can list staff', list.status === 200, `status ${list.status}`);
    const rows = list.json?.data || [];

    // One registry: a clerk sees the other campus's staff too. The row filed
    // at OTHER a few sections above is the one that must come back.
    const foreign = rows.filter(x => x.branch && x.branch !== CAMPUS);
    ok('a clerk sees every campus\'s staff', foreign.length > 0,
      `only ${CAMPUS} came back, out of ${rows.length} row(s)`);

    // Narrowing still works, and still refuses a campus that does not exist —
    // a typo must not quietly widen the list back to all four.
    const narrowed = await req('GET', `/api/admin1/teachers?branch=${encodeURIComponent(OTHER)}`, tokens.clerk);
    const narrowedRows = narrowed.json?.data || [];
    ok('a clerk may narrow the list to one campus',
      narrowed.status === 200 && narrowedRows.length > 0 && narrowedRows.every(x => x.branch === OTHER),
      `status ${narrowed.status}, campuses: ${[...new Set(narrowedRows.map(x => x.branch))].join(', ')}`);

    const badCampus = await req('GET', '/api/admin1/teachers?branch=Nowhere', tokens.clerk);
    ok('an unknown campus is refused, not ignored', badCampus.status === 400,
      `status ${badCampus.status}`);

    const adminList = await req('GET', '/api/admin1/teachers', tokens.admin1);
    ok('the Rector sees every campus', (adminList.json?.data || []).length >= rows.length,
      `${(adminList.json?.data || []).length} vs ${rows.length}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 14 — TEACHERS: ${pass} passed, ${fail} failed`);
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
