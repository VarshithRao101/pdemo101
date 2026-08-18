# Portal IDs, passwords and PINs

How sign-in credentials work in this system, and how to change them.

> **This document was rewritten on 2026-08-17.** It previously said passwords
> were stored one-way and could never be looked up. That stopped being true
> when credential storage changed — see below. If you find a copy of the old
> text anywhere, it describes a system that no longer exists.

## Where credentials live

Passwords and six-digit PINs are stored **in readable form** in MongoDB, so
the Rector can both read and set them from the portal.

This was a deliberate decision by the operator, taken with the tradeoff
stated: hashing never prevented an administrator from *changing* a
credential, only from *reading one back*, and the operator wanted to read
them. The cost is real and worth naming — anyone who obtains a copy of the
database obtains every live credential at once, with no work factor in the
way. That is the accepted position, not an oversight.

Two boundaries still hold and are not negotiable:

1. **No credential is ever a literal in this repository.** The repo is
   public; the database is not. A password committed to source is exposed the
   moment it is pushed. If you find one in code, stop and report it.
2. **No credential is ever written to the audit trail, a log line, or any
   response other than the Rector's own Credentials screen.** Credential
   changes are logged as *which fields changed*, never the values.

### Accounts provisioned before the change

Older accounts still hold a bcrypt hash, and a hash cannot be reversed —
there is no migration that turns one into readable text. Sign-in accepts
**either** format, so those accounts keep working exactly as before. They
show as **"Not readable"** on the Credentials screen until someone sets a new
password, at which point they become readable from then on.

So there is no cutover and no downtime: accounts convert one at a time, as
and when their credentials are next changed.

## Changing credentials — the normal way

Sign in as the Rector and open **Credentials**.

- Entering the screen asks for the Rector's own six-digit PIN, even though
  they are already signed in. This screen shows every live credential in the
  system; a session left open on a desk should not expose it.
- Every account is listed with its portal ID, password and PIN. Values are
  masked until you press **Show**.
- **Change** lets you set a new portal ID, password and/or PIN. Anything left
  blank is untouched, so changing only a PIN does not require re-typing the
  password.
- Saving **ends that account's session immediately** — whoever is signed in
  with the old password stops working on their next request, not whenever
  their token happens to expire.

The security authenticator account is deliberately refused here. It is the
account that can wipe the database, and it is not administrable from a portal
the Rector's own session can reach.

### Clerks

Clerk sign-in details are also editable from the **Clerks** screen: pick a
campus, click a clerk, and its powers and sign-in details are edited together.

Clerks are **created**, not allocated from fixed slots. The Rector adds one by
filling in a name, portal ID, password, PIN, mobile and email, up to **fifteen
per campus** — a cap counted on the server, not just in the form. There is no
need to note the password down: it is readable on that screen afterwards.

## Recovering the Rector account

If the Rector's own credentials are lost **and** still hashed, they cannot be
looked up and must be replaced:

```bash
node scripts/setRectorCredentials.cjs            # dry run
node scripts/setRectorCredentials.cjs --confirm  # issue new ones
```

This writes the new password and PIN to a gitignored file under
`credentials/` rather than printing them, so they do not survive in a
terminal scrollback. **Read the file, sign in, then delete it.**

If the Rector's credentials are already readable, this is unnecessary — they
can simply be read out of the database, and rotating would sign the Rector
out for no reason.

## Bulk provisioning

`scripts/rotateCredentials.cjs` issues fresh credentials for the fixed portal
accounts. Clerks are created from the portal instead — the Rector fills in
their details on the Clerks screen and the account exists, up to fifteen per
campus.

Generated passwords deliberately avoid `O`/`0` and `l`/`1`/`I`: somebody
reads these off a screen and types them into a login box, and that is where
it goes wrong. They also never begin with `$2`, which would be read back as a
bcrypt hash and reported unreadable.

## Handling the cleartext files

Anything under `credentials/` or matching `*.credentials.txt` is gitignored
as a backstop, but the real protection is deleting the file once the
credentials have been handed over. Do not leave them lying in the working
tree — a stale handout from a previous rotation is a live credential sitting
on disk long after anyone remembers it is there.

## Sign-in shapes

| Role | What they type |
|---|---|
| Rector | Portal ID, password, six-digit PIN |
| Accountant | Campus, password, PIN |
| Clerk | **Campus only** — then their own password and PIN |

A clerk does not enter a portal ID. They pick their campus and the server
works out which of that campus's clerks the credentials belong to. If a
password and PIN match more than one clerk on a campus, sign-in is **refused**
rather than guessing — two people sharing a password would otherwise mean one
of them silently signing in as the other, and every audit entry afterwards
naming the wrong person.

## The five-attempt lockout

Sign-in and the PIN gate both allow five wrong attempts before locking for
fifteen minutes, counted per account. This is what makes a short PIN
acceptable: six digits is a million combinations, which is nothing to a
machine allowed to guess freely and a great deal to one allowed five tries.
Do not remove the lockout without replacing it with something equivalent.
