// scripts/backfillStudentYear.cjs
//
// Gives existing students a `studentYear`, and sets `yearFeeCleared` from
// their current balance.
//
// Every student created before the upgrade feature has no year level, and the
// schema default only applies to NEW documents — existing rows would read as
// undefined and the upgrade control would not know what to do with them. This
// stamps them explicitly.
//
// Dry run by default; writes only with --confirm.
//
//   node scripts/backfillStudentYear.cjs
//   node scripts/backfillStudentYear.cjs --confirm
//   node scripts/backfillStudentYear.cjs --confirm --year="Second Year"

require('dotenv').config();
const mongoose = require('mongoose');

const VALID = ['First Year', 'Second Year', 'Short Term'];

function arg(name) {
  const f = process.argv.find(a => a.startsWith(`--${name}=`));
  return f ? f.split('=').slice(1).join('=').replace(/^["']|["']$/g, '') : null;
}

(async () => {
  const confirm = process.argv.includes('--confirm');
  const targetYear = arg('year') || 'First Year';

  if (!VALID.includes(targetYear)) {
    console.error(`\n--year must be one of: ${VALID.join(', ')}\n`);
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod'
  });

  const Student = require('../server/models/Student.cjs');
  const all = await Student.find({}).lean();

  const needsYear = all.filter(s => !s.studentYear);
  console.log(`\n${all.length} student(s); ${needsYear.length} without a year level.\n`);

  if (!needsYear.length) {
    console.log('Nothing to backfill.\n');
  } else {
    console.log(`Would set studentYear = "${targetYear}" on:\n`);
    for (const s of needsYear) {
      console.log(`  ${String(s.admissionNumber).padEnd(22)} ${String(s.name).padEnd(24)} ${s.branch}`);
    }
  }

  // yearFeeCleared must reflect reality for every student, not just the ones
  // missing a year — it is what unlocks the upgrade control.
  const plan = all.map(s => ({
    _id: s._id,
    admissionNumber: s.admissionNumber,
    name: s.name,
    balance: Number(s.remainingBalance) || 0,
    cleared: (Number(s.remainingBalance) || 0) <= 0,
    was: s.yearFeeCleared
  }));

  const changing = plan.filter(p => p.cleared !== Boolean(p.was));
  console.log(`\nFee-cleared flag: ${plan.filter(p => p.cleared).length} of ${plan.length} student(s) have a zero balance.`);
  if (changing.length) {
    console.log('Would change:\n');
    for (const p of changing) {
      console.log(`  ${String(p.admissionNumber).padEnd(22)} balance ${String(p.balance).padStart(8)}  ${Boolean(p.was)} -> ${p.cleared}`);
    }
  }

  if (!confirm) {
    console.log('\nDry run — nothing written. Re-run with --confirm to apply.\n');
    return;
  }

  let yearSet = 0, flagSet = 0;
  if (needsYear.length) {
    const r = await Student.updateMany(
      { $or: [{ studentYear: { $exists: false } }, { studentYear: null }, { studentYear: '' }] },
      { $set: { studentYear: targetYear } }
    );
    yearSet = r.modifiedCount || 0;
  }

  for (const p of changing) {
    await Student.updateOne({ _id: p._id }, { $set: { yearFeeCleared: p.cleared } });
    flagSet++;
  }

  // Verify by reading back rather than trusting the update result.
  const after = await Student.find({}).select('admissionNumber studentYear yearFeeCleared remainingBalance').lean();
  const stillMissing = after.filter(s => !s.studentYear);
  const wrongFlag = after.filter(s => Boolean(s.yearFeeCleared) !== ((Number(s.remainingBalance) || 0) <= 0));

  console.log(`\nSet studentYear on ${yearSet} student(s); corrected yearFeeCleared on ${flagSet}.`);
  console.log(`Read-back: ${stillMissing.length} still without a year, ${wrongFlag.length} with a wrong cleared flag.`);

  const byYear = after.reduce((m, s) => { m[s.studentYear] = (m[s.studentYear] || 0) + 1; return m; }, {});
  console.log(`Year distribution: ${JSON.stringify(byYear)}\n`);

  process.exitCode = (stillMissing.length || wrongFlag.length) ? 1 : 0;
})()
  .catch(e => { console.error('BACKFILL ERROR:', e.message); process.exitCode = 1; })
  .finally(() => mongoose.connection.close().catch(() => {}));
