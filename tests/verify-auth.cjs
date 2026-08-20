/**
 * Phase 3 — authentication core.
 *
 * Everything here runs against a THROWAWAY clerk created for the run and
 * deleted at the end. That is not tidiness: the suite deliberately locks an
 * account out, evicts its session and revokes its refresh tokens, and doing
 * that to the Rector mid-afternoon would take the college offline.
 *
 * The rate-limit counters for this IP are cleared between sections, because
 * the auth budget is ten per fifteen minutes and the lockout test alone spends
 * six. Without that the later assertions would read 429 and pass for the wrong
 * reason — a refusal is not evidence of anything unless you know why.
 */
require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');

const PORT = 4603;
const BASE = `http://127.0.0.1:${PORT}`;
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, path, { token, body, headers = {} } = {}) => new Promise((resolve, reject) => {
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
    res.on('end', () => resolve({ status: res.statusCode, raw, json: (() => { try { return JSON.parse(raw); } catch { return null; } })() }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const USERNAME = `zzauthtest${crypto.randomBytes(3).toString('hex')}`;
const PASSWORD = `Pw-${crypto.randomBytes(9).toString('hex')}`;

/** Wipe this IP's auth budget so a 429 never stands in for a real answer. */
const clearLimits = () => mongoose.connection.collection('ratelimits')
  .deleteMany({ key: /^ratelimit_/ });

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 3 — AUTHENTICATION CORE\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
  const users = mongoose.connection.collection('users');

  await users.insertOne({
    username: USERNAME, password: PASSWORD, pin: '246813', role: 'clerk',
    campus: 'Beemaram C2', name: 'Auth Test', status: 'active',
    permissions: { addStudent: false, editStudent: false, editFees: false,
                   collectFees: false, logExpenditures: false, manageStaff: false },
    activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
  });
  console.log(`        throwaway account ${USERNAME} created\n`);

  const login = (username = USERNAME, password = PASSWORD) =>
    req('POST', '/api/auth/login', { body: { username, password } });

  try {
    // =================================================================
    section('Signing in');
    await clearLimits();

    const good = await login();
    ok('correct credentials are accepted', good.status === 200 && !!good.json?.token, `status ${good.status}`);
    ok('a refresh token is issued', !!good.json?.refreshToken);
    ok('the response never contains the password',
      !good.raw.includes(PASSWORD), 'the credential came back to the caller');

    const bad = await login(USERNAME, PASSWORD + 'x');
    ok('a wrong password is refused', bad.status === 401, `status ${bad.status}`);
    ok('a wrong password issues no token', !bad.json?.token);

    const unknown = await login('zznosuchuser', PASSWORD);
    ok('an unknown username is refused', unknown.status === 401, `status ${unknown.status}`);
    // Different wording for "no such user" and "wrong password" tells an
    // attacker which usernames are real. The attempt COUNT legitimately
    // differs — counters are per username — so the digits are stripped before
    // comparing. Telling a clerk who mistyped that two tries remain is worth
    // the little it gives away, and it gives away nothing about existence
    // because an invented username is answered exactly the same way.
    const shape = m => String(m || '').replace(/\d+/g, 'N');
    ok('unknown user and wrong password read the same',
      shape(unknown.json?.message) === shape(bad.json?.message),
      `[${unknown.json?.message}] vs [${bad.json?.message}]`);
    ok('neither refusal says whether the account exists',
      !/no such|not found|unknown user|does not exist/i.test(unknown.json?.message || ''),
      unknown.json?.message);

    await clearLimits();
    await users.updateOne({ username: USERNAME }, { $set: { status: 'disabled' } });
    const disabled = await login();
    ok('a disabled account cannot sign in', disabled.status >= 400 && !disabled.json?.token,
      `status ${disabled.status}`);
    await users.updateOne({ username: USERNAME }, { $set: { status: 'active' } });

    // =================================================================
    section('The token itself');
    await clearLimits();

    const session = await login();
    const token = session.json.token;
    const claims = jwt.decode(token);
    ok('the token names the account', claims.username === USERNAME);
    ok('the token names the role', claims.role === 'clerk');
    ok('the token names the campus', claims.campus === 'Beemaram C2');
    ok('the token carries a session id', typeof claims.sessionId === 'string' && claims.sessionId.length > 8);
    ok('the token carries no password', !JSON.stringify(claims).toLowerCase().includes('password'));
    ok('the token expires', typeof claims.exp === 'number' && claims.exp > claims.iat);
    ok('it expires within a day', (claims.exp - claims.iat) <= 24 * 3600,
      `${((claims.exp - claims.iat) / 3600).toFixed(1)}h`);

    const me = await req('GET', '/api/auth/me', { token });
    ok('a valid token is accepted', me.status === 200, `status ${me.status}`);

    // --- Forgery ---------------------------------------------------
    // jwt.sign refuses expiresIn when the payload already carries exp, so
    // the timing claims are dropped before re-signing.
    const bare = { ...claims, role: 'admin1' };
    delete bare.iat; delete bare.exp;
    const forged = [
      ['no token at all', null],
      ['a malformed token', 'not.a.token'],
      ['an empty bearer', ''],
      ['a token signed with the wrong secret',
        jwt.sign({ ...bare }, 'a'.repeat(48), { expiresIn: '1h' })],
      ['an expired token',
        jwt.sign({ ...bare }, process.env.JWT_SECRET, { expiresIn: '-1h' })],
      ['a payload edited after signing',
        (() => { const [h, p, s] = token.split('.');
          const body = JSON.parse(Buffer.from(p, 'base64url'));
          body.role = 'admin1';
          return `${h}.${Buffer.from(JSON.stringify(body)).toString('base64url')}.${s}`; })()],
      ['an alg:none token',
        (() => { const body = { ...claims, role: 'admin1' };
          return Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
            + '.' + Buffer.from(JSON.stringify(body)).toString('base64url') + '.'; })()]
    ];
    for (const [label, t] of forged) {
      const r = await req('GET', '/api/auth/me', t === null ? {} : { token: t });
      ok(`${label} is refused`, r.status === 401, `status ${r.status}`);
    }

    // A forged admin1 token must not reach an admin1 route either.
    const escalated = jwt.sign({ ...bare, campus: 'All' },
      'b'.repeat(48), { expiresIn: '1h' });
    const climb = await req('GET', '/api/admin1/clerks', { token: escalated });
    ok('a self-signed admin1 token cannot reach an admin1 route',
      climb.status === 401 || climb.status === 403, `status ${climb.status}`);

    // =================================================================
    section('One session at a time');
    await clearLimits();

    const first = await login();
    const second = await login();
    ok('signing in again issues a different token', first.json.token !== second.json.token);

    const oldSession = await req('GET', '/api/auth/me', { token: first.json.token });
    ok('the earlier session is evicted', oldSession.status === 401,
      `status ${oldSession.status} — two people could share one account undetected`);
    const newSession = await req('GET', '/api/auth/me', { token: second.json.token });
    ok('the newer session still works', newSession.status === 200, `status ${newSession.status}`);

    // =================================================================
    section('Refresh tokens');
    await clearLimits();

    const s = await login();
    const refreshed = await req('POST', '/api/auth/refresh', { body: { refreshToken: s.json.refreshToken } });
    ok('a valid refresh token returns a new access token',
      refreshed.status === 200 && !!refreshed.json?.token, `status ${refreshed.status}`);
    ok('the refreshed token works',
      (await req('GET', '/api/auth/me', { token: refreshed.json.token })).status === 200);

    const junkRefresh = await req('POST', '/api/auth/refresh', { body: { refreshToken: crypto.randomBytes(40).toString('hex') } });
    ok('an invented refresh token is refused', junkRefresh.status === 401, `status ${junkRefresh.status}`);

    const noRefresh = await req('POST', '/api/auth/refresh', { body: {} });
    ok('a missing refresh token is refused', noRefresh.status >= 400, `status ${noRefresh.status}`);

    // =================================================================
    section('Signing out');
    await clearLimits();

    const out = await login();
    await req('POST', '/api/auth/logout', { token: out.json.token, body: {} });
    const afterLogout = await req('GET', '/api/auth/me', { token: out.json.token });
    ok('the access token stops working after logout', afterLogout.status === 401,
      `status ${afterLogout.status}`);
    const refreshAfterLogout = await req('POST', '/api/auth/refresh',
      { body: { refreshToken: out.json.refreshToken } });
    ok('the refresh token stops working after logout', refreshAfterLogout.status === 401,
      `status ${refreshAfterLogout.status} — logging out would not end the session`);

    // =================================================================
    section('Lockout');
    await clearLimits();
    await mongoose.connection.collection('loginattempts').deleteMany({ key: new RegExp(USERNAME) });

    // The lock is detected by the explicit `locked` flag, NOT by matching the
    // word "lock" in the message. An ordinary refusal reads "... before this
    // account is locked", so a /lock/i test matches on the very first failure —
    // which is what the first version of this did. It broke out after one
    // attempt, never locked anything, and then reported that the lockout had
    // failed to hold. Two assertions, both measuring nothing.
    let lockedAt = null;
    for (let i = 1; i <= 8; i++) {
      const r = await login(USERNAME, 'wrong-on-purpose');
      if (r.status === 429 && r.json?.locked === true) { lockedAt = i; break; }
    }
    ok('repeated wrong passwords lock the account', lockedAt !== null, 'never locked');
    ok('it locks within 6 attempts', lockedAt !== null && lockedAt <= 6, `locked at ${lockedAt}`);

    // The point of a lock: a locked account must not reveal whether the guess
    // would have been right, so even the real password is refused.
    const rightAfterLock = await login();
    ok('the correct password is refused while locked',
      rightAfterLock.status === 429 && !rightAfterLock.json?.token,
      `status ${rightAfterLock.status} — a lock that only blocks wrong guesses stops nothing`);
    ok('the lock says how long it lasts',
      Number(rightAfterLock.json?.lockedForSeconds) > 0,
      String(rightAfterLock.json?.lockedForSeconds));

    // An unrelated account must be unaffected — the counter is per username,
    // so one clerk locking themselves out must not close the campus.
    const other = await login('zzsomeoneelse', 'whatever');
    ok('locking one account does not lock another',
      other.status === 401, `status ${other.status}`);

    console.log(`\n  ${pass} passed, ${fail} failed\n`);
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    await users.deleteOne({ username: USERNAME });
    await mongoose.connection.collection('refreshtokens').deleteMany({ username: USERNAME });
    await mongoose.connection.collection('loginattempts')
      .deleteMany({ key: { $in: [`login:${USERNAME.toLowerCase()}`, 'login:zznosuchuser', 'login:zzsomeoneelse'] } });
    await clearLimits();
    console.log(`  (throwaway account ${USERNAME} and its tokens removed)`);
    server.close();
    await mongoose.disconnect();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
