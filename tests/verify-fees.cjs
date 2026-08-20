/**
 * Phase 7 — fee structure and waivers.
 *
 * The arithmetic that decides what a family owes. Three questions:
 *
 *   1. Does the identity hold? gross - waivers - paid = balance, floored at
 *      zero, for standard heads and custom slots alike.
 *   2. Is a discount bounded? A waiver may not exceed the fee it discounts.
 *      That rule is worth nothing if there is a second way to reduce a bill
 *      that skips it.
 *   3. Can only the people meant to change fees change them?
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
const Student = require('../server/models/Student.cjs');

const PORT = 4607;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUS = 'Beemaram C2';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, path, token, body) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${path}`, {
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

let seq = 0;
const newStudent = async (token, over = {}) => {
  const body = {
    name: 'Fee Test', admissionNumber: `ZZF${String(Date.now()).slice(-6)}${String(++seq).padStart(2, '0')}`,
    branch: CAMPUS, course: 'MPC', section: 'A', studentYear: 'First Year',
    mobile: '9876543210', parentMobile: '9876543211',
    tuitionFee: 50000, hostelFee: 20000, transportFee: 10000,
    miscellaneousFee: 5000, previousPending: 0,
    ...over
  };
  const res = await req('POST', '/api/accountant/students', token, body);
  if (!res.json?.data) throw new Error(`create failed: ${res.raw.slice(0, 200)}`);
  return res.json.data;
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 7 — FEE STRUCTURE AND WAIVERS  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Student.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All', perms: true },
    { key: 'clerk', role: 'clerk', campus: CAMPUS, perms: true },
    { key: 'bare', role: 'clerk', campus: CAMPUS, perms: false }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzfee${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '778899',
        role: a.role, campus: a.campus, name: `Fee ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: a.perms,
                       collectFees: true, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }

    // =================================================================
    section('The arithmetic');

    const s = await newStudent(tokens.clerk);
    const GROSS = 50000 + 20000 + 10000 + 5000;
    ok(`gross is the sum of the heads (${s.remainingBalance}/${GROSS})`,
      s.remainingBalance === GROSS, `got ${s.remainingBalance}`);

    const breakdown = await req('GET',
      `/api/admin1/students/${s.studentId}/fee-breakdown`, tokens.admin1);
    ok('the breakdown endpoint agrees with the stored balance',
      breakdown.status === 200 &&
      Number(breakdown.json?.data?.balance ?? breakdown.json?.data?.remainingBalance) === GROSS,
      `status ${breakdown.status}: ${breakdown.raw.slice(0, 200)}`);

    // =================================================================
    section('Waivers');

    const w = await newStudent(tokens.clerk);
    const applied = await req('PATCH', `/api/admin1/students/${w.studentId}/fee-override`,
      tokens.admin1, { tuitionWaiver: 10000, hostelWaiver: 5000, transportWaiver: 0, miscWaiver: 0 });
    ok('a valid waiver is accepted', applied.status < 300, `status ${applied.status}: ${applied.raw.slice(0, 160)}`);
    const afterWaiver = await Student.findOne({ studentId: w.studentId }).lean();
    ok(`the balance drops by exactly the waiver (${afterWaiver.remainingBalance}/${GROSS - 15000})`,
      afterWaiver.remainingBalance === GROSS - 15000, `got ${afterWaiver.remainingBalance}`);

    const over = await req('PATCH', `/api/admin1/students/${w.studentId}/fee-override`,
      tokens.admin1, { tuitionWaiver: 999999, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0 });
    ok('a waiver larger than its own fee is refused', over.status === 400, `status ${over.status}`);

    const REJECT_WAIVER = [
      ['a negative waiver', { tuitionWaiver: -1 }],
      ['a waiver of NaN', { tuitionWaiver: 'NaN' }],
      ['a waiver of Infinity', { tuitionWaiver: 'Infinity' }],
      ['a waiver as an object', { tuitionWaiver: { $gt: 0 } }],
      ['a waiver as an array', { tuitionWaiver: [1, 2] }]
    ];
    for (const [label, body] of REJECT_WAIVER) {
      const res = await req('PATCH', `/api/admin1/students/${w.studentId}/fee-override`,
        tokens.admin1, { tuitionWaiver: 0, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0, ...body });
      ok(`${label} is refused`, res.status === 400, `status ${res.status}`);
    }

    // A waiver arriving as a string must ADD, never concatenate. "500" + 200
    // giving "500200" was a real defect in an earlier copy of this arithmetic.
    const strWaiver = await newStudent(tokens.clerk);
    await req('PATCH', `/api/admin1/students/${strWaiver.studentId}/fee-override`,
      tokens.admin1, { tuitionWaiver: '500', hostelWaiver: '200', transportWaiver: 0, miscWaiver: 0 });
    const strAfter = await Student.findOne({ studentId: strWaiver.studentId }).lean();
    ok(`a numeric string waiver adds rather than concatenates (${strAfter.remainingBalance})`,
      strAfter.remainingBalance === GROSS - 700, `got ${strAfter.remainingBalance}`);

    // =================================================================
    section('Who may change a fee');

    const byClerk = await req('PATCH', `/api/admin1/students/${w.studentId}/fee-override`,
      tokens.clerk, { tuitionWaiver: 1000, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0 });
    ok('a clerk cannot set a waiver', byClerk.status === 403, `status ${byClerk.status}`);

    const settingsBare = await req('PATCH', '/api/admin2/fee-settings', tokens.bare,
      { branch: CAMPUS, tuition: 1000 });
    ok('a clerk without editFees cannot change campus fee settings',
      settingsBare.status === 403, `status ${settingsBare.status}`);

    const settingsOk = await req('PATCH', '/api/admin2/fee-settings', tokens.clerk,
      { branch: CAMPUS, tuition: 60000, hostel: 20000, transport: 10000, misc: 5000 });
    ok('a clerk with editFees can change campus fee settings',
      settingsOk.status < 300, `status ${settingsOk.status}: ${settingsOk.raw.slice(0, 160)}`);

    const settingsBad = await req('PATCH', '/api/admin2/fee-settings', tokens.clerk,
      { branch: CAMPUS, tuition: -5 });
    ok('a negative campus fee is refused', settingsBad.status === 400, `status ${settingsBad.status}`);

    // =================================================================
    section('Custom fee slots');

    const c = await newStudent(tokens.clerk);
    const withSlot = await req('PATCH', `/api/admin1/students/${c.studentId}/fee-override`,
      tokens.admin1, {
        tuitionWaiver: 0, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0,
        customFeeSlots: [{ id: 'lab', name: 'Lab Fee', amount: 3000 }]
      });
    ok('a custom slot is accepted', withSlot.status < 300, `status ${withSlot.status}`);
    const slotAfter = await Student.findOne({ studentId: c.studentId }).lean();
    ok(`a custom slot adds to the bill (${slotAfter.remainingBalance}/${GROSS + 3000})`,
      slotAfter.remainingBalance === GROSS + 3000, `got ${slotAfter.remainingBalance}`);

    // The rule that a discount cannot exceed the fee it applies to is worth
    // nothing if a NEGATIVE custom slot can reduce the bill without limit —
    // and without ever appearing in the waiver totals a report would show.
    const neg = await newStudent(tokens.clerk);
    const negRes = await req('PATCH', `/api/admin1/students/${neg.studentId}/fee-override`,
      tokens.admin1, {
        tuitionWaiver: 0, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0,
        customFeeSlots: [{ id: 'x', name: 'Special Concession', amount: -80000 }]
      });
    const negAfter = await Student.findOne({ studentId: neg.studentId }).lean();
    ok('a negative custom slot is refused',
      negRes.status === 400 && negAfter.remainingBalance === GROSS,
      `status ${negRes.status}, balance ${negAfter.remainingBalance} (was ${GROSS}) `
      + '— an uncapped discount that no waiver report would ever show');

    const nanSlot = await req('PATCH', `/api/admin1/students/${c.studentId}/fee-override`,
      tokens.admin1, {
        tuitionWaiver: 0, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0,
        customFeeSlots: [{ id: 'y', name: 'Broken', amount: 'NaN' }]
      });
    ok('a custom slot of NaN is refused', nanSlot.status === 400, `status ${nanSlot.status}`);

    const namelessSlot = await req('PATCH', `/api/admin1/students/${c.studentId}/fee-override`,
      tokens.admin1, {
        tuitionWaiver: 0, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0,
        customFeeSlots: [{ id: 'z', amount: 100 }]
      });
    ok('a custom slot with no name is refused', namelessSlot.status === 400,
      `status ${namelessSlot.status}`);

    // =================================================================
    section('The cap');

    const capped = await req('PATCH', `/api/admin1/students/${c.studentId}/fee-override`,
      tokens.admin1, {
        tuitionWaiver: 0, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0,
        customFeeSlots: [{ id: 'huge', name: 'Huge', amount: 5000000 }]
      });
    ok('fees beyond the ten lakh cap are refused', capped.status === 400, `status ${capped.status}`);
    const capAfter = await Student.findOne({ studentId: c.studentId }).lean();
    ok('the refused cap breach changed nothing',
      capAfter.remainingBalance === GROSS + 3000, `balance ${capAfter.remainingBalance}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 7 — FEES: ${pass} passed, ${fail} failed`);
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
