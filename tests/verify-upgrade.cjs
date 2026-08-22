/**
 * Phase 10 — year upgrade and archival.
 *
 * Closing a year is the only operation that DESTROYS current state: the fee
 * structure, the receipts and the running total are all overwritten by next
 * year's. If the archive is wrong, last year's money is simply gone — there is
 * no second copy to recover it from, and the loss is silent because the new
 * year looks perfectly healthy.
 *
 * So the question throughout is conservation. Before and after an upgrade:
 *
 *     sum(payments)  ==  live totalPaid  +  every archived totalPaid
 *
 * and every receipt that was visible before is still readable somewhere after.
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
const Payment = require('../server/models/Payment.cjs');
const { awaitAudit } = require('./lib/audit.cjs');

const PORT = 4610;
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

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 10 — YEAR UPGRADE AND ARCHIVAL  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Student.syncIndexes();
  await Payment.syncIndexes();

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All', fees: true },
    { key: 'clerk', role: 'clerk', campus: CAMPUS, fees: true },
    { key: 'bare', role: 'clerk', campus: CAMPUS, fees: false }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzup${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '667788',
        role: a.role, campus: a.campus, name: `Up ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: a.fees,
                       collectFees: true, logExpenditures: true, manageStaff: true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }

    const newStudent = async (fee = 20000, over = {}) => {
      const res = await req('POST', '/api/accountant/students', tokens.clerk, {
        name: 'Upgrade Test', admissionNumber: `ZZU${String(Date.now()).slice(-6)}${String(++seq).padStart(2, '0')}`,
        branch: CAMPUS, course: 'MPC', section: 'A', studentYear: 'First Year',
        academicYear: '2026-2027', mobile: '9876543210', parentMobile: '9876543211',
        tuitionFee: fee, hostelFee: 0, transportFee: 0, miscellaneousFee: 0, previousPending: 0,
        ...over
      });
      if (!res.json?.data) throw new Error(`create failed: ${res.raw.slice(0, 200)}`);
      return res.json.data;
    };
    const payOff = async (id, amount) =>
      req('POST', `/api/accountant/students/${id}/payments`, tokens.clerk, { amount });
    const upgrade = (id, token, body = {}) =>
      req('POST', `/api/accountant/students/${id}/upgrade`, token, body);

    // =================================================================
    section('Who may be upgraded');

    const owing = await newStudent(20000);
    await payOff(owing.studentId, 5000);
    const owingTry = await upgrade(owing.studentId, tokens.clerk);
    ok('a student who still owes fees cannot be upgraded', owingTry.status === 409,
      `status ${owingTry.status}: ${owingTry.raw.slice(0, 140)}`);

    const shortTerm = await newStudent(10000, { studentYear: 'Short Term' });
    await payOff(shortTerm.studentId, 10000);
    const shortTry = await upgrade(shortTerm.studentId, tokens.clerk);
    ok('a Short Term student is not upgraded to a second year', shortTry.status === 409,
      `status ${shortTry.status}`);

    // A balance that is not a number must never read as cleared. NaN fails
    // every comparison, so `balance > 0` is false and a corrupt record would
    // otherwise sail through as eligible.
    const corrupt = await newStudent(20000);
    await db.collection('students').updateOne(
      { studentId: corrupt.studentId }, { $set: { remainingBalance: NaN } });
    const corruptTry = await upgrade(corrupt.studentId, tokens.clerk);
    ok('a balance that is not a number blocks the upgrade', corruptTry.status === 409,
      `status ${corruptTry.status}: ${corruptTry.raw.slice(0, 140)}`);

    const barePaid = await newStudent(10000);
    await payOff(barePaid.studentId, 10000);
    const bareTry = await upgrade(barePaid.studentId, tokens.bare);
    ok('a clerk without editFees cannot upgrade', bareTry.status === 403, `status ${bareTry.status}`);

    // =================================================================
    section('Closing the year');

    const s = await newStudent(20000);
    await payOff(s.studentId, 12000);
    await payOff(s.studentId, 8000);
    const before = await Student.findOne({ studentId: s.studentId }).lean();
    const paymentsBefore = await Payment.find({ studentId: s.studentId }).lean();
    ok('the student is fully paid before upgrading',
      before.remainingBalance === 0 && before.totalPaid === 20000,
      `balance ${before.remainingBalance}, paid ${before.totalPaid}`);

    const up = await upgrade(s.studentId, tokens.clerk, { tuitionFee: 30000 });
    ok('a fully paid first year upgrades', up.status < 300, `status ${up.status}: ${up.raw.slice(0, 200)}`);

    const after = await Student.findOne({ studentId: s.studentId }).lean();
    ok('the student is now in the second year', after.studentYear === 'Second Year',
      `year is ${after.studentYear}`);
    ok('the academic year advances (2026-2027 -> 2027-2028)',
      after.academicYear === '2027-2028', `got ${after.academicYear}`);
    ok('one year is archived', (after.yearHistory || []).length === 1,
      `${(after.yearHistory || []).length} entries`);

    const archived = (after.yearHistory || [])[0] || {};
    ok('the archive records the closing year', archived.studentYear === 'First Year',
      `got ${archived.studentYear}`);
    ok(`the archive records what was payable (${archived.totalPayable}/20000)`,
      archived.totalPayable === 20000, `got ${archived.totalPayable}`);
    ok(`the archive records what was paid (${archived.totalPaid}/20000)`,
      archived.totalPaid === 20000, `got ${archived.totalPaid}`);
    ok('the archive records who closed it and when',
      !!archived.closedBy && !!archived.closedAt,
      `closedBy ${archived.closedBy}, closedAt ${archived.closedAt}`);
    ok(`the archive keeps the closing fee structure (${archived.tuitionFee}/20000)`,
      archived.tuitionFee === 20000, `got ${archived.tuitionFee}`);

    ok(`last year's receipts are archived (${(archived.receipts || []).length}/2)`,
      (archived.receipts || []).length === 2, `${(archived.receipts || []).length} archived`);
    const archivedNos = new Set((archived.receipts || []).map(r => r.receiptNumber));
    ok('every receipt from last year survived the close',
      (before.receipts || []).every(r => archivedNos.has(r.receiptNumber)),
      `${(before.receipts || []).map(r => r.receiptNumber).join(', ')} vs ${[...archivedNos].join(', ')}`);

    ok('the new year starts with nothing paid', after.totalPaid === 0, `got ${after.totalPaid}`);
    ok('the new year starts with no receipts', (after.receipts || []).length === 0,
      `${(after.receipts || []).length} carried over`);
    ok(`the new fee structure is applied (${after.tuitionFee}/30000)`,
      after.tuitionFee === 30000, `got ${after.tuitionFee}`);
    ok(`the new balance is the new fee (${after.remainingBalance}/30000)`,
      after.remainingBalance === 30000, `got ${after.remainingBalance}`);

    // --- Conservation ----------------------------------------------
    const paymentsAfter = await Payment.find({ studentId: s.studentId }).lean();
    ok('the payments collection is untouched by the close',
      paymentsAfter.length === paymentsBefore.length, `${paymentsBefore.length} -> ${paymentsAfter.length}`);
    const paidRows = paymentsAfter.reduce((a, p) => a + p.amount, 0);
    const claimed = (after.totalPaid || 0)
      + (after.yearHistory || []).reduce((a, y) => a + Number(y.totalPaid || 0), 0);
    ok(`every rupee survives the close (${paidRows} = ${claimed})`, paidRows === claimed,
      `${paidRows} receipted, ${claimed} accounted for`);

    // =================================================================
    section('Doing it twice');

    const again = await upgrade(s.studentId, tokens.clerk, { tuitionFee: 40000 });
    ok('a second year cannot be upgraded again', again.status === 409, `status ${again.status}`);
    const afterAgain = await Student.findOne({ studentId: s.studentId }).lean();
    ok('the refused re-run archived nothing extra',
      (afterAgain.yearHistory || []).length === 1,
      `${(afterAgain.yearHistory || []).length} entries`);
    ok('the refused re-run left the fees alone',
      afterAgain.tuitionFee === 30000, `got ${afterAgain.tuitionFee}`);

    // =================================================================
    section('What the upgrade form may not do');

    const w = await newStudent(15000);
    await payOff(w.studentId, 15000);
    const waiverTry = await upgrade(w.studentId, tokens.clerk,
      { tuitionFee: 20000, tuitionWaiver: 5000 });
    ok('a clerk cannot write off fees through the upgrade form',
      waiverTry.status === 403, `status ${waiverTry.status}`);
    const wAfter = await Student.findOne({ studentId: w.studentId }).lean();
    ok('the refused waiver left the student in the first year',
      wAfter.studentYear === 'First Year', `got ${wAfter.studentYear}`);

    const denied = await awaitAudit(db, {
      entityId: w.studentId, outcome: 'denied'
    });
    ok('the refusal is written to the audit trail', !!denied,
      'a refused write-off leaves no trace');

    const capTry = await upgrade(w.studentId, tokens.admin1, { tuitionFee: 5000000 });
    ok('the upgrade form cannot set fees above the cap', capTry.status === 400,
      `status ${capTry.status}`);
    const negTry = await upgrade(w.studentId, tokens.admin1, { tuitionFee: -100 });
    ok('the upgrade form cannot set a negative fee', negTry.status === 400,
      `status ${negTry.status}`);

    // The Rector may waive, and the arithmetic must follow.
    const rectorUp = await upgrade(w.studentId, tokens.admin1,
      { tuitionFee: 20000, tuitionWaiver: 5000 });
    ok('the Rector may set a waiver while upgrading', rectorUp.status < 300,
      `status ${rectorUp.status}: ${rectorUp.raw.slice(0, 160)}`);
    const wUp = await Student.findOne({ studentId: w.studentId }).lean();
    ok(`the waiver applies to the new balance (${wUp.remainingBalance}/15000)`,
      wUp.remainingBalance === 15000, `got ${wUp.remainingBalance}`);

    // =================================================================
    section('The ledger after all of it');

    const all = await Student.find({}).lean();
    const drift = [];
    for (const st of all) {
      const rows = await Payment.find({ studentId: st.studentId }).lean();
      const receipted = Math.round(rows.reduce((a, p) => a + p.amount, 0) * 100) / 100;
      const accounted = Math.round(((st.totalPaid || 0)
        + (st.yearHistory || []).reduce((a, y) => a + Number(y.totalPaid || 0), 0)) * 100) / 100;
      if (receipted !== accounted) {
        drift.push(`${st.studentId}: ${receipted} receipted, ${accounted} accounted for`);
      }
    }
    ok(`every student still reconciles (${all.length} checked)`, drift.length === 0,
      drift.join('\n        '));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 10 — UPGRADE: ${pass} passed, ${fail} failed`);
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
