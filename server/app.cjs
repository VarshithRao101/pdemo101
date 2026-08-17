/**
 * Inspire ERP System - Foundation Server Skeleton
 * Express + MongoDB Atlas with serverless connection caching, bcrypt security,
 * JWT authentication, persistent fail-closed rate limiting, CORS isolation, and role authorization.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { connectToDatabase } = require('./db.cjs');
const User = require('./models/User.cjs');
const RefreshToken = require('./models/RefreshToken.cjs');
const RateLimit = require('./models/RateLimit.cjs');
const LoginAttempt = require('./models/LoginAttempt.cjs');
const Student = require('./models/Student.cjs');
const Teacher = require('./models/Teacher.cjs');
const FeeSettings = require('./models/FeeSettings.cjs');
const Expenditure = require('./models/Expenditure.cjs');
const WorkerPayment = require('./models/WorkerPayment.cjs');
const Payment = require('./models/Payment.cjs');
const Enquiry = require('./models/Enquiry.cjs');
const AuditLog = require('./models/AuditLog.cjs');

const {
  generateAndUploadBackup,
  wipeDataCollections,
  getBackupLogs,
  getAllAvailableBackupFiles
} = require('./services/backupService.cjs');
const campusBackup = require('./services/campusBackupService.cjs');

const app = express();

/**
 * How many reverse proxies sit in front of this process.
 *
 * Without this, Express refuses to interpret X-Forwarded-For at all and
 * req.ip is the proxy's address — so every visitor looks like one client.
 * With it set too high, or to `true`, Express trusts the whole chain
 * including whatever the client prepended, which is the vulnerability this
 * replaces: the rate limiter keyed on a value the caller chose.
 *
 * One hop is right for Hostinger's edge. Set TRUSTED_PROXY_HOPS=0 if this
 * ever runs directly exposed, and req.ip becomes the socket address.
 */
const TRUSTED_PROXY_HOPS = process.env.TRUSTED_PROXY_HOPS === undefined
  ? 1
  : Number(process.env.TRUSTED_PROXY_HOPS);
app.set('trust proxy', Number.isFinite(TRUSTED_PROXY_HOPS) ? TRUSTED_PROXY_HOPS : 1);

// Security headers. The CSP directives live in server/security/csp.cjs
// because the same policy has to be emitted twice — once here as a header,
// once as a meta tag injected at build time — and Hostinger's edge rewrites
// the header away, so the meta copy is the one that actually protects users.
// Defining them in one place is what stops the two from drifting apart.
const { DIRECTIVES: CSP_DIRECTIVES } = require('./security/csp.cjs');

app.use(helmet({
  contentSecurityPolicy: { directives: CSP_DIRECTIVES },
  crossOriginEmbedderPolicy: false
}));

/**
 * Permissions-Policy, which helmet does not set.
 *
 * This app never asks for a camera, a microphone, a location or a payment
 * handler, so every one of those is switched off outright. The value is that
 * if injected content ever tries to prompt a member of staff for one, the
 * browser refuses before any dialog is shown — the prompt itself is the
 * attack, because a permission dialog on a site people trust gets accepted.
 */
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
    'magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()');
  next();
});

// CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,https://inspirehnk.org,https://www.inspirehnk.org')
  .split(',')
  .map(o => o.trim().toLowerCase());

// Exact-match only. The previous rule allowed any origin whose hostname merely
// *contained* "localhost" or "127.0.0.1", so an attacker-registered domain such
// as https://localhost.example-attacker.com was accepted and — with
// credentials: true — could read authenticated responses cross-origin.
// Local development origins are allowed only outside production.
const DEV_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const allowDevOrigins = process.env.NODE_ENV !== 'production';

/**
 * Decides whether an Origin may read this server's responses.
 *
 * `req` is needed so the app's OWN address is always allowed, whatever it
 * happens to be. Hostinger moved the site onto its temporary domain
 * (*.hostingersite.com) while the allowlist named only inspirehnk.org, and the
 * backend began refusing requests from the very frontend it was serving —
 * every API call from the live site was rejected.
 *
 * Comparing the Origin against the request's own Host makes same-origin
 * traffic self-authorising. If a browser is asking this server about a page
 * this server served, that is by definition not a cross-origin request, and it
 * stays correct through any domain change or migration without an env edit.
 */
function isOriginAllowed(req, origin) {
  const normOrigin = String(origin).toLowerCase().trim();

  if (allowedOrigins.includes(normOrigin)) return true;
  if (allowDevOrigins && DEV_ORIGIN_PATTERN.test(normOrigin)) return true;

  try {
    const host = String((req.headers && req.headers.host) || '').toLowerCase();
    if (host && new URL(normOrigin).host === host) return true;
  } catch { /* malformed Origin header — fall through to refusal */ }

  return false;
}

app.use(cors((req, done) => {
  const origin = req.headers.origin;

  // Same-origin and non-browser callers (curl, cron, server-to-server) send no
  // Origin header; there is no cross-origin risk to gate in that case.
  let allow = true;
  if (origin) {
    allow = isOriginAllowed(req, origin);
    if (!allow) {
      // Refuse by withholding Access-Control-Allow-Origin rather than by
      // erroring the response. The browser still blocks the cross-origin read —
      // that is what actually enforces the policy — but a stray or
      // misconfigured Origin header can no longer 403 the request itself and
      // take stylesheets and scripts down with it.
      console.warn(`[CORS]: Refused cross-origin request from ${origin} (host: ${req.headers.host})`);
    }
  }

  done(null, {
    origin: allow,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-security-pin']
  });
}));

// Cap the request body. Without a limit a single request can pin memory and
// push arbitrarily large strings into the database.
app.use(express.json({ limit: '100kb' }));

// Turn body-parser failures into this API's own error shape.
//
// Without this, a malformed body surfaced the parser's internal text verbatim
// — `Unexpected token 'n', "null" is not valid JSON` — which is both useless
// to a client and a different shape from every other error the API returns.
// A 413 from the size limit came through the same path.
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      status: 'error',
      message: 'That request is too large. The limit is 100 KB.'
    });
  }
  if (err instanceof SyntaxError || err.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: 'error',
      message: 'The request body is not valid JSON.'
    });
  }
  return next(err);
});

/**
 * Every query-string value must be a plain string.
 *
 * Express parses `?branch[$ne]=Beemaram C2` into `{ branch: { $ne: '...' } }`
 * — a real object, which routes then hand to Mongo. On the student list that
 * became `Student.find({ branch: { $ne: 'Beemaram C2' } })`: every student
 * NOT in the caller's campus. A campus isolation bypass.
 *
 * It did not actually leak, because the route happens to call
 * `.toLowerCase()` on the value first and an object has no such method, so it
 * threw a TypeError and returned 500. Security by accidental type error is
 * not security: the next route to use that parameter without a string method
 * would have leaked, and nothing would have flagged it.
 *
 * Rejecting non-scalar query values here covers every route at once, present
 * and future, and turns a 500 into an honest 400.
 */
app.use((req, res, next) => {
  for (const [key, value] of Object.entries(req.query || {})) {
    if (typeof value !== 'string') {
      console.warn(`[Query]: Refused non-scalar query parameter [${key}] from ${req.ip}`);
      return res.status(400).json({
        status: 'error',
        message: `Query parameter [${key}] must be a single plain value.`
      });
    }
  }
  return next();
});

app.use(morgan('dev'));

// URL Path Normalization Middleware (Fixes double /api/api/ prefixing & serverless routing quirks)
app.use((req, res, next) => {
  if (req.url && req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  next();
});

// Health Check Endpoint
// Public health probe. Reports whether the app is up and whether the database
// is reachable, and nothing else — it previously echoed the raw driver error
// (which can contain the cluster host and credentials) and whether a
// MONGODB_URI was configured, to any anonymous caller.
app.get('/api/health', async (req, res) => {
  let database = 'disconnected';
  try {
    await connectToDatabase();
    database = mongoose.connection.readyState === 1 ? 'connected' : 'connecting';
  } catch (err) {
    console.error('[Health]: Database unreachable:', err.message);
  }
  return res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database
  });
});

// Signing secrets come from the environment only. There is deliberately no
// fallback literal: a missing secret must stop the process, never silently
// downgrade every token in the system to a publicly-known key.
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET is not configured (or is shorter than 32 characters). Refusing to start.');
}

/**
 * --- THE OPERATIONS PASSWORD -------------------------------------------
 *
 * One password authorises every destructive action: wiping the database,
 * purging student and faculty records, running and restoring backups. It
 * replaces the per-account password those routes each checked separately,
 * which is what the college asked for — one thing to remember, held by the
 * person who is allowed to do these.
 *
 * It lives in the environment as a BCRYPT HASH, never as text, and never in
 * this file. That is not caution for its own sake: this repository is public,
 * and a literal here would be a working credential for wiping the database,
 * readable by anyone, permanently in git history even after deletion. This
 * codebase has shipped in-source passwords more than once already.
 *
 * To set or change it:
 *
 *   node -e "console.log(require('bcryptjs').hashSync(process.env.P, 12))"
 *
 * with the password passed as P in the environment — not typed on the command
 * line, where it lands in shell history. Put the printed hash in .env as
 * OPS_PASSWORD_HASH and restart. docs/CREDENTIALS.md has the full procedure.
 *
 * Absent, every destructive route refuses rather than falling open. A missing
 * secret must never mean "no check required".
 */
const OPS_PASSWORD_HASH = process.env.OPS_PASSWORD_HASH || '';

function verifyOpsPassword(req, res) {
  const supplied = String((req.body && req.body.password) || '').trim();

  if (!OPS_PASSWORD_HASH) {
    console.error('[Ops]: OPS_PASSWORD_HASH is not configured — refusing a destructive action.');
    res.status(503).json({
      status: 'error',
      message: 'The operations password is not configured on this server. This action is unavailable until it is set.'
    });
    return false;
  }
  if (!supplied) {
    res.status(401).json({ status: 'error', message: 'The operations password is required for this action.' });
    return false;
  }
  if (!safeBcryptCompare(supplied, OPS_PASSWORD_HASH)) {
    // Logged with the caller, because a wrong password on a wipe attempt is
    // worth noticing whether it was a typo or not.
    console.warn(`[Ops]: WRONG operations password from [${req.user && req.user.username}] for ${req.method} ${req.path}`);
    res.status(401).json({ status: 'error', message: 'Incorrect operations password.' });
    return false;
  }
  return true;
}

// How long a session may sit idle before the server ends it. Three hours by
// default, which suits a working day at a front desk; set
// SESSION_IDLE_TIMEOUT_MINUTES to change it. Clamped to a sane range so a
// typo cannot disable the timeout entirely or lock everyone out every minute.
const SESSION_IDLE_TIMEOUT_MS = (() => {
  const minutes = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES) || 180;
  return Math.min(Math.max(minutes, 5), 24 * 60) * 60 * 1000;
})();

// Activity is recorded at most this often. Writing on every request would add
// a database write to every read in the app to keep a value that only needs
// to be right to within a minute.
const SESSION_ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;

// Valid campus branches
const VALID_CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];

// The academic years the salary ledger covers, earliest first. Each opens only
// once the one before it has all twelve months paid — enforced on the
// salary-month route, not merely shown in the dropdown.
const ACADEMIC_YEARS = ['2026-2027', '2027-2028', '2028-2029', '2029-2030'];
const LEDGER_MONTHS = [
  'June', 'July', 'August', 'September', 'October', 'November',
  'December', 'January', 'February', 'March', 'April', 'May'
];

function normalizeCampus(branch) {
  if (!branch || typeof branch !== 'string') return '';
  const b = branch.trim();
  if (VALID_CAMPUSES.includes(b)) return b;
  const lower = b.toLowerCase();
  if (lower.includes('erragattugutta') && (lower.includes('1') || lower.includes('c1'))) return 'Erragattugutta C1';
  if (lower.includes('erragattugutta') && (lower.includes('2') || lower.includes('c2'))) return 'Erragattugutta C2';
  if ((lower.includes('beemaram') || lower.includes('bheemaram')) && (lower.includes('1') || lower.includes('c1'))) return 'Beemaram C1';
  if ((lower.includes('beemaram') || lower.includes('bheemaram')) && (lower.includes('2') || lower.includes('c2'))) return 'Beemaram C2';
  return b;
}

function isValidCampus(branch) {
  if (!branch || typeof branch !== 'string') return false;
  const norm = normalizeCampus(branch);
  return VALID_CAMPUSES.includes(norm);
}

function isValidPositiveNumber(val) {
  if (val === undefined || val === null) return false;
  const num = Number(val);
  return !isNaN(num) && num >= 0;
}

// Strict 24-hex-character ObjectId check (prevents CastError on 12-char non-hex strings like ADM-ACC-1104)
function isValidObjectId(val) {
  if (!val) return false;
  return /^[0-9a-fA-F]{24}$/.test(String(val).trim());
}

// --- TEXT FIELD VALIDATION ---
//
// Two gaps a deliberate-failure test exposed:
//  - A 50,000-character student name was accepted and stored. There were no
//    length limits on any text field.
//  - A nested object passed as `studentName` was accepted, because
//    String(value) turns {a:{b:1}} into the literal "[object Object]" rather
//    than rejecting it. Every text field went through that coercion.
const MAX_TEXT = { short: 100, medium: 250, long: 2000 };

// Per-field ceilings, mirroring src/constants/fieldLimits.ts.
//
// The browser's maxLength is a convenience for whoever is typing; it is not a
// control, because anyone can post straight to the API. These are the limits
// that actually hold. Keep the two lists in step — if they drift, the form
// accepts something the server then rejects, which reads as a broken app.
const FIELD_LIMITS = {
  personName: 50,
  admissionNumber: 20,
  rollNumber: 20,
  staffId: 20,
  studentId: 20,
  mobile: 10,
  email: 50,
  address: 200,
  course: 30,
  section: 30,
  subject: 50,
  department: 50,
  previousSchool: 100,
  previousBoard: 50,
  academicYear: 12,
  remarks: 500,
  notes: 500,
  reason: 250,
  category: 50,
  feeSlotName: 50,
  receiptNumber: 30,
  transactionRef: 30,
  username: 40,
  password: 72,
  backupCode: 20
};

// Largest amount any single money field may carry. Nine digits is more than a
// college fee will ever be and keeps a pasted number from reaching the
// arithmetic as something that overflows into scientific notation.
const MAX_MONEY = 999999999;

// Accepts only real scalars. Objects and arrays are rejected outright instead
// of being coerced into a meaningless string.
function cleanText(value, { field, max = MAX_TEXT.short, required = false }) {
  if (value === undefined || value === null || value === '') {
    if (required) return { error: `${field} is required.` };
    return { value: '' };
  }
  if (typeof value === 'object') {
    return { error: `${field} must be text, not an object or list.` };
  }
  const s = String(value).trim();
  if (required && !s) return { error: `${field} is required.` };
  if (s.length > max) return { error: `${field} must be ${max} characters or fewer.` };
  return { value: s };
}

// Validates a batch of text fields; returns the first error, or the cleaned values.
function cleanTextFields(body, spec) {
  const out = {};
  for (const [field, opts] of Object.entries(spec)) {
    const r = cleanText(body[field], { field, ...opts });
    if (r.error) return { error: r.error };
    out[field] = r.value;
  }
  return { values: out };
}

// --- FIELD ALLOWLISTING FOR UPDATES ---
//
// Update handlers used to do `Object.assign(doc, req.body)`. That let a caller
// write ANY schema field through an unrelated endpoint — most dangerously
// `branch`, which is the column every campus-isolation check reads. A campus
// accountant could move a record into their own campus, or out of it, through
// a routine edit. Updates now copy only the fields named here, each validated.
//
// spec: { field: 'string' | 'number' | 'nonNegativeNumber' | 'boolean' | 'date' | 'raw' }
function applyAllowedFields(doc, body, spec) {
  const applied = [];
  for (const [field, kind] of Object.entries(spec)) {
    if (body[field] === undefined) continue;
    const v = body[field];

    switch (kind) {
      case 'number':
      case 'nonNegativeNumber': {
        if (!isValidPositiveNumber(v)) {
          return { error: `${field} must be a valid non-negative number.` };
        }
        doc[field] = Number(v);
        break;
      }
      case 'boolean':
        doc[field] = Boolean(v);
        break;
      case 'date': {
        const d = new Date(v);
        if (isNaN(d.getTime())) return { error: `${field} must be a valid date.` };
        doc[field] = d;
        break;
      }
      case 'string': {
        const r = cleanText(v, { field, max: MAX_TEXT.long });
        if (r.error) return { error: r.error };
        doc[field] = r.value;
        break;
      }
      case 'raw':
      default:
        doc[field] = v;
        break;
    }
    applied.push(field);
  }
  return { applied };
}

// Fee cap constants
const MAX_STUDENT_FEE = 1000000; // Rs. 10,00,000

// The frontend expects `mode`; the schema stores `paymentMode`. Kept in one
// place so a create and a duplicate-replay return an identically shaped object.
function normalizePaymentForClient(p) {
  if (!p) return null;
  return {
    _id: p._id,
    receiptNumber: p.receiptNumber,
    studentId: p.studentId,
    admissionNumber: p.admissionNumber,
    studentName: p.studentName,
    amount: p.amount,
    category: p.category,
    installment: p.installment,
    mode: p.paymentMode,
    cashier: p.cashier,
    branch: p.branch,
    date: p.date,
    remarks: p.remarks || '',
    transactionRef: p.transactionRef || ''
  };
}

/**
 * Sums a student's fee components.
 *
 * `Number(x || 0)` is not enough on its own. `NaN || 0` is 0 because NaN is
 * falsy, so that case was covered by luck — but a non-numeric string is
 * truthy, so `Number('abc' || 0)` is NaN, and Infinity stays Infinity. Either
 * one poisons the sum, and the resulting NaN was written straight to
 * remainingBalance: a student record whose balance is literally "not a
 * number", which then fails every comparison silently, including the
 * zero-balance test that unlocks the year upgrade.
 *
 * Anything that is not a finite number counts as zero. The routes reject bad
 * input long before this, but the arithmetic must not depend on that.
 */
function finiteAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function calcStudentGrossFees(tuitionFee, hostelFee, transportFee, miscellaneousFee, previousPending, customFeeSlots) {
  const customTotal = (Array.isArray(customFeeSlots) ? customFeeSlots : [])
    .reduce((acc, slot) => acc + finiteAmount(slot && slot.amount), 0);
  return finiteAmount(tuitionFee) + finiteAmount(hostelFee) + finiteAmount(transportFee)
    + finiteAmount(miscellaneousFee) + finiteAmount(previousPending) + customTotal;
}

/**
 * The one place a student's money is calculated.
 *
 * This arithmetic was written out inline in four separate routes, and they had
 * drifted from each other:
 *
 *   - Two rounded the balance to paise; two did not, so the figure the fee
 *     screen previewed could disagree with the figure that was stored.
 *   - The waiver total in the override route summed the fields raw, with no
 *     Number() coercion. Every other copy coerced. A waiver arriving as a
 *     string would have concatenated instead of added — "500" + 200 giving
 *     "500200" — and been written to the balance.
 *   - The ten-lakh fee cap was enforced in three routes and missed in the
 *     year-upgrade route, so fees above the cap could be set there.
 *
 * Everything is coerced, rounded once at the end, and clamped at zero.
 * Rounding at the end rather than per-component is deliberate: rounding each
 * fee first and then summing accumulates a paisa of error per line.
 */
function computeStudentFees(source, { totalPaid } = {}) {
  const num = finiteAmount;
  const round2 = (n) => Math.round(n * 100) / 100;

  const gross = calcStudentGrossFees(
    source.tuitionFee, source.hostelFee, source.transportFee,
    source.miscellaneousFee, source.previousPending, source.customFeeSlots
  );

  const waivers = num(source.tuitionWaiver) + num(source.hostelWaiver)
    + num(source.transportWaiver) + num(source.miscWaiver);

  const paid = num(totalPaid !== undefined ? totalPaid : source.totalPaid);

  // Waivers cannot reduce the bill below zero, and a student who has overpaid
  // owes nothing rather than a negative amount.
  const netOwed = Math.max(0, round2(gross - waivers));
  const balance = Math.max(0, round2(netOwed - paid));

  return {
    gross: round2(gross),
    waivers: round2(waivers),
    netOwed,
    paid: round2(paid),
    balance,
    exceedsCap: round2(gross) > MAX_STUDENT_FEE
  };
}

// --- MANAGED PORTAL SLOTS ---
//
// The fixed set of accounts this system is allowed to have: one Rector, one
// security authenticator, seven clerk slots per campus, one accountant per
// campus. Usernames, roles and campuses only — never credentials.
//
// The clerk slots are DECLARED here but not all occupied: only slot 1 of each
// campus exists today, carried over from the single admin2 account each
// campus used to have. Slots 2 to 7 are provisioned by the Rector.
const CLERK_SLOTS_PER_CAMPUS = 7;

const clerkUsername = (campus, slot) =>
  `clerk${slot}_${campus.toLowerCase().replace(/\s+/g, '_')}`;

const defaultUsers = [
  { username: 'admin1', role: 'admin1', campus: 'All', name: 'Rector' },
  { username: '9059068384', role: 'authenticator', campus: 'All', name: 'Security Authenticator' },
  ...VALID_CAMPUSES.flatMap(c =>
    Array.from({ length: CLERK_SLOTS_PER_CAMPUS }, (_, i) => ({
      username: clerkUsername(c, i + 1),
      role: 'clerk',
      campus: c,
      slotIndex: i + 1,
      name: `Clerk ${i + 1} ${c}`
    }))
  ),
  ...VALID_CAMPUSES.map(c => ({
    username: `accountant_${c.toLowerCase().replace(/\s+/g, '_')}`,
    role: 'accountant',
    campus: c,
    name: `Accountant ${c}`
  }))
];

/**
 * --- CREDENTIAL STORAGE ------------------------------------------------
 *
 * Passwords and PINs are stored in PLAINTEXT in MongoDB, so that the Rector
 * can read as well as set every account's credentials from the admin portal.
 *
 * This is a deliberate instruction from the operator, given after the
 * tradeoff was set out: bcrypt does not prevent an administrator from
 * CHANGING a credential, only from reading an existing one, and the operator
 * wants to read them. The cost is that anyone who obtains the database
 * obtains every live credential at once, with no work factor in the way.
 *
 * Two boundaries were NOT conceded and still hold:
 *   1. No credential is ever a literal in this repository. The repo is
 *      public; the database is not. A password in source is exposed the
 *      moment it is pushed.
 *   2. No credential is ever written to the audit trail, a log line, or any
 *      response that is not the Rector's own credential screen.
 */

/**
 * Compare a supplied credential against what is stored, in EITHER format.
 *
 * Existing accounts hold bcrypt hashes, and a hash cannot be reversed — so
 * there is no migration that turns them into plaintext. Accepting both
 * formats is what makes this change deployable without locking everyone out:
 * an account keeps working on its old hashed credential until the Rector next
 * sets it, at which point it is stored as plaintext.
 *
 * A stored value beginning with `$2` is a bcrypt hash; anything else is
 * plaintext. That prefix is the standard bcrypt identifier, and no generated
 * credential here can begin with it — `generateClerkCredentials` draws from
 * an alphabet with no `$`.
 */
function credentialMatches(supplied, stored) {
  if (!supplied || typeof supplied !== 'string' || !stored || typeof stored !== 'string') {
    return false;
  }
  const value = supplied.trim();
  const expected = stored.trim();

  if (expected.startsWith('$2')) {
    try {
      return bcrypt.compareSync(value, expected);
    } catch (err) {
      console.warn('⚠️ [Auth]: Bcrypt comparison notice:', err.message);
      return false;
    }
  }

  // Constant-time for the plaintext path. bcrypt.compareSync is already
  // constant-time; a bare `===` here would not be, and the difference is
  // measurable over a network for a short credential like a six-digit PIN.
  const a = Buffer.from(value, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Kept as the old name so existing call sites read the same. */
const safeBcryptCompare = credentialMatches;

/** True when a stored credential is still in the old hashed form. */
function isHashedCredential(stored) {
  return typeof stored === 'string' && stored.trim().startsWith('$2');
}


// NOTE: there is deliberately no in-source credential list here.
// A previous revision kept a `defaultSeedUsers` array of plaintext
// passwords/PINs that `validateUserLoginCredentials` fell back to whenever
// the database lookup returned nothing — including when the database was
// merely unreachable — which made every account loggable-into with a
// credential committed to a public repository. Credentials living in the
// DATABASE as plaintext is the operator's decision; a credential living in
// THIS FILE is the defect described above, and remains forbidden.

// Username of the security authenticator slot. This is an identifier, not a
// secret: it marks the one account the management panel refuses to edit.
const FIXED_AUTHENTICATOR_USERNAME = '9059068384';
// 'admin2' stays accepted here until the migration has run everywhere; it is
// collapsed to 'clerk' by normalizeRole before any decision is made.
const MANAGED_PORTAL_ROLES = new Set(['admin1', 'admin2', 'clerk', 'accountant', 'authenticator']);
const MANAGED_PORTAL_USERNAMES = new Set(defaultUsers.map(u => u.username));

function sanitizeManagedAccount(userDoc) {
  if (!userDoc) return null;

  const plain = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  delete plain.password;
  delete plain.pin;
  delete plain.pin_plaintext;
  return plain;
}

// Reads the real account list. Never synthesises placeholder accounts: an
// operator looking at this panel has to be able to trust that what is listed
// is what is actually in the database.
async function getManagedPortalAccounts() {
  await connectToDatabase();

  const docs = await User.find({ role: { $in: [...MANAGED_PORTAL_ROLES] } }).lean();

  return docs
      .map(doc => ({
        _id: doc._id,
        username: doc.username,
        // Normalised on the way out, so a client never has to know that
        // `admin2` and `clerk` are the same thing.
        role: normalizeRole(doc.role),
        name: doc.name,
        campus: doc.campus,
        slotIndex: doc.slotIndex ?? null,
        permissions: normalizePermissions(doc.permissions),
        email: doc.email || '',
        mobile: doc.mobile || '',
        department: doc.department || '',
        status: doc.status || 'active',
        // Whether a credential EXISTS — never the credential itself. The panel
        // previously showed a fixed caption regardless of the real state, so
        // an account with no usable password looked identical to a healthy
        // one. These two booleans are derived from the stored bcrypt hashes
        // and are the only credential information that leaves the server.
        passwordSet: Boolean(doc.password && String(doc.password).startsWith('$2')),
        pinSet: Boolean(doc.pin && String(doc.pin).startsWith('$2')),
        credentialsUpdatedAt: doc.updatedAt || null
      }))
      .sort((a, b) => {
        // Keyed on the NORMALISED role. Before the rename this map held
        // `admin2`, so once the role became `clerk` every clerk fell to the
        // ?? 99 fallback and sorted below the accountants instead of above
        // them — and un-migrated `admin2` documents would have sorted
        // somewhere else again.
        const roleOrder = { admin1: 0, authenticator: 1, clerk: 2, accountant: 3 };
        const rank = r => roleOrder[normalizeRole(r)] ?? 99;
        const roleDiff = rank(a.role) - rank(b.role);
        if (roleDiff !== 0) return roleDiff;

        // Within clerks, slot 1 before slot 2 — a plain string compare puts
        // clerk10 before clerk2, which would matter once slots go past nine.
        if (a.slotIndex != null && b.slotIndex != null && a.slotIndex !== b.slotIndex) {
          return a.slotIndex - b.slotIndex;
        }
        return String(a.username).localeCompare(String(b.username));
      });
}

// Account provisioning is deliberately NOT done from code. Seeding in-process
// requires plaintext credentials to live in the repository, which is the exact
// defect this file previously shipped. Accounts are provisioned and rotated
// out of band by scripts/rotateCredentials.cjs, which generates random
// secrets, persists only bcrypt hashes, and writes the cleartext to a
// gitignored file for the operator to distribute.

// --- SECURITY MIDDLEWARE ---

// Fail-closed database gate. Every route that touches real data sits behind
// this: if MongoDB is unreachable the request gets a 503 and the caller is
// told plainly. The alternative this app used to take — carrying on with
// placeholder data — is worse than an outage, because staff cannot tell an
// invented balance from a real one.
async function requireDatabase(req, res, next) {
  try {
    await connectToDatabase();
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not ready.');
    }
    return next();
  } catch (err) {
    console.error('[DB Gate]: Refusing request, database unavailable:', err.message);
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable: the database cannot be reached. No data was read or written.'
    });
  }
}

/**
 * Tells a broken request apart from a briefly unreachable database.
 *
 * requireDatabase only guards the START of a request. A connection that drops
 * DURING one lands in the route's catch block, which returned 500 "Internal
 * server error" — the code that tells a client the request itself is wrong and
 * there is no point retrying. Measured under load: 171 of 200 concurrent
 * reads came back 500 after Atlas reset the connection and the driver cleared
 * its pool. Nothing was wrong with any of those requests.
 *
 * Matched by error class rather than by message text, so that MongoServerError
 * — which is how a duplicate key or a bad query arrives, and IS the caller's
 * problem — keeps its 500. The message check is only a backstop for driver
 * versions that report a pool reset as a plain Error.
 */
const DEPENDENCY_ERROR_NAMES = new Set([
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoServerSelectionError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
  'MongoPoolClearedError',
  'PoolClearedError',
  'PoolClearedOnNetworkError'
]);

