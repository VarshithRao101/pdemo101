#!/usr/bin/env node
/**
 * activateClerkSlots.cjs — brings the clerk slots online in bulk.
 *
 * A slot has no account behind it until someone activates it, so a fresh
 * system shows seven inactive rows per campus and nothing works yet. Doing
 * twenty-eight of those by hand through the portal is a lot of clicking, so
 * this does the first pass; everything after is the Rector's to change from
 * the Clerks and Credentials screens.
 *
 * Credentials are generated here and NOT written to a file, because they do
 * not need to be: they are stored in readable form, so the Rector can see
 * every clerk's password and PIN on the Credentials screen at any time. That
 * is the whole point of the storage change.
 *
 * Idempotent. A slot that already has an account is left exactly as it is —
 * its permissions, its status and its credentials are not touched — so this
 * can be re-run after adding a campus without disturbing clerks already in
 * use.
 *
 * Usage:
 *   node scripts/activateClerkSlots.cjs                     # dry run
 *   node scripts/activateClerkSlots.cjs --confirm           # all powers on
 *   node scripts/activateClerkSlots.cjs --confirm --none    # no powers
 *   node scripts/activateClerkSlots.cjs --confirm --slots=3 # first 3 per campus
 */

require('dotenv').config();

const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('../server/models/User.cjs');

const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];
const SLOTS_PER_CAMPUS = 7;

const argv = process.argv.slice(2);
const confirm = argv.includes('--confirm');
const noPowers = argv.includes('--none');
const slotArg = argv.find(a => a.startsWith('--slots='));
const slotCount = Math.min(
  SLOTS_PER_CAMPUS,
  Math.max(1, slotArg ? parseInt(slotArg.split('=')[1], 10) || SLOTS_PER_CAMPUS : SLOTS_PER_CAMPUS)
);

const PERMISSIONS = noPowers
  ? { addStudent: false, editStudent: false, editFees: false, collectFees: false, logExpenditures: false }
  : { addStudent: true, editStudent: true, editFees: true, collectFees: true, logExpenditures: true };

const clerkUsername = (campus, slot) =>
  `clerk${slot}_${campus.toLowerCase().replace(/\s+/g, '_')}`;

/** No ambiguous characters, and never a leading "$2" — that reads as a hash. */
function newPassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(14)).map(b => alphabet[b % alphabet.length]).join('');
}

/** Rejection sampling, so the six digits are not biased toward the low end. */
function newPin() {
  let n;
  do { n = crypto.randomBytes(4).readUInt32BE(0); } while (n >= 4294000000);
  return String(n % 1000000).padStart(6, '0');
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Nothing to do.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  console.log(`Connected to ${mongoose.connection.name}\n`);

  const existing = await User.find({ role: { $in: ['clerk', 'admin2'] } }).lean();
  const taken = new Set(existing.map(d => `${d.campus}#${d.slotIndex ?? 1}`));

  console.log(`campuses          : ${CAMPUSES.length}`);
  console.log(`slots per campus  : ${slotCount} of ${SLOTS_PER_CAMPUS}`);
  console.log(`clerks that exist : ${existing.length}`);
  console.log(`powers granted    : ${noPowers ? 'none' : 'all five'}\n`);

  const plan = [];
  for (const campus of CAMPUSES) {
    for (let slot = 1; slot <= slotCount; slot++) {
      if (taken.has(`${campus}#${slot}`)) continue;
      const username = clerkUsername(campus, slot);
      // A username collision outside the clerk set would fail the unique
      // index mid-run, so it is caught here instead.
      const clash = existing.find(d => d.username === username);
      if (clash) continue;
      plan.push({ campus, slot, username });
    }
  }

  if (plan.length === 0) {
    console.log('Every requested slot already has an account. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(confirm ? 'ACTIVATING:\n' : 'DRY RUN — nothing will be created:\n');
  for (const p of plan) {
    console.log(`  ${confirm ? 'CREATE' : 'WOULD CREATE'}  ${p.username.padEnd(28)} (${p.campus}, slot ${p.slot})`);
  }
  console.log('');

  if (!confirm) {
    console.log(`Would activate ${plan.length} clerk slot(s).`);
    console.log('Re-run with --confirm to apply.');
    await mongoose.disconnect();
    return;
  }

  let created = 0;
  const failures = [];

  for (const p of plan) {
    try {
      await User.create({
        username: p.username,
        password: newPassword(),
        pin: newPin(),
        role: 'clerk',
        campus: p.campus,
        slotIndex: p.slot,
        name: `Clerk ${p.slot} ${p.campus}`,
        status: 'active',
        permissions: PERMISSIONS
      });
      created++;
    } catch (err) {
      failures.push(`${p.username}: ${err.message}`);
    }
  }

  // Read back rather than trusting the writes.
  const now = await User.find({ role: 'clerk' }).select('username campus slotIndex status').lean();
  const active = now.filter(d => (d.status || 'active') !== 'disabled');

  console.log(`Created ${created} clerk account(s).`);
  if (failures.length) {
    console.log(`\n${failures.length} failed:`);
    failures.forEach(f => console.log('  - ' + f));
  }
  console.log(`\nclerk accounts now : ${now.length}`);
  console.log(`active             : ${active.length}`);
  for (const campus of CAMPUSES) {
    const n = active.filter(d => d.campus === campus).length;
    console.log(`  ${campus.padEnd(20)} ${n} of ${SLOTS_PER_CAMPUS} active`);
  }

  console.log('\nEvery password and PIN is readable on the Credentials screen in the');
  console.log('portal. Change powers per clerk on the Clerks screen; change IDs,');
  console.log('passwords and PINs on Credentials. Deactivating a slot closes that');
  console.log('portal immediately without deleting anything it recorded.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
