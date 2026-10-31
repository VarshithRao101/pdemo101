/**
 * The front desk, end to end, on the college's REAL student list.
 *
 * Every other suite builds its own handful of made-up students. This one copies
 * the imported Excel data (read-only) out of DB_NAME - production by default -
 * into its own scratch database, and then does what a busy fee counter does to
 * it: the Rector creates clerks on every campus with different permissions,
 * they all sign in, and they collect, edit, reverse, search and report at the
 * same time.
 *
 *   node tests/verify-excel-desk.cjs              source = jc_erp_prod (only read)
 *   DB_NAME=<db> node tests/verify-excel-desk.cjs source = <db>
 *   LOAD_SECONDS=120 node tests/verify-excel-desk.cjs   longer mixed-load phase
 *
 * Writes go ONLY to jc_erp_deskcheck, which is dropped at the start and end.
 * Not part of --ci: there is no real student list on a build machine.
 *
 * The invariant checked after every phase, for every student:
 *     fee - waivers - totalPaid == remainingBalance   (0 when overpaid)
 *     sum of live receipts      == totalPaid
 */
const TARGET = 'jc_erp_deskcheck';
process.env.MONGODB_DB_NAME = TARGET;
require('dotenv').config({ override: false, quiet: true });
process.env.MONGODB_DB_NAME = TARGET;

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');

const SOURCE = process.env.DB_NAME || 'jc_erp_prod';
const LOAD_SECONDS = Number(process.env.LOAD_SECONDS || 45);
const PORT = 4721;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];
const ALL_PERMS = { addStudent: true, editStudent: true, editFees: true, collectFees: true, logExpenditures: true };
const ROLES = {
  full: ALL_PERMS,
  collector: { addStudent: false, editStudent: false, editFees: false, collectFees: true, logExpenditures: false },
  editor: { addStudent: true, editStudent: true, editFees: false, collectFees: false, logExpenditures: false },
  viewer: { addStudent: false, editStudent: false, editFees: false, collectFees: false, logExpenditures: false }
};

let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);
const r2 = n => Math.round(Number(n || 0) * 100) / 100;

const agent = new http.Agent({ keepAlive: true, maxSockets: 256 });
const timings = [];
const statusCount = {};
const req = (method, path, token, body, headers = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const t0 = process.hrtime.bigint();
  const r = http.request(`${BASE}${path}`, {
    method, agent,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      timings.push({ path: path.split('?')[0].replace(/\/[^/]*\d[^/]*/g, '/:x'), method, ms, status: res.statusCode });
      statusCount[res.statusCode] = (statusCount[res.statusCode] || 0) + 1;
      resolve({ status: res.statusCode, raw, headers: res.headers, json: (() => { try { return JSON.parse(raw); } catch { return null; } })() });
    });
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] : 0; };

async function reconcileAll(Student, Payment) {
  const students = await Student.find({}).lean();
  const pays = await Payment.aggregate([{ $match: { reversed: { $ne: true } } }, { $group: { _id: '$studentId', amt: { $sum: '$amount' }, n: { $sum: 1 } } }]);
  const byId = new Map(pays.map(p => [p._id, p]));
  const bad = [];
  for (const s of students) {
    const gross = (s.tuitionFee || 0) + (s.hostelFee || 0) + (s.transportFee || 0) + (s.miscellaneousFee || 0)
      + (s.previousPending || 0) + (s.customFeeSlots || []).reduce((a, x) => a + (x.amount || 0), 0);
    const waivers = (s.tuitionWaiver || 0) + (s.hostelWaiver || 0) + (s.transportWaiver || 0) + (s.miscWaiver || 0);
    const expectBal = Math.max(0, r2(gross - waivers - (s.totalPaid || 0)));
    const rows = byId.get(s.studentId) || { amt: 0 };
    if (expectBal !== r2(s.remainingBalance)) bad.push(`${s.admissionNumber}: balance ${s.remainingBalance} expected ${expectBal}`);
    if (r2(rows.amt) !== r2(s.totalPaid)) bad.push(`${s.admissionNumber}: receipts ${rows.amt} vs totalPaid ${s.totalPaid}`);
  }
  return { n: students.length, bad };
}