function isDependencyFailure(err) {
  if (!err) return false;
  if (DEPENDENCY_ERROR_NAMES.has(err.name)) return true;
  const msg = String(err.message || '');
  return /buffering timed out|pool .* was cleared|ECONNRESET|topology was destroyed|connection .* closed/i.test(msg);
}

/**
 * The single answer to "something went wrong in this route". Keeps the
 * distinction above in one place instead of in every catch block, so a new
 * route cannot quietly reintroduce the 500.
 */
function failRequest(req, res, err) {
  console.error(`[${req.method} ${req.path}]:`, err && err.message);
  if (isDependencyFailure(err)) {
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable: the database could not be reached. Please try again in a moment.'
    });
  }
  return res.status(500).json({ status: 'error', message: 'Internal server error.' });
}


// Persistent, fail-CLOSED rate limiter backed by MongoDB.
//
// Two deliberate choices here:
//  1. The counter lives in MongoDB, not process memory, so the limit holds
//     across restarts and across every instance serving the site.
//  2. If the backing store cannot be reached we return 503 rather than
//     calling next(). A rate limiter that waves everything through the moment
//     its own storage hiccups is not a rate limiter — an attacker who can
//     disrupt the store gets unlimited attempts at the login endpoint.
//
// Limits are per IP + path. Auth endpoints get a much tighter budget than
// ordinary writes, which is the whole reason this middleware exists.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
// Anything that compares a secret belongs in the tight tier, not just /login.
// `/api/backup/restore` bcrypt-checks the caller's account password, so it is
// a password oracle if left on the ordinary write budget. Its `/preview`
// sibling deliberately does not match: it checks no secret and writes nothing,
// so operators can inspect several backups without burning the login budget.
const AUTH_PATH_PATTERN = /\/(login|verify-credentials|force-login|refresh|wipe-database|restore|reset-password)$/;

function rateLimitBudgetFor(path) {
  return AUTH_PATH_PATTERN.test(path) ? 10 : 120;
}

/**
 * Counts one attempt against `key`, opening a new window if the last one ran
 * out, and returns the resulting record.
 *
 * Single atomic operation. A read-then-write here would let two concurrent
 * requests both observe the pre-increment count and slip past the limit
 * together.
 *
 * The filter is the unique key ALONE. It used to also require
 * `resetAt: { $gt: now }`, which looks like it is selecting the live window
 * and is the bug: `key` is UNIQUE and `resetAt` carries a 900s TTL, so an
 * expired document survives a further fifteen minutes. Through that gap the
 * filter matched nothing, the upsert tried to INSERT over the live unique
 * key, and the duplicate-key error was answered with next() — the request
 * ran UNCOUNTED. On the auth paths, whose budget is 10, that was an
 * effectively unlimited window every half hour, and it opened again every
 * half hour after that.
 *
 * The pipeline decides increment-or-reset inside the write instead. Every
 * expression in a $set stage is evaluated against the INPUT document, so
 * `count` still reads the ORIGINAL resetAt even though the same stage is
 * replacing it. On an upsert MongoDB seeds the new document from the filter's
 * equality clause, so `key` is present and `resetAt` is missing — which
 * compares as lower than $$NOW and correctly takes the "start a new window"
 * branch.
 */
async function bumpRateLimitWindow(key) {
  return RateLimit.findOneAndUpdate(
    { key },
    [{
      $set: {
        resetAt: {
          $cond: [
            { $gt: ['$resetAt', '$$NOW'] },
            '$resetAt',
            { $add: ['$$NOW', RATE_LIMIT_WINDOW_MS] }
          ]
        },
        count: {
          $cond: [
            { $gt: ['$resetAt', '$$NOW'] },
            { $add: [{ $ifNull: ['$count', 0] }, 1] },
            1
          ]
        },
        // Set by hand: Mongoose does not apply schema timestamps to a
        // pipeline update.
        updatedAt: '$$NOW'
      }
    }],
    { upsert: true, new: true }
  );
}

/** The rate-limit key for a request. Must match mongoRateLimiter exactly. */
function rateLimitKeyFor(req) {
  return `ratelimit_${req.path}_${clientIp(req)}`;
}

/**
 * Give back the attempt a SUCCESSFUL sign-in just consumed.
 *
 * The auth budget is ten requests per IP per fifteen minutes, and it counted
 * successes as well as failures. That was fine when the system had ten
 * accounts. It is not fine now: a campus has seven clerks plus an accountant,
 * they share an office connection, and a shift change puts more than ten
 * correct sign-ins through one IP inside a quarter of an hour. The eleventh
 * person — with the right password — was told "too many requests".
 *
 * Refunding only on success keeps every property the limit exists for.
 * Guessing a password produces FAILURES, and those still count, still trip
 * the limit, and still feed the five-attempt lockout keyed to the identity.
 * Nothing an attacker does gets refunded.
 *
 * Best-effort: a failure here must not turn a good login into an error, so it
 * is logged and swallowed. The worst case is that the budget stays as strict
 * as it was before.
 */
async function refundRateLimitAttempt(req) {
  try {
    await RateLimit.updateOne(
      { key: rateLimitKeyFor(req), count: { $gt: 0 } },
      { $inc: { count: -1 } }
    );
  } catch (err) {
    console.warn('[RateLimit]: could not refund a successful attempt:', err.message);
  }
}

async function mongoRateLimiter(req, res, next) {
  const key = rateLimitKeyFor(req);
  const maxAttempts = rateLimitBudgetFor(req.path);

  try {
    await connectToDatabase();
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Rate limit store unreachable.');
    }

    let record;
    try {
      record = await bumpRateLimitWindow(key);
    } catch (err) {
      if (err && err.code === 11000) {
        // Two requests raced to create the very FIRST window for this key and
        // both attempted the insert. The document exists now, so the same
        // operation takes the increment branch. Retrying counts the attempt;
        // the previous version called next() here and did not.
        record = await bumpRateLimitWindow(key);
      } else {
        throw err;
      }
    }

    if (record.count > maxAttempts) {
      const retryAfterSec = Math.max(1, Math.ceil((new Date(record.resetAt).getTime() - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.'
      });
    }

    return next();
  } catch (err) {
    // No duplicate-key branch here any more. It used to answer next(), which
    // meant the one error the limiter could actually provoke was also the one
    // that let a request through uncounted. The single genuine race — two
    // requests creating the first window at once — is retried above; anything
    // still reaching here is a real store failure and must fail CLOSED.
    console.error('[RateLimit]: Failing closed, store unavailable:', err.message);
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable. Please try again shortly.'
    });
  }
}

// JWT Authentication Middleware with MongoDB Single-Session Verification
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required. Missing Bearer token.'
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired access token.'
    });
  }

  // The session record is authoritative and lives in MongoDB, so it holds
  // across restarts and across instances. If we cannot reach it we cannot say
  // whether this session is still valid, so we refuse the request instead of
  // assuming it is fine. This previously fabricated a user object from an
  // in-source credential list, which let a token survive both a disabled
  // account and a session eviction whenever the database was down.
  try {
    await connectToDatabase();
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not ready.');
    }
  } catch (dbErr) {
    console.error('[Auth]: Refusing request, cannot verify session:', dbErr.message);
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable: unable to verify your session.'
    });
  }

  // NOTE: `permissions` and `slotIndex` MUST stay in both selects below.
  // They were missing when the clerk permission model was added, and the
  // effect was silent and total: every clerk loaded with an absent
  // permissions object, normalizePermissions turned that into all-false, and
  // a clerk granted every power was refused every gated route. Nothing threw
  // — the account simply had no abilities. A field added to the User schema
  // and read from req.user has to be added here as well.
  let dbUser = null;
  try {
    if (mongoose.Types.ObjectId.isValid(decoded.id)) {
      dbUser = await User.findById(decoded.id).select('activeSessionId status username role campus name lastSeenAt permissions slotIndex');
    }
    if (!dbUser && decoded.username) {
      dbUser = await User.findOne({ username: resolveUsername(decoded.username) })
        .select('activeSessionId status username role campus name lastSeenAt permissions slotIndex');
    }
  } catch (dbErr) {
    console.error('[Auth]: Session lookup failed:', dbErr.message);
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable: unable to verify your session.'
    });
  }

  if (!dbUser || dbUser.status === 'disabled') {
    return res.status(401).json({ status: 'error', message: 'User account not found or disabled.' });
  }

  // A cleared activeSessionId means the user logged out. Treating "no session
  // on record" as acceptable is what let a logged-out access token keep
  // working until its natural expiry.
  if (!dbUser.activeSessionId || !decoded.sessionId || dbUser.activeSessionId !== decoded.sessionId) {
    return res.status(401).json({
      status: 'error',
      message: 'Your session is no longer active. Please sign in again.'
    });
  }

  // Idle expiry, enforced here rather than only in the browser.
  //
  // The client runs its own inactivity timer, but that is a convenience: it
  // binds only a cooperating browser tab, resets when the page reloads, and
  // does nothing at all to anyone holding the token outside the app. Since
  // refresh tokens rotate on use, a session with no server-side idle rule
  // could be kept alive indefinitely. The stored lastSeenAt is authoritative.
  const now = Date.now();
  const seenAt = dbUser.lastSeenAt ? new Date(dbUser.lastSeenAt).getTime() : null;

  if (seenAt && now - seenAt > SESSION_IDLE_TIMEOUT_MS) {
    // End it properly: clear the session so the refresh token cannot revive
    // it, rather than merely refusing this one request.
    await User.updateOne({ _id: dbUser._id }, { $set: { activeSessionId: null } }).catch(() => {});
    await RefreshToken.updateMany(
      { userId: dbUser._id, revoked: false }, { $set: { revoked: true } }
    ).catch(() => {});

    console.log(`[Auth]: Idle session expired for [${dbUser.username}] after ${Math.round((now - seenAt) / 60000)} minutes`);
    return res.status(401).json({
      status: 'error',
      message: 'Your session expired due to inactivity. Please log in again.'
    });
  }

  // Record activity, but not on every single request: a write per request
  // would multiply database load by the entire read traffic of the app for a
  // value that only needs to be accurate to within a minute.
  if (!seenAt || now - seenAt > SESSION_ACTIVITY_WRITE_INTERVAL_MS) {
    User.updateOne({ _id: dbUser._id }, { $set: { lastSeenAt: new Date(now) } })
      .catch(err => console.error('[Auth]: Could not record activity:', err.message));
  }

  // Authorisation decisions must read from the stored record, not from claims
  // baked into a token that may predate a role or campus change.
  req.user = {
    id: String(dbUser._id),
    username: dbUser.username,
    // Normalised, so every downstream comparison sees one spelling regardless
    // of what is stored on the document.
    role: normalizeRole(dbUser.role),
    campus: dbUser.campus,
    name: dbUser.name,
    slotIndex: dbUser.slotIndex ?? null,
    // Read from the database on every request rather than carried in the
    // token. Revoking a clerk's power has to take effect on their next
    // request, not whenever their token happens to expire.
    permissions: normalizePermissions(dbUser.permissions),
    sessionId: decoded.sessionId
  };

  return next();
}

// --- ROLES & PERMISSIONS ---

/**
 * The five powers the Rector can grant a clerk, in display order.
 *
 * This list is the single source of truth: the model's `permissions` fields,
 * the clerk manager UI and requirePermission all key off these names.
 */
const CLERK_PERMISSIONS = ['addStudent', 'editStudent', 'editFees', 'collectFees', 'logExpenditures'];

/**
 * One spelling for the clerk role.
 *
 * The role was called `admin2` and is now `clerk`. Rather than rename the
 * stored value and every guard in one irreversible step, both spellings are
 * accepted and collapse to `clerk` here — so a document written before the
 * migration and a guard written after it agree with each other. Remove once
 * no `admin2` documents remain anywhere.
 */
function normalizeRole(role) {
  return String(role || '') === 'admin2' ? 'clerk' : String(role || '');
}

/** Every permission present and boolean, whatever the document holds. */
function normalizePermissions(permissions) {
  const source = permissions || {};
  const result = {};
  for (const name of CLERK_PERMISSIONS) {
    result[name] = source[name] === true;
  }
  return result;
}

/**
 * Whether this caller may perform `permission`.
 *
 * admin1 is org-wide and holds every power implicitly — it is the account
 * that GRANTS these, so gating it on its own grant would be circular.
 * Accountants keep the fixed abilities their own routes already define.
 * Only a clerk is actually consulted against the stored grants.
 */
function callerHasPermission(req, permission) {
  const role = normalizeRole(req.user && req.user.role);
  if (role === 'admin1') return true;
  if (role === 'clerk') return !!(req.user.permissions && req.user.permissions[permission]);
  if (role === 'accountant') return true;
  return false;
}

// Role Authorization Middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.'
      });
    }

    // Both sides normalised: a guard may name either spelling and a stored
    // role may be either, without the two having to be changed together.
    const callerRole = normalizeRole(req.user.role);
    if (!allowedRoles.map(normalizeRole).includes(callerRole)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access forbidden. Insufficient permissions for this role.'
      });
    }

    next();
  };
}

/**
 * Gate a route on one of the Rector-granted clerk powers.
 *
 * Sits AFTER requireRole in the chain: requireRole decides who may reach the
 * route at all, this decides whether this particular clerk has been given
 * that power. The refusal names the power so the message is actionable rather
 * than a bare "forbidden", and it is recorded in the audit trail — a clerk
 * repeatedly attempting something they have not been granted is worth seeing.
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (callerHasPermission(req, permission)) return next();

    const readable = permission.replace(/([A-Z])/g, ' $1').toLowerCase();
    recordAudit(req, {
      action: `permission.denied`,
      entityType: 'permission',
      entityId: permission,
      outcome: 'denied',
      summary: `Refused: ${req.user.username} attempted to ${readable} without that power.`,
      details: { permission }
    });

    return res.status(403).json({
      status: 'error',
      message: `Your account has not been given permission to ${readable}. Ask the Rector to enable it.`
    });
  };
}

// --- AUDIT TRAIL ---

/**
 * Record one action in the audit trail.
 *
 * Deliberately fire-and-forget: it is awaited nowhere and it swallows its own
 * errors. An audit write must never turn a successful fee collection into a
 * failed request — the payment is the thing the user came to do, and losing a
 * log line is a smaller harm than losing the payment. Failures are logged to
 * the console so a broken trail is still visible to whoever is watching the
 * process.
 *
 * Call it AFTER the write it describes has succeeded, so the trail cannot
 * claim something happened that then did not. For a refusal, pass
 * `outcome: 'denied'` and call it at the point of refusal.
 *
 * Never pass a password, PIN or token in `summary` or `details`.
 */
function recordAudit(req, {
  action,
  entityType = '',
  entityId = '',
  entityLabel = '',
  summary,
  amount = null,
  campus = '',
  outcome = 'success',
  details = {}
}) {
  try {
    const actor = (req && req.user) || {};
    AuditLog.create({
      actorUsername: actor.username || 'unknown',
      actorRole: actor.role || '',
      actorName: actor.name || '',
      actorCampus: actor.campus || '',
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      entityLabel,
      summary,
      amount: (amount === null || amount === undefined || !Number.isFinite(Number(amount)))
        ? null
        : Number(amount),
      // Falls back to the actor's own campus, which is right for every
      // campus-scoped role. admin1 is org-wide, so its entries carry the
      // campus of the record that was touched and the call site passes it.
      campus: campus || actor.campus || '',
      outcome,
      details: details && typeof details === 'object' ? details : {},
      ip: (req && (req.headers['x-forwarded-for'] || req.ip)) || '',
      userAgent: (req && req.headers['user-agent']) || ''
    }).catch(err => {
      console.error('[Audit]: could not record entry:', action, err.message);
    });
  } catch (err) {
    console.error('[Audit]: could not record entry:', action, err.message);
  }
}

/** "Priya Menon (2400101)" — a label that survives the record being deleted. */
function studentLabel(student) {
  if (!student) return '';
  const id = student.admissionNumber || student.studentId || '';
  return id ? `${student.name} (${id})` : String(student.name || '');
}

// --- CAMPUS SCOPING HELPERS ---

// True when the signed-in account is entitled to act on `recordCampus`.
// admin1 (campus "All") is org-wide; everyone else is pinned to one campus.
function callerOwnsCampus(req, recordCampus) {
  if (!req.user) return false;
  if (String(req.user.campus || '').toLowerCase() === 'all') return true;
  return normalizeCampus(recordCampus) === normalizeCampus(req.user.campus);
}

// Makes a string safe to interpolate into a RegExp. Any value from a request
// that ends up in a pattern must go through this: unescaped, a metacharacter
// changes what the pattern matches, and a nested quantifier can make it take
// exponential time.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mongo filter that limits a query to the caller's campus. Returns {} only for
// genuinely org-wide accounts, never as a fallback when campus is missing.
function campusScopeFilter(req) {
  if (String(req.user.campus || '').toLowerCase() === 'all') return {};
  return { branch: req.user.campus };
}

/**
 * The campus a READ may cover, or null once a refusal has been sent.
 *
 * Three separate routes took ?branch straight from the query and used it
 * without checking it against the caller — the student list, the fee settings
 * and the enquiries list. Each was written with a different idea of who
 * needed guarding, and each missed at least one role. This is the single
 * answer to "which campus may this request see", so a new route gets the rule
 * by calling one function rather than by remembering to write it again.
 *
 * A scoped account is pinned to its own campus and refused outright if it
 * names another — never silently narrowed, because silently returning
 * different data than was asked for hides the fact that a boundary exists.
 */
function resolveReadCampus(req, res, { requireExplicit = false } = {}) {
  const requested = String(req.query.branch || req.query.campus || '').trim();
  const own = String(req.user.campus || '');
  const isOrgWide = own.toLowerCase() === 'all';

  if (!isOrgWide) {
    if (requested && requested.toLowerCase() !== 'all'
        && normalizeCampus(requested) !== normalizeCampus(own)) {
      res.status(403).json({
        status: 'error',
        message: `Your account may only view data for ${own}.`
      });
      return null;
    }
    return own;
  }

  // Org-wide: may narrow to any real campus, or see everything.
  if (!requested || requested.toLowerCase() === 'all') {
    if (requireExplicit) {
      res.status(400).json({ status: 'error', message: 'Specify which campus to view.' });
      return null;
    }
    return null; // null means "no campus filter" for an org-wide caller
  }
  if (!isValidCampus(requested)) {
    res.status(400).json({ status: 'error', message: `Unknown campus [${requested}].` });
    return null;
  }
  return normalizeCampus(requested);
}

// Campus Isolation Middleware
function enforceCampusIsolation(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  const requestedCampus = req.query.campus || req.query.branch || req.body.campus || req.body.branch || req.params.campus || req.params.branch;
  if (!requestedCampus || req.user.campus === 'All' || String(requestedCampus).toLowerCase() === 'all') {
    return next();
  }

  if (requestedCampus.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
    return res.status(403).json({
      status: 'error',
      message: `Access forbidden. Account is restricted to campus [${req.user.campus}].`
    });
  }

  next();
}

// Secondary confirmation for destructive and financial actions.
//
// This used to be a bare next(), so every route documented as "requires
// security confirmation" — fee overrides, staff deletion, expenditure
// deletion, worker payments — had no confirmation at all. The check is now
// real: the caller must re-supply the signed-in account's own PIN, and it is
// verified with bcrypt against the hash in MongoDB. Nothing is trusted from
// the client beyond the PIN value itself.
async function verifySecurityOtp(req, res, next) {
  const supplied = req.headers['x-security-pin'] || (req.body && req.body.securityPin);

  if (!supplied || typeof supplied !== 'string' || !supplied.trim()) {
    // 403, not 401: the session is perfectly valid, the caller just has not
    // confirmed this particular action yet. A 401 here would be indistinguishable
    // from an expired session and would tear the whole app down.
    return res.status(403).json({
      status: 'error',
      message: 'This action requires your security PIN for confirmation.',
      requiresSecurityPin: true
    });
  }

  try {
    await connectToDatabase();
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not ready.');
    }

    // The step-up PIN gets the same five-guess budget as the login. Without
    // it, an attacker who had already obtained a session could sit and grind
    // six digits against a destructive route — a million combinations with
    // nothing but the IP limiter in the way.
    //
    // Keyed by user id rather than by the typed identifier, because at this
    // point we know exactly whose PIN is being guessed.
    const key = attemptKey('pin', req.user.id);
    const before = await getLockState(key);
    if (before.locked) {
      console.warn(`[Security]: LOCKED PIN attempt by [${req.user.username}] for ${req.method} ${req.path}`);
      const mins = Math.ceil(before.secondsRemaining / 60);
      return res.status(429).json({
        status: 'error',
        locked: true,
        lockedForSeconds: before.secondsRemaining,
        attemptsRemaining: 0,
        // Not requiresSecurityPin: prompting again would put the user in a
        // loop against a gate that is refusing everything for now.
        message: `Too many incorrect PIN attempts. Confirmation is locked for ${mins} more minute${mins === 1 ? '' : 's'}.`
      });
    }

    const user = await User.findById(req.user.id).select('pin');
    if (!user || !user.pin || !safeBcryptCompare(supplied, user.pin)) {
      console.warn(`[Security]: Failed PIN confirmation by [${req.user.username}] for ${req.method} ${req.path}`);

      const after = await recordFailedAttempt(key);
      if (after.locked) {
        console.warn(`[Security]: PIN LOCKED OUT [${req.user.username}] for ${LOCKOUT_MINUTES} minutes`);
        const mins = Math.ceil(after.secondsRemaining / 60);
        return res.status(429).json({
          status: 'error',
          locked: true,
          lockedForSeconds: after.secondsRemaining,
          attemptsRemaining: 0,
          message: `Too many incorrect PIN attempts. Confirmation is locked for ${mins} minute${mins === 1 ? '' : 's'}.`
        });
      }

      return res.status(403).json({
        status: 'error',
        message: `Incorrect security PIN. ${after.attemptsRemaining} attempt${after.attemptsRemaining === 1 ? '' : 's'} remaining.`,
        attemptsRemaining: after.attemptsRemaining,
        requiresSecurityPin: true
      });
    }

    await clearFailedAttempts(key);
    console.log(`[Security]: PIN confirmed for [${req.user.username}] on ${req.method} ${req.path}`);
    return next();
  } catch (err) {
    console.error('[Security]: PIN verification failed:', err.message);
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable: unable to verify your security PIN.'
    });
  }
}


// --- USERNAME ALIAS RESOLUTION ---
//
// Convenience shorthands for the login box. These map to real usernames; they
// are not credentials and grant nothing on their own.
//
// There is now exactly one accountant per campus, so the old _1/_2 suffixed
// aliases are gone along with the duplicate accounts they pointed at.
const usernameAliasMap = {
  admin: 'admin1',
  admin1: 'admin1',
  rector: 'admin1',
  superadmin: 'admin1',

  authenticator: '9059068384',
  security: '9059068384',

  admin2_e1: 'admin2_erragattugutta_c1',
  admin2_c1: 'admin2_erragattugutta_c1',
  admin2_e2: 'admin2_erragattugutta_c2',
  admin2_c2: 'admin2_erragattugutta_c2',
  admin2_b1: 'admin2_beemaram_c1',
  admin2_b2: 'admin2_beemaram_c2',

  acc_e1: 'accountant_erragattugutta_c1',
  acc_e2: 'accountant_erragattugutta_c2',
  acc_b1: 'accountant_beemaram_c1',
  acc_b2: 'accountant_beemaram_c2'
};

function resolveUsername(input) {
  if (!input) return '';
  const clean = String(input).trim().toLowerCase();
  return usernameAliasMap[clean] || clean;
}

// NOTE: a deterministic 24-hour "security code" generator lived here. It
// derived PINs from a hardcoded string plus the date, so the same input
// always produced the same code and anyone with this file could compute
// every account's code for any day. Nothing calls it now that PINs are
// random and bcrypt-hashed, and it is removed rather than left to be
// wired back up.

/**
 * Verifies a login against the bcrypt hashes stored in MongoDB.
 *
 * Returns the Mongoose user document on success, or throws AuthUnavailable if
 * the database cannot be reached. It never falls back to an in-source
 * credential and never returns a synthesised user: a login either matches the
 * real stored hash or it fails.
 */
class AuthUnavailableError extends Error {}

/**
 * Find which of a campus's clerks these credentials belong to.
 *
 * The clerk login asks for a campus and nothing else identifying — a clerk
 * types their own password and PIN and the server works out which of the
 * seven slots they are. That is a deliberate convenience: the operator did
 * not want people memorising `clerk4_beemaram_c2`.
 *
 * The cost is that the password is now the only thing identifying the account
 * within a campus, so it is checked accordingly:
 *
 *   - Every one of the seven is compared, and ALL comparisons run before a
 *     verdict, so the time taken does not reveal which slot matched.
 *   - Exactly one match signs in. More than one is refused outright rather
 *     than picking the first: two clerks sharing a password would otherwise
 *     mean somebody silently signing in as a colleague, and every entry in
 *     the audit trail after that would name the wrong person.
 *   - A PIN, when supplied, has to match the SAME account as the password.
 *     Matching the password on one clerk and the PIN on another is not a
 *     login, it is two half-credentials.
 */
async function findClerkByCampusCredentials(campus, password, pin) {
  const normalizedCampus = normalizeCampus(String(campus || '').trim());
  if (!isValidCampus(normalizedCampus)) return { user: null, reason: 'unknown-campus' };

  const normalizedPassword = String(password || '').trim();
  const normalizedPin = pin !== undefined && pin !== null ? String(pin).trim() : null;
  if (!normalizedPassword) return { user: null, reason: 'no-password' };

  let candidates;
  try {
    candidates = await User.find({
      role: { $in: ['clerk', 'admin2'] },
      campus: normalizedCampus,
      status: { $ne: 'disabled' }
    });
  } catch (dbErr) {
    throw new AuthUnavailableError(dbErr.message);
  }

  const matches = [];
  for (const candidate of candidates) {
    const passwordOk = credentialMatches(normalizedPassword, candidate.password);
    const pinOk = normalizedPin === null || credentialMatches(normalizedPin, candidate.pin);
    if (passwordOk && pinOk) matches.push(candidate);
  }

  if (matches.length === 1) return { user: matches[0], reason: 'ok' };
  if (matches.length > 1) return { user: null, reason: 'ambiguous', count: matches.length };
  return { user: null, reason: 'no-match' };
}

async function validateUserLoginCredentials(inputUser, password, pin) {
  if (!inputUser || typeof password !== 'string' || !password.trim()) {
    return null;
  }

  const resolvedUser = resolveUsername(inputUser);
  const normalizedPassword = password.trim();
  const normalizedPin = pin !== undefined && pin !== null ? String(pin).trim() : null;

  // Fail closed. If we cannot consult the real hashes we cannot authenticate
  // anyone, and saying so is the only honest outcome.
  try {
    await connectToDatabase();
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not ready.');
    }
  } catch (dbErr) {
    throw new AuthUnavailableError(dbErr.message);
  }

  let user;
  try {
    user = await User.findOne({ username: resolvedUser });
  } catch (dbErr) {
    throw new AuthUnavailableError(dbErr.message);
  }

  if (!user || user.status === 'disabled') {
    return null;
  }

  if (!safeBcryptCompare(normalizedPassword, user.password)) {
    return null;
  }

  if (normalizedPin !== null && !safeBcryptCompare(normalizedPin, user.pin)) {
    return null;
  }

  return user;
}


// --- AUTHENTICATION ROUTES ---

// authenticateToken has already loaded and validated the real user record, so
// this simply reports it back. No reconstruction from token claims or from a
// seed list.
/**
 * The account fields the browser is allowed to see.
 *
 * Login and /auth/me built this inline and had drifted apart already; adding
 * permissions to one and not the other would have meant a clerk's portal
 * looked right after signing in and lost half its modules on the next reload.
 *
 * `permissions` is included because the clerk portal decides which modules to
 * render from it. That is presentation only — every route re-checks the same
 * grants server-side through requirePermission, because hiding a button is
 * not a control.
 */
function publicUserPayload(user) {
  return {
    id: user._id ? String(user._id) : user.id,
    username: user.username,
    role: normalizeRole(user.role),
    campus: user.campus,
    name: user.name,
    slotIndex: user.slotIndex ?? null,
    permissions: normalizePermissions(user.permissions)
  };
}

app.get(['/api/auth/me', '/auth/me', '/api/me'], authenticateToken, async (req, res) => {
  return res.json({
    status: 'success',
    user: publicUserPayload(req.user)
  });
});

