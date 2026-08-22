/**
 * Phase 15 — enquiries.
 *
 * The college's public enquiry form, and the Rector's inbox behind it. This is
 * the ONLY write endpoint in the application that an unauthenticated stranger
 * can reach, which makes it the only one where the caller is assumed hostile
 * by default.
 *
 * Two questions beyond the usual validation: can it be flooded, and does the
 * reference code survive two people submitting at the same moment.
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
const Enquiry = require('../server/models/Enquiry.cjs');

const PORT = 4615;
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
const enquiry = (over = {}) => {
  const n = ++seq;
  return {
    studentName: `Prospect ${n}`, parentName: `Parent ${n}`,
    mobile: `98${String(10000000 + n).slice(-8)}`,
    email: `p${n}@example.com`, stream: 'MPC',
    preferredCampus: CAMPUS, currentGrade: '10th Class',
    notes: 'Interested in admission', ...over
  };
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 15 — ENQUIRIES  (scratch database)\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_verify' });
  if (mongoose.connection.name !== 'jc_erp_verify') throw new Error('wrong database');
  const db = mongoose.connection.db;
  await Enquiry.syncIndexes();
  const clearLimits = () => db.collection('ratelimits').deleteMany({ key: /^ratelimit_/ });

  const TAG = crypto.randomBytes(3).toString('hex');
  const ACCOUNTS = [
    { key: 'admin1', role: 'admin1', campus: 'All' },
    // Holds every power EXCEPT manageEnquiries, so the refusals below prove
    // the grant is what gates the inbox and not the role.
    { key: 'clerk', role: 'clerk', campus: CAMPUS },
    { key: 'granted', role: 'clerk', campus: CAMPUS, enquiries: true }
  ];
  const tokens = {};

  try {
    for (const a of ACCOUNTS) {
      a.username = `zzenq${a.key}${TAG}`;
      a.password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username: a.username, password: a.password, pin: '161718',
        role: a.role, campus: a.campus, name: `Enq ${a.key}`, status: 'active',
        permissions: { addStudent: true, editStudent: true, editFees: true,
                       collectFees: true, logExpenditures: true, manageStaff: true,
                       manageEnquiries: a.enquiries === true },
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null,
        { username: a.username, password: a.password });
      if (!login.json?.token) throw new Error(`sign-in failed for ${a.key}`);
      tokens[a.key] = login.json.token;
    }
    const submit = body => req('POST', '/api/enquiries', null, body);

    // =================================================================
    section('A stranger submits an enquiry');

    await clearLimits();
    const made = await submit(enquiry());
    ok('an anonymous caller can submit', made.status < 300, `status ${made.status}: ${made.raw.slice(0, 160)}`);
    ok('a reference code comes back', !!made.json?.data?.referenceCode, made.raw.slice(0, 160));
    ok('it starts as pending',
      (await Enquiry.findOne({ referenceCode: made.json?.data?.referenceCode }).lean())?.status === 'Pending');

    // =================================================================
    section('What a stranger may not do');

    const REJECT = [
      ['no student name', enquiry({ studentName: '' })],
      ['no mobile', enquiry({ mobile: '' })],
      ['a 9 digit mobile', enquiry({ mobile: '987654321' })],
      ['a lettered mobile', enquiry({ mobile: 'abcdefghij' })],
      ['no preferred campus', enquiry({ preferredCampus: '' })],
      ['an object as the student name', enquiry({ studentName: { a: 1 } })],
      ['an array as the mobile', enquiry({ mobile: ['9876543210'] })],
      ['a 50,000 character name', enquiry({ studentName: 'x'.repeat(50000) })],
      ['50,000 characters of notes', enquiry({ notes: 'x'.repeat(50000) })]
    ];
    const before = await Enquiry.countDocuments();
    for (const [label, body] of REJECT) {
      await clearLimits();
      const res = await submit(body);
      ok(`${label} is refused`, res.status >= 400 && res.status < 500, `status ${res.status}`);
    }
    ok('none of the refused submissions were stored',
      await Enquiry.countDocuments() === before,
      `${before} -> ${await Enquiry.countDocuments()}`);

    // A stranger must not be able to set the status, or file an enquiry as
    // already Enrolled and have it disappear from the Rector's pending list.
    await clearLimits();
    const forced = await submit(enquiry({ status: 'Enrolled', referenceCode: 'ENQ-FORGED' }));
    const forcedRow = forced.json?.data?.referenceCode
      ? await Enquiry.findOne({ referenceCode: forced.json.data.referenceCode }).lean()
      : null;
    ok('a submitted status is ignored', !forcedRow || forcedRow.status === 'Pending',
      `stored status ${forcedRow?.status}`);
    ok('a submitted reference code is ignored',
      !await Enquiry.countDocuments({ referenceCode: 'ENQ-FORGED' }),
      'a stranger chose their own reference code');

    // =================================================================
    section('Two people at once');

    // The reference code was ENQ-2026-<count+1>. Ten concurrent submissions
    // all read the same count, so they all compute the same code and the
    // unique index rejects nine of them — a form that fails for a real parent
    // whenever the college advertises anywhere.
    await clearLimits();
    const burst = await Promise.all(Array.from({ length: 10 }, () => submit(enquiry())));
    const accepted = burst.filter(r => r.status < 300).length;
    const serverErrors = burst.filter(r => r.status >= 500).length;
    const codes = new Set(burst.filter(r => r.status < 300).map(r => r.json?.data?.referenceCode));

    ok(`ten simultaneous enquiries are all accepted (${accepted}/10, ${serverErrors} server errors)`,
      accepted === 10 && serverErrors === 0,
      `${accepted} accepted, ${serverErrors} failed with 5xx`);
    ok(`each got its own reference code (${codes.size}/${accepted})`,
      codes.size === accepted, `${accepted - codes.size} duplicate(s)`);

    // =================================================================
    section('Flooding');

    // The only public write in the application. Without a budget one script
    // fills the Rector's inbox and the database behind it.
    await clearLimits();
    let refusedAt = null;
    for (let i = 1; i <= 60; i++) {
      const res = await submit(enquiry());
      if (res.status === 429) { refusedAt = i; break; }
    }
    ok('a flood of enquiries is eventually refused', refusedAt !== null,
      `60 submissions from one address, none refused — the inbox has no floor`);
    await clearLimits();

    // =================================================================
    section("The Rector's inbox");

    const list = await req('GET', '/api/enquiries', tokens.admin1);
    ok('the Rector can read the inbox', list.status === 200, `status ${list.status}`);
    ok('the enquiries are there', (list.json?.data || []).length > 0,
      `${(list.json?.data || []).length} rows`);

    const anonList = await req('GET', '/api/enquiries', null);
    ok('a stranger cannot read the inbox', anonList.status === 401, `status ${anonList.status}`);

    const clerkList = await req('GET', '/api/enquiries', tokens.clerk);
    ok('a clerk WITHOUT the enquiries grant cannot read the inbox',
      clerkList.status === 403, `status ${clerkList.status}`);

    // Admission enquiries became a grantable clerk power. What must hold is
    // that the GRANT is the gate - not the role, and not the campus alone.
    const grantedList = await req('GET', '/api/enquiries', tokens.granted);
    ok('a clerk WITH the enquiries grant can read the inbox',
      grantedList.status === 200, `status ${grantedList.status}: ${String(grantedList.raw).slice(0, 140)}`);

    const grantedRows = grantedList.json?.data || [];
    const foreign = grantedRows.filter(e =>
      !String(e.preferredCampus || '').toLowerCase().includes(CAMPUS.split(' ')[0].toLowerCase()));
    ok('the granted clerk sees only its own campus',
      foreign.length === 0,
      `${foreign.length} enquiries for another campus leaked: `
      + foreign.slice(0, 3).map(e => e.preferredCampus).join(', '));

    const first = (list.json?.data || [])[0];
    const update = await req('PATCH', `/api/enquiries/${first?._id || first?.id}`, tokens.admin1,
      { status: 'Contacted', notes: 'Called on Tuesday' });
    ok('the Rector can update an enquiry', update.status < 300,
      `status ${update.status}: ${update.raw.slice(0, 140)}`);

    const clerkUpdate = await req('PATCH', `/api/enquiries/${first?._id || first?.id}`, tokens.clerk,
      { status: 'Closed' });
    ok('a clerk WITHOUT the grant cannot update an enquiry',
      clerkUpdate.status === 403, `status ${clerkUpdate.status}`);

    const ownRow = (grantedList.json?.data || [])[0];
    if (ownRow) {
      const grantedUpdate = await req('PATCH', `/api/enquiries/${ownRow._id || ownRow.id}`,
        tokens.granted, { status: 'Contacted', notes: 'Clerk followed up' });
      ok('a clerk WITH the grant can update its own campus enquiry',
        grantedUpdate.status < 300,
        `status ${grantedUpdate.status}: ${String(grantedUpdate.raw).slice(0, 140)}`);
    }

    const badStatus = await req('PATCH', `/api/enquiries/${first?._id || first?.id}`, tokens.admin1,
      { status: 'NotARealStatus' });
    ok('an unknown status is refused', badStatus.status >= 400, `status ${badStatus.status}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PHASE 15 — ENQUIRIES: ${pass} passed, ${fail} failed`);
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
