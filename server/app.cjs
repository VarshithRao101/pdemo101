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
const Student = require('./models/Student.cjs');
const Teacher = require('./models/Teacher.cjs');
const FeeSettings = require('./models/FeeSettings.cjs');
const Expenditure = require('./models/Expenditure.cjs');
const WorkerPayment = require('./models/WorkerPayment.cjs');
const Payment = require('./models/Payment.cjs');
const Enquiry = require('./models/Enquiry.cjs');

const {
  generateAndUploadBackup,
  wipeDataCollections,
  restoreBackupFromFile,
  getBackupLogs,
  getAllAvailableBackupFiles
} = require('./services/backupService.cjs');
const campusBackup = require('./services/campusBackupService.cjs');

const app = express();

// Security Headers via Helmet with Hardened Content Security Policy (CSP) Enabled (unsafe-eval removed)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));

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

// Valid campus branches
const VALID_CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];

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

function calcStudentGrossFees(tuitionFee, hostelFee, transportFee, miscellaneousFee, previousPending, customFeeSlots) {
  const customTotal = (Array.isArray(customFeeSlots) ? customFeeSlots : []).reduce((acc, slot) => acc + Number(slot.amount || 0), 0);
  return Number(tuitionFee || 0) + Number(hostelFee || 0) + Number(transportFee || 0) + Number(miscellaneousFee || 0) + Number(previousPending || 0) + customTotal;
}

// --- MANAGED PORTAL SLOTS ---
//
// The fixed set of accounts this system is allowed to have: one Rector, one
// security authenticator, one Dean per campus, one accountant per campus.
// Usernames, roles and campuses only — never credentials. Provisioning and
// rotation happen in scripts/rotateCredentials.cjs.
const defaultUsers = [
  { username: 'admin1', role: 'admin1', campus: 'All', name: 'Rector' },
  { username: '9059068384', role: 'authenticator', campus: 'All', name: 'Security Authenticator' },
  ...VALID_CAMPUSES.map(c => ({
    username: `admin2_${c.toLowerCase().replace(/\s+/g, '_')}`,
    role: 'admin2',
    campus: c,
    name: `Dean ${c}`
  })),
  ...VALID_CAMPUSES.map(c => ({
    username: `accountant_${c.toLowerCase().replace(/\s+/g, '_')}`,
    role: 'accountant',
    campus: c,
    name: `Accountant ${c}`
  }))
];

function safeBcryptCompare(input, hash) {
  if (!input || typeof input !== 'string' || !hash || typeof hash !== 'string') {
    return false;
  }
  try {
    return bcrypt.compareSync(input.trim(), hash.trim());
  } catch (err) {
    console.warn('⚠️ [Auth]: Bcrypt comparison notice:', err.message);
    return false;
  }
}


// NOTE: there is deliberately no in-source credential list here.
// Passwords and PINs exist only as bcrypt hashes in MongoDB. A previous
// revision kept a `defaultSeedUsers` array of plaintext passwords/PINs that
// `validateUserLoginCredentials` fell back to whenever the database lookup
// returned nothing — including when the database was merely unreachable —
// which made every account loggable-into with a credential committed to a
// public repository. Do not reintroduce a literal credential in this file
// for any reason, including seeding or local development.

// Username of the security authenticator slot. This is an identifier, not a
// secret: it marks the one account the management panel refuses to edit.
const FIXED_AUTHENTICATOR_USERNAME = '9059068384';
const MANAGED_PORTAL_ROLES = new Set(['admin1', 'admin2', 'accountant', 'authenticator']);
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
        role: doc.role,
        name: doc.name,
        campus: doc.campus,
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
        const roleOrder = { admin1: 0, authenticator: 1, admin2: 2, accountant: 3 };
        const roleDiff = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
        if (roleDiff !== 0) return roleDiff;
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
const AUTH_PATH_PATTERN = /\/(login|verify-credentials|force-login|refresh|wipe-database|restore-backup|reset-password)$/;

function rateLimitBudgetFor(path) {
  return AUTH_PATH_PATTERN.test(path) ? 10 : 120;
}