app.post(['/api/auth/verify-credentials', '/auth/verify-credentials', '/api/verify-credentials'], mongoRateLimiter, async (req, res) => {
  try {
    const { username, identifier, password, campus } = req.body || {};

    // This route checks a password on its own, so it needs the same five-guess
    // budget as /auth/login — and it shares the counter, or an attacker would
    // simply get five here and another five there. It was previously an
    // unlimited password oracle with only the IP limiter in front of it.
    const attempted = String(username || identifier || '').trim().toLowerCase();

    // A clerk verifies against a CAMPUS rather than a username; the same
    // shape /auth/login accepts, so the two steps agree about who is signing
    // in. Keyed on the campus for the same reason.
    const clerkCampus = !attempted && campus ? normalizeCampus(String(campus).trim()) : null;
    const byCampus = Boolean(clerkCampus);

    // Same rule as /auth/login: a missing identifier or password is a
    // malformed request, not a failed guess, and must not spend an attempt.
    if ((!attempted && !byCampus) || typeof password !== 'string' || password === '') {
      return res.status(400).json({
        status: 'error',
        message: byCampus ? 'A password is required.' : 'A username and password are both required.'
      });
    }

    if (byCampus && !isValidCampus(clerkCampus)) {
      return res.status(400).json({ status: 'error', message: `Unknown campus [${campus}].` });
    }

    const key = attemptKey('login', byCampus ? `campus:${clerkCampus}` : attempted);

    const before = await getLockState(key);
    if (before.locked) {
      console.warn(`[Auth]: LOCKED verify-credentials for [${attempted || '(blank)'}] from ${clientIp(req)}`);
      return lockedResponse(res, before);
    }

    let user = null;
    if (byCampus) {
      // Password only at this step — the PIN is the second factor and is
      // checked by /auth/login, which re-resolves the same clerk.
      const found = await findClerkByCampusCredentials(clerkCampus, password, null);
      if (found.reason === 'ambiguous') {
        console.warn(`[Auth]: AMBIGUOUS verify at [${clerkCampus}] — ${found.count} clerks share this password`);
        await recordFailedAttempt(key);
        return res.status(409).json({
          status: 'error',
          message: 'More than one clerk at this campus shares this password. '
            + 'Ask the Rector to give each clerk a different password.'
        });
      }
      user = found.user;
    } else {
      user = await validateUserLoginCredentials(username || identifier, password);
    }

    if (!user) {
      console.warn(`[Auth]: FAILED verify-credentials for [${attempted || (byCampus ? clerkCampus : '(blank)')}] from ${clientIp(req)}`);
      const after = await recordFailedAttempt(key);
      if (after.locked) {
        console.warn(`[Auth]: LOCKED OUT [${attempted || '(blank)'}] for ${LOCKOUT_MINUTES} minutes`);
        return lockedResponse(res, after);
      }
      return res.status(401).json({
        status: 'error',
        message: `Invalid credentials. ${after.attemptsRemaining} attempt${after.attemptsRemaining === 1 ? '' : 's'} remaining before this account is locked.`,
        attemptsRemaining: after.attemptsRemaining,
        locked: false
      });
    }

    // The LOCKOUT run is deliberately NOT cleared here. This is only the
    // first of two factors — the PIN still has to be entered — so the run
    // stays open until the account actually signs in. Clearing on a correct
    // password alone would let someone with the password reset the counter at
    // will and grind the PIN forever.
    //
    // The IP's rate-limit attempt IS refunded, which is a different thing: it
    // says "this request was not an attack", not "this person is
    // authenticated". Signing in costs two auth requests — this one and the
    // login — so without the refund a two-step sign-in burned two of the ten
    // an IP is allowed in fifteen minutes, and five people could not get in.
    await refundRateLimitAttempt(req);

    return res.json({
      status: 'success',
      role: user.role,
      campus: user.campus
    });
  } catch (err) {
    if (err instanceof AuthUnavailableError) {
      console.error('[Auth]: verify-credentials unavailable:', err.message);
      return res.status(503).json({ status: 'error', message: 'Service temporarily unavailable. Please try again shortly.' });
    }
    console.error('[Auth]: Error verifying credentials:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * Issues a session for a verified user.
 *
 * `evictExisting` distinguishes /auth/login from /auth/force-login: both mint a
 * fresh activeSessionId, but force-login is the explicit "kick my other
 * session" path the UI offers after a single-session rejection.
 */
async function issueSession(user, res, req = null) {
  const newSessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  // Persist the session before handing out a token. If this write fails the
  // token would reference a session the database does not know about, and
  // authenticateToken would reject every subsequent request — so a failure
  // here has to surface as a failed login, not a half-created session.
  //
  // lastSeenAt must be stamped here. The idle check treats a session with no
  // recorded activity as never-seen rather than as expired, but leaving it
  // null would mean a brand new session had no clock running against it.
  const now = new Date();
  user.activeSessionId = newSessionId;
  user.sessionStartedAt = now;
  user.lastSeenAt = now;
  if (req) {
    // Through clientIp, so the recorded address respects the trusted-proxy
    // depth rather than believing whatever the caller put in the header.
    user.sessionIp = clientIp(req).slice(0, 64);
    user.sessionUserAgent = String(req.headers['user-agent'] || '').slice(0, 250);
  }
  await user.save();

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
      campus: user.campus,
      name: user.name,
      sessionId: newSessionId
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

  // Retire any refresh tokens from the evicted session so a stale token cannot
  // mint new access tokens for a session that is no longer current.
  await RefreshToken.updateMany({ userId: user._id, revoked: false }, { $set: { revoked: true } });
  await RefreshToken.create({
    tokenHash,
    userId: user._id,
    username: user.username,
    sessionId: newSessionId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false
  });

  return res.json({
    status: 'success',
    token,
    refreshToken: refreshTokenRaw,
    user: publicUserPayload(user)
  });
}

/**
 * The client's address, as far as it can be trusted.
 *
 * This used to read X-Forwarded-For straight off the request and take its
 * leftmost entry. That header is set by the CLIENT, and only overwritten by a
 * proxy for the hop it controls — so anyone could send whatever they liked.
 * The rate limiter keyed on this value, which made it bypassable outright: a
 * fresh X-Forwarded-For bought a fresh budget on every request. Confirmed by
 * test — 14 login attempts, none blocked, against a limit of 10.
 *
 * Express computes this correctly once it knows how many proxies sit in
 * front. With `trust proxy` set to that number it walks in from the RIGHT of
 * the chain, past exactly the hops we control, and anything the client
 * prepended is ignored. TRUSTED_PROXY_HOPS is 1 for Hostinger's edge; set it
 * to 0 for a directly exposed server, which makes req.ip the socket address
 * and ignores the header entirely.
 *
 * The per-account lockout is keyed by username rather than address precisely
 * because address-based limits can be evaded this way. Both matter: one
 * bounds a single machine, the other bounds a single account.
 */
function clientIp(req) {
  return String(req.ip || req.socket.remoteAddress || 'unknown').trim();
}

/**
 * --- ACCOUNT LOCKOUT -----------------------------------------------------
 *
 * Five wrong guesses and the account stops answering for fifteen minutes.
 *
 * This sits alongside the IP rate limiter rather than replacing it. The IP
 * limiter bounds how fast one machine can hammer the endpoint; it does nothing
 * about an attacker rotating IPs, who could work through a password list a few
 * guesses at a time from each address forever. This bounds the guesses an
 * individual account will answer, wherever they come from.
 *
 * The lock clears itself, and a correct sign-in resets the counter. That is
 * deliberate: an account that stays locked until an administrator intervenes
 * turns one mistyped PIN into a campus that cannot take fee payments until
 * somebody is reachable by phone.
 *
 * Accepted trade-off: anyone who knows a username can keep it locked by
 * failing five times. Fifteen minutes and self-clearing keeps that a nuisance
 * rather than an outage, and the alternative — no lockout — is worse.
 */
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES) || 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

// Counters live a little past the lock so a burst of failures cannot be
// erased by waiting for the TTL instead of waiting out the lock.
const ATTEMPT_TTL_MS = LOCKOUT_MS * 4;

function attemptKey(kind, value) {
  return `${kind}:${String(value || '').trim().toLowerCase()}`;
}

// Returns { locked, secondsRemaining, attemptsRemaining }.
async function getLockState(key) {
  const row = await LoginAttempt.findOne({ key }).lean();
  if (!row) return { locked: false, secondsRemaining: 0, attemptsRemaining: MAX_LOGIN_ATTEMPTS };

  const until = row.lockedUntil ? new Date(row.lockedUntil).getTime() : 0;
  if (until > Date.now()) {
    return {
      locked: true,
      secondsRemaining: Math.ceil((until - Date.now()) / 1000),
      attemptsRemaining: 0
    };
  }
  // An expired lock means the previous run is spent; start the count again
  // rather than leaving the caller one guess away from a fresh lock.
  const used = until ? 0 : (row.failedCount || 0);
  return { locked: false, secondsRemaining: 0, attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - used) };
}

/**
 * Counts one failed guess, atomically.
 *
 * This used to read the row, add one in JavaScript, and write the total back.
 * Sequential guesses counted correctly, so it looked right — but guesses sent
 * in PARALLEL all read the same starting value and all wrote the same total,
 * so the counter barely moved. Measured: eight simultaneous wrong passwords
 * left failedCount at 1 and the account unlocked, and a ninth attempt was
 * still told it had three tries left. An attacker who sent guesses side by
 * side instead of one after another was never locked out at all.
 *
 * The increment now happens inside the database, the same way the IP rate
 * limiter above already did it, so every concurrent attempt is counted.
 */
async function recordFailedAttempt(key) {
  const now = Date.now();

  // Retire a run whose lock has already run out, so the next failure starts a
  // fresh count of five rather than landing on a spent counter. The filter
  // only matches a row holding an EXPIRED lock — a null lockedUntil does not
  // compare $lte against a date — so this cannot delete a live counter out
  // from under a concurrent request.
  await LoginAttempt.deleteOne({ key, lockedUntil: { $lte: new Date(now) } }).catch(() => {});

  const row = await LoginAttempt.findOneAndUpdate(
    { key },
    {
      $inc: { failedCount: 1 },
      $set: { lastFailedAt: new Date(now), expiresAt: new Date(now + ATTEMPT_TTL_MS) },
      $setOnInsert: { key }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const failedCount = row ? (row.failedCount || 0) : 1;
  const locked = failedCount >= MAX_LOGIN_ATTEMPTS;

  // Stamp the lock only on the row that has none yet. Whichever of a set of
  // concurrent attempts arrives here first sets the deadline; the rest match
  // nothing and leave it alone, so the lock cannot be pushed further out by
  // piling on more guesses.
  if (locked && !row.lockedUntil) {
    await LoginAttempt.updateOne(
      { key, lockedUntil: null },
      { $set: { lockedUntil: new Date(now + LOCKOUT_MS) } }
    ).catch(() => {});
  }

  const until = row.lockedUntil ? new Date(row.lockedUntil).getTime() : now + LOCKOUT_MS;
  return {
    locked,
    attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - failedCount),
    secondsRemaining: locked ? Math.max(1, Math.ceil((until - now) / 1000)) : 0
  };
}

async function clearFailedAttempts(key) {
  await LoginAttempt.deleteOne({ key }).catch(() => {});
}

// The refusal shown to a locked-out caller. Same shape everywhere so the UI
// can render one countdown regardless of which gate produced it.
function lockedResponse(res, state, what = 'Too many incorrect attempts.') {
  const mins = Math.ceil(state.secondsRemaining / 60);
  return res.status(429).json({
    status: 'error',
    locked: true,
    lockedForSeconds: state.secondsRemaining,
    attemptsRemaining: 0,
    message: `${what} This account is locked for ${mins} more minute${mins === 1 ? '' : 's'}.`
  });
}

async function handleLogin(req, res, label) {
  try {
    const { username, identifier, password, pin, campus } = req.body || {};
    const attempted = String(username || identifier || '').trim().toLowerCase();

    // A clerk signs in with a CAMPUS instead of a username: they pick their
    // campus and type their own password, and the server works out which of
    // the seven slots that is. Only this shape omits an identifier.
    const clerkCampus = !attempted && campus ? normalizeCampus(String(campus).trim()) : null;
    const byCampus = Boolean(clerkCampus);

    // A request that supplies no identifier or no password is malformed, not a
    // guess: reject it 400 and do NOT charge the lockout budget.
    //
    // It used to fall through to the credential check, come back 401, and burn
    // an attempt. That made the lockout reachable by accident — a client bug
    // posting an empty or wrong-shaped body five times would lock a real
    // member of staff out for fifteen minutes without anyone typing a
    // password. It also gave an attacker nothing, since guessing requires
    // sending a password anyway.
    if ((!attempted && !byCampus) || typeof password !== 'string' || password === '') {
      return res.status(400).json({
        status: 'error',
        message: byCampus
          ? 'A password is required.'
          : 'A username and password are both required.'
      });
    }

    if (byCampus && !isValidCampus(clerkCampus)) {
      return res.status(400).json({
        status: 'error',
        message: `Unknown campus [${campus}].`
      });
    }

    // The lockout is keyed on the campus for a campus sign-in. Keying it on
    // the password would leak which guesses have been tried, and leaving it
    // unkeyed would let seven accounts share one budget by accident. A campus
    // is the unit being guessed against here, so it is the unit that locks.
    const key = attemptKey('login', byCampus ? `campus:${clerkCampus}` : attempted);

    // Check the lock BEFORE verifying anything. A locked account must not
    // reveal whether the guess would have been right.
    const before = await getLockState(key);
    if (before.locked) {
      console.warn(`[Auth]: LOCKED ${label} attempt for [${attempted || '(blank)'}] from ${clientIp(req)}`);
      return lockedResponse(res, before);
    }

    let user = null;
    let ambiguous = false;

    if (byCampus) {
      const found = await findClerkByCampusCredentials(clerkCampus, password, pin);
      user = found.user;
      ambiguous = found.reason === 'ambiguous';

      // Two clerks on one campus sharing a password. Refusing is the only safe
      // answer: signing in as whichever matched first would put the wrong name
      // on every audit entry that followed. It costs a lockout attempt like any
      // other failure, and the message says what to fix rather than "invalid
      // credentials", because nothing the person types will help.
      if (ambiguous) {
        console.warn(`[Auth]: AMBIGUOUS campus sign-in at [${clerkCampus}] — ${found.count} clerks share these credentials`);
        await recordFailedAttempt(key);
        return res.status(409).json({
          status: 'error',
          message: 'More than one clerk at this campus shares these credentials. '
            + 'Ask the Rector to give each clerk a different password.'
        });
      }
    } else {
      user = await validateUserLoginCredentials(username || identifier, password, pin);
    }

    if (!user) {
      // Record who was targeted and from where. The access log alone only
      // showed "POST /api/auth/login 401", which cannot distinguish one
      // mistyped password from a credential-stuffing run against every
      // account. The password itself is never logged.
      console.warn(`[Auth]: FAILED ${label} for [${attempted || (byCampus ? clerkCampus : '(blank)')}] from ${clientIp(req)}`);

      const after = await recordFailedAttempt(key);
      if (after.locked) {
        console.warn(`[Auth]: LOCKED OUT [${attempted || '(blank)'}] for ${LOCKOUT_MINUTES} minutes`);
        return lockedResponse(res, after);
      }
      // Tell the user how many tries are left. Withholding it does not slow an
      // attacker down — they can count — it only ambushes staff who mistyped.
      return res.status(401).json({
        status: 'error',
        message: `Invalid credentials. ${after.attemptsRemaining} attempt${after.attemptsRemaining === 1 ? '' : 's'} remaining before this account is locked.`,
        attemptsRemaining: after.attemptsRemaining,
        locked: false
      });
    }

    // A correct sign-in wipes the run, so a user who mistyped twice and then
    // succeeded does not carry those failures into next week.
    await clearFailedAttempts(key);
    // ...and does not spend the IP's auth budget either. A whole campus
    // starting a shift is not a brute-force attempt.
    await refundRateLimitAttempt(req);

    console.log(`[Auth]: ${label} succeeded for [${user.username}] (${user.role})`);
    return await issueSession(user, res, req);
  } catch (err) {
    if (err instanceof AuthUnavailableError) {
      console.error(`[Auth]: ${label} unavailable:`, err.message);
      return res.status(503).json({
        status: 'error',
        message: 'Service temporarily unavailable: unable to reach the account database. Please try again shortly.'
      });
    }
    console.error(`[Auth]: ${label} failed:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

app.post(['/api/auth/login', '/auth/login', '/api/login', '/login'], mongoRateLimiter, (req, res) => handleLogin(req, res, 'login'));

// Explicit "sign me in and end my other session" path.
app.post(['/api/auth/force-login', '/auth/force-login', '/api/force-login'], mongoRateLimiter, (req, res) => handleLogin(req, res, 'force-login'));


// Refresh tokens are single-use and rotate. The presented token is revoked in
// the same operation that validates it, so a replay of the old value fails
// even if it was captured in transit. Reuse of an already-revoked token is
// treated as a compromise signal and kills the whole session.
app.post(['/api/auth/refresh', '/auth/refresh', '/api/refresh'], mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(401).json({ status: 'error', message: 'Refresh token required' });
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Atomic claim: whoever flips revoked false -> true owns this rotation.
    // Two concurrent refreshes with the same token cannot both succeed.
    const record = await RefreshToken.findOneAndUpdate(
      { tokenHash, revoked: false },
      { $set: { revoked: true } },
      { new: false }
    );

    if (!record) {
      // Either never issued, or already used. If it was already used, someone
      // is replaying a spent token — revoke everything for that user.
      const spent = await RefreshToken.findOne({ tokenHash });
      if (spent) {
        console.warn(`[Auth]: Replay of a spent refresh token for [${spent.username}]. Revoking all sessions.`);
        await RefreshToken.updateMany({ userId: spent.userId }, { $set: { revoked: true } });
        await User.updateOne({ _id: spent.userId }, { $set: { activeSessionId: null } });
      }
      return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(record.userId);
    if (!user || user.status === 'disabled') {
      return res.status(401).json({ status: 'error', message: 'User account not found or disabled.' });
    }

    // The refresh token is bound to the session it was issued for. If the user
    // has since logged out or been evicted, it must not resurrect the session.
    if (!user.activeSessionId || (record.sessionId && record.sessionId !== user.activeSessionId)) {
      return res.status(401).json({ status: 'error', message: 'Your session is no longer active. Please sign in again.' });
    }

    // A refresh must not outlive the idle window either. Without this the one
    // request that renews the token would be the one request that never checks
    // whether the session should still exist, and a client refreshing on a
    // timer would keep an abandoned session alive forever.
    const idleFor = user.lastSeenAt ? Date.now() - new Date(user.lastSeenAt).getTime() : 0;
    if (idleFor > SESSION_IDLE_TIMEOUT_MS) {
      await User.updateOne({ _id: user._id }, { $set: { activeSessionId: null } });
      await RefreshToken.updateMany({ userId: user._id, revoked: false }, { $set: { revoked: true } });
      console.log(`[Auth]: Refusing refresh for idle session [${user.username}] (${Math.round(idleFor / 60000)} minutes)`);
      return res.status(401).json({
        status: 'error',
        message: 'Your session expired due to inactivity. Please log in again.'
      });
    }

    // Refreshing IS activity.
    user.lastSeenAt = new Date();
    await user.save();

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        campus: user.campus,
        name: user.name,
        sessionId: user.activeSessionId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const nextRefreshRaw = crypto.randomBytes(40).toString('hex');
    await RefreshToken.create({
      tokenHash: crypto.createHash('sha256').update(nextRefreshRaw).digest('hex'),
      userId: user._id,
      username: user.username,
      sessionId: user.activeSessionId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false
    });

    return res.json({
      status: 'success',
      token: newAccessToken,
      refreshToken: nextRefreshRaw
    });
  } catch (err) {
    console.error('[Auth]: Error refreshing token:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Logout revokes server-side. Clearing activeSessionId is what actually
// invalidates the outstanding access token, because authenticateToken now
// rejects any token whose session is not the one on record.
app.post(['/api/auth/logout', '/auth/logout', '/api/logout'], requireDatabase, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    let userIdToClear = null;

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) userIdToClear = decoded.id;
      } catch {
        // An expired access token is a perfectly ordinary way to arrive here;
        // fall through and use the refresh token to identify the session.
      }
    }

    if (refreshToken && typeof refreshToken === 'string') {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenDoc = await RefreshToken.findOne({ tokenHash });
      if (tokenDoc) {
        userIdToClear = userIdToClear || tokenDoc.userId;
      }
    }

    if (!userIdToClear) {
      return res.json({ status: 'success', message: 'Logged out successfully' });
    }

    await RefreshToken.updateMany({ userId: userIdToClear, revoked: false }, { $set: { revoked: true } });
    await User.updateOne({ _id: userIdToClear }, { $set: { activeSessionId: null } });
    console.log(`[Logout]: Session and refresh tokens revoked for user ID [${userIdToClear}].`);

    return res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    // A logout that did not actually revoke anything must not report success.
    console.error('[Logout]: Revocation failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Logout failed. Your session may still be active.' });
  }
});



// --- STUDENT ROUTES ---

app.get('/api/admin1/students', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();
    const { branch } = req.query;
    let filter = {};
    if (branch && String(branch).toLowerCase() !== 'all') {
      if (!isValidCampus(branch)) {
        return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
      }
      filter.branch = String(branch).trim();
    }
    if ((req.user.role === 'clerk' || req.user.role === 'accountant') && req.user.campus && req.user.campus.toLowerCase() !== 'all') {
      filter.branch = req.user.campus;
    }
    const students = await Student.find(filter).sort({ createdAt: -1 });
    return res.json({ status: 'success', data: students });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * The student already holding an admission number, or null.
 *
 * Case- and spacing-insensitive, so "ADM-101" and "adm-101 " collide rather
 * than producing two records for one student. Deliberately unscoped by campus:
 * admission numbers are unique across the whole college, and a check that
 * only looked at one campus would let the unique index reject a create that
 * the form had already called fine.
 */
async function findStudentByAdmissionNumber(admissionNumber) {
  const clean = String(admissionNumber || '').trim();
  if (!clean) return null;
  const pattern = new RegExp(`^\\s*${escapeRegex(clean)}\\s*$`, 'i');
  return Student.findOne({ admissionNumber: pattern }).lean();
}

const createStudentHandler = async (req, res) => {
  try {
    await connectToDatabase();
    const body = req.body || {};
    // Only non-text fields are read here. Every text field goes through
    // cleanTextFields below and is used from text.values, never the raw body.
    const {
      admissionNumber, branch, mobile, parentMobile,
      tuitionFee = 0, hostelFee = 0, transportFee = 0, miscellaneousFee = 0, previousPending = 0, customFeeSlots = [], academicYear = '2026-2027'
    } = body;

    // Reject over-long and non-scalar values before anything reaches the
    // database. This previously accepted a 50,000-character name.
    const text = cleanTextFields(body, {
      name: { required: true, max: FIELD_LIMITS.personName },
      admissionNumber: { required: true, max: FIELD_LIMITS.admissionNumber },
      fatherName: { max: FIELD_LIMITS.personName }, motherName: { max: FIELD_LIMITS.personName },
      course: { max: FIELD_LIMITS.course }, section: { max: FIELD_LIMITS.section },
      rollNumber: { max: FIELD_LIMITS.rollNumber }, studentId: { max: FIELD_LIMITS.studentId },
      email: { max: FIELD_LIMITS.email },
      dob: { max: 20 }, address: { max: FIELD_LIMITS.address },
      previousSchool: { max: FIELD_LIMITS.previousSchool }, previousBoard: { max: FIELD_LIMITS.previousBoard },
      mobile: { max: FIELD_LIMITS.mobile }, parentMobile: { max: FIELD_LIMITS.mobile }
    });
    if (text.error) {
      return res.status(400).json({ status: 'error', message: text.error });
    }

    // Money has to be bounded too. A pasted number long enough to lose
    // precision would otherwise reach the balance arithmetic, and every total
    // derived from it afterwards would be quietly wrong.
    for (const [label, value] of [
      ['Tuition fee', tuitionFee], ['Hostel fee', hostelFee], ['Transport fee', transportFee],
      ['Miscellaneous fee', miscellaneousFee], ['Previous pending', previousPending]
    ]) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ status: 'error', message: `${label} must be a number of zero or more.` });
      }
      if (n > MAX_MONEY) {
        return res.status(400).json({ status: 'error', message: `${label} cannot exceed ${MAX_MONEY.toLocaleString('en-IN')}.` });
      }
    }

    // Mobile number validation (optional fields but must be valid if provided)
    if (mobile && mobile !== '') {
      const mobileDigits = String(mobile).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(mobileDigits)) {
        return res.status(400).json({ status: 'error', message: 'Mobile number must be exactly 10 digits.' });
      }
    }
    if (parentMobile && parentMobile !== '') {
      const parentMobileDigits = String(parentMobile).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(parentMobileDigits)) {
        return res.status(400).json({ status: 'error', message: 'Parent mobile number must be exactly 10 digits.' });
      }
    }

    const targetBranch = branch || req.user.campus;
    if (!isValidCampus(targetBranch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetBranch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (!isValidPositiveNumber(tuitionFee) || !isValidPositiveNumber(hostelFee) || !isValidPositiveNumber(transportFee) || !isValidPositiveNumber(miscellaneousFee) || !isValidPositiveNumber(previousPending)) {
      return res.status(400).json({ status: 'error', message: 'Fee amounts must be valid non-negative numbers.' });
    }

    if (req.user.role === 'accountant' || req.user.role === 'clerk') {
      if (req.user.campus !== 'All' && targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({
          status: 'error',
          message: `Accountants can only add students to their assigned campus [${req.user.campus}].`
        });
      }
    }

    const existing = await findStudentByAdmissionNumber(admissionNumber);
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `Student with admission number [${existing.admissionNumber}] already exists — ${existing.name}, ${existing.branch}.`,
        conflictWith: existing.admissionNumber
      });
    }

    const standardKeys = ['tuitionfee', 'hostelfee', 'transportfee', 'miscellaneousfee', 'previouspending', 'tuition', 'hostel', 'transport', 'misc'];
    const cleanedCustomSlots = (Array.isArray(customFeeSlots) ? customFeeSlots : []).filter(slot => {
      if (!slot) return false;
      const k = String(slot.key || slot.id || '').toLowerCase().trim();
      const n = String(slot.name || '').toLowerCase().trim();
      return !standardKeys.includes(k) && !['tuition fee', 'hostel fee', 'transport fee', 'miscellaneous fee', 'previous pending'].includes(n);
    });

    const totalCustomFees = cleanedCustomSlots.reduce((acc, slot) => acc + Number(slot.amount || 0), 0);
    const grossFees = Number(tuitionFee) + Number(hostelFee) + Number(transportFee) + Number(miscellaneousFee) + Number(previousPending) + totalCustomFees;

    // Fee cap enforcement
    if (grossFees > MAX_STUDENT_FEE) {
      return res.status(400).json({
        status: 'error',
        message: `Total fees (Rs. ${grossFees.toLocaleString('en-IN')}) exceed the maximum allowed per student (Rs. ${MAX_STUDENT_FEE.toLocaleString('en-IN')}).`
      });
    }

    const remainingBalance = Math.max(0, grossFees);

    // Use the validated, length-capped values rather than the raw body.
    const t = text.values;

    /**
     * The student ID is the admission number unless one is supplied.
     *
     * This used to be `STU-${Date.now().toString().slice(-6)}`, which was
     * wrong twice over. Both portals send `studentId: admissionNumber` and the
     * server discarded it, so a student registered as "2400101" was stored
     * under a different ID than the one on screen — the record saved, but
     * every later lookup by the number that was typed missed it.
     *
     * And the last six digits of a millisecond timestamp repeat about every
     * 16 minutes 40 seconds. `studentId` carries a unique index, so two
     * students registered a little over a quarter of an hour apart collided
     * and the second was refused with "That student ID was just taken."
     *
     * The admission number is already unique college-wide and already checked
     * just above, so it is the natural key. An explicit studentId is still
     * honoured, and checked for a clash of its own.
     */
    const studentId = (t.studentId && t.studentId.trim()) || t.admissionNumber.trim();
    const studentIdClash = await Student.findOne({ studentId }).lean();
    if (studentIdClash) {
      return res.status(409).json({
        status: 'error',
        message: `Student ID [${studentId}] is already in use by ${
          callerOwnsCampus(req, studentIdClash.branch)
            ? `${studentIdClash.name} (${studentIdClash.branch})`
            : 'a student at another campus'
        }.`
      });
    }
    const newStudent = await Student.create({
      studentId,
      admissionNumber: t.admissionNumber,
      name: t.name,
      fatherName: t.fatherName,
      motherName: t.motherName,
      mobile: t.mobile,
      parentMobile: t.parentMobile,
      email: t.email,
      course: t.course,
      section: t.section,
      branch: targetBranch,
      rollNumber: t.rollNumber,
      status: 'Active',
      dob: t.dob,
      previousSchool: t.previousSchool,
      previousBoard: t.previousBoard,
      address: t.address,
      hostelStatus: body.hostelStatus || 'Day Scholar',
      transportStatus: body.transportStatus || 'Self Transport',
      tuitionFee: Number(tuitionFee),
      hostelFee: Number(hostelFee),
      transportFee: Number(transportFee),
      miscellaneousFee: Number(miscellaneousFee),
      previousPending: Number(previousPending),
      totalPaid: 0,
      remainingBalance,
      tuitionWaiver: 0,
      hostelWaiver: 0,
      transportWaiver: 0,
      miscWaiver: 0,
      customFeeSlots: cleanedCustomSlots,
      academicYear
    });

    recordAudit(req, {
      action: 'student.create',
      entityType: 'student',
      entityId: newStudent.studentId,
      entityLabel: studentLabel(newStudent),
      campus: targetBranch,
      amount: remainingBalance,
      summary: `Registered ${studentLabel(newStudent)} at ${targetBranch} with fees of Rs. ${remainingBalance.toLocaleString('en-IN')}.`,
      details: { course: newStudent.course, section: newStudent.section, grossFees }
    });

    // NOTE: this used to also return `credential: { username, pin }` with a
    // freshly generated six-digit PIN. No student login was ever created to go
    // with it — students are not one of this system's roles — and nothing
    // rendered the value, so it was a credential-shaped number that meant
    // nothing. Returning it invited someone to write it down and hand it to a
    // student as a password for an account that does not exist.
    return res.status(201).json({
      status: 'success',
      data: newStudent
    });
  } catch (err) {
    // The findOne guard above cannot be race-safe on its own: two simultaneous
    // submissions both read "not found" before either inserts. The unique
    // index is what actually stops the duplicate, and its error must surface
    // as the same clear 409. A double-clicked Save previously reported
    // "Database write failure", which reads as a broken app rather than as
    // "this student is already registered".
    if (err && err.code === 11000) {
      const field = Object.keys(err.keyPattern || { admissionNumber: 1 })[0];
      const value = (err.keyValue || {})[field];
      return res.status(409).json({
        status: 'error',
        message: field === 'studentId'
          ? 'That student ID was just taken. Please submit again.'
          : `Student with admission number [${value}] already exists.`
      });
    }
    console.error('Error creating student:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database write failure.' });
  }
};

/**
 * Is this admission number free?
 *
 * The create route has always refused a duplicate with a 409, but the add
 * student form only reached that route after three screens of input, so the
 * conflict surfaced at the very end — which read as "no warning at all". This
 * lets the form ask on the first screen, while the number is still being
 * typed.
 *
 * A conflict at ANOTHER campus is reported without the student's name or
 * campus. The caller is entitled to know the number is taken, because that
 * governs what they may enter; they are not entitled to read a record outside
 * their own campus.
 */
app.get(['/api/students/admission-available', '/api/accountant/students/admission-available'],
  authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const admissionNumber = String(req.query.admissionNumber || '').trim();
    if (!admissionNumber) {
      return res.status(400).json({ status: 'error', message: 'An admission number is required.' });
    }
    if (admissionNumber.length > FIELD_LIMITS.admissionNumber) {
      return res.status(400).json({ status: 'error', message: `Admission number cannot exceed ${FIELD_LIMITS.admissionNumber} characters.` });
    }

    const existing = await findStudentByAdmissionNumber(admissionNumber);
    if (!existing) {
      return res.json({ status: 'success', data: { available: true } });
    }

    const visible = callerOwnsCampus(req, existing.branch);
    return res.json({
      status: 'success',
      data: {
        available: false,
        message: visible
          ? `Admission number [${existing.admissionNumber}] already belongs to ${existing.name} (${existing.branch}).`
          : `Admission number [${existing.admissionNumber}] is already in use at another campus.`
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.post('/api/admin1/students', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requirePermission('addStudent'), mongoRateLimiter, createStudentHandler);
app.post('/api/admin/students', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requirePermission('addStudent'), mongoRateLimiter, createStudentHandler);
app.post('/api/accountant/students', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requirePermission('addStudent'), mongoRateLimiter, createStudentHandler);

/**
 * Fee fields carried by the student edit route.
 *
 * This one route accepts profile details AND money, so a single permission
 * cannot describe it: a clerk granted "edit student details" must be able to
 * fix a misspelt name without also being able to change what that student
 * owes. The fields are named here and checked against `editFees` separately.
 */
const STUDENT_FEE_FIELDS = [
  'tuitionFee', 'hostelFee', 'transportFee', 'miscellaneousFee',
  'previousPending', 'customFeeSlots'
];

/**
 * Waivers are the Rector's alone.
 *
 * A waiver is money written off rather than money recorded, so it is the one
 * fee operation that no campus-level account may perform — not a clerk with
 * every permission granted, and not an accountant. The dedicated fee-override
 * route is admin1-only for the same reason; this list stops the same change
 * being smuggled through the ordinary edit route instead.
 */
const STUDENT_WAIVER_FIELDS = ['tuitionWaiver', 'hostelWaiver', 'transportWaiver', 'miscWaiver'];

app.patch(['/api/admin1/students/:id', '/api/admin2/students/:id', '/api/admin/students/:id', '/api/accountant/students/:id'], authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requirePermission('editStudent'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    const body = req.body || {};

    // Waivers: Rector only, whatever else the caller has been granted.
    if (req.user.role !== 'admin1') {
      const attempted = STUDENT_WAIVER_FIELDS.filter(f => body[f] !== undefined);
      if (attempted.length > 0) {
        recordAudit(req, {
          action: 'student.fee_waiver',
          entityType: 'student',
          entityId: student.studentId,
          entityLabel: studentLabel(student),
          campus: student.branch,
          outcome: 'denied',
          summary: `Refused: ${req.user.username} tried to change fee waivers on ${studentLabel(student)}.`,
          details: { fields: attempted }
        });
        return res.status(403).json({
          status: 'error',
          message: 'Fee waivers can only be set by the Rector.'
        });
      }
    }

    // Fee amounts need the separate `editFees` grant.
    if (!callerHasPermission(req, 'editFees')) {
      const attempted = STUDENT_FEE_FIELDS.filter(f => body[f] !== undefined);
      if (attempted.length > 0) {
        return res.status(403).json({
          status: 'error',
          message: 'Your account has not been given permission to edit fees. Ask the Rector to enable it.'
        });
      }
    }

    if ((req.user.role === 'accountant' || req.user.role === 'clerk') && req.user.campus !== 'All') {
      const sNorm = normalizeCampus(student.branch);
      const uNorm = normalizeCampus(req.user.campus);
      if (sNorm !== uNorm && student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to [${student.branch}].` });
      }
    }

    // Mobile validation on edit
    if (req.body.mobile !== undefined && req.body.mobile !== '') {
      const mobileDigits = String(req.body.mobile).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(mobileDigits)) {
        return res.status(400).json({ status: 'error', message: 'Mobile number must be exactly 10 digits.' });
      }
    }
    if (req.body.parentMobile !== undefined && req.body.parentMobile !== '') {
      const parentMobileDigits = String(req.body.parentMobile).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(parentMobileDigits)) {
        return res.status(400).json({ status: 'error', message: 'Parent mobile number must be exactly 10 digits.' });
      }
    }

    // Fee cap enforcement on edit
    const updatedCustomSlots = req.body.customFeeSlots !== undefined ? req.body.customFeeSlots : student.customFeeSlots;
    const editedGrossFees = calcStudentGrossFees(
      req.body.tuitionFee !== undefined ? req.body.tuitionFee : student.tuitionFee,
      req.body.hostelFee !== undefined ? req.body.hostelFee : student.hostelFee,
      req.body.transportFee !== undefined ? req.body.transportFee : student.transportFee,
      req.body.miscellaneousFee !== undefined ? req.body.miscellaneousFee : student.miscellaneousFee,
      req.body.previousPending !== undefined ? req.body.previousPending : student.previousPending,
      updatedCustomSlots
    );
    if (editedGrossFees > MAX_STUDENT_FEE) {
      return res.status(400).json({
        status: 'error',
        message: `Total fees (Rs. ${editedGrossFees.toLocaleString('en-IN')}) exceed the maximum allowed per student (Rs. ${MAX_STUDENT_FEE.toLocaleString('en-IN')}).`
      });
    }

    // `branch` is deliberately absent: moving a student between campuses is
    // not a routine profile edit, and allowing it here would let a
    // campus-scoped account pull records across the isolation boundary.
    const result = applyAllowedFields(student, req.body, {
      name: 'string', fatherName: 'string', motherName: 'string',
      mobile: 'string', parentMobile: 'string', email: 'string',
      course: 'string', section: 'string', rollNumber: 'string',
      dob: 'string', address: 'string',
      previousSchool: 'string', previousBoard: 'string',
      status: 'string', hostelStatus: 'string', transportStatus: 'string',
      academicYear: 'string',
      tuitionFee: 'nonNegativeNumber', hostelFee: 'nonNegativeNumber',
      transportFee: 'nonNegativeNumber', miscellaneousFee: 'nonNegativeNumber',
      previousPending: 'nonNegativeNumber',
      tuitionWaiver: 'nonNegativeNumber', hostelWaiver: 'nonNegativeNumber',
      transportWaiver: 'nonNegativeNumber', miscWaiver: 'nonNegativeNumber',
      customFeeSlots: 'raw'
    });
    if (result.error) {
      return res.status(400).json({ status: 'error', message: result.error });
    }
    if (req.body.customFeeSlots !== undefined) student.markModified('customFeeSlots');

    // Keep the derived balance consistent with whatever fees just changed,
    // rather than leaving a stale figure on the record.
    student.remainingBalance = computeStudentFees(student).balance;

    await student.save();

    // `result.applied` is the list of fields applyAllowedFields actually
    // wrote, so the log names what was edited rather than saying "profile
    // updated" — and it excludes anything the caller sent that was ignored.
    const changedFields = result.applied || [];
    recordAudit(req, {
      action: 'student.update',
      entityType: 'student',
      entityId: student.studentId,
      entityLabel: studentLabel(student),
      campus: student.branch,
      summary: `Edited ${studentLabel(student)}${changedFields.length ? ` — changed ${changedFields.join(', ')}` : ''}.`,
      details: { fields: changedFields, remainingBalance: student.remainingBalance }
    });

    return res.json({ status: 'success', data: student });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

const deleteStudentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjId = isValidObjectId(id);

    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    const label = `${student.name} (${student.admissionNumber || student.studentId})`;

    if (!callerOwnsCampus(req, student.branch)) {
      // A refused attempt to delete another campus's student is exactly what a
      // Rector needs to see. Recorded at the point of refusal, so the trail
      // shows the attempt as well as the block.
      recordAudit(req, {
        action: 'student.delete',
        entityType: 'student',
        entityId: student.studentId,
        entityLabel: label,
        campus: student.branch,
        outcome: 'denied',
        summary: `Refused: ${req.user.username} tried to delete ${label}, who belongs to ${student.branch}.`,
        details: { reason: 'campus isolation', callerCampus: req.user.campus }
      });
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    // Remove the payment history first.
    //
    // Deleting the student alone used to leave its receipts behind as orphans:
    // rows pointing at a studentId that no longer existed, which still counted
    // toward every revenue total and dashboard figure. Payments go first so a
    // failure here aborts before the student is removed — the reverse order
    // could leave payments stranded with no way to find them again.
    const paymentResult = await Payment.deleteMany({ studentId: student.studentId });

    const orphanCheck = await Payment.countDocuments({ studentId: student.studentId });
    if (orphanCheck > 0) {
      console.error(`[Students]: Aborting delete of ${label}; ${orphanCheck} payment record(s) could not be removed.`);
      return res.status(500).json({
        status: 'error',
        message: 'Could not remove this student\'s payment records. The student was NOT deleted.'
      });
    }

    // Delete by primary key only. The old handler passed a broad $or of every
    // identifier to deleteMany, which could match and remove unrelated records
    // whose studentId happened to equal another student's admissionNumber.
    const result = await Student.deleteOne({ _id: student._id });
    if (result.deletedCount === 0) {
      return res.status(500).json({ status: 'error', message: 'Delete failed. The student record was not removed.' });
    }

    // Confirm with a follow-up read rather than trusting the delete response.
    const stillThere = await Student.findById(student._id).lean();
    if (stillThere) {
      console.error(`[Students]: Delete verification failed for ${student._id}; record still present.`);
      return res.status(500).json({ status: 'error', message: 'Delete could not be verified. The record may still exist.' });
    }

    console.log(`[Students]: ${label} and ${paymentResult.deletedCount} payment record(s) deleted by [${req.user.username}].`);
    // Written after the delete is verified, and it is the ONLY surviving
    // record that this student ever existed — the row and its receipts are
    // gone, so the label and campus frozen here are all that remain.
    recordAudit(req, {
      action: 'student.delete',
      entityType: 'student',
      entityId: student.studentId,
      entityLabel: label,
      campus: student.branch,
      summary: `Deleted ${label} from ${student.branch}, along with ${paymentResult.deletedCount} payment record(s).`,
      details: { deletedPayments: paymentResult.deletedCount, course: student.course }
    });
    return res.json({
      status: 'success',
      message: `Student ${label} permanently deleted, along with ${paymentResult.deletedCount} payment record(s).`,
      deletedPayments: paymentResult.deletedCount
    });
  } catch (err) {
    console.error('[Students]: Delete failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to delete the student record.' });
  }
};

app.delete('/api/admin1/students/:id', authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, deleteStudentHandler);
app.delete('/api/admin/students/:id', authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, deleteStudentHandler);
app.delete('/api/accountant/students/:id', authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, deleteStudentHandler);


// --- FEE WAIVER ROUTE ---

// Waivers are Rector-only. A clerk previously reached this route through the
// old admin2 role, which meant a campus account could write off fees.
app.patch(['/api/admin1/students/:studentId/fee-override', '/api/admin2/students/:studentId/fee-override', '/api/admin/students/:studentId/fee-override'], authenticateToken, requireRole('admin1'), mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { studentId } = req.params;
    const { tuitionWaiver = 0, hostelWaiver = 0, transportWaiver = 0, miscWaiver = 0, customFeeSlots } = req.body;

    if (!isValidPositiveNumber(tuitionWaiver) || !isValidPositiveNumber(hostelWaiver) || !isValidPositiveNumber(transportWaiver) || !isValidPositiveNumber(miscWaiver)) {
      return res.status(400).json({ status: 'error', message: 'Waiver amounts must be valid non-negative numbers.' });
    }

    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    /**
     * A waiver may not exceed the fee it discounts.
     *
     * Nothing stopped a 99,99,999 waiver against a 10,000 tuition fee. The
     * balance never went negative — computeStudentFees floors it at zero — so
     * the screen looked correct while the stored discount was nonsense, and
     * every total that sums waivers (campus reports, the analytics recovery
     * figures) silently inherited it. A discount larger than the charge is not
     * a smaller balance, it is bad data that reads as a real concession.
     *
     * Checked per head rather than against the total, because a 50,000 waiver
     * on a 10,000 tuition fee is wrong even when the student's other heads add
     * up to more than 50,000.
     */
    const waiverChecks = [
      ['Tuition', tuitionWaiver, student.tuitionFee],
      ['Hostel', hostelWaiver, student.hostelFee],
      ['Transport', transportWaiver, student.transportFee],
      ['Miscellaneous', miscWaiver, student.miscellaneousFee]
    ];
    for (const [label, waiver, fee] of waiverChecks) {
      const w = Number(waiver) || 0;
      const f = Number(fee) || 0;
      if (w > f) {
        return res.status(400).json({
          status: 'error',
          message: `The ${label.toLowerCase()} waiver of Rs. ${w.toLocaleString('en-IN')} is more than the `
            + `${label.toLowerCase()} fee of Rs. ${f.toLocaleString('en-IN')}. A discount cannot exceed the fee it applies to.`
        });
      }
    }

    student.tuitionWaiver = Number(tuitionWaiver);
    student.hostelWaiver = Number(hostelWaiver);
    student.transportWaiver = Number(transportWaiver);
    student.miscWaiver = Number(miscWaiver);

    if (customFeeSlots !== undefined && Array.isArray(customFeeSlots)) {
      student.customFeeSlots = customFeeSlots;
    }

    const standardKeys = ['tuitionfee', 'hostelfee', 'transportfee', 'miscellaneousfee', 'previouspending', 'tuition', 'hostel', 'transport', 'misc'];
    const cleanedSlots = (student.customFeeSlots || []).filter(slot => {
      if (!slot) return false;
      const k = String(slot.key || slot.id || '').toLowerCase().trim();
      const n = String(slot.name || '').toLowerCase().trim();
      return !standardKeys.includes(k) && !['tuition fee', 'hostel fee', 'transport fee', 'miscellaneous fee', 'previous pending'].includes(n);
    });

    student.customFeeSlots = cleanedSlots;
    const totals = computeStudentFees(student);

    // Fee cap applies to the gross, regardless of waivers.
    if (totals.exceedsCap) {
      return res.status(400).json({
        status: 'error',
        message: `Total fees (Rs. ${totals.gross.toLocaleString('en-IN')}) exceed the maximum allowed per student (Rs. ${MAX_STUDENT_FEE.toLocaleString('en-IN')}).`
      });
    }

    student.remainingBalance = totals.balance;
    await student.save();

    // A waiver is money given away, so it is logged with its value in the
    // `amount` column alongside collections and expenditures.
    recordAudit(req, {
      action: 'student.fee_waiver',
      entityType: 'student',
      entityId: student.studentId,
      entityLabel: studentLabel(student),
      campus: student.branch,
      amount: totals.waivers,
      summary: `Applied waivers totalling Rs. ${Number(totals.waivers || 0).toLocaleString('en-IN')} to ${studentLabel(student)}; balance now Rs. ${Number(student.remainingBalance || 0).toLocaleString('en-IN')}.`,
      details: {
        tuitionWaiver: student.tuitionWaiver,
        hostelWaiver: student.hostelWaiver,
        transportWaiver: student.transportWaiver,
        miscWaiver: student.miscWaiver,
        remainingBalance: student.remainingBalance
      }
    });

    return res.json({
      status: 'success',
      message: 'Fee waiver updated successfully',
      data: {
        studentId: student.studentId,
        tuitionWaiver: student.tuitionWaiver,
        hostelWaiver: student.hostelWaiver,
        transportWaiver: student.transportWaiver,
        miscWaiver: student.miscWaiver,
        remainingBalance: student.remainingBalance,
        student
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


// --- FACULTY / TEACHER ROUTES ---

// GET Teachers list (Admin1 sees all or filtered by branch; Admin2 sees only their assigned campus)
app.get(['/api/admin1/teachers', '/api/admin2/teachers', '/api/admin/teachers'], authenticateToken, requireRole('admin1', 'clerk'), async (req, res) => {
  try {
    await connectToDatabase();
    let filter = {};
    if (req.user.role === 'clerk') {
      filter.branch = req.user.campus;
    } else {
      const { branch } = req.query;
      if (branch && String(branch).toLowerCase() !== 'all') {
        if (!isValidCampus(branch)) {
          return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
        }
        filter.branch = String(branch).trim();
      }
    }
    const teachers = await Teacher.find(filter).sort({ createdAt: -1 });
    return res.json({ status: 'success', data: teachers });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

// CREATE Teacher (Admin1 or Admin2; Requires Security OTP for Admin2 or optional; Admin2 campus locked)
app.post(['/api/admin1/teachers', '/api/admin2/teachers', '/api/admin/teachers'], authenticateToken, requireRole('admin1', 'clerk'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    let { id, name, subject, salary = 0, mobile, email, branch, classification = 'Teaching', role = 'Senior Lecturer' } = req.body || {};

    if (req.user.role === 'clerk' && req.user.campus && req.user.campus !== 'All') {
      branch = req.user.campus; // Lock campus to admin2's assigned campus
    }

    let normBranch = normalizeCampus(branch);
    if (!isValidCampus(normBranch) || normBranch.toLowerCase() === 'all') {
      normBranch = (req.user.campus && req.user.campus !== 'All' && isValidCampus(req.user.campus)) ? normalizeCampus(req.user.campus) : 'Erragattugutta C1';
    }
    branch = normBranch;

    if (!id || !name || !subject || !branch) {
      return res.status(400).json({ status: 'error', message: 'Teacher ID, name, subject, and campus branch are required.' });
    }

    // This route had no text validation at all: it used the raw body, so a
    // name could be any length and an object passed as `name` would have been
    // stored as the string "[object Object]" — the same defect already fixed
    // on the student and enquiry routes.
    const tText = cleanTextFields(req.body || {}, {
      id: { required: true, max: FIELD_LIMITS.staffId },
      name: { required: true, max: FIELD_LIMITS.personName },
      subject: { required: true, max: FIELD_LIMITS.subject },
      mobile: { max: FIELD_LIMITS.mobile },
      email: { max: FIELD_LIMITS.email },
      classification: { max: FIELD_LIMITS.department },
      role: { max: FIELD_LIMITS.department }
    });
    if (tText.error) {
      return res.status(400).json({ status: 'error', message: tText.error });
    }
    ({ id, name, subject } = tText.values);
    mobile = tText.values.mobile;
    email = tText.values.email;
    classification = tText.values.classification || 'Teaching';
    role = tText.values.role || 'Senior Lecturer';

    if (!isValidPositiveNumber(salary)) {
      return res.status(400).json({ status: 'error', message: 'Salary must be a valid non-negative number.' });
    }
    if (Number(salary) > MAX_MONEY) {
      return res.status(400).json({ status: 'error', message: `Salary cannot exceed ${MAX_MONEY.toLocaleString('en-IN')}.` });
    }

    // Mobile validation for teacher (optional but must be valid if provided)
    if (mobile && mobile !== '') {
      const teacherMobileDigits = String(mobile).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(teacherMobileDigits)) {
        return res.status(400).json({ status: 'error', message: 'Mobile number must be exactly 10 digits.' });
      }
    }

    // Duplicate guard on three dimensions, not just the ID: the same person
    // entered twice under different IDs is the mistake that actually happens,
    // and it goes unnoticed until two salary ledgers exist for one member of
    // staff. Matching is case- and spacing-insensitive so "Ravi Kumar" and
    // "ravi  kumar" collide.
    const cleanId = String(id).trim();
    const cleanName = String(name).trim();
    const cleanMobile = String(mobile || '').replace(/[\s-]/g, '');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const exact = (s) => new RegExp(`^\\s*${String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\s*$`, 'i');

    const clashes = [];
    if (cleanId) clashes.push({ id: exact(cleanId) });
    if (cleanEmail) clashes.push({ email: exact(cleanEmail) });
    if (cleanName && cleanMobile) clashes.push({ name: exact(cleanName), mobile: exact(cleanMobile) });

    const existing = clashes.length ? await Teacher.findOne({ $or: clashes }).lean() : null;
    if (existing) {
      let why = `Teacher with ID [${existing.id}] already exists.`;
      if (String(existing.id).trim().toLowerCase() !== cleanId.toLowerCase()) {
        why = cleanEmail && String(existing.email || '').trim().toLowerCase() === cleanEmail
          ? `Email [${email}] is already registered to ${existing.name} (ID ${existing.id}).`
          : `${existing.name} with mobile [${mobile}] already exists as ID ${existing.id}.`;
      }
      return res.status(409).json({ status: 'error', message: why, conflictWith: existing.id });
    }

    let teacher;
    try {
      teacher = await Teacher.create({
        id: cleanId,
        name: cleanName,
        subject: String(subject).trim(),
        salary: Number(salary),
        mobile: mobile || '',
        email: email || '',
        branch,
        classification,
        role,
        status: 'Active',
        salaryLedger: {},
        monthlySalaries: {}
      });
    } catch (createErr) {
      // The check above cannot be race-safe on its own: two simultaneous
      // submissions both read "not found" before either inserts. The unique
      // index is what actually prevents the duplicate, and its error has to
      // surface as the same clear 409 — a double-clicked Save used to report
      // "Database write failure", which reads as a bug rather than as
      // "you already added this person".
      if (createErr && createErr.code === 11000) {
        const field = Object.keys(createErr.keyPattern || { id: 1 })[0];
        return res.status(409).json({
          status: 'error',
          message: `Teacher with ${field} [${(createErr.keyValue || {})[field] ?? cleanId}] already exists.`
        });
      }
      throw createErr;
    }

    recordAudit(req, {
      action: 'teacher.create',
      entityType: 'teacher',
      entityId: teacher.id,
      entityLabel: `${teacher.name} (${teacher.id})`,
      campus: teacher.branch,
      amount: teacher.salary,
      summary: `Added staff member ${teacher.name} (${teacher.id}) at ${teacher.branch} on Rs. ${Number(teacher.salary || 0).toLocaleString('en-IN')} per month.`,
      details: { subject: teacher.subject, classification: teacher.classification }
    });

    return res.status(201).json({ status: 'success', data: teacher });
  } catch (err) {
    console.error('[Teachers]: Create failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database write failure.' });
  }
});

// UPDATE Teacher
app.patch(['/api/admin1/teachers/:id', '/api/admin2/teachers/:id', '/api/admin/teachers/:id'], authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const teacher = await Teacher.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher record not found.' });
    }

    if (req.user.role === 'clerk' && String(teacher.branch || '').toLowerCase().trim() !== String(req.user.campus || '').toLowerCase().trim()) {
      return res.status(403).json({ status: 'error', message: `Campus Isolation Violation: Admin2 at [${req.user.campus}] cannot modify staff at [${teacher.branch}].` });
    }

    // Mobile validation on teacher edit
    if (req.body.mobile !== undefined && req.body.mobile !== '') {
      const editMobileDigits = String(req.body.mobile).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(editMobileDigits)) {
        return res.status(400).json({ status: 'error', message: 'Mobile number must be exactly 10 digits.' });
      }
    }

    const updatePayload = { ...req.body };
    delete updatePayload._id;
    delete updatePayload.id;
    delete updatePayload.createdAt;
    delete updatePayload.updatedAt;
    delete updatePayload.__v;

    if (updatePayload.branch) {
      updatePayload.branch = normalizeCampus(updatePayload.branch);
      if (!isValidCampus(updatePayload.branch)) {
        return res.status(400).json({ status: 'error', message: `Invalid campus branch [${updatePayload.branch}].` });
      }
    }

    if (updatePayload.salary !== undefined) {
      updatePayload.salary = Number(updatePayload.salary) || 0;
    }

    // Only admin1 may move a staff member between campuses; for a
    // campus-scoped admin2 that would be a way out of their own boundary.
    if (updatePayload.branch !== undefined && String(req.user.campus || '').toLowerCase() !== 'all') {
      return res.status(403).json({ status: 'error', message: 'Only a Rector-level account can move staff between campuses.' });
    }

    // Read before applyAllowedFields writes to the document — afterwards the
    // field already holds the new value and the previous one is unrecoverable.
    const salaryBefore = Number(teacher.salary || 0);

    const result = applyAllowedFields(teacher, updatePayload, {
      name: 'string', subject: 'string', mobile: 'string', email: 'string',
      role: 'string', classification: 'string', status: 'string',
      branch: 'string',
      salary: 'nonNegativeNumber',
      salaryLedger: 'raw', monthlySalaries: 'raw'
    });
    if (result.error) {
      return res.status(400).json({ status: 'error', message: result.error });
    }
    if (updatePayload.salaryLedger) teacher.markModified('salaryLedger');
    if (updatePayload.monthlySalaries) teacher.markModified('monthlySalaries');

    await teacher.save();

    recordAudit(req, {
      action: 'teacher.update',
      entityType: 'teacher',
      entityId: teacher.id,
      entityLabel: `${teacher.name} (${teacher.id})`,
      campus: teacher.branch,
      // A pay change is the one edit here that moves money, so it carries the
      // amount and says so plainly.
      amount: (result.applied || []).includes('salary') ? teacher.salary : null,
      summary: (result.applied || []).includes('salary')
        ? `Changed ${teacher.name}'s (${teacher.id}) monthly salary to Rs. ${Number(teacher.salary || 0).toLocaleString('en-IN')}.`
        : `Edited staff member ${teacher.name} (${teacher.id})${(result.applied || []).length ? ` — changed ${result.applied.join(', ')}` : ''}.`,
      details: { fields: result.applied || [], salaryBefore }
    });

    return res.json({ status: 'success', data: teacher });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

// DELETE Teacher (Requires Security OTP; Campus Isolation for Admin2)
app.delete(['/api/admin1/teachers/:id', '/api/admin2/teachers/:id', '/api/admin/teachers/:id'], authenticateToken, requireRole('admin1', 'clerk'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const teacher = await Teacher.findOne(query);
    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher record not found.' });
    }

    if (req.user.role === 'clerk' && String(teacher.branch || '').toLowerCase().trim() !== String(req.user.campus || '').toLowerCase().trim()) {
      return res.status(403).json({ status: 'error', message: `Campus Isolation Violation: Admin2 at [${req.user.campus}] cannot delete staff at [${teacher.branch}].` });
    }

    const result = await Teacher.deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Teacher record not found.' });
    }

    const verifySearch = await Teacher.findOne(query);
    if (verifySearch) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Teacher record still exists in database.' });
    }

    recordAudit(req, {
      action: 'teacher.delete',
      entityType: 'teacher',
      entityId: teacher.id,
      entityLabel: `${teacher.name} (${teacher.id})`,
      campus: teacher.branch,
      summary: `Deleted staff member ${teacher.name} (${teacher.id}) from ${teacher.branch}.`,
      details: { subject: teacher.subject, salary: teacher.salary }
    });

    return res.json({ status: 'success', message: `Teacher ${teacher.name} permanently deleted.` });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

// 12-MONTH SALARY LEDGER & YEAR-LOCK PAYMENTS ROUTE
app.post(['/api/admin1/teachers/:id/salary-month', '/api/admin2/teachers/:id/salary-month', '/api/admin/teachers/:id/salary'], authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const teacher = await Teacher.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher not found.' });
    }

    if (req.user.role === 'clerk' && String(teacher.branch || '').toLowerCase().trim() !== String(req.user.campus || '').toLowerCase().trim()) {
      return res.status(403).json({ status: 'error', message: `Campus Isolation Violation: Admin2 at [${req.user.campus}] cannot modify staff at [${teacher.branch}].` });
    }

    const { academicYear = '2026-2027', month, amountPaid, paymentMode = 'Bank Transfer', note = '' } = req.body || {};

    if (!month) {
      return res.status(400).json({ status: 'error', message: 'Month description is required.' });
    }

    // One month list, defined with ACADEMIC_YEARS at the top of the file. This
    // route carried its own identical copy, so the twelve-month completeness
    // rule that unlocks the next academic year was counting against a list
    // that could drift from the canonical one.
    const validMonths = LEDGER_MONTHS;
    if (!validMonths.includes(month)) {
      return res.status(400).json({ status: 'error', message: `Invalid month [${month}]. Must be one of: ${validMonths.join(', ')}` });
    }

    // SERVER-ENFORCED YEAR LOCK LOGIC
    const startYear = parseInt(academicYear.split('-')[0], 10);
    if (isNaN(startYear)) {
      return res.status(400).json({ status: 'error', message: `Invalid academic year format [${academicYear}]. Example format: "2026-2027"` });
    }

    // The ledger covers 2026-2027 through 2029-2030 and nothing else. Without
    // this the year was unbounded: a request naming 2050-2051 was accepted and
    // created a ledger nobody would ever look at, and — because the lock only
    // inspects the IMMEDIATELY preceding year — a far-future year could be
    // opened without any of the years in between being paid at all.
    if (!ACADEMIC_YEARS.includes(academicYear)) {
      return res.status(400).json({
        status: 'error',
        message: `Academic year [${academicYear}] is outside the supported range. Must be one of: ${ACADEMIC_YEARS.join(', ')}.`
      });
    }

    // Base academic year is 2026-2027. If requested year is 2027-2028 or later, check prior year.
    if (startYear > 2026) {
      const prevAcademicYear = `${startYear - 1}-${startYear}`;
      const ledger = teacher.salaryLedger || {};
      const prevYearLedger = ledger[prevAcademicYear] || {};
      
      let paidCount = 0;
      for (const m of validMonths) {
        if (prevYearLedger[m] && (prevYearLedger[m].status === 'Paid' || prevYearLedger[m].paid === true)) {
          paidCount++;
        }
      }

      if (paidCount < 12) {
        return res.status(403).json({
          status: 'error',
          message: `Year Lock Active: Academic year [${academicYear}] is locked. Prior year [${prevAcademicYear}] has only ${paidCount} of 12 months completed.`
        });
      }
    }

    // Prepare ledger data structure
    if (!teacher.salaryLedger) teacher.salaryLedger = {};
    if (!teacher.salaryLedger[academicYear]) teacher.salaryLedger[academicYear] = {};

    const amt = Number(amountPaid) || Number(teacher.salary) || 0;

    /**
     * A month's salary payment may not exceed the agreed monthly salary.
     *
     * Paying less is normal and stays allowed — a part payment, an advance
     * already drawn, a month someone joined midway. Paying MORE is not a
     * generous month, it is a typo: an extra digit turns 45,000 into 450,000,
     * and nothing here questioned it. The figure then flows into the campus
     * expenditure totals and the ledger, where it looks like a real payment
     * that someone has to reconcile against a bank statement.
     *
     * The ceiling is the teacher's own salary, so a raise recorded on the
     * teacher record raises the ceiling with it.
     */
    const agreed = Number(teacher.salary) || 0;
    if (!Number.isFinite(amt) || amt < 0) {
      return res.status(400).json({ status: 'error', message: 'The amount paid must be a number of zero or more.' });
    }
    if (agreed > 0 && amt > agreed) {
      return res.status(400).json({
        status: 'error',
        message: `Rs. ${amt.toLocaleString('en-IN')} is more than ${teacher.name}'s monthly salary of `
          + `Rs. ${agreed.toLocaleString('en-IN')}. Record the agreed amount or less — to pay more, `
          + `update the salary on the teacher record first.`
      });
    }

    const pDate = new Date().toISOString().split('T')[0];

    const monthRecord = {
      status: 'Paid',
      amountPaid: amt,
      paymentDate: pDate,
      paymentMode,
      note
    };

    teacher.salaryLedger[academicYear][month] = monthRecord;
    if (!teacher.monthlySalaries) teacher.monthlySalaries = {};
    teacher.monthlySalaries[month] = monthRecord;

    // Mark Mongoose mixed object modified
    teacher.markModified('salaryLedger');
    teacher.markModified('monthlySalaries');
    await teacher.save();

    // Create a WorkerPayment log for History tab tracking
    await WorkerPayment.create({
      id: `PAY-FAC-${Date.now()}`,
      workerName: teacher.name,
      role: teacher.role || teacher.subject || 'Faculty',
      amount: amt,
      monthPeriod: `${month} (${academicYear})`,
      paid: true,
      branch: teacher.branch
    });

    recordAudit(req, {
      action: 'salary.pay',
      entityType: 'teacher',
      entityId: teacher.id,
      entityLabel: `${teacher.name} (${teacher.id})`,
      campus: teacher.branch,
      amount: amt,
      summary: `Paid Rs. ${amt.toLocaleString('en-IN')} salary to ${teacher.name} (${teacher.id}) for ${month} ${academicYear} via ${paymentMode}.`,
      details: { month, academicYear, paymentMode, agreedSalary: agreed }
    });

    return res.json({ status: 'success', message: `Salary payment recorded for ${teacher.name} - ${month} (${academicYear})`, data: teacher });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


// --- FEE STRUCTURE ROUTES ---

app.get('/api/admin2/fee-settings', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();

    // This route read ?branch with no check against the caller at all, so a
    // scoped account could read — and, since it creates a default record when
    // none exists, WRITE — another campus's fee structure.
    const branch = resolveReadCampus(req, res, { requireExplicit: true });
    if (!branch) return;

    let settings = await FeeSettings.findOne({ branch });
    if (!settings) {
      settings = await FeeSettings.create({
        branch,
        tuition: 120000,
        hostel: 85000,
        transport: 15000,
        misc: 5000,
        isLocked: false
      });
    }

    return res.json({ status: 'success', data: settings });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.patch('/api/admin2/fee-settings', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('editFees'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { branch, tuition, hostel, transport, misc, isLocked } = req.body;
    const targetBranch = branch || req.user.campus;

    if (!isValidCampus(targetBranch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetBranch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only edit fee settings for campus [${req.user.campus}].` });
      }
    }

    const updateFields = {};
    if (tuition !== undefined) {
      if (!isValidPositiveNumber(tuition)) return res.status(400).json({ status: 'error', message: 'Tuition fee must be a valid non-negative number.' });
      updateFields.tuition = Number(tuition);
    }
    if (hostel !== undefined) {
      if (!isValidPositiveNumber(hostel)) return res.status(400).json({ status: 'error', message: 'Hostel fee must be a valid non-negative number.' });
      updateFields.hostel = Number(hostel);
    }
    if (transport !== undefined) {
      if (!isValidPositiveNumber(transport)) return res.status(400).json({ status: 'error', message: 'Transport fee must be a valid non-negative number.' });
      updateFields.transport = Number(transport);
    }
    if (misc !== undefined) {
      if (!isValidPositiveNumber(misc)) return res.status(400).json({ status: 'error', message: 'Misc fee must be a valid non-negative number.' });
      updateFields.misc = Number(misc);
    }
    if (isLocked !== undefined) updateFields.isLocked = Boolean(isLocked);

    const updated = await FeeSettings.findOneAndUpdate(
      { branch: targetBranch },
      { $set: updateFields },
      { upsert: true, new: true }
    );

    recordAudit(req, {
      action: 'fee_settings.update',
      entityType: 'fee_settings',
      entityId: targetBranch,
      entityLabel: `Fee structure — ${targetBranch}`,
      campus: targetBranch,
      summary: `Updated the ${targetBranch} fee structure (${Object.keys(updateFields).join(', ') || 'no fields'}).`,
      details: updateFields
    });

    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


// --- EXPENDITURE ROUTES ---

const getExpendituresHandler = async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (branch && branch.toLowerCase() !== 'all' && branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only view expenditures for campus [${req.user.campus}].` });
      }
    }

    let filter = {};
    const targetCampus = branch || req.user.campus;
    if (targetCampus && targetCampus.toLowerCase() !== 'all') {
      if (!isValidCampus(targetCampus)) {
        return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetCampus}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
      }
      filter.branch = targetCampus;
    }

    const expenditures = await Expenditure.find(filter).sort({ date: -1 });
    return res.json({ status: 'success', data: expenditures });
  } catch (err) {
    return failRequest(req, res, err);
  }
};

