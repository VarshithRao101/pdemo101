/**
 * Admin1 Integration Verification Script
 * Run from: /server directory (node verify_admin1.js)
 * Requires: XLSX from server/node_modules, fetch (Node 18+)
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const BASE_URL = 'http://localhost:5000/api';

async function apiFetch(endpoint, method = 'GET', body = null, headers = {}) {
  const options = { method, headers: { ...headers } };
  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runTests() {
  console.log('\n========================================');
  console.log('  ADMIN1 INTEGRATION VERIFICATION TESTS  ');
  console.log('========================================\n');

  // ─── TEST 1: Login as admin1 ──────────────────────────────────────────────
  console.log('[TEST 1] Logging in as admin1...');
  const loginRes = await apiFetch('/auth/login', 'POST', { identifier: 'admin1', password: '111111' });
  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('❌  Login failed:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.token;
  const authH = { 'Authorization': `Bearer ${token}` };
  console.log('✅  Logged in. Token acquired.\n');

  // Fetch security key for validation
  const keysRes = await apiFetch('/authenticator/keys', 'GET', null, authH);
  if (keysRes.status !== 200) {
    console.error('❌  Failed to fetch security keys:', keysRes.data);
    process.exit(1);
  }
  const keys = keysRes.data.data;
  const admin1Obj = keys.find(k => k.role === 'admin1');
  const admin3Obj = keys.find(k => k.role === 'admin3');
  const admin1KeyHeader = { 'x-security-key': admin1Obj ? admin1Obj.key : '' };
  const admin3KeyHeader = { 'x-security-key': admin3Obj ? admin3Obj.key : '' };
  console.log('✅  Active Security Keys resolved from Authenticator:', { admin1: admin1KeyHeader, admin3: admin3KeyHeader }, '\n');

  // ─── TEST 2: Students List ────────────────────────────────────────────────
  console.log('[TEST 2] Fetching students list...');
  const studentsRes = await apiFetch('/admin1/students', 'GET', null, authH);
  if (studentsRes.status !== 200) {
    console.error('❌  Fetch students failed:', studentsRes.data);
    process.exit(1);
  }
  const students = studentsRes.data.data;
  const student = students.find(s => s.studentId === 'STU-2421604');
  if (!student) { console.error('❌  Canonical student STU-2421604 not found.'); process.exit(1); }
  console.log(`✅  ${students.length} students fetched. Canonical student found: ${student.name}\n`);

  // ─── TEST 3: Patch Student (financial field guard) ────────────────────────
  console.log('[TEST 3] Patching student (name + mobile, also sending tuitionFee which must be ignored)...');
  const originalName = student.name;
  const patchRes = await apiFetch(`/admin1/students/${student._id}`, 'PATCH', {
    name: originalName + ' Edited',
    mobile: '9999999999',
    tuitionFee: 9999999
  }, { ...authH, ...admin1KeyHeader });
  if (patchRes.status !== 200) { console.error('❌  PATCH student failed:', patchRes.data); process.exit(1); }
  const updatedStu = patchRes.data.data;
  if (updatedStu.name !== originalName + ' Edited') { console.error('❌  Name was not updated.'); process.exit(1); }
  if (updatedStu.tuitionFee === 9999999) { console.error('❌  SECURITY BREACH: tuitionFee was mutated!'); process.exit(1); }
  console.log(`✅  Name updated to "${updatedStu.name}". tuitionFee guard confirmed (not mutated).\n`);

  // Revert name
  await apiFetch(`/admin1/students/${student._id}`, 'PATCH', { name: originalName }, { ...authH, ...admin1KeyHeader });

  // ─── TEST 4: Admin1 cannot reach Admin2 routes ────────────────────────────
  console.log('[TEST 4] Verifying Admin1 gets 403 on Admin2-only route (/admin/fee-settings)...');
  const guardRes = await apiFetch('/admin/fee-settings', 'GET', null, authH);
  if (guardRes.status !== 403) {
    console.error(`❌  Expected 403, got ${guardRes.status}. Admin1 can access Admin2 routes!`);
    process.exit(1);
  }
  console.log('✅  Authorization guard works. Admin1 receives 403 Forbidden.\n');

  // ─── TEST 5: Exam Results Upload (mixed valid/invalid rows) ──────────────
  console.log('[TEST 5] Generating and uploading exam results spreadsheet (5 rows: 1 valid, 4 invalid)...');
  const rollNum = student.rollNumber;
  const examRows = [
    { rollNumber: rollNum, subject: 'Physics', score: 85, maxMarks: 100, testTitle: 'Verify Test', date: '07 July 2026' }, // VALID
    { rollNumber: 'BAD_ROLL_999', subject: 'Physics', score: 80, maxMarks: 100, testTitle: 'Verify Test', date: '07 July 2026' }, // invalid roll
    { rollNumber: rollNum, subject: 'Physics', score: 150, maxMarks: 100, testTitle: 'Verify Test', date: '07 July 2026' }, // score > maxMarks
    { rollNumber: rollNum, subject: 'Physics', score: -5, maxMarks: 100, testTitle: 'Verify Test', date: '07 July 2026' }, // negative score
    { rollNumber: rollNum, subject: 'Physics', score: 'abc', maxMarks: 100, testTitle: 'Verify Test', date: '07 July 2026' }, // non-numeric
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(examRows), 'Results');
  const examPath = path.join(__dirname, '_test_exams.xlsx');
  XLSX.writeFile(wb, examPath);

  const examFD = new FormData();
  examFD.append('file', new Blob([fs.readFileSync(examPath)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'test_exams.xlsx');
  examFD.append('testTitle', 'Verify Test');
  examFD.append('date', '07 July 2026');

  const examUploadRes = await apiFetch('/admin1/exams/upload', 'POST', examFD, { 'Authorization': `Bearer ${token}`, ...admin3KeyHeader });
  fs.unlinkSync(examPath);

  if (examUploadRes.status !== 200) { console.error('❌  Exam upload failed:', examUploadRes.data); process.exit(1); }
  const es = examUploadRes.data.data;
  console.log(`   Rows total=${es.total}  succeeded=${es.succeeded}  failed=${es.failed}`);
  es.errors.forEach(e => console.log(`   ✗ Row ${e.row}: ${e.reason}`));

  if (es.total !== 5 || es.succeeded !== 1 || es.failed !== 4) {
    console.error(`❌  Expected 5 total, 1 succeeded, 4 failed. Got: ${es.total}/${es.succeeded}/${es.failed}`);
    process.exit(1);
  }
  console.log('✅  Exam results upload validation counts are correct.\n');

  // ─── TEST 6: Timetable Upload (mixed valid/invalid rows) ─────────────────
  console.log('[TEST 6] Generating and uploading timetable spreadsheet (3 rows: 1 valid, 2 invalid)...');
  const ttRows = [
    { day: 'Monday', period: '09:00 AM - 10:00 AM', subject: 'Physics', teacherId: 'FAC-201' }, // VALID
    { day: 'Monday', period: '10:00 AM - 11:00 AM', subject: 'Mathematics', teacherId: 'BAD_FAC' }, // invalid teacher
    { period: '11:15 AM - 12:15 PM', subject: 'Chemistry', teacherId: 'FAC-201' }, // missing day
  ];

  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(ttRows), 'Timetable');
  const ttPath = path.join(__dirname, '_test_timetable.xlsx');
  XLSX.writeFile(wb2, ttPath);

  const ttFD = new FormData();
  ttFD.append('file', new Blob([fs.readFileSync(ttPath)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'test_timetable.xlsx');
  ttFD.append('section', 'Section A');

  const ttUploadRes = await apiFetch('/admin1/timetable/upload', 'POST', ttFD, { 'Authorization': `Bearer ${token}`, ...admin3KeyHeader });
  fs.unlinkSync(ttPath);

  if (ttUploadRes.status !== 200) { console.error('❌  Timetable upload failed:', ttUploadRes.data); process.exit(1); }
  const ts = ttUploadRes.data.data;
  console.log(`   Rows total=${ts.total}  succeeded=${ts.succeeded}  failed=${ts.failed}`);
  ts.errors.forEach(e => console.log(`   ✗ Row ${e.row}: ${e.reason}`));

  if (ts.total !== 3 || ts.succeeded !== 1 || ts.failed !== 2) {
    console.error(`❌  Expected 3 total, 1 succeeded, 2 failed. Got: ${ts.total}/${ts.succeeded}/${ts.failed}`);
    process.exit(1);
  }
  console.log('✅  Timetable upload validation counts are correct.\n');

  // ─── TEST 7: Attendance Summary ───────────────────────────────────────────
  console.log('[TEST 7] Fetching attendance summary (should read Accountant-seeded AttendanceRecords)...');
  const attRes = await apiFetch('/admin1/attendance-summary', 'GET', null, authH);
  if (attRes.status !== 200) { console.error('❌  Attendance summary fetch failed:', attRes.data); process.exit(1); }
  const attData = attRes.data.data;
  console.log('   Sections returned:');
  (attData.sections || []).forEach(s => {
    console.log(`   - ${s.section}: total=${s.total}, present=${s.present}, absent=${s.absent}, ratio=${s.ratio}%`);
  });
  console.log(`   Totals: ${JSON.stringify(attData.totals)}`);
  console.log('✅  Attendance Summary API responded correctly.\n');

  // ─── TEST 8: Reports Dashboard ────────────────────────────────────────────
  console.log('[TEST 8] Fetching Reports dashboard...');
  const repRes = await apiFetch('/admin1/reports', 'GET', null, authH);
  if (repRes.status !== 200) { console.error('❌  Reports fetch failed:', repRes.data); process.exit(1); }
  const rep = repRes.data.data;
  console.log(`   Enrollment by section: ${JSON.stringify(rep.enrollmentBySection)}`);
  console.log(`   Enrollment by course: ${JSON.stringify(rep.enrollmentByCourse)}`);
  console.log(`   Attendance trends (${(rep.attendanceTrends || []).length} days)`);
  console.log('✅  Reports dashboard responded correctly.\n');

  // ─── TEST 9: Cross-portal - Student Academics shows uploaded scores ───────
  console.log('[TEST 9] Logging in as student to verify exam score appears in Student Portal academics...');
  const stuLoginRes = await apiFetch('/auth/login', 'POST', { identifier: student.rollNumber, password: '111111' });
  if (stuLoginRes.status !== 200 || !stuLoginRes.data.token) {
    console.error('❌  Student login failed:', stuLoginRes.data);
    process.exit(1);
  }
  const stuH = { 'Authorization': `Bearer ${stuLoginRes.data.token}` };
  const acaRes = await apiFetch('/student/me/academics', 'GET', null, stuH);
  if (acaRes.status !== 200) { console.error('❌  Student academics fetch failed:', acaRes.data); process.exit(1); }

  const examResults = acaRes.data.data?.examResults || acaRes.data.data?.results || [];
  const verifyTestPhysics = examResults.find(r => r.testTitle === 'Verify Test' && r.subject === 'Physics');

  if (!verifyTestPhysics) {
    console.error('❌  "Verify Test" Physics score NOT found in Student Portal academics. Cross-portal sync broken.');
    process.exit(1);
  }
  if (verifyTestPhysics.score !== 85 || verifyTestPhysics.maxMarks !== 100) {
    console.error(`❌  Expected score=85/maxMarks=100. Got: ${verifyTestPhysics.score}/${verifyTestPhysics.maxMarks}`);
    process.exit(1);
  }
  console.log(`✅  Cross-portal sync confirmed! Physics: ${verifyTestPhysics.score}/${verifyTestPhysics.maxMarks}\n`);

  console.log('========================================');
  console.log('  🎉  ALL 9 TESTS PASSED SUCCESSFULLY!  ');
  console.log('========================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌  Unhandled error:', err.message);
  process.exit(1);
});
