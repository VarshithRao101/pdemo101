#!/usr/bin/env node
/**
 * crashLog.cjs — why did the server stop?
 *
 * Reads the `lifecycle` collection, which the server writes to on every boot
 * and every exit it is aware of, and prints the history with the one thing
 * that actually identifies a fault: what happened between one process ending
 * and the next one starting.
 *
 * Usage:
 *   node scripts/crashLog.cjs           # the last 40 events
 *   node scripts/crashLog.cjs --days 7  # everything in the last week
 *
 * READING IT
 *
 *   boot, then exit(SIGTERM/signal)   A redeploy, a plan-level stop, or an
 *                                     operator restart. Expected and healthy;
 *                                     the platform asked it to stop.
 *
 *   boot, then exit(uncaughtException) The application threw outside any
 *                                     request handler. The runtime log has the
 *                                     stack. This is a bug to fix.
 *
 *   boot, then ANOTHER boot with no    The process was killed outright with no
 *   exit in between                    chance to react — SIGKILL, an OOM kill,
 *                                      or the platform pulling it. Nothing in
 *                                      the app can log this, which is exactly
 *                                      why the gap is the signal.
 *
 *   an exit with no boot after it      Nothing restarted the process. The site
 *                                      stayed down until someone started it by
 *                                      hand — and it means exiting on a
 *                                      recoverable fault is the wrong trade
 *                                      here, because there is no supervisor to
 *                                      take over.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const daysArg = args.indexOf('--days');
const days = daysArg !== -1 ? Number(args[daysArg + 1]) || 7 : null;

const pad = (s, n) => String(s).padEnd(n);
const dur = (s) => (s == null ? '—' : s < 90 ? `${s}s` : `${(s / 60).toFixed(1)}m`);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod',
    serverSelectionTimeoutMS: 8000
  });

  const filter = days ? { at: { $gte: new Date(Date.now() - days * 86400000) } } : {};
  const rows = await mongoose.connection.collection('lifecycle')
    .find(filter).sort({ at: 1 }).limit(days ? 5000 : 40).toArray();

  if (rows.length === 0) {
    console.log('\nNo lifecycle records yet.\n');
    console.log('The server writes one on every boot and every exit it notices.');
    console.log('An empty collection means it has not restarted since this was deployed.\n');
    await mongoose.connection.close();
    return;
  }

  console.log(`\n${rows.length} event(s)${days ? ` in the last ${days} day(s)` : ''}:\n`);
  console.log('  ' + pad('WHEN (UTC)', 26) + pad('EVENT', 9) + pad('PID', 8) + pad('LIVED', 9) + pad('RSS', 10) + 'DETAIL');
  console.log('  ' + '-'.repeat(92));

  const findings = [];
  let lastBoot = null;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const detail = r.reason ? `reason=${r.reason}` : r.signal ? `signal=${r.signal}` : r.port ? `port ${r.port}` : '';
    console.log('  ' + pad(r.at.toISOString().replace('T', ' ').slice(0, 19), 26)
      + pad(r.event, 9) + pad(r.pid, 8) + pad(dur(r.uptimeSeconds), 9)
      + pad(r.rssMb != null ? r.rssMb + 'MB' : '—', 10) + detail);

    if (r.event === 'boot') {
      if (lastBoot) {
        findings.push(`KILLED OUTRIGHT: pid ${lastBoot.pid} booted at ${lastBoot.at.toISOString()} and was gone `
          + `by ${r.at.toISOString()} with no exit record — nothing in the app saw it coming. `
          + `That is a SIGKILL, an out-of-memory kill, or the platform stopping it. Lived ${dur(lastBoot.uptimeSeconds)} at least.`);
      }
      lastBoot = r;
    } else {
      lastBoot = null;
      if (r.reason === 'uncaughtException') {
        findings.push(`APPLICATION FAULT: pid ${r.pid} threw outside a request handler after ${dur(r.uptimeSeconds)} `
          + `and exited. The runtime log for ${r.at.toISOString()} has the stack trace — that is the bug.`);
      }
      const next = rows[i + 1];
      if (!next) {
        findings.push(`NO RESTART OBSERVED after the final exit at ${r.at.toISOString()}. If the site was down until `
          + `someone restarted it by hand, nothing supervises this process, and exiting on a fault is the wrong `
          + `trade — it should survive recoverable errors instead.`);
      } else if (next.event === 'boot') {
        const gap = Math.round((next.at - r.at) / 1000);
        if (gap > 120) {
          findings.push(`SLOW RESTART: ${gap}s of downtime between the exit at ${r.at.toISOString()} and the next boot. `
            + `Something restarts it, but not promptly.`);
        }
      }
    }
  }

  console.log('');
  if (findings.length) {
    console.log('What this shows:\n');
    for (const f of findings) console.log('  - ' + f + '\n');
  } else {
    console.log('Nothing anomalous: every exit was one the application noticed, and each was followed by a restart.\n');
  }

  await mongoose.connection.close();
})().catch((err) => {
  console.error('Could not read the lifecycle log:', err.message);
  process.exitCode = 1;
});
