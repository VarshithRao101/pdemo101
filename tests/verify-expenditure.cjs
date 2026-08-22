/**
 * Phase 11 — expenditure.
 *
 * Money leaving the college, which gets less scrutiny than money arriving and
 * therefore deserves more. Three things matter: only the right people may
 * record it, it is booked to the right campus, and every entry is traceable
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
const Expenditure = require('../server/models/Expenditure.cjs');
const { awaitAudit } = require('./lib/audit.cjs');

const PORT = 4611;
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

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 11 — EXPENDITURE  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Expenditure.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All', log: true },
    { key: 'clerk', role: 'clerk', campus: CAMPUS, log: true },
    { key: 'bare', role: 'clerk', campus: CAMPUS, log: false }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzexp${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '889900',
        role: a.role, campus: a.campus, name: `Exp ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: a.log, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }
    const create = (token, body) => req('POST', '/api/admin2/expenditure', token, body);

    // =================================================================
    section('Recording a spend');

    const made = await create(tokens.clerk,
      { category: 'Maintenance', amount: 2500, description: 'Fan repair' });
    ok('a valid expenditure is recorded', made.status === 201, `status ${made.status}: ${made.raw.slice(0, 160)}`);
    const exp = made.json?.data;
    ok('it is booked to the clerk\'s own campus', exp?.branch === CAMPUS, `branch ${exp?.branch}`);
    ok('the amount is stored as given', exp?.amount === 2500, `amount ${exp?.amount}`);

    const logged = await awaitAudit(db, { entityId: exp?.id, action: 'expenditure.create' });
    ok('the entry is written to the audit trail', !!logged, 'no audit record');

    // =================================================================
    section('What must be refused');

    const REJECT = [
      ['no category', { amount: 100 }],
      ['no amount', { category: 'Maintenance' }],
      ['a zero amount', { category: 'Maintenance', amount: 0 }],
      ['a negative amount', { category: 'Maintenance', amount: -50 }],
      ['an amount of NaN', { category: 'Maintenance', amount: 'NaN' }],
      ['an amount of Infinity', { category: 'Maintenance', amount: 'Infinity' }],
      ['an amount as an array', { category: 'Maintenance', amount: [100] }],
      ['an amount as an object', { category: 'Maintenance', amount: { $gt: 0 } }]
    ];
    const before = await Expenditure.countDocuments();
    for (const [label, body] of REJECT) {
      const res = await create(tokens.clerk, body);
      ok(`${label} is refused`, res.status >= 400 && res.status < 500, `status ${res.status}`);
    }
    ok('none of the refused entries were written',
      await Expenditure.countDocuments() === before,
      `${before} -> ${await Expenditure.countDocuments()}`);

    const noPerm = await create(tokens.bare, { category: 'Maintenance', amount: 100 });
    ok('a clerk without logExpenditures cannot record one', noPerm.status === 403, `status ${noPerm.status}`);

    const foreign = await create(tokens.clerk,
      { category: 'Maintenance', amount: 100, branch: OTHER });
    ok('a clerk cannot book a spend to another campus', foreign.status === 403, `status ${foreign.status}`);

    // An unknown campus must be refused, not quietly booked somewhere.
    // Silently substituting a default puts real money against a campus that
    // never spent it, and nothing in the response says so.
    const bogus = await create(tokens.admin1,
      { category: 'Maintenance', amount: 777, branch: 'Nowhere C9' });
    const strays = await Expenditure.find({ amount: 777 }).lean();
    ok('a campus that does not exist is refused, not substituted',
      bogus.status === 400 && strays.length === 0,
      `status ${bogus.status}, ${strays.length} row(s) booked to ${strays.map(x => x.branch).join(', ')}`);

    // =================================================================
    section('Identifiers under load');

    // Twelve at once. The id was the millisecond clock truncated to six
    // digits, which is the same collision the student id had: two entries in
    // the same millisecond produce the same id, and the unique index turns
    // that into a 500 and a lost record rather than a duplicate.
    const burst = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      create(tokens.clerk, { category: 'Bulk', amount: 10 + i, description: `zz-burst-${i}` })));
    const okCount = burst.filter(r => r.status === 201).length;
    const serverErrors = burst.filter(r => r.status >= 500).length;
    const rows = await Expenditure.find({ category: 'Bulk' }).lean();
    const ids = new Set(rows.map(r => r.id));

    ok(`twelve simultaneous entries all succeed (${okCount}/12, ${serverErrors} server errors)`,
      okCount === 12 && serverErrors === 0, `${okCount} created, ${serverErrors} failed with 5xx`);
    ok(`each has its own identifier (${ids.size}/${rows.length})`,
      ids.size === rows.length, `${rows.length - ids.size} collision(s)`);

    // =================================================================
    section('Editing and removing');

    const edit = await req('PATCH', `/api/admin2/expenditure/${exp.id}`, tokens.clerk,
      { amount: 3000, description: 'Fan repair, revised' });
    ok('an expenditure can be edited', edit.status < 300, `status ${edit.status}: ${edit.raw.slice(0, 140)}`);
    const edited = await Expenditure.findOne({ id: exp.id }).lean();
    ok('the edit persisted', edited?.amount === 3000, `amount ${edited?.amount}`);
    ok('the edit is audited',
      !!await awaitAudit(db, { entityId: exp.id, action: /expenditure\.(update|edit)/ }),
      'no audit record for the edit');

    const badEdit = await req('PATCH', `/api/admin2/expenditure/${exp.id}`, tokens.clerk, { amount: -5 });
    ok('an edit to a negative amount is refused', badEdit.status === 400, `status ${badEdit.status}`);
    ok('the refused edit changed nothing',
      (await Expenditure.findOne({ id: exp.id }).lean())?.amount === 3000);

    const bareEdit = await req('PATCH', `/api/admin2/expenditure/${exp.id}`, tokens.bare, { amount: 1 });
    ok('a clerk without logExpenditures cannot edit', bareEdit.status === 403, `status ${bareEdit.status}`);

    const bareDel = await req('DELETE', `/api/admin2/expenditure/${exp.id}`, tokens.bare);
    ok('a clerk without logExpenditures cannot delete', bareDel.status === 403, `status ${bareDel.status}`);
    ok('the refused delete left the row in place',
      await Expenditure.countDocuments({ id: exp.id }) === 1);

    const del = await req('DELETE', `/api/admin2/expenditure/${exp.id}`, tokens.clerk);
    ok('an expenditure can be deleted', del.status < 300, `status ${del.status}`);
    ok('the row is gone', await Expenditure.countDocuments({ id: exp.id }) === 0);
    ok('the deletion is audited',
      !!await awaitAudit(db, { entityId: exp.id, action: /expenditure\.delete/ }),
      'a deleted spend with no trail is unaccountable');

    const delMissing = await req('DELETE', '/api/admin2/expenditure/EXP-nope', tokens.clerk);
    ok('deleting one that does not exist is a 404', delMissing.status === 404, `status ${delMissing.status}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 11 — EXPENDITURE: ${pass} passed, ${fail} failed`);
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
