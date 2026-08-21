/**
 * What a burst of failed sign-ins is allowed to take down.
 *
 * A clerk signs in with a campus and no username, so a failed guess has no
 * account to charge. The budget was once keyed on the campus alone, which
 * meant five wrong guesses from one stranger — who needs to know nothing but
 * a campus name — stopped every clerk on that campus from signing in. This
 * suite exists to keep that from coming back.
 *
 * The property under test is not "guessing is bounded" on its own. It is:
 *
 *     guessing is bounded  AND  one guesser cannot lock anybody else out
 *
 * The second half is what regressed, and it is the half a passing brute-force
 * test will happily agree with while the app is unusable.
 *
 * Distinct callers are simulated with X-Forwarded-For. That is honest here
 * rather than a cheat: TRUSTED_PROXY_HOPS is 1 in production because
 * Hostinger's edge sets exactly that header, so the value the app reads in
 * this test is the value it reads live.
 *
 * Scratch database, dropped at the end.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_verify';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_verify';

// A smaller backstop so the suite makes twelve requests instead of fifty. It
// is read from the environment at load, so this must be set before app.cjs.
process.env.MAX_CAMPUS_LOGIN_ATTEMPTS = '12';
process.env.TRUSTED_PROXY_HOPS = '1';

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');

const PORT = 4622;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C1';
const OTHER_CAMPUS = 'Erragattugutta C1';
const PER_ADDRESS = 5;
const PER_CAMPUS = 12;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

/** A request from a named address. `ip` becomes the X-Forwarded-For entry. */
const req = (method, path, body, ip) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(ip ? { 'X-Forwarded-For': ip } : {})
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

const login = (body, ip) => req('POST', '/api/auth/login', body, ip);
const verify = (body, ip) => req('POST', '/api/auth/verify-credentials', body, ip);

let server;

