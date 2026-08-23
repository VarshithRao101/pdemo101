#!/usr/bin/env node
/**
 * createAccountantPortals.cjs — provision the four campus accountant accounts.
 *
 * WHY THIS SCRIPT EXISTS
 *
 * The system declares a fixed set of managed portal accounts in
 * `defaultUsers`: one Rector, one security authenticator, and ONE ACCOUNTANT
 * PER CAMPUS. Clerks are not in that set — the Rector creates those freely
 * from the Clerks screen — but the four accountants are, and nothing in the
 * application can create them:
 *
 *   - `POST /api/admin1/clerks` is the only in-app account creation and it
 *     hardcodes `role: 'clerk'`.
 *   - The Credentials screen lists and edits accounts that already exist. It
 *     has no create.
 *   - `rotateCredentials.cjs` would do it, but it REPLACES the whole users
 *     collection, which would also reissue the Rector's and the
 *     authenticator's credentials and sign both out.
 *
 * So a database that has lost them — a fresh deployment, or the pre-handover
 * wipe — has no route back to a working accountant portal. This is that route,
 * and it touches nothing but the four accountant documents.
 *
 * WHY THE CREDENTIALS ARE PLAINTEXT
 *
 * Every account except the authenticator stores its password and PIN readable,
 * deliberately, so the Rector can both read and set them from the Credentials
 * screen. See docs/CREDENTIALS.md. Writing bcrypt here would work for signing
 * in and then show as "Not readable" on that screen, which is the opposite of
 * what these accounts are for.
 *
 * Usage:
 *   node scripts/createAccountantPortals.cjs            # show the plan
 *   node scripts/createAccountantPortals.cjs --confirm  # create them
 *
 * Existing accountants are left ALONE unless --reset is passed. Re-running it
 * must not silently change a password the college is already using.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const CONFIRM = process.argv.includes('--confirm');
const RESET = process.argv.includes('--reset');
const DB = process.env.MONGODB_DB_NAME || 'jc_erp_prod';

const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];

/** Must match server/app.cjs `defaultUsers` and the alias map exactly. */
const usernameFor = (campus) => `accountant_${campus.toLowerCase().replace(/\s+/g, '_')}`;

/** The short alias the sign-in screen also accepts, for the handout. */
const ALIASES = {
  'accountant_erragattugutta_c1': 'acc_e1',
  'accountant_erragattugutta_c2': 'acc_e2',
  'accountant_beemaram_c1': 'acc_b1',
  'accountant_beemaram_c2': 'acc_b2'
};

/** Ambiguity removed: no O/0, l/1/I. This gets read off paper and typed. */
function makePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  while (out.length < 14) {
    const b = crypto.randomBytes(1)[0];
    if (b < 256 - (256 % alphabet.length)) out += alphabet[b % alphabet.length];
  }
  // Never begin with `$2`: credentialMatches() would read it back as a bcrypt
  // hash, and the Credentials screen would report it unreadable.
  return out.startsWith('$2') ? makePassword() : out;
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

  console.log(`\nDatabase : ${mongoose.connection.name}`);
  console.log('');

  const plan = [];
  for (const campus of CAMPUSES) {
    const username = usernameFor(campus);
    const existing = await users.findOne({ username });
    plan.push({ campus, username, existing: !!existing, role: existing ? existing.role : null });
  }

  for (const p of plan) {
    const state = !p.existing ? 'MISSING  -> will be created'
      : RESET ? `exists   -> will be RESET (role ${p.role})`
      : `exists   -> left alone (role ${p.role})`;
    console.log(`  ${p.username.padEnd(34)} ${state}`);
  }
  console.log('');

  const toWrite = plan.filter(p => !p.existing || RESET);
  if (toWrite.length === 0) {
    console.log('All four accountant portals already exist. Nothing to do.');
    console.log('Pass --reset to issue new credentials for them.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!CONFIRM) {
    console.log('DRY RUN — nothing has been changed.');
    console.log('');
    console.log(`Running with --confirm will provision ${toWrite.length} account(s) with a new`);
    console.log('password and 6-digit PIN each, readable afterwards from the Rector\'s');
    console.log('Credentials screen.');
    console.log('');
    console.log('  node scripts/createAccountantPortals.cjs --confirm');
    await mongoose.disconnect();
    process.exit(0);
  }

  const issued = [];
  for (const p of toWrite) {
    const password = makePassword();
    const pin = makePin();
    const now = new Date();

    await users.updateOne(
      { username: p.username },
      {
        $set: {
          username: p.username,
          password,
          pin,
          role: 'accountant',
          campus: p.campus,
          name: `Accountant ${p.campus}`,
          status: 'active',
          // An accountant's powers come from the role, not from this map — the
          // permission flags are the clerk mechanism. Set empty rather than
          // absent so the document shape matches every other account.
          permissions: {},
          // Any session held under the old credentials stops working now.
          activeSessionId: null,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    issued.push({ campus: p.campus, username: p.username, alias: ALIASES[p.username], password, pin });
  }

  // Sessions issued to these accounts before the reset must not survive it.
  const names = issued.map(i => i.username);
  const ids = (await users.find({ username: { $in: names } }).project({ _id: 1 }).toArray()).map(u => u._id);
  const revoked = await mongoose.connection.db.collection('refreshtokens')
    .deleteMany({ userId: { $in: ids } }).catch(() => ({ deletedCount: 0 }));

  console.log(`Provisioned ${issued.length} accountant portal(s).`);
  if (revoked.deletedCount) console.log(`Revoked ${revoked.deletedCount} stale refresh token(s).`);
  console.log('');
  for (const i of issued) {
    console.log(`  ${i.campus}`);
    console.log(`    Portal ID : ${i.username}   (short form: ${i.alias})`);
    console.log(`    Password  : ${i.password}`);
    console.log(`    PIN       : ${i.pin}`);
    console.log('');
  }

  const outDir = path.join(__dirname, '..', 'scratch');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `accountant-portals-${new Date().toISOString().slice(0, 10)}.txt`);
  fs.writeFileSync(out, [
    'ACCOUNTANT PORTAL CREDENTIALS',
    `Issued ${new Date().toISOString()} against ${mongoose.connection.name}`,
    '',
    'Sign in at the staff gate with the Portal ID (or its short form), the',
    'password and the PIN. The campus comes from the account itself.',
    '',
    'All three are readable and changeable afterwards from the Rector\'s',
    'Credentials screen, so this file is a convenience, not the record.',
    '',
    ...issued.flatMap(i => [
      i.campus,
      `  Portal ID : ${i.username}   (short form: ${i.alias})`,
      `  Password  : ${i.password}`,
      `  PIN       : ${i.pin}`,
      ''
    ]),
    'Store these somewhere safe, then DELETE this file.',
    ''
  ].join('\n'), 'utf-8');

  console.log(`Also written to: ${out}`);
  console.log('(that folder is gitignored — store these safely, then delete the file)');

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
