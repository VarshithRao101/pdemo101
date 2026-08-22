/**
 * Clerks are created, not allocated.
 *
 * The seven fixed slots are gone. The Rector picks a campus, fills in details,
 * and the account exists — up to the per-campus cap the server reports.
 *
 * The assertion that matters most is the cap. A limit enforced only by the
 * form is not a limit: anyone can post past it. This fills the campus to the
 * cap the SERVER reports and checks the one past it is refused BY THE SERVER.
 *
 * The cap is read from the API rather than written here. It was 15, it is now
 * 100, and a test that hardcodes the number fails for the wrong reason every
 * time the operator changes it - which says nothing about whether the cap is
 * actually ENFORCED, which is the only thing this section is checking.
 */
// Scratch database, dropped by the suite's own cleanup.
//
// This used to run against whatever MONGODB_DB_NAME pointed at, which is the
// LIVE database by default - while creating a Rector, creating clerks up to
// the campus cap, and deleting them again. It cleaned up after itself when it
// finished, and that is exactly the problem: verify-resilience does the same
// thing and did NOT finish once, leaving a live admin1 account sitting in
// production for three days.
//
// Nothing here needs real data. It seeds its own Rector, so pinning it to the
// scratch database costs nothing - and naming the scratch database is what
// run-all.cjs uses to decide a suite is safe for CI, so this now runs there
// too instead of only on someone's machine.
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
const TAG = `zzcrud${crypto.randomBytes(3).toString('hex')}`;
let server, BASE, User, AuditLog, rectorPin;

async function cleanup() {
  try { if (User) await User.deleteMany({ username: new RegExp(`^${TAG}`) }); } catch {}
  try {
    await mongoose.connection.collection('expenditures').deleteMany({ description: new RegExp(`^${TAG}`) });
    await mongoose.connection.collection('students').deleteMany({ admissionNumber: new RegExp(`^${TAG}`) });
  } catch {}
  try { if (AuditLog) await AuditLog.deleteMany({ actorUsername: new RegExp(`^${TAG}`) }); } catch {}
  try { await mongoose.connection.collection('refreshtokens').deleteMany({ username: new RegExp(`^${TAG}`) }); } catch {}
  try { if (server) server.close(); } catch {}
  try { await mongoose.connection.close(); } catch {}
}

