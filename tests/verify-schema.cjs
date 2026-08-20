/**
 * Phase 2 — data model and schema integrity.
 *
 * Two halves.
 *
 * The first is static: the campus list is written out in six model files, in
 * the server, and again in the frontend. Nine copies of the same four strings
 * is nine chances to disagree, and a disagreement does not fail loudly — it
 * silently refuses one campus's records, or accepts a campus that does not
 * exist.
 *
 * The second is live: a constraint only protects what it was built on. A
 * unique index declared in a schema but never created in Mongo lets duplicates
 * in, and Mongo enforces no foreign keys at all, so a payment can point at a
 * student deleted years ago. Both are read from the real database.
 *
 * Field and collection names come from the COMPILED schemas, never from a list
 * kept here. The first version of this file wrote them out by hand and got
 * three wrong — Teacher, Expenditure and WorkerPayment all key on `id`, not
 * `teacherId` and friends — and reported healthy collections as broken.
 *
 * READ ONLY. This phase writes nothing.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const ROOT = path.join(__dirname, '..');
const modelDir = path.join(ROOT, 'server', 'models');

let pass = 0, fail = 0, warn = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};
const note = (name, detail = '') => { warn++; console.log(`  NOTE  ${name}${detail ? '\n        ' + detail : ''}`); };
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

(async () => {
  console.log('\nPHASE 2 — DATA MODEL AND SCHEMA INTEGRITY\n');

  // ===================================================================
  section('Enum drift');

  const server = read('server/app.cjs');
  const canonCampus = JSON.parse('[' +
    server.match(/const VALID_CAMPUSES = \[([^\]]+)\]/)[1].replace(/'/g, '"') + ']');
  ok('the server declares four campuses', canonCampus.length === 4, canonCampus.join(', '));

  const modelFiles = fs.readdirSync(modelDir).filter(f => f.endsWith('.cjs'));
  const drifted = [];
  let campusEnums = 0;
  for (const f of modelFiles) {
    const src = fs.readFileSync(path.join(modelDir, f), 'utf8');
    for (const m of src.matchAll(/enum:\s*\[([^\]]+)\]/g)) {
      const values = m[1].split(',').map(v => v.trim().replace(/^'|'$/g, '')).filter(Boolean);
      if (!values.some(v => /Erragattugutta|Beemaram/.test(v))) continue;
      campusEnums++;
      if (JSON.stringify(values) !== JSON.stringify(canonCampus)) drifted.push(`${f}: ${values.join(', ')}`);
    }
  }
  ok('every model campus enum matches the server', drifted.length === 0, drifted.join('\n        '));
  console.log(`        ${campusEnums} model enums checked against VALID_CAMPUSES`);

  const feCampus = [...read('src/constants/campuses.ts')
    .match(/export const CAMPUS_LIST = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  ok('the frontend campus list matches the server',
    JSON.stringify(feCampus) === JSON.stringify(canonCampus), feCampus.join(', '));

  const canonYears = JSON.parse('[' +
    server.match(/const VALID_STUDENT_YEARS = \[([^\]]+)\]/)[1].replace(/'/g, '"') + ']');
  const yearEnum = [...(read('server/models/Student.cjs')
    .match(/enum:\s*\[([^\]]*First Year[^\]]*)\]/) || [null, ''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  ok('the student year enum matches the server',
    JSON.stringify(yearEnum) === JSON.stringify(canonYears),
    `model [${yearEnum.join(', ')}] vs server [${canonYears.join(', ')}]`);

  const roleEnum = [...(read('server/models/User.cjs')
    .match(/enum:\s*\[([^\]]*admin1[^\]]*)\]/) || [null, ''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const knownRoles = ['admin1', 'admin2', 'clerk', 'accountant', 'authenticator'];
  ok('the role enum holds no role the server cannot resolve',
    roleEnum.every(r => knownRoles.includes(r)), roleEnum.join(', '));

  // The permission list the server enforces and the one the Rector can grant
  // must be the same set, or a permission exists that nobody can turn on.
  const serverPerms = JSON.parse('[' +
    server.match(/const CLERK_PERMISSIONS = \[([^\]]+)\]/)[1].replace(/'/g, '"') + ']');
  const uiPerms = [...read('src/services/admin1Service.ts')
    .matchAll(/\{\s*name:\s*'(\w+)',\s*label:/g)].map(m => m[1]);
  const schemaPerms = [...read('server/models/User.cjs')
    .matchAll(/^\s{4}(\w+):\s*\{\s*type:\s*Boolean/gm)].map(m => m[1]);
  ok('every permission the server enforces can be granted in the UI',
    serverPerms.every(p => uiPerms.includes(p)),
    `server [${serverPerms.join(', ')}] vs UI [${uiPerms.join(', ')}]`);
  ok('every permission the server enforces exists on the account schema',
    serverPerms.every(p => schemaPerms.includes(p)),
    `missing from User.cjs: ${serverPerms.filter(p => !schemaPerms.includes(p)).join(', ')}`);

  // ===================================================================
  section('Live database');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
  const db = mongoose.connection.db;
  const coll = n => db.collection(n);
  console.log(`        connected to ${mongoose.connection.name}`);

  for (const f of modelFiles) require(path.join(modelDir, f));

  const uniques = [];
  const requireds = [];
  for (const model of Object.values(mongoose.models)) {
    const collection = model.collection.name;
    model.schema.eachPath((field, type) => {
      const o = (type && type.options) || {};
      if (o.unique) uniques.push({ collection, field, sparse: !!o.sparse });
      if (o.required === true && !field.includes('.')) requireds.push({ collection, field });
    });
  }
  ok('constraints were read from the compiled schemas',
    uniques.length >= 10 && requireds.length >= 15,
    `${uniques.length} unique, ${requireds.length} required`);

  const names = (await db.listCollections().toArray()).map(c => c.name);

  const missingIdx = [];
  for (const { collection, field } of uniques) {
    if (!names.includes(collection)) { note(`collection ${collection} does not exist yet`); continue; }
    const idx = await coll(collection).indexes();
    const hit = idx.find(i => i.unique && Object.keys(i.key).length === 1 && i.key[field] !== undefined);
    if (!hit) missingIdx.push(`${collection}.${field}`);
  }
  ok('every declared unique field has a unique index in Mongo', missingIdx.length === 0,
    'autoIndex is off, so an index never created lets duplicates in silently:\n        '
      + missingIdx.join('\n        '));

  // --- Every declared index exists, and every existing index is declared ---
  //
  // db.cjs sets autoIndex false, deliberately, so that a large collection does
  // not stall the boot building indexes. The cost of that choice is that
  // declaring an index in a schema does nothing on its own — someone has to
  // create it. These two checks are what makes the choice safe: the first
  // catches an index that was declared and never built, the second catches one
  // that was built and later removed from the schema. A stale unique index is
  // the worse of the two, because it rejects writes the code believes are
  // fine — the (campus, slotIndex) constraint dropped with the fixed clerk
  // slots would have refused every clerk after the first.
  const declaredIdx = new Map();
  for (const model of Object.values(mongoose.models)) {
    const set = declaredIdx.get(model.collection.name) || new Set();
    model.schema.eachPath((field, type) => {
      const o = (type && type.options) || {};
      if (o.index || o.unique) set.add(JSON.stringify({ [field]: 1 }));
    });
    for (const [keys] of model.schema.indexes()) set.add(JSON.stringify(keys));
    declaredIdx.set(model.collection.name, set);
  }

  const notBuilt = [], notDeclared = [];
  for (const [collection, want] of declaredIdx) {
    if (!names.includes(collection)) continue;
    const live = await coll(collection).indexes();
    const have = new Set(live.map(i => JSON.stringify(i.key)));
    for (const key of want) if (!have.has(key)) notBuilt.push(`${collection} ${key}`);
    for (const key of have) {
      if (key === '{"_id":1}') continue;
      // Direction is a query-planner detail, not a different constraint.
      const flipped = JSON.stringify(Object.fromEntries(
        Object.entries(JSON.parse(key)).map(([k, v]) => [k, v === 1 ? -1 : 1])));
      if (!want.has(key) && !want.has(flipped)) notDeclared.push(`${collection} ${key}`);
    }
  }
  ok('every index a schema declares exists in Mongo', notBuilt.length === 0,
    'autoIndex is off, so these were declared and never built:\n        ' + notBuilt.join('\n        '));
  ok('every index in Mongo is still declared by a schema', notDeclared.length === 0,
    'a constraint no code knows about, which can refuse writes the code thinks are fine:\n        '
      + notDeclared.join('\n        '));

  const dupeReport = [];
  for (const { collection, field } of uniques) {
    if (!names.includes(collection)) continue;
    const d = await coll(collection).aggregate([
      { $match: { [field]: { $nin: [null, ''] } } },
      { $group: { _id: `$${field}`, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
      { $limit: 5 }
    ]).toArray();
    if (d.length) dupeReport.push(`${collection}.${field}: ` + d.map(x => `${x._id} x${x.n}`).join(', '));
  }
  ok('no duplicates in any field declared unique', dupeReport.length === 0, dupeReport.join('\n        '));

  const missingRequired = [];
  for (const { collection, field } of requireds) {
    if (!names.includes(collection)) continue;
    const n = await coll(collection).countDocuments({
      $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: '' }]
    });
    if (n) missingRequired.push(`${collection}.${field}: ${n} row(s)`);
  }
  ok('every row has the fields its schema marks required', missingRequired.length === 0,
    missingRequired.join('\n        '));

  // --- Campus values outside the enum ---------------------------------
  for (const [c, field] of [['students', 'branch'], ['payments', 'branch'], ['teachers', 'branch'],
                            ['expenditures', 'branch'], ['workerpayments', 'branch'], ['feesettings', 'branch']]) {
    if (!names.includes(c)) continue;
    const bad = await coll(c).find({ [field]: { $nin: canonCampus } }).limit(5).toArray();
    ok(`every ${c}.${field} is a real campus`, bad.length === 0,
      bad.map(x => `${x._id}: ${JSON.stringify(x[field])}`).join(', '));
  }

  // --- Orphans: Mongo enforces no foreign keys -------------------------
  const students = await coll('students').find({}).toArray();
  const payments = await coll('payments').find({}).toArray();
  const studentIds = new Set(students.map(s => s.studentId));

  const orphanPayments = payments.filter(p => !studentIds.has(p.studentId));
  ok('every payment points at a student that exists', orphanPayments.length === 0,
    `${orphanPayments.length} orphan(s): ` +
      orphanPayments.slice(0, 5).map(p => `${p.receiptNumber} -> ${p.studentId}`).join(', '));

  const receiptNos = new Set(payments.map(p => p.receiptNumber));
  const ghosts = [];
  for (const s of students) {
    for (const r of (s.receipts || [])) {
      if (!receiptNos.has(r.receiptNumber)) ghosts.push(`${s.studentId}/${r.receiptNumber}`);
    }
  }
  ok('every receipt on a student has a payment behind it', ghosts.length === 0,
    `${ghosts.length}: ` + ghosts.slice(0, 5).join(', '));

  const byId = new Map(students.map(s => [s.studentId, s]));
  const crossCampus = payments.filter(p => {
    const s = byId.get(p.studentId);
    return s && p.branch && s.branch && p.branch !== s.branch;
  });
  ok('no payment sits in a different campus from its student', crossCampus.length === 0,
    crossCampus.slice(0, 5).map(p => `${p.receiptNumber}: ${p.branch} vs ${byId.get(p.studentId).branch}`).join(', '));

  // --- Numbers that are not numbers ------------------------------------
  const money = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const badMoney = [];
  for (const p of payments) if (!money(p.amount)) badMoney.push(`payment ${p.receiptNumber}: ${p.amount}`);
  for (const s of students) {
    if (!money(s.totalPaid)) badMoney.push(`student ${s.studentId}.totalPaid: ${s.totalPaid}`);
    if (s.remainingBalance !== undefined && !Number.isFinite(s.remainingBalance)) {
      badMoney.push(`student ${s.studentId}.remainingBalance: ${s.remainingBalance}`);
    }
  }
  ok('every stored amount is a finite non-negative number', badMoney.length === 0,
    badMoney.slice(0, 6).join('\n        '));

  // --- Accounts no guard can match -------------------------------------
  const users = await coll('users').find({}).toArray();
  ok('every account holds a role the server understands',
    users.every(u => knownRoles.includes(u.role)),
    users.filter(u => !knownRoles.includes(u.role)).map(u => `${u.username}: ${u.role}`).join(', '));
  ok('every account is assigned a campus', users.every(u => !!u.campus),
    users.filter(u => !u.campus).map(u => u.username).join(', '));
  ok('every clerk is pinned to one real campus',
    users.filter(u => u.role === 'clerk').every(u => canonCampus.includes(u.campus)),
    users.filter(u => u.role === 'clerk' && !canonCampus.includes(u.campus))
      .map(u => `${u.username}: ${u.campus}`).join(', '));

  // A clerk carrying a permission the server no longer enforces is a box the
  // Rector ticked that now does nothing.
  const strayPerms = new Set();
  for (const u of users.filter(u => u.role === 'clerk')) {
    for (const k of Object.keys(u.permissions || {})) if (!serverPerms.includes(k)) strayPerms.add(k);
  }
  ok('no account carries a permission the server no longer knows', strayPerms.size === 0,
    [...strayPerms].join(', '));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PHASE 2 — SCHEMA: ${pass} passed, ${fail} failed, ${warn} noted`);
  console.log('='.repeat(60));
  await mongoose.disconnect();
  process.exit(fail === 0 ? 0 : 1);
})().catch(err => { console.error('ERROR', err); process.exit(1); });
