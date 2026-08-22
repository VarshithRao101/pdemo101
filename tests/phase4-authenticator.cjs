/**
 * PHASE 4 — THE SECURITY AUTHENTICATOR, and the day the database is wiped.
 *
 * The last phase, and the destructive one. It runs against everything phases
 * 1 to 3 built and then does the thing the college would only ever do on its
 * worst day:
 *
 *   confirm the data is there  ->  back it up  ->  WIPE  ->  check what
 *   survived  ->  restore  ->  confirm the data is back
 *
 * That is the operator's own handover plan, rehearsed before the handover
 * rather than during it.
 *
 * Two things it deliberately does NOT do:
 *
 *   - It does not touch Google Drive. The payload is built, encrypted,
 *     decrypted and restored locally, exactly as verify-restore.cjs does. The
 *     Drive hop is the college's live account and is left alone; everything on
 *     either side of it is exercised.
 *   - It does not reuse verify-restore's ground. That suite proves the
 *     encryption round trip. This one proves the AUTHENTICATOR'S JOURNEY: the
 *     guards in front of the destructive routes, what a wipe preserves, and
 *     that the account can still rotate its own credentials afterwards.
 *
 * Runs LAST. It empties jc_erp_phase on purpose and puts it back.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_phase';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_phase';

const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// The ops password guards wipe, purge and restore. Absent, those routes answer
// 503 and this phase could not test them at all — so it is set here, to a
// throwaway, before app.cjs reads it at require time.
const OPS_PASSWORD = `Ops-${crypto.randomBytes(9).toString('hex')}`;
process.env.OPS_PASSWORD_HASH = bcrypt.hashSync(OPS_PASSWORD, 10);

const app = require('../server/app.cjs');
const {
  buildBackupPayload, restoreFromPayload, encryptPayload, decryptPayload
} = require('../server/services/backupService.cjs');

const PORT = 4704;
const BASE = `http://127.0.0.1:${PORT}`;
const TAG1 = 'zzph1';
const TAG = 'zzph4';
const PIN = '778899';

let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); return true; }
  fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`);
  console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
  return false;
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
    res.on('end', () => resolve({
      status: res.statusCode, raw,
      json: (() => { try { return JSON.parse(raw); } catch { return null; } })()
    }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const withPin = () => ({ 'x-security-pin': PIN });

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 4 — THE AUTHENTICATOR (wipe and restore)   [jc_erp_phase]\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_phase', serverSelectionTimeoutMS: 20000 });
  if (mongoose.connection.name !== 'jc_erp_phase') throw new Error('wrong database');
  const db = mongoose.connection.db;
  try { await db.collection('ratelimits').deleteMany({}); } catch {}
  try { await db.collection('users').deleteMany({ username: new RegExp(`^${TAG}`) }); } catch {}

  const AUTH = { username: `${TAG}auth`, password: `Pw-${crypto.randomBytes(9).toString('hex')}` };
  let atok, rtok, rector;

  try {
    // =================================================================
    section('What the earlier phases left');

    // NOTE: `users` is counted again after the phase-4 account is seeded, a few
    // lines below. Counting it here would make the baseline one short and the
    // "accounts survive" check read 12 of 11.
    const before = {
      students: await db.collection('students').countDocuments({}),
      payments: await db.collection('payments').countDocuments({}),
      teachers: await db.collection('teachers').countDocuments({}),
      users: await db.collection('users').countDocuments({}),
      audit: await db.collection('auditlogs').countDocuments({})
    };
    console.log(`        students ${before.students} · payments ${before.payments} · teachers ${before.teachers} · users ${before.users} · audit ${before.audit}`);

    if (!ok('there is data from the earlier phases to protect', before.students > 0 && before.payments > 0,
      'run phases 1-3 first; this phase wipes and restores what they built')) {
      throw new Error('nothing to back up');
    }

    // =================================================================
    section('Signing in');

    await db.collection('users').insertOne({
      username: AUTH.username, password: AUTH.password, pin: PIN,
      role: 'authenticator', campus: 'All', name: 'Phase4 Authenticator',
      status: 'active', permissions: {}, activeSessionId: null,
      createdAt: new Date(), updatedAt: new Date()
    });
    const login = await req('POST', '/api/auth/login', null,
      { username: AUTH.username, password: AUTH.password, pin: PIN });
    atok = login.json?.token;
    ok('the authenticator signs in', !!atok, `status ${login.status}: ${login.raw.slice(0, 110)}`);
    if (!atok) throw new Error('cannot continue without a session');

    before.users = await db.collection('users').countDocuments({});

    // The student's money is recorded as it ACTUALLY stands, not as a constant.
    // Phase 3 hands random permissions to five clerks, so a varying number of
    // them hold collectFees and the total differs run to run. A hardcoded 12100
    // fails on most seeds and says nothing about the restore.
    const stuBefore = await db.collection('students').findOne({ admissionNumber: `${TAG1}S001` });
    const paidBefore = Number(stuBefore?.totalPaid || 0);

    rector = await db.collection('users').findOne({ role: 'admin1', username: new RegExp(`^${TAG1}`) });
    if (rector) {
      const rl = await req('POST', '/api/auth/login', null,
        { username: rector.username, password: rector.password, pin: rector.pin });
      rtok = rl.json?.token;
    }

    // =================================================================
    section('The portal it actually has now');

    for (const [label, path] of [
      ['dashboard stats', '/api/authenticator/stats'],
      ['sync journal', '/api/authenticator/sync-journal'],
      ['available backups', '/api/authenticator/available-backups'],
      ['backup tree', '/api/backup/tree']
    ]) {
      const r = await req('GET', path, atok, undefined, withPin());
      ok(`the ${label} loads`, r.status === 200, `status ${r.status}: ${r.raw.slice(0, 110)}`);
    }

    // =================================================================
    section('The guards in front of the destructive routes');

    // No password.
    const noPw = await req('POST', '/api/authenticator/wipe-database', atok, {}, withPin());
    ok('a wipe with no operations password is refused', noPw.status === 401, `status ${noPw.status}`);

    const wrongPw = await req('POST', '/api/authenticator/wipe-database', atok,
      { password: 'not-the-ops-password' }, withPin());
    ok('a wipe with the wrong operations password is refused', wrongPw.status === 401, `status ${wrongPw.status}`);

    const blankPw = await req('POST', '/api/authenticator/wipe-database', atok,
      { password: '   ' }, withPin());
    ok('a whitespace operations password is refused', blankPw.status === 401, `status ${blankPw.status}`);

    const purgeNoPw = await req('DELETE', '/api/authenticator/purge-student-faculty-data', atok, {}, withPin());
    ok('a purge with no operations password is refused', purgeNoPw.status === 401, `status ${purgeNoPw.status}`);

    const stillThere = await db.collection('students').countDocuments({});
    ok('none of the refused attempts destroyed anything',
      stillThere === before.students, `${stillThere} students remain of ${before.students}`);

    // A clerk must not reach any of this.
    const clerk = await db.collection('users').findOne({ role: 'clerk', username: new RegExp('^zzph3') });
    if (clerk) {
      const cl = await req('POST', '/api/auth/login', null,
        { username: clerk.username, password: clerk.password, pin: clerk.pin });
      const ctok = cl.json?.token;
      if (ctok) {
        const cw = await req('POST', '/api/authenticator/wipe-database', ctok,
          { password: OPS_PASSWORD }, { 'x-security-pin': clerk.pin });
        ok('a clerk cannot wipe the database even with the ops password',
          cw.status === 403, `status ${cw.status}`);
      }
    }

    // =================================================================
    section('Backing up before the wipe');

    const payload = await buildBackupPayload('phase4-rehearsal');
    ok('a backup payload is built', !!payload && typeof payload === 'object', 'no payload');

    const asText = JSON.stringify(payload);
    const sealed = encryptPayload(asText);
    ok('it encrypts', typeof sealed === 'string' && sealed.length > 0, 'nothing came back');
    ok('the encrypted form does not leak a student name in plain text',
      !sealed.includes('Phase One Student'),
      'a name is readable inside the ciphertext');

    // decryptPayload returns the PARSED OBJECT, not the string that went in -
    // it ends in JSON.parse(decrypted). Comparing it to the string silently
    // fails and reads as a corrupt backup, which is the wrong alarm entirely.
    const opened = decryptPayload(sealed);
    ok('it decrypts back to exactly what went in',
      JSON.stringify(opened) === asText,
      `${opened ? JSON.stringify(opened).length : 0} chars back, ${asText.length} in`);

    // =================================================================
    section('The wipe');

    const wiped = await req('POST', '/api/authenticator/wipe-database', atok,
      { password: OPS_PASSWORD }, withPin());
    ok('the wipe runs with the correct operations password', wiped.status < 300,
      `status ${wiped.status}: ${wiped.raw.slice(0, 150)}`);

    const after = {
      students: await db.collection('students').countDocuments({}),
      payments: await db.collection('payments').countDocuments({}),
      teachers: await db.collection('teachers').countDocuments({}),
      users: await db.collection('users').countDocuments({}),
      audit: await db.collection('auditlogs').countDocuments({})
    };

    ok('the students are gone', after.students === 0, `${after.students} remain`);
    ok('the payments are gone', after.payments === 0, `${after.payments} remain`);
    ok('the teachers are gone', after.teachers === 0, `${after.teachers} remain`);

    // The two that must NOT go. A wipe that took the accounts would lock the
    // college out of its own system; one that took the audit log would erase
    // the record of the wipe itself.
    ok('the ACCOUNTS survive the wipe', after.users === before.users,
      `${after.users} of ${before.users} — a wipe that removes accounts locks the college out`);
    ok('the AUDIT LOG survives the wipe', after.audit >= before.audit,
      `${after.audit} vs ${before.audit} — a wipe that erases the log erases the record of itself`);

    const wipeEntry = await db.collection('auditlogs')
      .findOne({ actorUsername: AUTH.username, action: /wipe/i });
    ok('the wipe itself is in the audit trail', !!wipeEntry,
      'the most destructive action in the system left no trace');

    // =================================================================
    section('The restore');

    const reopened = decryptPayload(sealed);
    const result = await restoreFromPayload(reopened, 'phase4-rehearsal');
    ok('the restore reports success', !!result, `${JSON.stringify(result || {}).slice(0, 120)}`);

    const back = {
      students: await db.collection('students').countDocuments({}),
      payments: await db.collection('payments').countDocuments({}),
      teachers: await db.collection('teachers').countDocuments({})
    };
    ok('every student comes back', back.students === before.students,
      `${back.students} of ${before.students}`);
    ok('every payment comes back', back.payments === before.payments,
      `${back.payments} of ${before.payments}`);
    ok('every teacher comes back', back.teachers === before.teachers,
      `${back.teachers} of ${before.teachers}`);

    // Not just the counts — the actual record, field for field.
    const stu = await db.collection('students').findOne({ admissionNumber: `${TAG1}S001` });
    ok('phase 1\'s student is back with its identity intact',
      stu && stu.branch === 'Beemaram C1' && stu.studentYear === 'Second Year',
      stu ? `branch ${stu.branch}, year ${stu.studentYear}` : 'missing entirely');
    ok('...and with its money exactly as it was before the wipe',
      stu && Number(stu.totalPaid) === paidBefore,
      `totalPaid ${stu && stu.totalPaid} after restore, ${paidBefore} before the wipe`);

    const receipts = await db.collection('payments')
      .find({ studentId: stu && stu.studentId, reversed: { $ne: true } }).toArray();
    const closed = (stu?.yearHistory || []).reduce((t, y) => t + Number(y.totalPaid || 0), 0);
    const sum = receipts.reduce((t, p) => t + Number(p.amount || 0), 0);
    ok('the ledger still reconciles after a full wipe and restore',
      Number(stu.totalPaid) + closed === sum,
      `current ${stu.totalPaid} + closed ${closed} vs receipts ${sum}`);

    // =================================================================
    section('The account nobody else can reach');

    if (rtok) {
      const authRow = await db.collection('users').findOne({ username: AUTH.username });
      const seize = await req('PUT', `/api/admin1/credentials/${authRow._id}`, rtok,
        { password: 'RectorTakesIt1' }, { 'x-security-pin': rector.pin });
      ok('the Rector still cannot change the authenticator', seize.status === 403,
        `status ${seize.status}`);
    }

    // But the authenticator can change its own, which is the only way it ever
    // gets rotated. Opening this door was the whole point of that change.
    const newPw = `Pw2-${crypto.randomBytes(9).toString('hex')}`;
    const rotate = await req('POST', '/api/account/password', atok,
      { currentPassword: AUTH.password, newPassword: newPw });
    ok('the authenticator can rotate its own password', rotate.status === 200,
      `status ${rotate.status}: ${rotate.raw.slice(0, 130)}`);

    const reLogin = await req('POST', '/api/auth/login', null,
      { username: AUTH.username, password: newPw, pin: PIN });
    ok('the new password signs in', !!reLogin.json?.token,
      `status ${reLogin.status}: ${reLogin.raw.slice(0, 110)}`);

    const oldLogin = await req('POST', '/api/auth/login', null,
      { username: AUTH.username, password: AUTH.password, pin: PIN });
    ok('the old password stops working', !oldLogin.json?.token, `status ${oldLogin.status}`);

    console.log('\n  The wipe-and-restore rehearsal completed. The database is as phases 1-3 left it.');

  } catch (err) {
    console.error('\nERROR', err.message);
    fail++;
  } finally {
    try { await mongoose.connection.collection('users').deleteMany({ username: new RegExp(`^${TAG}`) }); } catch {}
    console.log(`\n${'='.repeat(62)}`);
    console.log(`PHASE 4 — AUTHENTICATOR: ${pass} passed, ${fail} failed`);
    if (failures.length) {
      console.log('');
      for (const f of failures) console.log(`  ✗ ${f}`);
    }
    console.log('='.repeat(62));
    await mongoose.disconnect().catch(() => {});
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
