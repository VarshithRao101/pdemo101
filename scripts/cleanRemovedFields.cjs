/**
 * Remove fields left behind by features that no longer exist.
 *
 * Two of them:
 *
 *   marks       the Marks Registry, removed. A screen that had no backend at
 *               all until it was built during the audit, then removed at the
 *               college's request because it was never part of the brief.
 *   rollNumber  always written as a copy of the admission number. A field
 *               that duplicates another is a field that will eventually
 *               disagree with it, and there is no way to tell which one is
 *               right when it does.
 *
 * Neither carries money and neither is read by anything any more, so removing
 * them changes no figure. Run without --apply first: it reports exactly what
 * it would touch and writes nothing.
 *
 *   node scripts/cleanRemovedFields.cjs
 *   node scripts/cleanRemovedFields.cjs --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

// field -> the feature it belonged to. Anything not listed here is left alone.
const DEAD_FIELDS = {
  marks: 'the Marks Registry',
  rollNumber: 'a duplicate of the admission number'
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
  const db = mongoose.connection.db;
  const students = db.collection('students');

  console.log(`\nRemoved-feature field cleanup — ${mongoose.connection.name}`);
  console.log(APPLY ? 'MODE: apply\n' : 'MODE: report only (pass --apply to write)\n');

  const total = await students.countDocuments();
  let touched = 0;
  const plan = [];
  for (const [field, why] of Object.entries(DEAD_FIELDS)) {
    const count = await students.countDocuments({ [field]: { $exists: true } });
    plan.push({ field, why, count });
    touched += count;
    console.log(`  ${field.padEnd(14)} ${String(count).padStart(4)} of ${total} students   (${why})`);
  }

  // Nothing here should ever touch money. Recorded before and after so the
  // claim is checked rather than asserted.
  const moneyBefore = (await db.collection('payments').find({}).toArray())
    .reduce((a, p) => a + Number(p.amount || 0), 0);
  const paidBefore = (await students.find({}).toArray())
    .reduce((a, s) => a + Number(s.totalPaid || 0), 0);

  if (!touched) {
    console.log('\nNothing to remove.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to write.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const unset = {};
  for (const field of Object.keys(DEAD_FIELDS)) unset[field] = '';
  const res = await students.updateMany({}, { $unset: unset });
  console.log(`\nUpdated ${res.modifiedCount} student record(s).`);

  for (const [field] of Object.entries(DEAD_FIELDS)) {
    const left = await students.countDocuments({ [field]: { $exists: true } });
    console.log(`  ${field.padEnd(14)} ${left} remaining`);
  }

  const moneyAfter = (await db.collection('payments').find({}).toArray())
    .reduce((a, p) => a + Number(p.amount || 0), 0);
  const paidAfter = (await students.find({}).toArray())
    .reduce((a, s) => a + Number(s.totalPaid || 0), 0);

  console.log(`\n  receipts   Rs. ${moneyBefore.toLocaleString('en-IN')} -> Rs. ${moneyAfter.toLocaleString('en-IN')}`);
  console.log(`  totalPaid  Rs. ${paidBefore.toLocaleString('en-IN')} -> Rs. ${paidAfter.toLocaleString('en-IN')}`);
  if (moneyBefore !== moneyAfter || paidBefore !== paidAfter) {
    console.error('\nSTOP: a money total moved. That should be impossible here — investigate before trusting this run.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('  No money total moved.');

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error('ERROR', err); process.exit(1); });