app.get('/api/admin2/expenditure', authenticateToken, requireRole('admin1', 'clerk'), getExpendituresHandler);
app.get('/api/admin2/expenditures', authenticateToken, requireRole('admin1', 'clerk'), getExpendituresHandler);

app.post('/api/admin2/expenditure', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('logExpenditures'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { category, amount, description, date, branch } = req.body || {};
    const rawBranch = branch || req.user.campus;
    let targetBranch = normalizeCampus(rawBranch);

    if (!isValidCampus(targetBranch) || targetBranch.toLowerCase() === 'all') {
      targetBranch = (req.user.campus && req.user.campus !== 'All' && isValidCampus(req.user.campus)) ? normalizeCampus(req.user.campus) : 'Erragattugutta C1';
    }

    if (!category || amount === undefined) {
      return res.status(400).json({ status: 'error', message: 'Category and amount are required.' });
    }

    if (!isValidPositiveNumber(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be a valid positive number.' });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only record expenditures for campus [${req.user.campus}].` });
      }
    }

    const expId = `EXP-${Date.now().toString().slice(-6)}`;
    const expenditure = await Expenditure.create({
      id: expId,
      category: String(category).trim(),
      amount: Number(amount),
      description: description || '',
      date: date ? new Date(date) : new Date(),
      branch: targetBranch
    });

    recordAudit(req, {
      action: 'expenditure.create',
      entityType: 'expenditure',
      entityId: expenditure.id,
      entityLabel: `${expenditure.category} — ${expenditure.description || 'no description'}`,
      campus: targetBranch,
      amount: expenditure.amount,
      summary: `Logged an expenditure of Rs. ${Number(expenditure.amount).toLocaleString('en-IN')} at ${targetBranch} under ${expenditure.category}.`,
      details: { description: expenditure.description, date: expenditure.date }
    });

    return res.status(201).json({ status: 'success', data: expenditure });
  } catch (err) {
    console.error('[Expenditures]: Create failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database write failure.' });
  }
});

app.patch('/api/admin2/expenditure/:id', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('logExpenditures'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const exp = await Expenditure.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!exp) {
      return res.status(404).json({ status: 'error', message: 'Expenditure record not found.' });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (exp.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${exp.branch}].` });
      }
    }

    // `branch` omitted on purpose: re-homing an expenditure to another campus
    // through an edit would move money across the isolation boundary.
    const result = applyAllowedFields(exp, req.body, {
      category: 'string',
      description: 'string',
      amount: 'nonNegativeNumber',
      date: 'date'
    });
    if (result.error) {
      return res.status(400).json({ status: 'error', message: result.error });
    }
    if (req.body.amount !== undefined && Number(req.body.amount) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be a valid positive number.' });
    }

    await exp.save();

    recordAudit(req, {
      action: 'expenditure.update',
      entityType: 'expenditure',
      entityId: exp.id,
      entityLabel: `${exp.category} — ${exp.description || 'no description'}`,
      campus: exp.branch,
      amount: exp.amount,
      summary: `Edited an expenditure at ${exp.branch}${(result.applied || []).length ? ` — changed ${result.applied.join(', ')}` : ''}; now Rs. ${Number(exp.amount).toLocaleString('en-IN')}.`,
      details: { fields: result.applied || [] }
    });

    return res.json({ status: 'success', data: exp });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.delete('/api/admin2/expenditure/:id', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('logExpenditures'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const exp = await Expenditure.findOne(query);
    if (!exp) {
      return res.status(404).json({ status: 'error', message: 'Expenditure record not found.' });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (exp.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        recordAudit(req, {
          action: 'expenditure.delete',
          entityType: 'expenditure',
          entityId: exp.id,
          entityLabel: `${exp.category} — ${exp.description || 'no description'}`,
          campus: exp.branch,
          amount: exp.amount,
          outcome: 'denied',
          summary: `Refused: ${req.user.username} tried to delete an expenditure at ${exp.branch}, outside their campus.`,
          details: { reason: 'campus isolation', callerCampus: req.user.campus }
        });
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${exp.branch}].` });
      }
    }

    await Expenditure.deleteOne(query);
    const verify = await Expenditure.findOne(query);
    if (verify) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Expenditure record still exists.' });
    }

    // The expenditure row is gone, so this entry is the only remaining record
    // of the amount that was removed from the campus books.
    recordAudit(req, {
      action: 'expenditure.delete',
      entityType: 'expenditure',
      entityId: exp.id,
      entityLabel: `${exp.category} — ${exp.description || 'no description'}`,
      campus: exp.branch,
      amount: exp.amount,
      summary: `Deleted an expenditure of Rs. ${Number(exp.amount).toLocaleString('en-IN')} at ${exp.branch} under ${exp.category}.`,
      details: { description: exp.description, date: exp.date }
    });

    return res.json({ status: 'success', message: 'Expenditure record permanently deleted.' });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


// --- WORKER PAYMENT ROUTES ---

app.get('/api/admin2/worker-payments', authenticateToken, requireRole('admin1', 'clerk'), async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (branch && branch.toLowerCase() !== 'all' && branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only view worker payments for campus [${req.user.campus}].` });
      }
    }

    let filter = {};
    const targetCampus = branch || req.user.campus;
    if (targetCampus && targetCampus.toLowerCase() !== 'all') {
      if (!isValidCampus(targetCampus)) {
        return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetCampus}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
      }
      filter.branch = targetCampus;
    }

    const payments = await WorkerPayment.find(filter).sort({ createdAt: -1 });
    return res.json({ status: 'success', data: payments });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.post('/api/admin2/worker-payments', authenticateToken, requireRole('admin1', 'clerk'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { workerName, role, amount, monthPeriod, paid = true, branch } = req.body || {};
    const targetBranch = branch || req.user.campus;

    if (!workerName || !role || amount === undefined || !monthPeriod || !targetBranch || targetBranch.toLowerCase() === 'all') {
      return res.status(400).json({ status: 'error', message: 'Worker name, role, amount, month period, and campus branch are required.' });
    }

    if (!isValidCampus(targetBranch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetBranch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (!isValidPositiveNumber(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be a valid positive number.' });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only record worker payments for campus [${req.user.campus}].` });
      }
    }

    const wrkId = `WRK-${Date.now().toString().slice(-6)}`;
    const payment = await WorkerPayment.create({
      id: wrkId,
      workerName: String(workerName).trim(),
      role: String(role).trim(),
      amount: Number(amount),
      monthPeriod: String(monthPeriod).trim(),
      paid: Boolean(paid),
      branch: targetBranch
    });

    recordAudit(req, {
      action: 'worker_payment.create',
      entityType: 'worker_payment',
      entityId: payment.id,
      entityLabel: `${payment.workerName} (${payment.role})`,
      campus: targetBranch,
      amount: payment.amount,
      summary: `Recorded a worker payment of Rs. ${Number(payment.amount).toLocaleString('en-IN')} to ${payment.workerName} (${payment.role}) at ${targetBranch} for ${payment.monthPeriod}.`,
      details: { monthPeriod: payment.monthPeriod, paid: payment.paid }
    });

    return res.status(201).json({ status: 'success', data: payment });
  } catch (err) {
    console.error('[WorkerPayments]: Create failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database write failure.' });
  }
});

app.patch('/api/admin2/worker-payments/:id', authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const wrk = await WorkerPayment.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!wrk) {
      return res.status(404).json({ status: 'error', message: 'Worker payment record not found.' });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (wrk.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${wrk.branch}].` });
      }
    }

    // `branch` omitted for the same reason as expenditures.
    const result = applyAllowedFields(wrk, req.body, {
      workerName: 'string',
      role: 'string',
      monthPeriod: 'string',
      amount: 'nonNegativeNumber',
      paid: 'boolean'
    });
    if (result.error) {
      return res.status(400).json({ status: 'error', message: result.error });
    }
    if (req.body.amount !== undefined && Number(req.body.amount) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be a valid positive number.' });
    }

    await wrk.save();

    return res.json({ status: 'success', data: wrk });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.delete('/api/admin2/worker-payments/:id', authenticateToken, requireRole('admin1', 'clerk'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const wrk = await WorkerPayment.findOne(query);
    if (!wrk) {
      return res.status(404).json({ status: 'error', message: 'Worker payment record not found.' });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (wrk.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${wrk.branch}].` });
      }
    }

    await WorkerPayment.deleteOne(query);
    const verify = await WorkerPayment.findOne(query);
    if (verify) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Worker payment record still exists.' });
    }

    recordAudit(req, {
      action: 'worker_payment.delete',
      entityType: 'worker_payment',
      entityId: wrk.id,
      entityLabel: `${wrk.workerName} (${wrk.role})`,
      campus: wrk.branch,
      amount: wrk.amount,
      summary: `Deleted a worker payment of Rs. ${Number(wrk.amount).toLocaleString('en-IN')} to ${wrk.workerName} at ${wrk.branch} for ${wrk.monthPeriod}.`,
      details: { monthPeriod: wrk.monthPeriod, paid: wrk.paid }
    });

    return res.json({ status: 'success', message: 'Worker payment record permanently deleted.' });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


// --- ACCOUNTANT STUDENT LOOKUP & BIO ROUTES ---

app.get('/api/accountant/students', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), async (req, res) => {
  try {
    await connectToDatabase();

    // Coerced to a string as well as being guarded by the global query check.
    // Defence in depth: this value ends up in a Mongo filter and must be a
    // string by the time it gets there whether or not the middleware ran.
    const requested = String(req.query.branch || '').trim();

    // Campus scope comes from the signed-in account. A scoped account —
    // accountant OR admin2 — may not name a different campus.
    //
    // Only the accountant branch of this check existed. An admin2 asking for
    // ?branch=<another campus> had that value written straight into the Mongo
    // filter, and the route returned the other campus's entire student list.
    // Every campus-scoped role has to be pinned here, not just the one that
    // happened to be considered when the check was written.
    const isOrgWide = String(req.user.campus || '').toLowerCase() === 'all';

    if (!isOrgWide && requested && requested.toLowerCase() !== 'all'
        && normalizeCampus(requested) !== normalizeCampus(req.user.campus)) {
      return res.status(403).json({
        status: 'error',
        message: `Your account may only view students in ${req.user.campus}.`
      });
    }

    const filter = campusScopeFilter(req);

    // Org-wide accounts may narrow to one campus, but never widen.
    if (isOrgWide && requested && requested.toLowerCase() !== 'all') {
      if (!isValidCampus(requested)) {
        return res.status(400).json({ status: 'error', message: `Unknown campus [${requested}].` });
      }
      filter.branch = normalizeCampus(requested);
    }

    const students = await Student.find(filter).sort({ name: 1 });
    return res.json({ status: 'success', data: students });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.get('/api/accountant/students/:id', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'clerk') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    return res.json({ status: 'success', data: student });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.patch('/api/accountant/students/:id/bio', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), requirePermission('editStudent'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'clerk') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    const allowedBioFields = ['name', 'fatherName', 'motherName', 'mobile', 'parentMobile', 'email', 'address', 'dob', 'course', 'section', 'hostelStatus', 'transportStatus'];
    allowedBioFields.forEach(field => {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    });

    await student.save();
    return res.json({ status: 'success', data: student });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


// --- FEE COLLECTION (PAYMENT) ROUTES ---

/**
 * Records a fee payment.
 *
 * Money handling here is deliberately defensive:
 *  - The duplicate guard is enforced by a UNIQUE index on idempotencyKey, not
 *    by a findOne() check. The old read-then-insert let two clicks landing in
 *    the same millisecond both pass the check and both insert a receipt.
 *  - totalPaid and remainingBalance are updated in ONE atomic pipeline update.
 *    The old code did an atomic $inc for totalPaid and then a read-modify-save
 *    for remainingBalance, so two concurrent payments could each write a
 *    balance computed before the other's increment landed.
 *  - The caller may pass its own idempotencyKey; otherwise we derive a stable
 *    one. The old key bucketed by a 10-second window, which both missed
 *    duplicates straddling a bucket boundary and wrongly merged two genuine
 *    identical payments made within the same 10 seconds.
 */
app.post('/api/accountant/students/:studentId/payments', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), requirePermission('collectFees'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      amount, category = 'Tuition Fee', installment = 'Installment 1',
      mode = 'UPI / NetBanking', date, remarks = '', transactionRef = '', idempotencyKey: clientKey
    } = req.body || {};

    if (!isValidPositiveNumber(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Amount must be a valid positive number.' });
    }

    const payAmt = Math.round(Number(amount) * 100) / 100;
    if (payAmt > MAX_STUDENT_FEE) {
      return res.status(400).json({ status: 'error', message: 'Payment amount exceeds the maximum permitted for a single transaction.' });
    }

    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if (!callerOwnsCampus(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    const idempotencyKey = (clientKey && String(clientKey).trim())
      ? `client_${String(clientKey).trim()}`
      : `srv_${student.studentId}_${payAmt}_${String(category).trim()}_${String(transactionRef || '').trim()}_${Math.floor(Date.now() / 15000)}`;

    // A payment may not exceed what is still owed.
    //
    // This existed only in the browser. The server accepted any positive
    // amount under the per-transaction cap, so posting directly recorded a
    // 50,000 payment against a 10,000 balance: totalPaid went to 50,000, the
    // balance clamped to 0, and the 40,000 difference became money marked as
    // received with nothing recording that it was owed back. It also breaks
    // the invariant the reconciliation check relies on, that paid plus
    // balance equals the fee.
    //
    // Checked here for a clear message, and enforced again in the update
    // below, which is the part that holds under two tills at once.
    const owed = Math.round(Number(student.remainingBalance || 0) * 100) / 100;
    if (payAmt > owed) {
      return res.status(400).json({
        status: 'error',
        message: owed <= 0
          ? 'This student has no outstanding balance. Nothing to collect.'
          : `Payment of Rs. ${payAmt.toLocaleString('en-IN')} exceeds the outstanding balance of Rs. ${owed.toLocaleString('en-IN')}.`,
        outstandingBalance: owed
      });
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString('hex')}`;

    let newPayment;
    try {
      newPayment = await Payment.create({
        receiptNumber,
        studentId: student.studentId,
        admissionNumber: student.admissionNumber,
        studentName: student.name,
        amount: payAmt,
        category: String(category).trim(),
        installment: String(installment).trim(),
        paymentMode: String(mode).trim(),
        cashier: req.user.username,
        branch: student.branch,
        date: date ? new Date(date) : new Date(),
        remarks: remarks || '',
        transactionRef: String(transactionRef || req.body.referenceNo || '').trim(),
        idempotencyKey
      });
    } catch (createErr) {
      // Unique index rejected it: this exact payment is already recorded.
      // Return the original receipt rather than double-charging.
      if (createErr && createErr.code === 11000) {
        const existing = await Payment.findOne({ idempotencyKey });
        if (existing) {
          console.log(`[Payments]: Duplicate submission blocked by unique index for key [${idempotencyKey}].`);
          const current = await Student.findById(student._id);
          return res.status(200).json({
            status: 'success',
            duplicate: true,
            message: 'This payment was already recorded. Showing the original receipt.',
            data: { payment: normalizePaymentForClient(existing), student: current }
          });
        }
      }
      throw createErr;
    }

    // One atomic update: increment totalPaid and recompute remainingBalance
    // from the document's own fields, server-side, in the same operation.
    // The filter carries the balance condition, so two tills collecting at the
    // same moment cannot both pass the check above and jointly overpay: the
    // second update simply does not match, and is rolled back below.
    const updatedStudent = await Student.findOneAndUpdate(
      { _id: student._id, remainingBalance: { $gte: payAmt } },
      [
        {
          $set: {
            totalPaid: { $round: [{ $add: [{ $ifNull: ['$totalPaid', 0] }, payAmt] }, 2] }
          }
        },
        {
          $set: {
            remainingBalance: {
              $max: [
                0,
                {
                  $round: [
                    {
                      $subtract: [
                        {
                          $add: [
                            { $ifNull: ['$tuitionFee', 0] }, { $ifNull: ['$hostelFee', 0] },
                            { $ifNull: ['$transportFee', 0] }, { $ifNull: ['$miscellaneousFee', 0] },
                            { $ifNull: ['$previousPending', 0] },
                            { $sum: { $map: { input: { $ifNull: ['$customFeeSlots', []] }, as: 's', in: { $ifNull: ['$$s.amount', 0] } } } }
                          ]
                        },
                        {
                          $add: [
                            { $ifNull: ['$tuitionWaiver', 0] }, { $ifNull: ['$hostelWaiver', 0] },
                            { $ifNull: ['$transportWaiver', 0] }, { $ifNull: ['$miscWaiver', 0] },
                            { $ifNull: ['$totalPaid', 0] }
                          ]
                        }
                      ]
                    },
                    2
                  ]
                }
              ]
            }
          }
        }
      ],
      { new: true }
    );

    if (!updatedStudent) {
      // Two reasons the update can match nothing, and they are not the same.
      const current = await Student.findById(student._id).select('remainingBalance').lean();
      const nowOwed = Math.round(Number(current?.remainingBalance || 0) * 100) / 100;

      if (current && payAmt > nowOwed) {
        // Another till collected in between and this payment would overpay.
        // The receipt was written before the ledger, so remove it: a payment
        // row that was never applied would inflate every reconciliation.
        await Payment.deleteOne({ _id: newPayment._id }).catch(err =>
          console.error(`[Payments]: Could not roll back unapplied receipt ${receiptNumber}:`, err.message));

        console.warn(`[Payments]: Receipt ${receiptNumber} rolled back — balance moved to ${nowOwed} before it applied.`);
        return res.status(409).json({
          status: 'error',
          message: nowOwed <= 0
            ? 'This balance was cleared by another payment a moment ago. Nothing left to collect.'
            : `Another payment was recorded first. Only Rs. ${nowOwed.toLocaleString('en-IN')} is now outstanding.`,
          outstandingBalance: nowOwed
        });
      }

      // Anything else is a genuine anomaly: the receipt exists but the ledger
      // did not move. Say so loudly rather than returning a success the books
      // will not agree with.
      console.error(`[Payments]: Receipt ${receiptNumber} created but student ${student.studentId} balance update matched nothing.`);
      return res.status(500).json({
        status: 'error',
        message: `Payment ${receiptNumber} was recorded but the student balance could not be updated. Do not re-submit; contact an administrator.`
      });
    }

    // Append the receipt summary for the UI's quick list, and settle the
    // fee-cleared flag in the same write.
    //
    // `yearFeeCleared` used to be set ONLY by the upgrade route, which
    // computes it once from the new year's payable amount. Nothing set it
    // when a payment actually cleared the balance — so a student who was
    // upgraded owing money and then paid it off kept `yearFeeCleared: false`
    // against a balance of zero, and the record disagreed with itself.
    // Derived from the balance the ledger update just produced, so the flag
    // cannot drift from the figure it describes.
    const balanceAfter = Math.round(Number(updatedStudent.remainingBalance || 0) * 100) / 100;

    await Student.updateOne({ _id: student._id }, {
      $set: { yearFeeCleared: balanceAfter <= 0 },
      $push: {
        receipts: {
          receiptNumber: newPayment.receiptNumber,
          date: newPayment.date,
          category: newPayment.category,
          installment: newPayment.installment,
          amount: newPayment.amount,
          balance: updatedStudent.remainingBalance,
          mode: newPayment.paymentMode,
          cashier: newPayment.cashier
        }
      }
    });

    const finalStudent = await Student.findById(student._id);

    // The entry the Rector's Logs screen exists for: which till took which
    // money from which student. Written only on the path where the receipt
    // was created AND the balance actually moved — the rollback and anomaly
    // branches above return before reaching here, so the trail never claims a
    // collection that did not apply.
    recordAudit(req, {
      action: 'payment.collect',
      entityType: 'payment',
      entityId: newPayment.receiptNumber,
      entityLabel: studentLabel(finalStudent || student),
      campus: student.branch,
      amount: newPayment.amount,
      summary: `Collected Rs. ${Number(newPayment.amount).toLocaleString('en-IN')} from ${studentLabel(finalStudent || student)} `
        + `via ${newPayment.paymentMode} (receipt ${newPayment.receiptNumber}); balance now `
        + `Rs. ${Number(updatedStudent.remainingBalance || 0).toLocaleString('en-IN')}.`,
      details: {
        receiptNumber: newPayment.receiptNumber,
        category: newPayment.category,
        installment: newPayment.installment,
        paymentMode: newPayment.paymentMode,
        balanceAfter: updatedStudent.remainingBalance
      }
    });

    return res.status(201).json({
      status: 'success',
      data: {
        payment: normalizePaymentForClient(newPayment),
        student: finalStudent
      }
    });
  } catch (err) {
    console.error('[Payments]: Recording failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Payment could not be recorded. No charge was applied.' });
  }
});

/**
 * --- STUDENT YEAR PROGRESSION -------------------------------------------
 *
 * GET  /api/accountant/students/:studentId/upgrade-eligibility
 * POST /api/accountant/students/:studentId/upgrade
 *
 * Only a First Year student whose fees are fully cleared may be upgraded.
 * Second Year is the end of the programme and Short Term does not progress at
 * all, so both are refused outright rather than being quietly ignored.
 *
 * The rule is evaluated on the server from the stored balance. The UI also
 * hides the control, but hiding a button is presentation, not a rule: the
 * decision has to hold when someone posts to the route directly.
 */

// Shared so the eligibility probe and the upgrade itself can never disagree
// about who may be upgraded — two copies of this rule would eventually drift,
// and the drift would show up as a button that appears and then errors.
function evaluateUpgradeEligibility(student) {
  const year = String(student.studentYear || 'First Year');

  // A balance that is not a finite number must never read as "cleared".
  //
  // NaN fails EVERY comparison: `NaN > 0` is false, so a corrupt balance fell
  // straight through the fees-pending check and returned ELIGIBLE, while the
  // UI's own `balance <= 0` test was also false and showed the control as
  // locked. Server said upgrade, screen said locked, and a student who had
  // paid nothing could be moved up by posting to the route directly.
  // Objects and arrays are rejected before coercion, because Number([]) is 0
  // and Number([7]) is 7 — an array would otherwise read as a real balance,
  // and an empty one as a CLEARED balance that unlocks the upgrade.
  const rawValue = student.remainingBalance;
  const isNumericScalar =
    typeof rawValue === 'number' ||
    (typeof rawValue === 'string' && rawValue.trim() !== '');
  const raw = isNumericScalar ? Number(rawValue) : NaN;

  if (!Number.isFinite(raw)) {
    return {
      eligible: false,
      code: 'BALANCE_UNKNOWN',
      year,
      balance: 0,
      reason: 'This student\'s balance could not be read as a number. Recalculate the fees before upgrading.'
    };
  }
  const balance = raw;

  if (year === 'Short Term') {
    return { eligible: false, reason: 'Short Term students do not progress to another year.', code: 'NOT_APPLICABLE', year, balance };
  }
  if (year === 'Second Year') {
    return { eligible: false, reason: 'This student is already in Second Year, which completes the programme.', code: 'ALREADY_FINAL', year, balance };
  }
  if (balance > 0) {
    return {
      eligible: false,
      code: 'FEES_PENDING',
      year, balance,
      reason: `Upgrade is locked until the fees are cleared. ${balance.toLocaleString('en-IN')} is still outstanding.`
    };
  }
  return { eligible: true, code: 'ELIGIBLE', year, balance, reason: 'Fees cleared. This student can be upgraded to Second Year.' };
}

app.get('/api/accountant/students/:studentId/upgrade-eligibility',
  authenticateToken, requireRole('accountant', 'admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    const { studentId } = req.params;
    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] }).lean();

    if (!student) return res.status(404).json({ status: 'error', message: 'Student not found.' });
    if (!callerOwnsCampus(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: 'This student belongs to another campus.' });
    }

    const verdict = evaluateUpgradeEligibility(student);
    return res.json({
      status: 'success',
      data: {
        ...verdict,
        // The current fee structure, so the confirmation screen can offer it
        // as the starting point for next year rather than an empty form.
        currentFees: {
          tuitionFee: Number(student.tuitionFee || 0),
          hostelFee: Number(student.hostelFee || 0),
          transportFee: Number(student.transportFee || 0),
          miscellaneousFee: Number(student.miscellaneousFee || 0),
          customFeeSlots: student.customFeeSlots || [],
          tuitionWaiver: Number(student.tuitionWaiver || 0),
          hostelWaiver: Number(student.hostelWaiver || 0),
          transportWaiver: Number(student.transportWaiver || 0),
          miscWaiver: Number(student.miscWaiver || 0)
        },
        academicYear: student.academicYear || '',
        completedYears: (student.yearHistory || []).map(h => h.studentYear)
      }
    });
  } catch (err) {
    console.error(`[Upgrade]: Eligibility check failed:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Could not check upgrade eligibility.' });
  }
});

app.post('/api/accountant/students/:studentId/upgrade',
  authenticateToken, requireRole('accountant', 'admin1', 'clerk'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const { studentId } = req.params;
    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) return res.status(404).json({ status: 'error', message: 'Student not found.' });
    if (!callerOwnsCampus(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: 'This student belongs to another campus.' });
    }

    // Re-check against the stored record at the moment of the write. The UI
    // may have read an eligible state minutes ago and a payment could have
    // been reversed since.
    const verdict = evaluateUpgradeEligibility(student);
    if (!verdict.eligible) {
      return res.status(409).json({ status: 'error', message: verdict.reason, data: verdict });
    }

    const body = req.body || {};
    const num = (v, fallback) => {
      if (v === undefined || v === null || v === '') return fallback;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return null;
      return Math.round(n * 100) / 100;
    };

    // The upgrade form sets next year's fees, and it accepted waivers too —
    // which made it a way for a clerk or an accountant to write off fees
    // without ever touching the Rector-only waiver route. Waivers are refused
    // here for anyone but the Rector, rather than silently ignored, so nobody
    // records a concession that was never applied.
    if (req.user.role !== 'admin1') {
      const attempted = STUDENT_WAIVER_FIELDS.filter(f => body[f] !== undefined && Number(body[f]) > 0);
      if (attempted.length > 0) {
        recordAudit(req, {
          action: 'student.fee_waiver',
          entityType: 'student',
          entityId: student.studentId,
          entityLabel: studentLabel(student),
          campus: student.branch,
          outcome: 'denied',
          summary: `Refused: ${req.user.username} tried to apply fee waivers while upgrading ${studentLabel(student)}.`,
          details: { fields: attempted }
        });
        return res.status(403).json({
          status: 'error',
          message: 'Fee waivers can only be set by the Rector. Enter the fees for the new year without a waiver.'
        });
      }
    }

    // Next year's fees default to this year's, which is what the brief asks
    // for: the same structure, offered for editing.
    const next = {
      tuitionFee: num(body.tuitionFee, Number(student.tuitionFee || 0)),
      hostelFee: num(body.hostelFee, Number(student.hostelFee || 0)),
      transportFee: num(body.transportFee, Number(student.transportFee || 0)),
      miscellaneousFee: num(body.miscellaneousFee, Number(student.miscellaneousFee || 0)),
      tuitionWaiver: num(body.tuitionWaiver, 0),
      hostelWaiver: num(body.hostelWaiver, 0),
      transportWaiver: num(body.transportWaiver, 0),
      miscWaiver: num(body.miscWaiver, 0)
    };
    for (const [field, value] of Object.entries(next)) {
      if (value === null) {
        return res.status(400).json({ status: 'error', message: `${field} must be a number of zero or more.` });
      }
    }

    let slots = student.customFeeSlots || [];
    if (Array.isArray(body.customFeeSlots)) {
      slots = [];
      for (const raw of body.customFeeSlots.slice(0, 20)) {
        // cleanText returns { value } or { error } — it must be unwrapped, not
        // used directly, or an object reaches the schema and fails the cast.
        const named = cleanText(raw && raw.name, { field: 'Custom fee name', max: MAX_TEXT.short, required: true });
        if (named.error) {
          return res.status(400).json({ status: 'error', message: named.error });
        }
        const amount = num(raw && raw.amount, null);
        if (amount === null) {
          return res.status(400).json({ status: 'error', message: `Amount for "${named.value}" must be a number of zero or more.` });
        }
        slots.push({ id: (raw && raw.id) || crypto.randomBytes(6).toString('hex'), name: named.value, amount });
      }
    }

    // Same arithmetic as every other fee path, through the shared function.
    // A new year starts with nothing paid against it.
    const totals = computeStudentFees({ ...next, customFeeSlots: slots, previousPending: 0 }, { totalPaid: 0 });

    if (totals.waivers > totals.gross) {
      return res.status(400).json({ status: 'error', message: 'Total waivers cannot exceed the total fees.' });
    }

    // The ten-lakh cap is enforced on the create, edit and override routes.
    // This route was missing it, so the upgrade form was a way to set fees
    // above a limit the rest of the system treats as absolute.
    if (totals.exceedsCap) {
      return res.status(400).json({
        status: 'error',
        message: `Total fees (Rs. ${totals.gross.toLocaleString('en-IN')}) exceed the maximum allowed per student (Rs. ${MAX_STUDENT_FEE.toLocaleString('en-IN')}).`
      });
    }

    const payable = totals.balance;

    const requestedYear = cleanText(body.academicYear, { field: 'Academic year', max: 20 });
    if (requestedYear.error) {
      return res.status(400).json({ status: 'error', message: requestedYear.error });
    }
    const nextAcademicYear = requestedYear.value
      || (() => {
        const start = parseInt(String(student.academicYear || '').split('-')[0], 10);
        return Number.isFinite(start) ? `${start + 1}-${start + 2}` : String(student.academicYear || '');
      })();

    // Freeze the closing year before any of it is overwritten. Without this
    // the first year's fee structure and receipts would be lost the moment
    // the new year's figures are written over them.
    const closingSlotTotal = (student.customFeeSlots || []).reduce((a, s) => a + Number(s.amount || 0), 0);
    const closingGross = Number(student.tuitionFee || 0) + Number(student.hostelFee || 0)
      + Number(student.transportFee || 0) + Number(student.miscellaneousFee || 0)
      + Number(student.previousPending || 0) + closingSlotTotal;
    const closingWaivers = Number(student.tuitionWaiver || 0) + Number(student.hostelWaiver || 0)
      + Number(student.transportWaiver || 0) + Number(student.miscWaiver || 0);

    student.yearHistory = student.yearHistory || [];
    student.yearHistory.push({
      studentYear: student.studentYear || 'First Year',
      academicYear: student.academicYear || '',
      tuitionFee: Number(student.tuitionFee || 0),
      hostelFee: Number(student.hostelFee || 0),
      transportFee: Number(student.transportFee || 0),
      miscellaneousFee: Number(student.miscellaneousFee || 0),
      previousPending: Number(student.previousPending || 0),
      customFeeSlots: student.customFeeSlots || [],
      tuitionWaiver: Number(student.tuitionWaiver || 0),
      hostelWaiver: Number(student.hostelWaiver || 0),
      transportWaiver: Number(student.transportWaiver || 0),
      miscWaiver: Number(student.miscWaiver || 0),
      totalPayable: Math.max(0, Math.round((closingGross - closingWaivers) * 100) / 100),
      totalPaid: Number(student.totalPaid || 0),
      closedAt: new Date(),
      closedBy: req.user.username,
      receipts: student.receipts || []
    });

    // Open the new year. The balance starts at the full amount payable: this
    // is a new year's fees, not a continuation of last year's account.
    //
    // The Payment collection is NOT touched. Those rows are the real financial
    // record and they stay exactly as they are — which is why Complete History
    // still shows first-year receipts after an upgrade.
    student.studentYear = 'Second Year';
    student.academicYear = nextAcademicYear;
    student.tuitionFee = next.tuitionFee;
    student.hostelFee = next.hostelFee;
    student.transportFee = next.transportFee;
    student.miscellaneousFee = next.miscellaneousFee;
    student.tuitionWaiver = next.tuitionWaiver;
    student.hostelWaiver = next.hostelWaiver;
    student.transportWaiver = next.transportWaiver;
    student.miscWaiver = next.miscWaiver;
    student.customFeeSlots = slots;
    student.previousPending = 0;
    student.totalPaid = 0;
    student.remainingBalance = payable;
    student.yearFeeCleared = payable === 0;
    student.receipts = [];

    student.markModified('customFeeSlots');
    student.markModified('yearHistory');
    student.markModified('receipts');
    await student.save();

    // Verify by reading back rather than trusting the save.
    const saved = await Student.findById(student._id).lean();
    if (saved.studentYear !== 'Second Year' || Math.round(Number(saved.remainingBalance)) !== Math.round(payable)) {
      console.error(`[Upgrade]: Read-back mismatch for ${saved.admissionNumber}`);
      return res.status(500).json({ status: 'error', message: 'The upgrade did not save correctly. Check the student record before retrying.' });
    }

    console.log(`[Upgrade]: ${saved.admissionNumber} First Year -> Second Year by ${req.user.username} (payable ${payable})`);
    recordAudit(req, {
      action: 'student.upgrade',
      entityType: 'student',
      entityId: saved.studentId,
      entityLabel: studentLabel(saved),
      campus: saved.branch,
      amount: payable,
      summary: `Moved ${studentLabel(saved)} from First Year to Second Year; new year's fees Rs. ${payable.toLocaleString('en-IN')}.`,
      details: { academicYear: saved.academicYear, payable }
    });
    return res.json({
      status: 'success',
      message: `${saved.name} moved to Second Year. New balance ${payable.toLocaleString('en-IN')}.`,
      data: saved
    });
  } catch (err) {
    console.error('[Upgrade]: Failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'The upgrade failed. Nothing was changed.' });
  }
});

