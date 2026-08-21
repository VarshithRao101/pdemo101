# Inspire Educational Institutions

The public website and internal ERP for Inspire Educational Institutions, a
junior college group running MPC, BiPC and MEC programmes across four campuses
in Hyderabad.

One deployment serves both. The public site is what a prospective parent sees —
programmes, campuses, an enquiry form. Behind it, reached only by signing in,
are the staff portals that run admissions, fees, salaries, expenditure and
reporting for every campus.

**Live:** https://inspirehnk.org

---

## The stack

React 19 and TypeScript on the front end, built by Vite. Express 4 and Mongoose
8 on the back end, against MongoDB. No CSS framework and no component library —
styles are hand-written in `src/styles`.

The front end is a single page addressed by hash, not a router library. Each
staff portal is a lazily-imported chunk, so a visitor who never signs in never
downloads one.

## Layout

```
src/
  views/         one file per portal, plus the public site and the sign-in gate
  components/    common/ is shared across portals; layout/ and icons/ are what they say
  services/      one API-client module per role
  context/       navigation and session state
server/
  app.cjs        every route
  models/        Mongoose schemas, including the soft-delete plugin
  services/      backups, Google Drive, campus-level backup
  security/      the Content Security Policy, shared by the server and the build
  supervisor.cjs restarts the server if it dies
tests/           37 verification suites; see below
scripts/         one-off and maintenance jobs, run by hand
```

Two files are much larger than the rest — `server/app.cjs` and
`src/views/AdminPortalViews.tsx`. Splitting them is known work, deliberately
not done yet.

## Roles

Four, and they see different portals: **admin1** (group-wide administration),
**clerk** (a single campus), **accountant** (fees, salaries, expenditure) and
**authenticator** (credential and access administration). A role is established
at sign-in and enforced on the server; the client never decides what it may
see.

## Running it locally

**Prerequisites:** Node.js 24, and a MongoDB instance you can point at.

```bash
npm install
cp .env.example .env      # then fill it in
npm run dev
```

`.env.example` is the reference for configuration, and it explains each
variable rather than just naming it. Two are worth knowing before the first
start:

- **`JWT_SECRET` is required and must be at least 32 characters.** The server
  refuses to boot without it. A missing signing secret stops the process rather
  than falling back to something readable in the source.
- **`OPS_PASSWORD_HASH` is a bcrypt hash, never a password.** Wipe, purge and
  restore ask for it on top of the caller's own session and PIN. If it is
  absent those three routes answer 503 — safe, but silent, so set it
  deliberately.

No credential belongs in this repository. They live in MongoDB, and CI greps
every push to keep it that way.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the server under the supervisor |
| `npm run build` | Typechecks, then builds to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | oxlint |
| `npm test` | Every verification suite |
| `npm run test:fast` | Skips the four slow suites |
| `npm run test:ci` | Only suites that seed their own data |

## Tests

37 suites under `tests/`, covering authentication, authorization, tenant
isolation, injection, rate limiting, the payment ledger, backup and restore,
and how the process behaves through a crash or an outage.

`npm test` runs all of them and reports one number. The split between the three
modes is derived, not hand-listed — a suite that seeds its own scratch database
is a CI suite, and one that reads existing data is not. `tests/run-all.cjs`
explains why in full, and it is worth reading before adding a suite.

Suites that write use a scratch database and drop it. Suites that read run
against whatever `MONGODB_DB_NAME` points at — which is the live database by
default. None of them writes.

## Deployment

Hostinger deploys from `main` on its own, a couple of minutes after a push.
Nothing in CI can hold that back.

That makes the CI run on a **pull request** the one that prevents anything, and
the run on `main` a tripwire that tells you what is already live is broken.
Work on a branch and open a PR.

`server.js` starts the app under a supervisor so a crash is followed by a
restart rather than an outage lasting until somebody notices. `DISABLE_SUPERVISOR=1`
turns that off without a redeploy, if it ever misbehaves.

## Two things to know before changing anything

**The Content Security Policy is written once,** in `server/security/csp.cjs`,
and injected into `index.html` at build time. It travels in the document
because Hostinger's edge rewrites the header away before it reaches a browser.
Do not hand-write a second copy in `index.html` — CI fails the build if the
built page loses its policy.

**Deletion is soft, via a Mongoose schema plugin.** Reads exclude deleted rows
automatically; `withDeleted` is the opt-out, and every use of it is deliberate.
The purge routes must keep it, or "erase everything" quietly spares the recycle
bin.