async function call(method, path, { token, pin, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (pin) headers['x-security-pin'] = pin;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const clerkBody = (n, extra = {}) => ({
  campus: CAMPUS,
  name: `Probe Clerk ${n}`,
  username: `${TAG}_c${n}`,
  password: 'ClerkPass2026',
  pin: String(100000 + n),
  mobile: '9876543210',
  email: `c${n}@example.com`,
  permissions: { addStudent: true, editStudent: false, editFees: false, collectFees: true, logExpenditures: false },
  ...extra
});

async function main() {
  process.env.PORT = process.env.PORT || '4661';
  const app = require('../server/app.cjs');
  await new Promise(r => { server = app.listen(process.env.PORT, r); });
  BASE = `http://127.0.0.1:${process.env.PORT}`;

  // dbName is passed explicitly. MONGODB_URI carries /jc_erp_prod in its path,
  // and without this option that path wins - which is how this suite reached
  // the live database even with MONGODB_DB_NAME set to the scratch one.
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify', serverSelectionTimeoutMS: 20000 });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');

  // Clear this suite's rate-limit budget before it starts.
  //
  // mongoRateLimiter keys on the caller and persists in the database with a
  // 900s TTL, so a previous run - or another suite that shares this scratch
  // database - leaves the budget spent and every write here answers 429. The
  // suite then reports a dozen failures that say nothing about clerks. Real
  // protection, wrong test: rate limiting has its own suite.
  try { await mongoose.connection.collection('ratelimits').deleteMany({}); } catch {}

  User = require('../server/models/User.cjs');
  AuditLog = require('../server/models/AuditLog.cjs');

  console.log('\n========================================================');
  console.log('CLERK CREATION, EDITING AND THE CAP');
  console.log('========================================================\n');

  // A throwaway Rector, so the operator's own PIN is never used here.
  const rp = crypto.randomBytes(16).toString('base64url');
  rectorPin = String(crypto.randomInt(100000, 999999));
  await User.create({
    username: `${TAG}_rector`, name: 'CRUD Rector', role: 'admin1', campus: 'All',
    password: bcrypt.hashSync(rp, 10), pin: bcrypt.hashSync(rectorPin, 10), status: 'active'
  });
  const lg = await call('POST', '/api/auth/login', { body: { username: `${TAG}_rector`, password: rp, pin: rectorPin } });
  const token = lg.json?.token;
  ok('Rector signed in', !!token, `HTTP ${lg.status}`);
  if (!token) return;

  console.log('\nThe screen is PIN-gated on entry\n');

  const noPin = await call('GET', `/api/admin1/clerks?campus=${encodeURIComponent(CAMPUS)}`, { token });
  ok('reading clerks without the PIN is refused', noPin.status === 403, `HTTP ${noPin.status}`);

  const wrongPin = await call('GET', `/api/admin1/clerks?campus=${encodeURIComponent(CAMPUS)}`, { token, pin: '000000' });
  ok('a wrong PIN is refused', wrongPin.status === 403 || wrongPin.status === 429, `HTTP ${wrongPin.status}`);

  const listed = await call('GET', `/api/admin1/clerks?campus=${encodeURIComponent(CAMPUS)}`, { token, pin: rectorPin });
  ok('the right PIN opens it', listed.status === 200, `HTTP ${listed.status}`);
  const startingCount = (listed.json?.data?.clerks || []).length;
  const max = listed.json?.data?.maxPerCampus;
  ok('a per-campus cap is reported', Number.isInteger(max) && max > 0, String(max));
  console.log(`        (the server reports a cap of ${max} per campus)`);

  console.log(`\nCreating clerks (campus already has ${startingCount})\n`);

  const created = await call('POST', '/api/admin1/clerks', { token, pin: rectorPin, body: clerkBody(1) });
  ok('a clerk is created', created.status === 201, `HTTP ${created.status} ${created.json?.message || ''}`);
  ok('it comes back in the campus list',
    (created.json?.data?.clerks || []).some(c => c.username === `${TAG}_c1`));

  const madeClerk = (created.json?.data?.clerks || []).find(c => c.username === `${TAG}_c1`);
  ok('its password is readable to the Rector', madeClerk && madeClerk.password === 'ClerkPass2026', madeClerk && String(madeClerk.password));
  ok('only the granted powers are set',
    madeClerk && madeClerk.permissions.addStudent === true && madeClerk.permissions.editFees === false);

  console.log('\nThe new clerk can actually sign in\n');

  const clerkLogin = await call('POST', '/api/auth/login', {
    body: { username: `${TAG}_c1`, password: 'ClerkPass2026', pin: String(100001) }
  });
  ok('the clerk signs in with what the Rector set', !!clerkLogin.json?.token, `HTTP ${clerkLogin.status}`);
  ok('it reports its campus', clerkLogin.json?.user?.campus === CAMPUS, clerkLogin.json?.user?.campus);

  console.log('\nDuplicate portal IDs are refused\n');

  const dupe = await call('POST', '/api/admin1/clerks', { token, pin: rectorPin, body: clerkBody(1) });
  ok('a repeated portal ID is refused', dupe.status === 409, `HTTP ${dupe.status}`);

  console.log('\nBad input is refused before anything is written\n');

  const badPin = await call('POST', '/api/admin1/clerks', { token, pin: rectorPin, body: clerkBody(90, { pin: '12' }) });
  ok('a PIN that is not 6 digits is refused', badPin.status === 400, `HTTP ${badPin.status}`);

  const shortPw = await call('POST', '/api/admin1/clerks', { token, pin: rectorPin, body: clerkBody(91, { password: 'short' }) });
  ok('a password under 8 characters is refused', shortPw.status === 400, `HTTP ${shortPw.status}`);

  const badMobile = await call('POST', '/api/admin1/clerks', { token, pin: rectorPin, body: clerkBody(92, { mobile: '123' }) });
  ok('a mobile that is not 10 digits is refused', badMobile.status === 400, `HTTP ${badMobile.status}`);

  console.log('\nEditing an existing clerk\n');

  const id = madeClerk.id;
  const renamed = await call('PATCH', `/api/admin1/clerks/${id}`, {
    token, pin: rectorPin, body: { name: 'Renamed Clerk' }
  });
  ok('the name can be changed', renamed.status === 200, `HTTP ${renamed.status}`);

  const powered = await call('PATCH', `/api/admin1/clerks/${id}`, {
    token, pin: rectorPin,
    body: { permissions: { addStudent: false, editStudent: true, editFees: true, collectFees: true, logExpenditures: true } }
  });
  const afterPowers = (powered.json?.data?.clerks || []).find(c => c.id === id);
  ok('powers can be changed', afterPowers && afterPowers.permissions.editFees === true);
  ok('a revoked power is really off', afterPowers && afterPowers.permissions.addStudent === false);

  // Revoking a power must bite on the session the clerk ALREADY holds, not
  // at their next sign-in. req.user is rebuilt from the database per request
  // precisely so this works; carried in the token it would not.
  //
  // (This check came from verify-clerk-live, which tested the removed
  // seven-slot API and has been retired.)
  // That PATCH revoked addStudent (true -> false) and granted
  // logExpenditures (false -> true). Both directions must bite at once.
  const liveClerkToken = clerkLogin.json?.token;

  const nowRefused = await call('POST', '/api/accountant/students', {
    token: liveClerkToken,
    body: { name: 'Should Fail', admissionNumber: `${TAG}NOPE`, branch: CAMPUS, mobile: '9876543210' }
  });
  ok('a REVOKED power is refused on the existing session',
    nowRefused.status === 403, `HTTP ${nowRefused.status}`);

  const nowAllowed = await call('POST', '/api/admin2/expenditure', {
    token: liveClerkToken,
    body: { category: 'Testing', amount: 5, description: `${TAG} probe`, branch: CAMPUS }
  });
  ok('a GRANTED power works on the existing session, without signing them out',
    nowAllowed.status === 201, `HTTP ${nowAllowed.status}`);

  const blocked = await call('PATCH', `/api/admin1/clerks/${id}`, { token, pin: rectorPin, body: { active: false } });
  const afterBlock = (blocked.json?.data?.clerks || []).find(c => c.id === id);
  ok('access can be terminated', afterBlock && afterBlock.status === 'inactive', afterBlock && afterBlock.status);

  const reLogin = await call('POST', '/api/auth/login', {
    body: { username: `${TAG}_c1`, password: 'ClerkPass2026', pin: String(100001) }
  });
  ok('a terminated clerk cannot sign in', !reLogin.json?.token, `HTTP ${reLogin.status}`);

  const restored = await call('PATCH', `/api/admin1/clerks/${id}`, { token, pin: rectorPin, body: { active: true } });
  const afterRestore = (restored.json?.data?.clerks || []).find(c => c.id === id);
  ok('access can be given back', afterRestore && afterRestore.status === 'active');

  console.log(`\nThe ${max}-per-campus cap, enforced by the SERVER\n`);

  const current = (restored.json?.data?.clerks || []).length;

  // The campus is filled by INSERTING straight into Mongo, not by posting the
  // cap's worth of clerks through the API.
  //
  // It used to post them, which worked while the cap was 15. At 100 that is
  // ninety-odd writes in a burst and mongoRateLimiter answers 429 long before
  // the cap is reached - so the suite started failing on the rate limiter and
  // reported it as the cap not being enforced. Two real protections, and the
  // test could not tell which one it was looking at.
  //
  // The filler rows only have to EXIST for the server to count them. The one
  // request that matters is the single POST below, which is the assertion.
  const filler = [];
  for (let i = current; i < max; i++) {
    filler.push({
      username: `${TAG}_fill${i}`, password: 'ClerkPass2026', pin: String(100000 + i),
      role: 'clerk', campus: CAMPUS, name: `Filler ${i}`, status: 'active',
      permissions: {}, activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
    });
  }
  if (filler.length) await User.collection.insertMany(filler);

  const atCap = await User.countDocuments({ campus: CAMPUS, role: { $in: ['clerk', 'admin2'] } });
  ok(`filled the campus to the cap (${max})`, atCap === max, `${atCap} clerks`);

  const overCap = await call('POST', '/api/admin1/clerks', { token, pin: rectorPin, body: clerkBody(200) });
  ok('the one past the cap is REFUSED', overCap.status === 409, `HTTP ${overCap.status}`);
  ok('the refusal explains the limit',
    new RegExp(`limit is ${max}|already has ${max}`, 'i').test(String(overCap.json?.message || '')),
    String(overCap.json?.message || '').slice(0, 70));

  const countInDb = await User.countDocuments({ campus: CAMPUS, role: { $in: ['clerk', 'admin2'] } });
  ok('no account past the cap reached the database', countInDb === max, `${countInDb} at the campus`);

  // Put it back under the cap so the checks that follow can still add one.
  await User.deleteMany({ username: new RegExp(`^${TAG}_fill`) });

  console.log('\nRemoving a clerk frees a place\n');

  const removed = await call('DELETE', `/api/admin1/clerks/${id}`, { token, pin: rectorPin });
  ok('a clerk can be removed', removed.status === 200, `HTTP ${removed.status}`);
  ok('the place is freed', (removed.json?.data?.remaining || 0) >= 1, `remaining ${removed.json?.data?.remaining}`);

  const afterFree = await call('POST', '/api/admin1/clerks', { token, pin: rectorPin, body: clerkBody(300) });
  ok('another clerk can now be added', afterFree.status === 201, `HTTP ${afterFree.status}`);

  console.log('\nEverything is in the audit trail\n');

  await new Promise(r => setTimeout(r, 1200));
  const actions = await AuditLog.distinct('action', { actorUsername: `${TAG}_rector` });
  ok('clerk.create was recorded', actions.includes('clerk.create'), actions.join(', '));
  ok('clerk.update was recorded', actions.includes('clerk.update'), actions.join(', '));
  ok('clerk.delete was recorded', actions.includes('clerk.delete'), actions.join(', '));

  const credLogged = await AuditLog.findOne({
    actorUsername: `${TAG}_rector`, action: 'clerk.create'
  }).lean();
  ok('no password appears in the audit entry',
    credLogged && !JSON.stringify(credLogged).includes('ClerkPass2026'));

  console.log('\n========================================================');
  console.log(`${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log('  - ' + f));
  }
  console.log('========================================================\n');
}

main()
  .catch(e => { console.error('Suite crashed:', e); fail++; })
  .finally(async () => { await cleanup(); process.exit(fail > 0 ? 1 : 0); });
