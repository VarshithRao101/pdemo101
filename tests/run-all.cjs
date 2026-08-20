/**
 * Runs every verification suite and reports one number.
 *
 * The point of a single command is that it gets run. Twenty-eight files that
 * each have to be remembered is a suite that decays; one that decays silently
 * is worse than none, because it still looks like coverage.
 *
 *   node tests/run-all.cjs           every suite
 *   node tests/run-all.cjs --fast    skips the slow ones, named below
 *
 * Suites that WRITE use the scratch database jc_erp_verify and drop it. The
 * read-only ones run against whatever MONGODB_DB_NAME points at, which is the
 * live database by default — they are marked so, and none of them writes.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FAST = process.argv.includes('--fast');

// Slow because they start and kill processes, or make hundreds of requests.
const SLOW = new Set(['verify-resilience', 'verify-supervisor', 'verify-injection', 'verify-outage']);

const files = fs.readdirSync(__dirname)
  .filter(f => f.startsWith('verify-') && f.endsWith('.cjs'))
  .sort();

const results = [];
let totalPass = 0, totalFail = 0, skipped = 0;

console.log(`\nRunning ${files.length} suites${FAST ? ' (fast: slow suites skipped)' : ''}\n`);

for (const file of files) {
  const name = file.replace(/\.cjs$/, '');
  if (FAST && SLOW.has(name)) {
    results.push({ name, status: 'skipped' });
    skipped++;
    console.log(`  ....  ${name.padEnd(30)} skipped`);
    continue;
  }

  const started = Date.now();
  const run = spawnSync(process.execPath, [path.join(__dirname, file)], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 15 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  const out = `${run.stdout || ''}${run.stderr || ''}`;

  // Every suite prints "N passed, M failed" as its last word.
  const tally = [...out.matchAll(/(\d+) passed, (\d+) failed/g)].pop();
  const passed = tally ? Number(tally[1]) : 0;
  const failed = tally ? Number(tally[2]) : null;

  totalPass += passed;
  if (failed !== null) totalFail += failed;

  const bad = run.status !== 0 || failed === null || failed > 0;
  results.push({ name, passed, failed, seconds, bad, out });
  console.log(`  ${bad ? 'FAIL' : 'PASS'}  ${name.padEnd(30)} ` +
    `${tally ? `${passed} passed, ${failed} failed` : 'NO RESULT'}  (${seconds}s)`);
}

console.log(`\n${'='.repeat(66)}`);
console.log(`TOTAL: ${totalPass} assertions passed, ${totalFail} failed` +
  `${skipped ? `, ${skipped} suite(s) skipped` : ''}`);
console.log('='.repeat(66));

const broken = results.filter(r => r.bad);
if (broken.length) {
  console.log(`\n${broken.length} suite(s) did not pass:\n`);
  for (const r of broken) {
    console.log(`--- ${r.name} ---`);
    // Only the failing lines, so one broken suite does not bury the rest.
    const lines = (r.out || '').split('\n').filter(l => /FAIL|ERROR/.test(l));
    console.log(lines.slice(0, 12).join('\n') || '(no failure lines; the suite exited early)');
    console.log('');
  }
}

process.exit(broken.length === 0 ? 0 : 1);
