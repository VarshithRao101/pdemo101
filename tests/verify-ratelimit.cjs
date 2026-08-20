/**
 * Phase 21 — rate limiting and lockout.
 *
 * Four budgets, each chosen for a different threat:
 *
 *   10   auth routes            password guessing
 *   10   the public enquiry form   an anonymous flood
 *    8   the public receipt link   four digits, 10,000 combinations
 *  120   everything else           a runaway client
 *
 * A limiter has two failure modes and they pull in opposite directions. Too
 * loose and it stops nothing. Too tight — or keyed too broadly — and it locks
 * out the college itself: fifteen clerks share one office connection, and a
 * shift change puts a dozen correct sign-ins through one address inside a
 * quarter of an hour. Both directions are tested here.
 *
 * Scratch database, dropped at the end.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_verify';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_verify';

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');
const { rateLimitBudgetFor } = require('../server/app.cjs');

const PORT = 4621;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, p, token, body) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${p}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({ status: res.statusCode, raw, json: (() => { try { return JSON.parse(raw); } catch { return null; } })() }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 21 — RATE LIMITING AND LOCKOUT  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  const limits = db.collection('ratelimits');
  const clearLimits = () => limits.deleteMany({});
  const clearAttempts = () => db.collection('loginattempts').deleteMany({});

  const TAG = crypto.randomBytes(3).toString('hex');
  const STAFF = Array.from({ length: 12 }, (_, i) => ({
    username: `zzrl${TAG}${i}`, password: `Pw-${crypto.randomBytes(8).toString('hex')}`
  }));

  try {
    await db.collection('users').insertMany(STAFF.map((s, i) => ({
      username: s.username, password: s.password, pin: String(300000 + i),
      role: 'clerk', campus: CAMPUS, name: `RL ${i}`, status: 'active',
      permissions: { addStudent: true, editStudent: true, editFees: true,
                     collectFees: true, logExpenditures: true, manageStaff: true },
      activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
    })));

    // =================================================================
    section('The budgets are what they claim to be');

    const TIERS = [
      ['/api/auth/login', 10, 'password guessing'],
      ['/api/enquiries', 10, 'an anonymous flood'],
      ['/r/REC-1/abc', 8, 'four digits against 10,000 combinations'],
      ['/api/accountant/students', 120, 'a runaway client']
    ];
    for (const [path, expected, why] of TIERS) {
      ok(`${path} is budgeted at ${expected} (${why})`,
        rateLimitBudgetFor(path) === expected,
        `got ${rateLimitBudgetFor(path)}`);
    }
    ok('the receipt-link pattern does not catch the print helper',
      rateLimitBudgetFor('/r-print.js') === 120, String(rateLimitBudgetFor('/r-print.js')));
    ok('the public-form pattern does not catch the enquiry inbox read',
      rateLimitBudgetFor('/api/enquiries/abc123') === 120,
      String(rateLimitBudgetFor('/api/enquiries/abc123')));

    // =================================================================
    section('A shift change must not lock the office out');

    // Twelve clerks on one office connection, every password correct. This is
    // the failure the college would actually hit: the auth budget is ten per
    // address, so without refunding the attempt a SUCCESSFUL sign-in spends,
    // the eleventh person with the right password is told to go away.
    await clearLimits();
    await clearAttempts();
    let refusedStaff = 0, signedIn = 0;
    for (const s of STAFF) {
      const res = await req('POST', '/api/auth/login', null,
        { username: s.username, password: s.password });
      if (res.status === 429) refusedStaff++;
      else if (res.json?.token) signedIn++;
    }
    ok(`twelve correct sign-ins from one address all succeed (${signedIn}/12, ${refusedStaff} refused)`,
      refusedStaff === 0 && signedIn === 12,
      `${signedIn} in, ${refusedStaff} told to wait — a shift change would close the counter`);

    // =================================================================
    section('Guessing is still stopped');

    // The same budget, spent on WRONG passwords, must run out. A refunded
    // success is not a refunded failure.
    await clearLimits();
    await clearAttempts();
    let guessRefusedAt = null;
    for (let i = 1; i <= 20; i++) {
      const res = await req('POST', '/api/auth/login', null,
        { username: `zzghost${TAG}`, password: `guess-${i}` });
      if (res.status === 429) { guessRefusedAt = i; break; }
    }
    ok('repeated wrong passwords are eventually refused by the limiter',
      guessRefusedAt !== null, '20 guesses from one address, none refused');
    ok(`it runs out within 12 guesses (refused at ${guessRefusedAt})`,
      guessRefusedAt !== null && guessRefusedAt <= 12);

    // =================================================================
    section('The window and the key');

    await clearLimits();
    await req('POST', '/api/auth/login', null, { username: 'zzx', password: 'zzx' });
    const row = await limits.findOne({});
    ok('a counter is written for the attempt', !!row, 'nothing recorded');
    ok('it is keyed by path and address', /ratelimit_.+_/.test(String(row?.key || '')),
      `key ${row?.key}`);
    // The field is resetAt, and the collection carries a TTL index so the row
    // is removed once the window closes. A counter with neither would lock an
    // address out permanently after ten mistyped passwords.
    ok('it carries a reset time, so the window ends', !!row?.resetAt,
      'a counter with no expiry locks the address out forever');
    const remaining = row?.resetAt ? (new Date(row.resetAt).getTime() - Date.now()) / 60000 : 0;
    ok(`the window is about fifteen minutes (${remaining.toFixed(1)} min)`,
      remaining > 5 && remaining <= 20, `${remaining.toFixed(1)} minutes`);

    // Two different paths must not share a budget: spending the login budget
    // must not close the fee counter.
    await clearLimits();
    for (let i = 0; i < 12; i++) {
      await req('POST', '/api/auth/login', null, { username: 'zzy', password: `p${i}` });
    }
    const loginBlocked = await req('POST', '/api/auth/login', null,
      { username: 'zzy', password: 'p' });
    const token = (await (async () => {
      await limits.deleteMany({ key: /login/ });
      const r = await req('POST', '/api/auth/login', null,
        { username: STAFF[0].username, password: STAFF[0].password });
      return r.json?.token;
    })());
    const otherPath = await req('GET', '/api/accountant/students', token);
    ok('exhausting the login budget does not close other routes',
      loginBlocked.status === 429 && otherPath.status === 200,
      `login ${loginBlocked.status}, students ${otherPath.status}`);

    // =================================================================
    section('When the limiter itself cannot work');

    // The store is MongoDB. If it is unreachable the limiter cannot know
    // whether this request is the first or the thousandth — and the safe
    // answer is to refuse, not to wave everything through. An earlier version
    // called next() here, which turned a database blip into an unlimited door.
    const limiterSrc = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'server', 'app.cjs'), 'utf8');
    // Comments are stripped first. The handler explains, in prose, that an
    // earlier version "called next() here" — and scanning the raw text matched
    // that explanation and reported the fixed code as still broken.
    const body = limiterSrc
      .slice(limiterSrc.indexOf('async function mongoRateLimiter'),
             limiterSrc.indexOf('async function mongoRateLimiter') + 2600)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');
    ok('an unreachable limit store refuses rather than admits',
      /readyState !== 1/.test(body) && /throw new Error\('Rate limit store unreachable/.test(body),
      'the limiter falls open when Mongo is down');
    ok('a duplicate-key race does not fall through to next()',
      !/duplicate[\s\S]{0,200}next\(\)/i.test(body),
      'a race in the counter would admit the request');

    // =================================================================
    section('The tight tiers hold');

    await clearLimits();
    let enquiryRefusedAt = null;
    for (let i = 1; i <= 20; i++) {
      const res = await req('POST', '/api/enquiries', null, {
        studentName: `Flood ${i}`, mobile: `98${String(20000000 + i).slice(-8)}`,
        preferredCampus: CAMPUS
      });
      if (res.status === 429) { enquiryRefusedAt = i; break; }
    }
    ok('the public form runs out', enquiryRefusedAt !== null, '20 submissions, none refused');
    ok(`it runs out within 12 (refused at ${enquiryRefusedAt})`,
      enquiryRefusedAt !== null && enquiryRefusedAt <= 12);

    await clearLimits();
    let receiptRefusedAt = null;
    for (let i = 1; i <= 20; i++) {
      const res = await req('POST', `/r/REC-zz-${TAG}/${'x'.repeat(22)}`, null, {});
      if (res.status === 429) { receiptRefusedAt = i; break; }
    }
    ok('guessing a receipt link runs out', receiptRefusedAt !== null,
      '20 attempts against a four-digit code, none refused');
    ok(`it runs out within 10 (refused at ${receiptRefusedAt})`,
      receiptRefusedAt !== null && receiptRefusedAt <= 10);

    // Opening a receipt link — as opposed to guessing at it — must never be
    // limited, or a parent who reloads twice is locked out of their own
    // receipt.
    await clearLimits();
    let openRefused = 0;
    for (let i = 0; i < 25; i++) {
      const res = await req('GET', `/r/REC-zz-${TAG}/${'x'.repeat(22)}`, null);
      if (res.status === 429) openRefused++;
    }
    ok('opening a receipt link is never rate limited', openRefused === 0,
      `${openRefused} of 25 refused — a parent reloading would be locked out`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 21 — RATE LIMITING: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    if (mongoose.connection.name === 'jc_erp_verify') {
      await mongoose.connection.dropDatabase();
      console.log('  (scratch database dropped)');
    }
    server.close();
    await mongoose.disconnect();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