async function mongoRateLimiter(req, res, next) {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ip = String(rawIp).split(',')[0].trim();
  const key = `ratelimit_${req.path}_${ip}`;
  const now = new Date();
  const maxAttempts = rateLimitBudgetFor(req.path);

  try {
    await connectToDatabase();
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Rate limit store unreachable.');
    }

    // Single atomic upsert+increment. A read-then-write here would let two
    // concurrent requests both observe the pre-increment count and slip past
    // the limit together.
    const record = await RateLimit.findOneAndUpdate(
      { key, resetAt: { $gt: now } },
      { $inc: { count: 1 }, $setOnInsert: { key, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

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
    // Duplicate-key means a concurrent request created the window document
    // between our filter miss and our upsert. Count that as one attempt.
    if (err && err.code === 11000) {
      return next();
    }
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

  let dbUser = null;
  try {
    if (mongoose.Types.ObjectId.isValid(decoded.id)) {
      dbUser = await User.findById(decoded.id).select('activeSessionId status username role campus name');
    }
    if (!dbUser && decoded.username) {
      dbUser = await User.findOne({ username: resolveUsername(decoded.username) })
        .select('activeSessionId status username role campus name');
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

  // Authorisation decisions must read from the stored record, not from claims
  // baked into a token that may predate a role or campus change.
  req.user = {
    id: String(dbUser._id),
    username: dbUser.username,
    role: dbUser.role,
    campus: dbUser.campus,
    name: dbUser.name,
    sessionId: decoded.sessionId
  };

  return next();
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

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access forbidden. Insufficient permissions for this role.'
      });
    }

    next();
  };
}

// --- CAMPUS SCOPING HELPERS ---

// True when the signed-in account is entitled to act on `recordCampus`.
// admin1 (campus "All") is org-wide; everyone else is pinned to one campus.
function callerOwnsCampus(req, recordCampus) {
  if (!req.user) return false;
  if (String(req.user.campus || '').toLowerCase() === 'all') return true;
  return normalizeCampus(recordCampus) === normalizeCampus(req.user.campus);
}

// Mongo filter that limits a query to the caller's campus. Returns {} only for
// genuinely org-wide accounts, never as a fallback when campus is missing.
function campusScopeFilter(req) {
  if (String(req.user.campus || '').toLowerCase() === 'all') return {};
  return { branch: req.user.campus };
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

    const user = await User.findById(req.user.id).select('pin');
    if (!user || !user.pin || !safeBcryptCompare(supplied, user.pin)) {
      console.warn(`[Security]: Failed PIN confirmation by [${req.user.username}] for ${req.method} ${req.path}`);
      return res.status(403).json({
        status: 'error',
        message: 'Incorrect security PIN.',
        requiresSecurityPin: true
      });
    }

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
app.get(['/api/auth/me', '/auth/me', '/api/me'], authenticateToken, async (req, res) => {
  return res.json({
    status: 'success',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      campus: req.user.campus,
      name: req.user.name
    }
  });
});

app.post(['/api/auth/verify-credentials', '/auth/verify-credentials', '/api/verify-credentials'], mongoRateLimiter, async (req, res) => {
  try {
    const { username, identifier, password } = req.body || {};
    const user = await validateUserLoginCredentials(username || identifier, password);

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

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
async function issueSession(user, res) {
  const newSessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  // Persist the session before handing out a token. If this write fails the
  // token would reference a session the database does not know about, and
  // authenticateToken would reject every subsequent request — so a failure
  // here has to surface as a failed login, not a half-created session.
  user.activeSessionId = newSessionId;
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
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      campus: user.campus,
      name: user.name
    }
  });
}

// Source IP for audit lines. Behind Hostinger's edge the socket address is the
// proxy, so the forwarded header is the only view of the real client.
function clientIp(req) {
  const raw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  return String(raw).split(',')[0].trim();
}

async function handleLogin(req, res, label) {
  try {
    const { username, identifier, password, pin } = req.body || {};
    const attempted = String(username || identifier || '').trim().toLowerCase();
    const user = await validateUserLoginCredentials(username || identifier, password, pin);

    if (!user) {
      // Record who was targeted and from where. The access log alone only
      // showed "POST /api/auth/login 401", which cannot distinguish one
      // mistyped password from a credential-stuffing run against every
      // account. The password itself is never logged.
      console.warn(`[Auth]: FAILED ${label} for [${attempted || '(blank)'}] from ${clientIp(req)}`);
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    console.log(`[Auth]: ${label} succeeded for [${user.username}] (${user.role})`);
    return await issueSession(user, res);
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

app.get('/api/admin1/students', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), async (req, res) => {
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
    if ((req.user.role === 'admin2' || req.user.role === 'accountant') && req.user.campus && req.user.campus.toLowerCase() !== 'all') {
      filter.branch = req.user.campus;
    }
    const students = await Student.find(filter).sort({ createdAt: -1 });
    return res.json({ status: 'success', data: students });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

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
      name: { required: true, max: MAX_TEXT.short },
      admissionNumber: { required: true, max: 50 },
      fatherName: { max: MAX_TEXT.short }, motherName: { max: MAX_TEXT.short },
      course: { max: MAX_TEXT.short }, section: { max: MAX_TEXT.short },
      rollNumber: { max: 50 }, email: { max: MAX_TEXT.short },
      dob: { max: 50 }, address: { max: MAX_TEXT.long },
      previousSchool: { max: MAX_TEXT.medium }, previousBoard: { max: MAX_TEXT.short },
      mobile: { max: 20 }, parentMobile: { max: 20 }
    });
    if (text.error) {
      return res.status(400).json({ status: 'error', message: text.error });
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

    if (req.user.role === 'accountant' || req.user.role === 'admin2') {
      if (req.user.campus !== 'All' && targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({
          status: 'error',
          message: `Accountants can only add students to their assigned campus [${req.user.campus}].`
        });
      }
    }

    const existing = await Student.findOne({ admissionNumber: String(admissionNumber).trim() });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `Student with admission number [${admissionNumber}] already exists.`
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

    const randomPin = String(Math.floor(100000 + Math.random() * 900000));
    const studentId = `STU-${Date.now().toString().slice(-6)}`;

    // Use the validated, length-capped values rather than the raw body.
    const t = text.values;
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

    return res.status(201).json({
      status: 'success',
      data: newStudent,
      credential: {
        username: studentId,
        pin: randomPin
      }
    });
  } catch (err) {
    console.error('Error creating student:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database write failure.' });
  }
};

app.post('/api/admin1/students', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), mongoRateLimiter, createStudentHandler);
app.post('/api/admin/students', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), mongoRateLimiter, createStudentHandler);
app.post('/api/accountant/students', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), mongoRateLimiter, createStudentHandler);

