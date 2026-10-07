/**
 * Empties the college's working data so real data can be entered from scratch.
 *
 *   node scripts/resetForFreshStart.cjs                        dry run: counts only
 *   node scripts/resetForFreshStart.cjs --confirm --backup <dir>   backs up, then deletes
 *
 * DELETES: students, payments, teachers, worker payments, expenditures, fee
 * settings, every clerk account (and the leftover admin2/accountant accounts),
 * and their refresh tokens.
 *
 * KEEPS: the Rector (admin1) and the security authenticator accounts, public
 * enquiries, the audit log and the boot records - the first so someone can sign
 * in afterwards, the rest because they are the record of what happened.
 *
 * Before deleting anything, every collection it is about to empty is written to
 * <dir> as JSON. There is no undo otherwise.
 *
 * Reads the database from MONGODB_URI / MONGODB_DB_NAME like the server does.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DB = process.env.MONGODB_DB_NAME || 'jc_erp_prod';
const WIPE = ['students', 'payments', 'teachers', 'workerpayments', 'expenditures', 'feesettings', 'refreshtokens'];
const REMOVED_ROLES = { role: { $in: ['clerk', 'admin2', 'accountant'] } };

(async () => {
  const args = process.argv.slice(2);
  const confirmed = args.includes('--confirm');
  const outDir = args.includes('--backup') ? args[args.indexOf('--backup') + 1] : null;

  await mongoose.connect(process.env.MONGODB_URI, { dbName: DB, serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  console.log(`Database: ${DB}  ${confirmed ? '(LIVE RUN)' : '(dry run - nothing will change)'}\n`);

  const counts = {};
  for (const c of WIPE) counts[c] = await db.collection(c).countDocuments({});
  counts['users (clerk/admin2/accountant)'] = await db.collection('users').countDocuments(REMOVED_ROLES);
  const kept = await db.collection('users').find({ role: { $nin: ['clerk', 'admin2', 'accountant'] } }, { projection: { username: 1, role: 1 } }).toArray();

  for (const [k, v] of Object.entries(counts)) console.log(`  will delete  ${String(v).padStart(6)}  ${k}`);
  console.log(`\n  will KEEP ${kept.length} account(s): ${kept.map(u => `${u.username} (${u.role})`).join(', ')}`);

  if (!confirmed) { console.log('\nDry run. Re-run with --confirm --backup <dir> to apply.'); return; }
  if (!outDir) { console.error('\nRefusing to delete without --backup <dir>.'); process.exit(2); }

  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const c of [...WIPE, 'users']) {
    const filter = c === 'users' ? REMOVED_ROLES : {};
    const rows = await db.collection(c).find(filter).toArray();
    fs.writeFileSync(path.join(outDir, `${stamp}-${c}.json`), JSON.stringify(rows));
  }
  console.log(`\nBackup written to ${outDir}`);

  for (const c of WIPE) {
    const r = await db.collection(c).deleteMany({});
    console.log(`  deleted ${r.deletedCount} from ${c}`);
  }
  const u = await db.collection('users').deleteMany(REMOVED_ROLES);
  console.log(`  deleted ${u.deletedCount} account(s) (clerk/admin2/accountant)`);
})().catch(e => { console.error(e); process.exit(1); }).finally(() => mongoose.disconnect());
