/**
 * Phase 24 — the public surface and secrets hygiene.
 *
 * Everything a stranger can reach without an account, and everything the
 * college ships to a browser. Two questions:
 *
 *   What can be reached, and what does it give away?
 *   What went into the repository and the built bundle that should not have?
 *
 * The repository is public. A secret committed to it is a secret published,
 * and rotating it afterwards does not un-publish the history.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('../server/app.cjs');
const { loadRoutes } = require('./lib/routes.cjs');

const PORT = 4624;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const note = (name, detail = '') => console.log(`  NOTE  ${name}${detail ? '\n        ' + detail : ''}`);
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, p) => new Promise(resolve => {
  const r = http.request(`${BASE}${p}`, { method }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({ status: res.statusCode, raw, headers: res.headers }));
  });
  r.on('error', err => resolve({ status: 0, raw: String(err.message), headers: {} }));
  r.end();
});

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 24 — PUBLIC SURFACE AND SECRETS HYGIENE\n');

  try {
    // =================================================================
    section('What a stranger can reach');

    // Derived from the route parse, so a route added later is included
    // automatically rather than remembered.
    const reachable = loadRoutes().filter(r => !r.chain.includes('authenticateToken'));
    const unique = [...new Set(reachable.map(r => `${r.method} ${r.path}`))].sort();
    console.log(`        ${unique.length} route bindings need no token:`);
    unique.forEach(u => console.log(`          ${u}`));

    // The exhaustive list of what MAY be public, with the reason. Anything
    // else appearing here is a hole, and adding one means writing down why.
    const ALLOWED = [
      /^POST (\/api)?(\/auth)?\/(login|logout|refresh|force-login|verify-credentials)$/,
      /^POST \/api\/enquiries$/,
      /^GET \/api\/health$/,
      /^(GET|POST) \/r\/:receiptNumber\/:token$/,
      /^GET \/r-print\.js$/,
      /^GET \*$/
    ];
    const unexpected = unique.filter(u => !ALLOWED.some(re => re.test(u)));
    ok('nothing unexpected is reachable without a token', unexpected.length === 0,
      unexpected.join('\n        '));

    // =================================================================
    section('Security headers');

    const page = await req('GET', '/api/health');
    const H = page.headers;
    const HEADERS = [
      ['content-security-policy', /default-src/, 'a content security policy'],
      ['x-content-type-options', /nosniff/, 'nosniff'],
      ['x-frame-options|content-security-policy', /(sameorigin|deny|frame-ancestors)/i, 'clickjacking protection'],
      ['strict-transport-security', /max-age/, 'HSTS']
    ];
    for (const [name, re, label] of HEADERS) {
      const value = name.split('|').map(n => H[n]).filter(Boolean).join(' ');
      ok(`${label} is set`, re.test(String(value)), `${name}: ${value || '(absent)'}`);
    }
    ok('the server does not advertise what it runs on',
      !H['x-powered-by'], `x-powered-by: ${H['x-powered-by']}`);

    const csp = String(H['content-security-policy'] || '');
    ok('scripts may only come from this origin', /script-src[^;]*'self'/.test(csp), csp.slice(0, 200));
    ok('inline script is not allowed', !/script-src[^;]*'unsafe-inline'/.test(csp),
      'unsafe-inline in script-src makes most XSS defences decorative');
    ok('objects are blocked entirely', /object-src[^;]*'none'/.test(csp), csp.slice(0, 200));

    // =================================================================
    section('The receipt link gives nothing away before the digits');

    const gate = await req('GET', '/r/REC-does-not-exist/aaaaaaaaaaaaaaaaaaaaaa');
    ok('an invalid receipt token is refused', gate.status === 404, `status ${gate.status}`);
    ok('the refusal says nothing about whether the receipt exists',
      !/exists|found in|no such receipt number/i.test(gate.raw) || /may be incorrect/.test(gate.raw),
      gate.raw.slice(0, 160));
    ok('the receipt route is never cached',
      /no-store/.test(String(gate.headers['cache-control'] || '')),
      `cache-control: ${gate.headers['cache-control']}`);
    ok('the receipt route is kept out of search engines',
      /noindex/.test(String(gate.headers['x-robots-tag'] || '')),
      `x-robots-tag: ${gate.headers['x-robots-tag']}`);

    // =================================================================
    section('Nothing secret went into the repository');

    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    for (const entry of ['.env', 'node_modules', 'dist']) {
      ok(`${entry} is ignored by git`, new RegExp(`^\\s*/?${entry.replace('.', '\\.')}`, 'm').test(gitignore),
        `not in .gitignore`);
    }

    const { execSync } = require('child_process');
    const tracked = execSync('git ls-files', { cwd: ROOT }).toString().split('\n').filter(Boolean);
    // .env.example is tracked ON PURPOSE and is the one exception.
    //
    // It used to be caught by `*.env*` in .gitignore and had never been
    // committed - which is how OPS_PASSWORD_HASH came to be set on the live
    // server and absent from the template, leaving wipe, purge and restore
    // quietly answering 503 on any deployment built from it. It carries names
    // and comments, never values; the secret scan below runs over every tracked
    // file and is what actually guards that.
    const ENV_TEMPLATE = /(^|\/)\.env\.example$/;

    const dangerous = tracked.filter(f =>
      ENV_TEMPLATE.test(f) ? false :
      /(^|\/)\.env($|\.)/.test(f) ||
      /\.(pem|key|p12|pfx)$/.test(f) ||
      /(^|\/)(credentials|service-account|serviceAccount)\.json$/i.test(f));
    ok('no environment file, key or service account is tracked', dangerous.length === 0,
      dangerous.join(', '));

    // The real secrets from this environment, searched for in every tracked
    // file. This is the check that matters: not "does it look like a secret"
    // but "is THIS secret in there".
    const SECRET_VALUES = [
      process.env.JWT_SECRET, process.env.MONGODB_URI,
      process.env.OPS_PASSWORD_HASH, process.env.ENCRYPTION_KEY,
      process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_PRIVATE_KEY
    ].filter(v => typeof v === 'string' && v.length >= 16);
    ok(`there are secrets configured to check for (${SECRET_VALUES.length})`,
      SECRET_VALUES.length > 0, 'nothing to search for, so this proves nothing');

    const committed = [];
    for (const rel of tracked) {
      const full = path.join(ROOT, rel);
      let body;
      try { body = fs.readFileSync(full, 'utf8'); } catch { continue; }
      for (const secret of SECRET_VALUES) {
        if (body.includes(secret)) committed.push(`${rel} contains a live secret`);
      }
    }
    ok(`no live secret appears in any tracked file (${tracked.length} files)`,
      committed.length === 0, [...new Set(committed)].join('\n        '));

    // =================================================================
    section('Nothing secret went into the browser bundle');

    const distDir = path.join(ROOT, 'dist');
    if (!fs.existsSync(distDir)) {
      note('dist/ is not built, so the bundle could not be checked');
    } else {
      const bundleFiles = [];
      const walk = d => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, e.name);
          if (e.isDirectory()) walk(full);
          else if (/\.(js|css|html|map)$/.test(e.name)) bundleFiles.push(full);
        }
      };
      walk(distDir);

      const inBundle = [];
      for (const file of bundleFiles) {
        const body = fs.readFileSync(file, 'utf8');
        for (const secret of SECRET_VALUES) {
          if (body.includes(secret)) inBundle.push(`${path.relative(ROOT, file)} contains a live secret`);
        }
        if (/mongodb(\+srv)?:\/\//.test(body)) inBundle.push(`${path.relative(ROOT, file)} contains a connection string`);
      }
      ok(`no secret reached the browser bundle (${bundleFiles.length} files)`,
        inBundle.length === 0, [...new Set(inBundle)].join('\n        '));

      const hasMaps = bundleFiles.filter(f => f.endsWith('.map'));
      if (hasMaps.length) {
        note(`${hasMaps.length} source map(s) are shipped`,
          'they publish the original source; harmless for this app, but worth knowing');
      } else {
        ok('no source maps are shipped', true);
      }
    }

    // =================================================================
    section('The SPA fallback does not serve the server');

    // A path-traversal through the catch-all would hand out server source.
    const TRAVERSAL = [
      '/../server/app.cjs',
      '/%2e%2e/server/app.cjs',
      '/..%2f..%2fserver%2fapp.cjs',
      '/.env',
      '/server/app.cjs',
      '/package.json'
    ];
    const served = [];
    for (const p of TRAVERSAL) {
      const res = await req('GET', p);
      if (res.status === 200 && /(MONGODB_URI|JWT_SECRET|require\('mongoose'\)|app\.post\()/.test(res.raw)) {
        served.push(`${p} -> ${res.status}`);
      }
    }
    ok('no traversal serves server source or configuration', served.length === 0,
      served.join('\n        '));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 24 — PUBLIC SURFACE: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
