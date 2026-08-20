/**
 * Phase 9 — ledger reconciliation.
 *
 * Runs against the LIVE database and writes nothing. Everything here is a
 * question about money that has already been taken, so a scratch copy would
 * answer the wrong question: the point is whether the college's actual books
 * agree with themselves today.
 *
 * Money is recorded in four places, and each pair has to agree:
 *
 *   Payment                  one row per transaction, the source of truth
 *   Student.totalPaid        the running total for the CURRENT year
 *   Student.receipts[]       a snapshot per receipt, what the counter reprints
 *   Student.yearHistory[]    closed years, archived with their own receipts
 *
 * A student who has been upgraded has their old payments archived and
 * totalPaid reset, so sum(payments) equals live totalPaid PLUS every archived
 * total. Comparing against live totalPaid alone would report every upgraded
 * student as broken.
 */
require('dotenv').config();
const mongoose = require('mongoose');

let pass = 0, fail = 0, warn = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const note = (name, detail = '') => { warn++; console.log(`  NOTE  ${name}${detail ? '\n        ' + detail : ''}`); };
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);
const rupees = n => 'Rs. ' + Number(n || 0).toLocaleString('en-IN');
const r2 = n => Math.round(Number(n || 0) * 100) / 100;

(async () => {
  console.log('\nPHASE 9 — LEDGER RECONCILIATION  (live database, read only)\n');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
  const db = mongoose.connection.db;
  console.log(`        connected to ${mongoose.connection.name}`);

  const students = await db.collection('students').find({}).toArray();
  const payments = await db.collection('payments').find({}).toArray();
  console.log(`        ${students.length} students, ${payments.length} payments\n`);

  const archivedPaid = s => (s.yearHistory || []).reduce((a, y) => a + Number(y.totalPaid || 0), 0);
  const grossOf = s => Number(s.tuitionFee || 0) + Number(s.hostelFee || 0) + Number(s.transportFee || 0)
    + Number(s.miscellaneousFee || 0) + Number(s.previousPending || 0)
    + (s.customFeeSlots || []).reduce((a, x) => a + Number(x.amount || 0), 0);
  const waiversOf = s => Number(s.tuitionWaiver || 0) + Number(s.hostelWaiver || 0)
    + Number(s.transportWaiver || 0) + Number(s.miscWaiver || 0);

  // =====================================================================
  section('The grand total');

  const sumPayments = r2(payments.reduce((a, p) => a + Number(p.amount || 0), 0));
  const sumLive = r2(students.reduce((a, s) => a + Number(s.totalPaid || 0), 0));
  const sumArchived = r2(students.reduce((a, s) => a + archivedPaid(s), 0));

  console.log(`        receipts issued : ${rupees(sumPayments)}`);
  console.log(`        live totalPaid  : ${rupees(sumLive)}`);
  console.log(`        archived years  : ${rupees(sumArchived)}`);
  ok(`every rupee receipted is accounted for (${rupees(sumPayments)} = ${rupees(sumLive)} + ${rupees(sumArchived)})`,
    sumPayments === r2(sumLive + sumArchived),
    `difference of ${rupees(sumPayments - sumLive - sumArchived)}`);

  // =====================================================================
  section('Student by student');

  const byStudent = new Map();
  for (const p of payments) {
    if (!byStudent.has(p.studentId)) byStudent.set(p.studentId, []);
    byStudent.get(p.studentId).push(p);
  }

  const balanceDrift = [], paidDrift = [], negatives = [];
  for (const s of students) {
    const expected = Math.max(0, r2(grossOf(s) - waiversOf(s) - Number(s.totalPaid || 0)));
    if (r2(s.remainingBalance) !== expected) {
      balanceDrift.push(`${s.studentId} (${s.name}): stored ${rupees(s.remainingBalance)}, computes to ${rupees(expected)}`);
    }
    const rows = r2((byStudent.get(s.studentId) || []).reduce((a, p) => a + Number(p.amount || 0), 0));
    const claimed = r2(Number(s.totalPaid || 0) + archivedPaid(s));
    if (rows !== claimed) {
      paidDrift.push(`${s.studentId} (${s.name}): ${rupees(rows)} in receipts, ${rupees(claimed)} claimed`);
    }
    if (Number(s.remainingBalance || 0) < 0) negatives.push(`${s.studentId}: ${s.remainingBalance}`);
    if (Number(s.totalPaid || 0) < 0) negatives.push(`${s.studentId}: totalPaid ${s.totalPaid}`);
  }

  ok(`every balance equals fees minus waivers minus paid (${students.length} students)`,
    balanceDrift.length === 0, balanceDrift.join('\n        '));
  ok('every student\'s receipts sum to what they are recorded as having paid',
    paidDrift.length === 0, paidDrift.join('\n        '));
  ok('no negative balance or negative total anywhere', negatives.length === 0, negatives.join(', '));

  // =====================================================================
  section('Receipts and their snapshots');

  const liveSnaps = new Map(), archivedSnaps = new Map();
  for (const s of students) {
    for (const r of (s.receipts || [])) liveSnaps.set(r.receiptNumber, { s, r });
    for (const y of (s.yearHistory || [])) {
      for (const r of (y.receipts || [])) archivedSnaps.set(r.receiptNumber, { s, r });
    }
  }
  const paymentNos = new Set(payments.map(p => p.receiptNumber));

  ok(`every receipt number is unique (${paymentNos.size}/${payments.length})`,
    paymentNos.size === payments.length,
    `${payments.length - paymentNos.size} duplicate(s)`);

  // A payment with no snapshot is money correctly counted but a receipt the
  // counter cannot reprint or send: the installment list reads the student
  // record, not the payments collection.
  const noSnapshot = payments.filter(p =>
    !liveSnaps.has(p.receiptNumber) && !archivedSnaps.has(p.receiptNumber));
  ok('every payment has a receipt the counter can reprint', noSnapshot.length === 0,
    noSnapshot.map(p => `${p.receiptNumber} — ${rupees(p.amount)} for ${p.studentId} on `
      + `${p.date ? new Date(p.date).toISOString().slice(0, 10) : 'no date'}`).join('\n        '));

  // The reverse: a receipt on a student with no payment behind it would be a
  // line on a statement that no money ever matched.
  const ghosts = [...liveSnaps.keys(), ...archivedSnaps.keys()].filter(n => !paymentNos.has(n));
  ok('every receipt on a student has a payment behind it', ghosts.length === 0,
    ghosts.slice(0, 10).join(', '));

  const amountDrift = [];
  for (const p of payments) {
    const hit = liveSnaps.get(p.receiptNumber) || archivedSnaps.get(p.receiptNumber);
    if (hit && r2(hit.r.amount) !== r2(p.amount)) {
      amountDrift.push(`${p.receiptNumber}: payment ${rupees(p.amount)}, snapshot ${rupees(hit.r.amount)}`);
    }
  }
  ok('a receipt shows the amount its payment recorded', amountDrift.length === 0,
    amountDrift.join('\n        '));

  // A snapshot with no balance is not the same as a balance of zero, and the
  // WhatsApp message used to read the absence as "fees fully cleared".
  const noBalance = [];
  for (const [no, hit] of liveSnaps) {
    if (hit.r.balance === undefined || hit.r.balance === null) noBalance.push(`${no} (${hit.s.studentId})`);
  }
  ok('every live receipt recorded the balance at the time', noBalance.length === 0,
    noBalance.join(', ') + ' — a parent would be told their fees are cleared');

  // =====================================================================
  section('Campus by campus');

  const campusRows = new Map();
  for (const p of payments) {
    const c = p.branch || '(none)';
    campusRows.set(c, r2((campusRows.get(c) || 0) + Number(p.amount || 0)));
  }
  for (const [campus, total] of [...campusRows].sort()) {
    console.log(`        ${campus.padEnd(20)} ${rupees(total)}`);
  }
  ok('campus totals add up to the grand total',
    r2([...campusRows.values()].reduce((a, x) => a + x, 0)) === sumPayments,
    `${r2([...campusRows.values()].reduce((a, x) => a + x, 0))} vs ${sumPayments}`);

  const crossCampus = [];
  const studentById = new Map(students.map(s => [s.studentId, s]));
  for (const p of payments) {
    const s = studentById.get(p.studentId);
    if (s && p.branch && s.branch && p.branch !== s.branch) {
      crossCampus.push(`${p.receiptNumber}: booked to ${p.branch}, student is at ${s.branch}`);
    }
  }
  ok('no payment is booked to a different campus from its student',
    crossCampus.length === 0, crossCampus.join('\n        '));

  // =====================================================================
  section('Dates and shape');

  const tomorrow = Date.now() + 24 * 3600 * 1000;
  const futureDated = payments.filter(p => p.date && new Date(p.date).getTime() > tomorrow);
  ok('no payment is dated in the future', futureDated.length === 0,
    futureDated.map(p => `${p.receiptNumber}: ${new Date(p.date).toISOString().slice(0, 10)}`).join(', '));

  const shapeless = payments.filter(p =>
    !Number.isFinite(Number(p.amount)) || Number(p.amount) <= 0 || !p.studentId || !p.receiptNumber);
  ok('every payment has an amount, a student and a receipt number',
    shapeless.length === 0, shapeless.map(p => p.receiptNumber || p._id).join(', '));

  const noCashier = payments.filter(p => !p.cashier);
  if (noCashier.length) {
    note(`${noCashier.length} payment(s) do not record who took them`,
      noCashier.slice(0, 5).map(p => p.receiptNumber).join(', '));
  } else {
    ok('every payment records who took it', true);
  }

  console.log(`\n${'='.repeat(64)}`);
  console.log(`PHASE 9 — LEDGER: ${pass} passed, ${fail} failed, ${warn} noted`);
  console.log('='.repeat(64));
  await mongoose.disconnect();
  process.exit(fail === 0 ? 0 : 1);
})().catch(err => { console.error('ERROR', err); process.exit(1); });
