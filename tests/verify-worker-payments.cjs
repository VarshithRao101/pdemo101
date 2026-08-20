/**
 * Phase 12 — worker payments.
 *
 * Wages for staff who are not on the teaching roll. Same shape as
 * expenditure, but with a field expenditure does not have: `paid`, a boolean
 * that decides whether somebody has actually been given their money.
 *
 * A boolean arriving from a form is where coercion bugs live. Boolean('false')
 * is true in JavaScript, so a field meaning "not yet paid" can record the
 * opposite of what was entered, and nothing about the record looks wrong
 * afterwards.
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
const WorkerPayment = require('../server/models/WorkerPayment.cjs');

const PORT = 4612;
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

const valid = (over = {}) => ({
  workerName: 'Ramesh', role: 'Gardener', amount: 8000,
  monthPeriod: 'August 2026', paid: true, ...over
});

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 12 — WORKER PAYMENTS  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await WorkerPayment.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All', staff: true },
    { key: 'clerk', role: 'clerk', campus: CAMPUS, staff: true },
    { key: 'bare', role: 'clerk', campus: CAMPUS, staff: false }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzwrk${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '990011',
        role: a.role, campus: a.campus, name: `Wrk ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: a.staff },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }
    const create = (token, body) => req('POST', '/api/admin2/worker-payments', token, body);

    // =================================================================
    section('Recording a wage');

    const made = await create(tokens.clerk, valid());
    ok('a valid worker payment is recorded', made.status === 201, `status ${made.status}: ${made.raw.slice(0, 160)}`);
    const wp = made.json?.data;
    ok("it is booked to the clerk's own campus", wp?.branch === CAMPUS, `branch ${wp?.branch}`);
    ok('the amount is stored as given', wp?.amount === 8000, `amount ${wp?.amount}`);
    ok('the entry is audited',
      !!await db.collection('auditlogs').findOne({ entityId: wp?.id }), 'no audit record');

    // =================================================================
    section('Paid, or not paid');

    const unpaid = await create(tokens.clerk, valid({ workerName: 'Unpaid One', paid: false }));
    ok('paid:false is recorded as unpaid', unpaid.json?.data?.paid === false,
      `stored ${unpaid.json?.data?.paid}`);

    // Boolean('false') is true. A form that posts the string rather than the
    // boolean would mark a worker as paid when the clerk said they were not,
    // and the record gives no hint that it happened.
    const strFalse = await create(tokens.clerk, valid({ workerName: 'String False', paid: 'false' }));
    ok('the string "false" does not become paid',
      strFalse.status >= 400 || strFalse.json?.data?.paid === false,
      `status ${strFalse.status}, stored paid=${strFalse.json?.data?.paid} — `
      + 'a worker recorded as paid who was not');

    const strNo = await create(tokens.clerk, valid({ workerName: 'String No', paid: 'no' }));
    ok('the string "no" does not become paid',
      strNo.status >= 400 || strNo.json?.data?.paid === false,
      `status ${strNo.status}, stored paid=${strNo.json?.data?.paid}`);

    // =================================================================
    section('What must be refused');

    const REJECT = [
      ['no worker name', valid({ workerName: '' })],
      ['no role', valid({ role: '' })],
      ['no month period', valid({ monthPeriod: '' })],
      ['no amount', valid({ amount: undefined })],
      ['a zero amount', valid({ amount: 0 })],
      ['a negative amount', valid({ amount: -100 })],
      ['an amount of NaN', valid({ amount: 'NaN' })],
      ['an amount of Infinity', valid({ amount: 'Infinity' })],
      ['an amount as an array', valid({ amount: [500] })],
      ['an amount as an object', valid({ amount: { $gt: 0 } })],
      ['an absurd amount', valid({ amount: 1e15 })],
      ['a campus that does not exist', valid({ branch: 'Nowhere C9' })],
      ['the campus "all"', valid({ branch: 'all' })],
      ['a 50,000 character worker name', valid({ workerName: 'x'.repeat(50000) })],
      ['a 50,000 character role', valid({ role: 'x'.repeat(50000) })]
    ];
    const before = await WorkerPayment.countDocuments();
    for (const [label, body] of REJECT) {
      const res = await create(tokens.clerk, body);
      ok(`${label} is refused`, res.status >= 400 && res.status < 500, `status ${res.status}`);
    }
    ok('none of the refused entries were written',
      await WorkerPayment.countDocuments() === before,
      `${before} -> ${await WorkerPayment.countDocuments()}`);

    const noPerm = await create(tokens.bare, valid());
    ok('a clerk without manageStaff cannot record one', noPerm.status === 403, `status ${noPerm.status}`);

    const foreign = await create(tokens.clerk, valid({ branch: OTHER }));
    ok('a clerk cannot book a wage to another campus', foreign.status === 403, `status ${foreign.status}`);
    ok('nothing landed at the other campus',
      await WorkerPayment.countDocuments({ branch: OTHER }) === 0);

    // =================================================================
    section('Editing and removing');

    const edit = await req('PATCH', `/api/admin2/worker-payments/${wp.id}`, tokens.clerk,
      { amount: 9000, paid: false });
    ok('a worker payment can be edited', edit.status < 300, `status ${edit.status}: ${edit.raw.slice(0, 140)}`);
    const edited = await WorkerPayment.findOne({ id: wp.id }).lean();
    ok('the amount edit persisted', edited?.amount === 9000, `amount ${edited?.amount}`);
    ok('the paid flag can be turned off', edited?.paid === false, `paid ${edited?.paid}`);
    ok('the edit is audited',
      !!await db.collection('auditlogs').findOne({ entityId: wp.id, action: /worker.*update|update.*worker/i }),
      'no audit record for the edit');

    const badEdit = await req('PATCH', `/api/admin2/worker-payments/${wp.id}`, tokens.clerk, { amount: -1 });
    ok('an edit to a negative amount is refused', badEdit.status === 400, `status ${badEdit.status}`);
    ok('the refused edit changed nothing',
      (await WorkerPayment.findOne({ id: wp.id }).lean())?.amount === 9000);

    const moveEdit = await req('PATCH', `/api/admin2/worker-payments/${wp.id}`, tokens.clerk,
      { branch: OTHER });
    const moved = await WorkerPayment.findOne({ id: wp.id }).lean();
    ok('an edit cannot move a wage to another campus', moved?.branch === CAMPUS,
      `status ${moveEdit.status}, branch is now ${moved?.branch}`);

    const bareEdit = await req('PATCH', `/api/admin2/worker-payments/${wp.id}`, tokens.bare, { amount: 1 });
    ok('a clerk without manageStaff cannot edit', bareEdit.status === 403, `status ${bareEdit.status}`);

    const bareDel = await req('DELETE', `/api/admin2/worker-payments/${wp.id}`, tokens.bare);
    ok('a clerk without manageStaff cannot delete', bareDel.status === 403, `status ${bareDel.status}`);
    ok('the refused delete left the row in place',
      await WorkerPayment.countDocuments({ id: wp.id }) === 1);

    const del = await req('DELETE', `/api/admin2/worker-payments/${wp.id}`, tokens.clerk);
    ok('a worker payment can be deleted', del.status < 300, `status ${del.status}`);
    ok('the row is gone', await WorkerPayment.countDocuments({ id: wp.id }) === 0);
    ok('the deletion is audited',
      !!await db.collection('auditlogs').findOne({ entityId: wp.id, action: /worker.*delete|delete.*worker/i }),
      'a deleted wage with no trail is unaccountable');

    const delMissing = await req('DELETE', '/api/admin2/worker-payments/WRK-nope', tokens.clerk);
    ok('deleting one that does not exist is a 404', delMissing.status === 404, `status ${delMissing.status}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 12 — WORKER PAYMENTS: ${pass} passed, ${fail} failed`);
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
