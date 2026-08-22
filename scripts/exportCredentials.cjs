#!/usr/bin/env node
/**
 * exportCredentials.cjs — write every portal credential to one file.
 *
 * For the operator who needs the full list in one place: to store in a safe, to
 * hand out at a campus, or to keep as the record of who signs in with what.
 *
 * WHERE IT WRITES, AND WHY THERE
 *
 * scratch/, which is gitignored. This repository is PUBLIC. A credential in a
 * tracked file is exposed the moment it is pushed, and CI greps every push for
 * exactly that. The same rule that keeps rotateCredentials.cjs writing here
 * applies to this script, and the output path is not configurable for that
 * reason - a --out flag is one typo away from writing into the repository.
 *
 * It prints only the PATH, never the contents. Whoever runs it can open the
 * file; a terminal that gets scrolled back through, screen-shared, or pasted
 * into a chat should not carry the passwords with it.
 *
 * Passwords and PINs are stored in plaintext in MongoDB - a deliberate
 * instruction so the Rector can read as well as set them; server/app.cjs sets
 * out that tradeoff in full. Anything still held as a bcrypt hash from before
 * that decision cannot be read back and is reported as unreadable rather than
 * silently omitted, so the list is never quietly incomplete.
 *
 * Usage:
 *   node scripts/exportCredentials.cjs
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DB = process.env.MONGODB_DB_NAME || 'jc_erp_prod';
const isHashed = v => typeof v === 'string' && v.startsWith('$2');

const ROLE_ORDER = { admin1: 0, authenticator: 1, accountant: 2, clerk: 3 };
const ROLE_LABEL = {
  admin1: 'RECTOR / ADMIN',
  authenticator: 'SECURITY AUTHENTICATOR',
  accountant: 'ACCOUNTANT',
  clerk: 'CAMPUS CLERK'
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: DB, serverSelectionTimeoutMS: 20000 });

  const users = await mongoose.connection.db.collection('users')
    .find({}, { projection: { username: 1, name: 1, role: 1, campus: 1, status: 1, password: 1, pin: 1 } })
    .toArray();

  users.sort((a, b) => {
    const ra = ROLE_ORDER[a.role] ?? 9, rb = ROLE_ORDER[b.role] ?? 9;
    if (ra !== rb) return ra - rb;
    if ((a.campus || '') !== (b.campus || '')) return String(a.campus).localeCompare(String(b.campus));
    return String(a.username).localeCompare(String(b.username));
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.resolve(__dirname, '..', 'scratch');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `portal-credentials-${stamp}.txt`);

  const L = [];
  L.push('INSPIRE JUNIOR COLLEGE — PORTAL CREDENTIALS');
  L.push(`Generated ${new Date().toISOString()} from database "${DB}"`);
  L.push('');
  L.push('KEEP THIS FILE PRIVATE. It contains live sign-in credentials for every');
  L.push('portal. Do not email it, do not put it in the repository, and delete it');
  L.push('once the contents are somewhere safe.');
  L.push('');
  L.push('To CHANGE any of these: Rector portal -> Credentials. The security');
  L.push('authenticator changes its own from its own portal, under Settings —');
  L.push('the Rector cannot change that one, by design.');
  L.push('='.repeat(72));

  let lastRole = null;
  let unreadable = 0;
  for (const u of users) {
    if (u.role !== lastRole) {
      L.push('');
      L.push(`--- ${ROLE_LABEL[u.role] || String(u.role).toUpperCase()} ---`);
      lastRole = u.role;
    }
    const pw = isHashed(u.password) ? '(hashed — cannot be read; set a new one to make it readable)' : (u.password || '(none)');
    const pin = isHashed(u.pin) ? '(hashed — cannot be read)' : (u.pin || '(none)');
    if (isHashed(u.password) || isHashed(u.pin)) unreadable++;
    L.push('');
    L.push(`  Name      : ${u.name || '—'}`);
    L.push(`  Portal ID : ${u.username}`);
    L.push(`  Password  : ${pw}`);
    L.push(`  PIN       : ${pin}`);
    L.push(`  Campus    : ${u.campus || '—'}`);
    L.push(`  Status    : ${u.status || '—'}`);
  }

  L.push('');
  L.push('='.repeat(72));
  L.push(`${users.length} accounts. ${unreadable} hold a legacy hash that cannot be read back.`);
  L.push('');

  fs.writeFileSync(out, L.join('\n'), 'utf8');

  // The path only. Never the contents.
  console.log(`Wrote ${users.length} accounts to:`);
  console.log(`  ${out}`);
  console.log('');
  console.log('That folder is gitignored. Open the file to read the credentials,');
  console.log('move them somewhere safe, then delete it.');
  if (unreadable) {
    console.log('');
    console.log(`NOTE: ${unreadable} account(s) still hold a bcrypt hash and could not be`);
    console.log('read back. Set a new password for those from the Rector portal.');
  }

  await mongoose.disconnect();
})().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
