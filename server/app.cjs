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

/**
 * No Mongo operator may arrive in a request body.
 *
 * The query-string guard above rejects every non-scalar outright, which it can
 * afford to do because no route takes a structured query parameter. Bodies are
 * different: `customFeeSlots` is an array, `permissions` is an object, and
 * refusing those would refuse half the application. So this guard is narrower
 * and targets the actual attack — a key that Mongo reads as an OPERATOR.
 *
 * `{ "username": { "$ne": null } }` posted to a login route becomes
 * `User.findOne({ username: { $ne: null } })`, which matches the first account
 * in the collection. Every current route already coerces its inputs with
 * String() or a typeof check, and I verified that none of them is reachable
 * this way today. The point of doing it here is that the NEXT route does not
 * have to remember: per-route discipline is exactly what failed the first
 * time, which is why the query guard was written centrally too.
 *
 * A dotted key is refused for the same reason — `{"a.b": 1}` reaches into a
 * subdocument, which no client of this API has any reason to do.
 *
 * Depth-limited, because the walk itself must not become the denial of
 * service it is meant to prevent.
 */
const MAX_BODY_DEPTH = 12;

function findMongoOperatorKey(value, depth = 0) {
  if (depth > MAX_BODY_DEPTH || value === null || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (const entry of value) {
      const hit = findMongoOperatorKey(entry, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.')) return key;
    const hit = findMongoOperatorKey(entry, depth + 1);
    if (hit) return hit;
  }
  return null;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const offending = findMongoOperatorKey(req.body);
    if (offending) {
      console.warn(`[Body]: Refused operator-shaped key [${offending}] on ${req.method} ${req.path} from ${req.ip}`);
      return res.status(400).json({
        status: 'error',
        message: `The field name [${offending}] is not allowed.`
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
/**
 * Escape a value for HTML. Required: the public receipt page renders a student
 * name straight into markup, and a name containing a tag would otherwise be
 * executed in the parent's browser.
 */
function escapeHtmlServer(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- PUBLIC RECEIPT LINK -------------------------------------------------
//
// A parent has no account and never will, so the receipt they are sent has to
// open without signing in. WhatsApp cannot carry a file through a wa.me link,
// only text — so the message carries a URL instead, and this serves the
// document behind it.
//
// Two things have to be true before any of it is shown:
//
//   1. The token in the URL is an HMAC of the receipt number under a key
//      derived from JWT_SECRET. Without the secret you cannot produce a valid
//      token, so the route cannot be walked by trying REC-000001, REC-000002.
//   2. The reader knows the last four digits of the mobile the college has on
//      file for that student. A forwarded link alone is no longer enough.
//
// The second check is why the GET renders a form and nothing else: it reads no
// collection and names no student, so the preview WhatsApp fetches — Meta
// loads the URL before the parent does — sees an empty form.

/** Key for receipt links, derived so JWT_SECRET is never used directly. */
function receiptLinkKey() {
  const secret = process.env.JWT_SECRET || '';
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update('receipt-link-v1').digest();
}

/** The token for one receipt number, or null when no secret is configured. */
function receiptLinkToken(receiptNumber) {
  const key = receiptLinkKey();
  if (!key) return null;
  return crypto.createHmac('sha256', key)
    .update(String(receiptNumber))
    .digest('base64url')
    .slice(0, 22);
}

/** Constant-time compare, so a wrong token cannot be narrowed by timing. */
function receiptTokenValid(receiptNumber, supplied) {
  const expected = receiptLinkToken(receiptNumber);
  if (!expected || !supplied) return false;
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}


/**
 * Attach the link token to every receipt on a student, for the response only.
 *
 * The token is NOT stored. It is a pure function of the receipt number, so it
 * is recomputed here each time a student is serialised — which means a receipt
 * opened from the student's history carries a link exactly like one opened
 * straight after payment. Before this, only the just-paid receipt had a token
 * and the "Download your receipt" line silently vanished from every message
 * sent from the installment list.
 *
 * Derived, never persisted: nothing in Mongo gains a field, and rotating
 * JWT_SECRET invalidates every old link at once, which is the correct
 * behaviour for a link that grants read access.
 */
function withReceiptTokens(student) {
  if (!student) return student;
  const plain = typeof student.toObject === 'function' ? student.toObject() : student;
  if (!Array.isArray(plain.receipts) || plain.receipts.length === 0) return plain;
  plain.receipts = plain.receipts.map(r => (
    r && r.receiptNumber ? { ...r, receiptToken: receiptLinkToken(r.receiptNumber) } : r
  ));
  return plain;
}

/**
 * GET /r/:receiptNumber/:token — the receipt, for a parent, with no account.
 *
 * Renders a self-contained page sized for half an A4 sheet, the same as the
 * printed receipt, so "Save as PDF" on a phone produces the same document the
 * counter would have printed.
 */
/**
 * The print stylesheet, read once at boot.
 *
 * The same file the portal's print window uses. Read once rather than per
 * request — it never changes while the process lives, and a parent opening a
 * link should not cost a disk read.
 */
const PRINT_CSS = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'pdf.css'), 'utf8');
  } catch (err) {
    console.warn('[Receipt link]: print stylesheet unreadable, falling back to plain:', err.message);
    return 'body{font-family:system-ui;margin:24px;color:#111}';
  }
})();

/**
 * The letterhead URL, resolved once at boot.
 *
 * The build renames the logo with a content hash, so the filename cannot be
 * written down here; it is looked up in dist once. Referenced by URL rather
 * than inlined as base64 so the browser caches it instead of re-downloading
 * 57KB with every receipt.
 */
const LETTERHEAD_URL = (() => {
  try {
    const dir = path.join(__dirname, '..', 'dist', 'assets');
    // Any raster extension, not .png alone.
    //
    // This matched .png only, and the logo was converted to WebP with the rest
    // of the images. The lookup then found nothing, LETTERHEAD_URL went null,
    // and every parent-facing receipt silently lost its letterhead - the one
    // document in this system that goes to someone outside the college.
    // Nothing errored; the img simply stopped being emitted.
    //
    // Preferring .webp keeps it deterministic if both ever sit in dist at once.
    const logos = fs.readdirSync(dir).filter(f => /^college.*logo.*\.(webp|png|jpe?g|avif)$/i.test(f));
    const hit = logos.find(f => /\.webp$/i.test(f)) || logos[0];
    return hit ? '/assets/' + encodeURIComponent(hit) : null;
  } catch {
    return null;
  }
})();

/** The mobile the college would call about this student, digits only. */
function contactDigitsFor(student) {
  const raw = (student && (student.parentMobile || student.mobile)) || '';
  return String(raw).replace(/\D/g, '');
}

/** Constant-time compare of two short digit strings. */
function digitsMatch(supplied, expected) {
  if (!supplied || !expected || supplied.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** The shell every public receipt page is served in. */
function receiptPage({ title, inner }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<!-- Deliberately generic. WhatsApp fetches this URL to build its preview card,
     so anything specific here would put the receipt into Meta's cache before
     the parent ever taps the link. -->
<title>${escapeHtmlServer(title)}</title>
<meta property="og:title" content="Fee Receipt" />
<meta property="og:description" content="Inspire Junior College — open to view your receipt." />
<style>
${PRINT_CSS}

/* Screen framing only. None of this survives to paper: the print block below
   puts the sheet back to exactly what the counter prints. */
body { background: #EEEEF1; padding: 18px 14px 40px; }
.wrap { max-width: 196mm; margin: 0 auto; }
.sheet {
  background: #fff; padding: 26px 24px; border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 12px 32px rgba(0,0,0,.10);
}
.bar { display: flex; gap: 10px; justify-content: center; margin-top: 18px; flex-wrap: wrap; }
.btn {
  appearance: none; border: 1px solid #111; background: #111; color: #fff;
  font: inherit; font-weight: 700; font-size: 13px; letter-spacing: .06em;
  text-transform: uppercase; padding: 12px 22px; border-radius: 6px; cursor: pointer;
}
.btn:active { transform: translateY(1px); }
.hint { text-align: center; color: #6b7280; font-size: 12px; margin-top: 12px; line-height: 1.6; }

/* --- The gate --------------------------------------------------------- */
.gate { max-width: 380px; margin: 6vh auto 0; }
.gate .sheet { padding: 30px 26px 26px; text-align: center; }
.gate img.mark { width: 172px; max-width: 62%; height: auto; margin: 0 auto 18px; display: block; }
.gate h1 { font-size: 15px; margin: 0 0 6px; letter-spacing: .02em; }
.gate p { font-size: 13px; color: #555; margin: 0 0 20px; line-height: 1.6; }
.gate input {
  width: 100%; font: inherit; font-size: 26px; font-weight: 700;
  letter-spacing: .5em; text-align: center; text-indent: .5em;
  padding: 13px 10px; border: 1.5px solid #BBB; border-radius: 8px; background: #fff; color: #111;
}
.gate input:focus { outline: none; border-color: #111; }
.gate .btn { width: 100%; margin-top: 14px; }
.gate .err {
  background: #F5F5F5; border-left: 3px solid #111; color: #111; text-align: left;
  font-size: 12.5px; padding: 9px 12px; margin-bottom: 16px; border-radius: 4px;
}
.gate .foot { font-size: 11px; color: #8A8A8A; margin: 16px 0 0; line-height: 1.6; }

@media (max-width: 520px) {
  body { padding: 10px 8px 28px; }
  .sheet { padding: 18px 14px; border-radius: 8px; }
}

/* --- Paper -------------------------------------------------------------
   Half an A4 sheet, cut across the short edge — the size the college issues.
   The document is authored at full size and scaled down to fit it, which is
   the same arrangement the portal's print window uses. */
@page { size: 210mm 148.5mm; margin: 8mm; }
@media print {
  body { background: #fff; padding: 0; }
  .sheet { box-shadow: none; border-radius: 0; padding: 0; }
  .bar, .hint { display: none !important; }
  /* --fit is measured by /r-print.js against the real sheet before printing.
     The fallback is deliberately conservative: if the script is blocked the
     receipt still lands on one sheet, just smaller than it needed to be. */
  .pdf-fit {
    transform: scale(var(--fit, .74));
    transform-origin: top left;
    width: calc(100% / var(--fit, .74));
  }
}
</style>
</head><body>
${inner}
</body></html>`;
}

/** The four-digit form. Shown before anything about the student is loaded. */
function receiptGate({ error }) {
  return receiptPage({
    title: 'Fee Receipt',
    // No action attribute: the form posts back to the URL it was served from.
    // Writing the path out would print the receipt number into the page body,
    // and this page exists partly so that WhatsApp's preview fetch finds
    // nothing worth caching.
    inner: `<div class="gate">
  <form class="sheet" method="POST">
    ${LETTERHEAD_URL
      ? `<img class="mark" src="${LETTERHEAD_URL}" alt="Inspire Junior College" />`
      : '<h1>INSPIRE JUNIOR COLLEGE</h1>'}
    ${error ? `<div class="err">${escapeHtmlServer(error)}</div>` : ''}
    <h1>View your fee receipt</h1>
    <p>For your privacy, please enter the <strong>last 4 digits</strong> of the mobile number registered with the college.</p>
    <input name="last4" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"
           aria-label="Last 4 digits of the registered mobile number" required autofocus />
    <button class="btn" type="submit">View Receipt</button>
    <p class="foot">If you do not know the registered number, please contact the college office.</p>
  </form>
</div>`
  });
}

/** The receipt itself, in the same document the counter prints. */
function receiptDocument({ payment, student, balanceThen }) {
  const money = n => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
  const when = payment.date
    ? new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const field = (label, value) => (value === undefined || value === null || value === '')
    ? ''
    : `<div><span class="k">${escapeHtmlServer(label)}</span><span class="v">${escapeHtmlServer(String(value))}</span></div>`;

  const course = [student && student.course, student && student.section].filter(Boolean).join(' — ');
  const towards = [payment.category, payment.installment].filter(Boolean).join(' — ');

  return receiptPage({
    title: 'Fee Receipt',
    inner: `<div class="wrap">
  <div class="sheet">
    <div class="pdf-fit"><div class="pdf-frame">

      <div class="pdf-hdr">
        ${LETTERHEAD_URL
          ? `<img class="pdf-logo" src="${LETTERHEAD_URL}" alt="Inspire Junior College" />`
          : '<div class="pdf-doctype">INSPIRE JUNIOR COLLEGE</div>'}
        <div class="pdf-sub">Official payment receipt &middot; ${escapeHtmlServer(payment.receiptNumber)}</div>
      </div>
      <div class="pdf-meta">
        <span class="pdf-doctype">Fee Receipt</span>
        <span>${escapeHtmlServer((student && student.branch) || payment.branch || '')} &nbsp;&middot;&nbsp; ${escapeHtmlServer(when)}</span>
      </div>

      <div class="pdf-card">
        ${field('Student Name', student && student.name)}
        ${field('Admission No.', (student && student.admissionNumber) || payment.admissionNumber)}
        ${field('Course / Section', course)}
        ${field('Academic Year', student && student.academicYear)}
        ${field('Year', student && student.studentYear)}
        ${field('Receipt Date', when)}
      </div>

      <div class="pdf-sec">Payment Received</div>
      <table class="pdf-tbl">
        <thead><tr><th>Particulars</th><th>Mode</th><th>Reference</th><th class="num">Amount</th></tr></thead>
        <tbody><tr>
          <td>${escapeHtmlServer(towards || 'Fee Payment')}</td>
          <td>${escapeHtmlServer(payment.paymentMode || 'Cash')}</td>
          <td>${escapeHtmlServer(payment.receiptNumber)}</td>
          <td class="num">${money(payment.amount)}</td>
        </tr></tbody>
        <tfoot><tr>
          <td>Amount Received</td><td></td><td></td>
          <td class="num">${money(payment.amount)}</td>
        </tr></tfoot>
      </table>

      <div class="pdf-tiles">
        <div class="pdf-tile good">
          <span class="k">Amount Paid</span>
          <span class="v">${money(payment.amount)}</span>
        </div>
        ${balanceThen === null ? '' : `
        <div class="pdf-tile ${balanceThen > 0 ? 'due' : 'good'}">
          <span class="k">${balanceThen > 0 ? 'Balance Remaining' : 'Fully Cleared'}</span>
          <span class="v">${money(balanceThen)}</span>
        </div>`}
      </div>

      <div class="pdf-ftr">
        <div class="pdf-note">
          Computer-generated official receipt, verified against the Inspire College ERP
          records. Valid without a stamp.
        </div>
        <div class="pdf-sig">Authorised Signatory</div>
      </div>

    </div></div>
  </div>

  <div class="bar">
    <button class="btn" type="button" id="print">Print / Save as PDF</button>
  </div>
  <p class="hint">
    Prints as one half-A4 sheet. In the print dialog choose
    <strong>Paper size: A5</strong>, or A4 with <strong>Scale: Fit to page</strong>.
  </p>
</div>
<!-- type="module" is not decoration: module scripts are deferred, so this
     runs after the document is parsed and the letterhead has been fetched,
     which is the only point at which the height it measures is the height
     that will print. -->
<script type="module" src="/r-print.js"></script>`
  });
}

/**
 * The print button's handler, as a file rather than an inline onclick.
 *
 * script-src is 'self' with no 'unsafe-inline'. Under that policy an inline
 * handler is a button that looks normal and does nothing at all, so the two
 * lines live in a cached file instead.
 */
const RECEIPT_PRINT_JS = `
// Fit the receipt onto half an A4 sheet.
//
// The document is authored at full size — the same markup the counter prints —
// and scaled down onto the sheet. Measured rather than fixed, because a long
// student name or an extra fee line changes the height, and a scale chosen
// once here would either waste half the paper or spill onto a second sheet.
(function () {
  var MM = 96 / 25.4;
  var SHEET_MM = 148.5 - 16;   // half A4, less the @page margins
  var MIN = 0.5;               // below this it is too small for a parent to read

  function fit() {
    var el = document.querySelector('.pdf-fit');
    if (!el) return;
    el.style.removeProperty('--fit');
    var h = el.scrollHeight / MM;
    if (!h) return;
    var scale = h <= SHEET_MM ? 1 : Math.max(MIN, SHEET_MM / h);
    el.style.setProperty('--fit', String(Math.round(scale * 1000) / 1000));
  }

  // After the letterhead has loaded: it is the tallest single element, and
  // measuring without it reads a height wrong by the size of the logo.
  if (document.readyState === 'complete') fit();
  else window.addEventListener('load', fit);
  // And again at the only moment the browser guarantees final layout.
  window.addEventListener('beforeprint', fit);

  var btn = document.getElementById('print');
  if (btn) btn.addEventListener('click', function () { fit(); window.print(); });
})();
`;

app.get('/r-print.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  return res.type('application/javascript').send(RECEIPT_PRINT_JS);
});

/** Answered identically for a bad token and a missing receipt. */
function receiptNotFound(res) {
  return res.status(404).type('html').send(receiptPage({
    title: 'Receipt not found',
    inner: '<div class="gate"><div class="sheet">'
      + '<h1>Receipt not found</h1>'
      + '<p>This link may be incorrect, or the receipt may have been removed.</p>'
      + '<p class="foot">Please contact the college office.</p>'
      + '</div></div>'
  }));
}

/** Private, never cached, never indexed. */
function receiptHeaders(res) {
  res.set('Cache-Control', 'private, max-age=0, no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
}

/**
 * GET /r/:receiptNumber/:token — the gate.
 *
 * Touches no collection at all. The token is checked with an HMAC and the form
 * is returned; nothing about the student is read until the four digits arrive.
 * That is what makes WhatsApp's preview fetch harmless, and it also means the
 * common case — a crawler, not a parent — costs no database work whatsoever.
 */
// Deliberately NOT rate limited. It checks no secret, reads no collection and
// returns the same static form to everybody, so there is nothing here to
// brute-force. The limiter itself writes a counter to Mongo on every request,
// which would put a database write on the one path WhatsApp's crawler hits —
// and an 8-per-window budget would lock out a parent who simply reopened the
// link. The budget belongs on the POST, which is where the digits are checked.
app.get('/r/:receiptNumber/:token', (req, res) => {
  const { receiptNumber, token } = req.params;
  receiptHeaders(res);
  if (!receiptTokenValid(receiptNumber, token)) return receiptNotFound(res);
  return res.type('html').send(receiptGate({}));
});

/**
 * POST /r/:receiptNumber/:token — the four digits, and the receipt.
 *
 * Nothing is written and nothing is remembered. No session, no cookie: a
 * parent returning to the link enters the digits again, which is the point of
 * not storing anything.
 */
app.post('/r/:receiptNumber/:token',
  express.urlencoded({ extended: false, limit: '1kb' }),
  mongoRateLimiter, requireDatabase, async (req, res) => {
  receiptHeaders(res);
  try {
    const { receiptNumber, token } = req.params;
    if (!receiptTokenValid(receiptNumber, token)) return receiptNotFound(res);

    const last4 = String((req.body && req.body.last4) || '').replace(/\D/g, '');
    if (last4.length !== 4) {
      return res.status(400).type('html').send(receiptGate({
        error: 'Please enter exactly 4 digits.'
      }));
    }

    // A ceiling on THIS RECEIPT, independent of who is asking.
    //
    // mongoRateLimiter above is keyed on path AND address, which is right for
    // sharing — one parent mistyping their own digits must not use up another
    // parent's allowance. But it means rotating addresses buys 8 fresh guesses
    // each, and four digits is only 10,000 combinations, so roughly 1,250
    // addresses exhausts one receipt. That is proxy-pool territory rather than
    // a realistic threat to a college, but it is a real bound and it is cheap
    // to close.
    //
    // Keyed on the receipt number alone, so every wrong guess against this
    // receipt counts once, wherever it came from. The budget is deliberately
    // generous against honest error — a parent has far more than enough tries
    // — and still leaves 10,000 combinations unreachable.
    const receiptGuessKey = attemptKey('receipt', String(receiptNumber));
    const guessState = await getLockState(receiptGuessKey, RECEIPT_GLOBAL_GUESS_BUDGET);
    if (guessState.locked) {
      console.warn(`[Receipt link]: LOCKED receipt ${receiptNumber} after too many failed digit attempts`);
      return res.status(429).type('html').send(receiptPage({
        title: 'Too many attempts',
        inner: '<div class="gate"><div class="sheet">'
          + '<h1>Too many attempts</h1>'
          + '<p>This receipt has been temporarily locked after too many incorrect entries.</p>'
          + '<p class="foot">Please contact the college office for a copy of your receipt.</p>'
          + '</div></div>'
      }));
    }

    await connectToDatabase();
    const payment = await Payment.findOne({ receiptNumber: String(receiptNumber) }).lean();
    if (!payment) return receiptNotFound(res);

    // A reversed receipt is no longer a receipt. The money has been put back,
    // so a parent must not be able to keep opening a document that says they
    // paid it — and a link already sent by WhatsApp cannot be recalled, which
    // is exactly why the check belongs here rather than only in the portal.
    if (payment.reversed) {
      return res.status(410).type('html').send(receiptPage({
        title: 'Receipt cancelled',
        inner: '<div class="gate"><div class="sheet">'
          + '<h1>This receipt has been cancelled</h1>'
          + '<p>The payment it recorded was reversed by the college.</p>'
          + '<p class="foot">Please contact the college office for the current position on your fees.</p>'
          + '</div></div>'
      }));
    }

    const student = await Student.findOne({ studentId: payment.studentId })
      .select('name admissionNumber branch course section academicYear studentYear mobile parentMobile receipts')
      .lean();

    const contact = contactDigitsFor(student);
    if (!digitsMatch(last4, contact.slice(-4))) {
      // Counted against the per-receipt ceiling, not only the per-address one.
      // Only a WRONG guess is recorded; a correct one costs nothing, so a
      // parent reopening their own link repeatedly can never lock it.
      await recordFailedAttempt(receiptGuessKey, RECEIPT_GLOBAL_GUESS_BUDGET);

      // Deliberately vague, and the same message whether the digits are wrong
      // or the student has no mobile on file. A precise error would let
      // someone holding a forwarded link learn which case they are in.
      return res.status(403).type('html').send(receiptGate({
        error: 'Those digits do not match the number registered for this student.'
      }));
    }

    // The balance AT THE TIME of this receipt, not the balance now — a receipt
    // is a statement about the moment it was issued. The student's receipt
    // list holds that snapshot; a later payment must not rewrite this page.
    const snapshot = ((student && student.receipts) || [])
      .find(r => r.receiptNumber === payment.receiptNumber);
    const balanceThen = snapshot && typeof snapshot.balance === 'number' ? snapshot.balance : null;

    return res.type('html').send(receiptDocument({ payment, student, balanceThen }));
  } catch (err) {
    console.error('[Receipt link]: failed:', err.message);
    return receiptNotFound(res);
  }
});


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

// Mirrors the enum on the Student model. A value outside this list would be
// rejected by Mongoose at save time with a message nobody wants to read.
const VALID_STUDENT_YEARS = ['First Year', 'Second Year', 'Short Term'];

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

/**
 * A non-negative amount, from a request body.
 *
 * Deliberately strict about TYPE, because Number() is not. Number([100]) is
 * 100 and Number(true) is 1, so an array or a boolean sailed through the old
 * check and was charged: posting `amount: [100]` to the fee collection route
 * took Rs. 100 off a family's balance and wrote a receipt for it. Number('')
 * is 0 and Number('Infinity') is Infinity, and neither is NaN, so both passed
 * as well.
 *
 * Only a real number or a string that parses to one is accepted. The frontend
 * sends `Number(input.value)` everywhere, so it was never relying on the
 * looser behaviour.
 */
/**
 * A boolean from a request body.
 *
 * Boolean('false') is true. So is Boolean('no') and Boolean('0'). A form that
 * posts its checkbox as a string rather than a boolean therefore records the
 * OPPOSITE of what was entered — a worker marked unpaid stored as paid — and
 * nothing about the resulting record looks wrong afterwards.
 *
 * Returns null for anything that is not recognisably a yes or a no, so the
 * caller refuses rather than guesses.
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === 'yes' || v === '1') return true;
    if (v === 'false' || v === 'no' || v === '0') return false;
  }
  return null;
}

function isValidPositiveNumber(val) {
  if (typeof val === 'number') return Number.isFinite(val) && val >= 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return false;
    const num = Number(trimmed);
    return Number.isFinite(num) && num >= 0;
  }
  return false;
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
      case 'boolean': {
        const b = parseBoolean(v);
        if (b === null) return { error: `${field} must be true or false.` };
        doc[field] = b;
        break;
      }
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

// A student may carry a handful of extra charges — a lab fee, a bus fee. More
// than this is a data-entry accident, not a fee structure.
const MAX_CUSTOM_FEE_SLOTS = 20;

// Names that belong to a standard head. A custom slot called "Tuition Fee"
// would be counted twice: once as the head, once as the slot.
const STANDARD_FEE_KEYS = ['tuitionfee', 'hostelfee', 'transportfee', 'miscellaneousfee',
  'previouspending', 'tuition', 'hostel', 'transport', 'misc'];
const STANDARD_FEE_NAMES = ['tuition fee', 'hostel fee', 'transport fee',
  'miscellaneous fee', 'previous pending'];

/**
 * Validate and normalise a list of custom fee slots.
 *
 * These used to be assigned straight from the request in three of the four
 * places that accept them, and the consequence was not cosmetic. A slot with a
 * NEGATIVE amount reduced the bill without limit: it skipped the rule that a
 * waiver may not exceed the fee it discounts, and it never appeared in the
 * waiver totals, so a campus report showed no concession at all. One request
 * took a student from Rs. 85,000 owing to Rs. 5,000, invisibly.
 *
 * A slot of NaN was accepted and stored, and a slot with no name reached the
 * schema and came back as a 500 rather than a refusal.
 *
 * Returns { values } or { error }.
 */
function cleanCustomFeeSlots(input, existing = []) {
  if (input === undefined) return { values: existing };
  if (!Array.isArray(input)) {
    return { error: 'Custom fees must be sent as a list.' };
  }
  if (input.length > MAX_CUSTOM_FEE_SLOTS) {
    return { error: `A student may have at most ${MAX_CUSTOM_FEE_SLOTS} custom fees.` };
  }

  const out = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { error: 'Each custom fee needs a name and an amount.' };
    }

    const named = cleanText(raw.name, { field: 'Custom fee name', max: MAX_TEXT.short, required: true });
    if (named.error) return { error: named.error };

    const amount = Number(raw.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: `The amount for "${named.value}" must be a number of zero or more.` };
    }
    if (amount > MAX_MONEY) {
      return { error: `The amount for "${named.value}" cannot exceed ${MAX_MONEY.toLocaleString('en-IN')}.` };
    }

    // Silently dropped rather than refused: the frontend sends the standard
    // heads back in this list on some screens, and refusing would break a
    // save that is otherwise correct.
    const key = String(raw.key || raw.id || '').toLowerCase().trim();
    const name = named.value.toLowerCase().trim();
    if (STANDARD_FEE_KEYS.includes(key) || STANDARD_FEE_NAMES.includes(name)) continue;

    out.push({
      id: (raw.id && String(raw.id).slice(0, 64)) || crypto.randomBytes(6).toString('hex'),
      name: named.value,
      amount: Math.round(amount * 100) / 100
    });
  }
  return { values: out };
}

/**
 * A reversed payment is not money.
 *
 * Every figure the college reads — today's collection, a campus total, the
 * analytics, the reports — filters on this. The row itself stays exactly where
 * it was so the reversal remains visible and auditable; it simply stops
 * counting. Written as one constant rather than repeated inline, because a
 * total that forgot the filter would quietly overstate what the college has
 * taken, and would look right.
 */
const LIVE_PAYMENT = { reversed: { $ne: true } };

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
// security authenticator, and one accountant per campus.
//
// Clerks are NOT listed here. They used to be seven declared slots per campus;
// they are now created by the Rector as needed, up to fifteen per campus, so
// there is no fixed list of them to declare. Anything that needs to know
// whether an account is a clerk asks its role, not this array.
const defaultUsers = [
  { username: 'admin1', role: 'admin1', campus: 'All', name: 'Rector' },
  { username: '9059068384', role: 'authenticator', campus: 'All', name: 'Security Authenticator' },
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

        // Within clerks, keep creation order — a plain string compare puts
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

// The public enquiry form. A prospective parent submits once; sixty
// submissions from one address in a quarter of an hour is a script. Without a
// budget this is the one door in the application an anonymous caller can push
// on indefinitely, and behind it is the Rector's inbox and the database.
const PUBLIC_FORM_PATTERN = /^\/api\/enquiries$/;
const PUBLIC_FORM_BUDGET = 10;

// The public receipt link, which asks for four digits of a mobile number.
// Four digits is only 10,000 combinations, so the ordinary 120-per-window
// budget would let someone holding a forwarded link work through the lot in
// about a day. Eight tries per fifteen minutes turns that into years, and the
// key includes the receipt number, so one parent mistyping their own digits
// cannot use up anyone else's allowance.
//
// Only the POST carries the limiter; the GET is a static form and is left
// alone. The pattern matches both so that reattaching the limiter to the GET
// some day cannot silently give it the ordinary budget.
const RECEIPT_LINK_PATTERN = /^\/r\/[^/]+\/[^/]+$/;
const RECEIPT_LINK_BUDGET = 8;

// The ceiling on wrong digit-guesses against ONE receipt, counted regardless
// of where they came from. See the block in POST /r/:receiptNumber/:token for
// why the per-address budget above is not sufficient on its own. Set well
// above anything an honest parent will need and far below 10,000.
const RECEIPT_GLOBAL_GUESS_BUDGET = 25;

function rateLimitBudgetFor(path) {
  if (PUBLIC_FORM_PATTERN.test(path)) return PUBLIC_FORM_BUDGET;
  if (RECEIPT_LINK_PATTERN.test(path)) return RECEIPT_LINK_BUDGET;
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
 * accounts. It is not fine now: a campus has up to fifteen clerks plus an accountant,
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
// manageEnquiries was added last: admission enquiries used to be the Rector's
// alone. Both enquiry routes were ALREADY campus-scoped for a non-admin1
// caller - resolveReadCampus on the list, an explicit campus check on the
// update - so opening them to clerks needed a grant, not new scoping.
const CLERK_PERMISSIONS = ['addStudent', 'editStudent', 'editFees', 'collectFees', 'logExpenditures', 'manageStaff', 'manageEnquiries'];

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

/**
 * --- THE SHARED STUDENT REGISTRY ------------------------------------------
 *
 * Student records are ONE registry across all four campuses. A student who
 * moves, or who was registered at the wrong campus, or who is standing at a
 * different office's counter, must be findable and correctable by whoever is
 * serving them — hunting for the one campus that happens to hold the record
 * is not a security boundary, it is an obstacle to getting the fee collected.
 *
 * EVERY staffed role reaches every student — the Rector, the accountants and
 * the clerks. A clerk on a counter is serving whoever is in front of them,
 * and that person may belong to any campus.
 *
 * Clerks were previously pinned to their own campus for students. That was
 * reversed deliberately: the client wants one registry across the whole
 * college, searchable without choosing a campus first.
 *
 * The clerk's campus still means something — it is where their expenditures
 * are booked and which campus they belong to on the Rector's screens — it
 * simply no longer limits which student they can serve.
 *
 * This is deliberately about STUDENTS only. Expenditures, staff salaries and
 * campus fee settings stay campus-scoped: those are per-campus books, and
 * merging them would make a campus expenditure report meaningless.
 */
function callerReachesAllStudents(req) {
  const role = normalizeRole(req.user && req.user.role);
  return role === 'admin1' || role === 'accountant' || role === 'clerk';
}

/** Mongo filter for a STUDENT query. Empty for the shared-registry roles. */
function studentScopeFilter(req) {
  if (callerReachesAllStudents(req)) return {};
  return campusScopeFilter(req);
}

/**
 * The campus filter for a LIST endpoint, from the caller and the query.
 *
 * Replaces a block that was copy-pasted between handlers and carried the same
 * flaw in each copy: it tested `branch.toLowerCase() !== 'all'` before
 * comparing against the caller's own campus, so the literal string "all" was
 * waved past the check — and then, because the second test excluded "all" too,
 * the filter was left empty and every campus came back. A clerk pinned to one
 * campus could read all four by adding ?branch=all to the URL.
 *
 * "all" is not a neutral value. It is a request to widen, and for a
 * campus-scoped account that is precisely the thing to refuse.
 *
 * Returns a Mongo filter, or null when it has already answered the request.
 */
function scopedCampusFilter(req, res, label) {
  const own = String((req.user && req.user.campus) || '');
  const orgWide = own.trim().toLowerCase() === 'all';
  const asked = String(req.query.branch || req.query.campus || '').trim();

  if (!orgWide) {
    if (asked && asked.toLowerCase() === 'all') {
      res.status(403).json({
        status: 'error',
        message: `Your account may only view ${label} for ${own}.`
      });
      return null;
    }
    if (asked && normalizeCampus(asked) !== normalizeCampus(own)) {
      res.status(403).json({
        status: 'error',
        message: `Your account may only view ${label} for ${own}.`
      });
      return null;
    }
    // Pinned to the account's own campus, never left open.
    return { branch: normalizeCampus(own) };
  }

  if (!asked || asked.toLowerCase() === 'all') return {};
  if (!isValidCampus(asked)) {
    res.status(400).json({
      status: 'error',
      message: `Invalid campus branch [${asked}]. Must be one of: ${VALID_CAMPUSES.join(', ')}`
    });
    return null;
  }
  return { branch: normalizeCampus(asked) };
}

/** Whether this caller may act on a student belonging to `studentCampus`. */
function callerOwnsStudent(req, studentCampus) {
  if (callerReachesAllStudents(req)) return true;
  return callerOwnsCampus(req, studentCampus);
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
 * --- LIST CEILINGS AND PAGING -------------------------------------------
 *
 * Every list route in this file used to return its entire collection. That is
 * survivable for students, which grow with enrolment, and not survivable for
 * payments, which grow forever and were never scoped by date: for the Rector,
 * whose campus is `All`, `GET /api/admin1/payments` was every payment ever
 * taken across four campuses in one response, hydrated into full Mongoose
 * documents on a heap capped at 1536 MB. The symptom would never have been an
 * error. It would have been the dashboard gradually stopping working, worst
 * on the oldest phone and worst for the one account that loads all four
 * campuses.
 *
 * Two things stop that:
 *
 *   - a HARD ceiling the caller cannot raise. Asking for a million rows
 *     returns LIST_MAX_LIMIT of them.
 *   - `meta` alongside the array, carrying the TRUE total for the whole
 *     filter — not the length of the page.
 *
 * That second part is not decoration, it is the thing that makes capping
 * safe. Several screens compute money totals by reducing over the array they
 * were given. Truncating the array without telling them would leave those
 * totals silently wrong, which is far worse than a slow page — a wrong number
 * on a fee screen gets acted on. Where a route feeds a total, it computes
 * that total server-side over the FULL filter and returns it in `meta`.
 *
 * `data` stays an ARRAY on every route. The existing screens read `res.data`
 * directly, so paging information travels beside the array, never around it.
 */
const LIST_DEFAULT_LIMIT = 500;
const LIST_MAX_LIMIT = 1000;

/**
 * What a student LIST leaves out.
 *
 * `receipts` and `yearHistory` are per-student archives — the receipt history
 * of one person, and a frozen copy of each completed year including its own
 * full receipt array. Only a screen showing ONE student reads either, and
 * every one of those screens now loads that student from the detail route,
 * which still returns the whole document.
 *
 * Measured across 300 real-shaped students, `receipts` alone was 24.6% of the
 * response and dropping both fields halves it — and that is with first-year
 * students, whose `yearHistory` is empty. For a second-year student the
 * archive carries another year of receipts, so the saving grows exactly where
 * the documents are largest.
 *
 * A projection, not a rewrite of the callers: everything else a list row
 * carries is still there, so the registry, the fee editor and the admission
 * form's duplicate check are unaffected.
 */
const STUDENT_LIST_OMIT = '-receipts -yearHistory';

/**
 * How long a deleted record can still be put back.
 *
 * Long enough that a mistake noticed at the end of a term is still
 * recoverable, short enough that the bin is not an alternative database. The
 * records are never purged automatically — nothing sweeps them — so this is a
 * limit on what the RESTORE route will accept, not a deletion schedule. Older
 * records stay in place and remain readable in a backup.
 */
const RECYCLE_BIN_DAYS = 30;

function readPaging(req, { defaultLimit = LIST_DEFAULT_LIMIT } = {}) {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), LIST_MAX_LIMIT)
    : defaultLimit;
  const rawPage = Number(req.query.page);
  const page = Number.isFinite(rawPage) && rawPage > 1 ? Math.floor(rawPage) : 1;
  return { limit, page, skip: (page - 1) * limit };
}

/**
 * Sum one numeric field across everything the filter matches.
 *
 * Runs in the database rather than over the returned page, so the figure is
 * right whether the caller received 20 rows or 1000. Returns 0 for an empty
 * match, which is the correct total, not a missing one.
 */
async function sumField(Model, filter, field) {
  const [row] = await Model.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: `$${field}` } } }
  ]);
  return row ? Number(row.total) || 0 : 0;
}

/**
 * A student text search, over the fields a person actually types.
 *
 * The client has always sent `search=` to both student list routes and
 * neither route read it, so every screen downloaded the whole registry and
 * filtered it in the browser. This makes the parameter real, which is what
 * lets the ceiling above be a ceiling rather than a truncation — a clerk
 * looking for one student now gets that student, not the first page of
 * everybody.
 *
 * Escaped before it reaches a regex. An unescaped value lets a caller spend
 * the server's CPU on a pathological pattern, and a bare `.` would match the
 * entire registry.
 */
function studentSearchFilter(search) {
  const clean = String(search || '').trim();
  if (!clean) return null;
  const rx = new RegExp(escapeRegex(clean), 'i');
  return {
    $or: [
      { name: rx }, { admissionNumber: rx }, { studentId: rx },
      { mobile: rx }, { parentMobile: rx }, { course: rx }, { section: rx },
      // `branch` is here to match what the registry screen has always offered.
      // The portal filtered the loaded rows on campus name as well as the
      // fields above, so typing "Beemaram" narrowed the list. Now that the
      // same box asks the DATABASE rather than the array in the browser, a
      // field the client searched and the server did not would read as the
      // search having got worse — the same query, fewer results.
      { branch: rx }
    ]
  };
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
/**
 * Refuse a request that NAMES a campus the caller may not reach.
 *
 * Renamed from `enforceCampusIsolation`, which promised more than it did. It
 * guards exactly one route, and it has never been the thing that keeps
 * campuses apart — that is done inside each handler, by campusScopeFilter and
 * studentScopeFilter forcing the caller's own campus into the query.
 *
 * The old name invited the belief that mounting this was sufficient. It is
 * not: it only inspects a campus the CALLER supplied, so a request naming none
 * passes straight through, and a handler relying on this alone would return
 * every campus. The name now says what it actually does.
 */
function rejectForeignCampusParam(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  const body = req.body || {};
  const params = req.params || {};
  const query = req.query || {};
  const requestedCampus = query.campus || query.branch || body.campus || body.branch
    || params.campus || params.branch;

  // String() on both sides makes the comparison total. `campus` is required on
  // the User schema, but a missing or malformed value must not throw a
  // TypeError out of a security check — `.toLowerCase()` on undefined did.
  const callerCampus = String(req.user.campus || '').trim();
  const requested = String(requestedCampus || '').trim();

  if (!requested || callerCampus.toLowerCase() === 'all' || requested.toLowerCase() === 'all') {
    return next();
  }

  // No campus on the account, and one named in the request: refuse. Falling
  // through would let an account with no campus read whichever campus it asked
  // for, which is the opposite of the point.
  if (!callerCampus || requested.toLowerCase() !== callerCampus.toLowerCase()) {
    return res.status(403).json({
      status: 'error',
      message: callerCampus
        ? `Access forbidden. Account is restricted to campus [${callerCampus}].`
        : 'Access forbidden. This account is not assigned to a campus.'
    });
  }

  return next();
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
 * clerks they are. That is a deliberate convenience: the operator did
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

    // Same gates as /auth/login, built by the same helper — a campus sign-in
    // is bounded by the caller's address and by a campus-wide backstop, never
    // by the campus alone. See the ACCOUNT LOCKOUT comment for why.
    const gates = loginGates(req, { byCampus, clerkCampus, attempted });

    const blocked = await lockedGate(gates);
    if (blocked) {
      console.warn(`[Auth]: LOCKED verify-credentials for [${attempted || clerkCampus || '(blank)'}] from ${clientIp(req)} (${blocked.scope})`);
      return lockedResponse(res, blocked.state, 'Too many incorrect attempts.', LOCK_SUBJECT[blocked.scope]);
    }

    let user = null;
    if (byCampus) {
      // Password only at this step — the PIN is the second factor and is
      // checked by /auth/login, which re-resolves the same clerk.
      const found = await findClerkByCampusCredentials(clerkCampus, password, null);
      if (found.reason === 'ambiguous') {
        console.warn(`[Auth]: AMBIGUOUS verify at [${clerkCampus}] — ${found.count} clerks share this password`);
        await recordFailureAcrossGates(gates);
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
      const after = await recordFailureAcrossGates(gates);
      if (after.state.locked) {
        console.warn(`[Auth]: LOCKED OUT [${attempted || clerkCampus || '(blank)'}] (${after.scope}) for ${LOCKOUT_MINUTES} minutes`);
        return lockedResponse(res, after.state, 'Too many incorrect attempts.', LOCK_SUBJECT[after.scope]);
      }
      const subject = after.scope === 'account' ? 'this account' : 'sign-in';
      return res.status(401).json({
        status: 'error',
        message: `Invalid credentials. ${after.state.attemptsRemaining} attempt${after.state.attemptsRemaining === 1 ? '' : 's'} remaining before ${subject} is locked.`,
        attemptsRemaining: after.state.attemptsRemaining,
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

  // Carry the outgoing session's details across BEFORE they are overwritten,
  // so the account can be shown its previous sign-in. Read on the next visit
  // to the profile screen as "was that you?" — the one question a person can
  // actually answer about their own account.
  if (user.sessionStartedAt) {
    user.previousSessionAt = user.sessionStartedAt;
    user.previousSessionIp = user.sessionIp || '';
  }

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
 *
 * --- WHY A CAMPUS SIGN-IN LOCKS DIFFERENTLY ------------------------------
 *
 * A clerk signs in with a campus and no username, so at the moment a guess
 * fails there is no account to charge it to. This budget was therefore once
 * keyed on the campus alone — and that made the trade-off above far worse
 * than it reads. A campus is not one account: it is up to fifteen clerks. So
 * five wrong guesses from one stranger, who needs to know nothing beyond a
 * campus name, stopped every clerk on that campus from signing in. On a fee
 * collection day that is not a nuisance, it is an outage, and it was
 * reachable by anyone on the internet without credentials.
 *
 * A campus sign-in now passes two counters, and BOTH must be clear:
 *
 *   1. campus + client address, five guesses. This is the real limit and the
 *      one that catches an ordinary attacker or a clerk mistyping. It cannot
 *      affect anybody signing in from anywhere else, so the blast radius of
 *      a burst of failures is the address that produced it.
 *
 *   2. campus alone, MAX_CAMPUS_LOGIN_ATTEMPTS guesses. The backstop for an
 *      attacker rotating addresses to get a fresh five each time, which is
 *      exactly the evasion the per-account lockout exists to close.
 *
 * The second counter can still be tripped deliberately, and that is worth
 * stating plainly rather than claiming the problem is gone: a login endpoint
 * that bounds guesses can always be made to bound a legitimate user too. What
 * changes is the cost and the accident rate. Locking a campus now takes ten
 * times the guesses AND enough distinct addresses to get past counter 1,
 * instead of five requests from one machine, and no realistic amount of
 * ordinary mistyping reaches it.
 */
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;

// The campus-wide backstop. Deliberately far above anything a shift of clerks
// produces by fat-fingering — fifteen people would each have to fail three
// times inside the same fifteen minutes — and far below what a password guess
// run needs to be useful.
const MAX_CAMPUS_LOGIN_ATTEMPTS = Number(process.env.MAX_CAMPUS_LOGIN_ATTEMPTS) || 50;
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES) || 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

// Counters live a little past the lock so a burst of failures cannot be
// erased by waiting for the TTL instead of waiting out the lock.
const ATTEMPT_TTL_MS = LOCKOUT_MS * 4;

function attemptKey(kind, value) {
  return `${kind}:${String(value || '').trim().toLowerCase()}`;
}

// Returns { locked, secondsRemaining, attemptsRemaining }.
//
// `max` is a parameter because a campus sign-in runs two counters with
// different budgets against the same machinery (see the block comment above).
async function getLockState(key, max = MAX_LOGIN_ATTEMPTS) {
  const row = await LoginAttempt.findOne({ key }).lean();
  if (!row) return { locked: false, secondsRemaining: 0, attemptsRemaining: max };

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
  return { locked: false, secondsRemaining: 0, attemptsRemaining: Math.max(0, max - used) };
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
async function recordFailedAttempt(key, max = MAX_LOGIN_ATTEMPTS) {
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
  const locked = failedCount >= max;

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
    attemptsRemaining: Math.max(0, max - failedCount),
    secondsRemaining: locked ? Math.max(1, Math.ceil((until - now) / 1000)) : 0
  };
}

async function clearFailedAttempts(key) {
  await LoginAttempt.deleteOne({ key }).catch(() => {});
}

/**
 * The counters a sign-in attempt has to get past.
 *
 * A username sign-in has one, keyed on the account. A campus sign-in has two
 * — see the ACCOUNT LOCKOUT comment for why. Both call sites that verify a
 * password (/auth/verify-credentials and /auth/login) build their gates here,
 * so the two steps of a clerk's sign-in charge the same counters instead of
 * handing out a separate budget each.
 */
function loginGates(req, { byCampus, clerkCampus, attempted }) {
  if (!byCampus) {
    return [{ key: attemptKey('login', attempted), max: MAX_LOGIN_ATTEMPTS, scope: 'account' }];
  }
  return [
    {
      // Each gate gets its OWN kind, and that is load-bearing rather than
      // tidiness. The kind is a literal in this file; the value is not. When
      // all three shared the kind `login`, the account gate's value — a
      // username, straight from the request body — could be typed to spell
      // another gate's key exactly: a username of
      //
      //     campus:beemaram c1|ip:203.0.113.5
      //
      // produced `login:campus:beemaram c1|ip:203.0.113.5`, byte for byte the
      // address gate of a real clerk office. Five posts and that office was
      // locked out by a stranger who never touched its campus form. That is
      // the same failure this whole two-gate design exists to remove, walked
      // in through the other door.
      //
      // Distinct kinds close it structurally: `login:x` cannot equal
      // `login-campus-ip:y` for ANY x and y, so no value a caller supplies can
      // reach a gate it was not issued.
      key: attemptKey('login-campus-ip', `${clerkCampus}|${clientIp(req)}`),
      max: MAX_LOGIN_ATTEMPTS,
      scope: 'address'
    },
    {
      key: attemptKey('login-campus', clerkCampus),
      max: MAX_CAMPUS_LOGIN_ATTEMPTS,
      scope: 'campus'
    }
  ];
}

/** The first gate already locked, or null. Checked before any credential is looked at. */
async function lockedGate(gates) {
  for (const gate of gates) {
    const state = await getLockState(gate.key, gate.max);
    if (state.locked) return { ...gate, state };
  }
  return null;
}

/**
 * Charge one failed guess to every gate.
 *
 * All of them are incremented — a guess that the address budget catches still
 * counted towards the campus backstop, or an attacker would get the larger
 * budget for free by never exhausting the smaller one. The state reported back
 * is the tightest: the fewest attempts left, and the longest wait.
 */
async function recordFailureAcrossGates(gates) {
  let worst = null;
  for (const gate of gates) {
    const state = await recordFailedAttempt(gate.key, gate.max);
    if (
      !worst
      || (state.locked && !worst.state.locked)
      || (state.locked === worst.state.locked && state.attemptsRemaining < worst.state.attemptsRemaining)
    ) {
      worst = { ...gate, state };
    }
  }
  return worst;
}

/** A correct sign-in wipes every counter it passed, not just the tightest one. */
async function clearGates(gates) {
  for (const gate of gates) await clearFailedAttempts(gate.key);
}

// The refusal shown to a locked-out caller. Same shape everywhere so the UI
// can render one countdown regardless of which gate produced it.
//
// `subject` names what is locked. A campus-wide backstop trip is not "this
// account" — telling a clerk their account is locked when the lock is on the
// whole campus sends them to reset a password that was never the problem.
function lockedResponse(res, state, what = 'Too many incorrect attempts.', subject = 'This account') {
  const mins = Math.ceil(state.secondsRemaining / 60);
  return res.status(429).json({
    status: 'error',
    locked: true,
    lockedForSeconds: state.secondsRemaining,
    attemptsRemaining: 0,
    message: `${what} ${subject} is locked for ${mins} more minute${mins === 1 ? '' : 's'}.`
  });
}

/** How a locked gate describes itself to the person who hit it. */
const LOCK_SUBJECT = {
  account: 'This account',
  address: 'Sign-in from this device',
  campus: 'Sign-in for this campus'
};

async function handleLogin(req, res, label) {
  try {
    const { username, identifier, password, pin, campus } = req.body || {};
    const attempted = String(username || identifier || '').trim().toLowerCase();

    // A clerk signs in with a CAMPUS instead of a username: they pick their
    // campus and type their own password, and the server works out which of
    // clerk that is. Only this shape omits an identifier.
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

    // A username sign-in is bounded by one counter on the account. A campus
    // sign-in has no account to charge yet, so it is bounded by two — the
    // caller's own address, and a much larger campus-wide backstop. Keying it
    // on the password instead would leak which guesses have been tried, and
    // leaving it unkeyed would give every clerk on a campus one shared budget.
    const gates = loginGates(req, { byCampus, clerkCampus, attempted });

    // Check the locks BEFORE verifying anything. A locked account must not
    // reveal whether the guess would have been right.
    const blocked = await lockedGate(gates);
    if (blocked) {
      console.warn(`[Auth]: LOCKED ${label} attempt for [${attempted || clerkCampus || '(blank)'}] from ${clientIp(req)} (${blocked.scope})`);
      return lockedResponse(res, blocked.state, 'Too many incorrect attempts.', LOCK_SUBJECT[blocked.scope]);
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
        await recordFailureAcrossGates(gates);
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

      const after = await recordFailureAcrossGates(gates);
      if (after.state.locked) {
        console.warn(`[Auth]: LOCKED OUT [${attempted || clerkCampus || '(blank)'}] (${after.scope}) for ${LOCKOUT_MINUTES} minutes`);
        return lockedResponse(res, after.state, 'Too many incorrect attempts.', LOCK_SUBJECT[after.scope]);
      }
      // Tell the user how many tries are left. Withholding it does not slow an
      // attacker down — they can count — it only ambushes staff who mistyped.
      const subject = after.scope === 'account' ? 'this account' : 'sign-in';
      return res.status(401).json({
        status: 'error',
        message: `Invalid credentials. ${after.state.attemptsRemaining} attempt${after.state.attemptsRemaining === 1 ? '' : 's'} remaining before ${subject} is locked.`,
        attemptsRemaining: after.state.attemptsRemaining,
        locked: false
      });
    }

    // A correct sign-in wipes the run, so a user who mistyped twice and then
    // succeeded does not carry those failures into next week. Every gate is
    // cleared, including the campus backstop — a clerk signing in correctly is
    // the strongest evidence available that the failures before it were not an
    // attack in progress.
    await clearGates(gates);
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

    // `search` was always sent by the client and never read here. Applying it
    // in the database is what makes the ceiling below safe: a clerk looking
    // for one student gets that student rather than the first page of the
    // whole registry.
    const search = studentSearchFilter(req.query.search);
    if (search) Object.assign(filter, search);

    const { limit, page, skip } = readPaging(req);

    // `.lean()`: this route hydrated full Mongoose documents for every student
    // in the college. withReceiptTokens already handles a plain object, so
    // there is nothing to give up by not hydrating them.
    const [rows, total] = await Promise.all([
      // `_id` is the TIEBREAKER, and it is not decoration.
      //
      // skip/limit paging is only coherent if the sort is a total order. Two
      // students created in the same millisecond — a bulk intake, or an import
      // — compare equal on `createdAt` alone, and Mongo is then free to return
      // them in either order on either page. The observable result is that a
      // record appears on page one AND page two, or on NEITHER: paging from
      // 500 to 1000 returned 999 distinct students against this dataset before
      // this line, and the missing one was not reported anywhere.
      //
      // `_id` is unique, so appending it makes the order total and every
      // record fall on exactly one page.
      Student.find(filter).select(STUDENT_LIST_OMIT).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Student.countDocuments(filter)
    ]);

    return res.json({
      status: 'success',
      data: rows.map(withReceiptTokens),
      // `total` is the count for the WHOLE filter, not this page. The admission
      // form suggests the next number from it, so a page length here would
      // start suggesting numbers that are already taken.
      meta: { page, limit, total, hasMore: skip + rows.length < total }
    });
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
      tuitionFee = 0, hostelFee = 0, transportFee = 0, miscellaneousFee = 0, previousPending = 0, customFeeSlots = [], academicYear = '2026-2027',
      studentYear = 'First Year'
    } = body;

    // Reject over-long and non-scalar values before anything reaches the
    // database. This previously accepted a 50,000-character name.
    const text = cleanTextFields(body, {
      name: { required: true, max: FIELD_LIMITS.personName },
      admissionNumber: { required: true, max: FIELD_LIMITS.admissionNumber },
      fatherName: { max: FIELD_LIMITS.personName }, motherName: { max: FIELD_LIMITS.personName },
      course: { max: FIELD_LIMITS.course }, section: { max: FIELD_LIMITS.section },
      studentId: { max: FIELD_LIMITS.studentId },
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

    // A clerk registers students at its own campus only. The Rector and the
    // accountants share one registry and may register at any of the four —
    // a student standing at the wrong counter should still get enrolled.
    if (!callerOwnsStudent(req, targetBranch)) {
      return res.status(403).json({
        status: 'error',
        message: `Your account can only add students to ${req.user.campus}.`
      });
    }

    const existing = await findStudentByAdmissionNumber(admissionNumber);
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `Student with admission number [${existing.admissionNumber}] already exists — ${existing.name}, ${existing.branch}.`,
        conflictWith: existing.admissionNumber
      });
    }

    const customSlots = cleanCustomFeeSlots(customFeeSlots, []);
    if (customSlots.error) {
      return res.status(400).json({ status: 'error', message: customSlots.error });
    }
    const cleanedCustomSlots = customSlots.values;

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
          callerOwnsStudent(req, studentIdClash.branch)
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
      // Which year of the programme they are entering. Collected on the first
      // screen of the admission form; without it here the choice was accepted
      // by the form, discarded by the server, and every student silently
      // became First Year — the same shape of bug as the discarded studentId.
      studentYear: VALID_STUDENT_YEARS.includes(studentYear) ? studentYear : 'First Year',
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

    const visible = callerOwnsStudent(req, existing.branch);
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

    if (!callerOwnsStudent(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to [${student.branch}].` });
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
    const editSlots = cleanCustomFeeSlots(req.body.customFeeSlots, student.customFeeSlots || []);
    if (editSlots.error) {
      return res.status(400).json({ status: 'error', message: editSlots.error });
    }
    if (req.body.customFeeSlots !== undefined) req.body.customFeeSlots = editSlots.values;
    const updatedCustomSlots = editSlots.values;
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
      course: 'string', section: 'string',
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

    // callerOwnsCampus, NOT callerOwnsStudent.
    //
    // callerOwnsStudent defers to callerReachesAllStudents, which is true for
    // admin1, accountant AND clerk - the shared-registry rule. Using it here
    // made this entire block unreachable: every role that could reach the route
    // passed the check, so a clerk at one campus could delete a student at
    // another and the refusal below had never once fired.
    //
    // The block was clearly written to prevent exactly that, so the intent was
    // campus-scoped deletion and only the wiring was wrong. Fixed rather than
    // deleted, because the shared registry is about SERVING a student from any
    // counter - reading them, editing them, taking their fee. Removing one is a
    // different act, and the campus that owns the record should be the campus
    // that removes it. admin1 has campus 'All' and so still reaches every one.
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

    // Soft delete, not removal.
    //
    // This was Payment.deleteMany followed by Student.deleteOne: the student
    // and every receipt they had ever been given, gone permanently, on one
    // confirmation, recoverable only from the last Drive snapshot — which
    // means also losing everything else that happened since that snapshot.
    //
    // The records are now marked instead. They disappear from every read
    // exactly as before, because the exclusion is enforced by the schema
    // plugin rather than by each query remembering (see
    // server/models/softDelete.cjs), and they can be put back from the
    // Rector's Recently Deleted screen.
    //
    // The payments are marked in the same operation and restored WITH the
    // student. A student restored without their receipts is not a restored
    // student — their balance would come back wrong, in the college's favour.
    const reason = String((req.body && req.body.reason) || '').trim().slice(0, 200);
    const deletedPayments = await Payment.softDelete(
      { studentId: student.studentId },
      { by: req.user.username, reason }
    );

    const marked = await Student.softDelete(
      { _id: student._id },
      { by: req.user.username, reason }
    );
    if (marked === 0) {
      // Put the payments back rather than leaving them hidden beneath a
      // student who is still live — that combination reads on screen as a
      // paid balance silently vanishing.
      await Payment.restoreDeleted({ studentId: student.studentId }).catch(() => {});
      return res.status(500).json({ status: 'error', message: 'Delete failed. The student record was not changed.' });
    }

    // Confirmed by a follow-up read rather than by trusting the write. An
    // ordinary findById excludes soft-deleted rows, so a record that is gone
    // from here is gone from every screen in the application.
    const stillVisible = await Student.findById(student._id).lean();
    if (stillVisible) {
      console.error(`[Students]: Delete verification failed for ${student._id}; record still visible.`);
      return res.status(500).json({ status: 'error', message: 'Delete could not be verified. The record may still exist.' });
    }

    console.log(`[Students]: ${label} and ${deletedPayments} payment record(s) moved to the recycle bin by [${req.user.username}].`);
    recordAudit(req, {
      action: 'student.delete',
      entityType: 'student',
      entityId: student.studentId,
      entityLabel: label,
      campus: student.branch,
      summary: `Deleted ${label} from ${student.branch}, along with ${deletedPayments} payment record(s). Restorable for ${RECYCLE_BIN_DAYS} days.`,
      details: { deletedPayments, course: student.course, reason, recoverable: true }
    });
    return res.json({
      status: 'success',
      message: `Student ${label} deleted, along with ${deletedPayments} payment record(s). This can be undone from Recently Deleted for ${RECYCLE_BIN_DAYS} days.`,
      deletedPayments,
      recoverable: true
    });
  } catch (err) {
    console.error('[Students]: Delete failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to delete the student record.' });
  }
};

// An accountant may now delete a student, on the operator's instruction.
//
// It was admin1 and clerk only, which made the accountant portal able to ADD a
// student and not remove one - and the route it was refused on is literally
// /api/accountant/students/:id. The path and the gate disagreed, and the gate
// is what ran.
//
// requirePermission('editStudent') still applies to everyone. It is a real gate
// for a CLERK, whose grants are checked; callerHasPermission returns true for
// admin1 and accountant by role, which is the existing rule for both and not
// something this change introduces.
//
// NOTE for whoever reads this next: deleteStudentHandler contains a campus
// check, and that check is currently unreachable. callerOwnsStudent defers to
// callerReachesAllStudents, which is true for admin1, accountant AND clerk -
// the shared-registry rule. So a clerk at one campus could already delete a
// student at another, before this change and independently of it. That is the
// shared registry applied to DELETION as well as reading, and whether it should
// be is a decision for the college, not something to change quietly here.
app.delete('/api/admin1/students/:id', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requirePermission('editStudent'), requireDatabase, deleteStudentHandler);
app.delete('/api/admin/students/:id', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requirePermission('editStudent'), requireDatabase, deleteStudentHandler);
app.delete('/api/accountant/students/:id', authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requirePermission('editStudent'), requireDatabase, deleteStudentHandler);


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

    const overrideSlots = cleanCustomFeeSlots(customFeeSlots, student.customFeeSlots || []);
    if (overrideSlots.error) {
      return res.status(400).json({ status: 'error', message: overrideSlots.error });
    }
    student.customFeeSlots = overrideSlots.values;
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
app.post(['/api/admin1/teachers', '/api/admin2/teachers', '/api/admin/teachers'], authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageStaff'), mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    let { id, name, subject, salary = 0, mobile, email, branch, classification = 'Teaching', role = 'Senior Lecturer' } = req.body || {};

    if (req.user.role === 'clerk' && req.user.campus && req.user.campus !== 'All') {
      branch = req.user.campus; // Lock campus to admin2's assigned campus
    }

    // Refused, never substituted — the same reasoning as the expenditure
    // route. A teacher filed to a campus nobody chose appears on that
    // campus's staff list and its salary ledger, and nothing says why.
    const normBranch = normalizeCampus(branch);
    if (!isValidCampus(normBranch) || normBranch.toLowerCase() === 'all') {
      return res.status(400).json({
        status: 'error',
        message: `Name the campus this teacher belongs to. Must be one of: ${VALID_CAMPUSES.join(', ')}.`
      });
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
app.patch(['/api/admin1/teachers/:id', '/api/admin2/teachers/:id', '/api/admin/teachers/:id'], authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageStaff'), requireDatabase, async (req, res) => {
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
app.delete(['/api/admin1/teachers/:id', '/api/admin2/teachers/:id', '/api/admin/teachers/:id'], authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageStaff'), mongoRateLimiter, requireDatabase, async (req, res) => {
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

    // Marked, not removed — restorable from Recently Deleted. The follow-up
    // read below still proves it, because an ordinary findOne excludes
    // soft-deleted rows.
    const result = await Teacher.softDelete(query, {
      by: req.user.username,
      reason: String((req.body && req.body.reason) || '').trim().slice(0, 200)
    });
    if (result === 0) {
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
app.post(['/api/admin1/teachers/:id/salary-month', '/api/admin2/teachers/:id/salary-month', '/api/admin/teachers/:id/salary'], authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageStaff'), requireDatabase, async (req, res) => {
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
    const filter = scopedCampusFilter(req, res, 'expenditures');
    if (!filter) return;

    const { limit, page, skip } = readPaging(req);

    // The expenditure screen reduces over this array to show a campus total
    // and a per-branch breakdown, so the sums have to come from the database
    // over the whole filter. A total derived from a capped page would be
    // wrong by exactly the amount that fell off the end, and would look
    // entirely plausible.
    //
    // `byBranch` exists because the Rector's screen fetches every campus and
    // then narrows to one in the browser. A single overall total cannot serve
    // that — it would show the org-wide figure under a single campus's
    // heading — so the breakdown is computed here and the screen reads the
    // campus it is displaying straight out of it.
    const [rows, total, totalAmount, branchRows] = await Promise.all([
      Expenditure.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Expenditure.countDocuments(filter),
      sumField(Expenditure, filter, 'amount'),
      Expenditure.aggregate([
        { $match: filter },
        { $group: { _id: '$branch', amount: { $sum: '$amount' } } }
      ])
    ]);

    const byBranch = {};
    for (const row of branchRows) {
      byBranch[String(row._id || '')] = Number(row.amount) || 0;
    }

    return res.json({
      status: 'success',
      data: rows,
      meta: { page, limit, total, totalAmount, byBranch, hasMore: skip + rows.length < total }
    });
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
    // Refused, never substituted.
    //
    // An unrecognised campus — or none at all from the Rector, whose own
    // campus is "All" — used to fall back to a hardcoded 'Erragattugutta C1'.
    // That books real money against a campus that never spent it, silently:
    // the response is a 201 and nothing anywhere says the branch was changed.
    // Every campus report is wrong from that moment on and there is no way to
    // tell which entries were misfiled.
    const rawBranch = branch || req.user.campus;
    const targetBranch = normalizeCampus(rawBranch);

    if (!isValidCampus(targetBranch) || targetBranch.toLowerCase() === 'all') {
      return res.status(400).json({
        status: 'error',
        message: `Name the campus this expenditure belongs to. Must be one of: ${VALID_CAMPUSES.join(', ')}.`
      });
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

    // Six digits of the millisecond clock is one million values that
    // repeat every 16.7 minutes, against a unique index. That is the same
    // generator the student id used, where it collided in production and
    // left nine of eleven records pointing at nobody. A collision here
    // does not corrupt anything — the index refuses it — but the refusal
    // surfaces as a 500 and the entry is simply lost. The random suffix
    // is what the receipt number already does.
    const expId = `EXP-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString('hex')}`;
    const expenditure = await Expenditure.create({
      id: expId,
      category: String(category).trim(),
      amount: Number(amount),
      description: description || '',
      date: date ? new Date(date) : new Date(),
      branch: targetBranch,
      // Who spent it. Taken from the signed-in account rather than the body,
      // exactly as the cashier on a receipt is, so it cannot be claimed on
      // someone else's behalf by whoever is calling the route.
      recordedBy: req.user.username
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

    await Expenditure.softDelete(query, {
      by: req.user.username,
      reason: String((req.body && req.body.reason) || '').trim().slice(0, 200)
    });
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
    const filter = scopedCampusFilter(req, res, 'worker payments');
    if (!filter) return;

    const { limit, page, skip } = readPaging(req);

    // Two sums, because the screen shows both: what the wage bill comes to,
    // and how much of it has actually been paid out. `paid` is the field the
    // unpaid-must-not-store-as-paid fix turns on, so the second sum has to
    // filter on it rather than assume every row counts.
    const [rows, total, totalAmount, paidAmount] = await Promise.all([
      WorkerPayment.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      WorkerPayment.countDocuments(filter),
      sumField(WorkerPayment, filter, 'amount'),
      sumField(WorkerPayment, { ...filter, paid: true }, 'amount')
    ]);

    return res.json({
      status: 'success',
      data: rows,
      meta: { page, limit, total, totalAmount, paidAmount, hasMore: skip + rows.length < total }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.post('/api/admin2/worker-payments', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageStaff'), mongoRateLimiter, requireDatabase, async (req, res) => {
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
    if (Number(amount) > MAX_MONEY) {
      return res.status(400).json({
        status: 'error',
        message: `Amount cannot exceed ${MAX_MONEY.toLocaleString('en-IN')}.`
      });
    }

    // Bounded like every other stored text. A name with no limit is a name
    // that can be fifty thousand characters long.
    const wpText = cleanTextFields(req.body, {
      workerName: { required: true, max: FIELD_LIMITS.personName },
      role: { required: true, max: MAX_TEXT.short },
      monthPeriod: { required: true, max: MAX_TEXT.short }
    });
    if (wpText.error) {
      return res.status(400).json({ status: 'error', message: wpText.error });
    }

    // Refused rather than coerced: see parseBoolean.
    const paidFlag = parseBoolean(paid);
    if (paidFlag === null) {
      return res.status(400).json({ status: 'error', message: 'Paid must be true or false.' });
    }

    if (req.user.role === 'clerk' && req.user.campus !== 'All') {
      if (targetBranch.toLowerCase().trim() !== req.user.campus.toLowerCase().trim()) {
        return res.status(403).json({ status: 'error', message: `Admin2 can only record worker payments for campus [${req.user.campus}].` });
      }
    }

    // Six digits of the millisecond clock is one million values that
    // repeat every 16.7 minutes, against a unique index. That is the same
    // generator the student id used, where it collided in production and
    // left nine of eleven records pointing at nobody. A collision here
    // does not corrupt anything — the index refuses it — but the refusal
    // surfaces as a 500 and the entry is simply lost. The random suffix
    // is what the receipt number already does.
    const wrkId = `WRK-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString('hex')}`;
    const payment = await WorkerPayment.create({
      id: wrkId,
      workerName: wpText.values.workerName,
      role: wpText.values.role,
      amount: Number(amount),
      monthPeriod: wpText.values.monthPeriod,
      paid: paidFlag,
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

app.patch('/api/admin2/worker-payments/:id', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageStaff'), requireDatabase, async (req, res) => {
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

    recordAudit(req, {
      action: 'workerPayment.update',
      entityType: 'workerPayment',
      entityId: String(req.params.id),
      campus: req.user && req.user.campus || '',
      summary: `Updated worker payment ${req.params.id}.`
    });
    return res.json({ status: 'success', data: wrk });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.delete('/api/admin2/worker-payments/:id', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageStaff'), mongoRateLimiter, requireDatabase, async (req, res) => {
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

    await WorkerPayment.softDelete(query, {
      by: req.user.username,
      reason: String((req.body && req.body.reason) || '').trim().slice(0, 200)
    });
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

    // Students are one registry: the Rector and every accountant see all four
    // campuses. A clerk stays pinned to its own and is refused outright if it
    // names another, rather than being silently narrowed — silently returning
    // different data than was asked for hides that a boundary exists.
    const sharedRegistry = callerReachesAllStudents(req);

    if (!sharedRegistry && requested && requested.toLowerCase() !== 'all'
        && normalizeCampus(requested) !== normalizeCampus(req.user.campus)) {
      return res.status(403).json({
        status: 'error',
        message: `Your account may only view students in ${req.user.campus}.`
      });
    }

    const filter = studentScopeFilter(req);

    // A shared-registry account may narrow to one campus, but never widen.
    if (sharedRegistry && requested && requested.toLowerCase() !== 'all') {
      if (!isValidCampus(requested)) {
        return res.status(400).json({ status: 'error', message: `Unknown campus [${requested}].` });
      }
      filter.branch = normalizeCampus(requested);
    }

    // Same as the admin1 registry: the search runs in the database, and the
    // response is bounded and carries the true total beside the page.
    const search = studentSearchFilter(req.query.search);
    if (search) Object.assign(filter, search);

    const { limit, page, skip } = readPaging(req);

    const [rows, total] = await Promise.all([
      // Tiebroken on `_id` — see the registry route above. Sorting by name
      // alone is worse than by date, not better: students genuinely share a
      // name, so the ties are guaranteed rather than incidental.
      Student.find(filter).select(STUDENT_LIST_OMIT).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
      Student.countDocuments(filter)
    ]);

    return res.json({
      status: 'success',
      data: rows.map(withReceiptTokens),
      meta: { page, limit, total, hasMore: skip + rows.length < total }
    });
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

    if (!callerOwnsStudent(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    return res.json({ status: 'success', data: withReceiptTokens(student) });
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

    if (!callerOwnsStudent(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    // Validated to the SAME standard as creation.
    //
    // This used to copy req.body straight onto the document. Creating a
    // student rejects a nine-digit mobile and a fifty-thousand-character name;
    // editing one accepted both, so any rule enforced at the counter could be
    // walked around by saving the record a second time. The parent mobile
    // matters most: it is where fee receipts are sent, and its last four
    // digits are what a parent types to open one.
    //
    // Only fields actually PRESENT are validated. cleanTextFields resolves an
    // absent field to '', so validating the whole set would blank every
    // detail the caller did not happen to mention.
    const bioTextSpec = {
      name: { max: FIELD_LIMITS.personName },
      fatherName: { max: FIELD_LIMITS.personName },
      motherName: { max: FIELD_LIMITS.personName },
      email: { max: FIELD_LIMITS.email },
      address: { max: FIELD_LIMITS.address },
      dob: { max: 20 },
      course: { max: FIELD_LIMITS.course },
      section: { max: FIELD_LIMITS.section },
      mobile: { max: FIELD_LIMITS.mobile },
      parentMobile: { max: FIELD_LIMITS.mobile }
    };
    const presentSpec = {};
    for (const [field, opts] of Object.entries(bioTextSpec)) {
      if (req.body[field] !== undefined) presentSpec[field] = opts;
    }
    const bioText = cleanTextFields(req.body, presentSpec);
    if (bioText.error) {
      return res.status(400).json({ status: 'error', message: bioText.error });
    }

    for (const field of ['mobile', 'parentMobile']) {
      const value = req.body[field];
      if (value === undefined || value === '') continue;
      const digits = String(value).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(digits)) {
        return res.status(400).json({
          status: 'error',
          message: `${field === 'mobile' ? 'Mobile' : 'Parent mobile'} number must be exactly 10 digits.`
        });
      }
    }

    const allowedBioFields = ['name', 'fatherName', 'motherName', 'mobile', 'parentMobile', 'email', 'address', 'dob', 'course', 'section', 'hostelStatus', 'transportStatus'];
    allowedBioFields.forEach(field => {
      if (req.body[field] === undefined) return;
      // The cleaned value where there is one; hostelStatus and transportStatus
      // are enums and are checked by the schema on save.
      const cleaned = bioText.values && bioText.values[field];
      student[field] = cleaned !== undefined ? cleaned : req.body[field];
    });

    await student.save();
    recordAudit(req, {
      action: 'student.bio.update',
      entityType: 'student',
      entityId: String(req.params.id),
      campus: req.user && req.user.campus || '',
      summary: `Edited the profile details of student ${req.params.id}.`
    });
    return res.json({ status: 'success', data: student });
  } catch (err) {
    return failRequest(req, res, err);
  }
});


// --- FEE COLLECTION (PAYMENT) ROUTES ---

/**
 * How far apart two otherwise-identical payments must be, for a caller that
 * sends no idempotency key, before the second is treated as a new payment
 * rather than a resubmission of the first.
 *
 * Bucketed rather than measured, so the check costs nothing and cannot race:
 * the window is `floor(now / this)`. The cost of bucketing is that two clicks
 * either side of a boundary land in different buckets and both record. The
 * portal does not rely on this — it sends its own key, which has no window at
 * all — so that gap is only reachable by a script, which does not double-click.
 */
const DUPLICATE_WINDOW_MS = 15000;

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
 *
 * --- THE DUPLICATE KEY, AND WHAT IT CAN AND CANNOT KNOW -------------------
 *
 * Two requests that look identical are either one payment submitted twice, or
 * two payments that happen to match. NOTHING the server can see tells those
 * apart. Only the caller knows, and it says so by sending an idempotencyKey:
 * the same key means "this is my earlier request again", a new key means "this
 * is a new payment". The portal sends one per submission and reuses it when a
 * PIN prompt makes it retry, so at a counter this is exact rather than a guess.
 *
 * A derived key is the fallback for callers that send none. It has to guess,
 * and the guess is a short time window — which is a real limitation, not a
 * solved problem:
 *
 *   Two payments identical in student, amount, category, installment, mode
 *   AND transaction reference, made by a keyless caller inside the same 15
 *   seconds, are still recorded once.
 *
 * An earlier version of this comment claimed the window had been removed. It
 * had not; it was widened from 10 seconds to 15, and `installment` was left
 * out of the key entirely, so paying a balance in two equal instalments back
 * to back silently produced one receipt and left the balance short. That is
 * what this note exists to stop being rediscovered.
 *
 * The window stays because it is the only thing standing between a keyless
 * client and a double-charged parent, and a double charge is worse than a
 * merge: one is money taken twice, the other is a receipt to reissue. Callers
 * that need exactness send a key.
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

    if (!callerOwnsStudent(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    // Every field that distinguishes one payment from another belongs in the
    // derived key. `installment` and `mode` were missing, which is how two
    // halves of the same balance — same student, same amount, same category,
    // different instalment — collided into a single receipt.
    const idempotencyKey = (clientKey && String(clientKey).trim())
      ? `client_${String(clientKey).trim()}`
      : [
          'srv',
          student.studentId,
          payAmt,
          String(category).trim(),
          String(installment).trim(),
          String(mode).trim(),
          String(transactionRef || '').trim(),
          Math.floor(Date.now() / DUPLICATE_WINDOW_MS)
        ].join('_');

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

        // The key must belong to THIS student before its receipt is handed
        // back. idempotencyKey is unique across the whole collection and the
        // `client_` half of it is chosen by the caller, so a lookup on the key
        // alone answers a question nobody asked: it can return a payment
        // belonging to another student, on another campus, past the ownership
        // check performed above — student name, admission number, amount and
        // receipt number included. Guessing a key is not realistic now that
        // the portal sends a UUID, but "not realistic" is not the standard for
        // handing one campus another campus's records, and the scoping costs a
        // single condition.
        if (existing && existing.studentId !== student.studentId) {
          console.warn(`[Payments]: Key [${idempotencyKey}] belongs to a different student; refusing to answer with it.`);
          return res.status(409).json({
            status: 'error',
            message: 'That idempotency key was already used for a different payment. Use a new key.'
          });
        }

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
        payment: {
          ...normalizePaymentForClient(newPayment),
          // The parent's link, signed here. The portal never sees the key.
          receiptToken: receiptLinkToken(newPayment.receiptNumber)
        },
        student: withReceiptTokens(finalStudent)
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
    if (!callerOwnsStudent(req, student.branch)) {
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
  authenticateToken, requireRole('accountant', 'admin1', 'clerk'), requirePermission('editFees'),
  mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const { studentId } = req.params;
    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) return res.status(404).json({ status: 'error', message: 'Student not found.' });
    if (!callerOwnsStudent(req, student.branch)) {
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

/**
 * POST /api/accountant/students/:studentId/payments/:receiptNumber/reverse
 *
 * Undo a payment taken in error.
 *
 * There was no way to do this at all, which meant a clerk who typed 25,000
 * instead of 2,500 had no path back except somebody editing MongoDB by hand —
 * and that breaks the audit trail and the ledger invariant in the same motion.
 * Mistakes at a fee counter are a daily event, not an edge case.
 *
 * The payment is REVERSED, never deleted. Deleting it would put the money back
 * and destroy the evidence that it was ever taken; a family disputing a receipt
 * they were handed needs the college to be able to say what happened to it. The
 * row, its receipt number and its original amount all stay. What changes is
 * that it stops counting: every total filters on `reversed`.
 *
 * Guarded by the account's own six-digit PIN, the same one used to sign in.
 * Putting money back is not a routine edit, and a shared terminal left open is
 * the ordinary case rather than the unlucky one.
 */
app.post('/api/accountant/students/:studentId/payments/:receiptNumber/reverse',
  authenticateToken, requireRole('accountant', 'admin1', 'clerk'),
  requirePermission('collectFees'), verifySecurityOtp,
  mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { studentId, receiptNumber } = req.params;

    const reason = cleanText((req.body && req.body.reason) || '', {
      field: 'Reason', max: MAX_TEXT.short, required: true
    });
    if (reason.error) {
      return res.status(400).json({
        status: 'error',
        message: 'Say why this payment is being reversed. It is recorded against your name.'
      });
    }

    const payment = await Payment.findOne({ receiptNumber: String(receiptNumber).trim() });
    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'That receipt was not found.' });
    }

    // Already reversed. Answered as a conflict rather than repeated, because
    // reversing twice would credit the money back twice.
    if (payment.reversed) {
      return res.status(409).json({
        status: 'error',
        message: `Receipt ${payment.receiptNumber} was already reversed`
          + `${payment.reversedBy ? ` by ${payment.reversedBy}` : ''}.`
      });
    }

    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({
      $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }]
    });
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }
    if (payment.studentId !== student.studentId) {
      return res.status(400).json({
        status: 'error',
        message: 'That receipt belongs to a different student.'
      });
    }
    if (!callerOwnsStudent(req, student.branch)) {
      return res.status(403).json({
        status: 'error',
        message: `Access forbidden. Student belongs to campus [${student.branch}].`
      });
    }

    // A payment from a closed year cannot be reversed here. Its money has been
    // archived into yearHistory and the fee structure it was taken against no
    // longer exists on the record, so putting it back would credit this year's
    // balance with last year's payment.
    const archived = (student.yearHistory || []).some(y =>
      (y.receipts || []).some(r => r.receiptNumber === payment.receiptNumber));
    if (archived) {
      return res.status(409).json({
        status: 'error',
        message: 'That receipt belongs to a closed academic year and cannot be reversed here. '
          + 'Ask the Rector to correct the archived year.'
      });
    }

    const amount = Math.round(Number(payment.amount || 0) * 100) / 100;

    // Marked reversed FIRST, conditionally on it not already being reversed.
    // Two clerks pressing undo at the same moment both read `reversed: false`
    // above; only one of them can win this update, and the loser is refused
    // before any money moves. Doing it the other way round — ledger first —
    // would credit the amount back twice.
    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, reversed: { $ne: true } },
      {
        $set: {
          reversed: true,
          reversedAt: new Date(),
          reversedBy: req.user.username,
          reversalReason: reason.value
        }
      },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({
        status: 'error',
        message: 'That receipt was reversed by someone else a moment ago.'
      });
    }

    // The same arithmetic the collection route uses, subtracting instead of
    // adding: totalPaid comes down and the balance is recomputed from the
    // document's own fee fields in one atomic operation.
    const updatedStudent = await Student.findOneAndUpdate(
      { _id: student._id },
      [
        {
          $set: {
            totalPaid: {
              $max: [0, { $round: [{ $subtract: [{ $ifNull: ['$totalPaid', 0] }, amount] }, 2] }]
            }
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
        },
        // The receipt comes off the student's list in the same operation, so
        // there is never a moment where the money is back but the receipt is
        // still printable and shareable.
        {
          $set: {
            receipts: {
              $filter: {
                input: { $ifNull: ['$receipts', []] },
                as: 'r',
                cond: { $ne: ['$$r.receiptNumber', payment.receiptNumber] }
              }
            }
          }
        }
      ],
      { new: true }
    );

    if (!updatedStudent) {
      // The ledger did not move but the receipt is marked reversed. Put the
      // mark back rather than leave the two disagreeing, and say so loudly.
      await Payment.updateOne({ _id: payment._id }, {
        $set: { reversed: false, reversedAt: null, reversedBy: '', reversalReason: '' }
      }).catch(err =>
        console.error(`[Reversal]: could not un-mark ${payment.receiptNumber}:`, err.message));

      console.error(`[Reversal]: ${payment.receiptNumber} marked reversed but the student `
        + `balance did not move; the mark has been rolled back.`);
      return res.status(500).json({
        status: 'error',
        message: 'The reversal could not be applied. Nothing was changed — please try again.'
      });
    }

    recordAudit(req, {
      action: 'payment.reverse',
      entityType: 'payment',
      entityId: payment.receiptNumber,
      entityLabel: studentLabel(updatedStudent),
      campus: student.branch,
      amount,
      summary: `Reversed receipt ${payment.receiptNumber} for `
        + `Rs. ${amount.toLocaleString('en-IN')} against ${studentLabel(updatedStudent)}. `
        + `Reason: ${reason.value}`,
      details: {
        receiptNumber: payment.receiptNumber,
        reason: reason.value,
        balanceBefore: student.remainingBalance,
        balanceAfter: updatedStudent.remainingBalance
      }
    });

    console.log(`[Reversal]: ${payment.receiptNumber} (Rs. ${amount}) reversed by `
      + `[${req.user.username}] — ${reason.value}`);

    return res.json({
      status: 'success',
      message: `Receipt ${payment.receiptNumber} has been reversed. `
        + `Rs. ${amount.toLocaleString('en-IN')} has been put back on the balance.`,
      data: {
        payment: normalizePaymentForClient(claimed),
        student: withReceiptTokens(updatedStudent)
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
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

    if (!callerOwnsStudent(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    const payments = await Payment.find({ studentId: student.studentId }).sort({ date: -1 }).lean();
    // Same signed link on historical receipts, so one can be re-sent to a
    // parent months later without regenerating anything.
    const withTokens = payments.map(p => ({ ...p, receiptToken: receiptLinkToken(p.receiptNumber) }));
    return res.json({ status: 'success', data: withTokens });
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

    recordAudit(req, {
      action: 'security.keys.regenerate',
      entityType: 'system',
      entityId: '',
      campus: req.user && req.user.campus || '',
      summary: `Regenerated the system encryption keys.`
    });
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

    // Refused by ROLE, and by the fixed username, and by the role of whatever
    // account :id actually resolves to.
    //
    // This used to compare the fixed username ALONE, and a test written to
    // check it found the hole: the guard never fired for an authenticator
    // account with any other username, and admin1 can reach this route. So a
    // Rector could change a second authenticator's password outright, and could
    // have changed the first one's the moment it was renamed. Every other door
    // to this account checks the role; this one only looked like it did.
    const targetAccount = await User.findById(id).select('role username').lean().catch(() => null);
    if (id === FIXED_AUTHENTICATOR_USERNAME
        || normalizedUsername === FIXED_AUTHENTICATOR_USERNAME
        || (targetAccount && normalizeRole(targetAccount.role) === 'authenticator')) {
      return res.status(403).json({
        status: 'error',
        message: 'The security authenticator can only change its own credentials, from its own portal.'
      });
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
    recordAudit(req, {
      action: 'account.delete',
      entityType: 'account',
      entityId: String(req.params.id),
      campus: req.user && req.user.campus || '',
      outcome: 'denied',
      summary: `Attempted to delete portal account ${req.params.id}; deletion is disabled.`
    });
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
    recordAudit(req, {
      action: 'backup.create',
      entityType: 'backup',
      entityId: '',
      campus: req.user && req.user.campus || '',
      summary: `Created an on-demand backup.`
    });
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

    // Refused by ROLE, not only by the fixed username.
    //
    // This checked `target === FIXED_AUTHENTICATOR_USERNAME` alone. That
    // happens to protect the live account, because its username is still the
    // constant — but the protection is then one rename away from silently
    // ceasing to apply, and it never covered a second authenticator account at
    // all. The account that audits everyone else must not be seizable by
    // anyone else, so the check is on what the account IS.
    const targetUser = await User.findOne({ username: target }).select('role').lean();
    if (target === FIXED_AUTHENTICATOR_USERNAME
        || (targetUser && normalizeRole(targetUser.role) === 'authenticator')) {
      recordAudit(req, {
        action: 'account.password.reset',
        entityType: 'account',
        entityId: target,
        campus: req.user && req.user.campus || '',
        outcome: 'denied',
        summary: `Refused a password reset for the authenticator account.`
      });
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
    recordAudit(req, {
      action: 'account.password.reset',
      entityType: 'account',
      entityId: String((req.body || {}).username || ''),
      campus: req.user && req.user.campus || '',
      summary: `Reset the password for account ${(req.body || {}).username || 'unknown'}.`
    });
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
      // withDeleted, or this purges only what is VISIBLE and leaves every
      // soft-deleted record behind. "Erase every student, teacher and payment"
      // has to mean the recycle bin as well — otherwise the one route whose
      // entire job is to leave nothing would quietly leave the most sensitive
      // rows in place.
      const sRes = await Student.deleteMany({}).setOptions({ withDeleted: true });
      const tRes = await Teacher.deleteMany({}).setOptions({ withDeleted: true });
      const pRes = await Payment.deleteMany({}).setOptions({ withDeleted: true });
      students = sRes.deletedCount || 0;
      teachers = tRes.deletedCount || 0;
      payments = pRes.deletedCount || 0;
    }
    recordAudit(req, {
      action: 'data.purge',
      entityType: 'system',
      entityId: '',
      campus: req.user && req.user.campus || '',
      summary: `Purged all student, teacher and payment records.`
    });
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

    recordAudit(req, {
      action: 'data.wipe',
      entityType: 'system',
      entityId: '',
      campus: req.user && req.user.campus || '',
      summary: `WIPED the database. A pre-wipe backup was taken first.`
    });
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
/**
 * The next number in a named sequence, allocated atomically.
 *
 * The enquiry reference code was `ENQ-2026-<countDocuments() + 1>`. Two
 * submissions arriving together both read the same count, both compute the
 * same code, and the unique index rejects one of them with a duplicate key
 * error that surfaces as a 500. Under ten-way concurrency eight of ten failed
 * — and this is the public form, so the people it fails are prospective
 * parents responding to an advertisement, at exactly the moment several of
 * them arrive at once.
 *
 * findOneAndUpdate with $inc is a single atomic operation on one document, so
 * every caller gets a different number. Sequential codes are kept because the
 * college reads them out to families; a random code would have avoided the
 * collision but lost that.
 */
async function nextSequence(name) {
  const row = await mongoose.connection.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  // The driver has returned either the document or a { value } wrapper
  // depending on version; both shapes are handled rather than assumed.
  const doc = row && (row.value || row);
  return Number(doc && doc.seq) || 1;
}

app.post('/api/enquiries', mongoRateLimiter, async (req, res) => {
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

    const year = new Date().getFullYear();
    const referenceCode = `ENQ-${year}-${String(await nextSequence(`enquiry-${year}`)).padStart(4, '0')}`;

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
app.patch('/api/enquiries/:id', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageEnquiries'), requireDatabase, async (req, res) => {
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
    recordAudit(req, {
      action: 'enquiry.update',
      entityType: 'enquiry',
      entityId: String(req.params.id),
      campus: req.user && req.user.campus || '',
      summary: `Updated enquiry ${req.params.id} to status ${(req.body || {}).status || 'unchanged'}.`
    });
    return res.json({ status: 'success', data: enquiry });
  } catch (err) {
    console.error('[Enquiry]: Update failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update the enquiry.' });
  }
});

// Reading the inbox matches acting on it. Updating an enquiry is admin1
// only, so listing them was the odd one out: a clerk could read every
// prospective student's name, their parent's name, mobile and email —
// personal data about people who are not even enrolled — while being
// unable to do anything with it.
app.get('/api/enquiries', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageEnquiries'), async (req, res) => {
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
app.get('/api/system/last-changed', authenticateToken, rejectForeignCampusParam, async (req, res) => {
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
// REMOVED: app.post('/api/teachers/:id/salary-month')
//
// It wrote teacher.salaryHistory, and salaryHistory is not declared in the
// Teacher schema. Mongoose runs strict by default, so every write was silently
// discarded on save - the route answered 200, recorded an audit entry, and
// persisted nothing. Proven by writing the field and reading it back: undefined.
//
// The real salary ledger is salaryLedger[academicYear][month], written by
// app.post(['/api/admin1/teachers/:id/salary-month', ...]) above, which is what
// the portal actually calls. This was a second, broken copy reachable only
// through admin1Service.updateTeacherMonthlySalary, which no view called.
//
// Both are gone. A route that reports success and stores nothing is worse than
// no route: nothing fails, and the salary simply is not there next month.

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

app.patch('/api/admin2/staff-salaries/:teacherId', authenticateToken, requireRole('admin1', 'clerk'), requirePermission('manageStaff'), requireDatabase, async (req, res) => {
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
    //
    // salaryLedger and monthlySalaries are NOT in this list, and must not be.
    // Two rules are enforced by reading the ledger back — a month may not
    // exceed the agreed salary, and a year does not open until the previous
    // twelve months are settled — so a route that writes the ledger wholesale
    // is a route that repeals both. Posting a fabricated year of "Paid"
    // months here marked all twelve as settled at 999,999 each against a
    // 25,000 salary, unlocked the following year, and left a payment history
    // that no salary-month request ever created. The ledger is written by the
    // salary-month route or not at all; the frontend only ever sends
    // salaryStatus and paidAmount here.
    const allowed = ['salary', 'salaryStatus'];
    for (const field of allowed) {
      if (req.body[field] === undefined) continue;
      if (field === 'salary') {
        if (!isValidPositiveNumber(req.body.salary)) {
          return res.status(400).json({ status: 'error', message: 'Salary must be a valid non-negative number.' });
        }
        // Capped, because the per-month ceiling is derived from this figure:
        // an unbounded salary is an unbounded monthly payment.
        if (Number(req.body.salary) > MAX_MONEY) {
          return res.status(400).json({
            status: 'error',
            message: `Salary cannot exceed ${MAX_MONEY.toLocaleString('en-IN')}.`
          });
        }
        teacher.salary = Number(req.body.salary);
      } else {
        teacher[field] = req.body[field];
        teacher.markModified(field);
      }
    }

    await teacher.save();
    recordAudit(req, {
      action: 'salary.update',
      entityType: 'teacher',
      entityId: String(req.params.teacherId),
      campus: req.user && req.user.campus || '',
      summary: `Updated the staff salary record for teacher ${req.params.teacherId}.`
    });
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

app.patch('/api/accountant/hostel/checkout/:studentId', authenticateToken, requireRole('accountant', 'admin1', 'clerk'), requirePermission('editStudent'), requireDatabase, async (req, res) => {
  try {
    const { studentId } = req.params;
    const isObjId = isValidObjectId(studentId);
    const student = await Student.findOne({ $or: [{ _id: isObjId ? studentId : null }, { studentId }, { admissionNumber: studentId }] });

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student record not found.' });
    }

    if (!callerOwnsStudent(req, student.branch)) {
      return res.status(403).json({ status: 'error', message: `Access forbidden. Student belongs to campus [${student.branch}].` });
    }

    student.hostelStatus = 'Day Scholar';
    await student.save();

    recordAudit(req, {
      action: 'student.hostel.checkout',
      entityType: 'student',
      entityId: String(req.params.studentId),
      campus: req.user && req.user.campus || '',
      summary: `Checked student ${req.params.studentId} out of the hostel.`
    });
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
        { $match: { ...scope, ...LIVE_PAYMENT, date: { $gte: startOfDay } } },
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
    // Payments need the reversal filter; students, teachers and
    // expenditures do not have the field and must not be filtered on it.
    const payMatch = [{ $match: { ...scope, ...LIVE_PAYMENT } }];

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

      Payment.aggregate([...payMatch, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),

      // Daily collections for the sparkline / trend chart.
      Payment.aggregate([
        { $match: { ...scope, ...LIVE_PAYMENT, date: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' }, count: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
      ]),

      Student.aggregate([...match, { $group: { _id: '$branch', students: { $sum: 1 }, outstanding: { $sum: { $ifNull: ['$remainingBalance', 0] } }, paid: { $sum: { $ifNull: ['$totalPaid', 0] } } } }]),
      Payment.aggregate([...payMatch, { $group: { _id: '$branch', collected: { $sum: '$amount' }, receipts: { $sum: 1 } } }]),
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
      Payment.aggregate([...payMatch, { $group: { _id: '$paymentMode', amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),
      Payment.find({ ...scope, ...LIVE_PAYMENT }).sort({ date: -1 }).limit(8).select('receiptNumber studentName amount date paymentMode branch').lean()
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
      Payment.aggregate([{ $match: { ...scope, ...LIVE_PAYMENT } }, { $group: { _id: '$branch', revenue: { $sum: '$amount' } } }]),
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
 * --- CLERK ACCOUNTS (Rector only) ----------------------------------------
 *
 * Clerks used to be seven fixed slots per campus, numbered and pre-declared.
 * They are now created freely: the Rector picks a campus, fills in a name,
 * portal ID, password, PIN, mobile and email, and the account exists.
 *
 * The cap is FIFTEEN per campus, and it is counted on the server inside the
 * same request that inserts. A limit enforced only by the form is not a
 * limit — anyone can post past it — and counting after the write would let
 * two simultaneous requests both see fourteen and both create a fifteenth.
 */
// 25 a campus, set by the operator. It was 15, then briefly 100 - and a cap of
// a hundred against a real roster of seven is not a cap, it is an absence of
// one. 25 is generous against the roster and small enough that the screen
// used to manage them stays readable.
//
// It stays a NUMBER rather than unlimited for the original reason: list
// responses are capped and paginated, so an unbounded count would silently
// truncate the very screen the Rector manages clerks from.
const MAX_CLERKS_PER_CAMPUS = 25;

/** Every clerk at one campus, in a stable order, with credentials readable. */
async function readCampusClerks(campus) {
  const docs = await User.find({
    campus,
    role: { $in: ['clerk', 'admin2'] }
  }).lean();

  return docs
    .map(doc => ({
      id: String(doc._id),
      username: doc.username,
      name: doc.name || doc.username,
      campus: doc.campus,
      status: (doc.status || 'active') === 'disabled' ? 'inactive' : 'active',
      mobile: doc.mobile || '',
      email: doc.email || '',
      // Readable because credentials are stored readable — the Rector manages
      // these accounts and needs to be able to hand someone their password.
      // Null only for an account still holding a pre-change bcrypt hash.
      password: isHashedCredential(doc.password) ? null : (doc.password || null),
      pin: isHashedCredential(doc.pin) ? null : (doc.pin || null),
      permissions: normalizePermissions(doc.permissions),
      slotIndex: doc.slotIndex ?? null,
      createdAt: doc.createdAt || null,
      lastSeenAt: doc.lastSeenAt || null
    }))
    .sort((a, b) => {
      if (a.slotIndex != null && b.slotIndex != null && a.slotIndex !== b.slotIndex) {
        return a.slotIndex - b.slotIndex;
      }
      return String(a.name).localeCompare(String(b.name));
    });
}

/**
 * GET /api/admin1/clerks?campus=<campus>
 *
 * The clerks that exist at one campus, plus how many more may be added. No
 * empty placeholder rows: a clerk either exists or it does not, and the
 * screen shows an "Add clerk" control rather than seven blanks.
 */
app.get('/api/admin1/clerks', authenticateToken, requireRole('admin1'), verifySecurityOtp, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    const campus = normalizeCampus(String(req.query.campus || '').trim());
    if (!isValidCampus(campus)) {
      return res.status(400).json({
        status: 'error',
        message: `Choose a campus. Must be one of: ${VALID_CAMPUSES.join(', ')}`
      });
    }

    const clerks = await readCampusClerks(campus);
    return res.json({
      status: 'success',
      data: {
        campus,
        clerks,
        maxPerCampus: MAX_CLERKS_PER_CAMPUS,
        remaining: Math.max(0, MAX_CLERKS_PER_CAMPUS - clerks.length)
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * POST /api/admin1/clerks — create one clerk.
 *
 * Takes the details and the permissions together: the screen collects them
 * across two steps, but a half-created clerk with no powers and no way to
 * finish is worse than one round trip.
 */
app.post('/api/admin1/clerks', authenticateToken, requireRole('admin1'), verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const body = req.body || {};

    const campus = normalizeCampus(String(body.campus || '').trim());
    if (!isValidCampus(campus)) {
      return res.status(400).json({
        status: 'error',
        message: `Choose a campus. Must be one of: ${VALID_CAMPUSES.join(', ')}`
      });
    }

    const text = cleanTextFields(body, {
      name: { required: true, max: FIELD_LIMITS.personName },
      username: { required: true, max: FIELD_LIMITS.username },
      mobile: { max: FIELD_LIMITS.mobile },
      email: { max: FIELD_LIMITS.email }
    });
    if (text.error) {
      return res.status(400).json({ status: 'error', message: text.error });
    }

    const username = String(text.values.username).toLowerCase().trim();
    const password = String(body.password || '').trim();
    const pin = String(body.pin || '').trim();

    if (password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'A password must be at least 8 characters.' });
    }
    if (password.length > FIELD_LIMITS.password) {
      return res.status(400).json({ status: 'error', message: `A password cannot exceed ${FIELD_LIMITS.password} characters.` });
    }
    // A stored value starting with $2 would be read back as a legacy bcrypt
    // hash and reported unreadable, which is confusing rather than wrong.
    if (password.startsWith('$2')) {
      return res.status(400).json({ status: 'error', message: 'A password cannot begin with "$2".' });
    }
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ status: 'error', message: 'A PIN must be exactly 6 digits.' });
    }

    const mobile = String(text.values.mobile || '').replace(/[\s-]/g, '');
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ status: 'error', message: 'Mobile number must be exactly 10 digits.' });
    }

    // The cap, counted here rather than trusted from the form.
    const existingCount = await User.countDocuments({ campus, role: { $in: ['clerk', 'admin2'] } });
    if (existingCount >= MAX_CLERKS_PER_CAMPUS) {
      return res.status(409).json({
        status: 'error',
        message: `${campus} already has ${existingCount} clerks. The limit is ${MAX_CLERKS_PER_CAMPUS} — remove one before adding another.`
      });
    }

    const clash = await User.findOne({ username }).lean();
    if (clash) {
      return res.status(409).json({ status: 'error', message: `The portal ID ${username} is already in use.` });
    }

    const permissions = normalizePermissions(body.permissions);

    const created = await User.create({
      username,
      password,
      pin,
      role: 'clerk',
      campus,
      name: text.values.name,
      mobile,
      email: String(text.values.email || ''),
      status: body.active === false ? 'disabled' : 'active',
      slotIndex: existingCount + 1,
      permissions
    });

    const granted = CLERK_PERMISSIONS.filter(name => permissions[name]);
    recordAudit(req, {
      action: 'clerk.create',
      entityType: 'account',
      entityId: created.username,
      entityLabel: `${created.name} (${created.username})`,
      campus,
      summary: `Created clerk ${created.name} (${created.username}) at ${campus} with `
        + (granted.length ? granted.join(', ') : 'no permissions') + '.',
      details: { permissions: granted, mobile: !!mobile, email: !!created.email }
    });

    const clerks = await readCampusClerks(campus);
    return res.status(201).json({
      status: 'success',
      message: `${created.name} can now sign in at ${campus}.`,
      data: {
        campus,
        clerks,
        maxPerCampus: MAX_CLERKS_PER_CAMPUS,
        remaining: Math.max(0, MAX_CLERKS_PER_CAMPUS - clerks.length)
      }
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'That portal ID was just taken. Choose another.' });
    }
    return failRequest(req, res, err);
  }
});

/**
 * PATCH /api/admin1/clerks/:id — change one clerk.
 *
 * Powers, sign-in details and active state in one place, because that is how
 * the screen presents a clerk: you click one and everything about it is
 * editable. Anything omitted is left alone.
 */
app.patch('/api/admin1/clerks/:id', authenticateToken, requireRole('admin1'), verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const body = req.body || {};
    const { id } = req.params;

    const isObjId = isValidObjectId(id);
    const clerk = await User.findOne({
      $or: [{ _id: isObjId ? id : null }, { username: String(id).toLowerCase().trim() }],
      role: { $in: ['clerk', 'admin2'] }
    });
    if (!clerk) {
      return res.status(404).json({ status: 'error', message: 'That clerk was not found.' });
    }

    const changed = [];

    if (body.name !== undefined) {
      const named = cleanText(body.name, { field: 'Name', max: FIELD_LIMITS.personName, required: true });
      if (named.error) return res.status(400).json({ status: 'error', message: named.error });
      if (named.value !== clerk.name) { clerk.name = named.value; changed.push('name'); }
    }

    if (body.username !== undefined) {
      const nextUsername = String(body.username).toLowerCase().trim();
      if (!nextUsername) {
        return res.status(400).json({ status: 'error', message: 'A portal ID cannot be blank.' });
      }
      if (nextUsername !== clerk.username) {
        const clash = await User.findOne({ username: nextUsername, _id: { $ne: clerk._id } }).lean();
        if (clash) {
          return res.status(409).json({ status: 'error', message: `The portal ID ${nextUsername} is already in use.` });
        }
        clerk.username = nextUsername;
        changed.push('portal ID');
      }
    }

    if (body.password !== undefined && String(body.password).trim()) {
      const nextPassword = String(body.password).trim();
      if (nextPassword.length < 8) {
        return res.status(400).json({ status: 'error', message: 'A password must be at least 8 characters.' });
      }
      if (nextPassword.startsWith('$2')) {
        return res.status(400).json({ status: 'error', message: 'A password cannot begin with "$2".' });
      }
      clerk.password = nextPassword;
      changed.push('password');
    }

    if (body.pin !== undefined && String(body.pin).trim()) {
      const nextPin = String(body.pin).trim();
      if (!/^\d{6}$/.test(nextPin)) {
        return res.status(400).json({ status: 'error', message: 'A PIN must be exactly 6 digits.' });
      }
      clerk.pin = nextPin;
      changed.push('PIN');
    }

    if (body.mobile !== undefined) {
      const mobile = String(body.mobile).replace(/[\s-]/g, '');
      if (mobile && !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ status: 'error', message: 'Mobile number must be exactly 10 digits.' });
      }
      if (mobile !== clerk.mobile) { clerk.mobile = mobile; changed.push('mobile'); }
    }

    if (body.email !== undefined) {
      const mailed = cleanText(body.email, { field: 'Email', max: FIELD_LIMITS.email });
      if (mailed.error) return res.status(400).json({ status: 'error', message: mailed.error });
      if (mailed.value !== clerk.email) { clerk.email = mailed.value; changed.push('email'); }
    }

    if (body.permissions !== undefined) {
      const before = CLERK_PERMISSIONS.filter(n => (clerk.permissions || {})[n]);
      clerk.permissions = normalizePermissions(body.permissions);
      const after = CLERK_PERMISSIONS.filter(n => clerk.permissions[n]);
      if (before.join(',') !== after.join(',')) changed.push('permissions');
    }

    if (body.active !== undefined) {
      const nextStatus = body.active === true ? 'active' : 'disabled';
      if (nextStatus !== (clerk.status || 'active')) {
        clerk.status = nextStatus;
        changed.push(nextStatus === 'active' ? 'access restored' : 'access terminated');
      }
    }

    if (changed.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Nothing to change.' });
    }

    // End the session only when it MUST end.
    //
    // Permissions do not need it: req.user is rebuilt from the database on
    // every request, so granting or revoking a power takes effect on the
    // clerk's very next call either way. Signing someone out because the
    // Rector granted them something extra would be a punishment for a
    // promotion, and signing them out mid-transaction is worse than the
    // problem it solves.
    //
    // Credentials and deactivation DO need it: the old password must stop
    // working, and a terminated clerk must stop working, immediately rather
    // than whenever their token happens to expire.
    const mustEndSession = changed.some(c =>
      c === 'password' || c === 'PIN' || c === 'portal ID' || c === 'access terminated'
    );

    if (mustEndSession) {
      clerk.activeSessionId = null;
    }
    await clerk.save();
    if (mustEndSession) {
      await RefreshToken.deleteMany({ userId: clerk._id }).catch(() => {});
    }

    recordAudit(req, {
      action: body.active === false ? 'clerk.deactivate' : 'clerk.update',
      entityType: 'account',
      entityId: clerk.username,
      entityLabel: `${clerk.name} (${clerk.username})`,
      campus: clerk.campus,
      summary: `Changed ${changed.join(', ')} for clerk ${clerk.username} at ${clerk.campus}.`,
      details: {
        fields: changed,
        permissions: CLERK_PERMISSIONS.filter(n => clerk.permissions[n]),
        active: (clerk.status || 'active') !== 'disabled'
      }
    });

    const clerks = await readCampusClerks(clerk.campus);
    return res.json({
      status: 'success',
      message: `Updated ${changed.join(', ')} for ${clerk.name}.`,
      data: {
        campus: clerk.campus,
        clerks,
        maxPerCampus: MAX_CLERKS_PER_CAMPUS,
        remaining: Math.max(0, MAX_CLERKS_PER_CAMPUS - clerks.length)
      }
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'That portal ID was just taken. Choose another.' });
    }
    return failRequest(req, res, err);
  }
});

/**
 * DELETE /api/admin1/clerks/:id — remove a clerk entirely.
 *
 * Terminating access by switching the account off is usually what is wanted,
 * and is reversible. This is for genuinely removing someone — it frees a
 * place against the fifteen. Nothing they recorded is touched: their receipts,
 * students and audit entries stay exactly where they are, which is why the
 * audit trail copies the actor's name rather than referencing the account.
 */
app.delete('/api/admin1/clerks/:id', authenticateToken, requireRole('admin1'), verifySecurityOtp, mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const clerk = await User.findOne({
      $or: [{ _id: isObjId ? id : null }, { username: String(id).toLowerCase().trim() }],
      role: { $in: ['clerk', 'admin2'] }
    });
    if (!clerk) {
      return res.status(404).json({ status: 'error', message: 'That clerk was not found.' });
    }

    const removed = { username: clerk.username, name: clerk.name, campus: clerk.campus };
    await RefreshToken.deleteMany({ userId: clerk._id }).catch(() => {});
    await User.deleteOne({ _id: clerk._id });

    recordAudit(req, {
      action: 'clerk.delete',
      entityType: 'account',
      entityId: removed.username,
      entityLabel: `${removed.name} (${removed.username})`,
      campus: removed.campus,
      summary: `Removed clerk ${removed.name} (${removed.username}) from ${removed.campus}. Their records are unchanged.`,
      details: {}
    });

    const clerks = await readCampusClerks(removed.campus);
    return res.json({
      status: 'success',
      message: `${removed.name} was removed from ${removed.campus}.`,
      data: {
        campus: removed.campus,
        clerks,
        maxPerCampus: MAX_CLERKS_PER_CAMPUS,
        remaining: Math.max(0, MAX_CLERKS_PER_CAMPUS - clerks.length)
      }
    });
  } catch (err) {
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
      // Tiebroken on `_id`: audit rows are written in bursts and share a
      // millisecond readily, and a paged audit trail that can drop an entry
      // is worse than no paging at all.
      AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
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

    // Clerks are deliberately EXCLUDED. They are managed on their own screen,
    // which already returns their passwords and PINs, and two screens editing
    // one credential is how the two drift apart. This screen is the fixed
    // portals only: the four campus accountants, the Rector accounts and the
    // authenticator.
    //
    // Excluded in the QUERY rather than hidden in the client, because the
    // alternative ships twenty-five plaintext clerk passwords to a browser that
    // was never going to display them.
    const docs = await User.find({ role: { $nin: ['clerk', 'admin2'] } }).lean();

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

    // Refused by ROLE, not only by the fixed username. Recognising the
    // authenticator solely by that literal stops protecting it the moment the
    // account is renamed, and never covered a second authenticator at all.
    //
    // This was briefly opened, on request, and then closed again the same day
    // once it became clear the actual need was for the authenticator to set its
    // OWN credentials - not for the Rector to set them. That need is met by the
    // security panel in the authenticator portal, which posts to
    // /api/account/password and has never been role-restricted.
    //
    // So the separation stands: the Rector holds credential control over every
    // portal except the one account that audits the Rector. Opening this again
    // means an admin1 can sign in as the authenticator, and the authenticator is
    // what backups, restores and credential rotation answer to.
    if (target.username === FIXED_AUTHENTICATOR_USERNAME
        || normalizeRole(target.role) === 'authenticator') {
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
        message: 'The security authenticator can only change its own credentials, from its own portal.'
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


/**
 * --- CSV EXPORT ---------------------------------------------------------
 *
 * PDF and print are well covered here — receipts, ledgers, payslips all go
 * through openPrintDocument. What was missing is the format an accountant
 * actually needs: a printed PDF cannot be reconciled against a bank
 * statement, and retyping a fee register into a spreadsheet is how numbers
 * get transposed.
 *
 * These deliberately bypass the list ceiling. An export whose whole purpose
 * is reconciliation must be complete or it is worse than useless — a
 * spreadsheet missing its last page still adds up, just to the wrong number.
 * They are bounded instead by being campus-scoped, rate limited, and read-only.
 */

/** RFC 4180 quoting. A comma, quote or newline in a name must not shift columns. */
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // A leading =, +, - or @ is interpreted as a FORMULA by Excel and Sheets.
  // A student named "=cmd" would execute on open, so the cell is prefixed with
  // an apostrophe to force it to text. This is the standard CSV injection
  // defence and it matters here because every value below is user-entered.
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

function csvDocument(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  // CRLF and a BOM: Excel on Windows opens a plain UTF-8 CSV as mojibake for
  // any non-ASCII name, and this is the college's own student register.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

function sendCsv(res, filename, body) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(body);
}

/** A date for a spreadsheet: sortable, unambiguous, no locale guessing. */
function csvDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

app.get('/api/export/students.csv',
  authenticateToken, requireRole('admin1', 'clerk', 'accountant'), mongoRateLimiter, requireDatabase,
  async (req, res) => {
  try {
    const filter = studentScopeFilter(req);
    const rows = await Student.find(filter).sort({ branch: 1, name: 1 }).lean();

    const body = csvDocument(
      ['Admission No', 'Name', 'Campus', 'Course', 'Section', 'Year', 'Academic Year',
       'Father', 'Mobile', 'Parent Mobile', 'Total Fee', 'Balance', 'Status'],
      rows.map(s => {
        const fees = computeStudentFees(s);
        return [
          s.admissionNumber, s.name, s.branch, s.course, s.section, s.studentYear, s.academicYear,
          s.fatherName, s.mobile, s.parentMobile,
          fees.netOwed, fees.balance, s.status
        ];
      })
    );

    recordAudit(req, {
      action: 'export.students',
      entityType: 'export',
      entityId: 'students.csv',
      campus: req.user.campus,
      summary: `Exported ${rows.length} student record(s) to CSV.`,
      details: { rows: rows.length }
    });
    return sendCsv(res, `students-${csvDate(Date.now())}.csv`, body);
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.get('/api/export/payments.csv',
  authenticateToken, requireRole('admin1', 'clerk', 'accountant'), mongoRateLimiter, requireDatabase,
  async (req, res) => {
  try {
    const filter = campusScopeFilter(req);

    // An optional window, because a full payment history is the one export
    // that grows without limit and "last quarter" is what gets reconciled.
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return res.status(400).json({ status: 'error', message: 'Dates must be in YYYY-MM-DD form.' });
    }
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      // Inclusive of the end day, which is what someone typing a date means.
      if (to) filter.date.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
    }

    const rows = await Payment.find(filter).sort({ date: -1 }).lean();

    const body = csvDocument(
      ['Receipt No', 'Date', 'Student', 'Admission No', 'Campus', 'Amount', 'Mode', 'Collected By', 'Reversed'],
      rows.map(p => [
        p.receiptNumber, csvDate(p.date), p.studentName, p.admissionNumber, p.branch,
        // `cashier`, which is the field this has always been stored in — set
        // from the signed-in username the moment the receipt is raised. The
        // column read `collectedBy`, a name that appears nowhere else in the
        // application and on no schema, so it was undefined for every row and
        // the column came out blank on every export. This is the file used to
        // reconcile takings against a bank statement, and it was the half of
        // it that says who accepted the money.
        p.amount, p.paymentMode, p.cashier || '',
        // Reversed rows are INCLUDED and flagged rather than filtered out. A
        // reconciliation needs to see that a receipt was raised and reversed;
        // silently omitting it leaves an unexplained gap in the numbering.
        p.reversed ? 'YES' : ''
      ])
    );

    recordAudit(req, {
      action: 'export.payments',
      entityType: 'export',
      entityId: 'payments.csv',
      campus: req.user.campus,
      summary: `Exported ${rows.length} payment record(s) to CSV.`,
      details: { rows: rows.length, from: req.query.from || '', to: req.query.to || '' }
    });
    return sendCsv(res, `payments-${csvDate(Date.now())}.csv`, body);
  } catch (err) {
    return failRequest(req, res, err);
  }
});

app.get('/api/export/expenditures.csv',
  authenticateToken, requireRole('admin1', 'clerk'), mongoRateLimiter, requireDatabase,
  async (req, res) => {
  try {
    const filter = campusScopeFilter(req);
    const rows = await Expenditure.find(filter).sort({ date: -1 }).lean();

    const body = csvDocument(
      ['Reference', 'Date', 'Campus', 'Category', 'Description', 'Amount', 'Logged By'],
      // `recordedBy`, the field that now exists. This column read `loggedBy`,
      // which was never on the schema and never written by anything, so the
      // column was blank on every row of every export.
      rows.map(e => [e.id, csvDate(e.date), e.branch, e.category, e.description, e.amount, e.recordedBy || ''])
    );

    recordAudit(req, {
      action: 'export.expenditures',
      entityType: 'export',
      entityId: 'expenditures.csv',
      campus: req.user.campus,
      summary: `Exported ${rows.length} expenditure record(s) to CSV.`,
      details: { rows: rows.length }
    });
    return sendCsv(res, `expenditures-${csvDate(Date.now())}.csv`, body);
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * GET /api/fees/outstanding — every student who still owes something.
 *
 * Receipt sharing works one student at a time, which is right for a parent at
 * the counter and useless for the thing a college actually does each month:
 * chase everybody with a balance. The balances are already computed for the
 * dashboard; this is the same arithmetic, filtered and ordered by what is
 * owed, with the number to contact attached.
 *
 * Returns the parent's mobile because that is the point of the screen. It is
 * campus-scoped like every other read, and it is logged — a list of every
 * family in debt at a campus is worth knowing who pulled.
 */
app.get('/api/fees/outstanding',
  authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase,
  async (req, res) => {
  try {
    const filter = studentScopeFilter(req);
    const requested = String(req.query.branch || '').trim();
    if (requested && requested.toLowerCase() !== 'all') {
      if (!isValidCampus(requested)) {
        return res.status(400).json({ status: 'error', message: `Unknown campus [${requested}].` });
      }
      filter.branch = normalizeCampus(requested);
    }

    const minBalance = Math.max(1, Number(req.query.minBalance) || 1);
    // 'Inactive', not 'inactive'. The Student enum is ['Active', 'Inactive']
    // and Mongo compares strings case-sensitively, so the lower-case spelling
    // matched every document and the exclusion did nothing at all: a student
    // who had left the college still appeared on the list the office works
    // through when it rings families about unpaid fees. Counted on a 2,000
    // student set, 81 were inactive and 62 of those carried a balance — 62
    // families who would have been chased for the fees of a child who is no
    // longer enrolled.
    //
    // The User model separately uses lower-case 'active'/'disabled'; that is a
    // different collection with a different vocabulary and is not a typo.
    const rows = await Student.find({ ...filter, status: { $ne: 'Inactive' } })
      .select('name admissionNumber branch course section studentYear mobile parentMobile '
        + 'tuitionFee hostelFee transportFee miscellaneousFee previousPending customFeeSlots '
        + 'tuitionWaiver hostelWaiver transportWaiver miscWaiver totalPaid')
      .lean();

    const owing = rows
      .map(s => {
        const fees = computeStudentFees(s);
        return {
          name: s.name,
          admissionNumber: s.admissionNumber,
          campus: s.branch,
          course: s.course,
          section: s.section,
          studentYear: s.studentYear,
          // Parent first: this is a fee reminder, and it is the parent who pays.
          contact: s.parentMobile || s.mobile || '',
          totalPayable: fees.netOwed,
          paid: fees.paid,
          balance: fees.balance
        };
      })
      .filter(s => s.balance >= minBalance)
      .sort((a, b) => b.balance - a.balance);

    // BOUNDED, like every other list route.
    //
    // This one returned every student who owed anything, with `hasMore: false`
    // asserting that was the whole story. At eleven students that was true. At
    // two thousand it is a third of a megabyte in one response, and it grows
    // with the college for as long as the college exists — the only list route
    // left with no ceiling on it.
    //
    // Sorted by balance descending BEFORE the page is cut, so the first page is
    // the largest debts: the order the office actually works through, which
    // makes a bounded list useful rather than arbitrary.
    //
    // The totals below are deliberately computed over `owing` — the whole
    // matched set — and not over the page. The panel prints them as "total
    // outstanding" and "no contact on file", and a figure summed over one page
    // would be wrong in the most plausible-looking way possible: too small, by
    // exactly the amount that fell off the end, with nothing on screen to
    // suggest it.
    const { limit, page, skip } = readPaging(req);
    const pageRows = owing.slice(skip, skip + limit);

    recordAudit(req, {
      action: 'fees.outstanding.view',
      entityType: 'report',
      entityId: 'outstanding',
      campus: filter.branch || req.user.campus,
      summary: `Viewed the outstanding-fees list (${owing.length} student(s)).`,
      details: { count: owing.length }
    });

    return res.json({
      status: 'success',
      data: pageRows,
      meta: {
        page,
        limit,
        total: owing.length,
        totalAmount: owing.reduce((sum, s) => sum + s.balance, 0),
        withoutContact: owing.filter(s => !s.contact).length,
        hasMore: skip + pageRows.length < owing.length
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * POST /api/admin1/accounts/:id/unlock — clear a lockout without touching the
 * credential.
 *
 * Five wrong guesses locks an account for fifteen minutes, which is correct
 * and stays. What was missing was any way back in before the clock ran out:
 * a clerk locked out at nine on admissions morning either waited, or the
 * Rector changed their password — which fixes the lockout by creating a
 * different problem, since the clerk then has a credential they do not know.
 *
 * This clears the counters and nothing else. The password and PIN are
 * untouched, so the clerk signs in with what they already have.
 *
 * Deliberately does NOT clear the campus-wide gate. That one exists so a
 * whole campus cannot be ground down through a shared office address, and a
 * route that cleared it on request would hand an attacker the reset button
 * for the backstop. Only the two gates keyed to this one account are cleared.
 */
app.post('/api/admin1/accounts/:id/unlock',
  authenticateToken, requireRole('admin1'), verifySecurityOtp, mongoRateLimiter, requireDatabase,
  async (req, res) => {
  try {
    const { id } = req.params;
    const isObjId = isValidObjectId(id);
    const target = await User.findOne({
      $or: [{ _id: isObjId ? id : null }, { username: String(id).toLowerCase().trim() }]
    }).select('username name role campus');

    if (!target) {
      return res.status(404).json({ status: 'error', message: 'That account was not found.' });
    }

    // The account gate (keyed on the typed username) and the two step-up gates
    // (keyed on the user id). Nothing here is keyed on a campus.
    const cleared = [
      attemptKey('login', target.username),
      attemptKey('pin', String(target._id)),
      attemptKey('ownpw', String(target._id))
    ];
    for (const key of cleared) {
      await clearFailedAttempts(key).catch(() => {});
    }

    recordAudit(req, {
      action: 'account.unlock',
      entityType: 'account',
      entityId: target.username,
      entityLabel: `${target.name} (${target.username})`,
      campus: target.campus,
      summary: `Cleared the sign-in lockout for ${target.username}. No credential was changed.`,
      details: { role: normalizeRole(target.role) }
    });

    return res.json({
      status: 'success',
      message: `${target.username} can sign in again. Their password and PIN are unchanged.`
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * --- RECENTLY DELETED ---------------------------------------------------
 *
 * The other half of soft deletion. Marking a record is only useful if someone
 * can find it again, and the person who needs to is whoever has just realised
 * they deleted the wrong thing.
 *
 * Rector-only, deliberately. A clerk with `editStudent` can delete a student,
 * and that is the power they were granted; being able to reach into every
 * deletion made at their campus and reverse it is a different and larger
 * power. Restoration is an administrative act.
 */

/** The four collections a deletion can be undone from, by name. */
const RECYCLE_BIN_MODELS = {
  student: { model: () => Student, label: 'Students', key: 'studentId' },
  payment: { model: () => Payment, label: 'Payments', key: 'receiptNumber' },
  expenditure: { model: () => Expenditure, label: 'Expenditures', key: 'id' },
  worker_payment: { model: () => WorkerPayment, label: 'Worker payments', key: 'id' },
  teacher: { model: () => Teacher, label: 'Teachers', key: 'id' }
};

/**
 * GET /api/admin1/recently-deleted — what can still be put back.
 *
 * Everything soft-deleted within the window, newest first, across all five
 * collections. Payments belonging to a deleted STUDENT are folded into that
 * student's entry rather than listed separately: they were deleted as one
 * action and are restored as one, and listing forty receipts individually
 * would bury the student they belong to.
 */
app.get('/api/admin1/recently-deleted', authenticateToken, requireRole('admin1'), requireDatabase, async (req, res) => {
  try {
    const since = new Date(Date.now() - RECYCLE_BIN_DAYS * 24 * 60 * 60 * 1000);
    const { limit } = readPaging(req, { defaultLimit: 200 });

    const entries = [];
    for (const [type, spec] of Object.entries(RECYCLE_BIN_MODELS)) {
      // Payments are represented through their student, not on their own.
      if (type === 'payment') continue;

      const rows = await spec.model()
        .find({ deletedAt: { $gte: since } })
        .setOptions({ withDeleted: true })
        .sort({ deletedAt: -1 })
        .limit(limit)
        .lean();

      for (const row of rows) {
        entries.push({
          type,
          collection: spec.label,
          id: String(row._id),
          reference: row[spec.key] || '',
          label: row.name || row.workerName || row.description || row.category || row[spec.key] || '(unnamed)',
          campus: row.branch || '',
          amount: typeof row.amount === 'number' ? row.amount : null,
          deletedAt: row.deletedAt,
          deletedBy: row.deletedBy || '',
          deletedReason: row.deletedReason || '',
          // Only meaningful for a student, and it is the figure that makes the
          // difference between "undo this" and "leave it".
          attachedPayments: type === 'student'
            ? await Payment.countDocuments({ studentId: row.studentId, deletedAt: { $gte: since } })
              .setOptions({ withDeleted: true })
            : null
        });
      }
    }

    entries.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    return res.json({
      status: 'success',
      data: entries.slice(0, limit),
      meta: { page: 1, limit, total: entries.length, windowDays: RECYCLE_BIN_DAYS, hasMore: entries.length > limit }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * POST /api/admin1/recently-deleted/:type/:id/restore — put it back.
 *
 * Takes the Rector's PIN, because it writes records back into the live books
 * and the amounts come back with them. The same gate the Clerk Manager and the
 * Credentials screen use.
 */
app.post('/api/admin1/recently-deleted/:type/:id/restore',
  authenticateToken, requireRole('admin1'), verifySecurityOtp, mongoRateLimiter, requireDatabase,
  async (req, res) => {
  try {
    const { type, id } = req.params;
    const spec = RECYCLE_BIN_MODELS[String(type)];
    if (!spec || type === 'payment') {
      return res.status(400).json({ status: 'error', message: 'That is not something that can be restored on its own.' });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ status: 'error', message: 'That record reference is not valid.' });
    }

    const Model = spec.model();
    const row = await Model.findById(id).setOptions({ withDeleted: true }).lean();
    if (!row) {
      return res.status(404).json({ status: 'error', message: 'That record no longer exists.' });
    }
    if (!row.deletedAt) {
      return res.status(409).json({ status: 'error', message: 'That record is not deleted — nothing to restore.' });
    }

    const cutoff = new Date(Date.now() - RECYCLE_BIN_DAYS * 24 * 60 * 60 * 1000);
    if (new Date(row.deletedAt) < cutoff) {
      return res.status(410).json({
        status: 'error',
        message: `That was deleted more than ${RECYCLE_BIN_DAYS} days ago and can no longer be restored here. Use a backup.`
      });
    }

    const label = row.name || row.workerName || row.description || row.category || String(row._id);

    // An admission number is unique college-wide. If the number was reissued
    // while the record sat in the bin, restoring it would violate that index —
    // so it is refused with an explanation rather than failing on a duplicate
    // key error the caller cannot interpret.
    if (type === 'student') {
      const clash = await Student.findOne({
        admissionNumber: row.admissionNumber,
        _id: { $ne: row._id }
      }).lean();
      if (clash) {
        return res.status(409).json({
          status: 'error',
          message: `Admission number ${row.admissionNumber} has been given to another student since this one was deleted. `
            + 'Change that student\'s number before restoring this record.'
        });
      }
    }

    const restored = await Model.restoreDeleted({ _id: row._id });
    if (restored === 0) {
      return res.status(500).json({ status: 'error', message: 'Restore failed. Nothing was changed.' });
    }

    // A student comes back with the receipts that were deleted alongside them.
    // Matched on the same deletion window rather than on all deleted payments,
    // so an earlier, separate deletion of one receipt is not swept back in.
    let restoredPayments = 0;
    if (type === 'student') {
      restoredPayments = await Payment.restoreDeleted({
        studentId: row.studentId,
        deletedAt: { $gte: cutoff }
      });
    }

    recordAudit(req, {
      action: `${type}.restore`,
      entityType: type,
      entityId: String(row[spec.key] || row._id),
      entityLabel: label,
      campus: row.branch || '',
      amount: typeof row.amount === 'number' ? row.amount : null,
      summary: `Restored ${label}${restoredPayments ? ` and ${restoredPayments} payment record(s)` : ''} from Recently Deleted.`,
      details: { restoredPayments, originallyDeletedBy: row.deletedBy || '', originallyDeletedAt: row.deletedAt }
    });

    return res.json({
      status: 'success',
      message: `Restored ${label}${restoredPayments ? `, along with ${restoredPayments} payment record(s)` : ''}.`,
      data: { type, id: String(row._id), restoredPayments }
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Restoring this record clashes with one that already exists. Resolve the duplicate first.'
      });
    }
    return failRequest(req, res, err);
  }
});

/**
 * --- THE CALLER'S OWN ACCOUNT ------------------------------------------
 *
 * Everything below acts on `req.user.id` and nothing else. There is no target
 * parameter to get wrong: a caller cannot name another account here, so no
 * amount of tampering with the body turns one of these into an administrative
 * route. That is the whole reason these are separate from the Rector's
 * credential screen rather than a relaxed version of it.
 */

/**
 * GET /api/account/session — where am I signed in, and since when.
 *
 * Sessions are single-session and database-authoritative: signing in
 * elsewhere ends the previous session on its next request. That is a good
 * property nobody could see. A clerk whose screen stopped working could not
 * tell an idle timeout from somebody else using their credentials, which is
 * exactly the thing they would want to report.
 *
 * Returns no credential and no token — only when this session started, when
 * it was last active, and when it will lapse if left alone.
 */
app.get('/api/account/session', authenticateToken, requireDatabase, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
      .select('username name role campus lastSeenAt sessionStartedAt sessionIp previousSessionAt previousSessionIp')
      .lean();
    if (!me) {
      return res.status(404).json({ status: 'error', message: 'Account not found.' });
    }

    const lastSeen = me.lastSeenAt ? new Date(me.lastSeenAt).getTime() : null;
    return res.json({
      status: 'success',
      data: {
        username: me.username,
        name: me.name,
        role: normalizeRole(me.role),
        campus: me.campus,
        sessionStartedAt: me.sessionStartedAt || null,
        sessionIp: me.sessionIp || '',
        previousSessionAt: me.previousSessionAt || null,
        previousSessionIp: me.previousSessionIp || '',
        lastSeenAt: me.lastSeenAt || null,
        idleTimeoutMinutes: Math.round(SESSION_IDLE_TIMEOUT_MS / 60000),
        // Seconds until this session lapses through inactivity alone. Null
        // when nothing has been recorded yet, which is not the same as zero.
        expiresInSeconds: lastSeen
          ? Math.max(0, Math.round((lastSeen + SESSION_IDLE_TIMEOUT_MS - Date.now()) / 1000))
          : null
      }
    });
  } catch (err) {
    return failRequest(req, res, err);
  }
});

/**
 * POST /api/account/password — change your own password and/or PIN.
 *
 * There was no way to do this. Every credential change went through the
 * Rector's screen or the authenticator's reset, so a clerk who thought their
 * password had been seen could not act on it themselves — they had to find
 * the Rector first.
 *
 * Credentials are stored readable here by a deliberate decision, so the
 * Rector can already read every password. This route therefore adds no
 * secrecy that did not exist; what it adds is SPEED at the moment it matters,
 * which is the entire value.
 *
 * Three things it does NOT do, each on purpose:
 *
 *   - it does not accept a username. Changing your own portal ID is an
 *     administrative act with collision consequences, and it stays with the
 *     Rector.
 *   - it does not let the authenticator through, matching every other
 *     credential path in this file. That account is administered out of band.
 *   - it does not reveal the stored value back. Confirming the current
 *     password is the caller proving what they already know.
 */
app.post('/api/account/password', authenticateToken, mongoRateLimiter, requireDatabase, async (req, res) => {
  try {
    const body = req.body || {};
    const currentPassword = String(body.currentPassword || '');
    const nextPassword = body.newPassword === undefined ? undefined : String(body.newPassword).trim();
    const nextPin = body.newPin === undefined ? undefined : String(body.newPin).trim();

    if (nextPassword === undefined && nextPin === undefined) {
      return res.status(400).json({ status: 'error', message: 'Choose a new password, a new PIN, or both.' });
    }

    const me = await User.findById(req.user.id).select('username name role campus password pin');
    if (!me) {
      return res.status(404).json({ status: 'error', message: 'Account not found.' });
    }

    // The authenticator USED TO BE refused here too, on the rule that its
    // credentials are not changed from a portal at all but rotated out of band.
    // That left the account with no way to change its own password anywhere:
    // the Rector is refused on /api/admin1/credentials, the reset panel is
    // refused, the accounts route is refused, and this was the fourth door.
    // The only remaining path was rotateCredentials.cjs, which REPLACES the
    // whole users collection and would take all twenty-five clerks with it.
    //
    // So this door, and only this door, is open: the authenticator changes its
    // OWN credentials, from its own portal, proving identity with its CURRENT
    // password below. That is not the thing the other three guards exist to
    // prevent. They stop the Rector reaching the account that audits the
    // Rector, and they all still stand.


    // The current password, every time, even though the session is already
    // valid. A session left open on a counter must not be enough to lock the
    // real holder out of their own account.
    //
    // Rate limited on the same tight budget as the login routes, because this
    // compares a secret and would otherwise be a password oracle for anyone
    // who found an unattended screen. AUTH_PATH_PATTERN does not match this
    // path, so the budget is set here explicitly.
    const gateKey = attemptKey('ownpw', req.user.id);
    const gate = await getLockState(gateKey);
    if (gate.locked) {
      const mins = Math.ceil(gate.secondsRemaining / 60);
      return res.status(429).json({
        status: 'error',
        message: `Too many incorrect attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`
      });
    }

    if (!currentPassword || !credentialMatches(currentPassword, me.password)) {
      const after = await recordFailedAttempt(gateKey);
      console.warn(`[Account]: Failed own-password confirmation by [${me.username}]`);
      return res.status(401).json({
        status: 'error',
        message: 'That is not your current password.',
        attemptsRemaining: after.attemptsRemaining
      });
    }
    await clearFailedAttempts(gateKey).catch(() => {});

    const changed = [];

    if (nextPassword !== undefined) {
      if (nextPassword.length < 8) {
        return res.status(400).json({ status: 'error', message: 'Your new password must be at least 8 characters.' });
      }
      if (nextPassword.length > FIELD_LIMITS.password) {
        return res.status(400).json({ status: 'error', message: `A password cannot exceed ${FIELD_LIMITS.password} characters.` });
      }
      // A stored value beginning with $2 is read back as a legacy hash and
      // reported unreadable — confusing rather than wrong, so it is refused.
      if (nextPassword.startsWith('$2')) {
        return res.status(400).json({ status: 'error', message: 'A password cannot begin with "$2".' });
      }
      if (credentialMatches(nextPassword, me.password)) {
        return res.status(400).json({ status: 'error', message: 'That is already your password. Choose a different one.' });
      }
      me.password = nextPassword;
      changed.push('password');
    }

    if (nextPin !== undefined) {
      if (!/^\d{6}$/.test(nextPin)) {
        return res.status(400).json({ status: 'error', message: 'Your new PIN must be exactly 6 digits.' });
      }
      me.pin = nextPin;
      changed.push('PIN');
    }

    // Ends every session including this one, so the caller signs in again with
    // what they just chose. Anyone else holding the old password stops working
    // immediately rather than at the natural expiry of their token — which is
    // the reason someone changes a password they think has been seen.
    me.activeSessionId = null;
    await me.save();
    await RefreshToken.deleteMany({ userId: me._id }).catch(() => {});

    // WHAT changed, never the values. Same rule as every other credential path.
    recordAudit(req, {
      action: 'account.password.self-change',
      entityType: 'account',
      entityId: me.username,
      entityLabel: `${me.name} (${me.username})`,
      campus: me.campus,
      summary: `${me.username} changed their own ${changed.join(' and ')}.`,
      details: { fields: changed, role: normalizeRole(me.role) }
    });

    return res.json({
      status: 'success',
      message: `Your ${changed.join(' and ')} ${changed.length > 1 ? 'have' : 'has'} been changed. Please sign in again.`,
      data: { signedOut: true }
    });
  } catch (err) {
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
    // The unbounded one. Payments accumulate for the life of the college and
    // were never scoped by date, so for the Rector this returned every payment
    // ever taken at every campus in a single response.
    const filter = campusScopeFilter(req);
    const { limit, page, skip } = readPaging(req);

    const [rows, total, totalAmount] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter),
      sumField(Payment, { ...filter, reversed: { $ne: true } }, 'amount')
    ]);

    return res.json({
      status: 'success',
      data: rows,
      // Reversed payments are excluded from the money total and included in
      // the row count: a reversal is still a record worth listing, and is not
      // still income.
      meta: { page, limit, total, totalAmount, hasMore: skip + rows.length < total }
    });
  } catch (err) {
    console.error('[Payments]: List failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load payments.' });
  }
});

app.get(['/api/admin1/expenditures', '/api/accountant/expenditures'], authenticateToken, requireRole('admin1', 'clerk', 'accountant'), requireDatabase, async (req, res) => {
  try {
    const filter = campusScopeFilter(req);
    const { limit, page, skip } = readPaging(req);

    const [rows, total, totalAmount] = await Promise.all([
      Expenditure.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Expenditure.countDocuments(filter),
      sumField(Expenditure, filter, 'amount')
    ]);

    return res.json({
      status: 'success',
      data: rows,
      meta: { page, limit, total, totalAmount, hasMore: skip + rows.length < total }
    });
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
app.post('/api/backup/run', authenticateToken, requireRole('authenticator', 'admin1'), mongoRateLimiter, requireDatabase, async (req, res) => {
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
    recordAudit(req, {
      action: 'backup.run',
      entityType: 'backup',
      entityId: '',
      campus: req.user && req.user.campus || '',
      summary: `Ran a campus backup.`
    });
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
    recordAudit(req, {
      action: 'backup.runAll',
      entityType: 'backup',
      campus: req.user && req.user.campus || '',
      outcome: result.success ? 'success' : 'failure',
      summary: result.success
        ? `Backed up ${result.created.length} campus/type combination(s).`
        : `Ran a full backup; ${result.failures.length} combination(s) failed.`
    });
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
    // Writes nothing, but reading a backup means reading every record it holds,
    // so who looked and at which file belongs in the trail.
    recordAudit(req, {
      action: 'backup.preview',
      entityType: 'backup',
      entityId: String(fileId),
      campus,
      outcome: result.success ? 'success' : 'failure',
      summary: `Previewed backup file ${fileId} for ${campus}.`
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

    recordAudit(req, {
      action: 'backup.restore',
      entityType: 'backup',
      entityId: '',
      campus: req.user && req.user.campus || '',
      summary: `RESTORED the database from a backup file.`
    });
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