app.patch(['/api/admin1/students/:id', '/api/admin2/students/:id', '/api/admin/students/:id', '/api/accountant/students/:id'], authenticateToken, requireRole('admin1', 'admin2', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
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
    const slotTotal = (student.customFeeSlots || []).reduce((a, s) => a + Number(s.amount || 0), 0);
    const gross = Number(student.tuitionFee || 0) + Number(student.hostelFee || 0)
      + Number(student.transportFee || 0) + Number(student.miscellaneousFee || 0)
      + Number(student.previousPending || 0) + slotTotal;
    const waivers = Number(student.tuitionWaiver || 0) + Number(student.hostelWaiver || 0)
      + Number(student.transportWaiver || 0) + Number(student.miscWaiver || 0);
    student.remainingBalance = Math.max(0, Math.round((gross - waivers - Number(student.totalPaid || 0)) * 100) / 100);

    await student.save();

    return res.json({ status: 'success', data: student });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
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

    if (!callerOwnsCampus(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    const label = `${student.name} (${student.admissionNumber || student.studentId})`;

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

app.delete('/api/admin1/students/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, requireDatabase, deleteStudentHandler);
app.delete('/api/admin/students/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, requireDatabase, deleteStudentHandler);
app.delete('/api/accountant/students/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, requireDatabase, deleteStudentHandler);


// --- FEE WAIVER ROUTE ---

app.patch(['/api/admin1/students/:studentId/fee-override', '/api/admin2/students/:studentId/fee-override', '/api/admin/students/:studentId/fee-override'], authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
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

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
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

    const totalCustomFees = cleanedSlots.reduce((acc, slot) => acc + Number(slot.amount || 0), 0);
    const grossFees = Number(student.tuitionFee || 0) + Number(student.hostelFee || 0) + Number(student.transportFee || 0) + Number(student.miscellaneousFee || 0) + Number(student.previousPending || 0) + totalCustomFees;

    // Fee cap enforcement on waiver override (gross fees cannot exceed cap regardless of waivers)
    if (grossFees > MAX_STUDENT_FEE) {
      return res.status(400).json({
        status: 'error',
        message: `Total fees (Rs. ${grossFees.toLocaleString('en-IN')}) exceed the maximum allowed per student (Rs. ${MAX_STUDENT_FEE.toLocaleString('en-IN')}).`
      });
    }

    const totalWaivers = student.tuitionWaiver + student.hostelWaiver + student.transportWaiver + student.miscWaiver;

    student.customFeeSlots = cleanedSlots;
    student.remainingBalance = Math.max(0, grossFees - totalWaivers - Number(student.totalPaid || 0));
    await student.save();

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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});


// --- FACULTY / TEACHER ROUTES ---

// GET Teachers list (Admin1 sees all or filtered by branch; Admin2 sees only their assigned campus)
app.get(['/api/admin1/teachers', '/api/admin2/teachers', '/api/admin/teachers'], authenticateToken, requireRole('admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    let filter = {};
    if (req.user.role === 'admin2') {
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// CREATE Teacher (Admin1 or Admin2; Requires Security OTP for Admin2 or optional; Admin2 campus locked)
app.post(['/api/admin1/teachers', '/api/admin2/teachers', '/api/admin/teachers'], authenticateToken, requireRole('admin1', 'admin2'), mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    let { id, name, subject, salary = 0, mobile, email, branch, classification = 'Teaching', role = 'Senior Lecturer' } = req.body || {};

    if (req.user.role === 'admin2' && req.user.campus && req.user.campus !== 'All') {
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

    if (!isValidPositiveNumber(salary)) {
      return res.status(400).json({ status: 'error', message: 'Salary must be a valid non-negative number.' });
    }

    // Mobile validation for teacher (optional but must be valid if provided)
    if (mobile && mobile !== '') {
      const teacherMobileDigits = String(mobile).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(teacherMobileDigits)) {
        return res.status(400).json({ status: 'error', message: 'Mobile number must be exactly 10 digits.' });
      }
    }

    const existing = await Teacher.findOne({ id: String(id).trim() });
    if (existing) {
      return res.status(409).json({ status: 'error', message: `Teacher with ID [${id}] already exists.` });
    }

    const teacher = await Teacher.create({
      id: String(id).trim(),
      name: String(name).trim(),
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

    return res.status(201).json({ status: 'success', data: teacher });
  } catch (err) {
    console.error('[Teachers]: Create failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database write failure.' });
  }
});

// UPDATE Teacher
app.patch(['/api/admin1/teachers/:id', '/api/admin2/teachers/:id', '/api/admin/teachers/:id'], authenticateToken, requireRole('admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const teacher = await Teacher.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher record not found.' });
    }

    if (req.user.role === 'admin2' && String(teacher.branch || '').toLowerCase().trim() !== String(req.user.campus || '').toLowerCase().trim()) {
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

    return res.json({ status: 'success', data: teacher });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// DELETE Teacher (Requires Security OTP; Campus Isolation for Admin2)
app.delete(['/api/admin1/teachers/:id', '/api/admin2/teachers/:id', '/api/admin/teachers/:id'], authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const teacher = await Teacher.findOne(query);
    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher record not found.' });
    }

    if (req.user.role === 'admin2' && String(teacher.branch || '').toLowerCase().trim() !== String(req.user.campus || '').toLowerCase().trim()) {
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

    return res.json({ status: 'success', message: `Teacher ${teacher.name} permanently deleted.` });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// 12-MONTH SALARY LEDGER & YEAR-LOCK PAYMENTS ROUTE
app.post(['/api/admin1/teachers/:id/salary-month', '/api/admin2/teachers/:id/salary-month', '/api/admin/teachers/:id/salary'], authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const teacher = await Teacher.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher not found.' });
    }

    if (req.user.role === 'admin2' && String(teacher.branch || '').toLowerCase().trim() !== String(req.user.campus || '').toLowerCase().trim()) {
      return res.status(403).json({ status: 'error', message: `Campus Isolation Violation: Admin2 at [${req.user.campus}] cannot modify staff at [${teacher.branch}].` });
    }

    const { academicYear = '2026-2027', month, amountPaid, paymentMode = 'Bank Transfer', note = '' } = req.body || {};

    if (!month) {
      return res.status(400).json({ status: 'error', message: 'Month description is required.' });
    }

    const validMonths = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
    if (!validMonths.includes(month)) {
      return res.status(400).json({ status: 'error', message: `Invalid month [${month}]. Must be one of: ${validMonths.join(', ')}` });
    }

    // SERVER-ENFORCED YEAR LOCK LOGIC
    const startYear = parseInt(academicYear.split('-')[0], 10);
    if (isNaN(startYear)) {
      return res.status(400).json({ status: 'error', message: `Invalid academic year format [${academicYear}]. Example format: "2026-2027"` });
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

    return res.json({ status: 'success', message: `Salary payment recorded for ${teacher.name} - ${month} (${academicYear})`, data: teacher });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});


// --- FEE STRUCTURE ROUTES ---

app.get('/api/admin2/fee-settings', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;
    if (!branch || branch.toLowerCase() === 'all') {
      return res.status(400).json({ status: 'error', message: 'Specific campus branch query parameter required.' });
    }

    if (!isValidCampus(branch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${branch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

app.patch('/api/admin2/fee-settings', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { branch, tuition, hostel, transport, misc, isLocked } = req.body;
    const targetBranch = branch || req.user.campus;

    if (!isValidCampus(targetBranch)) {
      return res.status(400).json({ status: 'error', message: `Invalid campus branch [${targetBranch}]. Must be one of: ${VALID_CAMPUSES.join(', ')}` });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
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

    return res.json({ status: 'success', data: updated });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});


// --- EXPENDITURE ROUTES ---

const getExpendituresHandler = async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

app.get('/api/admin2/expenditure', authenticateToken, requireRole('admin1', 'admin2'), getExpendituresHandler);
app.get('/api/admin2/expenditures', authenticateToken, requireRole('admin1', 'admin2'), getExpendituresHandler);

app.post('/api/admin2/expenditure', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
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

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
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

    return res.status(201).json({ status: 'success', data: expenditure });
  } catch (err) {
    console.error('[Expenditures]: Create failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database write failure.' });
  }
});

app.patch('/api/admin2/expenditure/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const exp = await Expenditure.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!exp) {
      return res.status(404).json({ status: 'error', message: 'Expenditure record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
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

    return res.json({ status: 'success', data: exp });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

app.delete('/api/admin2/expenditure/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const exp = await Expenditure.findOne(query);
    if (!exp) {
      return res.status(404).json({ status: 'error', message: 'Expenditure record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (exp.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${exp.branch}].` });
      }
    }

    await Expenditure.deleteOne(query);
    const verify = await Expenditure.findOne(query);
    if (verify) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Expenditure record still exists.' });
    }

    return res.json({ status: 'success', message: 'Expenditure record permanently deleted.' });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});


// --- WORKER PAYMENT ROUTES ---

app.get('/api/admin2/worker-payments', authenticateToken, requireRole('admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

app.post('/api/admin2/worker-payments', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
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

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
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

    return res.status(201).json({ status: 'success', data: payment });
  } catch (err) {
    console.error('[WorkerPayments]: Create failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database write failure.' });
  }
});

app.patch('/api/admin2/worker-payments/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const wrk = await WorkerPayment.findOne({ $or: [{ _id: isObjId ? id : null }, { id }] });

    if (!wrk) {
      return res.status(404).json({ status: 'error', message: 'Worker payment record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

app.delete('/api/admin2/worker-payments/:id', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const query = { $or: [{ _id: isObjId ? id : null }, { id }] };

    const wrk = await WorkerPayment.findOne(query);
    if (!wrk) {
      return res.status(404).json({ status: 'error', message: 'Worker payment record not found.' });
    }

    if (req.user.role === 'admin2' && req.user.campus !== 'All') {
      if (wrk.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Record belongs to [${wrk.branch}].` });
      }
    }

    await WorkerPayment.deleteOne(query);
    const verify = await WorkerPayment.findOne(query);
    if (verify) {
      return res.status(500).json({ status: 'error', message: 'Verification failed. Worker payment record still exists.' });
    }

    return res.json({ status: 'success', message: 'Worker payment record permanently deleted.' });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});


// --- ACCOUNTANT STUDENT LOOKUP & BIO ROUTES ---

app.get('/api/accountant/students', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const branch = req.query.branch || req.user.campus;

    if (req.user.role === 'accountant') {
      if (branch && branch.toLowerCase() !== 'all' && branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({
          status: 'error',
          message: `Accountants can only view students in their assigned campus [${req.user.campus}].`
        });
      }
    }

    let filter = {};
    const targetCampus = (req.user.role === 'accountant') ? req.user.campus : (branch || req.user.campus);
    if (targetCampus && targetCampus.toLowerCase() !== 'all') {
      filter.branch = targetCampus;
    }

    const students = await Student.find(filter).sort({ name: 1 });
    return res.json({ status: 'success', data: students });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

app.get('/api/accountant/students/:id', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    return res.json({ status: 'success', data: student });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

app.patch('/api/accountant/students/:id/bio', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? id : null }, { studentId: id }, { admissionNumber: id }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
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
app.post('/api/accountant/students/:studentId/payments', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), mongoRateLimiter, requireDatabase, async (req, res) => {
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
    const updatedStudent = await Student.findOneAndUpdate(
      { _id: student._id },
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
      // The receipt exists but the ledger did not move. Say so loudly rather
      // than returning a success the books will not agree with.
      console.error(`[Payments]: Receipt ${receiptNumber} created but student ${student.studentId} balance update matched nothing.`);
      return res.status(500).json({
        status: 'error',
        message: `Payment ${receiptNumber} was recorded but the student balance could not be updated. Do not re-submit; contact an administrator.`
      });
    }

    // Append the receipt summary for the UI's quick list.
    await Student.updateOne({ _id: student._id }, {
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

app.get('/api/accountant/students/:studentId/payments', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), async (req, res) => {
  try {
    await connectToDatabase();
    const { studentId } = req.params;
    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if ((req.user.role === 'accountant' || req.user.role === 'admin2') && req.user.campus !== 'All') {
      if (student.branch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
      }
    }

    const payments = await Payment.find({ studentId: student.studentId }).sort({ date: -1 });
    return res.json({ status: 'success', data: payments });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});


// --- BACKUP, RESTORE & SYSTEM WIPE ROUTES ---

/**
 * GET /api/system/run-backup
 * Callable by Vercel cron (x-vercel-cron header) OR authenticated authenticator/admin1 user.
 */
app.get('/api/system/run-backup', mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const isVercelCron = req.headers['x-vercel-cron'] === '1' || req.headers['x-vercel-cron'] === 'true';

    let userRole = null;
    let username = 'vercel_cron';

    if (!isVercelCron) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

      if (!token) {
        return res.status(401).json({ status: 'error', message: 'Authentication required. Missing Bearer token or Vercel cron header.' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userRole = decoded.role;
        username = decoded.username;
      } catch {
        return res.status(401).json({ status: 'error', message: 'Invalid token.' });
      }

      if (userRole !== 'authenticator' && userRole !== 'admin1') {
        return res.status(403).json({ status: 'error', message: 'Access forbidden. Only authenticator or admin1 can manually trigger backup.' });
      }
    }

    const backupResult = await generateAndUploadBackup(username);
    return res.json({ status: 'success', data: backupResult });
  } catch (err) {
    console.error('Backup route error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Backup generation failed.' });
  }
});

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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
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
app.post('/api/authenticator/regenerate-keys', authenticateToken, requireRole('authenticator', 'admin1'), verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
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
        { $set: { pin: bcrypt.hashSync(newPin, 10) }, $unset: { pin_plaintext: '' } }
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
    const [totalStudents, totalTeachers, totalStaff] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      User.countDocuments()
    ]);
    return res.json({
      status: 'success',
      data: {
        totalStudents,
        totalTeachers,
        totalStaff,
        activeDevices: 4,
        activeSessions: [],
        activeSessionCount: 4,
        systemsActive: 4,
        systemsInactive: 0,
        portalSlotTotal: 4,
        lastBackupAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      }
    });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

app.post('/api/authenticator/accounts', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
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
      existing.password = bcrypt.hashSync(String(password).trim(), 10);
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
    const updated = sanitizeManagedAccount(existing);
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
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
      updateFields.password = bcrypt.hashSync(password.trim(), 10);
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
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

app.delete('/api/authenticator/accounts/:id', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  try {
    return res.status(405).json({ status: 'error', message: 'Deleting portal accounts is disabled. Update the existing fixed slots only.' });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * POST /api/authenticator/backup & POST /api/authenticator/restore-data
 */
app.post('/api/authenticator/backup', authenticateToken, requireRole('authenticator', 'admin1'), async (req, res) => {
  try {
    await connectToDatabase();
    const backupResult = await generateAndUploadBackup(req.user?.username || 'authenticator');
    return res.json({ status: 'success', message: 'Backup created successfully', data: backupResult });
  } catch (err) {
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});


/**
 * GET /api/authenticator/backup-codes & POST /api/authenticator/reset-password
 */
// Backup codes were generated on the fly from a counter (BC-7890, BC-7891, …)
// and stored nowhere, so they authenticated nothing. The reset flow below
// requires the caller's own security PIN instead, which is a real check.

app.post('/api/authenticator/reset-password', authenticateToken, requireRole('authenticator', 'admin1'), verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
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
      { $set: { password: bcrypt.hashSync(newPassword, 10), activeSessionId: null } }
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
app.delete('/api/authenticator/purge-student-faculty-data', authenticateToken, requireRole('authenticator'), verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    // Erases every student, teacher and payment. It previously required
    // nothing beyond the role, and silently reported success with zeros if the
    // database happened to be unreachable.
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// Claimed "Google Drive purged successfully" while never contacting Drive.

/**
 * POST /api/authenticator/wipe-database
 * Role authenticator ONLY. Requires real password check via bcrypt.
 * Automatically triggers a fresh encrypted backup to Google Drive FIRST before wiping.
 */
app.post('/api/authenticator/wipe-database', authenticateToken, requireRole('authenticator'), mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { password } = req.body || {};

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(401).json({ status: 'error', message: 'Authenticator password required for database wipe.' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'authenticator') {
      return res.status(403).json({ status: 'error', message: 'Only authenticator role can perform database wipe.' });
    }

    const isMatch = bcrypt.compareSync(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid authenticator password provided.' });
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

/**
 * POST /api/authenticator/restore-backup
 * Role authenticator ONLY. Requires real password check via bcrypt.
 * Downloads, decrypts, and restores data collections from specified Drive backup.
 */
app.post('/api/authenticator/restore-backup', authenticateToken, requireRole('authenticator'), mongoRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { password, fileId } = req.body || {};

    if (!password || typeof password !== 'string' || !password.trim() || !fileId) {
      return res.status(400).json({ status: 'error', message: 'Authenticator password and Drive backup fileId are required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'authenticator') {
      return res.status(403).json({ status: 'error', message: 'Only authenticator role can restore backups.' });
    }

    const isMatch = bcrypt.compareSync(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid authenticator password provided.' });
    }

    const restoreResult = await restoreBackupFromFile(fileId, user.username);
    return res.json({
      status: 'success',
      message: 'Database collections restored successfully from backup.',
      data: restoreResult
    });
  } catch (err) {
    console.error('Restore backup error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Database restoration failure.' });
  }
});


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
      studentName: { required: true, max: MAX_TEXT.short },
      preferredCampus: { required: true, max: MAX_TEXT.short },
      parentName: { max: MAX_TEXT.short },
      email: { max: MAX_TEXT.short },
      stream: { max: 50 },
      currentGrade: { max: 50 },
      notes: { max: MAX_TEXT.long },
      mobile: { required: true, max: 20 }
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
app.patch('/api/enquiries/:id', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), requireDatabase, async (req, res) => {
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

app.get('/api/enquiries', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), async (req, res) => {
  try {
    await connectToDatabase();
    const campus = req.query.branch || (req.user.role === 'admin1' ? 'All' : req.user.campus);
    const filter = (!campus || campus === 'All') ? {} : { preferredCampus: new RegExp(campus.split(' ')[0], 'i') };
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
app.post('/api/teachers/:id/salary-month', authenticateToken, requireRole('admin1', 'admin2'), async (req, res) => {
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// --- FEE BREAKDOWN ---
app.get(['/api/admin1/students/:studentId/fee-breakdown', '/api/admin2/students/:studentId/fee-breakdown', '/api/admin/students/:studentId/fee-breakdown'], authenticateToken, requireRole('admin1', 'admin2', 'accountant'), async (req, res) => {
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
    console.error(`[${req.method} ${req.path}]:`, err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// --- STAFF SALARIES ---
// Was returning every teacher at every campus to any signed-in caller.
app.get('/api/admin2/staff-salaries', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const teachers = await Teacher.find(campusScopeFilter(req)).lean();
    return res.json({ status: 'success', data: teachers });
  } catch (err) {
    console.error('[StaffSalaries]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load staff salaries.' });
  }
});

app.patch('/api/admin2/staff-salaries/:teacherId', authenticateToken, requireRole('admin1', 'admin2'), verifySecurityOtp, requireDatabase, async (req, res) => {
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
app.get('/api/admin2/enrollment-stats', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), requireDatabase, async (req, res) => {
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
app.get('/api/accountant/hostel', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), requireDatabase, async (req, res) => {
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

app.patch('/api/accountant/hostel/checkout/:studentId', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), requireDatabase, async (req, res) => {
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
app.get('/api/accountant/dashboard-summary', authenticateToken, requireRole('accountant', 'admin1', 'admin2'), requireDatabase, async (req, res) => {
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

app.get('/api/admin1/sections', authenticateToken, requireRole('admin1', 'admin2'), requireDatabase, async (req, res) => {
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
app.get('/api/admin1/analytics', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const scope = campusScopeFilter(req);
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


app.get('/api/admin1/reports', authenticateToken, requireRole('admin1', 'admin2', 'accountant'), requireDatabase, async (req, res) => {
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
app.get(['/api/admin1/payments', '/api/accountant/payments'], authenticateToken, requireRole('admin1', 'admin2', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const payments = await Payment.find(campusScopeFilter(req)).sort({ createdAt: -1 }).lean();
    return res.json({ status: 'success', data: payments });
  } catch (err) {
    console.error('[Payments]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load payments.' });
  }
});

app.get(['/api/admin1/expenditures', '/api/accountant/expenditures'], authenticateToken, requireRole('admin1', 'admin2', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const expenditures = await Expenditure.find(campusScopeFilter(req)).sort({ createdAt: -1 }).lean();
    return res.json({ status: 'success', data: expenditures });
  } catch (err) {
    console.error('[Expenditures]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load expenditures.' });
  }
});

app.get(['/api/admin1/fee-settings', '/api/accountant/fee-settings'], authenticateToken, requireRole('admin1', 'admin2', 'accountant'), requireDatabase, async (req, res) => {
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
app.get('/api/backup/tree', authenticateToken, requireRole('authenticator', 'admin1', 'admin2'), async (req, res) => {
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
app.post('/api/backup/run', authenticateToken, requireRole('authenticator', 'admin1', 'admin2'),
  verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const campus = resolveBackupCampus(req, res);
    if (!campus) return;

    const type = String((req.body && req.body.backupType) || '').trim().toLowerCase();
    if (!campusBackup.TYPES[type]) {
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
app.post('/api/backup/run-all', authenticateToken, requireRole('authenticator', 'admin1'),
  verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
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
app.post('/api/backup/restore', authenticateToken, requireRole('authenticator', 'admin1'),
  verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const campus = resolveBackupCampus(req, res);
    if (!campus) return;
    const { fileId, backupType, password, deleteMissing } = req.body || {};

    if (!fileId) return res.status(400).json({ status: 'error', message: 'A Google Drive fileId is required.' });

    // Restore overwrites live records, so it takes the account password on top
    // of the security PIN — two different secrets, both verified server-side.
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(401).json({ status: 'error', message: 'Your account password is required to restore a backup.' });
    }
    const actingUser = await User.findById(req.user.id).select('password');
    if (!actingUser || !safeBcryptCompare(password, actingUser.password)) {
      console.warn(`[Restore]: Wrong password from [${req.user.username}] for ${campus}`);
      return res.status(401).json({ status: 'error', message: 'Incorrect account password.' });
    }

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

// Last-resort crash containment for the persistent Hostinger process.
//
// An unhandled rejection anywhere in the codebase would otherwise terminate
// the Node process and take the whole site down until the host restarted it.
// Log loudly, keep serving: one bad request must not end the process for
// every other user.
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL-CONTAINED] Unhandled promise rejection:', reason && reason.stack ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL-CONTAINED] Uncaught exception:', err && err.stack ? err.stack : err);
});

module.exports = app;






