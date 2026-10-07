/**
 * The Fee Collection Desk, and the removal of the accountant role.
 *
 * Four things that changed together and are easy to break apart:
 *
 *   - the desk shows nothing until it is asked, and the server does the
 *     asking: search, course, year, section(s) and dues are all applied in the
 *     database, so the browser never downloads the registry to filter it;
 *   - the filter boxes learn what to offer from /student-facets, because there
 *     is no loaded list to read it off;
 *   - a student's base fees can be changed and new slots added through the
 *     ordinary student update, and the balance follows;
 *   - there is no accountant any more: a leftover account with that role is
 *     refused everywhere rather than quietly treated as something else.
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

const PORT = 4614;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C1';
const OTHER = 'Erragattugutta C2';
const TAG = `zzdesk${crypto.randomBytes(3).toString('hex')}`;

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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
    }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({
      status: res.statusCode, raw, headers: res.headers,
      json: (() => { try { return JSON.parse(raw); } catch { return null; } })()
    }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nFEE COLLECTION DESK  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify', serverSelectionTimeoutMS: 20000 });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  try { await db.collection('ratelimits').deleteMany({}); } catch {}

  const tokens = {};
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All' },
    { key: 'clerk', role: 'clerk', campus: CAMPUS },
    // A relic: the role that was removed. It must be refused, not tolerated.
    { key: 'relic', role: 'accountant', campus: CAMPUS }
  ];

  try {
    for (const a of ACCOUNTS) {
      a.username = `${TAG}${a.key}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '242526',
        role: a.role, campus: a.campus, name: `Desk ${a.key}`, status: 'active',
        permissions: {
          addStudent: true, editStudent: true, editFees: true, collectFees: true,
          logExpenditures: true, manageStaff: true, manageEnquiries: true
        },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null, { username: a.username, password: a.password });
      tokens[a.key] = login.json && login.json.token;
    }
    ok('the Rector and a clerk sign in', !!(tokens.admin1 && tokens.clerk));

    const mk = (n, name, extra) => ({
      studentId: `${TAG}${n}`, admissionNumber: `${TAG}${n}`, name, branch: CAMPUS, course: 'MPC',
      section: 'MPC-A', academicYear: '2026-27', studentYear: 'First Year', mobile: `90000000${n}`,
      tuitionFee: 40000, totalPaid: 0, remainingBalance: 40000, status: 'Active',
      createdAt: new Date(), updatedAt: new Date(), ...extra
    });
    await db.collection('students').insertMany([
      mk(11, 'Asha Reddy', { totalPaid: 10000, remainingBalance: 30000 }),
      mk(12, 'Ravi Kumar', { totalPaid: 40000, remainingBalance: 0 }),
      mk(13, 'Sita Rao', { section: 'MPC-B' }),
      mk(14, 'Kiran Goud', { course: 'BiPC', section: 'BiPC-A', studentYear: 'Second Year' }),
      mk(15, 'Far Campus Student', { branch: OTHER, section: 'MEC-A', course: 'MEC' })
    ]);

    // =================================================================
    section('The accountant role is gone');

    // The sign-in itself fails: the login saves the session onto the user
    // document, and the document no longer validates. Either way the relic ends
    // up with no token, which is the point.
    ok('a leftover accountant account cannot sign in', !tokens.relic, 'it received a token');
    ok('and a request carrying no session is refused the student list',
      (await req('GET', '/api/accountant/students', tokens.relic)).status === 401);
    // Belt and braces: even a token minted for the role would be refused by the
    // route, because requireRole no longer lists it.
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ id: 'x', username: 'relic', role: 'accountant', campus: CAMPUS, sessionId: 'x' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const refused = await req('GET', '/api/accountant/students', forged);
    ok('and a token carrying that role is never accepted', refused.status === 401 || refused.status === 403, `status ${refused.status}`);
    ok('the role cannot be created on the schema any more', await (async () => {
      const User = require('../server/models/User.cjs');
      try { await new User({ username: `${TAG}x`, password: 'x', role: 'accountant', campus: CAMPUS }).validate(); return false; }
      catch { return true; }
    })());

    // =================================================================
    section('The desk filters are applied by the server');

    const q = (query, token = tokens.clerk) =>
      req('GET', `/api/accountant/students?search=${TAG}&${query}`, token);
    const names = r => ((r.json && r.json.data) || []).map(s => s.name).sort();

    const all = await q('');
    ok('a search finds this run\'s students', all.status === 200 && names(all).length === 5, names(all).join(','));

    const secB = await q('sections=MPC-B');
    ok('one section narrows to its students', names(secB).join(',') === 'Sita Rao', names(secB).join(','));

    const twoSec = await q('sections=MPC-A,MPC-B');
    ok('several sections are an OR', names(twoSec).join(',') === 'Asha Reddy,Ravi Kumar,Sita Rao', names(twoSec).join(','));

    const course = await q('course=BiPC');
    ok('course narrows', names(course).join(',') === 'Kiran Goud', names(course).join(','));

    const year = await q('year=Second Year'.replace(' ', '%20'));
    ok('year narrows', names(year).join(',') === 'Kiran Goud', names(year).join(','));
    const first = await q('year=First%20Year');
    ok('a missing year counts as First Year', names(first).length === 4, names(first).join(','));

    const pending = await q('dues=pending');
    ok('pending keeps only students who owe', !names(pending).includes('Ravi Kumar') && names(pending).includes('Asha Reddy'), names(pending).join(','));
    const settled = await q('dues=settled');
    ok('settled keeps only paid-up students', names(settled).join(',') === 'Ravi Kumar', names(settled).join(','));

    const campus = await q(`branch=${encodeURIComponent(OTHER)}`);
    ok('campus narrows', names(campus).join(',') === 'Far Campus Student', names(campus).join(','));

    const paged = await req('GET', `/api/accountant/students?search=${TAG}&limit=2&page=2`, tokens.clerk);
    ok('paging is the server\'s, with the true total beside the page',
      (paged.json.data || []).length === 2 && paged.json.meta.total === 5, JSON.stringify(paged.json.meta));

    const injected = await req('GET', '/api/accountant/students?sections[$ne]=x', tokens.clerk);
    ok('an operator in a filter is refused, not run', injected.status === 400, `status ${injected.status}`);

    // =================================================================
    section('What the filter boxes offer');

    const facets = await req('GET', '/api/accountant/student-facets', tokens.clerk);
    ok('facets answer', facets.status === 200, `status ${facets.status}`);
    const f = (facets.json && facets.json.data) || {};
    ok('they list the courses', ['MPC', 'BiPC', 'MEC'].every(c => (f.courses || []).includes(c)), JSON.stringify(f.courses));
    ok('and the sections', ['MPC-A', 'MPC-B', 'BiPC-A'].every(c => (f.sections || []).includes(c)), JSON.stringify(f.sections));
    ok('a stranger gets none', (await req('GET', '/api/accountant/student-facets', null)).status === 401);

    // =================================================================
    section('Export by section');

    const csvOf = async (query, token = tokens.clerk) => (await req('GET', `/api/export/fee-register.csv?q=${TAG}&${query}`, token)).raw;
    const secCsv = await csvOf('sections=MPC-B');
    ok('the export honours the section selection', secCsv.includes('Sita Rao') && !secCsv.includes('Asha Reddy'), secCsv.slice(0, 200));
    const twoCsv = await csvOf('sections=MPC-A,MPC-B');
    ok('several sections export together', twoCsv.includes('Asha Reddy') && twoCsv.includes('Sita Rao') && !twoCsv.includes('Kiran'), twoCsv.slice(0, 240));

    // =================================================================
    section('Changing the base fee, and adding a slot');

    const before = await db.collection('students').findOne({ admissionNumber: `${TAG}11` });
    ok('the student starts at 40,000 with 10,000 paid', before.tuitionFee === 40000 && before.totalPaid === 10000);

    const raised = await req('PATCH', `/api/admin1/students/${TAG}11`, tokens.admin1, { tuitionFee: 70000 });
    ok('the Rector can raise the base fee', raised.status === 200, `status ${raised.status}: ${raised.raw.slice(0, 120)}`);
    const afterRaise = await db.collection('students').findOne({ admissionNumber: `${TAG}11` });
    ok('the balance follows (70,000 - 10,000 paid)', afterRaise.tuitionFee === 70000 && afterRaise.remainingBalance === 60000,
      `fee ${afterRaise.tuitionFee}, balance ${afterRaise.remainingBalance}`);

    const slotted = await req('PATCH', `/api/admin1/students/${TAG}11`, tokens.admin1, {
      customFeeSlots: [{ id: 'busFees', key: 'busFees', name: 'Bus Transport Fees', amount: 5000 }]
    });
    ok('a new fee slot can be added', slotted.status === 200, `status ${slotted.status}: ${slotted.raw.slice(0, 120)}`);
    const afterSlot = await db.collection('students').findOne({ admissionNumber: `${TAG}11` });
    ok('and it counts toward the balance (+5,000)', afterSlot.remainingBalance === 65000, `balance ${afterSlot.remainingBalance}`);

    const desk = await req('GET', `/api/accountant/students?search=${TAG}11`, tokens.clerk);
    ok('the desk shows the new balance everywhere it reads the student',
      desk.json.data[0].remainingBalance === 65000, String(desk.json.data[0] && desk.json.data[0].remainingBalance));

    const paid = await req('POST', `/api/accountant/students/${TAG}11/payments`, tokens.clerk,
      { amount: 65000, installment: 'Installment 1', mode: 'Cash', category: 'Tuition Fee', idempotencyKey: `${TAG}-pay` });
    ok('the raised fee can be collected in full', paid.status === 201 && paid.json.data.student.remainingBalance === 0,
      `status ${paid.status}: ${paid.raw.slice(0, 160)}`);

    // A clerk without editFees may not change what a student owes.
    await db.collection('users').updateOne({ username: `${TAG}clerk` }, { $set: { 'permissions.editFees': false } });
    const denied = await req('PATCH', `/api/accountant/students/${TAG}13`, tokens.clerk, { tuitionFee: 1 });
    ok('a clerk without the fee grant cannot change fees', denied.status === 403, `status ${denied.status}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`FEE COLLECTION DESK: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err.message);
    fail++;
  } finally {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