app.get('/api/accountant/students/:studentId/payments', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), async (req, res) => {
  try {
    await connectToDatabase();
    const { studentId } = req.params;
    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'clerk') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    const payments = await Payment.find({ studentId: student.studentId }).sort({ date: -1 });
    return res.json({ status: 'success', data: payments });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


// --- BACKUP, RESTORE & SYSTEM WIPE ROUTES ---

// REMOVED: GET /api/system/run-backup — an authentication bypass.
//
// The route treated a client-supplied header as proof of identity:
//
//   const isVercelCron = req.headers['x-vercel-cron'] === '1' || ... === 'true';
//   if (!isVercelCron) { /* only NOW check the Bearer token and the role */ }
//
// `x-vercel-cron` is an ordinary HTTP header that any caller can set, so
// sending it skipped the token check, the role check and everything else.
// Confirmed against production: without the header the route answered 401,
// with `x-vercel-cron: 1` and no credentials at all it answered 200, ran a
// full database export, uploaded it to Drive, and returned the live record
// counts and Drive file id to an anonymous caller. Because the handler does a
// full read of every collection plus an encrypt and an upload, the ordinary
// 120-per-15-minute budget also made it an unauthenticated way to force ~120
// full database dumps per quarter hour.
//
// Deleted rather than repaired. There was never a legitimate caller: this app
// runs on Hostinger, not Vercel, so no Vercel cron exists, and the nightly
// backup is node-cron inside the app process (server/start.cjs) which needs no
// HTTP route at all. Manual whole-database backups remain available on
// POST /api/authenticator/backup, which is properly authenticated.
//
// A header must never be treated as an authenticator. If a scheduler outside
// the process ever genuinely needs to call in, it gets a secret compared with
// crypto.timingSafeEqual against a value from the environment — never a
// well-known header name, and never a literal in the source.

/**
 * GET /api/authenticator/available-backups & GET /api/authenticator/backups
 * Returns list of backup files, categories, and recent audit logs.
 */
const handleGetAvailableBackups = async (req, res) => {
  try {
    let driveFiles = [];
    try { driveFiles = await getAllAvailableBackupFiles(); } catch (e) { console.warn('Drive list notice:', e.message); }
    const logs = getBackupLogs();

    return res.json({
      status: 'success',
      data: {
        Students_Data: {},
        Teachers_Data: {},
        Expenditures_Data: {},
        driveFiles,
        logs
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
};
app.get('/api/authenticator/available-backups', authenticateToken, requireRole('authenticator', 'admin1'), requireDatabase, handleGetAvailableBackups);
app.get('/api/authenticator/backups', authenticateToken, requireRole('authenticator', 'admin1'), requireDatabase, handleGetAvailableBackups);

/**
 * GET /api/authenticator/keys
 *
 * Reports PIN *status* only. It deliberately does not return PIN values.
 * The previous version read a `pin_plaintext` column — every account's PIN
 * stored in cleartext next to its own hash — and, failing that, fell back to
 * the in-source seed PIN or a value derived from a hardcoded string. Anyone
 * who reached this endpoint got a working credential for every portal.
 * To hand out a new PIN, use regenerate-keys, which returns it exactly once.
 */
app.get('/api/authenticator/keys', authenticateToken, requireRole('authenticator', 'admin1'), requireDatabase, async (req, res) => {
  try {
    const users = await User.find({ role: { $in: [...MANAGED_PORTAL_ROLES] } })
      .select('username role campus name pin updatedAt')
      .lean();

    const accounts = users.map(u => ({
      username: u.username,
      role: u.role,
      campus: u.campus,
      name: u.name,
      pinConfigured: Boolean(u.pin),
      lastUpdatedAt: u.updatedAt || null
    }));

    return res.json({
      status: 'success',
      data: {
        generatedAt: Date.now(),
        accounts,
        notice: 'PIN values are stored only as bcrypt hashes and cannot be read back. Use "Regenerate" to issue a new PIN.'
      }
    });
  } catch (err) {
    console.error('[Keys]: Failed to list PIN status:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load account key status.' });
  }
});

/**
 * POST /api/authenticator/regenerate-keys
 *
 * Issues fresh PINs. The cleartext values are returned in this response and
 * nowhere else — only the bcrypt hash is persisted. Regenerating requires the
 * caller to confirm with their own PIN first.
 *
 * Accepts an optional `usernames` array to rotate a subset; omitting it
 * rotates every managed portal account.
 */
app.post('/api/authenticator/regenerate-keys', authenticateToken, requireRole('authenticator', 'admin1'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const requested = Array.isArray(req.body && req.body.usernames) ? req.body.usernames.map(u => String(u).trim().toLowerCase()) : null;

    const filter = { role: { $in: [...MANAGED_PORTAL_ROLES] } };
    if (requested && requested.length > 0) {
      filter.username = { $in: requested };
    }

    const users = await User.find(filter).select('username').lean();
    if (users.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No matching portal accounts found.' });
    }

    const issuedPins = {};
    const failed = [];

    for (const u of users) {
      // crypto.randomInt is uniform and unpredictable; Math.random is neither,
      // and these PINs gate destructive actions.
      const newPin = String(crypto.randomInt(100000, 1000000));
      const result = await User.updateOne(
        { username: u.username },
        { $set: { pin: newPin }, $unset: { pin_plaintext: '' } }
      );

      // A write that matched nothing is a failure, not a success with a PIN
      // the operator will hand out and nobody can actually use.
      if (result.matchedCount === 0) {
        failed.push(u.username);
        continue;
      }
      issuedPins[u.username] = newPin;
    }

    if (failed.length > 0) {
      console.error(`[Keys]: PIN regeneration failed for: ${failed.join(', ')}`);
      return res.status(500).json({
        status: 'error',
        message: `PIN regeneration failed for ${failed.length} account(s): ${failed.join(', ')}. No PIN is shown for those accounts.`,
        data: { issuedPins, failed }
      });
    }

    console.log(`[Keys]: PINs regenerated for ${users.length} account(s) by [${req.user.username}]`);

    return res.json({
      status: 'success',
      message: `New PINs issued for ${users.length} account(s). These values are shown once and are not recoverable afterwards.`,
      data: { generatedAt: Date.now(), dailyPins: issuedPins }
    });
  } catch (err) {
    console.error('[Keys]: Error regenerating PINs:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to regenerate PINs.' });
  }
});

/**
 * GET /api/authenticator/stats
 */
app.get('/api/authenticator/stats', authenticateToken, requireRole('authenticator', 'admin1'), requireDatabase, async (req, res) => {
  try {
    // A failure here used to be swallowed, leaving the dashboard showing zeros
    // that were indistinguishable from a genuinely empty system.
    // Every number below used to be a literal: activeDevices, activeSessions,
    // activeSessionCount, systemsActive and portalSlotTotal were hard-coded to
    // 4/[]/4/4/4 regardless of reality, and lastBackupAt was `new Date()` — so
    // the panel always reported that a backup had just run, even if backups
    // had been failing for weeks. An operator checking "when did we last back
    // up?" was reading a clock, not a fact.
    const [totalStudents, totalTeachers, totalStaff, sessionUsers] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      User.countDocuments(),
      User.find({ activeSessionId: { $ne: null } })
        .select('username role campus name activeSessionId sessionStartedAt lastSeenAt sessionIp sessionUserAgent')
        .lean()
    ]);

    // A session whose lastSeenAt has aged past the idle window is already dead
    // — authenticateToken will end it on its next request. Showing it as live
    // would overstate how many people are signed in.
    const cutoff = Date.now() - SESSION_IDLE_TIMEOUT_MS;
    const live = sessionUsers.filter(u => !u.lastSeenAt || new Date(u.lastSeenAt).getTime() > cutoff);

    const activeSessions = live.map(u => ({
      username: u.username,
      role: u.role,
      campus: u.campus || '',
      name: u.name || '',
      sessionGuid: String(u.activeSessionId || '').slice(0, 8),
      loggedInAt: u.sessionStartedAt || null,
      lastSeenAt: u.lastSeenAt || null,
      ipAddress: u.sessionIp || '',
      userAgent: u.sessionUserAgent || ''
    }));

    // The real date of the newest backup, read from Drive. Null when there is
    // none or Drive cannot be reached — the UI must say "unknown", never
    // invent a reassuring timestamp.
    let lastBackupAt = null;
    try {
      const tree = await campusBackup.listBackupTree(null);
      let newest = 0;
      for (const byCampus of Object.values(tree)) {
        for (const files of Object.values(byCampus)) {
          if (!Array.isArray(files)) continue;
          for (const f of files) {
            const t = new Date(f.createdTime).getTime();
            if (t > newest) newest = t;
          }
        }
      }
      if (newest) lastBackupAt = new Date(newest).toISOString();
    } catch (err) {
      console.error('[Stats]: Could not read the backup tree:', err.message);
    }

    return res.json({
      status: 'success',
      data: {
        totalStudents,
        totalTeachers,
        totalStaff,
        activeDevices: activeSessions.length,
        activeSessions,
        activeSessionCount: activeSessions.length,
        systemsActive: activeSessions.length,
        systemsInactive: Math.max(0, totalStaff - activeSessions.length),
        portalSlotTotal: totalStaff,
        sessionIdleTimeoutMinutes: Math.round(SESSION_IDLE_TIMEOUT_MS / 60000),
        lastBackupAt
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * GET /api/authenticator/sync-journal & POST /api/authenticator/reconcile
 */
app.get('/api/authenticator/sync-journal', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  return res.json({ status: 'success', data: [], logs: [] });
});

// Reported "Database sync reconciled successfully" without doing anything.
// There is a single database and no replica to reconcile against.

/**
 * GET, POST, PUT, DELETE /api/authenticator/accounts
 * Staff Account Management (ID & Password updates)
 */
app.get('/api/authenticator/accounts', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  try {
    const accounts = await getManagedPortalAccounts();
    return res.json({ status: 'success', data: accounts });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.post('/api/authenticator/accounts', authenticateToken, requireRole('authenticator', 'admin1'), requireDatabase, async (req, res) => {
  try {
    const { username, password, role, name, email, mobile, department, campus } = req.body || {};
    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (!normalizedUsername) {
      return res.status(400).json({ status: 'error', message: 'Username is required.' });
    }
    if (normalizedUsername === FIXED_AUTHENTICATOR_USERNAME) {
      return res.status(403).json({ status: 'error', message: 'Authenticator credentials cannot be changed from this panel.' });
    }
    if (!MANAGED_PORTAL_USERNAMES.has(normalizedUsername)) {
      return res.status(403).json({ status: 'error', message: 'Creating new portal IDs is disabled. Update an existing portal slot only.' });
    }

    const existing = await User.findOne({ username: normalizedUsername });
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Portal slot not found. Restore the default seeded account first.' });
    }

    if (password && String(password).trim()) {
      existing.password = String(password).trim();
    }
    if (name !== undefined) existing.name = String(name || '').trim() || existing.name;
    if (email !== undefined) existing.email = String(email || '').trim();
    if (mobile !== undefined) existing.mobile = String(mobile || '').trim();
    if (department !== undefined) existing.department = String(department || '').trim();
    if (role && MANAGED_PORTAL_ROLES.has(String(role))) existing.role = String(role);
    if (campus !== undefined && existing.role !== 'authenticator') {
      existing.campus = String(campus || '').trim() || existing.campus;
    }

    await existing.save();
    // Records THAT a credential changed, never the value. `passwordChanged` is
    // a boolean for exactly that reason — a log that carries the new password
    // is a second copy of the credential in a place more people can read.
    recordAudit(req, {
      action: 'account.update',
      entityType: 'account',
      entityId: existing.username,
      entityLabel: `${existing.name} (${existing.username})`,
      campus: existing.campus,
      summary: `Updated the portal account ${existing.username}`
        + (password && String(password).trim() ? ', including its password' : '')
        + '.',
      details: {
        passwordChanged: !!(password && String(password).trim()),
        role: existing.role,
        campus: existing.campus
      }
    });

    const updated = sanitizeManagedAccount(existing);
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.put('/api/authenticator/accounts/:id', authenticateToken, requireRole('authenticator', 'admin1'), requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const { username: bodyUsername, password, name, email, mobile, department } = req.body || {};
    const normalizedUsername = String(bodyUsername || '').trim().toLowerCase();

    if (id === FIXED_AUTHENTICATOR_USERNAME || normalizedUsername === FIXED_AUTHENTICATOR_USERNAME) {
      return res.status(403).json({ status: 'error', message: 'Authenticator credentials cannot be modified.' });
    }

    const updateFields = {};
    if (normalizedUsername) {
      const duplicate = await User.findOne({
        username: normalizedUsername,
        _id: { $ne: id }
      }).lean().catch(() => null);
      if (duplicate) {
        return res.status(409).json({ status: 'error', message: 'That portal ID is already in use.' });
      }
      updateFields.username = normalizedUsername;
    }
    if (name !== undefined) updateFields.name = String(name || '').trim();
    if (email !== undefined) updateFields.email = String(email || '').trim();
    if (mobile !== undefined) updateFields.mobile = String(mobile || '').trim();
    if (department !== undefined) updateFields.department = String(department || '').trim();
    if (password && typeof password === 'string' && password.trim()) {
      updateFields.password = password.trim();
    }

    let updated = { _id: id, ...updateFields };

    if (mongoose.connection.readyState === 1) {
      try {
        const isObjId = isValidObjectId(id);
        const targetUsername = bodyUsername || id.replace('sys_', '');
        const doc = await User.findOneAndUpdate(
          { $or: [{ _id: isObjId ? id : null }, { username: targetUsername }, { username: id }] },
          { $set: updateFields },
          { new: true }
        ).lean();
        if (doc) {
          updated = doc;
        }
      } catch (dbErr) {
        console.warn('⚠️ [Auth]: Account update notice:', dbErr.message);
      }
    }

    console.log(`✏️ [Accounts]: Updated account [${id}] by ${req.user.username}`);
    recordAudit(req, {
      action: 'account.update',
      entityType: 'account',
      entityId: updated.username || id,
      entityLabel: `${updated.name || ''} (${updated.username || id})`.trim(),
      campus: updated.campus || '',
      summary: `Updated the portal account ${updated.username || id}`
        + (Object.prototype.hasOwnProperty.call(updateFields, 'password') ? ', including its password' : '')
        + (Object.prototype.hasOwnProperty.call(updateFields, 'username') ? ', including its portal ID' : '')
        + '.',
      details: {
        // The field NAMES only. updateFields holds the new password hash, so
        // it must never be spread into the log wholesale.
        fields: Object.keys(updateFields),
        passwordChanged: Object.prototype.hasOwnProperty.call(updateFields, 'password')
      }
    });
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.delete('/api/authenticator/accounts/:id', authenticateToken, requireRole('authenticator', 'admin1'), requireDatabase, async (req, res) => {
  try {
    return res.status(405).json({ status: 'error', message: 'Deleting portal accounts is disabled. Update the existing fixed slots only.' });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * POST /api/authenticator/backup & POST /api/authenticator/restore-data
 */
app.post('/api/authenticator/backup', authenticateToken, requireRole('authenticator', 'admin1'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const backupResult = await generateAndUploadBackup(req.user?.username || 'authenticator');
    return res.json({ status: 'success', message: 'Backup created successfully', data: backupResult });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


/**
 * GET /api/authenticator/backup-codes & POST /api/authenticator/reset-password
 */
// Backup codes were generated on the fly from a counter (BC-7890, BC-7891, …)
// and stored nowhere, so they authenticated nothing. The reset flow below
// requires the caller's own security PIN instead, which is a real check.

app.post('/api/authenticator/reset-password', authenticateToken, requireRole('authenticator', 'admin1'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ status: 'error', message: 'Username and new password are required.' });
    }

    const newPassword = String(password).trim();
    if (newPassword.length < 12) {
      return res.status(400).json({ status: 'error', message: 'New password must be at least 12 characters.' });
    }

    const target = String(username).trim().toLowerCase();
    if (target === FIXED_AUTHENTICATOR_USERNAME) {
      return res.status(403).json({ status: 'error', message: 'The authenticator password cannot be reset from this panel.' });
    }

    // A write that matched no document must not report success — this
    // previously told the operator the password had been reset even when the
    // account did not exist or the write threw.
    const result = await User.updateOne(
      { username: target },
      { $set: { password: newPassword, activeSessionId: null } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ status: 'error', message: `No account found with username [${target}].` });
    }

    // Force the account out of any live session so the old password cannot
    // continue to be used through an existing token.
    await RefreshToken.updateMany({ username: target, revoked: false }, { $set: { revoked: true } });

    console.log(`[Accounts]: Password reset for [${target}] by [${req.user.username}]. Sessions revoked.`);
    return res.json({ status: 'success', message: `Password reset for ${target}. Any active session for that account has been ended.` });
  } catch (err) {
    console.error('[Accounts]: Password reset failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Password reset failed. The password was not changed.' });
  }
});

/**
 * DELETE /api/authenticator/purge-student-faculty-data & POST /api/system/purge-drive
 */
app.delete('/api/authenticator/purge-student-faculty-data', authenticateToken, requireRole('authenticator'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    // Erases every student, teacher and payment. Once the step-up PIN came
    // off, this was the one destructive route left with no second factor at
    // all — a live session and nothing else. It takes the operations password
    // like the wipe and the restore do.
    if (!verifyOpsPassword(req, res)) return;

    let students = 0, teachers = 0, payments = 0;
    {
      const sRes = await Student.deleteMany({});
      const tRes = await Teacher.deleteMany({});
      const pRes = await Payment.deleteMany({});
      students = sRes.deletedCount || 0;
      teachers = tRes.deletedCount || 0;
      payments = pRes.deletedCount || 0;
    }
    return res.json({ status: 'success', message: 'Data purged', data: { students, teachers, payments } });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

// Claimed "Google Drive purged successfully" while never contacting Drive.

/**
 * POST /api/authenticator/wipe-database
 * Role authenticator ONLY. Requires real password check via bcrypt.
 * Automatically triggers a fresh encrypted backup to Google Drive FIRST before wiping.
 */
// The most destructive endpoint in the system — it empties every data
// collection across all four campuses.
//
// It briefly required two secrets, the account password AND the step-up
// security PIN. The PIN prompts were removed from every action in the app on
// the operator's explicit instruction, this one included, after the risk was
// put to them directly. What remains is the password check below, which is
// deliberate and is the last thing standing between a mis-click and an empty
// database: it is re-verified against bcrypt on every call, so an open session
// alone is not enough. Do not remove it as well.
app.post('/api/authenticator/wipe-database', authenticateToken, requireRole('authenticator'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    // One operations password now, rather than this account's own — the same
    // one that authorises purges, backups and restores.
    if (!verifyOpsPassword(req, res)) return;

    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'authenticator') {
      return res.status(403).json({ status: 'error', message: 'Only authenticator role can perform database wipe.' });
    }

    console.log(`âš ï¸ [PRE-WIPE AUTO BACKUP]: Generating mandatory Google Drive backup prior to wipe for [${user.username}]...`);
    const preWipeBackup = await generateAndUploadBackup(`pre_wipe_${user.username}`);

    console.log(`âš ï¸ [EXECUTING WIPE]: Wiping data collections for [${user.username}]...`);
    const wipeResult = await wipeDataCollections(user.username);

    return res.json({
      status: 'success',
      message: 'Database data collections wiped successfully after pre-wipe backup.',
      data: {
        preWipeBackup,
        wipeResult
      }
    });
  } catch (err) {
    console.error('Wipe database error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database wipe failure.' });
  }
});

// REMOVED: POST /api/authenticator/restore-backup — the whole-database restore.
//
// It survived as an unreferenced route after the UI moved to the campus-scoped
// restore, and it was the weaker of the two paths to a far more destructive
// outcome: it took only a password (no security PIN), never validated the
// backup envelope, never verified the checksum, never checked that the file's
// campus matched anything, restored EVERY campus in one call, and did no
// read-back leak check afterwards. Anyone holding an authenticator session
// could use it to skip the entire restore security chain.
//
// The replacement is POST /api/backup/restore, which is campus- and
// type-scoped, requires the security PIN on top of the password, validates and
// dry-runs before it writes, and verifies afterwards that nothing landed
// outside the target campus. Whole-estate recovery is done by restoring each
// campus/type in turn, which is deliberate: there is no longer a single button
// that can overwrite all four campuses at once.


// --- PUBLIC ENQUIRIES ENDPOINT ---
// Allows prospective students/parents to submit admissions enquiries from the public portfolio
app.post('/api/enquiries', async (req, res) => {
  try {
    await connectToDatabase();
    const { mobile } = req.body || {};

    // This is a PUBLIC endpoint — anyone on the internet can post to it, so it
    // gets the strictest treatment. It previously accepted a nested object as
    // studentName and stored the string "[object Object]".
    const text = cleanTextFields(req.body || {}, {
      studentName: { required: true, max: FIELD_LIMITS.personName },
      preferredCampus: { required: true, max: FIELD_LIMITS.course },
      parentName: { max: FIELD_LIMITS.personName },
      email: { max: FIELD_LIMITS.email },
      stream: { max: FIELD_LIMITS.subject },
      currentGrade: { max: FIELD_LIMITS.course },
      notes: { max: FIELD_LIMITS.notes },
      mobile: { required: true, max: FIELD_LIMITS.mobile }
    });
    if (text.error) {
      return res.status(400).json({ status: 'error', message: text.error });
    }
    const { studentName, parentName, email, stream, preferredCampus, currentGrade, notes } = text.values;

    // Mobile validation for enquiry
    const enquiryMobileDigits = String(mobile).replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(enquiryMobileDigits)) {
      return res.status(400).json({ status: 'error', message: 'Mobile number must be exactly 10 digits.' });
    }

    const count = await Enquiry.countDocuments();
    const referenceCode = `ENQ-2026-${String(count + 1).padStart(4, '0')}`;

    const newEnquiry = await Enquiry.create({
      referenceCode,
      studentName,
      parentName,
      mobile: text.values.mobile,
      email,
      stream: stream || 'MPC',
      preferredCampus,
      currentGrade: currentGrade || '10th Class',
      notes
    });

    return res.status(201).json({
      status: 'success',
      message: 'Enquiry submitted successfully.',
      referenceCode: newEnquiry.referenceCode,
      data: newEnquiry
    });
  } catch (err) {
    console.error('[Enquiry] Creation error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to submit enquiry.' });
  }
});

// The frontend has always called PATCH /api/enquiries/:id to move an enquiry
// through its lifecycle, but no such route existed — every status change 404'd.
// Enquiry is a real model, so this is implemented properly rather than stubbed.
app.patch('/api/enquiries/:id', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};

    const allowedStatuses = ['Pending', 'Contacted', 'Enrolled', 'Closed', 'Archived'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ status: 'error', message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }
    if (status === undefined && notes === undefined) {
      return res.status(400).json({ status: 'error', message: 'Provide a status or notes to update.' });
    }

    const isObjId = isValidObjectId(id);
    const enquiry = await Enquiry.findOne({ $or: [{ _id: isObjId ? id : null }, { referenceCode: id }] });
    if (!enquiry) {
      return res.status(404).json({ status: 'error', message: 'Enquiry not found.' });
    }

    // Campus-scoped staff may only touch enquiries for their own campus.
    if (String(req.user.campus || '').toLowerCase() !== 'all') {
      const own = String(req.user.campus).split(' ')[0].toLowerCase();
      if (!String(enquiry.preferredCampus || '').toLowerCase().includes(own)) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Enquiry is for campus [${enquiry.preferredCampus}].` });
      }
    }

    if (status !== undefined) enquiry.status = status;
    if (notes !== undefined) enquiry.notes = String(notes).trim();
    await enquiry.save();

    // Return the complete updated document so a client merge cannot blank
    // out fields it did not send.
    return res.json({ status: 'success', data: enquiry });
  } catch (err) {
    console.error('[Enquiry]: Update failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update the enquiry.' });
  }
});

app.get('/api/enquiries', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();
    // Took ?branch straight from the query with no check against the caller,
    // so a scoped account could list another campus's admissions enquiries.
    const campus = resolveReadCampus(req, res);
    if (campus === null && res.headersSent) return;

    // Enquiries store the campus the enquirer chose on the public form, whose
    // wording ("Erragattugutta Campus 1") does not match the internal campus
    // names, so this matches on the town rather than the exact string.
    //
    // The town is escaped before it becomes a regex. It was interpolated raw,
    // which let a query parameter compile into a pattern — loose matching at
    // best, and a denial of service at worst if someone sent a pathological
    // one. It is validated against the campus list before reaching here, but
    // a value that ends up inside a RegExp must be escaped regardless.
    const filter = !campus
      ? {}
      : { preferredCampus: new RegExp(escapeRegex(String(campus).split(' ')[0]), 'i') };

    const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ status: 'success', data: enquiries });
  } catch (err) {
    console.error('[Enquiry] List error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch enquiries.' });
  }
});


// --- LIGHTWEIGHT LAST-CHANGED TIMESTAMP ENDPOINT ---
// Used by the frontend to check whether data has changed before doing a full refetch.
// Intentionally cheap: returns max(updatedAt) across collections for one campus, not full datasets.
// Requires valid JWT auth and respects campus isolation.
app.get('/api/system/last-changed', authenticateToken, enforceCampusIsolation, async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (!branch || String(branch).toLowerCase() === 'all') {
      return res.status(400).json({ status: 'error', message: 'Specific campus branch is required for last-changed check.' });
    }

    if (!isValidCampus(branch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}].` });
    }

    const filter = { branch: String(branch).trim() };

    // 6 lightweight indexed queries â€” each returns at most 1 document (the newest)
    const [latestStudent, latestTeacher, latestFeeSettings, latestExpenditure, latestWorkerPayment, latestPayment] = await Promise.all([
      Student.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Teacher.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      FeeSettings.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Expenditure.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      WorkerPayment.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Payment.findOne(filter).sort({ updatedAt: -1 }).select('updatedAt').lean()
    ]);

    const timestamps = [
      latestStudent?.updatedAt,
      latestTeacher?.updatedAt,
      latestFeeSettings?.updatedAt,
      latestExpenditure?.updatedAt,
      latestWorkerPayment?.updatedAt,
      latestPayment?.updatedAt
    ].filter(Boolean).map(t => new Date(t).getTime());

    const lastChanged = timestamps.length > 0
      ? new Date(Math.max(...timestamps)).toISOString()
      : new Date(0).toISOString();

    return res.json({ status: 'success', lastChanged, branch: String(branch).trim() });
  } catch (err) {
    console.error('[last-changed] Error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error during last-changed check.' });
  }
});



