/**
 * Does the server actually come back after it dies?
 *
 * The server exits on an uncaught exception by design. That is only the right
 * trade if a clean process replaces it — so this kills the child outright and
 * checks the site is serving again afterwards, which is the difference between
 * a blip and an outage nobody notices until Monday.
 *
 * Kills used deliberately:
 *   SIGKILL — the child cannot catch it, so this is the harshest case: no
 *             graceful shutdown, no cleanup, the process simply stops.
 *   SIGTERM on the supervisor — the ordinary stop, which must NOT restart.
 */
require('dotenv').config();
const { fork } = require('child_process');
const path = require('path');

let pass = 0, fail = 0;
const ok = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${d ? '  — ' + d : ''}`); return; }
  fail++; console.log(`  FAIL  ${n}${d ? '  — ' + d : ''}`);
};

const PORT = process.env.SUP_TEST_PORT || '4631';
const BASE = `http://127.0.0.1:${PORT}`;
let supervisor = null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function health() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.status;
  } catch { return 0; }
}

/** Poll until the server answers, or give up. */
async function waitForUp(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await health() === 200) return true;
    await sleep(400);
  }
  return false;
}

/** The child PID, read from the supervisor's own log line. */
let childPid = null;

async function main() {
  console.log('\n========================================================');
  console.log('SUPERVISOR — does it come back?');
  console.log('========================================================\n');

  // Forked WITH the heap flag, exactly as `npm start` runs node. This is the
  // whole point of the check below: fork() does not pass V8 flags to the child
  // it spawns, so the supervised server once lost its ceiling, sized its heap
  // from total machine memory, and was killed by the platform. Supervising
  // without reproducing that launch would test the restart and miss the bug
  // that made supervision dangerous in the first place.
  supervisor = fork(path.join(__dirname, '..', 'server', 'supervisor.cjs'), [], {
    env: { ...process.env, PORT },
    execArgv: ['--max-old-space-size=1536'],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });

  const seen = [];
  const capture = buf => {
    const text = String(buf);
    seen.push(text);
    const m = text.match(/started child PID (\d+)/);
    if (m) childPid = Number(m[1]);
  };
  supervisor.stdout.on('data', capture);
  supervisor.stderr.on('data', capture);

  ok('the server comes up under the supervisor', await waitForUp(45000));
  ok('the supervisor reported its child PID', !!childPid, String(childPid));
  if (!childPid) return;

  // The child prints its own ceiling at boot. Reading it back is the only way
  // to know the flag survived the fork rather than assuming it did.
  const ceiling = /heap ceiling (\d+)MB/.exec(seen.join(''));
  ok('the supervised child reports a heap ceiling', !!ceiling,
    'the boot line is missing, so the ceiling cannot be confirmed');
  ok(`the ceiling survived the fork (${ceiling ? ceiling[1] : '?'}MB)`,
    !!ceiling && Number(ceiling[1]) < 2500,
    `${ceiling ? ceiling[1] : 'unknown'}MB — the child sized its heap from machine memory, `
    + 'which is what took the site down when supervision was first made the default');

  console.log('\n1. The harshest case — SIGKILL the child, no chance to clean up\n');

  const pidBefore = childPid;
  process.kill(pidBefore, 'SIGKILL');
  await sleep(1500);

  const downAt = await health();
  ok('the server is briefly unavailable after being killed', downAt !== 200, `HTTP ${downAt}`);

  const recovered = await waitForUp(45000);
  ok('it comes back on its own', recovered);
  ok('it is a NEW process, not the corpse', childPid !== pidBefore, `${pidBefore} -> ${childPid}`);

  const after = await health();
  ok('it is serving normally again', after === 200, `HTTP ${after}`);

  console.log('\n2. A second kill — recovery is repeatable, not a one-off\n');

  const pidSecond = childPid;
  process.kill(pidSecond, 'SIGKILL');
  await sleep(1500);
  ok('it recovers a second time', await waitForUp(45000));
  ok('again a fresh process', childPid !== pidSecond, `${pidSecond} -> ${childPid}`);

  console.log('\n3. A deliberate stop must STAY stopped\n');

  const exited = new Promise(resolve => supervisor.on('exit', code => resolve(code)));
  supervisor.kill('SIGTERM');
  const code = await Promise.race([exited, sleep(15000).then(() => 'timeout')]);
  ok('the supervisor exits on SIGTERM rather than restarting', code !== 'timeout', `exit ${code}`);
  await sleep(2000);
  const afterStop = await health();
  ok('nothing is left serving after a deliberate stop', afterStop !== 200, `HTTP ${afterStop}`);

  supervisor = null;

  console.log('\n   supervisor log:');
  seen.join('').split('\n').filter(l => l.includes('[Supervisor]')).forEach(l => console.log('     ' + l.trim()));

  console.log('\n========================================================');
  console.log(`${pass} passed, ${fail} failed`);
  console.log('========================================================\n');
}

main()
  .catch(e => { console.error('Suite crashed:', e); fail++; })
  .finally(async () => {
    try { if (supervisor) supervisor.kill('SIGKILL'); } catch {}
    try { if (childPid) process.kill(childPid, 'SIGKILL'); } catch {}
    process.exit(fail > 0 ? 1 : 0);
  });
