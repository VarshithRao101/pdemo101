/**
 * The three CSV exports.
 *
 * These had no test at all. That matters more than the usual "untested code"
 * complaint, because a CSV export is the one output that leaves this system
 * and gets opened in someone else's program:
 *
 *   - A cell beginning =, +, - or @ is a FORMULA to Excel and Sheets. A student
 *     named "=cmd|' /c calc'!A1" runs on open. csvCell prefixes an apostrophe
 *     to force text, and nothing was checking that it still does.
 *   - Excel on Windows reads a plain UTF-8 file as mojibake, so the document
 *     carries a BOM and CRLF line endings. Both are easy to lose in a refactor
 *     and neither shows up until a Telugu name renders as question marks.
 *   - The exports are campus-scoped by the CALLER, not by a query parameter.
 *     A clerk downloading another campus's register is the whole reason
 *     studentScopeFilter exists.
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

const PORT = 4613;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C1';
const OTHER = 'Erragattugutta C2';
const TAG = `zzcsv${crypto.randomBytes(3).toString('hex')}`;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, path, token) => new Promise((resolve, reject) => {
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({ status: res.statusCode, raw, headers: res.headers }));
  });
  r.on('error', reject);
  r.end();
});

/** Split a CSV body into rows, honouring quoted cells that contain commas. */
const parseCsv = (body) => {
  const text = body.replace(/^﻿/, '');
  return text.trim().split('\r\n').map(line => {
    const cells = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return cells;
  });
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nCSV EXPORTS  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify', serverSelectionTimeoutMS: 20000 });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  try { await db.collection('ratelimits').deleteMany({}); } catch {}

  const tokens = {};
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All' },
    { key: 'clerk', role: 'clerk', campus: CAMPUS },
    { key: 'accountant', role: 'accountant', campus: CAMPUS }
  ];

  // A name that is a formula, and one with a comma and a quote in it.
  const EVIL_NAME = '=cmd|\' /c calc\'!A1';
  const COMMA_NAME = 'Rao, Priya "PJ"';

  try {
    for (const a of ACCOUNTS) {
      a.username = `${TAG}${a.key}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '242526',
        role: a.role, campus: a.campus, name: `CSV ${a.key}`, status: 'active',
        permissions: {
          addStudent: true, editStudent: true, editFees: true, collectFees: true,
          logExpenditures: true, manageStaff: true, manageEnquiries: true
        },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await new Promise((resolve, reject) => {
        const data = JSON.stringify({ username: a.username, password: a.password });
        const r = http.request(`${BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve(JSON.parse(raw || '{}'))); });
        r.on('error', reject); r.write(data); r.end();
      });
      if (!login.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.token;
    }

    await db.collection('students').insertMany([
      { studentId: `${TAG}1`, admissionNumber: `${TAG}1`, name: EVIL_NAME, branch: CAMPUS,
        course: 'MPC', section: 'A', academicYear: '2026-27', studentYear: '1st Year',
        mobile: '9000000001', tuitionFee: 40000, totalPaid: 10000, remainingBalance: 30000,
        status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { studentId: `${TAG}2`, admissionNumber: `${TAG}2`, name: COMMA_NAME, branch: CAMPUS,
        course: 'BiPC', section: 'B', academicYear: '2026-27', studentYear: '1st Year',
        mobile: '9000000002', tuitionFee: 50000, totalPaid: 50000, remainingBalance: 0,
        status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { studentId: `${TAG}3`, admissionNumber: `${TAG}3`, name: 'Other Campus Student', branch: OTHER,
        course: 'MEC', section: 'A', academicYear: '2026-27', studentYear: '1st Year',
        mobile: '9000000003', tuitionFee: 30000, totalPaid: 0, remainingBalance: 30000,
        status: 'active', createdAt: new Date(), updatedAt: new Date() }
    ]);

    await db.collection('payments').insertMany([
      { receiptNumber: `${TAG}-R1`, studentId: `${TAG}1`, admissionNumber: `${TAG}1`,
        studentName: EVIL_NAME, amount: 10000, category: 'Tuition', installment: 'I1',
        paymentMode: 'Cash', cashier: 'csv-test', branch: CAMPUS, date: new Date() },
      { receiptNumber: `${TAG}-R2`, studentId: `${TAG}3`, admissionNumber: `${TAG}3`,
        studentName: 'Other Campus Student', amount: 5000, category: 'Tuition', installment: 'I1',
        paymentMode: 'UPI', cashier: 'csv-test', branch: OTHER, date: new Date() }
    ]);

    await db.collection('expenditures').insertMany([
      { id: `${TAG}-E1`, category: 'Maintenance', amount: 2500, description: 'Fan, repair "urgent"',
        date: new Date(), branch: CAMPUS },
      { id: `${TAG}-E2`, category: 'Stationery', amount: 900, description: 'Registers',
        date: new Date(), branch: OTHER }
    ]);

    // =================================================================
    section('The document Excel actually receives');

    const students = await req('GET', '/api/export/students.csv', tokens.admin1);
    ok('the students export returns 200', students.status === 200, `status ${students.status}`);
    ok('it is served as a CSV attachment',
      /text\/csv/.test(students.headers['content-type'] || '')
      && /attachment; filename=/.test(students.headers['content-disposition'] || ''),
      `${students.headers['content-type']} / ${students.headers['content-disposition']}`);
    ok('it opens correctly in Excel (UTF-8 BOM)', students.raw.charCodeAt(0) === 0xFEFF,
      'no BOM: a non-ASCII name will render as mojibake');
    ok('rows are CRLF terminated', students.raw.includes('\r\n'), 'LF only');
    ok('it is never cached', /no-store/.test(students.headers['cache-control'] || ''),
      String(students.headers['cache-control']));

    // =================================================================
    section('A name that is a formula');

    const sRows = parseCsv(students.raw);
    const evilRow = sRows.find(r => r.some(c => c.includes('cmd')));
    ok('the formula-shaped name is exported at all', !!evilRow, 'row missing entirely');
    const evilCell = evilRow ? evilRow.find(c => c.includes('cmd')) : '';
    ok('it is neutralised so a spreadsheet cannot execute it',
      evilCell.startsWith("'"),
      `cell begins ${JSON.stringify(evilCell.slice(0, 12))} — Excel would evaluate this`);

    const commaRow = sRows.find(r => r.some(c => c.includes('Rao')));
    ok('a name containing a comma stays in one cell',
      !!commaRow && commaRow.some(c => c === COMMA_NAME),
      commaRow ? JSON.stringify(commaRow.slice(0, 3)) : 'row missing');
    ok('every row has the same column count as the header',
      sRows.every(r => r.length === sRows[0].length),
      `header ${sRows[0].length}, rows ${[...new Set(sRows.map(r => r.length))].join('/')}`);

    // =================================================================
    section('Scoped by the caller, not by a parameter');

    // WHICH export is scoped, and which is not, is a DESIGN DECISION - see
    // tests/verify-shared-registry.cjs. Students are one registry shared by all
    // four campuses, so anyone at a counter can serve anyone. The boundary that
    // remains is MONEY: payments and expenditures stay pinned to a campus.
    //
    // Asserted in BOTH directions on purpose. A reader who sees another campus
    // in a student export will read it as a leak and "fix" it, which breaks the
    // counter; and a payments export that quietly went shared would corrupt
    // per-campus revenue with nothing to catch it.

    const clerkStudents = await req('GET', '/api/export/students.csv', tokens.clerk);
    ok('a clerk may export', clerkStudents.status === 200, `status ${clerkStudents.status}`);
    ok('a clerk sees the WHOLE student registry, by design',
      clerkStudents.raw.includes('Other Campus Student'),
      'the shared registry stopped being shared - see verify-shared-registry.cjs');

    const clerkPayments = await req('GET', '/api/export/payments.csv', tokens.clerk);
    // Money is the boundary. This is the assertion that matters most here.
    ok('a clerk gets ONLY its own campus payments',
      clerkPayments.status === 200
      && clerkPayments.raw.includes(`${TAG}-R1`)
      && !clerkPayments.raw.includes(`${TAG}-R2`),
      `status ${clerkPayments.status}; own=${clerkPayments.raw.includes(`${TAG}-R1`)}, `
      + `other campus=${clerkPayments.raw.includes(`${TAG}-R2`)}`);

    const acctStudents = await req('GET', '/api/export/students.csv', tokens.accountant);
    ok('an accountant may export students', acctStudents.status === 200, `status ${acctStudents.status}`);
    ok('an accountant sees the whole student registry too',
      acctStudents.raw.includes('Other Campus Student'),
      'the shared registry stopped being shared');

    const acctPayments = await req('GET', '/api/export/payments.csv', tokens.accountant);
    ok('an accountant may export payments', acctPayments.status === 200, `status ${acctPayments.status}`);

    // Expenditures are admin1 and clerk only — an accountant is refused. This is
    // asserted rather than assumed, because the UI is about to offer CSV in the
    // accountant portal and must not offer a button that 403s.
    const acctExp = await req('GET', '/api/export/expenditures.csv', tokens.accountant);
    ok('an accountant is refused the expenditure export',
      acctExp.status === 403, `status ${acctExp.status}`);

    const anon = await req('GET', '/api/export/students.csv', null);
    ok('a stranger is refused', anon.status === 401, `status ${anon.status}`);

    // =================================================================
    section('The other two documents');

    const payments = await req('GET', '/api/export/payments.csv', tokens.admin1);
    const pRows = parseCsv(payments.raw);
    ok('the payments export returns rows', payments.status === 200 && pRows.length > 1,
      `status ${payments.status}, ${pRows.length} lines`);
    ok('a payment amount is present', payments.raw.includes('10000'), 'amount missing');

    const exp = await req('GET', '/api/export/expenditures.csv', tokens.admin1);
    const eRows = parseCsv(exp.raw);
    ok('the expenditures export returns rows', exp.status === 200 && eRows.length > 1,
      `status ${exp.status}, ${eRows.length} lines`);
    ok('a description with a comma and quotes survives intact',
      eRows.some(r => r.includes('Fan, repair "urgent"')),
      'the quoted description did not round-trip');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`CSV EXPORTS: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err.message);
    fail++;
  } finally {
    try {
      await db.collection('students').deleteMany({ admissionNumber: new RegExp(`^${TAG}`) });
      await db.collection('payments').deleteMany({ receiptNumber: new RegExp(`^${TAG}`) });
      await db.collection('expenditures').deleteMany({ id: new RegExp(`^${TAG}`) });
      await db.collection('users').deleteMany({ username: new RegExp(`^${TAG}`) });
    } catch {}
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
