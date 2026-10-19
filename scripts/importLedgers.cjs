/**
 * Load the transcribed paper fee ledgers into the database.
 *
 *   node scripts/importLedgers.cjs <dataDir>                 dry run: builds and checks, writes nothing
 *   node scripts/importLedgers.cjs <dataDir> --db <name>     insert into that database
 *   node scripts/importLedgers.cjs <dataDir> --db <name> --undo   remove this batch again
 *
 * <dataDir> holds data/ (IIT & NEET book), m1d/ (main campus 1st year) and
 * m2d/ (main campus 2nd year), one JSON file per ledger page. The data is
 * kept outside the repository because it contains Aadhaar numbers.
 *
 * Rules applied to the handwritten entries:
 *  - a row with a receipt number is paid; a fee row without one is still owed,
 *    except a party/lab row that carries a date in the main-campus books,
 *    which the ledgers write as "1300 paid" without a receipt;
 *  - for second-year students the first year becomes a closed yearHistory
 *    entry and whatever the ledger says is still due from it becomes
 *    previousPending;
 *  - a first-year student's agreed second-year fee is kept as a zero-amount
 *    slot, so it is visible without being billed early.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BOYS = ['b1d', 'b2d'];
const CAMPUS = { data: 'Erragattugutta C1', m1d: 'Erragattugutta C2', m2d: 'Erragattugutta C2', b1d: 'Beemaram C1', b2d: 'Beemaram C2' };
const BOOK = { data: 'IIT & NEET', m1d: 'Main 1st Yr', m2d: 'Main 2nd Yr', b1d: 'Boys C1', b2d: 'Boys C2 2nd Yr' };
const CASHIER = 'ledger-import';

const args = process.argv.slice(2);
const dataDir = args[0];
const dbName = args.includes('--db') ? args[args.indexOf('--db') + 1] : null;
const undo = args.includes('--undo');
const BOOKS = args.includes('--books') ? args[args.indexOf('--books') + 1].split(',') : ['data', 'm1d', 'm2d'];
// Girls and boys were loaded separately, so each set is its own batch and can be undone alone.
const BATCH = BOOKS.every(b => BOYS.includes(b)) ? 'ledger-2026-10-boys' : 'ledger-2026-10';
const NOTEBOOK = b => b === 'm2d' || b === 'b2d';
if (!dataDir) { console.error('usage: importLedgers.cjs <dataDir> [--db name] [--undo]'); process.exit(1); }

const sum = (rows, i) => rows.reduce((t, r) => t + (Number(r[i]) || 0), 0);
const baseLabel = l => l.replace(/\s*\((2nd|3rd|due|balance due|remaining|C|S|Registration row)\)\s*/gi, ' ')
  .replace(/\s+/g, ' ').trim();
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isOthers = l => /^(others|books)/i.test(l);

function isPaidRow(book, [label, date, rc]) {
  if (rc) return true;
  // The boys' books mark a paid row with its receipt number and nothing else.
  if (BOYS.includes(book)) return false;
  if (/\bdue\b|remaining/i.test(label)) return false;
  return book !== 'data' && !!date && /party|lab/i.test(label);
}

function courseOf(group) {
  const g = String(group || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const m = g.match(/^MPC E([12])$/);
  if (m) return { course: 'MPC-EAPCET', section: 'E' + m[1] };
  if (/^MPC/.test(g) && /AEE|ACE/.test(g)) return { course: 'MPC-EAPCET', section: '' };
  return { course: g, section: '' };
}

function slotsFrom(rows) {
  const by = new Map();
  for (const r of rows) {
    const name = isOthers(r[0]) ? 'Others (Books/Uniform/H.D)' : baseLabel(r[0]);
    by.set(name, (by.get(name) || 0) + (Number(r[3]) || 0));
  }
  return [...by].map(([name, amount]) => ({ id: slug(name), name, amount }));
}

function load() {
  const out = [];
  for (const book of BOOKS) {
    const dir = path.join(dataDir, book);
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
      out.push({ book, ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) });
    }
  }
  return out;
}