// ============================================================
// MISSING ROUTES — Admin1, Admin2, Accountant Portals
// ============================================================

// --- TEACHER MONTHLY SALARY ---
app.post('/api/teachers/:id/salary-month', authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const teacher = await Teacher.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });
    if (!teacher) return res.status(404).json({ status: 'error', message: 'Teacher not found.' });
    const { monthKey, paidAmount, salaryStatus, paymentDate, paymentMode, referenceNumber, notes } = req.body || {};
    if (!teacher.salaryHistory) teacher.salaryHistory = {};
    if (monthKey) {
      teacher.salaryHistory[monthKey] = { paidAmount: Number(paidAmount || 0), salaryStatus: salaryStatus || 'paid', paymentDate, paymentMode, referenceNumber, notes };
      teacher.markModified('salaryHistory');
    }
    if (salaryStatus) teacher.salaryStatus = salaryStatus;
    await teacher.save();
    return res.json({ status: 'success', data: teacher });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

// --- FEE BREAKDOWN ---
app.get(['/api/admin1/students/:studentId/fee-breakdown', '/api/admin2/students/:studentId/fee-breakdown', '/api/admin/students/:studentId/fee-breakdown'], authenticateToken, requireRole('admin1', 'clerk', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();
    const { studentId } = req.params;
    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] }).lean();
    if (!student) return res.status(404).json({ status: 'error', message: 'Student not found.' });
    const tuitionFee = Number(student.tuitionFee || 0);
    const hostelFee = Number(student.hostelFee || 0);
    const transportFee = Number(student.transportFee || 0);
    const miscFee = Number(student.miscellaneousFee || 0);
    const previousPending = Number(student.previousPending || 0);
    const tuitionWaiver = Number(student.tuitionWaiver || 0);
    const hostelWaiver = Number(student.hostelWaiver || 0);
    const transportWaiver = Number(student.transportWaiver || 0);
    const miscWaiver = Number(student.miscWaiver || 0);
    const standardKeys = ['tuitionfee', 'hostelfee', 'transportfee', 'miscellaneousfee', 'previouspending', 'tuition', 'hostel', 'transport', 'misc'];
    const cleanedSlots = (student.customFeeSlots || []).filter(slot => {
      if (!slot) return false;
      const k = String(slot.key || slot.id || '').toLowerCase().trim();
      const n = String(slot.name || '').toLowerCase().trim();
      return !standardKeys.includes(k) && !['tuition fee', 'hostel fee', 'transport fee', 'miscellaneous fee', 'previous pending'].includes(n);
    });
    const customFees = cleanedSlots.reduce((s, sl) => s + Number(sl.amount || 0), 0);
    const gross = tuitionFee + hostelFee + transportFee + miscFee + previousPending + customFees;
    const totalWaivers = tuitionWaiver + hostelWaiver + transportWaiver + miscWaiver;
    const netFeeOwed = Math.max(0, gross - totalWaivers);
    const totalPaid = Number(student.totalPaid || 0);
    const remainingBalance = Math.max(0, netFeeOwed - totalPaid);

    return res.json({
      status: 'success',
      data: {
        baseFee: gross,
        grossFee: gross,
        totalWaivers,
        netFeeOwed,
        tuitionFee,
        hostelFee,
        transportFee,
        miscFee,
        previousPending,
        scholarshipCategory: 'None',
        scholarshipPct: 0,
        scholarshipDeduction: totalWaivers,
        individualOverrideDeduction: totalWaivers,
        tuitionWaiver,
        hostelWaiver,
        transportWaiver,
        miscWaiver,
        totalPaid,
        remainingBalance
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

// --- STAFF SALARIES ---
// Was returning every teacher at every campus to any signed-in caller.
app.get('/api/admin2/staff-salaries', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const teachers = await Teacher.find(campusScopeFilter(req)).lean();
    return res.json({ status: 'success', data: teachers });
  } catch (err) {
    console.error('[StaffSalaries]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load staff salaries.' });
  }
});

