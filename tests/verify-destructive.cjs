/**
 * Phase 20 — backup, restore and wipe.
 *
 * The routes that can end the college's records in one request. Everything
 * here is about what stands in FRONT of them, because there is no recovering
 * from a wipe that should not have happened.
 *
 * Two deliberate limits on this phase, both about not causing the disaster
 * being tested for:
 *
 *   - The wipe and restore routes upload to and read from the college's real
 *     Google Drive. Those are live external side effects, so the ROUTES are
 *     exercised only up to the point where they refuse. Every guard runs
 *     before the first Drive call, so refusals are fully covered; success
 *     paths are not driven through the route.
 *   - What a wipe actually removes is tested by calling wipeDataCollections
 *     directly against the scratch database. That is the property that
 *     matters — which collections go and which survive — and it needs no
 *     Drive and no production data.
 *
 * Scratch database, dropped at the end. jc_erp_prod is never the target.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_verify';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_verify';

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');
const { wipeDataCollections } = require('../server/services/backupService.cjs');
const Student = require('../server/models/Student.cjs');
const Payment = require('../server/models/Payment.cjs');

const PORT = 4620;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, p, token, body) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${p}`, {
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
  console.log('\nPHASE 20 — BACKUP, RESTORE AND WIPE  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') {
    throw new Error(`refusing to run destructive tests against ${mongoose.connection.name}`);
  }
  const db = mongoose.connection.db;
  console.log(`        connected to ${mongoose.connection.name}`);
  await Student.syncIndexes();
  await Payment.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'auth', role: 'authenticator', campus: 'All' },
    { key: 'admin1', role: 'admin1', campus: 'All' },
    { key: 'clerk', role: 'clerk', campus: CAMPUS }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzwipe${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '222324',
        role: a.role, campus: a.campus, name: `Wipe ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }

    // =================================================================
    section('Who may even ask');

    const DESTRUCTIVE = [
      ['POST', '/api/authenticator/wipe-database', ['auth']],
      ['DELETE', '/api/authenticator/purge-student-faculty-data', ['auth']],
      ['POST', '/api/backup/restore', ['auth', 'admin1']],
      ['POST', '/api/backup/restore/preview', ['auth', 'admin1']]
    ];
    for (const [method, path, allowed] of DESTRUCTIVE) {
      const anon = await req(method, path, null, {});
      ok(`${path} refuses a stranger`, anon.status === 401, `status ${anon.status}`);
      for (const a of ACCOUNTS) {
        if (allowed.includes(a.key)) continue;
        const res = await req(method, path, tokens[a.key], {});
        ok(`${path} refuses ${a.role}`, res.status === 403, `status ${res.status}`);
      }
    }

    // =================================================================
    section('The operations password');

    // Every guard below runs before the first Google Drive call, so these
    // requests refuse without touching the college's Drive or its data.
    const noPassword = await req('POST', '/api/authenticator/wipe-database', tokens.auth, {});
    ok('a wipe with no operations password is refused', noPassword.status === 401,
      `status ${noPassword.status}: ${noPassword.raw.slice(0, 140)}`);

    const wrongPassword = await req('POST', '/api/authenticator/wipe-database', tokens.auth,
      { password: 'definitely-not-the-ops-password' });
    ok('a wipe with the wrong operations password is refused', wrongPassword.status === 401,
      `status ${wrongPassword.status}`);

    const blankPassword = await req('POST', '/api/authenticator/wipe-database', tokens.auth,
      { password: '   ' });
    ok('a whitespace operations password is refused', blankPassword.status === 401,
      `status ${blankPassword.status}`);

    const objectPassword = await req('POST', '/api/authenticator/wipe-database', tokens.auth,
      { password: { $ne: null } });
    ok('a Mongo operator as the operations password is refused', objectPassword.status === 401,
      `status ${objectPassword.status}`);

    // Nothing was destroyed by any of that.
    const survivors = await db.collection('users').countDocuments();
    ok('none of the refused wipes removed anything', survivors === ACCOUNTS.length,
      `${survivors} accounts remain of ${ACCOUNTS.length}`);

    const purgeNoPassword = await req('DELETE', '/api/authenticator/purge-student-faculty-data',
      tokens.auth, {});
    ok('a purge with no operations password is refused', purgeNoPassword.status === 401,
      `status ${purgeNoPassword.status}`);

    const restoreNoPassword = await req('POST', '/api/backup/restore', tokens.auth, {});
    ok('a restore with no operations password is refused',
      restoreNoPassword.status === 401 || restoreNoPassword.status === 400,
      `status ${restoreNoPassword.status}`);

    // =================================================================
    section('What a wipe actually removes');

    // Called directly, against the scratch database. The question is which
    // collections go and which survive — a wipe that took the accounts with it
    // would lock the college out of its own system, and one that took the
    // audit log would erase the record of the wipe.
    const n = Date.now().toString().slice(-6);
    const created = await Student.create({
      studentId: `ZZW-${n}`, admissionNumber: `ZZW${n}`, name: 'Wipe Me',
      branch: CAMPUS, course: 'MPC', section: 'A', tuitionFee: 1000,
      remainingBalance: 1000, totalPaid: 0
    });
    await Payment.create({
      receiptNumber: `ZZWREC-${n}`, studentId: created.studentId,
      admissionNumber: created.admissionNumber, studentName: created.name,
      amount: 100, branch: CAMPUS, category: 'Tuition Fee',
      installment: 'Installment 1', paymentMode: 'Cash', cashier: 'zz-test', date: new Date()
    });
    await db.collection('auditlogs').insertOne({
      actorUsername: 'zz-before-wipe', action: 'zz.marker',
      summary: 'written before the wipe', outcome: 'success', createdAt: new Date()
    });

    const usersBefore = await db.collection('users').countDocuments();
    const logsBefore = await db.collection('auditlogs').countDocuments();
    ok('there is data to lose before the wipe',
      await Student.countDocuments() > 0 && await Payment.countDocuments() > 0);

    const result = await wipeDataCollections('zz-phase-20');
    ok('the wipe reports success', result?.success === true, JSON.stringify(result).slice(0, 160));

    ok('students are gone', await Student.countDocuments() === 0,
      `${await Student.countDocuments()} left`);
    ok('payments are gone', await Payment.countDocuments() === 0,
      `${await Payment.countDocuments()} left`);
    for (const c of ['teachers', 'expenditures', 'workerpayments', 'feesettings']) {
      ok(`${c} are gone`, await db.collection(c).countDocuments() === 0,
        `${await db.collection(c).countDocuments()} left`);
    }

    // The two that must survive.
    ok(`accounts survive the wipe (${await db.collection('users').countDocuments()}/${usersBefore})`,
      await db.collection('users').countDocuments() === usersBefore,
      'a wipe that removes the accounts locks the college out of its own system');
    ok(`the audit log survives the wipe (${await db.collection('auditlogs').countDocuments()}/${logsBefore})`,
      await db.collection('auditlogs').countDocuments() === logsBefore,
      'a wipe that erases the audit log erases the record of itself');
    ok('the entry written before the wipe is still readable',
      !!await db.collection('auditlogs').findOne({ actorUsername: 'zz-before-wipe' }),
      'history did not survive');

    // =================================================================
    section('Backups are campus scoped');

    // A campus-scoped account must not be able to back up or restore another
    // campus by naming it. Neither role that reaches these routes is scoped
    // today, so this asserts the resolver's behaviour rather than a live
    // exposure — it is the check that catches a scoped role being added later.
    const tree = await req('GET', '/api/backup/tree', tokens.clerk);
    ok('the backup tree is readable by a clerk (their own campus only)',
      tree.status === 200 || tree.status === 403, `status ${tree.status}`);
    if (tree.status === 200) {
      ok('it names no other campus',
        !JSON.stringify(tree.json?.data || {}).includes('Erragattugutta'),
        JSON.stringify(tree.json?.data || {}).slice(0, 200));
    }

    const foreignRun = await req('POST', '/api/backup/run', tokens.clerk,
      { campus: 'Erragattugutta C1' });
    ok('a clerk cannot trigger a backup at all', foreignRun.status === 403,
      `status ${foreignRun.status}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 20 — DESTRUCTIVE: ${pass} passed, ${fail} failed`);
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
