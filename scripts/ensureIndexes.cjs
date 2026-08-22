// scripts/ensureIndexes.cjs
//
// Builds every index the Mongoose schemas declare.
//
// server/db.cjs sets `autoIndex: false` on purpose — letting Mongoose build
// indexes during startup can stall a boot on a large collection, and it makes
// startup time depend on data size. The consequence is that declaring
// `index: true` or `unique: true` in a schema does NOT create anything on its
// own; something has to run syncIndexes(). That gap is why `ratelimits` and
// `teachers` reached production with no indexes beyond _id, which meant the
// rate limiter's unique key and its TTL cleanup did not exist.
//
// Run this after any schema change, and after provisioning a fresh database.
//
//   node scripts/ensureIndexes.cjs
//
// --- THIS IS NO LONGER THE ONLY THING THAT BUILDS INDEXES ----------------
//
// server/db.cjs now guarantees the CORRECTNESS-critical subset — every unique
// constraint and TTL — on every boot, after listen() and without dropping
// anything. It had to: this script is run by hand, Hostinger deploys by
// pulling `main` and starting the process, and there is no step in between,
// so a database nobody remembered to run it against went into service with no
// unique index behind its receipt numbers or its payment idempotency key.
//
// This script is still the more thorough of the two and still worth running
// after a schema change, because syncIndexes() also DROPS indexes that the
// schemas no longer declare — which is the part that must stay manual and
// deliberate rather than happening unattended against production.

require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase } = require('../server/db.cjs');

const models = [
  require('../server/models/User.cjs'),
  require('../server/models/Student.cjs'),
  require('../server/models/Teacher.cjs'),
  require('../server/models/Payment.cjs'),
  require('../server/models/Expenditure.cjs'),
  require('../server/models/WorkerPayment.cjs'),
  require('../server/models/FeeSettings.cjs'),
  require('../server/models/Enquiry.cjs'),
  require('../server/models/RefreshToken.cjs'),
  require('../server/models/RateLimit.cjs'),
];

(async () => {
  await connectToDatabase();
  console.log(`Database: ${mongoose.connection.name}\n`);

  for (const Model of models) {
    const name = Model.collection.collectionName;
    const before = (await Model.collection.indexes().catch(() => [])).map(i => i.name);
    try {
      await Model.syncIndexes();
    } catch (err) {
      // A conflicting definition (same keys, different options) has to be
      // dropped by hand rather than silently ignored.
      console.error(`  ${name.padEnd(16)} FAILED: ${err.message}`);
      continue;
    }
    const after = (await Model.collection.indexes()).map(i => i.name);
    const added = after.filter(i => !before.includes(i));
    const dropped = before.filter(i => !after.includes(i));
    const parts = [];
    if (added.length) parts.push('added ' + added.join(', '));
    if (dropped.length) parts.push('dropped ' + dropped.join(', '));
    console.log(`  ${name.padEnd(16)} ${parts.length ? parts.join(' | ') : 'already in sync'} (${after.length} total)`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('Index sync failed:', err.message);
  process.exit(1);
});
