/**
 * Phase 4 — the authorization matrix.
 *
 * Every route in server/app.cjs, against every role that route does not name,
 * plus an anonymous caller, plus a clerk holding no permissions at all. The
 * expectations are DERIVED from the route's own requireRole and
 * requirePermission, so a route added tomorrow is covered tomorrow and a route
 * whose guard is loosened fails here rather than in production.
 *
 * SAFE BY CONSTRUCTION. Only refusals are exercised against writing routes.
 * requireRole and requirePermission are middleware, so a denied request is
 * answered before the handler runs and nothing can be written. A permitted
 * role is never sent to a POST, PATCH or DELETE — that is what the CRUD
 * phases are for, and doing it here would mutate the live database as a side
 * effect of an authorization check.
 *
 * Accounts are created for the run and deleted after it.
 */
require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');
const { loadRoutes, rolesFor, permissionFor } = require('./lib/routes.cjs');

const PORT = 4604;
const BASE = `http://127.0.0.1:${PORT}`;
let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; } else { fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, path, token) => new Promise((resolve, reject) => {
  const data = method === 'GET' ? null : '{}';
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({ status: res.statusCode, raw }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const TAG = crypto.randomBytes(3).toString('hex');
const ACCOUNTS = [
  { role: 'admin1', campus: 'All' },
  { role: 'clerk', campus: 'Beemaram C2' },
  { role: 'accountant', campus: 'Beemaram C2' },
  { role: 'authenticator', campus: 'All' }
];

// Public and role-free routes are excluded: they are Phase 1's contract, and
// re-testing them here would only restate it.
const SKIP = [
  /^GET \*$/, /^GET \/r-print\.js$/, /^(GET|POST) \/r\//,
  /^POST (\/api)?(\/auth)?\/(login|logout|refresh|force-login|verify-credentials)$/,
  /^GET \/api\/health$/, /^POST \/api\/enquiries$/,
  /^GET (\/api)?(\/auth)?\/me$/, /^GET \/api\/system\/last-changed$/
];

/** Fill :params with a value that cannot match a real record. */
const concrete = p => p.replace(/:[A-Za-z]+/g, 'zzz000000000000000000000');

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 4 — AUTHORIZATION MATRIX\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
  const users = mongoose.connection.collection('users');
  const clearLimits = () => mongoose.connection.collection('ratelimits').deleteMany({ key: /^ratelimit_/ });

  const tokens = {};
  try {
    for (const a of ACCOUNTS) {
      a.username = `zzmatrix${a.role}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await users.insertOne({
        username: a.username, password: a.password, pin: '135791',
        role: a.role, campus: a.campus, name: `Matrix ${a.role}`, status: 'active',
        // Deliberately empty. A clerk with nothing granted is the strictest
        // case, and the one that proves the permission gates are load-bearing.
        permissions: { addStudent: false, editStudent: false, editFees: false,
                       collectFees: false, logExpenditures: false, manageStaff: false },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      await clearLimits();
      const r = await req('POST', '/api/auth/login', null);
      // Log in properly, with a body.
      const login = await new Promise((resolve, reject) => {
        const body = JSON.stringify({ username: a.username, password: a.password });
        const rq = http.request(`${BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve(JSON.parse(raw || '{}'))); });
        rq.on('error', reject); rq.write(body); rq.end();
      });
      if (!login.token) throw new Error(`could not sign in as ${a.role}: ${JSON.stringify(login).slice(0, 160)}`);
      tokens[a.role] = login.token;
    }
    console.log(`        four throwaway accounts signed in (tag ${TAG})\n`);

    const routes = loadRoutes().filter(r => !SKIP.some(re => re.test(`${r.method} ${r.path}`)));
    const guarded = routes.filter(r => rolesFor(r) !== null);

    // =================================================================
    section('Anonymous callers');
    let anonChecked = 0;
    const anonAllowed = [];
    for (const r of routes) {
      const res = await req(r.method, concrete(r.path), null);
      anonChecked++;
      if (res.status !== 401) anonAllowed.push(`${r.method} ${r.path} -> ${res.status}`);
    }
    ok('every guarded route refuses an anonymous caller', anonAllowed.length === 0,
      anonAllowed.join('\n        '));
    console.log(`  ${anonAllowed.length === 0 ? 'PASS' : 'FAIL'}  every guarded route refuses an anonymous caller  (${anonChecked} routes)`);
    if (anonAllowed.length) console.log('        ' + anonAllowed.join('\n        '));

    // =================================================================
    section('Roles a route does not name');
    let denialChecked = 0;
    const wrongfullyAllowed = [];
    for (const r of guarded) {
      const allowedRoles = rolesFor(r);
      for (const a of ACCOUNTS) {
        // admin2 is the old spelling of clerk; a route naming it admits clerks.
        const named = allowedRoles.includes(a.role) ||
          (a.role === 'clerk' && allowedRoles.includes('admin2'));
        if (named) continue;   // permitted: never sent to a write route
        const res = await req(r.method, concrete(r.path), tokens[a.role]);
        denialChecked++;
        // 403 is the answer wanted. 401 is acceptable (session-level refusal).
        // Anything else means the guard let the request through to the handler.
        if (res.status !== 403 && res.status !== 401) {
          wrongfullyAllowed.push(`${a.role} -> ${r.method} ${r.path} = ${res.status} (app.cjs:${r.line})`);
        }
      }
    }
    ok('no route answers a role it does not name', wrongfullyAllowed.length === 0);
    console.log(`  ${wrongfullyAllowed.length === 0 ? 'PASS' : 'FAIL'}  no route answers a role it does not name  (${denialChecked} combinations)`);
    if (wrongfullyAllowed.length) console.log('        ' + wrongfullyAllowed.join('\n        '));

    // =================================================================
    section('Permission gates');
    const gated = guarded.filter(r => permissionFor(r) &&
      (rolesFor(r).includes('clerk') || rolesFor(r).includes('admin2')));
    const ungatedThrough = [];
    for (const r of gated) {
      const res = await req(r.method, concrete(r.path), tokens.clerk);
      if (res.status !== 403) {
        ungatedThrough.push(`${r.method} ${r.path} needs ${permissionFor(r)} = ${res.status} (app.cjs:${r.line})`);
      }
    }
    ok('a clerk with no permissions is refused every gated route', ungatedThrough.length === 0);
    console.log(`  ${ungatedThrough.length === 0 ? 'PASS' : 'FAIL'}  a clerk with no permissions is refused every gated route  (${gated.length} routes)`);
    if (ungatedThrough.length) console.log('        ' + ungatedThrough.join('\n        '));

    // Every permission the server enforces must actually gate something.
    const used = new Set(gated.map(permissionFor));
    const serverPerms = require('fs')
      .readFileSync(require('path').join(__dirname, '..', 'server', 'app.cjs'), 'utf8')
      .match(/const CLERK_PERMISSIONS = \[([^\]]+)\]/)[1]
      .match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
    const unused = serverPerms.filter(p => !used.has(p));
    ok('every permission gates at least one route', unused.length === 0);
    console.log(`  ${unused.length === 0 ? 'PASS' : 'FAIL'}  every permission gates at least one route`);
    if (unused.length) console.log('        granted in the UI but gating nothing: ' + unused.join(', '));

    // =================================================================
    section('The destructive few');
    // Named explicitly rather than derived: these are the routes where being
    // wrong costs the college its records, so the expectation is written down
    // and not inferred from the code being tested.
    const CRITICAL = [
      ['POST', '/api/authenticator/wipe-database', ['authenticator']],
      ['DELETE', '/api/authenticator/purge-student-faculty-data', ['authenticator']],
      ['POST', '/api/backup/restore', ['authenticator', 'admin1']],
      // The Rector holds credential control by design, so admin1 belongs
      // here. What must NOT be possible is admin1 using it to take the
      // authenticator account, which is checked separately below.
      ['POST', '/api/authenticator/reset-password', ['authenticator', 'admin1']],
      ['DELETE', '/api/admin1/students/:id', ['admin1', 'clerk', 'accountant']],
      ['POST', '/api/admin1/clerks', ['admin1']],
      ['PUT', '/api/admin1/credentials/:id', ['admin1']]
    ];
    const criticalLeaks = [];
    for (const [method, path, allowed] of CRITICAL) {
      const declared = routes.find(r => r.method === method && r.path === path);
      if (!declared) { criticalLeaks.push(`${method} ${path} — route not found; has it been renamed?`); continue; }
      const actual = rolesFor(declared) || [];
      const extra = actual.filter(x => !allowed.includes(x) && !(x === 'admin2' && allowed.includes('clerk')));
      if (extra.length) criticalLeaks.push(`${method} ${path} also admits ${extra.join(', ')}`);
      for (const a of ACCOUNTS) {
        if (allowed.includes(a.role)) continue;
        const res = await req(method, concrete(path), tokens[a.role]);
        if (res.status !== 403 && res.status !== 401) {
          criticalLeaks.push(`${a.role} reached ${method} ${path} = ${res.status}`);
        }
      }
    }
    ok('the destructive routes admit only the roles named here', criticalLeaks.length === 0);

    // The Rector may reset any password except the one that could be used to
    // lock the Rector out — otherwise "full credential control" quietly means
    // "can seize every account including the one that audits it".
    // Aimed at the THROWAWAY authenticator, never the college's own. If the
    // protection were broken this request would succeed, and pointing it at
    // the real account would hand the Rector a password the operator does not
    // know. It also proves the check works on role rather than on one
    // hardcoded username, since this account is not that username.
    const seize = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        username: ACCOUNTS.find(a => a.role === 'authenticator').username,
        password: 'ShouldNeverBeAccepted-9x'
      });
      const rq = http.request(`${BASE}/api/authenticator/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
                   Authorization: `Bearer ${tokens.admin1}` }
      }, res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, raw })); });
      rq.on('error', reject); rq.write(body); rq.end();
    });
    ok('the Rector cannot reset an authenticator password', seize.status === 403);
    console.log(`  ${seize.status === 403 ? 'PASS' : 'FAIL'}  the Rector cannot reset an authenticator password  (status ${seize.status})`);
    console.log(`  ${criticalLeaks.length === 0 ? 'PASS' : 'FAIL'}  the destructive routes admit only the roles named here  (${CRITICAL.length} routes)`);
    if (criticalLeaks.length) console.log('        ' + criticalLeaks.join('\n        '));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 4 — AUTHORIZATION: ${pass} passed, ${fail} failed`);
    if (fail) console.log(failures.join('\n'));
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    for (const a of ACCOUNTS) {
      if (a.username) {
        await users.deleteOne({ username: a.username });
        await mongoose.connection.collection('refreshtokens').deleteMany({ username: a.username });
        await mongoose.connection.collection('loginattempts').deleteMany({ key: `login:${a.username}` });
      }
    }
    await clearLimits();
    console.log(`  (four throwaway accounts removed)`);
    server.close();
    await mongoose.disconnect();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
