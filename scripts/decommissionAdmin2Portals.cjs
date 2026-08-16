#!/usr/bin/env node
/**
 * decommissionAdmin2Portals.cjs — retires the four old campus portals.
 *
 * The four `admin2` accounts (one per campus) are replaced entirely by the
 * clerk slot system: seven slots per campus, each activated and granted its
 * powers by the Rector. The old accounts are not migrated into slot 1 — they
 * are removed, because keeping them would leave four privileged accounts that
 * nobody provisioned through the Clerk Manager and that the Rector cannot see
 * in it.
 *
 * This DELETES accounts. It is irreversible, so:
 *   - every account is written to a timestamped JSON backup first;
 *   - their refresh tokens are revoked so no session outlives the account;
 *   - it refuses to touch anything that is not role `admin2`;
 *   - it is a dry run unless --confirm is passed.
 *
 * Nothing else is deleted. Students, payments, expenditures and audit entries
 * created by these accounts stay exactly where they are — the books do not
 * change because the person who wrote them no longer has a login. Audit
 * entries keep naming the old username, which is the point of copying the
 * actor's name into the log rather than referencing the account.
 *
 * Usage:
 *   node scripts/decommissionAdmin2Portals.cjs            # dry run
 *   node scripts/decommissionAdmin2Portals.cjs --confirm  # execute
 *
 * Safe to run twice: with no admin2 accounts left it reports and exits.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('../server/models/User.cjs');

const confirm = process.argv.includes('--confirm');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Nothing to do.');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log(`Connected to ${mongoose.connection.name}\n`);

  const legacy = await User.find({ role: 'admin2' }).lean();
  const clerks = await User.countDocuments({ role: 'clerk' });
  const total = await User.countDocuments({});

  console.log(`accounts in total     : ${total}`);
  console.log(`old admin2 portals    : ${legacy.length}`);
  console.log(`clerk accounts        : ${clerks}\n`);

  if (legacy.length === 0) {
    console.log('No admin2 portals remain. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(confirm ? 'DELETING:\n' : 'DRY RUN — nothing will be removed:\n');
  for (const account of legacy) {
    console.log(`  ${confirm ? 'DELETE' : 'WOULD DELETE'}  ${account.username}  (${account.campus})`);
  }
  console.log('');

  if (!confirm) {
    console.log(`Would delete ${legacy.length} account(s).`);
    console.log('Their students, payments, expenditures and audit history are NOT touched.');
    console.log('Re-run with --confirm to apply.');
    await mongoose.disconnect();
    return;
  }

  // Back up before removing. This file is the only way back.
  const backupPath = path.join(
    __dirname, '..', 'scratch',
    `admin2-portals-decommissioned-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(legacy, null, 2));
  console.log(`Backed up ${legacy.length} account(s) to ${backupPath}\n`);

  // Scoped to role admin2 by _id, so a concurrent role change cannot widen
  // what this removes.
  const ids = legacy.map(a => a._id);
  const usernames = legacy.map(a => a.username);

  const revoked = await mongoose.connection.collection('refreshtokens')
    .deleteMany({ username: { $in: usernames } })
    .catch(() => ({ deletedCount: 0 }));

  const result = await User.deleteMany({ _id: { $in: ids }, role: 'admin2' });

  // Confirm with a follow-up read rather than trusting the delete result.
  const remaining = await User.countDocuments({ role: 'admin2' });
  const nowTotal = await User.countDocuments({});

  console.log(`Deleted ${result.deletedCount} account(s).`);
  console.log(`Revoked ${revoked.deletedCount || 0} refresh token(s).`);
  console.log(`admin2 remaining: ${remaining}`);
  console.log(`accounts now: ${nowTotal} (was ${total})`);

  if (remaining > 0) {
    console.log('\nSome admin2 accounts were not removed. Investigate before deploying.');
  } else {
    console.log('\nThe four old campus portals are retired.');
    console.log('Clerk slots are created on demand: the Rector activates a slot in');
    console.log('the Clerks screen and the account is provisioned at that moment.');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Decommission failed:', err.message);
  process.exit(1);
});
