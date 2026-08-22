/**
 * Phase 18 — credentials and the PIN gate.
 *
 * The Rector holds credential control over every portal, which is deliberate.
 * The question is what stands between that power and the one account it must
 * not reach — the authenticator, which audits everyone else — and whether the
 * second factor guarding it is real.
 *
 * The PIN gate covers six routes: the four clerk-management ones and the two
 * credential ones. That surface is deliberately small; per-action PIN prompts
 * on every financial route were replaced with plain confirmations at the
 * college's request. This phase tests the gate where it IS, and does not
 * campaign for it where it is not.
 *
 * Scratch database, dropped at the end.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_verify';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_verify';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');
const { awaitAudit } = require('./lib/audit.cjs');

const PORT = 4618;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';
const RECTOR_PIN = '314159';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, p, token, body, headers = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${p}`, {
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
  console.log('\nPHASE 18 — CREDENTIALS AND THE PIN GATE  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const clearLimits = () => db.collection('ratelimits').deleteMany({ key: /^ratelimit_/ });
  const clearPinLock = id => db.collection('loginattempts').deleteMany({ key: `pin:${id}` });

  const TAG = crypto.randomBytes(3).toString('hex');
  const RECTOR = { username: `zzcredadmin${TAG}`, password: `Pw-${crypto.randomBytes(9).toString('hex')}` };
  const CLERK = { username: `zzcredclerk${TAG}`, password: `Cw-${crypto.randomBytes(9).toString('hex')}`, pin: '271828' };
  // The security authenticator, deliberately NOT named the fixed username, so
  // that a protection keyed on that literal would fail to recognise it.
  const AUTHR = { username: `zzcredauth${TAG}`, password: `Aw-${crypto.randomBytes(9).toString('hex')}`, pin: '161803' };

  let rector, clerkToken, rectorId;
  try {
    for (const [acct, role, campus, pin] of [
      [RECTOR, 'admin1', 'All', RECTOR_PIN],
      [CLERK, 'clerk', CAMPUS, CLERK.pin],
      [AUTHR, 'authenticator', 'All', AUTHR.pin]
    ]) {
      await users.insertOne({
        username: acct.username, password: acct.password, pin,
        role, campus, name: `Cred ${role}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
    }
    const rLogin = await req('POST', '/api/auth/login', null, RECTOR);
    if (!rLogin.json?.token) throw new Error(`rector sign-in failed: ${rLogin.raw.slice(0, 200)}`);
    rector = rLogin.json.token;
    rectorId = (await users.findOne({ username: RECTOR.username }))._id.toString();

    const cLogin = await req('POST', '/api/auth/login', null,
      { username: CLERK.username, password: CLERK.password, pin: CLERK.pin });
    clerkToken = cLogin.json?.token;

    const withPin = pin => ({ 'x-security-pin': pin });
    const readCreds = (token, pin) =>
      req('POST', '/api/admin1/credentials', token, {}, pin ? withPin(pin) : {});

    // =================================================================
    section('The PIN gate');

    const noPin = await readCreds(rector, null);
    ok('no PIN is refused', noPin.status === 403, `status ${noPin.status}`);
    ok('the refusal asks for one', noPin.json?.requiresSecurityPin === true,
      'the screen has no way to know it should prompt');

    await clearPinLock(rectorId);
    const wrongPin = await readCreds(rector, '000000');
    ok('a wrong PIN is refused', wrongPin.status === 403 || wrongPin.status === 429,
      `status ${wrongPin.status}`);

    // Somebody else's valid PIN must not open the Rector's gate.
    await clearPinLock(rectorId);
    const othersPin = await readCreds(rector, CLERK.pin);
    ok("another account's PIN does not open it", othersPin.status === 403 || othersPin.status === 429,
      `status ${othersPin.status}`);

    await clearPinLock(rectorId);
    const right = await readCreds(rector, RECTOR_PIN);
    ok('the correct PIN opens it', right.status === 200, `status ${right.status}: ${right.raw.slice(0, 140)}`);
    ok('the credential list is never cached',
      /no-store/.test(String(right.headers['cache-control'] || '')),
      `cache-control: ${right.headers['cache-control']}`);

    const clerkRead = await readCreds(clerkToken, CLERK.pin);
    ok('a clerk cannot read credentials at all', clerkRead.status === 403, `status ${clerkRead.status}`);

    // --- The PIN has its own lockout --------------------------------
    await clearPinLock(rectorId);
    let pinLockedAt = null;
    for (let i = 1; i <= 8; i++) {
      const res = await readCreds(rector, '111111');
      if (res.status === 429 && res.json?.locked === true) { pinLockedAt = i; break; }
    }
    ok('guessing the PIN runs out of attempts', pinLockedAt !== null, 'never locked');
    ok(`it locks within 6 tries (locked at ${pinLockedAt})`, pinLockedAt !== null && pinLockedAt <= 6);

    const rightWhileLocked = await readCreds(rector, RECTOR_PIN);
    ok('the correct PIN is refused while locked',
      rightWhileLocked.status === 429,
      `status ${rightWhileLocked.status} — a lock that only stops wrong guesses stops nothing`);
    await clearPinLock(rectorId);

    // =================================================================
    section('Changing a credential');

    const target = await users.findOne({ username: CLERK.username });
    const newPassword = `Nw-${crypto.randomBytes(9).toString('hex')}`;
    const change = await req('PUT', `/api/admin1/credentials/${target._id}`, rector,
      { password: newPassword }, withPin(RECTOR_PIN));
    ok('the Rector can change a portal password', change.status < 300,
      `status ${change.status}: ${change.raw.slice(0, 160)}`);

    await clearLimits();
    const oldPw = await req('POST', '/api/auth/login', null,
      { username: CLERK.username, password: CLERK.password, pin: CLERK.pin });
    ok('the old password stops working', !oldPw.json?.token, `status ${oldPw.status}`);
    await clearLimits();
    const newPw = await req('POST', '/api/auth/login', null,
      { username: CLERK.username, password: newPassword, pin: CLERK.pin });
    ok('the new password works', !!newPw.json?.token,
      `status ${newPw.status}: ${newPw.raw.slice(0, 160)}`);

    const blank = await req('PUT', `/api/admin1/credentials/${target._id}`, rector,
      { username: '   ' }, withPin(RECTOR_PIN));
    ok('a blank portal ID is refused', blank.status === 400, `status ${blank.status}`);

    const taken = await req('PUT', `/api/admin1/credentials/${target._id}`, rector,
      { username: RECTOR.username }, withPin(RECTOR_PIN));
    ok('a portal ID already in use is refused', taken.status >= 400, `status ${taken.status}`);

    // Sign the clerk in again first. Its password was changed two assertions
    // ago, which killed the old session — and a 401 from a dead token says
    // nothing at all about whether a clerk is authorized here.
    await clearLimits();
    const freshClerk = (await req('POST', '/api/auth/login', null,
      { username: CLERK.username, password: newPassword, pin: CLERK.pin })).json?.token;
    const noAuth = await req('PUT', `/api/admin1/credentials/${target._id}`, freshClerk,
      { password: 'Whatever12345' }, withPin(CLERK.pin));
    ok('a clerk cannot change anyone\'s credentials', noAuth.status === 403, `status ${noAuth.status}`);

    // =================================================================
    section('The account that audits everyone else');

    // The rule, stated once: the Rector may set every portal's credentials
    // EXCEPT the authenticator's, because that is the account which audits the
    // Rector. The authenticator rotates its own, from its own portal, proving
    // identity with its current password.
    //
    // All four doors are checked here. Three must stay shut and one must be
    // open, and it is the combination that matters: shutting the fourth as well
    // leaves an account nobody can rotate, which is how this started.
    const auth = await users.findOne({ username: AUTHR.username });

    // Door 1 - the Rector, via the credentials screen. SHUT.
    const seize = await req('PUT', `/api/admin1/credentials/${auth._id}`, rector,
      { password: 'RectorTakesOver1' }, withPin(RECTOR_PIN));
    const authAfter = await users.findOne({ username: AUTHR.username });
    ok('the Rector cannot change an authenticator credential',
      seize.status === 403 && authAfter.password === AUTHR.password,
      `status ${seize.status}, password ${authAfter.password === AUTHR.password ? 'unchanged' : 'CHANGED'} - `
      + 'the Rector could take the account that audits them');

    const denied = await awaitAudit(db, { outcome: 'denied', entityId: AUTHR.username });
    ok('the refusal is recorded in the audit trail', !!denied, 'an attempted seizure left no trace');

    // Door 2 - the password-reset panel. SHUT.
    const resetAuth = await req('POST', '/api/authenticator/reset-password', rector,
      { username: AUTHR.username, password: 'ResetTakesOverCompletely1' }, withPin(RECTOR_PIN));
    ok('the password-reset panel refuses the authenticator',
      resetAuth.status === 403, `status ${resetAuth.status}`);

    // Door 3 - the authenticator accounts route. SHUT for the fixed account.
    const viaAccounts = await req('PUT', `/api/authenticator/accounts/${auth._id}`, rector,
      { username: AUTHR.username, password: 'AccountsTakesOver1' }, withPin(RECTOR_PIN));
    const afterAccounts = await users.findOne({ username: AUTHR.username });
    ok('the accounts route does not change the authenticator password',
      afterAccounts.password === AUTHR.password,
      `status ${viaAccounts.status}, password CHANGED`);

    // Door 4 - the authenticator changing its OWN credentials. OPEN.
    const authToken = (await req('POST', '/api/auth/login', null,
      { username: AUTHR.username, password: AUTHR.password, pin: AUTHR.pin })).json?.token;
    ok('the authenticator can sign in', !!authToken, 'no token');

    const selfChange = await req('POST', '/api/account/password', authToken,
      { currentPassword: AUTHR.password, newPassword: 'AuthRotatesItself1' });
    const afterSelf = await users.findOne({ username: AUTHR.username });
    ok('the authenticator can rotate its own password',
      selfChange.status === 200 && afterSelf.password === 'AuthRotatesItself1',
      `status ${selfChange.status}: ${String(selfChange.raw).slice(0, 120)}`);

    // And the current password is still required, so an unattended open session
    // is not enough to lock the real holder out.
    const noCurrent = await req('POST', '/api/account/password', authToken,
      { currentPassword: 'not-the-password', newPassword: 'ShouldNotApply1' });
    ok('rotating without the current password is refused',
      noCurrent.status !== 200, `status ${noCurrent.status}`);

    // =================================================================
    section('Nothing is written down in the repository');

    // The standing rule for this project: the repository is public, so no
    // credential is ever a literal in it. Credentials live in MongoDB only.
    const scanDirs = ['server', 'src', 'scripts', 'tests'];
    const offenders = [];
    const CRED_LITERAL = /(password|passwd|pwd|pin|secret|apikey|api_key|token)\s*[:=]\s*['"`]([^'"`\s]{8,})['"`]/gi;
    const ALLOWED = /^(process\.env|<|\$\{|\.\.\.|[A-Z_]+$)/;
    const walk = dir => {
      for (const entry of fs.readdirSync(path.join(__dirname, '..', dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) { walk(rel); continue; }
        if (!/\.(cjs|js|ts|tsx|json)$/.test(entry.name)) continue;
        const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
        for (const m of src.matchAll(CRED_LITERAL)) {
          const value = m[2];
          // Test fixtures generate their own and name them plainly; a literal
          // that is obviously a placeholder is not a leaked credential.
          if (ALLOWED.test(value)) continue;
          if (/^(zz|test|example|placeholder|changeme|your|xxx|\*+)/i.test(value)) continue;
          // A row of mask glyphs is what the screen prints INSTEAD of a
          // credential. Matching it was the scanner reporting the ABSENCE of a
          // password as the presence of one — `account.password : '••••••••'`
          // on the credentials screen.
          if (/^[•·*.∙●\s-]+$/.test(value)) continue;
          if (/^(true|false|null|undefined|string|number|boolean)$/i.test(value)) continue;
          if (rel.startsWith('tests/')) continue;
          offenders.push(`${rel}: ${m[1]} = ${'*'.repeat(Math.min(value.length, 12))}`);
        }
      }
    };
    scanDirs.forEach(walk);
    ok('no credential literal is committed to the repository', offenders.length === 0,
      offenders.slice(0, 10).join('\n        '));

    // =================================================================
    section('Both credential formats still work');

    // Existing accounts hold bcrypt hashes; new ones are stored as plaintext
    // by the college's decision. A hash cannot be reversed, so both have to
    // authenticate or the older accounts are locked out.
    const bcrypt = require('bcryptjs');
    const legacyPw = `Lg-${crypto.randomBytes(8).toString('hex')}`;
    const legacyUser = `zzlegacy${TAG}`;
    await users.insertOne({
      username: legacyUser, password: bcrypt.hashSync(legacyPw, 10),
      pin: bcrypt.hashSync('123456', 10),
      role: 'clerk', campus: CAMPUS, name: 'Legacy', status: 'active',
      permissions: {}, activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
    });
    await clearLimits();
    const legacyLogin = await req('POST', '/api/auth/login', null,
      { username: legacyUser, password: legacyPw, pin: '123456' });
    ok('an account still holding a bcrypt hash can sign in', !!legacyLogin.json?.token,
      `status ${legacyLogin.status}: ${legacyLogin.raw.slice(0, 160)}`);

    await clearLimits();
    const legacyWrong = await req('POST', '/api/auth/login', null,
      { username: legacyUser, password: legacyPw + 'x', pin: '123456' });
    ok('a wrong password against a hash is still refused', !legacyWrong.json?.token,
      `status ${legacyWrong.status}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 18 — CREDENTIALS: ${pass} passed, ${fail} failed`);
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
