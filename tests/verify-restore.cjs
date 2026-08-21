/**
 * Restore — a rehearsal of the recovery the college would only ever run on
 * its worst day.
 *
 * Backups have run nightly and are proven. Restore was not: every guard in
 * front of it was tested, and then the test stopped, because the route
 * downloads from the college's real Google Drive. So the recovery path itself
 * had never been executed, and the moment you need a restore is the worst
 * possible moment to find out whether it works.
 *
 * This runs the whole chain against a scratch database:
 *
 *   seed → build the payload → encrypt → decrypt → WIPE → restore → compare
 *
 * What it does NOT cover, stated rather than implied: the Google Drive
 * transport. Uploading and downloading are the college's live Drive and are
 * left alone. Everything on either side of that hop is exercised here, and the
 * encryption round trip is the part most likely to fail silently — a payload
 * that cannot be decrypted is a backup that does not exist.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_verify';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_verify';

const crypto = require('crypto');
const mongoose = require('mongoose');
const Student = require('../server/models/Student.cjs');
const Payment = require('../server/models/Payment.cjs');
const Teacher = require('../server/models/Teacher.cjs');
const Expenditure = require('../server/models/Expenditure.cjs');
const WorkerPayment = require('../server/models/WorkerPayment.cjs');
const FeeSettings = require('../server/models/FeeSettings.cjs');
const {
  buildBackupPayload, restoreFromPayload, wipeDataCollections,
  encryptPayload, decryptPayload
} = require('../server/services/backupService.cjs');

const CAMPUS = 'Beemaram C2';
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

(async () => {
  console.log('\nRESTORE — a rehearsal  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') {
    throw new Error(`refusing to wipe ${mongoose.connection.name}`);
  }
  await mongoose.connection.dropDatabase();
  const db = mongoose.connection.db;
  for (const M of [Student, Payment, Teacher, Expenditure, WorkerPayment, FeeSettings]) {
    await M.syncIndexes();
  }

  try {
    // =================================================================
    section('Something worth losing');

    const n = Date.now().toString().slice(-6);
    const students = [];
    for (let i = 1; i <= 4; i++) {
      students.push(await Student.create({
        studentId: `ZZRS-${n}-${i}`, admissionNumber: `ZZRS${n}${i}`,
        name: `Restore Student ${i}`, branch: CAMPUS, course: 'MPC', section: 'A',
        studentYear: 'First Year', academicYear: '2026-2027',
        mobile: '9876543210', parentMobile: '9876543211',
        tuitionFee: 10000 * i, hostelFee: 0, transportFee: 0,
        miscellaneousFee: 0, previousPending: 0,
        totalPaid: 1000 * i, remainingBalance: 10000 * i - 1000 * i
      }));
    }
    for (let i = 1; i <= 4; i++) {
      await Payment.create({
        receiptNumber: `ZZRSREC-${n}-${i}`, studentId: students[i - 1].studentId,
        admissionNumber: students[i - 1].admissionNumber, studentName: students[i - 1].name,
        amount: 1000 * i, branch: CAMPUS, category: 'Tuition Fee',
        installment: 'Installment 1', paymentMode: 'Cash', cashier: 'zz-restore', date: new Date()
      });
    }
    await Teacher.create({
      id: `ZZRST-${n}`, name: 'Restore Teacher', subject: 'Physics',
      branch: CAMPUS, salary: 30000, mobile: '9711111111', classification: 'Teaching'
    });
    await Expenditure.create({
      id: `ZZRSE-${n}`, category: 'Maintenance', amount: 2500,
      description: 'Restore probe', branch: CAMPUS, date: new Date()
    });
    await WorkerPayment.create({
      id: `ZZRSW-${n}`, workerName: 'Restore Worker', role: 'Gardener',
      amount: 8000, monthPeriod: 'August 2026', paid: true, branch: CAMPUS
    });
    await FeeSettings.create({ branch: CAMPUS, tuition: 40000, hostel: 0, transport: 0, misc: 0 });

    const before = {
      students: await Student.countDocuments(),
      payments: await Payment.countDocuments(),
      teachers: await Teacher.countDocuments(),
      expenditures: await Expenditure.countDocuments(),
      workerPayments: await WorkerPayment.countDocuments(),
      feeSettings: await FeeSettings.countDocuments()
    };
    const moneyBefore = (await Payment.find({}).lean()).reduce((a, p) => a + p.amount, 0);
    ok(`there is data to lose (${Object.values(before).reduce((a, b) => a + b, 0)} rows, Rs. ${moneyBefore.toLocaleString('en-IN')})`,
      before.students === 4 && before.payments === 4);

    // =================================================================
    section('Building and sealing a backup');

    const payload = await buildBackupPayload('zz-restore-rehearsal');
    ok('the payload is built', !!payload && !!payload.collections, 'no payload');
    ok('it carries every collection',
      ['students', 'teachers', 'feeSettings', 'expenditures', 'workerPayments', 'payments']
        .every(k => Array.isArray(payload.collections[k])),
      Object.keys(payload.collections || {}).join(', '));
    ok(`it carries the students (${payload.collections.students.length}/4)`,
      payload.collections.students.length === 4);
    ok(`it carries the payments (${payload.collections.payments.length}/4)`,
      payload.collections.payments.length === 4);
    ok('it is timestamped', !!payload.timestamp);

    // A backup travels to a third party. A password file that travels with it
    // is a password file published.
    const asText = JSON.stringify(payload);
    ok('no password or PIN is in the backup',
      !/"password"\s*:\s*"[^"]/.test(asText) && !/"pin"\s*:\s*"[^"]/.test(asText),
      'credentials are being copied to Google Drive');

    const sealed = encryptPayload(asText);
    ok('the payload encrypts', typeof sealed === 'string' && sealed.length > 0);
    ok('the sealed payload is not readable',
      !sealed.includes('Restore Student 1') && !sealed.includes(students[0].studentId),
      'the backup is stored in plain text');

    const opened = decryptPayload(sealed);
    ok('it decrypts back to the same thing',
      JSON.stringify(opened) === asText,
      'the round trip does not reproduce the payload — the backup would be unusable');

    // A tampered file must fail loudly rather than restore garbage.
    let tamperRefused = false;
    try {
      const corrupted = sealed.slice(0, -8) + 'deadbeef';
      decryptPayload(corrupted);
    } catch { tamperRefused = true; }
    ok('a tampered backup is refused, not partially restored', tamperRefused,
      'a corrupted file would be decrypted into whatever it happened to produce');

    // =================================================================
    section('Losing everything');

    const wiped = await wipeDataCollections('zz-restore-rehearsal');
    ok('the wipe reports success', wiped?.success === true);
    ok('the students are gone', await Student.countDocuments() === 0);
    ok('the payments are gone', await Payment.countDocuments() === 0);
    ok('the teachers are gone', await Teacher.countDocuments() === 0);
    ok('the expenditures are gone', await Expenditure.countDocuments() === 0);
    ok('the worker payments are gone', await WorkerPayment.countDocuments() === 0);

    // =================================================================
    section('Getting it back');

    const result = await restoreFromPayload(opened, 'zz-restore-rehearsal');
    ok('the restore reports success', result?.success === true, JSON.stringify(result).slice(0, 160));

    const after = {
      students: await Student.countDocuments(),
      payments: await Payment.countDocuments(),
      teachers: await Teacher.countDocuments(),
      expenditures: await Expenditure.countDocuments(),
      workerPayments: await WorkerPayment.countDocuments(),
      feeSettings: await FeeSettings.countDocuments()
    };
    for (const key of Object.keys(before)) {
      ok(`${key} came back (${after[key]}/${before[key]})`, after[key] === before[key],
        `${before[key]} before, ${after[key]} after`);
    }

    const moneyAfter = (await Payment.find({}).lean()).reduce((a, p) => a + p.amount, 0);
    ok(`every rupee came back (Rs. ${moneyAfter.toLocaleString('en-IN')} of Rs. ${moneyBefore.toLocaleString('en-IN')})`,
      moneyAfter === moneyBefore, `${moneyBefore} -> ${moneyAfter}`);

    // Identical, not merely the same number of rows.
    const drift = [];
    for (const original of students) {
      const back = await Student.findOne({ studentId: original.studentId }).lean();
      if (!back) { drift.push(`${original.studentId} did not come back`); continue; }
      for (const field of ['name', 'admissionNumber', 'branch', 'tuitionFee', 'totalPaid', 'remainingBalance']) {
        if (String(back[field]) !== String(original[field])) {
          drift.push(`${original.studentId}.${field}: ${original[field]} -> ${back[field]}`);
        }
      }
    }
    ok('every student came back unchanged, field by field', drift.length === 0,
      drift.join('\n        '));

    const receipts = await Payment.find({}).lean();
    const receiptDrift = receipts.filter(p =>
      !/^ZZRSREC-/.test(p.receiptNumber) || !p.studentId || !p.cashier);
    ok('every payment came back whole', receiptDrift.length === 0,
      receiptDrift.map(p => p.receiptNumber).join(', '));

    // The invariant the whole ledger rests on must hold after a recovery.
    const problems = [];
    for (const s of await Student.find({}).lean()) {
      const rows = (await Payment.find({ studentId: s.studentId, reversed: { $ne: true } }).lean())
        .reduce((a, p) => a + p.amount, 0);
      if (Math.round(rows * 100) / 100 !== Math.round((s.totalPaid || 0) * 100) / 100) {
        problems.push(`${s.studentId}: ${rows} receipted, ${s.totalPaid} recorded`);
      }
    }
    ok('the books reconcile after the restore', problems.length === 0,
      problems.join('\n        '));

    // =================================================================
    section('Restoring twice');

    const twice = await restoreFromPayload(opened, 'zz-restore-rehearsal');
    ok('a second restore succeeds', twice?.success === true);
    ok('it does not duplicate anything',
      await Student.countDocuments() === before.students
      && await Payment.countDocuments() === before.payments,
      `${await Student.countDocuments()} students, ${await Payment.countDocuments()} payments`);

    // =================================================================
    section('Restoring an empty backup');

    const empty = await restoreFromPayload({ collections: {} }, 'zz-restore-rehearsal');
    ok('an empty payload is accepted rather than throwing', empty?.success === true);
    ok('it clears the collections, which is what an empty backup means',
      await Student.countDocuments() === 0,
      `${await Student.countDocuments()} students survived an empty restore`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESTORE: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    if (mongoose.connection.name === 'jc_erp_verify') {
      await mongoose.connection.dropDatabase();
      console.log('  (scratch database dropped)');
    }
    await mongoose.disconnect();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
