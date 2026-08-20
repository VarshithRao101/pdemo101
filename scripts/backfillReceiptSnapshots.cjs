/**
 * Restore receipt snapshots that a payment has but a student does not.
 *
 * The counter's installment list, the reprint button and the WhatsApp share
 * all read student.receipts[], not the payments collection. A payment with no
 * snapshot is money correctly counted that cannot be shown to the family who
 * paid it.
 *
 * The balance at the time is RECONSTRUCTED, and that is only defensible
 * because the reconstruction is proved first. The formula is
 *
 *     balance after payment N = gross - waivers - (payments up to and including N)
 *
 * which is run against every snapshot that ALREADY exists. If it fails to
 * reproduce even one known balance the script stops and writes nothing —
 * inventing a figure on a financial document is worse than leaving the gap.
 *
 * Students with archived years are skipped. Their fee structure changed when
 * the year closed, so today's gross does not describe last year's receipt.
 *
 *   node scripts/backfillReceiptSnapshots.cjs           (report only)
 *   node scripts/backfillReceiptSnapshots.cjs --apply   (write)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const r2 = n => Math.round(Number(n || 0) * 100) / 100;
const rupees = n => 'Rs. ' + Number(n || 0).toLocaleString('en-IN');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
  const db = mongoose.connection.db;
  console.log(`\nReceipt snapshot backfill — ${mongoose.connection.name}`);
  console.log(APPLY ? 'MODE: apply\n' : 'MODE: report only (pass --apply to write)\n');

  const students = await db.collection('students').find({}).toArray();
  const payments = await db.collection('payments').find({}).sort({ date: 1, _id: 1 }).toArray();

  const grossOf = s => Number(s.tuitionFee || 0) + Number(s.hostelFee || 0) + Number(s.transportFee || 0)
    + Number(s.miscellaneousFee || 0) + Number(s.previousPending || 0)
    + (s.customFeeSlots || []).reduce((a, x) => a + Number(x.amount || 0), 0);
  const waiversOf = s => Number(s.tuitionWaiver || 0) + Number(s.hostelWaiver || 0)
    + Number(s.transportWaiver || 0) + Number(s.miscWaiver || 0);

  const byStudent = new Map();
  for (const p of payments) {
    if (!byStudent.has(p.studentId)) byStudent.set(p.studentId, []);
    byStudent.get(p.studentId).push(p);
  }

  // --- Step 1: prove the formula against every snapshot that exists -------
  let checked = 0;
  const mismatches = [];
  const planned = [];

  for (const s of students) {
    if ((s.yearHistory || []).length) continue;          // fees have moved since
    const rows = byStudent.get(s.studentId) || [];
    if (!rows.length) continue;

    const net = r2(grossOf(s) - waiversOf(s));
    const have = new Map((s.receipts || []).map(r => [r.receiptNumber, r]));
    let running = 0;

    for (const p of rows) {
      running = r2(running + Number(p.amount || 0));
      const balance = Math.max(0, r2(net - running));
      const known = have.get(p.receiptNumber);

      if (known) {
        checked++;
        if (known.balance !== undefined && known.balance !== null && r2(known.balance) !== balance) {
          mismatches.push(`${s.studentId} ${p.receiptNumber}: stored ${rupees(known.balance)}, `
            + `formula gives ${rupees(balance)}`);
        }
      } else {
        planned.push({
          studentId: s.studentId, name: s.name, _id: s._id,
          snapshot: {
            receiptNumber: p.receiptNumber,
            date: p.date || new Date(),
            category: p.category || 'Tuition Fee',
            installment: p.installment || 'Installment 1',
            amount: r2(p.amount),
            balance,
            mode: p.paymentMode || 'Cash',
            cashier: p.cashier || ''
          }
        });
      }
    }
  }

  console.log(`Formula checked against ${checked} existing snapshot(s).`);
  if (mismatches.length) {
    console.log(`\nSTOPPING. The reconstruction does not reproduce ${mismatches.length} known balance(s):`);
    mismatches.forEach(m => console.log('  ' + m));
    console.log('\nNothing was written. A balance printed on a receipt has to be right,');
    console.log('and a formula that cannot reproduce the balances we already have');
    console.log('has no business producing the ones we do not.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('It reproduces every one of them.\n');

  if (!planned.length) {
    console.log('No missing snapshots. Nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`${planned.length} snapshot(s) to restore:`);
  for (const x of planned) {
    console.log(`  ${x.studentId} (${x.name})  ${x.snapshot.receiptNumber}  `
      + `${rupees(x.snapshot.amount)}  balance then ${rupees(x.snapshot.balance)}`);
  }

  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to write.');
    await mongoose.disconnect();
    process.exit(0);
  }

  let written = 0;
  for (const x of planned) {
    const res = await db.collection('students').updateOne(
      { _id: x._id, 'receipts.receiptNumber': { $ne: x.snapshot.receiptNumber } },
      { $push: { receipts: x.snapshot } }
    );
    if (res.modifiedCount === 1) written++;
    else console.warn(`  skipped ${x.snapshot.receiptNumber} — it already existed`);
  }
  console.log(`\nRestored ${written} snapshot(s).`);
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error('ERROR', err); process.exit(1); });
