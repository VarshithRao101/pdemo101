/**
 * Phase 26 — the shared staff registry, removing a paid month, and the
 * faculty history log.
 *
 * Three things shipped together on 2026-09-01 and they are tested together
 * because they only make sense together:
 *
 *   1. STAFF ARE ONE REGISTRY across the four campuses, exactly as students
 *      are. Every staffed role reaches every staff member.
 *   2. A PAID MONTH CAN BE TAKEN BACK, and doing so costs the caller's own
 *      six-digit PIN. This is the only faculty action that asks for one.
 *   3. THE HISTORY LOG answers "who removed that, and when" — including for a
 *      staff member who has since been deleted, which is the case the ledger
 *      screen cannot show because there is no ledger left to open.
 *
 * The interesting assertions are the ones about what did NOT change. Widening
 * who may record a salary must not move which campus's payroll it lands in,
 * and it must not widen the expenditure books, which stay per-campus. Both are
 * checked here rather than assumed.
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
const WorkerPayment = require('../server/models/WorkerPayment.cjs');

const PORT = 4626;
const BASE = `http://127.0.0.1:${PORT}`;
const HOME = 'Beemaram C2';
const OTHER = 'Erragattugutta C1';
const PIN = '246813';
const WRONG_PIN = '999999';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
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
    res.on('end', () => resolve({ status: res.statusCode, raw, json: (() => { try { return JSON.parse(raw); } catch { return null; } })() }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

let seq = 0;

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 26 — SHARED STAFF REGISTRY, SALARY REMOVAL AND HISTORY  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Teacher.syncIndexes();
  await WorkerPayment.syncIndexes();

  // The PIN guard shares the login's five-guess budget, keyed by user id, and
  // this suite deliberately spends one wrong guess. Clearing the counters
  // first means a previous run cannot make a later assertion read 429 and
  // pass for the wrong reason — a refusal proves nothing unless you know why.
  await db.collection('loginattempts').deleteMany({});
  await db.collection('ratelimits').deleteMany({});

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All', staff: true },
    { key: 'clerk', role: 'clerk', campus: HOME, staff: true },
    { key: 'bare', role: 'clerk', campus: HOME, staff: false },
    { key: 'acct', role: 'accountant', campus: OTHER, staff: true }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzfh${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: PIN,
        role: a.role, campus: a.campus, name: `FacHist ${a.key}`, status: 'active',
        permissions: {
          addStudent: true, editStudent: true, editFees: true, collectFees: true,
          logExpenditures: true, manageStaff: a.staff, manageEnquiries: true
        },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}: ${login.raw.slice(0, 200)}`);
      tokens[a.key] = login.json.token;
    }

    const newTeacher = async (branch, salary = 40000) => {
      const n = ++seq;
      const id = `ZZFH${String(Date.now()).slice(-6)}${String(n).padStart(2, '0')}`;
      const res = await req('POST', '/api/admin1/teachers', tokens.admin1, {
        id, name: `History Test ${n} ${TAG}`, subject: 'Physics', branch,
        salary, mobile: `97${String(10000000 + n)}`, classification: 'Teaching'
      });
      if (res.status >= 300) throw new Error(`teacher create failed: ${res.raw.slice(0, 200)}`);
      return id;
    };
    const payMonth = (id, token, body) =>
      req('POST', `/api/admin1/teachers/${id}/salary-month`, token, body);
    const dropMonth = (id, token, body, pin) =>
      req('DELETE', `/api/admin1/teachers/${id}/salary-month`, token, body,
        pin ? { 'x-security-pin': pin } : {});
    const history = (token, query = '') =>
      req('GET', `/api/admin1/faculty-history${query}`, token);

    // =================================================================
    section('One registry across the four campuses');

    const homeStaff = await newTeacher(HOME);
    const farStaff = await newTeacher(OTHER);

    const clerkList = await req('GET', '/api/admin1/teachers', tokens.clerk);
    const clerkCampuses = [...new Set((clerkList.json?.data || []).map(t => t.branch))];
    ok('a clerk lists staff at every campus',
      clerkList.status === 200 && clerkCampuses.includes(HOME) && clerkCampuses.includes(OTHER),
      `status ${clerkList.status}, saw: ${clerkCampuses.join(', ')}`);

    // An accountant could not reach these routes at all before this change.
    const acctList = await req('GET', '/api/admin1/teachers', tokens.acct);
    ok('an accountant can now read the staff registry', acctList.status === 200,
      `status ${acctList.status}: ${acctList.raw.slice(0, 140)}`);
    const acctCampuses = [...new Set((acctList.json?.data || []).map(t => t.branch))];
    ok('an accountant sees every campus too',
      acctCampuses.includes(HOME) && acctCampuses.includes(OTHER),
      `saw: ${acctCampuses.join(', ')}`);

    const narrowed = await req('GET', `/api/admin1/teachers?branch=${encodeURIComponent(OTHER)}`, tokens.clerk);
    ok('the list can still be narrowed to one campus',
      narrowed.status === 200 && (narrowed.json?.data || []).every(t => t.branch === OTHER),
      `status ${narrowed.status}`);
    const badNarrow = await req('GET', '/api/admin1/teachers?branch=Nowhere', tokens.clerk);
    ok('a campus that does not exist is refused', badNarrow.status === 400, `status ${badNarrow.status}`);

    const crossEdit = await req('PATCH', `/api/admin1/teachers/${farStaff}`, tokens.clerk, { subject: 'Chemistry' });
    ok('a clerk may edit staff at another campus', crossEdit.status < 300,
      `status ${crossEdit.status}: ${crossEdit.raw.slice(0, 140)}`);

    // What did NOT change: expenditure is a per-campus book.
    const exp = await req('GET', '/api/admin2/expenditure', tokens.clerk);
    const expCampuses = [...new Set((exp.json?.data || []).map(e => e.branch))].filter(Boolean);
    ok('expenditure is still campus-scoped',
      expCampuses.every(c => c === HOME),
      `a clerk at ${HOME} saw: ${expCampuses.join(', ')}`);

    // =================================================================
    section('Recording, then taking one back');

    const recorded = await payMonth(farStaff, tokens.clerk,
      { academicYear: '2026-2027', month: 'July', amountPaid: 40000 });
    ok('a clerk records a month for another campus', recorded.status < 300,
      `status ${recorded.status}: ${recorded.raw.slice(0, 160)}`);

    let far = await Teacher.findOne({ id: farStaff }).lean();
    ok('the month is on the ledger', !!far?.salaryLedger?.['2026-2027']?.July);
    ok('it is still booked against the campus the staff member belongs to',
      far?.branch === OTHER, `booked at ${far?.branch}`);

    const disbursed = await WorkerPayment.find({ monthPeriod: 'July (2026-2027)', branch: OTHER }).lean();
    ok('a disbursement row was written', disbursed.length > 0, `${disbursed.length} row(s)`);

    // --- the PIN gate ---
    const noPin = await dropMonth(farStaff, tokens.clerk, { academicYear: '2026-2027', month: 'July' });
    ok('removing without a PIN is refused', noPin.status === 403, `status ${noPin.status}`);
    ok('and it says a PIN is what is missing',
      noPin.json?.requiresSecurityPin === true, JSON.stringify(noPin.json || {}).slice(0, 140));

    const wrongPin = await dropMonth(farStaff, tokens.clerk, { academicYear: '2026-2027', month: 'July' }, WRONG_PIN);
    ok('a wrong PIN is refused', wrongPin.status === 403, `status ${wrongPin.status}`);

    far = await Teacher.findOne({ id: farStaff }).lean();
    ok('a refused removal changes nothing', !!far?.salaryLedger?.['2026-2027']?.July,
      'the month disappeared despite the refusal');

    const noPerm = await dropMonth(farStaff, tokens.bare, { academicYear: '2026-2027', month: 'July' }, PIN);
    ok('a clerk without manageStaff cannot remove a month', noPerm.status === 403, `status ${noPerm.status}`);

    const unpaid = await dropMonth(farStaff, tokens.clerk, { academicYear: '2026-2027', month: 'December' }, PIN);
    ok('removing a month that was never paid is refused, not reported as done',
      unpaid.status === 400, `status ${unpaid.status}`);

    const badMonth = await dropMonth(farStaff, tokens.clerk, { academicYear: '2026-2027', month: 'Smarch' }, PIN);
    ok('a month that is not a month is refused', badMonth.status === 400, `status ${badMonth.status}`);
    const badYear = await dropMonth(farStaff, tokens.clerk, { academicYear: '2050-2051', month: 'July' }, PIN);
    ok('a year outside the supported range is refused', badYear.status === 400, `status ${badYear.status}`);

    // --- the real thing ---
    const removed = await dropMonth(farStaff, tokens.clerk,
      { academicYear: '2026-2027', month: 'July', reason: 'Entered against the wrong month' }, PIN);
    ok('the right PIN removes the month', removed.status === 200,
      `status ${removed.status}: ${removed.raw.slice(0, 160)}`);

    far = await Teacher.findOne({ id: farStaff }).lean();
    ok('the month is off the ledger', !far?.salaryLedger?.['2026-2027']?.July,
      `still there: ${JSON.stringify(far?.salaryLedger?.['2026-2027'] || {}).slice(0, 160)}`);
    ok('the legacy year-less map was cleared with it', !far?.monthlySalaries?.July,
      `still there: ${JSON.stringify(far?.monthlySalaries || {}).slice(0, 160)}`);

    // The ledger and the disbursement log must not disagree about how much the
    // college has paid out.
    const stillListed = await WorkerPayment.find({ monthPeriod: 'July (2026-2027)', branch: OTHER }).lean();
    ok('the disbursement row was withdrawn with it', stillListed.length === 0,
      `${stillListed.length} row(s) still visible`);

    // Removing it must not have removed anything else.
    const otherMonthsIntact = await payMonth(farStaff, tokens.clerk,
      { academicYear: '2026-2027', month: 'August', amountPaid: 40000 });
    ok('the ledger still accepts other months afterwards', otherMonthsIntact.status < 300,
      `status ${otherMonthsIntact.status}`);

    // =================================================================
    section('The history log');

    const added = await history(tokens.clerk, `?teacherId=${farStaff}&kind=added`);
    const addedActions = (added.json?.data || []).map(e => e.action);
    ok('Added lists the payments and the record being created',
      added.status === 200 && addedActions.includes('salary.pay') && addedActions.includes('teacher.create'),
      `status ${added.status}, actions: ${addedActions.join(', ')}`);
    ok('Added does not list removals',
      !addedActions.includes('salary.delete'), addedActions.join(', '));

    const deleted = await history(tokens.clerk, `?teacherId=${farStaff}&kind=deleted`);
    const delRows = deleted.json?.data || [];
    ok('Deleted lists the removal', delRows.some(e => e.action === 'salary.delete'),
      `actions: ${delRows.map(e => e.action).join(', ')}`);

    const removal = delRows.find(e => e.action === 'salary.delete');
    ok('it records WHO removed it', removal?.actorUsername === `zzfhclerk${TAG}`,
      `actor: ${removal?.actorUsername}`);
    ok('it records how much was removed', Number(removal?.amount) === 40000,
      `amount: ${removal?.amount}`);
    ok('it records which month and year', removal?.details?.month === 'July'
      && removal?.details?.academicYear === '2026-2027',
      JSON.stringify(removal?.details || {}).slice(0, 160));
    ok('it records the reason that was typed',
      String(removal?.details?.reason || '').includes('wrong month'),
      `reason: ${removal?.details?.reason}`);
    ok('it never carries the PIN that authorised it',
      !JSON.stringify(removal || {}).includes(PIN), 'the PIN is in the audit entry');

    const narrowedHistory = await history(tokens.clerk, `?teacherId=${homeStaff}`);
    ok('narrowing by staff member excludes everyone else',
      (narrowedHistory.json?.data || []).every(e => e.entityId === homeStaff),
      `ids: ${[...new Set((narrowedHistory.json?.data || []).map(e => e.entityId))].join(', ')}`);

    const badKind = await history(tokens.clerk, '?kind=sideways');
    ok('an unknown history kind is refused', badKind.status === 400, `status ${badKind.status}`);

    const acctHistory = await history(tokens.acct, `?teacherId=${farStaff}`);
    ok('an accountant can read the history too', acctHistory.status === 200,
      `status ${acctHistory.status}`);

    // The case the ledger screen cannot cover: the staff member is gone, so
    // there is no ledger left to open, and the log is the only record.
    const gone = await req('DELETE', `/api/admin1/teachers/${homeStaff}`, tokens.admin1);
    ok('a staff member can be deleted', gone.status < 300, `status ${gone.status}`);

    const afterDelete = await history(tokens.clerk, '?kind=deleted');
    const deletedNames = (afterDelete.json?.data || [])
      .filter(e => e.action === 'teacher.delete')
      .map(e => e.entityId);
    ok('a deleted staff member is still in the whole-faculty history',
      deletedNames.includes(homeStaff),
      `entity ids: ${deletedNames.join(', ')}`);

    const label = (afterDelete.json?.data || []).find(e => e.entityId === homeStaff);
    ok('their name survives in the log after the record is gone',
      String(label?.entityLabel || '').includes(homeStaff), `label: ${label?.entityLabel}`);

    console.log(`\n  ${pass} passed, ${fail} failed\n`);
  } catch (err) {
    console.error('ERROR', err);
    fail++;
    console.log(`\n  ${pass} passed, ${fail} failed\n`);
  } finally {
    try { await mongoose.connection.dropDatabase(); } catch { /* ignore */ }
    try { await mongoose.disconnect(); } catch { /* ignore */ }
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
