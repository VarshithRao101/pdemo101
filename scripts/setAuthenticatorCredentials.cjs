#!/usr/bin/env node
/**
 * setAuthenticatorCredentials.cjs — issue a new password and PIN for the
 * security authenticator, and only for that account.
 *
 * WHY THIS SCRIPT HAS TO EXIST
 *
 * The authenticator is the one account the Rector cannot change. That is
 * deliberate: it is the account that audits the Rector, and all three routes
 * that could reach it refuse by role. It changes its own credentials from its
 * own portal, which needs the current password.
 *
 * So if the current password is lost, there is no way back in from anywhere in
 * the application - and this account owns backups, restore and wipe. That is
 * not a hypothetical: its credentials are stored as bcrypt hashes from before
 * the plaintext decision, so they cannot be read back from the database either.
 *
 * rotateCredentials.cjs is not the answer to this. It REPLACES the whole users
 * collection and would take every clerk with it. This touches one document.
 *
 * WHY THE NEW CREDENTIALS STAY HASHED
 *
 * Every other account stores its password in plaintext, deliberately, so the
 * Rector can read as well as set it. This account must NOT be readable that
 * way - a Rector who can read the authenticator's password can sign in as it,
 * which is the separation this whole design exists to keep. So these are
 * written as bcrypt hashes and the cleartext is shown to you once, here, and
 * written to one gitignored file. If you lose it, run this again.
 *
 * Usage:
 *   node scripts/setAuthenticatorCredentials.cjs            # show the plan, change nothing
 *   node scripts/setAuthenticatorCredentials.cjs --confirm  # issue new credentials
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const CONFIRM = process.argv.includes('--confirm');
const DB = process.env.MONGODB_DB_NAME || 'jc_erp_prod';

/** Ambiguity removed: no O/0, l/1/I. This gets read off paper and typed. */
function makePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  while (out.length < 20) {
    const b = crypto.randomBytes(1)[0];
    if (b < 256 - (256 % alphabet.length)) out += alphabet[b % alphabet.length];
  }
  return out;
}

/** Six digits, uniformly. Not Math.random. */
function makePin() {
  let n;
  do { n = crypto.randomBytes(4).readUInt32BE(0); } while (n >= 4294967295 - (4294967295 % 900000));
  return String(100000 + (n % 900000));
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: DB, serverSelectionTimeoutMS: 20000 });
  const users = mongoose.connection.db.collection('users');

  const accounts = await users.find({ role: 'authenticator' })
    .project({ username: 1, name: 1, role: 1, status: 1 }).toArray();

  if (accounts.length === 0) {
    console.error('No account with role "authenticator" exists in this database. Nothing to do.');
    process.exit(1);
  }
  if (accounts.length > 1) {
    // Refuse rather than guess. Picking one of two authenticators at random and
    // resetting it is worse than stopping.
    console.error(`Found ${accounts.length} authenticator accounts. Refusing to guess which one:`);
    for (const a of accounts) console.error(`  - ${a.username} (${a.name || 'no name'})`);
    process.exit(1);
  }

  const target = accounts[0];
  console.log(`Database : ${DB}`);
  console.log(`Account  : ${target.username}  (${target.name || 'no name'}, status ${target.status || '—'})`);
  console.log('');

  if (!CONFIRM) {
    console.log('DRY RUN — nothing has been changed.');
    console.log('');
    console.log('Running with --confirm will issue a NEW password and a NEW 6-digit PIN');
    console.log('for this account. Anyone signed in as it will be signed out, and the');
    console.log('current credentials will stop working immediately.');
    console.log('');
    console.log('  node scripts/setAuthenticatorCredentials.cjs --confirm');
    await mongoose.disconnect();
    return;
  }

  const password = makePassword();
  const pin = makePin();

  await users.updateOne(
    { _id: target._id },
    {
      $set: {
        password: bcrypt.hashSync(password, 12),
        pin: bcrypt.hashSync(pin, 12),
        // Any live session is ended: a credential change that leaves an old
        // session usable has not really changed anything.
        activeSessionId: null,
        updatedAt: new Date()
      }
    }
  );

  try {
    await mongoose.connection.db.collection('refreshtokens')
      .deleteMany({ username: target.username });
  } catch { /* best effort */ }

  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.resolve(__dirname, '..', 'scratch');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `authenticator-credentials-${stamp}.txt`);
  fs.writeFileSync(out, [
    'INSPIRE JUNIOR COLLEGE — SECURITY AUTHENTICATOR',
    `Issued ${new Date().toISOString()}`,
    '',
    `Portal ID : ${target.username}`,
    `Password  : ${password}`,
    `PIN       : ${pin}`,
    '',
    'This is the ONLY copy. The database holds bcrypt hashes, which cannot be',
    'reversed, and the Rector cannot read or change this account by design.',
    'Store these somewhere safe and delete this file.',
    '',
    'To change them later: sign in to the authenticator portal, Settings ->',
    'Change credentials. Or run this script again.',
    ''
  ].join('\n'), 'utf8');

  console.log('New credentials issued.');
  console.log('');
  console.log(`  Portal ID : ${target.username}`);
  console.log(`  Password  : ${password}`);
  console.log(`  PIN       : ${pin}`);
  console.log('');
  console.log(`Also written to: ${out}`);
  console.log('(that folder is gitignored — store these safely, then delete the file)');

  await mongoose.disconnect();
})().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