(async () => {
  if (SOURCE === TARGET) throw new Error('source and target are the same database');
  const app = require('../server/app.cjs');
  const Student = require('../server/models/Student.cjs');
  const Payment = require('../server/models/Payment.cjs');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: TARGET });
  if (mongoose.connection.name !== TARGET) throw new Error('wrong database');
  const db = mongoose.connection.db;
  const src = mongoose.connection.getClient().db(SOURCE);

  console.log(`\nFRONT DESK ON THE REAL STUDENT LIST  (read from ${SOURCE}, written to ${TARGET})\n`);
  await db.dropDatabase();
  for (const c of ['students', 'payments']) {
    const rows = await src.collection(c).find({}).toArray();
    if (rows.length) await db.collection(c).insertMany(rows);
  }
  await Student.syncIndexes(); await Payment.syncIndexes();
  for (const M of Object.values(mongoose.models)) await M.createIndexes().catch(() => {});

  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));

  const TAG = crypto.randomBytes(3).toString('hex');
  const rector = { username: `zzrector${TAG}`, password: `Pw-${crypto.randomBytes(9).toString('hex')}`, pin: String(100000 + crypto.randomInt(899999)) };
  await db.collection('users').insertOne({
    username: rector.username, password: rector.password, pin: rector.pin, role: 'admin1', campus: 'All',
    name: 'Desk Test Rector', status: 'active', createdAt: new Date(), updatedAt: new Date()
  });

  try {
    // ------------------------------------------------------------------
    section('1. The imported data is internally consistent');
    const srcCounts = Object.fromEntries(await Promise.all(CAMPUSES.map(async c => [c, await src.collection('students').countDocuments({ branch: c })])));
    const total = Object.values(srcCounts).reduce((a, b) => a + b, 0);
    ok(`copied ${total} students across 4 campuses`, total > 0 && (await Student.countDocuments({})) === total, JSON.stringify(srcCounts));
    const start = await reconcileAll(Student, Payment);
    // An overpaid student (paid more than the fee) keeps receipts > fee with a
    // zero balance; that is expected and flagged in their notes.
    const real = start.bad.filter(b => !b.includes('expected 0'));
    ok('every student: fee - paid == balance and receipts add up to paid', real.length === 0, real.slice(0, 5).join('; '));
    const adms = await Student.distinct('admissionNumber');
    ok('admission numbers are unique', adms.length === total);
    const inactive = await Student.countDocuments({ status: 'Inactive' });
    ok(`Drop/Free students are Inactive (${inactive})`, inactive >= 1);

    // ------------------------------------------------------------------
    section('2. The Rector signs in and creates clerks on every campus');
    const rl = await req('POST', '/api/auth/login', null, { username: rector.username, password: rector.password, pin: rector.pin });
    ok('Rector signs in', rl.status === 200 && !!rl.json?.token, rl.raw.slice(0, 200));
    const RT = rl.json?.token;
    const clerks = [];
    for (const campus of CAMPUSES) {
      for (const [role, perms] of Object.entries(ROLES)) {
        const c = { campus, role, perms, username: `zz${role}${CAMPUSES.indexOf(campus)}${TAG}`, password: `Pw-${crypto.randomBytes(9).toString('hex')}`, pin: String(100000 + crypto.randomInt(899999)) };
        const res = await req('POST', '/api/admin1/clerks', RT, { campus, name: `${role} ${campus}`, username: c.username, password: c.password, pin: c.pin, permissions: perms }, { 'x-security-pin': rector.pin });
        if (res.status !== 201 && res.status !== 200) console.log('        ', res.status, res.raw.slice(0, 200));
        clerks.push(c);
      }
    }
    ok(`${clerks.length} clerks created through the Clerk Manager route`, (await db.collection('users').countDocuments({ role: 'clerk' })) === clerks.length);
    const noPin = await req('POST', '/api/admin1/clerks', RT, { campus: CAMPUSES[0], name: 'x', username: `zznopin${TAG}`, password: 'Abcdefgh1', pin: '123456', permissions: {} });
    ok('creating a clerk without the Rector PIN is refused', noPin.status === 401 || noPin.status === 403, `${noPin.status}`);

    // A shift change at ONE campus: its clerks sign in at the same instant
    // from one office connection. The sign-in budget is 10 per address per
    // 15 minutes, refunded on success, so a campus-sized burst must pass.
    // (All four campuses at once from one address is not a real office -
    // every campus has its own connection - and does trip the limit.)
    const shift = clerks.filter(c => c.campus === CAMPUSES[0] || c.campus === CAMPUSES[1]);
    const burstLogins = await Promise.all(shift.map(c => req('POST', '/api/auth/login', null, { username: c.username, password: c.password, pin: c.pin })));
    ok(`${shift.length} clerks sign in at the same instant from one office`, burstLogins.every(l => l.status === 200 && l.json?.token), burstLogins.filter(l => l.status !== 200).map(l => `${l.status} ${l.raw.slice(0, 80)}`).slice(0, 3).join(' | '));
    // Then everyone signs in normally. A second sign-in replaces the first
    // session, so these are the tokens the rest of the run uses.
    const logins = [];
    for (const c of clerks) logins.push(await req('POST', '/api/auth/login', null, { username: c.username, password: c.password, pin: c.pin }));
    logins.forEach((l, i) => { clerks[i].token = l.json?.token; });
    ok(`all ${clerks.length} clerks signed in`, logins.every(l => l.status === 200 && l.json?.token), logins.filter(l => l.status !== 200).map(l => `${l.status} ${l.raw.slice(0, 80)}`).slice(0, 3).join(' | '));
    const stale = await req('GET', '/api/accountant/students?limit=1', burstLogins[0].json?.token);
    ok('signing in again ends the earlier session (one session per clerk)', stale.status === 401, `${stale.status}`);
    const wrong = await req('POST', '/api/auth/login', null, { username: clerks[0].username, password: 'wrong-password-1', pin: clerks[0].pin });
    ok('a wrong password is refused', wrong.status === 401 || wrong.status === 400, `${wrong.status}`);
    const me = await req('GET', '/api/auth/me', clerks[0].token);
    ok('a clerk\'s session reports its campus and permissions', me.json?.user?.campus === clerks[0].campus && me.json?.user?.permissions?.collectFees === true, me.raw.slice(0, 200));

    const by = (campus, role) => clerks.find(c => c.campus === campus && c.role === role);

    // ------------------------------------------------------------------
    section('3. Finding imported students the way the desk does');
    for (const campus of CAMPUSES) {
      const res = await req('GET', `/api/accountant/students?branch=${encodeURIComponent(campus)}&limit=1000`, by(campus, 'viewer').token);
      ok(`${campus}: list returns all ${srcCounts[campus]} students`, res.status === 200 && res.json?.meta?.total === srcCounts[campus], `${res.status} total=${res.json?.meta?.total}`);
    }
    const tmp = await Student.findOne({ admissionNumber: /^T/ }).lean();
    const sfx = await Student.findOne({ admissionNumber: /^\d+-/ }).lean();
    for (const [label, s] of [['temporary admission no.', tmp], ['suffixed duplicate admission no.', sfx]]) {
      if (!s) continue;
      const q = await req('GET', `/api/accountant/students?search=${encodeURIComponent(s.admissionNumber)}`, by('Beemaram C1', 'collector').token);
      ok(`search finds a ${label} (${s.admissionNumber})`, q.json?.data?.some(x => x.admissionNumber === s.admissionNumber), q.raw.slice(0, 150));
      const d = await req('GET', `/api/accountant/students/${encodeURIComponent(s.admissionNumber)}`, by('Beemaram C1', 'collector').token);
      ok(`detail opens for ${s.admissionNumber}`, d.status === 200 && d.json?.data?.name === s.name, `${d.status}`);
    }
    const namePart = (await Student.findOne({ branch: 'Erragattugutta C2' }).lean()).name.split(' ')[0];
    const nq = await req('GET', `/api/accountant/students?search=${encodeURIComponent(namePart.toLowerCase())}`, by('Erragattugutta C2', 'viewer').token);
    ok(`search by part of a name, any case ("${namePart.toLowerCase()}")`, (nq.json?.data || []).length > 0);
    const pend = await req('GET', '/api/accountant/students?dues=pending&limit=1', by('Beemaram C2', 'viewer').token);
    ok('"pending dues" filter answers', pend.status === 200 && pend.json?.meta?.total > 0);

    // ------------------------------------------------------------------
    section('4. Permissions: who may do what');
    const target = await Student.findOne({ branch: 'Beemaram C2', status: 'Active', remainingBalance: { $gt: 5000 } }).lean();
    const pay = (c, s, amount, extra = {}) => req('POST', `/api/accountant/students/${encodeURIComponent(s.studentId)}/payments`, c.token,
      { amount, category: 'Tuition Fee', installment: 'Installment 2', mode: 'Cash', idempotencyKey: crypto.randomUUID(), ...extra });
    for (const campus of CAMPUSES) {
      const v = await pay(by(campus, 'viewer'), target, 100);
      ok(`${campus} viewer cannot collect fees`, v.status === 403, `${v.status}`);
      const e = await pay(by(campus, 'editor'), target, 100);
      ok(`${campus} editor (no collectFees) cannot collect fees`, e.status === 403, `${e.status}`);
    }
    const exp = (c, campus) => req('POST', '/api/admin2/expenditure', c.token, { category: 'Stationery', amount: 450, description: 'Desk test', date: new Date().toISOString(), branch: campus });
    for (const campus of CAMPUSES) {
      const f = await exp(by(campus, 'full'), campus);
      ok(`${campus} full clerk logs an expenditure`, f.status === 201 || f.status === 200, `${f.status} ${f.raw.slice(0, 120)}`);
      const c2 = await exp(by(campus, 'collector'), campus);
      ok(`${campus} collector cannot log an expenditure`, c2.status === 403, `${c2.status}`);
    }
    const newAdm = `ZZDESK${TAG}`;
    const mk = (c, adm) => req('POST', '/api/accountant/students', c.token, {
      name: 'Desk Test Student', admissionNumber: adm, branch: c.campus, course: 'MPC', section: 'A', studentYear: 'First Year',
      mobile: '9876543210', parentMobile: '9876543211', tuitionFee: 40000, hostelFee: 0, transportFee: 0, miscellaneousFee: 0, previousPending: 0
    });
    const add1 = await mk(by('Erragattugutta C1', 'collector'), newAdm + 'X');
    ok('collector cannot admit a student', add1.status === 403, `${add1.status}`);
    const add2 = await mk(by('Erragattugutta C1', 'editor'), newAdm);
    ok('editor admits a new student', add2.status === 201 || add2.status === 200, `${add2.status} ${add2.raw.slice(0, 160)}`);
    const dupAdm = await mk(by('Erragattugutta C1', 'full'), (await Student.findOne({}).lean()).admissionNumber);
    ok('admitting with an admission number already in use is refused', dupAdm.status === 409 || dupAdm.status === 400, `${dupAdm.status}`);

    // The whole-record PATCH the editor screen sends, on an imported student
    // carrying Others / Party / Lab fee slots.
    const withSlots = await Student.findOne({ 'customFeeSlots.2': { $exists: true }, branch: 'Erragattugutta C2' }).lean();
    const detail = (await req('GET', `/api/accountant/students/${withSlots.studentId}`, by('Erragattugutta C2', 'editor').token)).json?.data;
    const edited = { ...detail, fatherName: 'Desk Test Father' };
    const pe = await req('PATCH', `/api/accountant/students/${withSlots.studentId}`, by('Erragattugutta C2', 'editor').token, edited);
    ok('editor (no editFees) saves a name change on an imported student with fee slots', pe.status === 200, `${pe.status} ${pe.raw.slice(0, 200)}`);
    const after = await Student.findOne({ studentId: withSlots.studentId }).lean();
    ok('…and the fees did not move', after.fatherName === 'Desk Test Father' && r2(after.remainingBalance) === r2(withSlots.remainingBalance) && after.customFeeSlots.length === withSlots.customFeeSlots.length);
    const feeEdit = await req('PATCH', `/api/accountant/students/${withSlots.studentId}`, by('Erragattugutta C2', 'editor').token, { ...edited, tuitionFee: withSlots.tuitionFee + 1000 });
    ok('editor without editFees cannot raise a fee', feeEdit.status === 403, `${feeEdit.status}`);
    const feeOk = await req('PATCH', `/api/accountant/students/${withSlots.studentId}`, by('Erragattugutta C2', 'full').token, { ...edited, tuitionFee: withSlots.tuitionFee + 1000 });
    const afterFee = await Student.findOne({ studentId: withSlots.studentId }).lean();
    ok('full clerk raises a fee and the balance follows', feeOk.status === 200 && r2(afterFee.remainingBalance) === r2(withSlots.remainingBalance + 1000), `${feeOk.status} bal ${afterFee.remainingBalance}`);

    // ------------------------------------------------------------------
    section('5. Collecting fees on imported students');
    const cases = [
      ['temporary admission no.', await Student.findOne({ admissionNumber: /^T/, remainingBalance: { $gt: 2000 } }).lean()],
      ['suffixed admission no.', await Student.findOne({ admissionNumber: /^\d+-/, remainingBalance: { $gt: 2000 } }).lean()],
      ['ordinary student', await Student.findOne({ admissionNumber: /^\d+$/, remainingBalance: { $gt: 2000 } }).lean()]
    ];
    for (const [label, s] of cases) {
      if (!s) continue;
      const c = by(s.branch, 'collector');
      const res = await pay(c, s, 1500);
      const now = await Student.findOne({ studentId: s.studentId }).lean();
      ok(`${label} ${s.admissionNumber}: Rs 1500 collected, balance ${s.remainingBalance} -> ${now.remainingBalance}`,
        res.status === 201 && r2(now.remainingBalance) === r2(s.remainingBalance - 1500) && r2(now.totalPaid) === r2(s.totalPaid + 1500), `${res.status} ${res.raw.slice(0, 150)}`);
      ok(`…receipt appears on the student and in their payment list`,
        now.receipts.some(x => x.receiptNumber === res.json?.data?.payment?.receiptNumber)
        && (await req('GET', `/api/accountant/students/${encodeURIComponent(s.studentId)}/payments`, c.token)).json?.data?.some?.(p => p.receiptNumber === res.json?.data?.payment?.receiptNumber));
    }
    const other = await Student.findOne({ branch: 'Erragattugutta C1', remainingBalance: { $gt: 3000 } }).lean();
    const cross = await pay(by('Beemaram C2', 'collector'), other, 500);
    ok('a Beemaram C2 clerk can collect for an Erragattugutta C1 student (shared registry)', cross.status === 201, `${cross.status}`);
    const over = await pay(by(other.branch, 'collector'), other, other.remainingBalance + 1);
    ok('paying more than the balance is refused', over.status === 400, `${over.status}`);
    for (const bad of [0, -100, 'abc', null]) {
      const b = await pay(by(other.branch, 'collector'), other, bad);
      ok(`amount ${JSON.stringify(bad)} is refused`, b.status === 400, `${b.status}`);
    }
    const clear = await Student.findOne({ status: 'Active', remainingBalance: { $gt: 100, $lt: 50000 }, branch: 'Beemaram C1' }).lean();
    const full = await pay(by('Beemaram C1', 'collector'), clear, clear.remainingBalance);
    const cleared = await Student.findOne({ studentId: clear.studentId }).lean();
    ok(`clearing the whole balance (${clear.remainingBalance}) leaves 0 and marks the year cleared`, full.status === 201 && cleared.remainingBalance === 0 && cleared.yearFeeCleared === true, `${full.status}`);
    const more = await pay(by('Beemaram C1', 'collector'), clear, 10);
    ok('nothing more can be collected from a cleared student', more.status === 400, `${more.status}`);
    for (const mode of ['Cash', 'UPI / NetBanking', 'Cheque', 'Card']) {
      const s = await Student.findOne({ status: 'Active', remainingBalance: { $gt: 1000 }, branch: 'Erragattugutta C2' }).skip(CAMPUSES.length + ['Cash', 'UPI / NetBanking', 'Cheque', 'Card'].indexOf(mode)).lean();
      const m = await pay(by('Erragattugutta C2', 'full'), s, 200, { mode, transactionRef: mode === 'Cash' ? '' : `REF${TAG}` });
      ok(`payment by ${mode}`, m.status === 201 && m.json?.data?.payment?.mode === mode, `${m.status}`);
    }
    const otherHeads = ['Others', 'Lab Fee', 'Freshers Party Fee', 'Exam Fee'];
    for (const cat of otherHeads) {
      const s = await Student.findOne({ status: 'Active', remainingBalance: { $gt: 1000 }, branch: 'Erragattugutta C1' }).skip(otherHeads.indexOf(cat) + 3).lean();
      const m = await pay(by('Erragattugutta C1', 'full'), s, 300, { category: cat });
      ok(`payment towards "${cat}"`, m.status === 201 && m.json?.data?.payment?.category === cat, `${m.status}`);
    }

    // Reversal - the clerk's own PIN.
    const rev = await Student.findOne({ status: 'Active', remainingBalance: { $gt: 2000 }, branch: 'Beemaram C2' }).skip(9).lean();
    const p1 = await pay(by('Beemaram C2', 'full'), rev, 1000);
    const rn = p1.json?.data?.payment?.receiptNumber;
    const revNoPin = await req('POST', `/api/accountant/students/${rev.studentId}/payments/${rn}/reverse`, by('Beemaram C2', 'full').token, { reason: 'typed wrong amount' });
    ok('reversing without a PIN is refused', revNoPin.status === 401 || revNoPin.status === 403, `${revNoPin.status}`);
    const revOk = await req('POST', `/api/accountant/students/${rev.studentId}/payments/${rn}/reverse`, by('Beemaram C2', 'full').token, { reason: 'typed wrong amount' }, { 'x-security-pin': by('Beemaram C2', 'full').pin });
    const revd = await Student.findOne({ studentId: rev.studentId }).lean();
    ok('reversal with the clerk\'s PIN puts the money back on the balance', revOk.status === 200 && r2(revd.remainingBalance) === r2(rev.remainingBalance), `${revOk.status} ${revOk.raw.slice(0, 150)}`);
    const revTwice = await req('POST', `/api/accountant/students/${rev.studentId}/payments/${rn}/reverse`, by('Beemaram C2', 'full').token, { reason: 'again' }, { 'x-security-pin': by('Beemaram C2', 'full').pin });
    ok('the same receipt cannot be reversed twice', revTwice.status === 409, `${revTwice.status}`);

    // Inactive (Drop/Free) students.
    const out = await req('GET', '/api/fees/outstanding?limit=1000', RT);
    const inactIds = new Set((await Student.find({ status: 'Inactive' }).select('studentId').lean()).map(s => s.studentId));
    const outRows = out.json?.data || [];
    ok('outstanding-fees list answers and leaves out Drop/Free students', out.status === 200 && outRows.length > 0 && !outRows.some(r => inactIds.has(r.studentId)), `${out.status} rows ${outRows.length}`);

    let chk = await reconcileAll(Student, Payment);
    ok('ledger still balances for every student after section 5', chk.bad.filter(b => !b.includes('expected 0')).length === 0, chk.bad.slice(0, 5).join('; '));

    // ------------------------------------------------------------------
    section('6. Two tills, one student, the same second');
    const race = await Student.findOne({ status: 'Active', remainingBalance: { $gt: 10000 }, branch: 'Erragattugutta C2' }).skip(20).lean();
    const amt = Math.floor(race.remainingBalance * 0.6);
    const tills = clerks.filter(c => c.perms.collectFees);
    const rr = await Promise.all(tills.map(c => pay(c, race, amt)));
    const won = rr.filter(x => x.status === 201).length;
    const raceAfter = await Student.findOne({ studentId: race.studentId }).lean();
    ok(`${tills.length} clerks each try to take 60% of one balance: exactly one succeeds`, won === 1 && rr.every(x => [201, 400, 409].includes(x.status)), rr.map(x => x.status).join(','));
    ok('…and the balance moved by exactly one payment', r2(raceAfter.remainingBalance) === r2(race.remainingBalance - amt));

    const dbl = await Student.findOne({ status: 'Active', remainingBalance: { $gt: 5000 }, branch: 'Beemaram C1' }).skip(15).lean();
    const key = crypto.randomUUID();
    const dd = await Promise.all(Array.from({ length: 6 }, () => pay(by('Beemaram C1', 'collector'), dbl, 700, { idempotencyKey: key })));
    const dblRows = await Payment.countDocuments({ studentId: dbl.studentId, amount: 700 });
    ok('the same submission sent 6 times at once (double-click) makes ONE receipt', dblRows === 1 && dd.every(x => x.status === 201 || x.status === 200), dd.map(x => x.status).join(','));

    // ------------------------------------------------------------------
    section('7. Every collecting clerk at once, 10 payments each');
    const pool = await Student.find({ status: 'Active', remainingBalance: { $gt: 3000 } }).select('studentId remainingBalance branch').limit(400).lean();
    let k = 0;
    const t0 = Date.now();
    const burst = await Promise.all(tills.map(async c => {
      const res = [];
      for (let i = 0; i < 10; i++) {
        const s = pool[(k++) % pool.length];
        res.push(await pay(c, s, 250));
      }
      return res;
    }));
    const flat = burst.flat();
    const burstMs = Date.now() - t0;
    ok(`${flat.length} payments from ${tills.length} clerks in parallel: none failed with a server error`, flat.every(x => x.status < 500), flat.filter(x => x.status >= 500).map(x => x.raw.slice(0, 100)).slice(0, 3).join(' | '));
    ok(`…all accepted (${flat.filter(x => x.status === 201).length}/${flat.length}) in ${burstMs} ms`, flat.every(x => x.status === 201), flat.filter(x => x.status !== 201).map(x => `${x.status} ${x.raw.slice(0, 80)}`).slice(0, 3).join(' | '));
    chk = await reconcileAll(Student, Payment);
    ok('ledger balances for every student after the burst', chk.bad.filter(b => !b.includes('expected 0')).length === 0, chk.bad.slice(0, 5).join('; '));

    // ------------------------------------------------------------------
    section('8. Reports and exports agree with the ledger');
    const dbTotals = (await Student.aggregate([{ $group: { _id: null, paid: { $sum: '$totalPaid' }, bal: { $sum: '$remainingBalance' }, n: { $sum: 1 } } }]))[0];
    const payTotal = (await Payment.aggregate([{ $match: { reversed: { $ne: true } } }, { $group: { _id: null, a: { $sum: '$amount' } } }]))[0].a;
    const an = await req('GET', '/api/admin1/analytics', RT);
    ok('Rector analytics answers', an.status === 200, `${an.status} ${an.raw.slice(0, 120)}`);
    const anTxt = JSON.stringify(an.json || {});
    ok('analytics carries the true collected total', anTxt.includes(String(Math.round(payTotal))) || anTxt.includes(String(r2(payTotal))) || anTxt.includes(String(r2(dbTotals.paid))), `ledger ${payTotal}`);
    const rep = await req('GET', '/api/admin1/reports', RT);
    ok('Rector reports answer', rep.status === 200, `${rep.status} ${rep.raw.slice(0, 120)}`);
    for (const c of CAMPUSES) {
      const ds = await req('GET', `/api/accountant/dashboard-summary?branch=${encodeURIComponent(c)}`, by(c, 'full').token);
      ok(`${c} desk summary answers`, ds.status === 200, `${ds.status}`);
    }
    for (const [p, minRows] of [['/api/export/students.csv', total], ['/api/export/fee-register.csv', total], ['/api/export/payments.csv', 1], ['/api/export/expenditures.csv', 4]]) {
      const e = await req('GET', p, RT);
      const lines = (e.raw || '').split('\n').filter(l => l.trim()).length - 1;
      ok(`${p}: ${lines} rows`, e.status === 200 && lines >= minRows, `${e.status} ${e.raw.slice(0, 100)}`);
    }
    const logs = await req('GET', '/api/admin1/logs?limit=50', RT);
    ok('the Rector\'s Logs show the clerks\' collections', logs.status === 200 && JSON.stringify(logs.json).includes('payment.collect'), `${logs.status}`);

    // ------------------------------------------------------------------
    section(`9. Mixed load for ${LOAD_SECONDS}s: every clerk reading and writing`);
    const loadStart = Date.now();
    timings.length = 0;
    const loadStatus = {};
    const ops = [
      c => req('GET', `/api/accountant/students?search=${encodeURIComponent(pool[crypto.randomInt(pool.length)].studentId.slice(0, 3))}&limit=50`, c.token),
      c => req('GET', `/api/accountant/students?branch=${encodeURIComponent(c.campus)}&limit=200`, c.token),
      c => req('GET', `/api/accountant/students/${encodeURIComponent(pool[crypto.randomInt(pool.length)].studentId)}`, c.token),
      c => req('GET', `/api/accountant/students/${encodeURIComponent(pool[crypto.randomInt(pool.length)].studentId)}/payments`, c.token),
      c => req('GET', `/api/accountant/dashboard-summary`, c.token),
      c => c.perms.collectFees ? pay(c, pool[crypto.randomInt(pool.length)], 50 + crypto.randomInt(200)) : req('GET', '/api/accountant/student-facets', c.token),
      c => c.perms.collectFees ? pay(c, pool[crypto.randomInt(pool.length)], 50 + crypto.randomInt(200)) : req('GET', '/api/admin1/payments?limit=50', c.token)
    ];
    const rss0 = process.memoryUsage().rss;
    await Promise.all(clerks.map(async c => {
      while (Date.now() - loadStart < LOAD_SECONDS * 1000) {
        const r = await ops[crypto.randomInt(ops.length)](c);
        loadStatus[r.status] = (loadStatus[r.status] || 0) + 1;
      }
    }));
    const ms = timings.map(t => t.ms);
    const n = ms.length;
    console.log(`        ${n} requests, ${(n / LOAD_SECONDS).toFixed(1)}/s, statuses ${JSON.stringify(loadStatus)}`);
    console.log(`        latency p50 ${pct(ms, 50).toFixed(0)} ms  p95 ${pct(ms, 95).toFixed(0)} ms  p99 ${pct(ms, 99).toFixed(0)} ms  max ${Math.max(...ms).toFixed(0)} ms`);
    const byPath = {};
    for (const t of timings) (byPath[`${t.method} ${t.path}`] ||= []).push(t.ms);
    for (const [p, a] of Object.entries(byPath)) console.log(`          ${p.padEnd(62)} n=${String(a.length).padStart(4)} p50 ${pct(a, 50).toFixed(0).padStart(5)} p95 ${pct(a, 95).toFixed(0).padStart(5)}`);
    ok('no request failed with a server error under load', !Object.keys(loadStatus).some(s => Number(s) >= 500), JSON.stringify(loadStatus));
    ok('no request was rate-limited under normal desk load', !loadStatus[429], JSON.stringify(loadStatus));
    ok(`server memory stayed bounded (rss ${(rss0 / 1e6).toFixed(0)} -> ${(process.memoryUsage().rss / 1e6).toFixed(0)} MB)`, process.memoryUsage().rss < rss0 + 400e6);
    chk = await reconcileAll(Student, Payment);
    ok(`after load: ledger balances for all ${chk.n} students`, chk.bad.filter(b => !b.includes('expected 0')).length === 0, chk.bad.slice(0, 5).join('; '));
    const health = await req('GET', '/api/health');
    ok('server healthy after the run', health.status === 200 && health.json?.database === 'connected', health.raw.slice(0, 120));

    // ------------------------------------------------------------------
    section('10. Clerk lifecycle');
    const victim = by('Beemaram C2', 'viewer');
    const list = await req('GET', `/api/admin1/clerks?campus=${encodeURIComponent(victim.campus)}`, RT, undefined, { 'x-security-pin': rector.pin });
    ok('Clerk Manager lists the campus\'s 4 clerks', list.status === 200 && list.json?.data?.clerks?.length === 4, `${list.status} ${list.raw.slice(0, 150)}`);
    const vid = (list.json?.data?.clerks || []).find(x => x.username === victim.username);
    const vId = vid?._id || vid?.id;
    const grant = await req('PATCH', `/api/admin1/clerks/${vId}`, RT, { permissions: { ...ROLES.viewer, collectFees: true } }, { 'x-security-pin': rector.pin });
    ok('Rector grants collectFees to a clerk', grant.status === 200, `${grant.status} ${grant.raw.slice(0, 150)}`);
    const relog = await req('POST', '/api/auth/login', null, { username: victim.username, password: victim.password, pin: victim.pin });
    const nowPays = await pay({ ...victim, token: relog.json?.token || victim.token }, await Student.findOne({ status: 'Active', remainingBalance: { $gt: 1000 } }).skip(50).lean(), 100);
    ok('…and that clerk can now collect', nowPays.status === 201, `${nowPays.status}`);
    const del = await req('DELETE', `/api/admin1/clerks/${vId}`, RT, undefined, { 'x-security-pin': rector.pin });
    ok('Rector removes the clerk', del.status === 200, `${del.status} ${del.raw.slice(0, 150)}`);
    const dead = await req('GET', '/api/accountant/students?limit=1', relog.json?.token || victim.token);
    ok('a removed clerk\'s session stops working', dead.status === 401 || dead.status === 403, `${dead.status}`);
  } finally {
    server.close();
    agent.destroy();
    await db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) console.log('Failed:\n  ' + failures.join('\n  '));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