const TAG = { data: 'G1', m1d: 'G2', m2d: 'G2', b1d: 'B1', b2d: 'B2' };

function build(recs, taken = new Map(), seqStart = 1) {
  const students = [], payments = [], report = [];
  const seenAdm = new Map(taken);
  let seq = seqStart;
  for (const r of recs) {
    const flags = [...(r.uncertain || [])];
    let adm = String(r.adm || '').trim();
    if (!adm) {
      // Temporary numbers, continuing the 1-25 the girls' book used; the college
      // replaces them with real ones.
      do { adm = String(seq++); } while (seenAdm.has(adm));
      flags.unshift(`Temporary admission no. ${adm} (was blank in ledger) - replace with real number`);
    } else if (seenAdm.has(adm)) {
      flags.unshift(`Admission no. ${adm} is also ${seenAdm.get(adm)} - stored as ${adm}-${TAG[r.book]}`);
      adm = `${adm}-${TAG[r.book]}`;
    }
    seenAdm.set(adm, `${r.name} (${r.img})`);

    const year2 = Number(r.year) === 2;
    const cur = year2 ? { fee: r.fee2, pay: r.pay2 || [], det: r.det2 || [], inc: r.inc2 }
                      : { fee: r.fee1, pay: r.pay1 || [], det: r.det1 || [], inc: r.inc1 };
    const book = r.book;

    // Fees for the current year.
    const othersAmt = cur.det.filter(d => isOthers(d[0])).reduce((t, d) => t + d[3], 0);
    let tuition = Number(cur.fee) || 0;
    if (NOTEBOOK(book) && cur.inc && tuition) tuition = Math.max(0, tuition - othersAmt);
    const slots = slotsFrom(cur.det);
    if (!year2 && Number(r.fee2) > 0) slots.push({ id: 'second-year-fee-agreed', name: `2nd Year Fee agreed: ${r.fee2}${r.fee2_note ? ' (' + r.fee2_note + ')' : ''}`.slice(0, 120), amount: 0 });
    if (!tuition) flags.push(`${year2 ? '2nd' : '1st'}-year college fee not written - tuition left 0`);

    // History for second-year students.
    let previousPending = 0, yearHistory = [];
    if (year2) {
      const pay1 = r.pay1 || [];
      // A party fee first written without a receipt and later written again
      // with one is the same charge, not two.
      const det1 = (r.det1 || []).filter((d, i, all) => !(BOYS.includes(book) && d[0] === 'Party Fee' && !d[2]
        && all.some(o => o[0] === 'Party Fee (2nd entry)')));
      const paid1 = sum(pay1, 2) + det1.filter(d => isPaidRow(book, d)).reduce((t, d) => t + d[3], 0);
      if (NOTEBOOK(book)) previousPending = Number(r.due1) || 0;
      else if (r.fee1) {
        previousPending = Math.max(0, r.fee1 - sum(pay1, 2)) + det1.filter(d => !isPaidRow(book, d)).reduce((t, d) => t + d[3], 0);
        if (previousPending) flags.push(`1st-year pending ${previousPending} computed from ledger (fee - payments + unpaid items)`);
      }
      if (r.fee1 || pay1.length || det1.length) {
        yearHistory.push({
          studentYear: 'First Year', academicYear: '2025-2026',
          tuitionFee: Number(r.fee1) || 0, customFeeSlots: slotsFrom(det1),
          totalPayable: paid1 + previousPending, totalPaid: paid1,
          closedAt: new Date('2026-05-31'), closedBy: CASHIER,
          receipts: [...pay1.map((p, k) => ({ ...rcpt(p[0], p[1], p[2], 'Tuition Fee', `H${k}`) })),
                     ...det1.filter(d => isPaidRow(book, d)).map((d, k) => rcpt(d[1], d[2], d[3], baseLabel(d[0]), `HD${k}`))]
        });
      }
    }
    function rcpt(date, rc, amount, category, k) {
      return { receiptNumber: `LG-${rc || 'NORC'}-${r.img}-${k}`, date: date ? new Date(date) : null,
               category, installment: 'Ledger', amount: Number(amount) || 0, mode: 'Cash', cashier: CASHIER, _rc: rc };
    }

    // Current-year receipts.
    const cr = [...cur.pay.map((p, k) => rcpt(p[0], p[1], p[2], 'Tuition Fee', `P${k}`)),
                ...cur.det.filter(d => isPaidRow(book, d)).map((d, k) => rcpt(d[1], d[2], d[3], isOthers(d[0]) ? 'Others (Books/Uniform/H.D)' : baseLabel(d[0]), `D${k}`))];
    const gross = tuition + slots.reduce((t, s) => t + s.amount, 0) + previousPending;
    let running = 0;
    for (const x of cr) {
      if (!x.date) { x.date = new Date('2026-06-01'); flags.push(`Receipt ${x._rc || '(no RC)'} ${x.amount} has no date - 01/06/2026 used`); }
      running += x.amount; x.balance = Math.max(0, gross - running);
    }
    const totalPaid = running;
    const balance = Math.max(0, gross - totalPaid);
    if (totalPaid > gross) flags.push(`Paid ${totalPaid} is more than total fee ${gross}`);

    const { course, section } = courseOf(r.group);
    const day = /day scholar|\bdays\b/i.test(JSON.stringify(r.uncertain || [])) || r.days === true;
    const strip = ({ _rc, ...x }) => x;
    for (const h of yearHistory) h.receipts = h.receipts.map(strip);
    students.push({
      studentId: adm, admissionNumber: adm, name: r.name, fatherName: r.father || '',
      mobile: r.mob1 || '', parentMobile: r.mob2 || r.mob1 || '', course, section,
      branch: CAMPUS[book], status: 'Active', address: r.address || '',
      aadhaar: r.aadhaar || '', caste: r.caste || '', sscGpa: r.ssc || '',
      hostelStatus: day ? 'Day Scholar' : 'Resident', transportStatus: 'Self Transport',
      tuitionFee: tuition, hostelFee: 0, transportFee: 0, miscellaneousFee: 0,
      previousPending, customFeeSlots: slots, totalPaid, remainingBalance: balance,
      receipts: cr.map(strip), academicYear: '2026-2027',
      studentYear: year2 ? 'Second Year' : 'First Year', yearFeeCleared: false, yearHistory,
      ledgerNotes: [`${BOOK[book]} ledger page ${r.img}`, ...(r.co ? ['c/o ' + r.co] : []), ...flags],
      importBatch: BATCH
    });
    for (const x of cr) payments.push({
      receiptNumber: x.receiptNumber, studentId: adm, admissionNumber: adm, studentName: r.name,
      amount: x.amount, category: x.category, installment: 'Ledger', paymentMode: 'Cash', cashier: CASHIER,
      branch: CAMPUS[book], date: x.date, remarks: `Ledger import (${BOOK[book]} p.${r.img})`,
      transactionRef: x._rc ? `RC ${x._rc}` : '', idempotencyKey: `ledger_${x.receiptNumber}`
    });
    report.push({ book: BOOK[book], page: r.img, adm, name: r.name, group: r.group, year: year2 ? 2 : 1,
      campus: CAMPUS[book], tuition, otherFees: gross - tuition - previousPending, previousPending, total: gross,
      paid: totalPaid, balance, receipts: cr.length, flags: flags.join(' | ') });
  }
  return { students, payments, report };
}