(async () => {
  server = await new Promise(r => { const s = app.listen(PORT, () => r(s)); });
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;

  const attempts = () => db.collection('loginattempts');
  const limits = () => db.collection('ratelimits');
  /** Between cases, so one case's failures never explain the next one's result. */
  const reset = async () => {
    await attempts().deleteMany({});
    await limits().deleteMany({});
  };

  const TAG = crypto.randomBytes(3).toString('hex');
  const mkClerk = async (campus, label) => {
    const account = {
      username: `zzlock${label}${TAG}`,
      password: `Pw-${crypto.randomBytes(9).toString('hex')}`,
      pin: String(100000 + Math.floor(Math.random() * 899999)),
      campus
    };
    await db.collection('users').insertOne({
      username: account.username, password: account.password, pin: account.pin,
      role: 'clerk', campus, name: `Lock ${label}`, status: 'active',
      permissions: { addStudent: true, editStudent: true, editFees: true,
                     collectFees: true, logExpenditures: true, manageStaff: false },
      activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
    });
    return account;
  };

  console.log('\n========================================================');
  console.log('LOGIN LOCKOUT — SCOPE AND BLAST RADIUS');
  console.log('========================================================');

  try {
    // Two clerks on the campus under attack, one on another campus. The second
    // clerk is the point: a suite with one clerk per campus cannot tell "the
    // campus is locked" apart from "that clerk is locked".
    const alice = await mkClerk(CAMPUS, 'a');
    const bob = await mkClerk(CAMPUS, 'b');
    const carol = await mkClerk(OTHER_CAMPUS, 'c');

    const wrong = { campus: CAMPUS, password: 'Definitely-Not-It-1', pin: '000000' };
    const right = c => ({ campus: c.campus, password: c.password, pin: c.pin });

    // =================================================================
    section('A guesser exhausts their own five attempts');
    await reset();

    const ATTACKER = '203.0.113.9';
    const codes = [];
    for (let i = 0; i < PER_ADDRESS; i++) codes.push((await login(wrong, ATTACKER)).status);
    ok(`${PER_ADDRESS} wrong guesses are all refused`, codes.every(c => c === 401 || c === 429), codes.join(','));

    const sixth = await login(wrong, ATTACKER);
    ok('the sixth guess from that address is locked out', sixth.status === 429, `HTTP ${sixth.status}`);
    ok('the lock names the device, not the account',
      /device/i.test(sixth.json?.message || ''), sixth.json?.message);

    // =================================================================
    section('...and that is the whole blast radius');

    // THE REGRESSION TEST. Before the fix this returned 429: five guesses from
    // a stranger locked every clerk on the campus out of their own portal.
    const aliceIn = await login(right(alice), '198.51.100.20');
    ok('a clerk on the attacked campus still signs in, from elsewhere',
      aliceIn.status === 200 && !!aliceIn.json?.token,
      `HTTP ${aliceIn.status}: ${aliceIn.raw.slice(0, 160)}`);

    const bobIn = await login(right(bob), '198.51.100.21');
    ok('so does a second clerk on that campus',
      bobIn.status === 200 && !!bobIn.json?.token, `HTTP ${bobIn.status}`);

    const carolIn = await login(right(carol), '198.51.100.22');
    ok('a clerk on an untouched campus is unaffected',
      carolIn.status === 200 && !!carolIn.json?.token, `HTTP ${carolIn.status}`);

    const stillLocked = await login(right(alice), ATTACKER);
    ok('the guesser stays locked even with a CORRECT password',
      stillLocked.status === 429, `HTTP ${stillLocked.status}`);

    // =================================================================
    section('Both steps of a sign-in share one budget');
    await reset();

    // verify-credentials checks a password on its own. If it kept its own
    // counter an attacker would get five guesses there and five more at
    // /auth/login, which is ten.
    const SPLITTER = '203.0.113.44';
    for (let i = 0; i < 3; i++) await verify({ campus: CAMPUS, password: 'nope-1' }, SPLITTER);
    for (let i = 0; i < 2; i++) await login(wrong, SPLITTER);

    const afterSplit = await login(wrong, SPLITTER);
    ok('three at verify-credentials plus two at login exhausts the five',
      afterSplit.status === 429, `HTTP ${afterSplit.status}`);
    const verifyAlso = await verify({ campus: CAMPUS, password: 'nope-2' }, SPLITTER);
    ok('verify-credentials is locked by the same run',
      verifyAlso.status === 429, `HTTP ${verifyAlso.status}`);

    // =================================================================
    section('The campus backstop still bounds a rotating attacker');
    await reset();

    // One guess each from many addresses walks past the per-address gate
    // every time. This is the evasion the backstop exists for.
    let tripped = 0;
    for (let i = 0; i < PER_CAMPUS; i++) {
      const r = await login(wrong, `192.0.2.${100 + i}`);
      if (r.status === 429) tripped++;
    }
    const fresh = await login(wrong, '192.0.2.200');
    ok(`${PER_CAMPUS} guesses from ${PER_CAMPUS} addresses trip the campus backstop`,
      fresh.status === 429, `HTTP ${fresh.status} after ${tripped} in-loop locks`);
    ok('the backstop names the campus, not the device or the account',
      /campus/i.test(fresh.json?.message || ''), fresh.json?.message);

    const blockedCorrect = await login(right(alice), '192.0.2.201');
    ok('while tripped, even a correct campus sign-in is refused',
      blockedCorrect.status === 429, `HTTP ${blockedCorrect.status}`);

    // The backstop must not reach past the campus it belongs to.
    const carolStill = await login(right(carol), '192.0.2.202');
    ok('a different campus is still reachable while one is backstopped',
      carolStill.status === 200 && !!carolStill.json?.token, `HTTP ${carolStill.status}`);

    // =================================================================
    section('A correct sign-in clears the run');
    await reset();

    const CLERK_IP = '198.51.100.60';
    await login(wrong, CLERK_IP);
    await login(wrong, CLERK_IP);
    const recovered = await login(right(alice), CLERK_IP);
    ok('two mistypes then the right password signs in',
      recovered.status === 200 && !!recovered.json?.token, `HTTP ${recovered.status}`);

    const countersLeft = await attempts().countDocuments({ key: /^login:campus:/ });
    ok('the campus counters are wiped, not carried forward',
      countersLeft === 0, `${countersLeft} row(s) left`);

    // =================================================================
    section('A username sign-in is still bounded by its own account');
    await reset();

    const USER_IP = '198.51.100.70';
    for (let i = 0; i < PER_ADDRESS; i++) {
      await login({ username: alice.username, password: 'wrong-one' }, USER_IP);
    }
    const aliceLocked = await login({ username: alice.username, password: alice.password, pin: alice.pin }, USER_IP);
    ok('the targeted account locks', aliceLocked.status === 429, `HTTP ${aliceLocked.status}`);
    ok('the lock names the account', /account/i.test(aliceLocked.json?.message || ''), aliceLocked.json?.message);

    // Same address, different account: an account lock must not become an
    // address ban, or one locked account takes a shared office offline.
    const bobFine = await login({ username: bob.username, password: bob.password, pin: bob.pin }, USER_IP);
    ok('another account from the same address is unaffected',
      bobFine.status === 200 && !!bobFine.json?.token, `HTTP ${bobFine.status}`);

    // =================================================================
    section('A malformed request is not a guess');
    await reset();

    const SLOPPY = '198.51.100.80';
    for (let i = 0; i < PER_ADDRESS + 2; i++) await login({ campus: CAMPUS }, SLOPPY);
    const afterSloppy = await login(right(bob), SLOPPY);
    ok('a client bug posting no password cannot lock anyone out',
      afterSloppy.status === 200 && !!afterSloppy.json?.token, `HTTP ${afterSloppy.status}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`LOGIN LOCKOUT: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err);
    fail++;
    console.log(`\nLOGIN LOCKOUT: ${pass} passed, ${fail} failed`);
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
