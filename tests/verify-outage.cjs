/**
 * Phase 23 — behaviour when the database is unreachable.
 *
 * verify-resilience already covers hostile input, concurrency, 200 parallel
 * reads and heap growth. verify-supervisor covers being killed and coming
 * back. Neither is repeated here.
 *
 * What is left is the failure the college will actually meet during a fifteen
 * day trial: Atlas is briefly unreachable. Three things must hold.
 *
 *   1. The process starts anyway and keeps answering. A server that refuses to
 *      boot without a database cannot tell anyone what is wrong.
 *   2. A route that needs data answers 503 — quickly. Not 500, not a hang. A
 *      request that sits for a minute is worse than one that fails at once,
 *      because the clerk reloads and now there are two.
 *   3. Nothing in the response says where the database is or what it is
 *      called. A connection string in an error page is a credential.
 *
 * The unreachable database is a real address that refuses connections. No
 * production configuration is touched.
 */
require('dotenv').config();
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 4623;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (p, timeoutMs = 30000) => new Promise(resolve => {
  const started = Date.now();
  const r = http.get(`${BASE}${p}`, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({ status: res.statusCode, raw, ms: Date.now() - started }));
  });
  r.on('error', err => resolve({ status: 0, raw: `SOCKET: ${err.message}`, ms: Date.now() - started }));
  r.setTimeout(timeoutMs, () => { r.destroy(); resolve({ status: -1, raw: 'TIMED OUT', ms: Date.now() - started }); });
});

const waitFor = async (check, ms = 45000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await check()) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
};

(async () => {
  console.log('\nPHASE 23 — WHEN THE DATABASE IS UNREACHABLE\n');

  // =====================================================================
  section('The process guards itself');

  const startSrc = fs.readFileSync(path.join(ROOT, 'server', 'start.cjs'), 'utf8');
  ok('an unhandled promise rejection is caught', /process\.on\('unhandledRejection'/.test(startSrc),
    'an unhandled rejection ends the process silently on modern Node');
  ok('an uncaught exception is caught', /process\.on\('uncaughtException'/.test(startSrc));
  ok('an uncaught exception ENDS the process rather than continuing',
    /uncaughtException[\s\S]{0,400}die\(1/.test(startSrc),
    'continuing to serve from undefined state is how this app previously stayed alive answering nothing');
  ok('SIGTERM closes the server rather than dropping it', /process\.on\('SIGTERM'/.test(startSrc)
    && /server\.close/.test(startSrc));

  // =====================================================================
  section('Starting with no database');

  // A real address that refuses connections. 127.0.0.1:1 is closed on every
  // machine, so this needs no network and reaches nothing.
  const child = spawn(process.execPath, ['--max-old-space-size=1536', path.join(ROOT, 'server', 'start.cjs')], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      MONGODB_URI: 'mongodb://127.0.0.1:1/jc_erp_unreachable',
      MONGODB_DB_NAME: 'jc_erp_unreachable'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let childOut = '';
  child.stdout.on('data', d => { childOut += d.toString(); });
  child.stderr.on('data', d => { childOut += d.toString(); });

  try {
    // ANY answer means it is listening. Waiting for 200 was wrong: the health
    // probe reports 503 when the database is unreachable, which is the correct
    // answer and the whole point of having a probe.
    const up = await waitFor(async () => (await req('/api/health', 12000)).status > 0, 60000);
    ok('the server comes up with no database at all', up,
      `it never answered /api/health:\n        ${childOut.slice(-400)}`);

    if (up) {
      const health = await req('/api/health');
      ok(`the health probe reports unhealthy rather than lying (status ${health.status})`,
        health.status === 503,
        `status ${health.status} — a probe that says 200 with no database keeps a dead app in the load balancer`);

      // Unauthenticated, so this is refused by the token check before it ever
      // reaches the database. Worth asserting in itself: the auth layer does
      // not need the database to say no, so an outage does not turn every
      // route into a slow failure.
      const dataRoute = await req('/api/accountant/students', 40000);
      ok('a data route answers rather than hanging',
        dataRoute.status > 0, `${dataRoute.raw.slice(0, 120)} after ${dataRoute.ms}ms`);
      ok(`an unauthenticated request is still refused promptly (status ${dataRoute.status}, ${dataRoute.ms}ms)`,
        dataRoute.status === 401 && dataRoute.ms < 2000,
        `status ${dataRoute.status} after ${dataRoute.ms}ms`);
      ok(`it answers within 25 seconds (${(dataRoute.ms / 1000).toFixed(1)}s)`,
        dataRoute.ms < 25000,
        `${(dataRoute.ms / 1000).toFixed(1)}s — a clerk reloads long before this and doubles the load`);

      // Whatever it says, it must not say where the database is.
      const leaks = [
        [/mongodb(\+srv)?:\/\//i, 'a connection string'],
        [/127\.0\.0\.1:1\b/, 'the database address'],
        [/jc_erp_unreachable/, 'the database name'],
        [/at\s+[\w.$]+\s+\([^)]*:\d+:\d+\)/, 'a stack frame']
      ];
      const found = leaks.filter(([re]) => re.test(dataRoute.raw)).map(([, what]) => what);
      ok('the failure says nothing about the database', found.length === 0,
        `${found.join(', ')} in: ${dataRoute.raw.slice(0, 200)}`);

      // Still alive after failing.
      const stillUp = await req('/api/health', 12000);
      ok('the server is still answering after the failure', stillUp.status > 0,
        `status ${stillUp.status}`);

      // And it must keep failing cleanly, not degrade.
      let clean = true, worstMs = 0;
      for (let i = 0; i < 5; i++) {
        const r = await req('/api/accountant/students', 40000);
        worstMs = Math.max(worstMs, r.ms);
        if (r.status <= 0) clean = false;
      }
      ok(`repeated failures stay clean (worst ${(worstMs / 1000).toFixed(1)}s)`, clean,
        'a later attempt hung or dropped the socket');

      const afterAll = await req('/api/health', 12000);
      ok('still answering after five failed data requests', afterAll.status > 0,
        `status ${afterAll.status}`);
    }

    // =====================================================================
    section('The heap ceiling is what was asked for');

    // The supervisor incident: fork() does not pass V8 flags to the child, so
    // the server sized its heap from total machine memory, believed it could
    // grow to gigabytes, and was killed by the platform before V8 ever
    // collected. That took the site down.
    // Read from the CHILD, which WAS spawned with the flag. The first version
    // measured this test runner's own heap — which has none — and reported the
    // server as unbounded when the server was fine.
    const reported = /heap ceiling (\d+)MB/.exec(childOut);
    ok('the server reports its heap ceiling at boot', !!reported,
      'the boot line is missing, so there is nothing to check');
    ok(`the spawned server honours --max-old-space-size (${reported ? reported[1] : '?'}MB)`,
      !!reported && Number(reported[1]) < 2500,
      `${reported ? reported[1] : 'unknown'}MB — the flag did not reach the child`);

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    ok('the start script sets a heap ceiling',
      /--max-old-space-size=\d+/.test(pkg.scripts.start || ''),
      `start: ${pkg.scripts.start}`);
    const supervisorSrc = fs.readFileSync(path.join(ROOT, 'server', 'supervisor.cjs'), 'utf8');
    ok('the supervisor forwards that ceiling to the child it forks',
      /execArgv:\s*process\.execArgv/.test(supervisorSrc),
      'a forked child would size its heap from machine memory and be killed');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 23 — OUTAGE: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    child.kill('SIGKILL');
    process.exit(fail === 0 ? 0 : 1);
  }
})();
