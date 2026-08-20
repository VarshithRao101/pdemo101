/**
 * Phase 16 — dashboards, statistics and reports.
 *
 * A report that returns 200 has proved nothing. The only question worth asking
 * is whether the figure on the screen is the figure in the collection, so this
 * phase builds a dataset with totals known in advance and checks each reported
 * number against arithmetic done independently — never against another
 * endpoint, which would only prove two things agree about being wrong.
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
const Expenditure = require('../server/models/Expenditure.cjs');

const PORT = 4616;
const BASE = `http://127.0.0.1:${PORT}`;
const HOME = 'Beemaram C2';
const OTHER = 'Erragattugutta C1';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);
const r2 = n => Math.round(Number(n || 0) * 100) / 100;

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

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 16 — DASHBOARDS, STATISTICS AND REPORTS  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Student.syncIndexes();
  await Payment.syncIndexes();
  await Expenditure.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All' },
    { key: 'clerk', role: 'clerk', campus: HOME }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzrep${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '192021',
        role: a.role, campus: a.campus, name: `Rep ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }

    const newStudent = async (branch, fee) => {
      const n = ++seq;
      const res = await req('POST', '/api/accountant/students', tokens.admin1, {
        name: `Report Student ${n}`, admissionNumber: `ZZR${String(Date.now()).slice(-6)}${String(n).padStart(2, '0')}`,
        branch, course: 'MPC', section: 'A', studentYear: 'First Year',
        mobile: '9876543210', parentMobile: '9876543211',
        tuitionFee: fee, hostelFee: 0, transportFee: 0, miscellaneousFee: 0, previousPending: 0
      });
      if (!res.json?.data) throw new Error(`create failed: ${res.raw.slice(0, 200)}`);
      return res.json.data;
    };

    // =================================================================
    section('A dataset with known totals');

    // Three at HOME, two at OTHER. Every figure below is derived from these
    // numbers by hand, not from another endpoint.
    const plan = [
      { branch: HOME, fee: 30000, pay: 10000 },
      { branch: HOME, fee: 20000, pay: 20000 },
      { branch: HOME, fee: 50000, pay: 0 },
      { branch: OTHER, fee: 40000, pay: 15000 },
      { branch: OTHER, fee: 10000, pay: 10000 }
    ];
    for (const p of plan) {
      const s = await newStudent(p.branch, p.fee);
      if (p.pay > 0) {
        const res = await req('POST', `/api/accountant/students/${s.studentId}/payments`,
          tokens.admin1, { amount: p.pay });
        if (res.status >= 300) throw new Error(`payment failed: ${res.raw.slice(0, 160)}`);
      }
    }
    await req('POST', '/api/admin2/expenditure', tokens.admin1,
      { category: 'Maintenance', amount: 5000, branch: HOME });
    await req('POST', '/api/admin2/expenditure', tokens.admin1,
      { category: 'Maintenance', amount: 3000, branch: OTHER });

    // Truth, computed here from the plan.
    const expect = {
      studentsHome: 3, studentsOther: 2, studentsAll: 5,
      paidHome: 30000, paidOther: 25000, paidAll: 55000,
      pendingHome: (30000 - 10000) + 0 + 50000,     // 70000
      pendingOther: (40000 - 15000) + 0,            // 25000
      expenseHome: 5000, expenseOther: 3000
    };
    expect.pendingAll = expect.pendingHome + expect.pendingOther;

    // Cross-check the plan against the database before trusting it as truth.
    const dbPaid = r2((await Payment.find({}).lean()).reduce((a, p) => a + p.amount, 0));
    const dbPending = r2((await Student.find({}).lean()).reduce((a, s) => a + (s.remainingBalance || 0), 0));
    ok(`the seeded ledger matches the plan (paid ${dbPaid}/${expect.paidAll})`,
      dbPaid === expect.paidAll, `database says ${dbPaid}`);
    ok(`the seeded balances match the plan (pending ${dbPending}/${expect.pendingAll})`,
      dbPending === expect.pendingAll, `database says ${dbPending}`);

    // =================================================================
    section('The dashboard');

    const dashAll = await req('GET', '/api/accountant/dashboard-summary', tokens.admin1);
    ok('the Rector can read the dashboard', dashAll.status === 200, `status ${dashAll.status}`);
    const dAll = dashAll.json?.data || {};
    ok(`today's collection is every payment taken today (${dAll.collectionToday}/${expect.paidAll})`,
      r2(dAll.collectionToday) === expect.paidAll, `reported ${dAll.collectionToday}`);
    ok(`today's receipt count is right (${dAll.receiptsToday}/4)`,
      dAll.receiptsToday === 4, `reported ${dAll.receiptsToday}`);
    ok(`pending amount matches the balances (${dAll.pendingAmount}/${expect.pendingAll})`,
      r2(dAll.pendingAmount) === expect.pendingAll, `reported ${dAll.pendingAmount}`);

    // The dashboard is a "my campus" view, so a clerk's figures are their
    // campus's figures — deliberately narrower than the shared student list.
    const dashHome = await req('GET', '/api/accountant/dashboard-summary', tokens.clerk);
    const dHome = dashHome.json?.data || {};
    ok(`a clerk sees only their campus collection (${dHome.collectionToday}/${expect.paidHome})`,
      r2(dHome.collectionToday) === expect.paidHome, `reported ${dHome.collectionToday}`);
    ok(`a clerk sees only their campus pending (${dHome.pendingAmount}/${expect.pendingHome})`,
      r2(dHome.pendingAmount) === expect.pendingHome, `reported ${dHome.pendingAmount}`);

    // =================================================================
    section('Enrollment statistics');

    const statsAll = await req('GET', '/api/admin2/enrollment-stats', tokens.admin1);
    ok('enrollment stats load', statsAll.status === 200, `status ${statsAll.status}`);
    const rowsAll = statsAll.json?.data || [];
    const homeRow = rowsAll.find(r => r.branch === HOME) || {};
    const otherRow = rowsAll.find(r => r.branch === OTHER) || {};
    ok(`${HOME} student count is right (${homeRow.totalStudents}/${expect.studentsHome})`,
      homeRow.totalStudents === expect.studentsHome, `reported ${homeRow.totalStudents}`);
    ok(`${OTHER} student count is right (${otherRow.totalStudents}/${expect.studentsOther})`,
      otherRow.totalStudents === expect.studentsOther, `reported ${otherRow.totalStudents}`);
    ok(`every campus is listed (${rowsAll.length}/4)`, rowsAll.length === 4,
      `${rowsAll.length} rows`);
    ok('the campus counts add up to the whole',
      rowsAll.reduce((a, r) => a + (r.totalStudents || 0), 0) === expect.studentsAll,
      `${rowsAll.reduce((a, r) => a + (r.totalStudents || 0), 0)} vs ${expect.studentsAll}`);

    const statsHome = await req('GET', '/api/admin2/enrollment-stats', tokens.clerk);
    const rowsHome = statsHome.json?.data || [];
    ok('a clerk sees only their own campus in the stats',
      rowsHome.length === 1 && rowsHome[0].branch === HOME,
      `${rowsHome.length} rows: ${rowsHome.map(r => r.branch).join(', ')}`);

    // =================================================================
    section('Reports');

    const repAll = await req('GET', '/api/admin1/reports', tokens.admin1);
    ok('reports load', repAll.status === 200, `status ${repAll.status}`);
    const flat = JSON.stringify(repAll.json?.data || {});
    ok('the report carries the revenue figure', flat.includes(String(expect.paidAll)) ||
      flat.includes(String(expect.paidHome)), `report: ${flat.slice(0, 220)}`);

    const repHome = await req('GET', '/api/admin1/reports', tokens.clerk);
    ok('a clerk report holds no other campus',
      !JSON.stringify(repHome.json?.data || {}).includes(OTHER),
      `leaked ${OTHER}: ${JSON.stringify(repHome.json?.data || {}).slice(0, 220)}`);

    const analytics = await req('GET', '/api/admin1/analytics', tokens.admin1);
    ok('analytics load', analytics.status === 200, `status ${analytics.status}`);
    const anaHome = await req('GET', '/api/admin1/analytics', tokens.clerk);
    ok('a clerk analytics view holds no other campus',
      !JSON.stringify(anaHome.json?.data || {}).includes(OTHER),
      JSON.stringify(anaHome.json?.data || {}).slice(0, 220));

    // =================================================================
    section('Reports cannot be widened');

    const TRICKS = ['?branch=' + encodeURIComponent(OTHER), '?campus=' + encodeURIComponent(OTHER),
      '?branch=all', '?branch=ALL', '?campus=all'];
    const leaks = [];
    for (const path of ['/api/accountant/dashboard-summary', '/api/admin2/enrollment-stats',
                        '/api/admin1/reports', '/api/admin1/analytics']) {
      for (const qs of TRICKS) {
        const res = await req('GET', path + qs, tokens.clerk);
        if (res.status === 200 && JSON.stringify(res.json?.data || {}).includes(OTHER)) {
          leaks.push(`${path}${qs}`);
        }
      }
    }
    ok(`no report can be widened by a clerk (${4 * TRICKS.length} attempts)`,
      leaks.length === 0, leaks.join('\n        '));

    for (const path of ['/api/accountant/dashboard-summary', '/api/admin2/enrollment-stats',
                        '/api/admin1/reports', '/api/admin1/analytics']) {
      const res = await req('GET', path, null);
      ok(`${path} refuses an anonymous caller`, res.status === 401, `status ${res.status}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 16 — REPORTS: ${pass} passed, ${fail} failed`);
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
