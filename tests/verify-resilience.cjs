/**
 * Will it crash, and will the money still be right afterwards?
 *
 * Two questions, both answered against a real server and the real database:
 *
 *  1. CRASH CONTAINMENT — hostile and malformed input on every shape of route.
 *     The process must keep serving, and must never return a stack trace or an
 *     internal path to the caller.
 *
 *  2. CONCURRENCY INTEGRITY — the thing that actually loses money. Several
 *     tills collecting against ONE student at the same instant must not
 *     double-count, over-collect, or leave the balance disagreeing with the
 *     sum of its receipts. This is the failure that does not announce itself:
 *     nothing errors, the books are just quietly wrong afterwards.
 *
 * Everything created is removed at the end.
 */
// Scratch database. This suite CREATES A ROLE=ADMIN1 ACCOUNT and only removes
// it if it reaches its own cleanup - and on 2026-08-19 it did not, leaving a
// live Rector account in the production database for three days.
//
// It never needed production. It seeds everything it uses. The reason it went
// there anyway is subtle and worth writing down: MONGODB_URI carries
// /jc_erp_prod in its PATH, and mongoose.connect below passed no dbName, so
// the URI path won even when MONGODB_DB_NAME said otherwise. Setting the env
// var alone does not fix this; the dbName option has to be passed too, and the
// guard after it is what makes a regression fail loudly instead of quietly
// writing to the live database again.
process.env.MONGODB_DB_NAME = 'jc_erp_verify';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_verify';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let pass = 0, fail = 0;
const failures = [];
const ok = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${d ? '  — ' + d : ''}`); return; }
  fail++; failures.push(`${n}${d ? '  — ' + d : ''}`);
  console.log(`  FAIL  ${n}${d ? '  — ' + d : ''}`);
};

const CAMPUS = 'Beemaram C2';
const TAG = `zzres${crypto.randomBytes(3).toString('hex')}`;
let server, BASE, User, Student, Payment, AuditLog;

async function cleanup() {
  try { if (Payment) await Payment.deleteMany({ studentId: new RegExp(`^${TAG}`) }); } catch {}
  try { if (Student) await Student.deleteMany({ admissionNumber: new RegExp(`^${TAG}`) }); } catch {}
  try { if (User) await User.deleteMany({ username: new RegExp(`^${TAG}_`) }); } catch {}
  try { if (AuditLog) await AuditLog.deleteMany({ actorUsername: new RegExp(`^${TAG}_`) }); } catch {}
  try { await mongoose.connection.collection('refreshtokens').deleteMany({ username: new RegExp(`^${TAG}_`) }); } catch {}
  try { if (server) server.close(); } catch {}
  try { await mongoose.connection.close(); } catch {}
}

async function call(method, path, { token, pin, body, raw, contentType } = {}) {
  const headers = { 'Content-Type': contentType || 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (pin) headers['x-security-pin'] = pin;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method, headers,
      body: raw !== undefined ? raw : (body ? JSON.stringify(body) : undefined)
    });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  } catch (err) {
    return { status: 0, json: null, text: String(err.message), networkError: true };
  }
}

/** A response must never hand the caller an internal detail. */
function leaksInternals(text) {
  return /at \w+ \(|node_modules|\.cjs:\d+|\.js:\d+|MongoError|ValidationError:|CastError|TypeError:|ReferenceError|D:\\|\/home\/|Traceback/i.test(String(text || ''));
}

async function main() {
  process.env.PORT = process.env.PORT || '4621';
  const app = require('../server/app.cjs');
  await new Promise(r => { server = app.listen(process.env.PORT, r); });
  BASE = `http://127.0.0.1:${process.env.PORT}`;

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify', serverSelectionTimeoutMS: 20000 });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');

  // This suite deliberately hammers every route shape, which spends the rate
  // limiter's budget. Clear it first so a previous run does not turn crash
  // containment into a wall of 429s that proves nothing.
  try { await mongoose.connection.collection('ratelimits').deleteMany({}); } catch {}
  User = require('../server/models/User.cjs');
  Student = require('../server/models/Student.cjs');
  Payment = require('../server/models/Payment.cjs');
  AuditLog = require('../server/models/AuditLog.cjs');

  console.log('\n========================================================');
  console.log('RESILIENCE — crash containment & concurrency integrity');
  console.log('========================================================\n');

  const password = crypto.randomBytes(18).toString('base64url');
  const pin = String(crypto.randomInt(100000, 999999));
  await User.create({
    username: `${TAG}_rector`, name: 'Resilience', role: 'admin1', campus: 'All',
    password: bcrypt.hashSync(password, 10), pin: bcrypt.hashSync(pin, 10), status: 'active'
  });
  const login = await call('POST', '/api/auth/login', { body: { username: `${TAG}_rector`, password, pin } });
  const token = login.json?.token;
  ok('a session can be established', !!token, `HTTP ${login.status}`);
  if (!token) return;

  const memBefore = process.memoryUsage().heapUsed;

  console.log('\n1. Hostile and malformed input\n');

  const attacks = [
    ['malformed JSON', 'POST', '/api/auth/login', { raw: '{"username": broken' }],
    ['array where object expected', 'POST', '/api/auth/login', { raw: '[1,2,3]' }],
    ['null body', 'POST', '/api/enquiries', { raw: 'null' }],
    ['empty body', 'POST', '/api/enquiries', { raw: '' }],
    ['wrong content type', 'POST', '/api/enquiries', { raw: 'not json', contentType: 'text/plain' }],
    ['NoSQL operator injection', 'POST', '/api/auth/login', { body: { username: { $ne: null }, password: { $ne: null } } }],
    ['NoSQL injection via query', 'GET', '/api/accountant/students?branch[$ne]=x', { token }],
    ['bad ObjectId', 'GET', '/api/accountant/students/%00%01bad', { token }],
    ['path traversal in param', 'GET', '/api/accountant/students/..%2f..%2fetc%2fpasswd', { token }],
    ['50k character name', 'POST', '/api/admin1/students', { token, body: { name: 'x'.repeat(50000), admissionNumber: `${TAG}BIG`, branch: CAMPUS } }],
    ['deeply nested object', 'POST', '/api/enquiries', { body: { studentName: { a: { b: { c: { d: { e: 1 } } } } }, mobile: '9999999999', preferredCampus: CAMPUS } }],
    ['negative payment amount', 'POST', `/api/accountant/students/${TAG}001/payments`, { token, body: { amount: -50000, paymentMode: 'Cash' } }],
    ['NaN amount', 'POST', `/api/accountant/students/${TAG}001/payments`, { token, body: { amount: 'NaN', paymentMode: 'Cash' } }],
    ['Infinity amount', 'POST', `/api/accountant/students/${TAG}001/payments`, { token, body: { amount: 1e400, paymentMode: 'Cash' } }],
    ['unicode / emoji flood', 'POST', '/api/enquiries', { body: { studentName: '😀'.repeat(3000), mobile: '9999999999', preferredCampus: CAMPUS } }],
    ['unknown route', 'GET', '/api/does/not/exist', { token }],
    ['method not allowed', 'DELETE', '/api/auth/login', { token }]
  ];

  let leaked = 0, crashed = 0;
  for (const [label, method, path, opts] of attacks) {
    const r = await call(method, path, opts);
    if (r.networkError) { crashed++; ok(`survives: ${label}`, false, 'no response — process may have died'); continue; }
    const clean = !leaksInternals(r.text);
    if (!clean) leaked++;
    ok(`survives: ${label}`, r.status >= 200 && r.status < 600 && clean,
      `HTTP ${r.status}${clean ? '' : ' — LEAKED INTERNALS'}`);
  }

  const alive = await call('GET', '/api/health');
  ok('the process is still serving after every attack', alive.status === 200, `HTTP ${alive.status}`);
  ok('no response leaked a stack trace or internal path', leaked === 0, `${leaked} leaked`);

  console.log('\n2. Concurrent collection against one student\n');

  const created = await call('POST', '/api/accountant/students', {
    token,
    body: {
      name: 'Concurrency Probe', admissionNumber: `${TAG}001`, branch: CAMPUS,
      mobile: '9876543210', course: 'MPC', tuitionFee: 10000
    }
  });
  ok('a test student exists', created.status === 201, `HTTP ${created.status}`);

  // Ten tills, each trying to collect 2,000 against a 10,000 balance at the
  // same instant. Five should succeed and five should be refused; what must
  // NEVER happen is eleven succeeding, or the balance disagreeing with the
  // receipts that were actually written.
  const attempts = 10;
  const each = 2000;
  const results = await Promise.all(
    Array.from({ length: attempts }, () =>
      call('POST', `/api/accountant/students/${TAG}001/payments`, {
        token, body: { amount: each, paymentMode: 'Cash', category: 'Tuition Fee' }
      })
    )
  );
  const accepted = results.filter(r => r.status === 201);
  const refused = results.filter(r => r.status !== 201);

  const finalStudent = await Student.findOne({ admissionNumber: `${TAG}001` }).lean();
  const receipts = await Payment.find({ studentId: `${TAG}001` }).lean();
  const receiptSum = receipts.reduce((a, p) => a + Number(p.amount || 0), 0);

  console.log(`     ${attempts} simultaneous attempts of Rs.${each} against a Rs.10,000 balance`);
  console.log(`     accepted: ${accepted.length}, refused: ${refused.length}`);

  ok('no more was collected than was owed',
    receiptSum <= 10000, `receipts total Rs.${receiptSum}`);
  ok('the balance equals the fee minus what was actually receipted',
    Math.round(Number(finalStudent.remainingBalance)) === 10000 - receiptSum,
    `balance ${finalStudent.remainingBalance}, receipts ${receiptSum}`);
  ok('totalPaid agrees with the sum of the receipts',
    Math.round(Number(finalStudent.totalPaid)) === receiptSum,
    `totalPaid ${finalStudent.totalPaid}, receipts ${receiptSum}`);
  ok('every accepted attempt produced exactly one receipt',
    accepted.length === receipts.length, `${accepted.length} accepted, ${receipts.length} receipts`);
  ok('no receipt was written for a refused attempt',
    receipts.length === accepted.length);
  ok('every receipt number is unique',
    new Set(receipts.map(r => r.receiptNumber)).size === receipts.length);
  ok('the balance never went negative', Number(finalStudent.remainingBalance) >= 0,
    String(finalStudent.remainingBalance));

  console.log('\n3. Repeated load\n');

  // Two hundred reads in flight, to see whether anything degrades or leaks.
  const burst = await Promise.all(
    Array.from({ length: 200 }, () => call('GET', '/api/accountant/students', { token }))
  );
  const okReads = burst.filter(r => r.status === 200).length;
  ok('200 concurrent reads all succeed', okReads === 200, `${okReads}/200`);

  const stillAlive = await call('GET', '/api/health');
  ok('still serving after the burst', stillAlive.status === 200, `HTTP ${stillAlive.status}`);

  if (global.gc) global.gc();
  const memAfter = process.memoryUsage().heapUsed;
  const growthMb = (memAfter - memBefore) / 1024 / 1024;
  ok('heap growth stayed modest across the whole run', growthMb < 120,
    `${growthMb.toFixed(1)} MB`);

  console.log('\n========================================================');
  console.log(`${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log('  - ' + f));
  }
  console.log('========================================================\n');
}

main()
  .catch(err => { console.error('Suite crashed:', err); fail++; })
  .finally(async () => { await cleanup(); process.exit(fail > 0 ? 1 : 0); });
