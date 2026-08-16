#!/usr/bin/env node
/**
 * setRectorCredentials.cjs — issues a fresh password and PIN for admin1.
 *
 * Every account still holds a bcrypt hash from before credentials became
 * readable, and a hash cannot be reversed — so the Rector's own credentials
 * cannot be looked up, only replaced. This replaces them, and from that point
 * the Rector can read and set every other account from the Credentials screen
 * in the portal. This script exists for exactly one account for that reason:
 * it is the way back in, not a general provisioning tool.
 *
 * The new values are written to a gitignored file rather than printed, so
 * they do not end up in a terminal scrollback or a chat log. Read the file,
 * sign in, then delete it.
 *
 * Usage:
 *   node scripts/setRectorCredentials.cjs            # dry run
 *   node scripts/setRectorCredentials.cjs --confirm  # issue new credentials
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('../server/models/User.cjs');

const confirm = process.argv.includes('--confirm');

/**
 * No ambiguous characters, and never a leading "$2".
 *
 * Someone reads this off a screen and types it into a login box, so O/0 and
 * l/1/I are where that goes wrong. A value starting with $2 would be read
 * back as a bcrypt hash and reported unreadable.
 */
function newPassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(16))
    .map(b => alphabet[b % alphabet.length])
    .join('');
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

  const rector = await User.findOne({ role: 'admin1' });
  if (!rector) {
    console.error('No admin1 account exists. Nothing to do.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const wasHashed = String(rector.password || '').startsWith('$2');
  console.log(`Rector account : ${rector.username}`);
  console.log(`Current password: ${wasHashed ? 'hashed, cannot be read' : 'readable'}`);
  console.log(`Current PIN     : ${String(rector.pin || '').startsWith('$2') ? 'hashed, cannot be read' : 'readable'}\n`);

  if (!confirm) {
    console.log('DRY RUN — nothing changed.');
    console.log('Re-run with --confirm to issue a new password and PIN.');
    await mongoose.disconnect();
    return;
  }

  const password = newPassword();
  const pin = newPin();

  rector.password = password;
  rector.pin = pin;
  // Ends any session signed in with the old credentials.
  rector.activeSessionId = null;
  await rector.save();

  await mongoose.connection.collection('refreshtokens')
    .deleteMany({ userId: rector._id })
    .catch(() => {});

  // Read back rather than trusting the save.
  const check = await User.findById(rector._id).select('username password pin').lean();
  const good = check && check.password === password && check.pin === pin;

  const outDir = path.join(__dirname, '..', 'credentials');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `rector-credentials-${new Date().toISOString().replace(/[:.]/g, '-')}.credentials.txt`);

  fs.writeFileSync(outPath, [
    'INSPIRE ERP — Rector (admin1) sign-in',
    `Issued: ${new Date().toISOString()}`,
    '',
    `Portal ID : ${rector.username}`,
    `Password  : ${password}`,
    `6-digit PIN: ${pin}`,
    '',
    'Sign in, then open Credentials in the portal to set the password and PIN',
    'for every other account. Delete this file once you have done that.',
    ''
  ].join('\n'), 'utf8');

  console.log(good ? 'New credentials issued and verified.\n' : 'WARNING: read-back did not match. Check the account.\n');
  console.log(`Written to: ${outPath}`);
  console.log('\nThis file is the only copy. Read it, sign in, then delete it.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