function csv(rows) {
  const cols = Object.keys(rows[0]);
  const q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return [cols.join(','), ...rows.map(r => cols.map(c => q(r[c] ?? '')).join(','))].join('\n');
}

(async () => {
  const seqStart = args.includes('--seq-start') ? Number(args[args.indexOf('--seq-start') + 1]) : 1;
  let taken = new Map();
  if (dbName && !undo) {
    const mg = require('mongoose');
    await mg.connect(process.env.MONGODB_URI, { dbName });
    const S = require('../server/models/Student.cjs');
    for (const x of await S.find({}).setOptions({ withDeleted: true }).select('admissionNumber name branch').lean()) taken.set(x.admissionNumber, `${x.name} (${x.branch}, already in database)`);
    await mg.disconnect();
  }
  const { students, payments, report } = build(load(), taken, seqStart);
  const t = k => report.reduce((s, r) => s + r[k], 0);
  console.log(`students ${students.length}  payments ${payments.length}`);
  for (const b of BOOKS.map(k => BOOK[k])) {
    const rr = report.filter(r => r.book === b);
    console.log(`  ${b.padEnd(12)} ${String(rr.length).padStart(3)} students  total ${rr.reduce((s, r) => s + r.total, 0)}  paid ${rr.reduce((s, r) => s + r.paid, 0)}  balance ${rr.reduce((s, r) => s + r.balance, 0)}`);
  }
  console.log(`  ALL          total ${t('total')}  paid ${t('paid')}  balance ${t('balance')}  flagged ${report.filter(r => r.flags).length}`);
  const rn = new Set(); for (const p of payments) { if (rn.has(p.receiptNumber)) throw new Error('dup receipt ' + p.receiptNumber); rn.add(p.receiptNumber); }
  fs.writeFileSync(path.join(dataDir, BATCH + '-report.csv'), '﻿' + csv(report));
  if (!dbName) { console.log('dry run - report written to', path.join(dataDir, BATCH + '-report.csv')); return; }

  const mongoose = require('mongoose');
  const Student = require('../server/models/Student.cjs');
  const Payment = require('../server/models/Payment.cjs');
  await mongoose.connect(process.env.MONGODB_URI, { dbName });
  try {
    if (undo) {
      const ids = (await Student.find({ importBatch: BATCH }).setOptions({ withDeleted: true }).select('studentId').lean()).map(x => x.studentId);
      const a = await Payment.deleteMany({ cashier: CASHIER, studentId: { $in: ids } });
      const b = await Student.deleteMany({ importBatch: BATCH }).setOptions({ withDeleted: true });
      console.log(`removed ${b.deletedCount} students, ${a.deletedCount} payments from ${dbName}`);
      return;
    }
    const clash = await Student.find({ admissionNumber: { $in: students.map(s => s.admissionNumber) } }).setOptions({ withDeleted: true }).select('admissionNumber name importBatch').lean();
    if (clash.length) { console.error('already in', dbName + ':', clash.map(c => `${c.admissionNumber} ${c.name} ${c.importBatch}`).join('; ')); process.exit(2); }
    await Student.insertMany(students, { ordered: true });
    await Payment.insertMany(payments, { ordered: true });
    // Read back and compare with what was built.
    const got = await Student.find({ importBatch: BATCH }).lean();
    const pays = await Payment.aggregate([{ $match: { cashier: CASHIER, studentId: { $in: got.map(x => x.studentId) } } }, { $group: { _id: null, n: { $sum: 1 }, amt: { $sum: '$amount' } } }]);
    const paidDb = got.reduce((s, x) => s + x.totalPaid, 0), balDb = got.reduce((s, x) => s + x.remainingBalance, 0);
    console.log(`in ${dbName}: students ${got.length}/${students.length}  payments ${pays[0]?.n}/${payments.length}  paid ${paidDb}/${t('paid')}  payment sum ${pays[0]?.amt}  balance ${balDb}/${t('balance')}`);
    if (got.length !== students.length || pays[0]?.n !== payments.length || paidDb !== t('paid') || pays[0]?.amt !== t('paid') || balDb !== t('balance')) { console.error('MISMATCH'); process.exit(3); }
    console.log('verified');
  } finally { await mongoose.disconnect(); }
})().catch(e => { console.error(e); process.exit(1); });
