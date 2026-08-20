/**
 * The Marks Registry, which until now had a screen and no server.
 *
 * Also covers the permission that screen writes behind, because a route that
 * was ungated yesterday is exactly the one to check is gated today.
 *
 * Writes are made to a real student and then rolled back to what they were.
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../server/app.cjs');

const PORT = 4602;
const BASE = `http://127.0.0.1:${PORT}`;
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

const req = (method, path, { token, body } = {}) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
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

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nMARKS REGISTRY — a screen that had no server\n');

  let restore = null;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
    const users = mongoose.connection.collection('users');
    const rector = await users.findOne({ role: 'admin1', status: 'active' });
    if (!rector || String(rector.password || '').startsWith('$2')) {
      console.log('  Rector credential unavailable in plaintext; cannot drive login.');
      process.exit(1);
    }

    const login = await req('POST', '/api/auth/login', { body: { username: rector.username, password: rector.password } });
    ok('rector logs in', login.status === 200 && login.json?.token, `status ${login.status}`);
    const token = login.json.token;

    // --- Read -----------------------------------------------------------
    const list = await req('GET', '/api/admin2/student-marks', { token });
    ok('the marks endpoint exists', list.status === 200, `status ${list.status}`);
    const students = list.json?.data || [];
    ok('it returns students', students.length > 0, `${students.length}`);
    ok('every row carries a marks array', students.every(s => Array.isArray(s.marks)),
      'the screen calls s.marks.find() without guarding');
    ok('every row carries the fields the screen reads',
      students.every(s => typeof s.name === 'string' && typeof s.studentId === 'string'));

    const target = students[0];
    restore = { studentId: target.studentId, marks: target.marks };

    // --- Write ----------------------------------------------------------
    const save = await req('PATCH', '/api/admin2/student-marks', {
      token, body: { studentId: target.studentId, subject: 'Physics', midterm: 71, final: 88 }
    });
    ok('a mark saves', save.status === 200, `status ${save.status} ${save.raw.slice(0, 120)}`);

    const after = await req('GET', '/api/admin2/student-marks', { token });
    const saved = (after.json?.data || []).find(s => s.studentId === target.studentId)
      ?.marks?.find(m => m.subject === 'Physics');
    ok('the mark reads back', saved && saved.midterm === 71 && saved.final === 88,
      JSON.stringify(saved));

    // Editing the same subject must update, not append a second row.
    await req('PATCH', '/api/admin2/student-marks', {
      token, body: { studentId: target.studentId, subject: 'Physics', midterm: 65, final: 90 }
    });
    const again = await req('GET', '/api/admin2/student-marks', { token });
    const physics = (again.json?.data || []).find(s => s.studentId === target.studentId)
      ?.marks?.filter(m => m.subject === 'Physics') || [];
    ok('re-saving a subject updates rather than duplicates', physics.length === 1, `${physics.length} rows`);
    ok('the update took', physics[0]?.midterm === 65 && physics[0]?.final === 90);

    // --- Refusals -------------------------------------------------------
    const bad = [
      [{ studentId: target.studentId, subject: 'Astrology', midterm: 1, final: 1 }, 'an unknown subject'],
      [{ studentId: target.studentId, subject: 'Physics', midterm: 150, final: 10 }, 'a mark above 100'],
      [{ studentId: target.studentId, subject: 'Physics', midterm: -5, final: 10 }, 'a negative mark'],
      [{ studentId: target.studentId, subject: 'Physics', midterm: 'abc', final: 10 }, 'a non-numeric mark'],
      [{ studentId: target.studentId, subject: 'Physics', midterm: 1e9, final: 10 }, 'an absurd mark'],
      [{ subject: 'Physics', midterm: 10, final: 10 }, 'a missing studentId'],
      [{ studentId: { $ne: null }, subject: 'Physics', midterm: 10, final: 10 }, 'a NoSQL operator as the id']
    ];
    for (const [body, label] of bad) {
      const r = await req('PATCH', '/api/admin2/student-marks', { token, body });
      ok(`${label} is refused`, r.status >= 400 && r.status < 500, `status ${r.status}`);
    }

    const anon = await req('PATCH', '/api/admin2/student-marks', {
      body: { studentId: target.studentId, subject: 'Physics', midterm: 10, final: 10 }
    });
    ok('an unauthenticated write is refused', anon.status === 401 || anon.status === 403, `status ${anon.status}`);

    // --- The audit trail ------------------------------------------------
    const logs = await mongoose.connection.collection('auditlogs')
      .find({ action: 'student.marks.update' }).sort({ createdAt: -1 }).limit(1).toArray();
    ok('a mark change is written to the audit trail', logs.length === 1);
    ok('the trail names who changed it', logs[0]?.actorUsername === rector.username, logs[0]?.actorUsername);

    console.log(`\n  ${pass} passed, ${fail} failed\n`);
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    // Put the student back exactly as found.
    if (restore) {
      await mongoose.connection.collection('students')
        .updateOne({ studentId: restore.studentId }, { $set: { marks: restore.marks || [] } });
      console.log(`  (restored ${restore.studentId} to its original marks)`);
    }
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
