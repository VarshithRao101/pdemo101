// scripts/restoreWholeBackup.cjs
//
// Break-glass whole-estate restore, for disaster recovery only.
//
// Day-to-day restores go through the Authenticator portal, which is scoped to
// one campus and one data type at a time, validates the backup envelope, shows
// a dry run before it writes, and verifies afterwards that nothing landed in
// the wrong campus. That is the path operators should use.
//
// This script exists for the case that path cannot cover: the whole database
// is gone or corrupt and has to come back from a full snapshot. It is
// deliberately NOT reachable over HTTP. The web route that used to do this
// (POST /api/authenticator/restore-backup) was removed because it overwrote
// all four campuses on a password alone, with no PIN, no validation and no
// verification — a single request away from destroying everything.
//
// Restoring here REPLACES every student, teacher, payment, fee-setting,
// expenditure and worker-payment record in the target database. It is not
// campus-scoped and it cannot be undone.
//
//   node scripts/restoreWholeBackup.cjs                       -> list snapshots
//   node scripts/restoreWholeBackup.cjs --file=<id>           -> inspect one, write nothing
//   node scripts/restoreWholeBackup.cjs --file=<id> --confirm=<dbname>
//                                                             -> actually restore

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const { connectToDatabase } = require('../server/db.cjs');
const { listBackupFiles, downloadBackupFile } = require('../server/services/googleDriveService.cjs');
const {
  decryptPayload,
  generateAndUploadBackup,
  restoreBackupFromFile
} = require('../server/services/backupService.cjs');

const COLLECTIONS = ['students', 'teachers', 'payments', 'feeSettings', 'expenditures', 'workerPayments'];

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a); }));
}

function arg(name) {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : null;
}

async function main() {
  const fileId = arg('file');
  const namedTarget = arg('confirm');

  console.log('\n=== Whole-estate restore (break-glass) ===\n');

  if (!fileId) {
    const files = await listBackupFiles();
    if (!files.length) {
      console.log('No snapshots found in the configured Drive folder.\n');
      return;
    }
    console.log(`${files.length} snapshot(s) available, newest first:\n`);
    for (const f of files) {
      const kb = f.size ? `${Math.round(Number(f.size) / 1024)} KB` : 'size unknown';
      console.log(`  ${f.createdTime}  ${kb.padStart(10)}  ${f.name}`);
      console.log(`      --file=${f.id}`);
    }
    console.log('\nRe-run with --file=<id> to inspect one. Nothing has been changed.\n');
    return;
  }

  // Inspect first, always. A restore whose contents nobody has looked at is a
  // guess, and this is the one operation with no way back.
  console.log(`Reading snapshot ${fileId} ...`);
  const buffer = await downloadBackupFile(fileId);
  let snapshot;
  try {
    snapshot = decryptPayload(buffer.toString('utf-8'));
  } catch (err) {
    console.error(`\nREFUSED: that file could not be decrypted (${err.message}).`);
    console.error('It may be corrupt, truncated, or encrypted with a different BACKUP_ENCRYPTION_KEY.\n');
    process.exitCode = 1;
    return;
  }

  const collections = snapshot.collections || {};
  const missing = COLLECTIONS.filter(c => !Array.isArray(collections[c]));
  if (missing.length) {
    console.error(`\nREFUSED: the snapshot is missing collection(s): ${missing.join(', ')}.`);
    console.error('This is not a complete whole-estate backup. Nothing has been changed.\n');
    process.exitCode = 1;
    return;
  }

  console.log(`\nSnapshot taken : ${snapshot.timestamp || 'unknown'}`);
  console.log('Contents:');
  for (const c of COLLECTIONS) {
    console.log(`  ${c.padEnd(16)} ${String(collections[c].length).padStart(7)} records`);
  }

  // Show it against what is live right now, so the operator sees what they are
  // trading away rather than only what they are getting.
  await connectToDatabase();
  const dbName = mongoose.connection.name;
  const db = mongoose.connection.db;
  const liveNames = {
    students: 'students', teachers: 'teachers', payments: 'payments',
    feeSettings: 'feesettings', expenditures: 'expenditures', workerPayments: 'workerpayments'
  };

  console.log(`\nCurrently live in [${dbName}] on ${mongoose.connection.host}:`);
  let liveTotal = 0;
  for (const c of COLLECTIONS) {
    const n = await db.collection(liveNames[c]).countDocuments();
    liveTotal += n;
    const delta = collections[c].length - n;
    const sign = delta > 0 ? `+${delta}` : String(delta);
    console.log(`  ${c.padEnd(16)} ${String(n).padStart(7)} live  ->  ${String(collections[c].length).padStart(7)} after  (${sign})`);
  }

  if (!namedTarget) {
    console.log('\nInspection only — nothing has been changed.');
    console.log(`To restore, re-run with:  --file=${fileId} --confirm=${dbName}\n`);
    return;
  }

  if (namedTarget !== dbName) {
    console.error(`\nREFUSED: --confirm=${namedTarget} does not match the connected database [${dbName}].`);
    console.error('Nothing has been changed.\n');
    process.exitCode = 1;
    return;
  }

  console.log(`\nThis DELETES all ${liveTotal} live record(s) above and replaces them with the`);
  console.log('snapshot contents, across ALL FOUR CAMPUSES. It cannot be undone.');

  const typed = await ask(`\nType the database name [${dbName}] to proceed, anything else to abort: `);
  if (typed.trim() !== dbName) {
    console.log('\nAborted. Nothing has been changed.\n');
    return;
  }

  // Take a snapshot of the current state first. If the chosen backup turns out
  // to be the wrong one, this is the only way back to where we started.
  console.log('\nTaking a safety snapshot of the current state before overwriting ...');
  try {
    const safety = await generateAndUploadBackup('pre_restore_breakglass');
    console.log(`  Safety snapshot written: ${safety.archiveName || safety.fileName || 'uploaded'}`);
  } catch (err) {
    console.error(`  Safety snapshot FAILED: ${err.message}`);
    const anyway = await ask('  Continue without a way back? Type YES to proceed: ');
    if (anyway.trim() !== 'YES') {
      console.log('\nAborted. Nothing has been changed.\n');
      return;
    }
  }

  console.log('\nRestoring ...');
  const result = await restoreBackupFromFile(fileId, 'breakglass_script');

  // Trust the database, not the return value.
  console.log('\nVerifying by reading back:');
  let bad = 0;
  for (const c of COLLECTIONS) {
    const actual = await db.collection(liveNames[c]).countDocuments();
    const expected = collections[c].length;
    const match = actual === expected;
    if (!match) bad++;
    console.log(`  ${match ? 'OK  ' : 'BAD '} ${c.padEnd(16)} expected ${String(expected).padStart(7)}, found ${String(actual).padStart(7)}`);
  }

  if (bad) {
    console.error(`\n${bad} collection(s) do not match the snapshot. Investigate before letting anyone use the system.\n`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nRestore complete and verified. Snapshot of ${result.restoredTimestamp || 'unknown date'} is now live.\n`);
}

main()
  .catch(err => { console.error('\nRESTORE SCRIPT ERROR:', err.message, '\n'); process.exitCode = 1; })
  .finally(() => mongoose.connection.close().catch(() => {}));
