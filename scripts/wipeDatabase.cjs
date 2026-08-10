// scripts/wipeDatabase.cjs
// Empties every collection in the configured database.
//
// This script previously ran the moment it was invoked: it loaded the
// production connection string from .env and emptied every collection with no
// confirmation, no dry run and no visible target. A single stray invocation
// would have destroyed every student, payment and account in production.
//
// It now refuses to do anything without an explicit, typed confirmation that
// names the database being erased.
//
//   node scripts/wipeDatabase.cjs                      -> shows what would happen
//   node scripts/wipeDatabase.cjs --confirm=<dbname>   -> erases that database

require('dotenv').config();
const readline = require('readline');
const { connectToDatabase } = require('../server/db.cjs');
const mongoose = require('mongoose');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a); }));
}

async function wipeDatabase() {
  const confirmArg = process.argv.find(a => a.startsWith('--confirm='));
  const namedTarget = confirmArg ? confirmArg.split('=')[1] : null;

  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection instance is unavailable.');

  const dbName = mongoose.connection.name;
  const collections = await db.listCollections().toArray();

  console.log(`\nTarget database : ${dbName}`);
  console.log(`Host            : ${mongoose.connection.host}`);
  console.log(`Collections     : ${collections.length}\n`);

  let grandTotal = 0;
  for (const col of collections) {
    const n = await db.collection(col.name).countDocuments();
    grandTotal += n;
    console.log(`  ${col.name.padEnd(24)} ${String(n).padStart(8)} documents`);
  }
  console.log(`  ${''.padEnd(24)} ${String(grandTotal).padStart(8)} total\n`);

  if (!namedTarget) {
    console.log('DRY RUN — nothing was deleted.');
    console.log(`To actually erase this data, re-run with:  --confirm=${dbName}`);
    process.exit(0);
  }

  // Naming the wrong database is the most likely way this gets run by mistake.
  if (namedTarget !== dbName) {
    console.error(`REFUSING: you passed --confirm=${namedTarget} but the connection points at "${dbName}".`);
    process.exit(1);
  }

  console.log(`This will permanently delete ${grandTotal} documents from "${dbName}".`);
  console.log('There is no undo. Take a backup first if you have not.');
  const typed = await ask(`Type the database name to proceed: `);
  if (typed.trim() !== dbName) {
    console.error('Confirmation did not match. Nothing was deleted.');
    process.exit(1);
  }

  let deleted = 0;
  for (const col of collections) {
    const r = await db.collection(col.name).deleteMany({});
    deleted += r.deletedCount;
    console.log(`  purged ${col.name} (${r.deletedCount})`);
  }

  console.log(`\nDeleted ${deleted} documents from "${dbName}".`);
  console.log('Portal accounts are gone too — run scripts/rotateCredentials.cjs --confirm to reprovision.');
  process.exit(0);
}

wipeDatabase().catch((err) => {
  console.error('Database wipe failed:', err.message);
  process.exit(1);
});
