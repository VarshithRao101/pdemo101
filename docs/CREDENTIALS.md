# Changing the portal passwords and PINs

Everything needed to reissue the credentials for Inspire ERP, written so it can
be handed to a future session — or followed by hand — months from now with no
other context.

There are ten accounts and there is no eleventh. One Rector, one Authenticator,
one Dean per campus, one Accountant per campus. The system refuses to create
new portal IDs on purpose, so this document is about **changing** credentials,
never about adding people.

---

## The one thing to understand first

**Passwords are not stored. They cannot be looked up, printed, or recovered.**

What the database holds is a bcrypt hash — the output of a one-way function.
Signing in works by hashing what was typed and comparing, never by reading a
stored password back. This is why:

- No screen in the app can show you an existing password or PIN. Not a bug.
- If the handout file is lost, the only way forward is to **reissue** them.
- Anyone who offers to "show you the current passwords" is describing a system
  that stores them in plaintext, which is the single worst defect this codebase
  has had, more than once.

The same is true of the six-digit security PINs.

---

## Reissuing everything

From the project root, with `.env` present and `MONGODB_URI` set:

```bash
node scripts/rotateCredentials.cjs --dry-run
```

Shows exactly what it would do — which accounts are replaced, which stray
accounts are removed — and changes nothing. Read it before continuing.

```bash
node scripts/rotateCredentials.cjs --confirm
```

This does the work:

1. Backs up the existing `users` collection to `scratch/users-backup-<time>.json`
2. Generates a fresh password and a fresh 6-digit PIN for all ten accounts
3. Hashes both with bcrypt at cost 12 and writes only the hashes to MongoDB
4. Verifies each new credential actually signs in before moving on
5. Revokes every live session and refresh token, so anyone signed in is ejected
6. Strips any legacy `pin_plaintext` field it finds
7. Writes the plaintext to `credentials/NEW-CREDENTIALS-<time>.txt`

Nothing is printed to the terminal. A scrollback is a copy, and a copy nobody
remembers making is how credentials end up where they should not be.

### Then, in order

1. Open `credentials/NEW-CREDENTIALS-<time>.txt`
2. Give each person their own line — their password and PIN, not the whole file
3. Confirm each one can sign in
4. **Delete the file**

Step 4 is the one that matters. `credentials/` is gitignored so it cannot be
committed by accident, but an ignored file is still a plaintext file sitting on
a laptop. Delete it once the credentials are handed over.

---

## The password format

```
Rector#2026-4821
DeanBeemaramC2#2026-7390
AccountantErragattuguttaC1#2026-1547
```

Role, campus where there is one, the year, and four random digits.

This is deliberately readable, because these get read down a phone line to a
campus twenty kilometres away. The previous format was twenty random
characters — far stronger on paper, and what actually happened is that people
wrote them on desk pads, which is worse than the trade made here.

**Where the strength comes from.** Only those four digits are unpredictable —
10,000 possibilities. That is weak in isolation and safe here **because of the
lockout**: five wrong guesses freeze an account for fifteen minutes, so an
attacker gets roughly 480 tries a day and needs years on average for one
account, while every failure is logged.

> The five-attempt lockout is what makes this password format acceptable.
> It must never be removed from the sign-in path. Other actions can have their
> PIN prompts taken off — that has already been done for student deletion and
> expenditure entry — but the sign-in lockout is load-bearing.

A correct password resets the counter to a full five, so ordinary typos never
accumulate into a lockout.

---

## Choosing the passwords yourself

`rotateCredentials.cjs` generates them. To set specific ones instead, change
`readablePassword()` in that script — it takes a stem and returns the final
string, and everything downstream (hashing, verification, the handout file) is
unaffected.

**Do not** type passwords onto the command line, and **do not** paste them into
a chat with an assistant. Shell history and chat transcripts are both durable
copies you did not intend to make. Editing the script, running it, and deleting
the handout file afterwards keeps the plaintext to exactly one place for
exactly as long as it is needed.

