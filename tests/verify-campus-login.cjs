/**
 * Signing in as a clerk with a campus and no username.
 *
 * A clerk picks their campus and types their own password; the server works
 * out which of that campus's clerks they are. That makes the password
 * the only thing identifying the account within a campus, so the interesting
 * cases are the ones where it is NOT unique or NOT theirs:
 *
 *   - the right password signs in as the right slot, on every campus
 *   - a password belonging to another campus's clerk is refused
 *   - a wrong PIN with a right password is refused
 *   - two clerks sharing a password is refused outright, not resolved to one
 *   - a deactivated clerk cannot sign in this way either
 *
 * Restores anything it changes.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');

let pass = 0, fail = 0;
const ok = (n, c, d = '') => {
  c ? (pass++, console.log(`  PASS  ${n}${d ? '  — ' + d : ''}`))
    : (fail++, console.log(`  FAIL  ${n}${d ? '  — ' + d : ''}`));
};

const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];
let server, BASE, User;
const restore = [];

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

/** Clear the shared login lockout so one test's failures do not block the next. */
async function clearLocks() {
  try { await mongoose.connection.collection('loginattempts').deleteMany({}); } catch {}
  try { await mongoose.connection.collection('ratelimits').deleteMany({}); } catch {}
}

(async () => {
  process.env.PORT = '4615';
  const app = require('../server/app.cjs');
  await new Promise(r => { server = app.listen(process.env.PORT, r); });
  BASE = `http://127.0.0.1:${process.env.PORT}`;
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod', serverSelectionTimeoutMS: 20000 });
  User = require('../server/models/User.cjs');

  console.log('\n========================================================');
  console.log('CLERK SIGN-IN BY CAMPUS');
  console.log('========================================================\n');

  console.log('Every campus: the right password reaches the right slot\n');

  for (const campus of CAMPUSES) {
    // Pick a real slot on this campus and use its stored credentials.
    const clerk = await User.findOne({ role: 'clerk', campus, status: { $ne: 'disabled' } })
      .sort({ slotIndex: 1 }).lean();
    if (!clerk) { ok(`${campus}: a clerk exists`, false); continue; }

    await clearLocks();
    const r = await call('POST', '/api/auth/login', {
      campus, password: clerk.password, pin: clerk.pin, loginContext: 'universal'
    });
    ok(`${campus}: signs in without a username`, r.status === 200 && !!r.json?.token, `HTTP ${r.status}`);
    ok(`${campus}: resolved to the right account`,
      r.json?.user?.username === clerk.username, `${r.json?.user?.username} vs ${clerk.username}`);
    ok(`${campus}: pinned to that campus`, r.json?.user?.campus === campus, r.json?.user?.campus);
  }

  console.log('\nCredentials that must NOT work\n');

  const a = await User.findOne({ role: 'clerk', campus: CAMPUSES[0] }).sort({ slotIndex: 1 }).lean();
  const b = await User.findOne({ role: 'clerk', campus: CAMPUSES[1] }).sort({ slotIndex: 1 }).lean();

  await clearLocks();
  const crossCampus = await call('POST', '/api/auth/login', {
    campus: CAMPUSES[1], password: a.password, pin: a.pin, loginContext: 'universal'
  });
  ok('a clerk\'s password is refused at another campus',
    crossCampus.status !== 200, `HTTP ${crossCampus.status}`);

  await clearLocks();
  const wrongPin = await call('POST', '/api/auth/login', {
    campus: CAMPUSES[0], password: a.password, pin: '000000', loginContext: 'universal'
  });
  ok('right password with a wrong PIN is refused', wrongPin.status !== 200, `HTTP ${wrongPin.status}`);

  await clearLocks();
  const noCampus = await call('POST', '/api/auth/login', {
    password: a.password, pin: a.pin, loginContext: 'universal'
  });
  ok('no campus and no username is a 400, not a guess', noCampus.status === 400, `HTTP ${noCampus.status}`);

  await clearLocks();
  const badCampus = await call('POST', '/api/auth/login', {
    campus: 'Nowhere', password: a.password, pin: a.pin, loginContext: 'universal'
  });
  ok('an unknown campus is refused', badCampus.status === 400, `HTTP ${badCampus.status}`);

  console.log('\nTwo clerks sharing a password must not resolve to one of them\n');

  // Temporarily give a second clerk on campus 0 the same credentials.
  const twin = await User.findOne({ role: 'clerk', campus: CAMPUSES[0], slotIndex: { $ne: a.slotIndex } }).lean();
  restore.push({ _id: twin._id, password: twin.password, pin: twin.pin });
  await User.updateOne({ _id: twin._id }, { $set: { password: a.password, pin: a.pin } });

  await clearLocks();
  const ambiguous = await call('POST', '/api/auth/login', {
    campus: CAMPUSES[0], password: a.password, pin: a.pin, loginContext: 'universal'
  });
  ok('a shared password is refused outright', ambiguous.status === 409, `HTTP ${ambiguous.status}`);
  ok('and says what to fix', /more than one clerk/i.test(String(ambiguous.json?.message || '')),
    String(ambiguous.json?.message || '').slice(0, 60));
  ok('no token is issued', !ambiguous.json?.token);

  // Put the twin back before anything else runs.
  await User.updateOne({ _id: twin._id }, { $set: { password: restore[0].password, pin: restore[0].pin } });
  restore.length = 0;

  await clearLocks();
  const afterRestore = await call('POST', '/api/auth/login', {
    campus: CAMPUSES[0], password: a.password, pin: a.pin, loginContext: 'universal'
  });
  ok('with the clash removed the original signs in again',
    afterRestore.status === 200 && afterRestore.json?.user?.username === a.username, `HTTP ${afterRestore.status}`);

  console.log('\nA deactivated clerk\n');

  await User.updateOne({ _id: b._id }, { $set: { status: 'disabled' } });
  await clearLocks();
  const disabled = await call('POST', '/api/auth/login', {
    campus: CAMPUSES[1], password: b.password, pin: b.pin, loginContext: 'universal'
  });
  ok('cannot sign in by campus either', disabled.status !== 200, `HTTP ${disabled.status}`);
  await User.updateOne({ _id: b._id }, { $set: { status: 'active' } });

  console.log('\n========================================================');
  console.log(`${pass} passed, ${fail} failed`);
  console.log('========================================================\n');
})()
  .catch(e => { console.error('CHECK FAILED:', e.message); fail++; })
  .finally(async () => {
    try {
      for (const r of restore) {
        await User.updateOne({ _id: r._id }, { $set: { password: r.password, pin: r.pin } });
      }
      await clearLocks();
    } catch {}
    try { server.close(); } catch {}
    try { await mongoose.disconnect(); } catch {}
    process.exit(fail > 0 ? 1 : 0);
  });
