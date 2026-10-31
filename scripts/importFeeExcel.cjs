/**
 * Load the college's fee Excel (already turned into JSON by
 * scripts/extract_fee_excel.py) into the database.
 *
 *   node scripts/importFeeExcel.cjs <students.json>                 dry run: builds and checks, writes nothing
 *   node scripts/importFeeExcel.cjs <students.json> --db <name>     insert into that database, then verify
 *   node scripts/importFeeExcel.cjs <students.json> --db <name> --undo   remove this batch again
 *
 * How the Excel columns land:
 *   Tuition Fee            -> tuitionFee
 *   Others                 -> fee slot "Others"
 *   Freshers Party / Lab   -> fee slots of those names (only where the Excel lists one)
 *   Tuition / Others Paid  -> one receipt each; Party / Lab -> one receipt each
 *
 * The Excel gives no payment dates, so every receipt is dated 1 June 2026 and
 * says in its remarks that it was paid before the system took over. That keeps
 * a lump of past money out of "today's collection".
 *
 * After inserting, every campus is read back and compared with the totals the
 * JSON was built from; any difference exits non-zero.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BATCH = 'excel-2026-10-31';
const CASHIER = 'excel-import';
const PAID_ON = new Date('2026-06-01T00:00:00+05:30');

const args = process.argv.slice(2);
const file = args[0];
const dbName = args.includes('--db') ? args[args.indexOf('--db') + 1] : null;
const undo = args.includes('--undo');
if (!file) { console.error('usage: importFeeExcel.cjs <students.json> [--db name] [--undo]'); process.exit(1); }

const rupees = n => Math.round(Number(n || 0) * 100) / 100;

function build(rows) {
  const students = [], payments = [];
  for (const r of rows) {
    const adm = r.admissionNumber;
    const slots = [];
    if (r.others) slots.push({ id: 'others', name: 'Others', amount: rupees(r.others) });
    if (r.party) slots.push({ id: 'freshers-party-fee', name: 'Freshers Party Fee', amount: rupees(r.party) });
    if (r.lab) slots.push({ id: 'lab-fee', name: 'Lab Fee', amount: rupees(r.lab) });
    const gross = rupees(r.tuition) + slots.reduce((t, s) => t + s.amount, 0);

    const paid = [
      ['TF', 'Tuition Fee', r.tuitionPaid, 'Opening Balance'],
      ['OT', 'Others', r.othersPaid, 'Opening Balance'],
      ['PF', 'Freshers Party Fee', r.party, 'Opening Balance'],
      ['LF', 'Lab Fee', r.lab, r.labMode || 'Opening Balance'],
    ].filter(p => Number(p[2]) > 0);

    let running = 0;
    const receipts = paid.map(([k, category, amount, mode]) => {
      running = rupees(running + rupees(amount));
      return {
        receiptNumber: `XL-${adm}-${k}`, date: PAID_ON, category, installment: 'Opening balance',
        amount: rupees(amount), balance: Math.max(0, rupees(gross - running)), mode, cashier: CASHIER
      };
    });
    const totalPaid = running;
    const balance = Math.max(0, rupees(gross - totalPaid));

    students.push({
      studentId: adm, admissionNumber: adm, name: r.name,
      branch: r.campus, status: r.active ? 'Active' : 'Inactive',
      course: r.course || '', section: '',
      studentYear: r.year, academicYear: '2026-2027',
      tuitionFee: rupees(r.tuition), hostelFee: 0, transportFee: 0, miscellaneousFee: 0, previousPending: 0,
      customFeeSlots: slots, totalPaid, remainingBalance: balance, yearFeeCleared: balance <= 0,
      receipts,
      ledgerNotes: [
        `Excel tab '${r.tab}' row ${r.row}${r.rawAdm ? ` (Adm.No column: ${r.rawAdm})` : ''}`,
        `Excel: commitment ${r.commitment} (${r.kind || 'type blank'}), due at 75% ${r.due75}`,
        ...r.flags
      ],
      importBatch: BATCH
    });
    for (const x of receipts) payments.push({
      receiptNumber: x.receiptNumber, studentId: adm, admissionNumber: adm, studentName: r.name,
      amount: x.amount, category: x.category, installment: x.installment, paymentMode: x.mode,
      cashier: CASHIER, branch: r.campus, date: PAID_ON,
      remarks: `Paid before 31 Oct 2026 - from the college fee Excel (${r.tab})`,
      idempotencyKey: `excel_${x.receiptNumber}`
    });
  }
  return { students, payments };
}

function totals(students) {
  const by = {};
  for (const s of students) {
    const t = by[s.branch] || (by[s.branch] = { n: 0, fee: 0, paid: 0, balance: 0 });
    t.n++;
    t.fee = rupees(t.fee + s.tuitionFee + s.customFeeSlots.reduce((a, x) => a + x.amount, 0));
    t.paid = rupees(t.paid + s.totalPaid);
    t.balance = rupees(t.balance + s.remainingBalance);
  }
  return by;
}

(async () => {
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { students, payments } = build(rows);

  // Things that would make the insert fail half way, caught before it starts.
  const dupe = (list, k) => list.map(x => x[k]).filter((v, i, a) => a.indexOf(v) !== i);
  if (dupe(students, 'admissionNumber').length) throw new Error('duplicate admission numbers: ' + dupe(students, 'admissionNumber'));
  if (dupe(payments, 'receiptNumber').length) throw new Error('duplicate receipt numbers: ' + dupe(payments, 'receiptNumber'));

  const want = totals(students);
  console.log(`students ${students.length}  payments ${payments.length}  amount ${rupees(payments.reduce((t, p) => t + p.amount, 0))}`);
  for (const [b, t] of Object.entries(want)) console.log(`  ${b.padEnd(18)} ${String(t.n).padStart(3)} students  fee ${t.fee}  paid ${t.paid}  balance ${t.balance}`);
  if (!dbName) { console.log('dry run - nothing written'); return; }

  const mongoose = require('mongoose');
  const Student = require('../server/models/Student.cjs');
  const Payment = require('../server/models/Payment.cjs');
  await mongoose.connect(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 20000 });
  try {
    if (undo) {
      const a = await Payment.deleteMany({ cashier: CASHIER }).setOptions({ withDeleted: true });
      const b = await Student.deleteMany({ importBatch: BATCH }).setOptions({ withDeleted: true });
      console.log(`removed ${b.deletedCount} students, ${a.deletedCount} payments from ${dbName}`);
      return;
    }
    const clash = await Student.find({ admissionNumber: { $in: students.map(s => s.admissionNumber) } })
      .setOptions({ withDeleted: true }).select('admissionNumber name importBatch').lean();
    if (clash.length) { console.error('already in', dbName + ':', clash.slice(0, 10).map(c => `${c.admissionNumber} ${c.name} ${c.importBatch}`).join('; ')); process.exit(2); }

    await Student.insertMany(students, { ordered: true });
    await Payment.insertMany(payments, { ordered: true });

    // Read back and compare, campus by campus.
    const got = totals(await Student.find({ importBatch: BATCH }).lean());
    const pays = await Payment.aggregate([{ $match: { cashier: CASHIER } }, { $group: { _id: '$branch', n: { $sum: 1 }, amt: { $sum: '$amount' } } }]);
    let ok = true;
    for (const [b, t] of Object.entries(want)) {
      const g = got[b] || {}, p = pays.find(x => x._id === b) || {};
      const same = g.n === t.n && g.fee === t.fee && g.paid === t.paid && g.balance === t.balance && rupees(p.amt) === t.paid;
      ok = ok && same;
      console.log(`  ${same ? 'ok      ' : 'MISMATCH'} ${b.padEnd(18)} students ${g.n}/${t.n}  fee ${g.fee}/${t.fee}  paid ${g.paid}/${t.paid}  receipts sum ${rupees(p.amt)}  balance ${g.balance}/${t.balance}`);
    }
    if (!ok) { console.error('MISMATCH'); process.exit(3); }
    console.log('verified');
  } finally { await mongoose.disconnect(); }
})().catch(e => { console.error(e); process.exit(1); });
