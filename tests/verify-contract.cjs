/**
 * Phase 1 — route and contract inventory.
 *
 * Reads the server and the frontend as text and checks that the two agree,
 * without starting either. Three questions:
 *
 *   1. Does every route carry the guards its shape implies? A mutating route
 *      with no authentication, no role check and no audit call is a hole,
 *      whether or not anyone has found it yet.
 *   2. Does every call the frontend makes resolve to a route that exists?
 *      A typo here is a button that fails only when a user presses it.
 *   3. Does every route have a caller? An endpoint nobody calls is attack
 *      surface with no purpose, and usually the residue of a rename.
 *
 * Static analysis on purpose: it covers ALL 124 path bindings rather than the
 * handful a live test would exercise, and it cannot be fooled by a route that
 * happens not to be reached during a run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVER = fs.readFileSync(path.join(ROOT, 'server', 'app.cjs'), 'utf8');

let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else {
    fail++; failures.push(name);
    console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
  }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const { readRoutes, stripComments } = require('./lib/routes.cjs');

const routes = readRoutes(stripComments(SERVER));
const has = (r, name) => r.chain.includes(name);
const isWrite = r => r.method !== 'GET';

section('Inventory');
ok('routes parse out of app.cjs', routes.length > 100, `${routes.length} bindings`);
console.log(`        ${routes.length} path bindings, ${new Set(routes.map(r => r.method + ' ' + r.path)).size} distinct`);
ok('every route captured a handler body', routes.every(r => r.body.length > 40),
  routes.filter(r => r.body.length <= 40).map(r => `${r.method} ${r.path}`).join(', '));

// --- Deliberately public -------------------------------------------------
//
// Each entry states WHY. An undeclared public route fails, so the only way to
// add one is to write down the reason.
// Several auth routes are bound under three aliases (/api/auth/x, /auth/x and
// /api/x), so these match the verb rather than one spelling.
const PUBLIC = [
  [/^POST (\/api)?(\/auth)?\/login$/, 'issues the token; cannot itself require one'],
  [/^POST (\/api)?(\/auth)?\/refresh$/, 'exchanges a refresh token, checked in the handler'],
  [/^POST (\/api)?(\/auth)?\/logout$/, 'clearing a session must work even with a dead token'],
  [/^POST (\/api)?(\/auth)?\/force-login$/, 'takes over a session; the password is checked in the handler'],
  [/^POST (\/api)?(\/auth)?\/verify-credentials$/, 'checks a credential before issuing anything'],
  [/^POST \/api\/enquiries$/, 'the public website enquiry form; a prospective parent has no account'],
  [/^GET \/api\/health$/, 'liveness probe, returns no data'],
  [/^GET \/r\/:receiptNumber\/:token$/, 'parent receipt gate: static form, reads nothing'],
  [/^POST \/r\/:receiptNumber\/:token$/, 'the same link plus 4 digits; HMAC and digits both checked'],
  [/^GET \/r-print\.js$/, 'static print helper, returns no data'],
  [/^GET \*$/, 'SPA fallback, serves index.html']
];
const publicReason = r => {
  const key = `${r.method} ${r.path}`;
  const hit = PUBLIC.find(([re]) => re.test(key));
  return hit ? hit[1] : null;
};

section('Authentication');
const unauth = routes.filter(r => !has(r, 'authenticateToken') && !publicReason(r));
ok('every route is authenticated or declared public', unauth.length === 0,
  unauth.map(r => `${r.method} ${r.path}  (app.cjs:${r.line})`).join('\n        '));

section('Authorization');

// Routes every signed-in account may reach whatever its role. Declared for the
// same reason as PUBLIC: the exception has to be written down to exist.
const ROLE_FREE = [
  [/^GET (\/api)?(\/auth)?\/me$/, 'an account reading itself; the token already names it'],
  [/^GET \/api\/system\/last-changed$/, 'a freshness timestamp for every portal, campus scoped in the handler'],

  // Both of these have always been role-free and neither was ever declared,
  // so this assertion has been failing quietly - verify-contract needs a live
  // database and therefore never runs in CI, which is exactly the gap that
  // lets a red suite sit unread.
  //
  // They are correct as they are. An account reading or changing its OWN
  // credentials is not a role question: the token names the account, and the
  // handler acts on that account and no other. Adding requireRole would mean
  // listing every role in the system and updating it whenever one is added.
  [/^GET \/api\/account\/session$/, 'an account reading its own session; the token names it'],

  // This one matters more than it looks. It is now the ONLY way the security
  // authenticator can rotate its credentials - the Rector is refused on all
  // three of the other doors - so a requireRole here that omitted
  // 'authenticator' would silently strand that account again.
  [/^POST \/api\/account\/password$/, 'an account changing its own password and PIN, proving identity with the current password']
];
const roleFree = r => ROLE_FREE.some(([re]) => re.test(`${r.method} ${r.path}`));

const noRole = routes.filter(r => has(r, 'authenticateToken') && !has(r, 'requireRole') && !roleFree(r));
ok('every authenticated route names the roles it serves', noRole.length === 0,
  noRole.map(r => `${r.method} ${r.path}  (app.cjs:${r.line})`).join('\n        '));

// A clerk reaching a write route without a permission gate is the failure mode
// that made every clerk silently powerless once before; it must be deliberate.
const clerkWrites = routes.filter(r =>
  isWrite(r) && /requireRole\([^)]*'clerk'/.test(r.chain) && !has(r, 'requirePermission'));
ok('every clerk-writable route is permission gated', clerkWrites.length === 0,
  clerkWrites.map(r => `${r.method} ${r.path}  (app.cjs:${r.line})`).join('\n        '));

section('Audit trail');
const unaudited = routes.filter(r =>
  isWrite(r) && has(r, 'authenticateToken') && !/recordAudit\s*\(/.test(r.body));
ok('every authenticated write records an audit entry', unaudited.length === 0,
  unaudited.map(r => `${r.method} ${r.path}  (app.cjs:${r.line})`).join('\n        '));

section('Failure handling');
const unguarded = routes.filter(r => /await\s+\w+\.(find|create|updateOne|deleteOne|findOne)/.test(r.body)
  && !/try\s*{/.test(r.body));
ok('every route touching the database has a try block', unguarded.length === 0,
  unguarded.map(r => `${r.method} ${r.path}  (app.cjs:${r.line})`).join('\n        '));

const leaky = routes.filter(r => /res\.[^;]*\berr\.stack\b/.test(r.body));
ok('no route returns a stack trace to the caller', leaky.length === 0,
  leaky.map(r => `${r.method} ${r.path}`).join(', '));

// --- Reading the frontend ------------------------------------------------

section('Frontend to server');

/** Every path the frontend asks for, normalised so `${id}` becomes a param. */
function readCalls() {
  const calls = [];
  const files = [];
  for (const dir of ['src/services', 'src/views', 'src/hooks']) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (/\.tsx?$/.test(f)) files.push(path.join(dir, f));
    }
  }
  for (const rel of files) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const re = /apiClient\.(get|post|patch|put|delete)(?:<[^>]*>)?\(\s*(`[^`]*`|'[^']*')/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      // A `${...}` that follows a slash is a path parameter. One that follows
      // anything else is a query suffix the call builds inline — as in
      // `/accountant/students${branch ? '?branch=' + b : ''}` — and everything
      // from there on belongs to the query string, not the path.
      let p = m[2].slice(1, -1);
      const suffix = p.search(/[^/]\$\{/);
      if (suffix >= 0) p = p.slice(0, suffix + 1);
      p = p
        .replace(/\$\{[^}]*\}/g, ':param')
        .replace(/\?.*$/, '')
        .replace(/\/$/, '');
      calls.push({
        method: m[1].toUpperCase(),
        path: '/api' + (p.startsWith('/') ? p : '/' + p),
        file: rel,
        line: src.slice(0, m.index).split('\n').length
      });
    }
  }
  return calls;
}

const calls = readCalls();
ok('frontend API calls were found', calls.length > 30, `${calls.length} call sites`);

/** Does a concrete request path match a declared route pattern? */
const matches = (callPath, routePath) => {
  const a = callPath.split('/'), b = routePath.split('/');
  if (a.length !== b.length) return false;
  return b.every((seg, i) => seg.startsWith(':') || seg === a[i] || a[i] === ':param');
};

const orphanCalls = calls.filter(c =>
  !routes.some(r => r.method === c.method && matches(c.path, r.path)));
ok('every frontend call resolves to a real route', orphanCalls.length === 0,
  orphanCalls.map(c => `${c.method} ${c.path}  (${c.file}:${c.line})`).join('\n        '));

const called = new Set();
for (const c of calls) {
  for (const r of routes) if (r.method === c.method && matches(c.path, r.path)) called.add(r.method + ' ' + r.path);
}

// Routes nothing calls. Not automatically a fault — some are deliberately
// reachable only by hand — so this reports rather than fails, and Phase 4
// decides each one.
const uncalled = routes.filter(r => !called.has(r.method + ' ' + r.path) && !publicReason(r));
console.log(`\n  NOTE  ${uncalled.length} routes have no frontend caller:`);
uncalled.forEach(r => console.log(`          ${r.method} ${r.path}  (app.cjs:${r.line})`));

// --- Result --------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
console.log(`PHASE 1 — CONTRACT: ${pass} passed, ${fail} failed`);
if (fail) console.log('Failed: ' + failures.join(' | '));
console.log('='.repeat(60));
process.exit(fail === 0 ? 0 : 1);
