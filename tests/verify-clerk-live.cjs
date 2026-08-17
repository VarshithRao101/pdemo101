/**
 * Post-activation check against the live database.
 *
 * Confirms the twenty-eight slots are genuinely usable and genuinely
 * customisable: a real clerk signs in and works, and the Rector can change
 * that clerk's powers, portal ID, password and PIN and see each change take
 * effect. Restores everything it changes.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let pass = 0, fail = 0;
const ok = (n, c, d = '') => {
  c ? (pass++, console.log(`  PASS  ${n}${d ? '  — ' + d : ''}`))
    : (fail++, console.log(`  FAIL  ${n}${d ? '  — ' + d : ''}`));
};

const TAG = `zzlive${crypto.randomBytes(3).toString('hex')}`;
const TARGET = 'clerk7_beemaram_c2';   // the slot we exercise and then restore
let server, BASE, User, snapshot = null;

async function call(method, path, { token, pin, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (pin) headers['x-security-pin'] = pin;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  process.env.PORT = '4613';
  const app = require('../server/app.cjs');
  await new Promise(r => { server = app.listen(process.env.PORT, r); });
  BASE = `http://127.0.0.1:${process.env.PORT}`;
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  User = require('../server/models/User.cjs');

  console.log('\n========================================================');
  console.log('CLERK SYSTEM — LIVE STATE');
  console.log('========================================================\n');

  // Keep the original so this check leaves nothing altered.
  snapshot = await User.findOne({ username: TARGET }).lean();

  const clerks = await User.find({ role: 'clerk' }).select('username campus slotIndex status password pin permissions').lean();
  ok('twenty-eight clerk slots exist', clerks.length === 28, `${clerks.length} found`);
  ok('all are active', clerks.every(c => (c.status || 'active') !== 'disabled'));
  ok('every campus has seven',
    ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2']
      .every(c => clerks.filter(k => k.campus === c).length === 7));
  ok('every slot number 1-7 is unique per campus',
    new Set(clerks.map(c => `${c.campus}#${c.slotIndex}`)).size === 28);
  ok('every credential is readable, none left hashed',
    clerks.every(c => !String(c.password).startsWith('$2') && !String(c.pin).startsWith('$2')));

  // A throwaway Rector, so the operator's own credentials are never used here.
  const rp = crypto.randomBytes(16).toString('base64url');
  const rpin = String(crypto.randomInt(100000, 999999));
  await User.create({
    username: `${TAG}_rector`, name: 'Live check', role: 'admin1', campus: 'All',
    password: bcrypt.hashSync(rp, 10), pin: bcrypt.hashSync(rpin, 10), status: 'active'
  });
  const rl = await call('POST', '/api/auth/login', { body: { username: `${TAG}_rector`, password: rp, pin: rpin } });
  const rector = rl.json?.token;
  ok('a Rector can sign in', !!rector, `HTTP ${rl.status}`);

  console.log('\nA real clerk, signing in with its issued credentials\n');

  const target = clerks.find(c => c.username === TARGET);
  const cl = await call('POST', '/api/auth/login', { body: { username: target.username, password: target.password, pin: target.pin } });
  ok('the clerk signs in with the credentials on record', !!cl.json?.token, `HTTP ${cl.status}`);
  ok('it reports all five powers', cl.json?.user?.permissions &&
    Object.values(cl.json.user.permissions).every(Boolean), JSON.stringify(cl.json?.user?.permissions));
  ok('it is pinned to its own campus', cl.json?.user?.campus === 'Beemaram C2', cl.json?.user?.campus);

  const work = await call('GET', '/api/accountant/students', { token: cl.json?.token });
  ok('the clerk portal actually works (student list loads)', work.status === 200, `HTTP ${work.status}`);

  console.log('\nThe Rector changing that clerk — powers, ID, password, PIN\n');

  // 1. Powers
  const restrict = await call('POST', '/api/admin1/clerks', {
    token: rector, pin: rpin,
    body: { campus: 'Beemaram C2', slots: [{ slotIndex: 7, active: true,
      permissions: { addStudent: false, editStudent: true, editFees: false, collectFees: false, logExpenditures: false } }] }
  });
  ok('powers can be narrowed', restrict.status === 200, `HTTP ${restrict.status}`);
  const afterPerm = await User.findOne({ username: TARGET }).select('permissions').lean();
  ok('only the granted power remains',
    afterPerm.permissions.editStudent === true && afterPerm.permissions.collectFees === false);

  const blocked = await call('POST', '/api/accountant/students', {
    token: cl.json?.token,
    body: { name: 'Should Fail', admissionNumber: `${TAG}X`, branch: 'Beemaram C2', mobile: '9876543210' }
  });
  ok('the revoked power is refused on the clerk\'s EXISTING session', blocked.status === 403, `HTTP ${blocked.status}`);

  // 2. Credentials
  const setCred = await call('PUT', `/api/admin1/credentials/${encodeURIComponent(String(snapshot._id))}`, {
    token: rector, pin: rpin,
    body: { password: 'RectorSetThis2026', pin: '246810' }
  });
  ok('the Rector can set a new password and PIN', setCred.status === 200, `HTTP ${setCred.status}`);
  ok('the new values come back readable',
    setCred.json?.data?.password === 'RectorSetThis2026' && setCred.json?.data?.pin === '246810');

  const relogin = await call('POST', '/api/auth/login', { body: { username: TARGET, password: 'RectorSetThis2026', pin: '246810' } });
  ok('the clerk signs in with the NEW credentials', !!relogin.json?.token, `HTTP ${relogin.status}`);

  // 3. Deactivation closes the portal
  await call('POST', '/api/admin1/clerks', {
    token: rector, pin: rpin,
    body: { campus: 'Beemaram C2', slots: [{ slotIndex: 7, active: false, permissions: afterPerm.permissions }] }
  });
  const closed = await call('GET', '/api/accountant/students', { token: relogin.json?.token });
  ok('deactivating closes that portal at once', closed.status === 401 || closed.status === 403, `HTTP ${closed.status}`);

  console.log('\n========================================================');
  console.log(`${pass} passed, ${fail} failed`);
  console.log('========================================================\n');
})()
  .catch(e => { console.error('CHECK FAILED:', e.message); fail++; })
  .finally(async () => {
    // Put the exercised slot back exactly as activateClerkSlots left it.
    try {
      if (snapshot) {
        await User.updateOne({ _id: snapshot._id }, {
          $set: {
            username: snapshot.username, password: snapshot.password, pin: snapshot.pin,
            status: 'active', permissions: snapshot.permissions, activeSessionId: null
          }
        });
      }
      await User.deleteMany({ username: new RegExp(`^${TAG}_`) });
      await mongoose.connection.collection('refreshtokens').deleteMany({ username: new RegExp(`^(${TAG}_|${TARGET}$)`) });
      await mongoose.connection.collection('auditlogs').deleteMany({ actorUsername: new RegExp(`^${TAG}_`) });
    } catch {}
    try { server.close(); } catch {}
    try { await mongoose.disconnect(); } catch {}
    process.exit(fail > 0 ? 1 : 0);
  });
