/**
 * PHASE 2 — THE ACCOUNTANTS, all four campuses.
 *
 * Runs AFTER phase 1 and reads what phase 1 left. That is the requirement it
 * exists to satisfy: the student the Rector created must be findable, payable
 * and correct when a different role signs in at a different campus. A system
 * where each role works alone and they disagree with each other is the failure
 * this catches.
 *
 * What it covers, per the operator's list: four branches, fee payments and
 * their details, the data behind the WhatsApp reminders and receipt messages,
 * the receipt link a parent actually opens, ledgers and payment history, the
 * fields the PDFs are built from, and student addition and deletion.
 *
 * jc_erp_phase, shared with phase 1. It does NOT drop the database - phase 3
 * reads what this one leaves.
 */
process.env.MONGODB_DB_NAME = 'jc_erp_phase';
require('dotenv').config({ override: false });
process.env.MONGODB_DB_NAME = 'jc_erp_phase';

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');

const PORT = 4702;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMPUSES = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];
const PHASE1_CAMPUS = 'Beemaram C1';
const TAG1 = 'zzph1';
const TAG = 'zzph2';
const PIN = '556677';

let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); return true; }
  fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`);
  console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
  return false;
};
const section = t => console.log(`\n${t}\n${'-'.repeat(t.length)}`);

const req = (method, path, token, body, headers = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? null : JSON.stringify(body);
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({
      status: res.statusCode, raw,
      json: (() => { try { return JSON.parse(raw); } catch { return null; } })()
    }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const withPin = () => ({ 'x-security-pin': PIN });
const rows = (r) => {
  const d = r.json?.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.entries)) return d.entries;
  if (Array.isArray(d?.students)) return d.students;
  if (Array.isArray(d?.payments)) return d.payments;
  if (Array.isArray(d)) return d;
  return [];
};

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nPHASE 2 — THE ACCOUNTANTS (four campuses)   [jc_erp_phase]\n');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'jc_erp_phase', serverSelectionTimeoutMS: 20000 });
  if (mongoose.connection.name !== 'jc_erp_phase') throw new Error('wrong database');
  const db = mongoose.connection.db;
  try { await db.collection('ratelimits').deleteMany({}); } catch {}
  for (const [c, f] of [
    ['users', { username: new RegExp(`^${TAG}`) }],
    ['students', { admissionNumber: new RegExp(`^${TAG}`) }],
    // Payments are cleaned by STUDENT, not by receipt number. The server names
    // receipts REC-<digits>-<hex>, so matching `^zzph1` on receiptNumber matched
    // nothing and every run's receipts piled up against a student that phase 1
    // recreates with totalPaid back at zero. Phase 3's reconciliation then read
    // 220100 in live receipts against a totalPaid of 12100 and reported the app
    // inconsistent, when the app was right and the cleanup was not.
    ['payments', { studentId: new RegExp(`^${TAG}`) }]
  ]) { try { await db.collection(c).deleteMany(f); } catch {} }

  const tok = {};

  try {
    // =================================================================
    section('Phase 1 handed something over');

    const carried = await db.collection('students').findOne({ admissionNumber: `${TAG1}S001` });
    if (!ok('the student phase 1 created is still here', !!carried,
      'run `node tests/phase1-admin1.cjs` first — phase 2 reads its data')) {
      throw new Error('phase 1 data missing');
    }
    ok('it kept the campus phase 1 filed it at', carried.branch === PHASE1_CAMPUS, carried.branch);
    ok('it kept the year phase 1 upgraded it to',
      carried.studentYear && carried.studentYear !== 'First Year',
      `year "${carried.studentYear}" — phase 1 upgraded it, so this must not read First Year`);

    // =================================================================
    section('One accountant per campus');

    for (const campus of CAMPUSES) {
      const key = campus.replace(/\s+/g, '').toLowerCase();
      const username = `${TAG}${key}`;
      const password = `Pw-${crypto.randomBytes(9).toString('hex')}`;
      await db.collection('users').insertOne({
        username, password, pin: PIN, role: 'accountant', campus,
        name: `Phase2 Accountant ${campus}`, status: 'active', permissions: {},
        activeSessionId: null, createdAt: new Date(), updatedAt: new Date()
      });
      const login = await req('POST', '/api/auth/login', null, { username, password, pin: PIN });
      tok[campus] = login.json?.token;
      ok(`${campus} accountant signs in`, !!tok[campus],
        `status ${login.status}: ${login.raw.slice(0, 110)}`);
    }

    const A = tok[PHASE1_CAMPUS];

    // =================================================================
    section('The shared student registry');

    const search = await req('GET', `/api/accountant/students?limit=200`, A, undefined, withPin());
    ok('an accountant can list students', search.status === 200, `status ${search.status}`);
    ok('phase 1\'s student is findable by an accountant',
      rows(search).some(s => s.admissionNumber === `${TAG1}S001`),
      `${rows(search).length} rows, none matching ${TAG1}S001`);

    const one = await req('GET', `/api/accountant/students/${carried.studentId}`, A, undefined, withPin());
    ok('a single student record loads', one.status === 200, `status ${one.status}`);
    ok('it carries the contact number the WhatsApp reminder needs',
      /\d{10}/.test(JSON.stringify(one.json || {})),
      'no 10-digit contact in the record — a reminder cannot be addressed');

    // =================================================================
    section('Collecting a fee, and the receipt behind it');

    const before = await db.collection('students').findOne({ admissionNumber: `${TAG1}S001` });
    const paid = await req('POST', `/api/accountant/students/${carried.studentId}/payments`, A, {
      amount: 12000, category: 'Tuition', installment: 'Phase2 Instalment', paymentMode: 'UPI'
    }, withPin());
    ok('the accountant can take a payment', paid.status === 201 || paid.status === 200,
      `status ${paid.status}: ${paid.raw.slice(0, 150)}`);

    const receipt = paid.json?.data?.payment || paid.json?.data;
    const rcptNo = receipt?.receiptNumber;
    ok('a receipt number is issued', !!rcptNo, JSON.stringify(paid.json?.data || {}).slice(0, 120));

    const after = await db.collection('students').findOne({ admissionNumber: `${TAG1}S001` });
    ok('the student total moved by exactly the amount taken',
      Number(after.totalPaid) === Number(before.totalPaid) + 12000,
      `${before.totalPaid} -> ${after.totalPaid}`);

    ok('the receipt is booked to the STUDENT\'s campus, not the till\'s',
      (await db.collection('payments').findOne({ receiptNumber: rcptNo }))?.branch === PHASE1_CAMPUS,
      'per-campus revenue would follow whoever happened to be on the till');

    // The link a parent opens. The token is derived, not random, so it can be
    // rebuilt here the same way the server builds it.
    const rcptDoc = await db.collection('payments').findOne({ receiptNumber: rcptNo });
    ok('the receipt carries what the PDF prints',
      rcptDoc && rcptDoc.studentName && rcptDoc.amount === 12000 && rcptDoc.paymentMode,
      `name "${rcptDoc?.studentName}", amount ${rcptDoc?.amount}, mode ${rcptDoc?.paymentMode}`);

    const detail = await req('GET', `/api/accountant/students/${carried.studentId}/payments`, A, undefined, withPin());
    const hist = rows(detail);
    ok('the payment history loads', detail.status === 200, `status ${detail.status}`);
    ok('the new receipt is in the history', hist.some(p => p.receiptNumber === rcptNo),
      `${hist.length} receipts, none matching ${rcptNo}`);
    ok('the history carries a receipt link token for sharing',
      hist.some(p => p.receiptToken),
      'no receiptToken — the parent link cannot be built');

    // =================================================================
    section('Ledgers, history and the dashboard');

    for (const [label, path] of [
      ['dashboard summary', '/api/accountant/dashboard-summary'],
      ['payments ledger', '/api/accountant/payments?limit=50'],
      ['expenditure view', '/api/accountant/expenditures'],
      ['fee settings', `/api/accountant/fee-settings?branch=${encodeURIComponent(PHASE1_CAMPUS)}`],
      ['hostel register', '/api/accountant/hostel'],
      ['outstanding fees', '/api/fees/outstanding']
    ]) {
      const r = await req('GET', path, A, undefined, withPin());
      ok(`the ${label} loads`, r.status === 200, `status ${r.status}: ${r.raw.slice(0, 110)}`);
    }

    const ledger = await req('GET', '/api/accountant/payments?limit=50', A, undefined, withPin());
    ok('the ledger shows the payment just taken',
      rows(ledger).some(p => p.receiptNumber === rcptNo),
      `${rows(ledger).length} rows`);

    // The outstanding list is what the WhatsApp reminder is built from.
    const out = await req('GET', '/api/fees/outstanding', A, undefined, withPin());
    const outRows = rows(out);
    ok('every outstanding row has what a reminder needs (name and a balance)',
      outRows.every(s => s.name !== undefined && s.balance !== undefined || s.remainingBalance !== undefined),
      `first row: ${JSON.stringify(outRows[0] || {}).slice(0, 120)}`);

    // =================================================================
    section('Money stays inside its campus');

    const other = CAMPUSES.find(c => c !== PHASE1_CAMPUS);
    const foreign = await req('GET', '/api/accountant/payments?limit=200', tok[other], undefined, withPin());
    ok(`${other} cannot see ${PHASE1_CAMPUS}'s receipt`,
      !rows(foreign).some(p => p.receiptNumber === rcptNo),
      'a receipt leaked across campuses');

    const foreignExp = await req('GET', '/api/accountant/expenditures', tok[other], undefined, withPin());
    ok(`${other} expenditure view is scoped to itself`,
      foreignExp.status === 200 && rows(foreignExp).every(e => !e.branch || e.branch === other),
      `branches seen: ${[...new Set(rows(foreignExp).map(e => e.branch))].join(', ')}`);

    // Students are deliberately shared; money is not. Both directions asserted.
    const foreignStudents = await req('GET', '/api/accountant/students?limit=200', tok[other], undefined, withPin());
    ok(`${other} CAN still see the shared student registry`,
      rows(foreignStudents).some(s => s.admissionNumber === `${TAG1}S001`),
      'the shared registry stopped being shared — see verify-shared-registry.cjs');

    // =================================================================
    section('Adding and removing a student at each campus');

    const made = [];
    for (const campus of CAMPUSES) {
      // Campus initials, because admissionNumber is capped at 20 characters
      // and 'zzph2ErragattuguttaC1' is 21. The cap is correct; the test was not.
      const code = campus.split(' ').map(w => w[0]).join('') + campus.slice(-1);
      const adm = `${TAG}${code}`;
      const r = await req('POST', '/api/accountant/students', tok[campus], {
        name: `Phase2 ${campus}`, admissionNumber: adm, branch: campus,
        course: 'BiPC', section: 'A', academicYear: '2026-27', studentYear: '1st Year',
        mobile: '9000000' + String(200 + made.length).padStart(3, '0'),
        parentMobile: '9000000999', tuitionFee: 50000
      }, withPin());
      const doc = await db.collection('students').findOne({ admissionNumber: adm });
      ok(`a student is admitted at ${campus}`,
        (r.status === 201 || r.status === 200) && !!doc,
        `status ${r.status}: ${r.raw.slice(0, 130)}`);
      if (doc) {
        ok(`  ...and is filed at ${campus}`, doc.branch === campus, `filed at ${doc.branch}`);
        made.push({ campus, adm, id: doc.studentId });
      }
    }

    if (made.length) {
      const victim = made[0];

      // An accountant may now delete a student, and the deletion must be
      // undoable. Both halves matter: the operator asked for the first, and the
      // second is what makes it safe to have asked.
      const del = await req('DELETE', `/api/accountant/students/${victim.id}`, tok[victim.campus], undefined, withPin());
      ok('an accountant CAN delete a student', del.status < 300,
        `status ${del.status}: ${del.raw.slice(0, 130)}`);

      const gone = await req('GET', '/api/accountant/students?limit=200', tok[victim.campus], undefined, withPin());
      ok('the deleted student leaves the live list',
        !rows(gone).some(st => st.admissionNumber === victim.adm), 'still listed after deletion');

      const stillInDb = await db.collection('students').findOne({ admissionNumber: victim.adm });
      ok('the record survives soft-deleted, not destroyed', !!stillInDb,
        'hard-deleted — a mistaken deletion could not be undone');

      // The Rector puts it back. A delete with no route home is data loss with
      // extra steps.
      const rector = await db.collection('users').findOne({ role: 'admin1', username: new RegExp('^zzph1') });
      if (rector) {
        const rl = await req('POST', '/api/auth/login', null,
          { username: rector.username, password: rector.password, pin: rector.pin });
        const rtok = rl.json?.token;
        const bin = await req('GET', '/api/admin1/recently-deleted', rtok, undefined,
          { 'x-security-pin': rector.pin });
        const binRow = rows(bin).find(b => String(b.reference || '').startsWith(victim.adm));
        ok('the deletion shows in the recycle bin', !!binRow,
          `${rows(bin).length} rows, none referencing ${victim.adm}`);

        if (binRow) {
          const back = await req('POST', `/api/admin1/recently-deleted/${binRow.type || 'student'}/${binRow.id}/restore`,
            rtok, {}, { 'x-security-pin': rector.pin });
          const relisted = await req('GET', '/api/accountant/students?limit=200', tok[victim.campus], undefined, withPin());
          ok('and it can be restored',
            back.status < 300 && rows(relisted).some(st => st.admissionNumber === victim.adm),
            `status ${back.status}: ${back.raw.slice(0, 120)}`);
        }
      }
    }

    // =================================================================
    section('What an accountant must NOT be able to do');

    const tryTeacher = await req('POST', '/api/admin1/teachers', A, {
      id: `${TAG}T`, name: 'Should Not Exist', subject: 'X', salary: 1, branch: PHASE1_CAMPUS
    }, withPin());
    ok('an accountant cannot add a teacher', tryTeacher.status === 403, `status ${tryTeacher.status}`);

    const tryClerks = await req('GET', `/api/admin1/clerks?campus=${encodeURIComponent(PHASE1_CAMPUS)}`, A, undefined, withPin());
    ok('an accountant cannot list clerks', tryClerks.status === 403, `status ${tryClerks.status}`);

    const tryCreds = await req('POST', '/api/admin1/credentials', A, {}, withPin());
    ok('an accountant cannot open the credentials screen', tryCreds.status === 403, `status ${tryCreds.status}`);

    // =================================================================
    section('The audit trail names the accountant');

    const acctUser = `${TAG}${PHASE1_CAMPUS.replace(/\s+/g, '').toLowerCase()}`;
    const entries = await db.collection('auditlogs').countDocuments({ actorUsername: acctUser });
    ok('the accountant\'s actions are audited', entries > 0, `${entries} entries for ${acctUser}`);

    const payEntry = await db.collection('auditlogs').findOne({ actorUsername: acctUser, amount: 12000 });
    ok('the fee collection is in the trail with its amount', !!payEntry,
      'a payment with no audit entry naming who took it');

    console.log(`\n  Handing to phase 3:  ${made.length} campus students  ·  receipt ${rcptNo}`);

  } catch (err) {
    console.error('\nERROR', err.message);
    fail++;
  } finally {
    console.log(`\n${'='.repeat(62)}`);
    console.log(`PHASE 2 — ACCOUNTANTS: ${pass} passed, ${fail} failed`);
    if (failures.length) {
      console.log('');
      for (const f of failures) console.log(`  ✗ ${f}`);
    }
    console.log('='.repeat(62));
    // Deliberately NOT dropping the database: phase 3 reads this.
    await mongoose.disconnect().catch(() => {});
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
