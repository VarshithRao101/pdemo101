#!/usr/bin/env node
/**
 * rotateCredentials.cjs — provisions the portal accounts.
 *
 * This exists because seeding from application code requires plaintext
 * credentials to live in the repository, which is precisely the defect that
 * made every account in this system loggable-into from a public GitHub file.
 * Provisioning happens here instead: secrets are generated with a CSPRNG,
 * only bcrypt hashes are written to MongoDB, and the cleartext is written to
 * one gitignored file for the operator to distribute and then delete.
 *
 * Usage:
 *   node scripts/rotateCredentials.cjs --dry-run     # show the plan, change nothing
 *   node scripts/rotateCredentials.cjs --confirm     # execute
 *
 * --confirm REPLACES the users collection. Existing accounts are backed up to
 * scratch/ first.
 */

require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../server/models/User.cjs');
const RefreshToken = require('../server/models/RefreshToken.cjs');

const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];

// Exactly the accounts the system should have: one Rector, one security
// authenticator, one Dean per campus, one accountant per campus.
const ACCOUNTS = [
  { username: 'admin1', role: 'admin1', campus: 'All', name: 'Rector' },
  { username: '9059068384', role: 'authenticator', campus: 'All', name: 'Security Authenticator' },
  ...CAMPUSES.map(c => ({
    username: `admin2_${c.toLowerCase().replace(/\s+/g, '_')}`,
    role: 'admin2',
    campus: c,
    name: `Dean ${c}`
  })),
  ...CAMPUSES.map(c => ({
    username: `accountant_${c.toLowerCase().replace(/\s+/g, '_')}`,
    role: 'accountant',
    campus: c,
    name: `Accountant ${c}`
  }))
];

// Ambiguous glyphs (O/0, l/1/I) are excluded: these get read off a screen and
// typed by hand, and a password nobody can transcribe gets written on a desk.
const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789#%+=?';

function randomPassword(len = 20) {
  const out = [];
  while (out.length < len) {
    // Rejection sampling keeps the distribution uniform; a plain modulo would
    // bias toward the first characters of the alphabet.
    const b = crypto.randomBytes(1)[0];
    if (b < 256 - (256 % PW_ALPHABET.length)) out.push(PW_ALPHABET[b % PW_ALPHABET.length]);
  }
  return out.join('');
}

const randomPin = () => String(crypto.randomInt(100000, 1000000));

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes('--confirm');
  const dryRun = args.includes('--dry-run') || !confirmed;

  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod'
  });
  console.log(`Connected to database: ${mongoose.connection.name}\n`);

  const existing = await User.find({}).lean();
  console.log(`Existing accounts: ${existing.length}`);
  const keep = new Set(ACCOUNTS.map(a => a.username));
  for (const u of existing) {
    const verdict = keep.has(u.username) ? 'REPLACE (new credentials)' : 'REMOVE';
    console.log(`  ${String(u.username).padEnd(34)} ${String(u.role).padEnd(14)} -> ${verdict}`);
  }
  console.log(`\nWill provision ${ACCOUNTS.length} accounts:`);
  for (const a of ACCOUNTS) {
    console.log(`  ${a.username.padEnd(34)} ${a.role.padEnd(14)} ${a.campus}`);
  }

  if (dryRun) {
    console.log('\nDRY RUN — nothing was changed. Re-run with --confirm to execute.');
    await mongoose.disconnect();
    return;
  }

  // Back up before destroying anything. Hashes are included so the previous
  // state can be restored wholesale if this goes wrong.
  const scratchDir = path.resolve(__dirname, '../scratch');
  fs.mkdirSync(scratchDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(scratchDir, `users-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`\nBacked up ${existing.length} existing accounts -> ${backupPath}`);

  const deleted = await User.deleteMany({});
  console.log(`Removed ${deleted.deletedCount} accounts.`);

  // Every outstanding refresh token belongs to an account that no longer
  // exists; leaving them would let a stale token be presented against a
  // recreated username.
  const tokensCleared = await RefreshToken.deleteMany({});
  console.log(`Cleared ${tokensCleared.deletedCount} refresh tokens.`);

  const issued = [];
  for (const acc of ACCOUNTS) {
    const password = randomPassword();
    const pin = randomPin();

    const created = await User.create({
      username: acc.username,
      password: bcrypt.hashSync(password, 12),
      pin: bcrypt.hashSync(pin, 12),
      role: acc.role,
      campus: acc.campus,
      name: acc.name,
      status: 'active',
      activeSessionId: null
    });

    // Verify the hash actually round-trips before telling the operator this
    // credential works. A password handed out that does not authenticate is
    // worse than a failed provision.
    const check = await User.findById(created._id).select('password pin').lean();
    if (!bcrypt.compareSync(password, check.password) || !bcrypt.compareSync(pin, check.pin)) {
      throw new Error(`Verification FAILED for ${acc.username}. Aborting; check the backup file.`);
    }

    issued.push({ ...acc, password, pin });
    console.log(`  provisioned + verified: ${acc.username}`);
  }

  // Drop the legacy cleartext PIN column if any document still carries it.
  const unset = await User.collection.updateMany({}, { $unset: { pin_plaintext: '' } });
  console.log(`Stripped legacy pin_plaintext from ${unset.modifiedCount} document(s).`);

  // The duplicate-payment guard is only real if the index is unique.
  try {
    const payments = mongoose.connection.db.collection('payments');
    const idx = await payments.indexes();
    const old = idx.find(i => i.name === 'idempotencyKey_1');
    if (old && !old.unique) {
      await payments.dropIndex('idempotencyKey_1');
      console.log('Dropped non-unique idempotencyKey index.');
    }
    if (!old || !old.unique) {
      await payments.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true, name: 'idempotencyKey_1' });
      console.log('Created UNIQUE sparse index on payments.idempotencyKey.');
    } else {
      console.log('payments.idempotencyKey unique index already present.');
    }
  } catch (idxErr) {
    console.error(`WARNING: could not enforce the unique payment index: ${idxErr.message}`);
    console.error('Duplicate-payment protection is NOT active until this is resolved.');
  }

  const out = [
    'INSPIRE ERP — PORTAL CREDENTIALS',
    `Generated: ${new Date().toISOString()}`,
    '',
    'These are the only copies. They are stored in MongoDB as bcrypt hashes and',
    'cannot be recovered. Distribute them, then delete this file.',
    'This file is inside scratch/, which is gitignored — do not move it.',
    ''
  ];
  for (const a of issued) {
    out.push('='.repeat(64));
    out.push(`Role     : ${a.role}`);
    out.push(`Name     : ${a.name}`);
    out.push(`Campus   : ${a.campus}`);
    out.push(`Username : ${a.username}`);
    out.push(`Password : ${a.password}`);
    out.push(`PIN      : ${a.pin}`);
  }
  out.push('='.repeat(64));

  const credPath = path.join(scratchDir, `NEW-CREDENTIALS-${stamp}.txt`);
  fs.writeFileSync(credPath, out.join('\n'), 'utf8');

  console.log(`\nProvisioned ${issued.length} accounts.`);
  console.log(`Credentials written to: ${credPath}`);
  console.log('Distribute them and delete that file. They cannot be recovered.');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('\nFAILED:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