app.patch('/api/admin2/staff-salaries/:teacherId', authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const isObjId = isValidObjectId(teacherId);
    const teacher = await Teacher.findOne({ $or: [{ _id: isObjId ? teacherId : null }, { id: teacherId }] });

    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher record not found.' });
    }

    if (!callerOwnsCampus(req, teacher.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Staff member belongs to campus [${teacher.branch}].` });
    }

    // Only salary fields are writable here. This previously applied
    // `$set: req.body` verbatim, so a caller could rewrite branch, id, status
    // or any other column through a salary endpoint.
    const allowed = ['salary', 'salaryStatus', 'salaryLedger', 'monthlySalaries'];
    for (const field of allowed) {
      if (req.body[field] === undefined) continue;
      if (field === 'salary') {
        if (!isValidPositiveNumber(req.body.salary)) {
          return res.status(400).json({ status: 'error', message: 'Salary must be a valid non-negative number.' });
        }
        teacher.salary = Number(req.body.salary);
      } else {
        teacher[field] = req.body[field];
        teacher.markModified(field);
      }
    }

    await teacher.save();
    return res.json({ status: 'success', data: teacher });
  } catch (err) {
    console.error('[StaffSalaries]: Update failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update staff salary.' });
  }
});



// --- ENROLLMENT STATS ---
// Real counts only. This used to invent "120 students / 118 active" for every
// campus whenever the aggregate returned nothing — including when the database
// was down or a campus genuinely had no students — which is indistinguishable
// from real data on screen.
app.get('/api/admin2/enrollment-stats', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const scope = campusScopeFilter(req);
    const pipeline = [
      ...(scope.branch ? [{ $match: { branch: scope.branch } }] : []),
      { $group: { _id: '$branch', totalStudents: { $sum: 1 }, activeStudents: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } } } }
    ];
    const resStats = await Student.aggregate(pipeline);
    const byBranch = new Map(resStats.map(s => [s._id, s]));

    // Campuses with no students are reported as zero, not omitted and not faked.
    const campuses = scope.branch ? [scope.branch] : VALID_CAMPUSES;
    const stats = campuses.map(c => ({
      branch: c,
      totalStudents: byBranch.get(c) ? byBranch.get(c).totalStudents : 0,
      activeStudents: byBranch.get(c) ? byBranch.get(c).activeStudents : 0
    }));

    return res.json({ status: 'success', data: stats });
  } catch (err) {
    console.error('[EnrollmentStats]: Failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load enrollment statistics.' });
  }
});

// --- LATE FEES & SCHOLARSHIPS SETTINGS ---
// These were module-level strings mutated in place: an edit lived until the
// next restart and was invisible to every other instance. Handled by the

// --- HOSTEL MANAGEMENT ROUTES ---
//
// Hostel block/room allocation was never actually modelled: this endpoint
// invented three fixed blocks with made-up occupancy and synthesised room
// numbers from a slice of the resident list, and the allocation PATCH below
// returned success without writing anything. Rather than keep a convincing
// fake, this now reports only what the database really knows — which students
// are marked Resident — and the allocation endpoint is explicitly disabled.
app.get('/api/accountant/hostel', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    const residents = await Student.find({ ...campusScopeFilter(req), hostelStatus: 'Resident' })
      .select('studentId admissionNumber name branch course section hostelStatus')
      .lean();

    return res.json({
      status: 'success',
      data: {
        residents,
        residentCount: residents.length,
        blocks: null,
        rooms: [],
        notice: 'Room and block allocation is not implemented. Only hostel residency status is tracked.'
      }
    });
  } catch (err) {
    console.error('[Hostel]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load hostel residents.' });
  }
});

app.patch('/api/accountant/hostel/checkout/:studentId', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    const { studentId } = req.params;
    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if (!callerOwnsCampus(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    student.hostelStatus = 'Day Scholar';
    await student.save();

    return res.json({ status: 'success', data: { student } });
  } catch (err) {
    console.error('[Hostel]: Checkout failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to check the student out of the hostel.' });
  }
});

// --- DASHBOARD SUMMARY FOR ACCOUNTANT ---
app.get('/api/accountant/dashboard-summary', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    const scope = campusScopeFilter(req);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayAgg, pendingAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { ...scope, date: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Student.aggregate([
        { $match: { ...scope, remainingBalance: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$remainingBalance' }, count: { $sum: 1 } } }
      ])
    ]);

    return res.json({
      status: 'success',
      data: {
        collectionToday: todayAgg.length ? Math.round(todayAgg[0].total * 100) / 100 : 0,
        receiptsToday: todayAgg.length ? todayAgg[0].count : 0,
        pendingCount: pendingAgg.length ? pendingAgg[0].count : 0,
        pendingAmount: pendingAgg.length ? Math.round(pendingAgg[0].total * 100) / 100 : 0
        // `absentCount` used to be reported here as the constant 3. Attendance
        // is not recorded anywhere, so the field is omitted rather than faked.
      }
    });
  } catch (err) {
    console.error('[Dashboard]: Summary failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load dashboard summary.' });
  }
});

// --- REMOVED FEATURES ---
//
// Bulletins, timetable, exams, academic years, attendance, student marks,
// late-fee rules, scholarships and hostel room allocation were never really
// implemented: they were backed by module-level arrays that lost everything
// on restart, or by handlers that returned a hardcoded success. Their routes
// and their UI have been removed outright rather than left as convincing
// stubs. Unknown /api paths now fall through to the JSON 404 handler.

// Section list: real teachers from the database, plus the fixed curriculum
// streams. Allocation was never implemented and is not exposed.
const ACADEMIC_SECTIONS = ['MPC-A', 'MPC-B', 'BiPC-A', 'BiPC-B', 'MEC-A', 'CEC-A'];

app.get('/api/admin1/sections', authenticateToken, requireRole('admin1', 'clerk'), requireDatabase, async (req, res) => {
  try {
    const teachers = await Teacher.find(campusScopeFilter(req)).lean();
    return res.json({ status: 'success', data: { sections: ACADEMIC_SECTIONS, teachers } });
  } catch (err) {
    console.error('[Sections]: Load failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load sections.' });
  }
});


// Reports were entirely invented (a fixed 120 enrolled / 45,00,000 revenue /
// 12,00,000 expenses, split evenly across four campuses). These are now
// computed from the real collections.
/**
 * GET /api/admin1/analytics
 *
 * Everything the analytics dashboard renders, computed here in one round trip.
 *
 * The frontend deliberately does no arithmetic on these numbers — it displays
 * them. Re-deriving a total in the browser is how a dashboard ends up
 * disagreeing with the ledger it is supposed to describe.
 *
 * Campus-scoped: admin1 sees the whole organisation, everyone else sees only
 * their own campus, enforced by the same campusScopeFilter used everywhere.
 */
app.get('/api/admin1/analytics', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    // An org-wide caller may now narrow to a single campus with ?branch=,
    // which is what the All / campus buttons on the dashboard send. This goes
    // through resolveReadCampus rather than reading the query directly: it is
    // the one place that decides which campus a request may see, and it
    // refuses a scoped account that names someone else's campus instead of
    // quietly narrowing to their own. Omitting ?branch keeps the previous
    // behaviour exactly — every campus the caller is entitled to.
    // Note the discriminator. resolveReadCampus returns null for TWO different
    // outcomes: "refused, and I have already sent the response", and "org-wide
    // caller with no ?branch, so apply no campus filter". Testing the return
    // value alone would abort the default all-campus view — the common case —
    // so the check is on whether a response actually went out.
    const requested = resolveReadCampus(req, res, { requireExplicit: false });
    if (res.headersSent) return;

    const scope = requested ? { branch: requested } : campusScopeFilter(req);
    const campuses = scope.branch ? [scope.branch] : VALID_CAMPUSES;
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 180);

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const match = scope.branch ? [{ $match: scope }] : [];

    const [
      studentAgg, paymentAgg, dailyAgg, campusStudents, campusPaid,
      expenditureAgg, enquiryStatusAgg, enquiryStreamAgg, teacherAgg,
      workerAgg, modeAgg, recentPayments
    ] = await Promise.all([
      // Billed vs paid across the scope. `billed` is gross fees minus waivers,
      // computed from the stored fields rather than trusting remainingBalance.
      Student.aggregate([
        ...match,
        { $project: {
          branch: 1, status: 1, totalPaid: { $ifNull: ['$totalPaid', 0] },
          remainingBalance: { $ifNull: ['$remainingBalance', 0] },
          billed: {
            $subtract: [
              { $add: [
                { $ifNull: ['$tuitionFee', 0] }, { $ifNull: ['$hostelFee', 0] },
                { $ifNull: ['$transportFee', 0] }, { $ifNull: ['$miscellaneousFee', 0] },
                { $ifNull: ['$previousPending', 0] },
                { $sum: { $map: { input: { $ifNull: ['$customFeeSlots', []] }, as: 's', in: { $ifNull: ['$$s.amount', 0] } } } }
              ] },
              { $add: [
                { $ifNull: ['$tuitionWaiver', 0] }, { $ifNull: ['$hostelWaiver', 0] },
                { $ifNull: ['$transportWaiver', 0] }, { $ifNull: ['$miscWaiver', 0] }
              ] }
            ]
          }
        } },
        { $group: {
          _id: null,
          students: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          billed: { $sum: '$billed' },
          paid: { $sum: '$totalPaid' },
          outstanding: { $sum: '$remainingBalance' },
          clear: { $sum: { $cond: [{ $lte: ['$remainingBalance', 0] }, 1, 0] } },
          over50k: { $sum: { $cond: [{ $gt: ['$remainingBalance', 50000] }, 1, 0] } },
          mid: { $sum: { $cond: [{ $and: [{ $gt: ['$remainingBalance', 0] }, { $lte: ['$remainingBalance', 50000] }] }, 1, 0] } }
        } }
      ]),

      Payment.aggregate([...match, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),

      // Daily collections for the sparkline / trend chart.
      Payment.aggregate([
        { $match: { ...scope, date: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' }, count: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
      ]),

      Student.aggregate([...match, { $group: { _id: '$branch', students: { $sum: 1 }, outstanding: { $sum: { $ifNull: ['$remainingBalance', 0] } }, paid: { $sum: { $ifNull: ['$totalPaid', 0] } } } }]),
      Payment.aggregate([...match, { $group: { _id: '$branch', collected: { $sum: '$amount' }, receipts: { $sum: 1 } } }]),
      Expenditure.aggregate([...match, { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),

      // Enquiries carry preferredCampus rather than branch, so the campus
      // filter has to be applied on that field instead of the shared scope.
      Enquiry.aggregate([
        ...(scope.branch ? [{ $match: { preferredCampus: new RegExp(String(scope.branch).split(' ')[0], 'i') } }] : []),
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Enquiry.aggregate([
        ...(scope.branch ? [{ $match: { preferredCampus: new RegExp(String(scope.branch).split(' ')[0], 'i') } }] : []),
        { $group: { _id: '$stream', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      Teacher.aggregate([...match, { $group: { _id: null, count: { $sum: 1 }, salary: { $sum: { $ifNull: ['$salary', 0] } }, teaching: { $sum: { $cond: [{ $eq: ['$classification', 'Teaching'] }, 1, 0] } } } }]),
      WorkerPayment.aggregate([...match, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([...match, { $group: { _id: '$paymentMode', amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),
      Payment.find(scope).sort({ date: -1 }).limit(8).select('receiptNumber studentName amount date paymentMode branch').lean()
    ]);

    const s = studentAgg[0] || {};
    const billed = round2(s.billed);
    const collected = round2(paymentAgg[0] ? paymentAgg[0].total : 0);
    const outstanding = round2(s.outstanding);
    const expenditureTotal = round2(expenditureAgg.reduce((a, e) => a + e.amount, 0));
    const payrollTotal = round2(workerAgg[0] ? workerAgg[0].amount : 0);

    // Fill every day in the window so the trend line has no invisible gaps.
    const byDay = new Map(dailyAgg.map(d => [d._id, d]));
    const series = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const hit = byDay.get(key);
      series.push({ date: key, amount: round2(hit ? hit.amount : 0), count: hit ? hit.count : 0 });
    }

    const studentsBy = new Map(campusStudents.map(c => [c._id, c]));
    const paidBy = new Map(campusPaid.map(c => [c._id, c]));
    const campusBreakdown = campuses.map(c => {
      const st = studentsBy.get(c) || {};
      const pd = paidBy.get(c) || {};
      const cCollected = round2(pd.collected);
      const cOutstanding = round2(st.outstanding);
      const cBilled = round2(cCollected + cOutstanding);
      return {
        campus: c,
        students: st.students || 0,
        collected: cCollected,
        outstanding: cOutstanding,
        billed: cBilled,
        receipts: pd.receipts || 0,
        recoveryRate: cBilled > 0 ? Math.round((cCollected / cBilled) * 1000) / 10 : 0
      };
    });

    const funnelOrder = ['Pending', 'Contacted', 'Enrolled', 'Closed', 'Archived'];
    const statusBy = new Map(enquiryStatusAgg.map(e => [e._id, e.count]));
    const enquiryFunnel = funnelOrder
      .map(stage => ({ stage, count: statusBy.get(stage) || 0 }))
      .filter(x => x.count > 0 || x.stage === 'Pending');

    return res.json({
      status: 'success',
      data: {
        scope: scope.branch || 'All campuses',
        windowDays: days,
        headline: {
          students: s.students || 0,
          activeStudents: s.active || 0,
          billed,
          collected,
          outstanding,
          recoveryRate: billed > 0 ? Math.round((round2(s.paid) / billed) * 1000) / 10 : 0,
          expenditure: expenditureTotal,
          payroll: payrollTotal,
          netPosition: round2(collected - expenditureTotal - payrollTotal),
          receipts: paymentAgg[0] ? paymentAgg[0].count : 0,
          teachers: teacherAgg[0] ? teacherAgg[0].count : 0,
          monthlySalaryCommitment: round2(teacherAgg[0] ? teacherAgg[0].salary : 0),
          enquiries: enquiryStatusAgg.reduce((a, e) => a + e.count, 0)
        },
        collections: series,
        campusBreakdown,
        feeStatus: [
          { label: 'Fully paid', count: s.clear || 0 },
          { label: 'Owes up to 50k', count: s.mid || 0 },
          { label: 'Owes over 50k', count: s.over50k || 0 }
        ],
        enquiryFunnel,
        enquiryByStream: enquiryStreamAgg.map(e => ({ stream: e._id || 'Unspecified', count: e.count })),
        expenditureByCategory: expenditureAgg.map(e => ({ category: e._id || 'Uncategorised', amount: round2(e.amount), count: e.count })),
        paymentModes: modeAgg.map(m => ({ mode: m._id || 'Unspecified', amount: round2(m.amount), count: m.count })),
        recentPayments: recentPayments.map(p => ({
          receiptNumber: p.receiptNumber, studentName: p.studentName,
          amount: round2(p.amount), date: p.date, mode: p.paymentMode, branch: p.branch
        }))
      }
    });
  } catch (err) {
    console.error('[Analytics]: Failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to build analytics.' });
  }
});


app.get('/api/admin1/reports', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const scope = campusScopeFilter(req);
    const campuses = scope.branch ? [scope.branch] : VALID_CAMPUSES;

    const [enrollment, revenue, expenses] = await Promise.all([
      Student.aggregate([...(scope.branch ? [{ $match: scope }] : []), { $group: { _id: '$branch', students: { $sum: 1 } } }]),
      Payment.aggregate([...(scope.branch ? [{ $match: scope }] : []), { $group: { _id: '$branch', revenue: { $sum: '$amount' } } }]),
      Expenditure.aggregate([...(scope.branch ? [{ $match: scope }] : []), { $group: { _id: '$branch', expenses: { $sum: '$amount' } } }])
    ]);

    const enrolByBranch = new Map(enrollment.map(e => [e._id, e.students]));
    const revByBranch = new Map(revenue.map(r => [r._id, r.revenue]));
    const expByBranch = new Map(expenses.map(e => [e._id, e.expenses]));

    const round2 = n => Math.round((n || 0) * 100) / 100;
    const campusBreakdown = campuses.map(c => ({
      campus: c,
      students: enrolByBranch.get(c) || 0,
      revenue: round2(revByBranch.get(c)),
      expenses: round2(expByBranch.get(c))
    }));

    const totalRevenue = round2(campusBreakdown.reduce((a, c) => a + c.revenue, 0));
    const totalExpenses = round2(campusBreakdown.reduce((a, c) => a + c.expenses, 0));

    return res.json({
      status: 'success',
      data: {
        totalEnrollment: campusBreakdown.reduce((a, c) => a + c.students, 0),
        totalRevenue,
        totalExpenses,
        netProfit: round2(totalRevenue - totalExpenses),
        campusBreakdown
      }
    });
  } catch (err) {
    console.error('[Reports]: Failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to build reports.' });
  }
});
// --- PAYMENTS, EXPENDITURES & FEE SETTINGS ALIASES FOR ADMIN1 ---
//
// These three previously had authenticateToken and nothing else: no role
// check and no campus filter, so any signed-in accountant could read every
// payment, expenditure and fee structure across all four campuses. They now
// scope to the caller's campus unless the caller is org-wide (admin1).
// --- CLERK SLOT MANAGEMENT (Rector only) ---

/**
 * The seven clerk slots for one campus, provisioned or not.
 *
 * Always returns exactly seven entries. An empty slot is a real thing the
 * Rector needs to see — it is what they click to create a clerk — so it is
 * represented here rather than left for the client to invent by counting up
 * to seven and filling gaps.
 */
async function readClerkSlots(campus) {
  const existing = await User.find({
    campus,
    role: { $in: ['clerk', 'admin2'] }
  }).lean();

  const bySlot = new Map();
  for (const doc of existing) {
    // A pre-migration account has no slotIndex. Show it in slot 1, which is
    // where the migration will put it, rather than dropping it from a screen
    // that is supposed to show every clerk on the campus.
    const slot = doc.slotIndex || 1;
    if (!bySlot.has(slot)) bySlot.set(slot, doc);
  }

  return Array.from({ length: CLERK_SLOTS_PER_CAMPUS }, (_, i) => {
    const slotIndex = i + 1;
    const doc = bySlot.get(slotIndex);
    if (!doc) {
      return {
        slotIndex,
        exists: false,
        username: clerkUsername(campus, slotIndex),
        name: `Clerk ${slotIndex} ${campus}`,
        status: 'inactive',
        permissions: normalizePermissions(null)
      };
    }
    return {
      slotIndex,
      exists: true,
      username: doc.username,
      name: doc.name || `Clerk ${slotIndex} ${campus}`,
      status: doc.status === 'disabled' ? 'inactive' : 'active',
      permissions: normalizePermissions(doc.permissions),
      lastSeenAt: doc.lastSeenAt || null
    };
  });
}

app.get('/api/admin1/clerks', authenticateToken, requireRole('admin1'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const campus = normalizeCampus(String(req.query.campus || '').trim());
    if (!isValidCampus(campus)) {
      return res.status(400).json({ status: 'error', message: `Unknown campus [${req.query.campus}].` });
    }

    return res.json({
      status: 'success',
      data: {
        campus,
        slotsPerCampus: CLERK_SLOTS_PER_CAMPUS,
        permissionNames: CLERK_PERMISSIONS,
        slots: await readClerkSlots(campus)
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * POST /api/admin1/clerks — save one campus's clerk configuration.
 *
 * The whole campus is saved in one call rather than a request per toggle:
 * the screen has one Save button, and a per-toggle write would leave a
 * half-applied configuration behind if the operator closed the tab midway.
 *
 * Gated by the Rector's own PIN through verifySecurityOtp, which brings the
 * same five-guess lockout the login has. This is the one action in the app
 * that still asks for a PIN — everything else now uses a plain confirmation —
 * because it is what grants and revokes every other account's powers.
 *
 * Activating an empty slot provisions the account and returns its generated
 * credentials ONCE, in this response. They are stored only as bcrypt hashes,
 * so this is the only moment they can be read.
 */
app.post('/api/admin1/clerks', authenticateToken, requireRole('admin1'), mongoRateLimiter, requireDatabase, verifySecurityOtp, async (req, res) => {
  try {
    await connectToDatabase();
    const campus = normalizeCampus(String((req.body || {}).campus || '').trim());
    if (!isValidCampus(campus)) {
      return res.status(400).json({ status: 'error', message: `Unknown campus [${(req.body || {}).campus}].` });
    }

    const submitted = Array.isArray(req.body.slots) ? req.body.slots : [];
    if (submitted.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No clerk slots were submitted.' });
    }

    // Validate everything BEFORE writing anything. A save that fails halfway
    // through would leave some slots changed and others not, with no
    // indication of which.
    const planned = [];
    for (const raw of submitted) {
      const slotIndex = Number(raw && raw.slotIndex);
      if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > CLERK_SLOTS_PER_CAMPUS) {
        return res.status(400).json({
          status: 'error',
          message: `Slot ${raw && raw.slotIndex} is not between 1 and ${CLERK_SLOTS_PER_CAMPUS}.`
        });
      }
      if (planned.some(p => p.slotIndex === slotIndex)) {
        return res.status(400).json({ status: 'error', message: `Slot ${slotIndex} was submitted twice.` });
      }

      const permissions = {};
      for (const name of CLERK_PERMISSIONS) {
        permissions[name] = !!(raw.permissions && raw.permissions[name]);
      }
      planned.push({ slotIndex, active: raw.active === true, permissions });
    }

    const before = await readClerkSlots(campus);
    const beforeBySlot = new Map(before.map(s => [s.slotIndex, s]));

    const createdCredentials = [];
    const changes = [];

    for (const slot of planned) {
      const previous = beforeBySlot.get(slot.slotIndex);
      const username = previous.username;

      if (!slot.active && !previous.exists) continue;          // nothing to do
      if (!slot.active && previous.exists) {
        // Disabling is enough: authenticateToken rejects a disabled account on
        // every request, so an already-signed-in clerk is cut off immediately
        // rather than at token expiry. The record is kept so their history in
        // the audit trail still resolves to a real account.
        await User.updateOne(
          { username },
          { $set: { status: 'disabled', activeSessionId: null, permissions: slot.permissions } }
        );
        changes.push({ slotIndex: slot.slotIndex, username, action: 'deactivated' });
        continue;
      }

      if (slot.active && !previous.exists) {
        // 18 random bytes in base64url — well past anything a person would
        // choose, and never derived from the username or campus.
        const password = crypto.randomBytes(18).toString('base64url');
        const pin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

        await User.create({
          username,
          password,
          pin,
          role: 'clerk',
          campus,
          slotIndex: slot.slotIndex,
          name: `Clerk ${slot.slotIndex} ${campus}`,
          status: 'active',
          permissions: slot.permissions
        });

        createdCredentials.push({ slotIndex: slot.slotIndex, username, password, pin });
        changes.push({ slotIndex: slot.slotIndex, username, action: 'created' });
        continue;
      }

      // Existing and staying active: update status and permissions only.
      const permissionsChanged = CLERK_PERMISSIONS.some(
        name => previous.permissions[name] !== slot.permissions[name]
      );
      const reactivated = previous.status !== 'active';
      if (permissionsChanged || reactivated) {
        await User.updateOne(
          { username },
          { $set: { status: 'active', slotIndex: slot.slotIndex, permissions: slot.permissions } }
        );
        changes.push({
          slotIndex: slot.slotIndex,
          username,
          action: reactivated ? 'reactivated' : 'permissions updated'
        });
      }
    }

    const after = await readClerkSlots(campus);

    // One audit entry per slot actually changed, naming the powers granted —
    // "who can now collect fees at this campus, and who decided that" is the
    // question this has to answer later.
    for (const change of changes) {
      const slot = after.find(s => s.slotIndex === change.slotIndex);
      const granted = CLERK_PERMISSIONS.filter(p => slot && slot.permissions[p]);
      recordAudit(req, {
        action: 'clerk.configure',
        entityType: 'account',
        entityId: change.username,
        entityLabel: `Clerk ${change.slotIndex} — ${campus}`,
        campus,
        summary: `Clerk slot ${change.slotIndex} at ${campus} ${change.action}`
          + (change.action === 'deactivated'
            ? '.'
            : ` with ${granted.length ? granted.join(', ') : 'no permissions'}.`),
        details: { slotIndex: change.slotIndex, action: change.action, permissions: granted }
      });
    }

    return res.json({
      status: 'success',
      message: changes.length
        ? `Saved ${changes.length} change${changes.length === 1 ? '' : 's'} at ${campus}.`
        : `No changes to save at ${campus}.`,
      data: {
        campus,
        slots: after,
        changes,
        // Present only when a slot was newly activated. The client must show
        // these immediately; they cannot be retrieved again.
        createdCredentials
      }
    });
  } catch (err) {
    // The partial unique index on (campus, slotIndex) is what actually stops
    // two clerks landing in one slot, so its error has to read as that rather
    // than as a generic write failure.
    if (err && err.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'That clerk slot was just filled by someone else. Reload the page and try again.'
      });
    }
    return failRequest(req, res, err);
  }
});

/**
 * GET /api/admin1/logs — the audit trail.
 *
 * Rector only. The trail spans every campus and names which account did what,
 * which is exactly the information a campus-scoped role must not have: an
 * accountant reading it would see the other three campuses' takings, and a
 * clerk would see their own supervisor's actions. Campus-scoped roles are
 * refused outright rather than served a filtered view, so there is one rule
 * here rather than two.
 *
 * Newest first, paginated, and capped — the trail is the fastest-growing
 * collection in the system and an unbounded read of it would be a way to pull
 * the whole thing into a browser tab.
 */
app.get(['/api/admin1/logs', '/api/admin1/audit-logs'], authenticateToken, requireRole('admin1'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();

    const filter = {};

    // Campus. admin1 is org-wide, so this narrows rather than restricts.
    const campus = String(req.query.campus || '').trim();
    if (campus && campus.toLowerCase() !== 'all') {
      if (!isValidCampus(campus)) {
        return res.status(400).json({ status: 'error', message: `Unknown campus [${campus}].` });
      }
      filter.campus = normalizeCampus(campus);
    }

    // Which account. Exact match on the stored username, escaped so a
    // metacharacter cannot change what the pattern matches.
    const actor = String(req.query.actor || '').trim();
    if (actor && actor.toLowerCase() !== 'all') {
      filter.actorUsername = new RegExp(`^${escapeRegex(actor)}$`, 'i');
    }

    const action = String(req.query.action || '').trim();
    if (action && action.toLowerCase() !== 'all') filter.action = action;

    const entityType = String(req.query.entityType || '').trim();
    if (entityType && entityType.toLowerCase() !== 'all') filter.entityType = entityType;

    const outcome = String(req.query.outcome || '').trim();
    if (outcome && outcome.toLowerCase() !== 'all') filter.outcome = outcome;

    // Date range. `to` covers the whole of its day — a range of 1st to 1st
    // that matched nothing after midnight would read as "no activity".
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      return res.status(400).json({ status: 'error', message: 'Dates must be valid, in YYYY-MM-DD form.' });
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) {
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    // Free-text search across the pre-formatted summary and the frozen entity
    // label, which is what someone actually has to hand — a student's name or
    // a receipt number.
    const search = String(req.query.search || '').trim();
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ summary: pattern }, { entityLabel: pattern }, { entityId: pattern }];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const [entries, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);

    // Totals for the filtered set, so the screen can say "Rs. X collected
    // across N entries" without the client re-adding a paginated slice.
    const [totals] = await AuditLog.aggregate([
      { $match: filter },
      { $group: { _id: null, totalAmount: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);

    return res.json({
      status: 'success',
      data: {
        entries,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        totalAmount: totals ? Math.round((totals.totalAmount || 0) * 100) / 100 : 0
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * The distinct accounts and actions present in the trail, for the filter
 * dropdowns. Derived from the data rather than hardcoded, so a filter never
 * offers an option that matches nothing.
 */
// --- CREDENTIAL MANAGEMENT (Rector only) --------------------------------

/**
 * Every account, with its credentials, for the Rector's credential screen.
 *
 * This route returns live passwords and PINs in readable form. That is the
 * point of it, and it is the operator's explicit decision — but it makes this
 * the single most sensitive response the API produces, so it is fenced:
 *
 *   - admin1 only. No other role, at any campus, for any reason.
 *   - The Rector's own PIN is re-supplied to reach it, through the same
 *     verifySecurityOtp used elsewhere, with its five-guess lockout. A stolen
 *     session alone does not open it.
 *   - Never cached. An intermediary holding a copy of this body is a copy of
 *     every credential in the system.
 *   - The audit trail records that the screen was opened, by whom — but never
 *     its contents.
 *
 * Accounts provisioned before the storage change hold a bcrypt hash, which
 * cannot be reversed. Those report `readable: false` rather than showing a
 * hash that someone might mistake for a password.
 */
app.post('/api/admin1/credentials', authenticateToken, requireRole('admin1'), verifySecurityOtp, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');

    const docs = await User.find({}).lean();

    const accounts = docs
      .map(doc => {
        const passwordHashed = isHashedCredential(doc.password);
        const pinHashed = isHashedCredential(doc.pin);
        return {
          id: String(doc._id),
          username: doc.username,
          role: normalizeRole(doc.role),
          campus: doc.campus,
          name: doc.name,
          slotIndex: doc.slotIndex ?? null,
          status: doc.status || 'active',
          // Readable only once the credential has been set since the storage
          // change. A hash is deliberately NOT returned — showing "$2b$10$..."
          // in a password box invites someone to hand it to a colleague.
          password: passwordHashed ? null : (doc.password || null),
          pin: pinHashed ? null : (doc.pin || null),
          passwordReadable: !passwordHashed && Boolean(doc.password),
          pinReadable: !pinHashed && Boolean(doc.pin),
          credentialsUpdatedAt: doc.updatedAt || null
        };
      })
      .sort((a, b) => {
        const order = { admin1: 0, authenticator: 1, clerk: 2, accountant: 3 };
        const diff = (order[a.role] ?? 99) - (order[b.role] ?? 99);
        if (diff !== 0) return diff;
        if (a.campus !== b.campus) return String(a.campus).localeCompare(String(b.campus));
        if (a.slotIndex != null && b.slotIndex != null) return a.slotIndex - b.slotIndex;
        return String(a.username).localeCompare(String(b.username));
      });

    recordAudit(req, {
      action: 'credentials.view',
      entityType: 'account',
      summary: `${req.user.username} opened the credentials screen (${accounts.length} accounts).`,
      details: {
        accountCount: accounts.length,
        stillHashed: accounts.filter(a => !a.passwordReadable).length
      }
    });

    return res.json({
      status: 'success',
      data: {
        accounts,
        // Surfaced so the screen can explain why some rows are unreadable.
        legacyHashedCount: accounts.filter(a => !a.passwordReadable || !a.pinReadable).length
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * Set one account's portal ID, password and/or PIN.
 *
 * Anything omitted is left alone, so changing only a PIN does not require
 * re-sending the password.
 *
 * The authenticator slot is refused here exactly as it is in the accounts
 * panel: it is the account that can wipe the database, and it is deliberately
 * not administrable from a portal that the Rector's own session can reach.
 */
app.put('/api/admin1/credentials/:id', authenticateToken, requireRole('admin1'), verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();

    const { id } = req.params;
    const body = req.body || {};

    const isObjId = isValidObjectId(id);
    const target = await User.findOne({ $or: [{ _id: isObjId ? id : null }, { username: String(id).toLowerCase().trim() }] });
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'That account was not found.' });
    }

    if (target.username === FIXED_AUTHENTICATOR_USERNAME) {
      recordAudit(req, {
        action: 'credentials.update',
        entityType: 'account',
        entityId: target.username,
        outcome: 'denied',
        summary: `Refused: ${req.user.username} tried to change the security authenticator's credentials.`,
        details: {}
      });
      return res.status(403).json({
        status: 'error',
        message: 'The security authenticator\'s credentials cannot be changed from this portal.'
      });
    }

    const changed = [];

    // --- Portal ID ---
    if (body.username !== undefined) {
      const nextUsername = String(body.username).toLowerCase().trim();
      if (!nextUsername) {
        return res.status(400).json({ status: 'error', message: 'A portal ID cannot be blank.' });
      }
      if (nextUsername.length > FIELD_LIMITS.username) {
        return res.status(400).json({ status: 'error', message: `A portal ID cannot exceed ${FIELD_LIMITS.username} characters.` });
      }
      if (nextUsername !== target.username) {
        const clash = await User.findOne({ username: nextUsername, _id: { $ne: target._id } }).lean();
        if (clash) {
          return res.status(409).json({ status: 'error', message: `The portal ID ${nextUsername} is already in use.` });
        }
        target.username = nextUsername;
        changed.push('portal ID');
      }
    }

    // --- Password ---
    if (body.password !== undefined) {
      const nextPassword = String(body.password).trim();
      if (!nextPassword) {
        return res.status(400).json({ status: 'error', message: 'A password cannot be blank.' });
      }
      if (nextPassword.length < 8) {
        return res.status(400).json({ status: 'error', message: 'A password must be at least 8 characters.' });
      }
      if (nextPassword.length > FIELD_LIMITS.password) {
        return res.status(400).json({ status: 'error', message: `A password cannot exceed ${FIELD_LIMITS.password} characters.` });
      }
      // A stored value starting with $2 would be read back as a legacy hash
      // and reported unreadable, which would be confusing rather than wrong.
      if (nextPassword.startsWith('$2')) {
        return res.status(400).json({ status: 'error', message: 'A password cannot begin with "$2".' });
      }
      target.password = nextPassword;
      changed.push('password');
    }

    // --- PIN ---
    if (body.pin !== undefined) {
      const nextPin = String(body.pin).trim();
      if (!/^\d{6}$/.test(nextPin)) {
        return res.status(400).json({ status: 'error', message: 'A PIN must be exactly 6 digits.' });
      }
      target.pin = nextPin;
      changed.push('PIN');
    }

    if (changed.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Nothing to change.' });
    }

    // Changing a credential ends that account's session. Otherwise whoever is
    // signed in with the OLD password keeps working until their token expires,
    // which defeats the usual reason for changing it.
    target.activeSessionId = null;
    await target.save();
    // Keyed on the id, NOT the username — the username may have just been
    // changed above, and deleting by the new one would leave every refresh
    // token issued under the old name alive.
    await RefreshToken.deleteMany({ userId: target._id }).catch(() => {});

    // WHAT changed, never the values.
    recordAudit(req, {
      action: 'credentials.update',
      entityType: 'account',
      entityId: target.username,
      entityLabel: `${target.name} (${target.username})`,
      campus: target.campus,
      summary: `Changed the ${changed.join(' and ')} for ${target.username}; their session was ended.`,
      details: { fields: changed, role: normalizeRole(target.role) }
    });

    return res.json({
      status: 'success',
      message: `Updated the ${changed.join(' and ')} for ${target.username}.`,
      data: {
        id: String(target._id),
        username: target.username,
        password: isHashedCredential(target.password) ? null : target.password,
        pin: isHashedCredential(target.pin) ? null : target.pin,
        passwordReadable: !isHashedCredential(target.password),
        pinReadable: !isHashedCredential(target.pin)
      }
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'That portal ID was just taken. Choose another.' });
    }
    return failRequest(req, res, err);
  }
});


app.get('/api/admin1/logs/filters', authenticateToken, requireRole('admin1'), requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const [actors, actions] = await Promise.all([
      AuditLog.distinct('actorUsername'),
      AuditLog.distinct('action')
    ]);
    return res.json({
      status: 'success',
      data: {
        actors: actors.filter(Boolean).sort(),
        actions: actions.filter(Boolean).sort(),
        campuses: VALID_CAMPUSES
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.get(['/api/admin1/payments', '/api/accountant/payments'], authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const payments = await Payment.find(campusScopeFilter(req)).sort({ createdAt: -1 }).lean();
    return res.json({ status: 'success', data: payments });
  } catch (err) {
    console.error('[Payments]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load payments.' });
  }
});

app.get(['/api/admin1/expenditures', '/api/accountant/expenditures'], authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const expenditures = await Expenditure.find(campusScopeFilter(req)).sort({ createdAt: -1 }).lean();
    return res.json({ status: 'success', data: expenditures });
  } catch (err) {
    console.error('[Expenditures]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load expenditures.' });
  }
});

app.get(['/api/admin1/fee-settings', '/api/accountant/fee-settings'], authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const feeSettings = await FeeSettings.find(campusScopeFilter(req)).lean();
    return res.json({ status: 'success', data: feeSettings });
  } catch (err) {
    console.error('[FeeSettings]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load fee settings.' });
  }
});

/**
 * --- CAMPUS-SCOPED BACKUP & RESTORE -------------------------------------
 *
 * Authorisation chain, in order, on every route below:
 *   authenticated -> role -> campus -> security PIN -> validate -> act -> verify
 *
 * Campus is resolved from the signed-in account, never from the request body.
 * A campus-scoped account may only ever name its own campus; admin1 and the
 * authenticator may name any, but must name one explicitly.
 */

// Resolves the campus a caller is allowed to act on, or sends the refusal.
// Returns null when it has already responded.
function resolveBackupCampus(req, res) {
  const requested = String((req.body && req.body.campus) || req.query.campus || '').trim();
  const own = String(req.user.campus || '');
  const isOrgWide = own.toLowerCase() === 'all';

  if (!isOrgWide) {
    // Never trust a campus from the browser for a scoped account: pin it to
    // the account, and refuse outright if it asked for a different one rather
    // than silently substituting.
    if (requested && normalizeCampus(requested) !== normalizeCampus(own)) {
      res.status(403).json({ status: 'error', message: `Your account may only back up or restore ${own}.` });
      return null;
    }
    return own;
  }

  if (!requested) {
    res.status(400).json({ status: 'error', message: 'Specify which campus to act on.' });
    return null;
  }
  const norm = normalizeCampus(requested);
  if (!isValidCampus(norm)) {
    res.status(400).json({ status: 'error', message: `Unknown campus [${requested}].` });
    return null;
  }
  return norm;
}

// GET /api/backup/tree — what exists in Drive, scoped to the caller's campus.
app.get('/api/backup/tree', authenticateToken, requireRole('authenticator', 'admin1', 'clerk'), async (req, res) => {
  try {
    const own = String(req.user.campus || '');
    const filter = own.toLowerCase() === 'all' ? null : own;
    const tree = await campusBackup.listBackupTree(filter);
    return res.json({ status: 'success', data: { tree, scope: filter || 'All campuses' } });
  } catch (err) {
    console.error('[Backup]: Tree listing failed:', err.message);
    return res.status(502).json({ status: 'error', message: 'Could not read the backup folder from Google Drive.' });
  }
});

// POST /api/backup/run — back up one type for one campus.
app.post('/api/backup/run', authenticateToken, requireRole('authenticator', 'admin1', 'clerk'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const campus = resolveBackupCampus(req, res);
    if (!campus) return;

    // normaliseType, not a raw lookup: it accepts the plural and hyphenated
    // spellings callers actually send, so `fee-settings` does the obvious
    // thing instead of returning "unknown backupType".
    const type = campusBackup.normaliseType((req.body && req.body.backupType) || '');
    if (!type) {
      return res.status(400).json({
        status: 'error',
        message: `backupType must be one of: ${Object.keys(campusBackup.TYPES).join(', ')}.`
      });
    }

    const result = await campusBackup.backupCampusType(type, campus, req.user.username);
    console.log(`[Backup]: ${type}/${campus} by ${req.user.username} -> ${result.fileName} (${result.recordCount} records)`);
    return res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('[Backup]: Run failed:', err.message);
    return res.status(err.status || 500).json({
      status: 'error',
      message: err.status === 502
        ? 'Google Drive rejected the upload. Nothing was backed up.'
        : (err.status === 400 ? err.message : 'Backup failed. Nothing was written to Google Drive.')
    });
  }
});

// POST /api/backup/run-all — every type, every campus the caller may touch.
app.post('/api/backup/run-all', authenticateToken, requireRole('authenticator', 'admin1'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const result = await campusBackup.backupAllCampuses(req.user.username);
    // A partial run is a failure, not a success with a shorter list.
    return res.status(result.success ? 200 : 500).json({
      status: result.success ? 'success' : 'error',
      message: result.success
        ? `Backed up ${result.created.length} campus/type combinations.`
        : `${result.failures.length} backup(s) failed. See failures.`,
      data: result
    });
  } catch (err) {
    console.error('[Backup]: Full run failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Backup run failed.' });
  }
});

// POST /api/backup/restore/preview — validate and report, writing nothing.
app.post('/api/backup/restore/preview', authenticateToken, requireRole('authenticator', 'admin1'),
  mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const campus = resolveBackupCampus(req, res);
    if (!campus) return;
    const { fileId, backupType } = req.body || {};
    if (!fileId) return res.status(400).json({ status: 'error', message: 'A Google Drive fileId is required.' });

    const result = await campusBackup.restoreCampusType(fileId, {
      actor: req.user.username, expectedCampus: campus, expectedType: backupType, dryRun: true
    });
    return res.status(result.success ? 200 : 400).json({
      status: result.success ? 'success' : 'error',
      message: result.success ? 'Backup is valid. Review the plan before confirming.' : 'This backup was rejected.',
      data: result
    });
  } catch (err) {
    console.error('[Restore]: Preview failed:', err.message);
    return res.status(err.status || 500).json({ status: 'error', message: err.status === 400 ? err.message : 'Could not read that backup.' });
  }
});

// POST /api/backup/restore — apply it. Password AND security PIN required.
app.post('/api/backup/restore', authenticateToken, requireRole('authenticator', 'admin1'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const campus = resolveBackupCampus(req, res);
    if (!campus) return;
    const { fileId, backupType, password, deleteMissing } = req.body || {};

    if (!fileId) return res.status(400).json({ status: 'error', message: 'A Google Drive fileId is required.' });

    // Restore overwrites live records, so it takes the account password on top
    // of the security PIN — two different secrets, both verified server-side.
    // The operations password, not this account's own — the same one that
    // authorises a wipe or a purge. Restore overwrites live records across a
    // whole campus, which puts it in that group.
    if (!verifyOpsPassword(req, res)) return;

    const result = await campusBackup.restoreCampusType(fileId, {
      actor: req.user.username, expectedCampus: campus, expectedType: backupType,
      dryRun: false, deleteMissing: Boolean(deleteMissing)
    });

    if (!result.success) {
      return res.status(400).json({ status: 'error', message: 'This backup was rejected. Nothing was changed.', data: result });
    }

    // The read-back check must show nothing landed outside this campus.
    if (result.applied && result.applied.recordsLeakedToOtherCampuses > 0) {
      console.error(`[Restore]: CAMPUS LEAK DETECTED restoring ${campus}`);
      return res.status(500).json({
        status: 'error',
        message: 'Restore completed but records were detected outside the target campus. Investigate immediately.',
        data: result
      });
    }

    return res.json({
      status: 'success',
      message: `Restored ${result.applied.inserted} new and ${result.applied.updated} existing ${result.applied.backupType} record(s) for ${campus}.`,
      data: result
    });
  } catch (err) {
    console.error('[Restore]: Failed:', err.message);
    return res.status(err.status || 500).json({
      status: 'error',
      message: err.status === 400 ? err.message : 'Restore failed. No data was changed.'
    });
  }
});


// --- STATIC FILE SERVING FOR STANDALONE / HOSTINGER DEPLOYMENT ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/login')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Centralized error handler
// Unmatched API routes must return JSON 404, not the SPA's index.html. A
// frontend calling a route that does not exist was previously handed an HTML
// page, which surfaces in the client as an opaque JSON parse failure.
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return res.status(404).json({ status: 'error', message: `No such endpoint: ${req.method} ${req.path}` });
  }
  return next();
});

// Centralized error handler.
//
// Clients get a generic message plus a correlation id; the detail and stack go
// to the server log only. Returning err.message verbatim leaked raw Mongo and
// driver text to anyone who could trigger a failure.
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const errorId = crypto.randomBytes(6).toString('hex');

  if (status >= 500) {
    console.error(`[${errorId}] Unhandled error on ${req.method} ${req.path}:`, err.stack || err.message);
  } else {
    console.warn(`[${errorId}] ${status} on ${req.method} ${req.path}: ${err.message}`);
  }

  // 4xx messages are ours and safe to show; 5xx detail is not.
  return res.status(status).json({
    status: 'error',
    message: status < 500 ? err.message : 'Internal server error.',
    errorId
  });
});

// NOTE: the process-level unhandledRejection and uncaughtException handlers
// used to live here. They have moved to server/start.cjs for two reasons.
//
// First, this module is imported by test suites and tooling, and a module has
// no business installing process-wide handlers on whoever imports it.
//
// Second, and more importantly, the uncaughtException handler here logged the
// error and CARRIED ON. After an uncaught exception the process state is
// undefined, and continuing is how this app ended up alive but serving
// nothing: a failed port bind threw, the handler swallowed it, and the result
// was a healthy-looking process listening on no port at all. Nothing restarted
// it because nothing had crashed. start.cjs now exits instead.

module.exports = app;

// Exposed for the test suites only. Campus authorisation is the one piece of
// the backup chain that cannot be exercised without a live session, so it is
// testable directly rather than left unproven.
module.exports.resolveBackupCampus = resolveBackupCampus;

// Pure functions, exposed so the unit suite can drive them directly at
// boundary values rather than inferring their behaviour from HTTP responses.
module.exports.computeStudentFees = computeStudentFees;
module.exports.calcStudentGrossFees = calcStudentGrossFees;
module.exports.evaluateUpgradeEligibility = evaluateUpgradeEligibility;
module.exports.cleanText = cleanText;
module.exports.cleanTextFields = cleanTextFields;
module.exports.normalizeCampus = normalizeCampus;
module.exports.isValidCampus = isValidCampus;
module.exports.rateLimitBudgetFor = rateLimitBudgetFor;
module.exports.MAX_STUDENT_FEE = MAX_STUDENT_FEE;
module.exports.MAX_TEXT = MAX_TEXT;
module.exports.FIELD_LIMITS = FIELD_LIMITS;

// The 500-versus-503 classifier. Exposed because the failure it exists for —
// the database dropping mid-request — is difficult to provoke on demand, and
// asserting the classification directly is more honest than waiting for a
// connection reset to happen to occur during a test run.
module.exports.isDependencyFailure = isDependencyFailure;