If a password is ever pasted somewhere it should not be, treat it as
compromised and reissue. That is cheap; the alternative is not.

---

## What the script writes to MongoDB

For each account, in the `users` collection:

| Field             | Value                                                    |
|-------------------|----------------------------------------------------------|
| `username`        | fixed, never changes — `admin1`, `9059068384`, etc.       |
| `password`        | `bcrypt.hashSync(plaintext, 12)`                          |
| `pin`             | `bcrypt.hashSync(sixDigits, 12)`                          |
| `role`            | `admin1` / `admin2` / `accountant` / `authenticator`      |
| `campus`          | `All`, or one of the four campus names                    |
| `status`          | `active`                                                  |
| `activeSessionId` | cleared, ending any live session                          |

Cost 12 is a deliberate choice: roughly a quarter-second per verification on
this hardware. Slow enough to make offline cracking expensive, fast enough that
signing in does not feel broken.

### Doing it by hand for one account

If only one password needs changing and running the whole script is unwanted:

```js
// node -e, from the project root
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_prod' });
  const User = require('./server/models/User.cjs');
  const RefreshToken = require('./server/models/RefreshToken.cjs');

  const username = 'accountant_beemaram_c2';
  const newPassword = process.env.NEW_PW;   // passed in, never typed inline

  const r = await User.updateOne(
    { username },
    { $set: { password: bcrypt.hashSync(newPassword, 12), activeSessionId: null } }
  );
  // matchedCount 0 means the username was wrong and nothing changed — the
  // failure mode that otherwise reports success and hands out a dead password.
  if (r.matchedCount === 0) throw new Error(`No account named ${username}`);

  await RefreshToken.updateMany({ username, revoked: false }, { $set: { revoked: true } });
  console.log(`Updated ${username}. Sessions revoked.`);
  await mongoose.disconnect();
})();
```

Run it as `NEW_PW='...' node -e '...'` so the password comes from the
environment rather than sitting in shell history.

Always revoke the refresh tokens. Without that, a session opened before the
change keeps minting fresh access tokens and the old password effectively still
works.

---

## Verifying it worked

```bash
node scratch/verify-lockout.cjs
```

Or directly — sign in, expect HTTP 200:

```bash
curl -s -X POST https://inspirehnk.org/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin1","password":"...","pin":"..."}' -o /dev/null -w '%{http_code}\n'
```

A `401` means wrong credentials. A `429` means the account is locked from
earlier failed attempts — wait fifteen minutes, or clear the counter:

```js
// node -e, project root
require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_prod' });
  const n = await mongoose.connection.collection('loginattempts').deleteMany({});
  console.log(`Cleared ${n.deletedCount} lockout counter(s).`);
  await mongoose.disconnect();
})();
```

---

## If something goes wrong

The previous accounts, hashes included, are in
`scratch/users-backup-<time>.json`. To restore that state wholesale:

```js
require('dotenv').config();
const mongoose = require('mongoose');
const users = require('./scratch/users-backup-<time>.json');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_prod' });
  const User = require('./server/models/User.cjs');
  await User.deleteMany({});
  await User.insertMany(users);
  console.log(`Restored ${users.length} accounts.`);
  await mongoose.disconnect();
})();
```

That backup contains bcrypt hashes, not passwords — restoring it brings back
the *old* credentials, which are only useful if someone still knows them.

---

## Rules that do not change

1. **Never commit a password, PIN, key or connection string.** Not in code, not
   in a comment, not in a test fixture, not in a document like this one.
2. **Never paste one into a chat transcript**, including with an assistant.
3. **Anything exposed in plaintext anywhere is compromised** — reissue it, no
   matter how briefly it was visible or how private the channel felt.
4. **Delete the handout file** once the credentials are distributed.
5. **The sign-in lockout stays.** The readable password format depends on it.

This repository has regressed to storing plaintext credentials in source more
than once. If you find a hardcoded password, PIN, or a "shortcut" value that
bypasses a real check, stop and report it before changing anything else.
