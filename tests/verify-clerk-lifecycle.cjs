/**
 * Phase 17 — clerk management, the parts the existing suites do not reach.
 *
 * verify-clerk-crud already covers creation, the fifteen-per-campus cap, the
 * PIN gate, permission toggles taking effect on a live session, and the audit
 * trail. verify-campus-login covers signing in by campus, including the
 * refusal when two clerks at one campus share a password. Neither is repeated
 * here.
 *
 * What is left is the lifecycle: what happens to somebody who is ALREADY
 * signed in when their account is changed underneath them, and whether a clerk
 * can reach the machinery that governs clerks. A permission system that can be
 * edited by the accounts it governs is decoration, and a revocation that only
 * applies at the next sign-in is a revocation that does not apply today.
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

const PORT = 4617;
const BASE = `http://127.0.0.1:${PORT}`;
const HOME = 'Beemaram C2';
const OTHER = 'Erragattugutta C1';
const PIN = '654321';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, path, token, body, extraHeaders = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders
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
  console.log('\nPHASE 17 — CLERK LIFECYCLE  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  const clearLimits = () => db.collection('ratelimits').deleteMany({ key: /^ratelimit_/ });

  const TAG = crypto.randomBytes(3).toString('hex');
  const RECTOR = { username: `zzlifeadmin${TAG}`, password: `Pw-${crypto.randomBytes(9).toString('hex')}` };
  let rector;

  try {
    await db.collection('users').insertOne({
      username: RECTOR.username, password: RECTOR.password, pin: PIN,
      role: 'admin1', campus: 'All', name: 'Life Rector', status: 'active',
      permissions: { addStudent: true, editStudent: true, editFees: true,
                     collectFees: true, logExpenditures: true, manageStaff: true },
      activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
    });
    const login = await req('POST', '/api/auth/login', null, RECTOR);
    if (!login.json?.token) throw new Error(`rector sign-in failed: ${login.raw.slice(0, 200)}`);
    rector = login.json.token;

    const pinHeader = { 'x-security-pin': PIN };
    const makeClerk = async (campus, over = {}) => {
      const n = ++seq;
      const body = {
        campus,
        name: `Life Clerk ${n}`,
        username: `zzlife${TAG}${n}`,
        password: `Cw-${crypto.randomBytes(8).toString('hex')}`,
        pin: String(100000 + n),
        mobile: `96${String(10000000 + n).slice(-8)}`,
        email: `c${n}@example.com`,
        permissions: { addStudent: true, editStudent: false, editFees: false,
                       collectFees: false, logExpenditures: false, manageStaff: false },
        ...over
      };
      const res = await req('POST', '/api/admin1/clerks', rector, body, pinHeader);
      if (res.status >= 300) throw new Error(`clerk create failed: ${res.raw.slice(0, 240)}`);
      // The create returns the whole campus list; find the one just made and
      // take the id the PATCH and DELETE routes address it by.
      const made = (res.json?.data?.clerks || []).find(c => c.username === body.username);
      const row = await db.collection('users').findOne({ username: body.username });
      return { ...body, id: (made && (made.id || made._id)) || String(row._id) };
    };
    const signIn = c => req('POST', '/api/auth/login', null,
      { username: c.username, password: c.password, pin: c.pin });

    // =================================================================
    section('A clerk cannot govern clerks');

    const c1 = await makeClerk(HOME);
    await clearLimits();
    const c1Login = await signIn(c1);
    ok('a newly created clerk can sign in', !!c1Login.json?.token,
      `status ${c1Login.status}: ${c1Login.raw.slice(0, 160)}`);
    const c1Token = c1Login.json.token;

    // The highest-value escalation in the system: an account that can edit the
    // permission table can grant itself everything.
    const selfList = await req('GET', '/api/admin1/clerks', c1Token, undefined, pinHeader);
    ok('a clerk cannot list clerks', selfList.status === 403, `status ${selfList.status}`);

    const selfGrant = await req('PATCH', `/api/admin1/clerks/${c1.id}`, c1Token,
      { permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: true } },
      pinHeader);
    ok('a clerk cannot grant itself powers', selfGrant.status === 403, `status ${selfGrant.status}`);
    const afterGrant = await db.collection('users').findOne({ username: c1.username });
    ok('its powers are unchanged', afterGrant.permissions.editFees === false,
      `editFees is now ${afterGrant.permissions.editFees}`);

    const selfMake = await req('POST', '/api/admin1/clerks', c1Token,
      { name: 'Sneaky', username: `zzsneak${TAG}`, password: 'Password1234',
        pin: '999999', mobile: '9600000001', campus: HOME, permissions: {} }, pinHeader);
    ok('a clerk cannot create another clerk', selfMake.status === 403, `status ${selfMake.status}`);

    const selfDelete = await req('DELETE', `/api/admin1/clerks/${c1.id}`, c1Token, undefined, pinHeader);
    ok('a clerk cannot delete a clerk', selfDelete.status === 403, `status ${selfDelete.status}`);

    // =================================================================
    section('Revoking access while they are signed in');

    const c2 = await makeClerk(HOME);
    await clearLimits();
    const c2Token = (await signIn(c2)).json.token;
    ok('the clerk has a working session',
      (await req('GET', '/api/auth/me', c2Token)).status === 200);

    const suspend = await req('PATCH', `/api/admin1/clerks/${c2.id}`, rector,
      { active: false }, pinHeader);
    ok('the Rector can suspend a clerk', suspend.status < 300,
      `status ${suspend.status}: ${suspend.raw.slice(0, 160)}`);

    // A suspension that only applies at the next sign-in does not apply today.
    const afterSuspend = await req('GET', '/api/auth/me', c2Token);
    ok('the live session stops working immediately', afterSuspend.status === 401,
      `status ${afterSuspend.status} — a suspended clerk kept working until they signed out`);

    await clearLimits();
    const reLogin = await signIn(c2);
    ok('a suspended clerk cannot sign in again', !reLogin.json?.token, `status ${reLogin.status}`);

    // =================================================================
    section('Changing a password while they are signed in');

    const c3 = await makeClerk(HOME);
    await clearLimits();
    const c3Token = (await signIn(c3)).json.token;
    const newPassword = `Nw-${crypto.randomBytes(8).toString('hex')}`;
    const change = await req('PATCH', `/api/admin1/clerks/${c3.id}`, rector,
      { password: newPassword }, pinHeader);
    ok('the Rector can change a password', change.status < 300,
      `status ${change.status}: ${change.raw.slice(0, 160)}`);

    await clearLimits();
    const oldPw = await signIn(c3);
    ok('the old password stops working', !oldPw.json?.token, `status ${oldPw.status}`);
    await clearLimits();
    const newPw = await signIn({ ...c3, password: newPassword });
    ok('the new password works', !!newPw.json?.token,
      `status ${newPw.status}: ${newPw.raw.slice(0, 160)}`);

    // Whichever way this behaves, it must be deliberate. A password changed
    // because it was compromised has not been changed at all if the session
    // opened with the old one keeps running.
    const oldSession = await req('GET', '/api/auth/me', c3Token);
    ok('the session opened with the old password is closed', oldSession.status === 401,
      `status ${oldSession.status} — the old credential still holds a live session`);

    // =================================================================
    section('Deleting while they are signed in');

    const c4 = await makeClerk(HOME);
    await clearLimits();
    const c4Token = (await signIn(c4)).json.token;
    ok('the clerk has a working session',
      (await req('GET', '/api/auth/me', c4Token)).status === 200);

    const removed = await req('DELETE', `/api/admin1/clerks/${c4.id}`, rector, undefined, pinHeader);
    ok('the Rector can remove a clerk', removed.status < 300, `status ${removed.status}`);
    ok('the account is gone',
      await db.collection('users').countDocuments({ username: c4.username }) === 0);
    const ghost = await req('GET', '/api/auth/me', c4Token);
    ok('the deleted clerk\'s session dies with the account', ghost.status === 401,
      `status ${ghost.status} — a deleted account was still answering requests`);

    // =================================================================
    section('Campuses are counted separately');

    const atOther = await makeClerk(OTHER);
    ok('a clerk can be created at another campus', !!atOther.id, 'create returned no id');
    const homeCount = await db.collection('users').countDocuments({ role: 'clerk', campus: HOME });
    const otherCount = await db.collection('users').countDocuments({ role: 'clerk', campus: OTHER });
    ok(`the two campuses hold their own clerks (${homeCount} and ${otherCount})`,
      homeCount >= 1 && otherCount === 1, `${homeCount} / ${otherCount}`);

    // The same password at two DIFFERENT campuses is fine: campus sign-in
    // resolves within one campus, so there is nothing to be ambiguous about.
    const shared = `Sh-${crypto.randomBytes(8).toString('hex')}`;
    await makeClerk(HOME, { password: shared });
    const otherShared = await makeClerk(OTHER, { password: shared });
    ok('the same password at two campuses is allowed', !!otherShared.id,
      'refused, though the campuses cannot collide');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 17 — CLERK LIFECYCLE: ${pass} passed, ${fail} failed`);
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
