/**
 * Admin2 Integration Verification Script
 * Run from: /server directory (node verify_admin2.js)
 * Requires: fetch (Node 18+)
 */

const BASE_URL = 'http://localhost:5000/api';

async function apiFetch(endpoint, method = 'GET', body = null, headers = {}) {
  const options = { method, headers: { ...headers } };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  ADMIN2 FINANCE & OPERATIONS WIRING VERIFICATION  ');
  console.log('======================================================\n');

  // ─── LOGIN FOR PORTALS ──────────────────────────────────────────────
  console.log('[LOGIN] Logging in as admin2...');
  const loginA2 = await apiFetch('/auth/login', 'POST', { identifier: 'admin2', password: '111111' });
  if (loginA2.status !== 200 || !loginA2.data.token) {
    console.error('❌ Admin2 login failed:', loginA2.data);
    process.exit(1);
  }
  const tokenA2 = loginA2.data.token;
  const authA2 = { 'Authorization': `Bearer ${tokenA2}` };
  console.log('✅ Logged in as Admin2.\n');

  console.log('[LOGIN] Logging in as accountant...');
  const loginAc = await apiFetch('/auth/login', 'POST', { identifier: 'accountant', password: '111111' });
  if (loginAc.status !== 200 || !loginAc.data.token) {
    console.error('❌ Accountant login failed:', loginAc.data);
    process.exit(1);
  }
  const tokenAc = loginAc.data.token;
  const authAc = { 'Authorization': `Bearer ${tokenAc}` };
  console.log('✅ Logged in as Accountant.\n');

  console.log('[LOGIN] Logging in as student (canonical user)...');
  const loginStu = await apiFetch('/auth/login', 'POST', { identifier: 'student', password: '111111' });
  if (loginStu.status !== 200 || !loginStu.data.token) {
    console.error('❌ Student login failed:', loginStu.data);
    process.exit(1);
  }
  const tokenStu = loginStu.data.token;
  const authStu = { 'Authorization': `Bearer ${tokenStu}` };
  console.log('✅ Logged in as Student.\n');

  // Fetch canonical student object to get ID
  const studentProfileRes = await apiFetch('/student/me/profile', 'GET', null, authStu);
  if (studentProfileRes.status !== 200) {
    console.error('❌ Failed to fetch student profile:', studentProfileRes.data);
    process.exit(1);
  }
  const studentDb = studentProfileRes.data.data;
  const studentId = studentDb._id;
  console.log(`Resolved student ID for ${studentDb.name}: ${studentId}`);
  console.log(`Initial Student Remaining Balance: ₹${studentDb.remainingBalance}\n`);

  // ─── TEST 1: FEE LOCK / UNLOCK BEHAVIOR ─────────────────────────────
  console.log('[TEST 1] Testing baseline rates lock/unlock behavior...');
  
  // 1. Get initial settings
  const settingsRes1 = await apiFetch('/admin2/fee-settings', 'GET', null, authA2);
  console.log(`Current isLocked status: ${settingsRes1.data.data.isLocked}`);

  // 2. Lock the settings
  console.log('Locking fee settings...');
  const lockRes = await apiFetch('/admin2/fee-settings', 'PATCH', { isLocked: true }, authA2);
  if (lockRes.status !== 200 || lockRes.data.data.isLocked !== true) {
    console.error('❌ Failed to lock fee settings:', lockRes.data);
    process.exit(1);
  }
  console.log('✅ Fee settings successfully locked.');

  // 3. Attempt to change rates while locked (should fail)
  console.log('Attempting to change tuition rate while locked (expected to fail)...');
  const failRes = await apiFetch('/admin2/fee-settings', 'PATCH', { tuition: 130000 }, authA2);
  if (failRes.status === 400) {
    console.log(`✅ Received expected 400 error: "${failRes.data.message}"`);
  } else {
    console.error(`❌ Expected 400, got ${failRes.status} instead. Settings change allowed while locked!`);
    process.exit(1);
  }

  // 4. Explicit unlock action (isLocked: false)
  console.log('Unlocking settings explicitly for demo fallback...');
  const unlockRes = await apiFetch('/admin2/fee-settings', 'PATCH', { isLocked: false }, authA2);
  if (unlockRes.status === 200 && unlockRes.data.data.isLocked === false) {
    console.log('✅ Settings successfully unlocked.');
  } else {
    console.error('❌ Failed to unlock fee settings:', unlockRes.data);
    process.exit(1);
  }
  console.log('');

  // ─── TEST 2: STUDENT FEE OVERRIDE AND LEDGER BREAKDOWN ──────────────
  console.log('[TEST 2] Applying fee overrides and checking breakdown ledger...');

  // Get initial breakdown
  const preBreakdown = await apiFetch(`/admin2/students/${studentId}/fee-breakdown`, 'GET', null, authA2);
  const initialWaiver = preBreakdown.data.data.tuitionWaiver;
  const initialBalance = preBreakdown.data.data.remainingBalance;
  console.log(`Initial Tuition Waiver: ₹${initialWaiver}, Initial Remaining Balance: ₹${initialBalance}`);

  // Apply a new override: add ₹5,000 waiver
  const newWaiver = initialWaiver + 5000;
  console.log(`Applying new tuition waiver of ₹${newWaiver}...`);
  const overrideRes = await apiFetch(`/admin2/students/${studentId}/fee-override`, 'PATCH', { tuitionWaiver: newWaiver }, authA2);
  if (overrideRes.status !== 200) {
    console.error('❌ Failed to apply fee override:', overrideRes.data);
    process.exit(1);
  }
  console.log('✅ Waiver patch request succeeded.');

  // Fetch updated breakdown
  const postBreakdown = await apiFetch(`/admin2/students/${studentId}/fee-breakdown`, 'GET', null, authA2);
  const updatedWaiver = postBreakdown.data.data.tuitionWaiver;
  const updatedBalance = postBreakdown.data.data.remainingBalance;
  console.log(`Updated Tuition Waiver: ₹${updatedWaiver}, Updated Remaining Balance: ₹${updatedBalance}`);

  // Remaining balance calculation: (baseFee - scholarshipDeduction - waivers - totalPaid)
  // Let's verify that the balance decreased by exactly ₹5000 (or down to 0)
  const expectedDecrease = Math.min(initialBalance, 5000);
  if (initialBalance - updatedBalance === expectedDecrease) {
    console.log('✅ Balance decreased by correct amount matching the waiver.');
  } else {
    console.error(`❌ Balance did not decrease correctly. Expected: ${initialBalance - expectedDecrease}, Got: ${updatedBalance}`);
    process.exit(1);
  }
  console.log('');

  // ─── TEST 3: CROSS-PORTAL DATA SYNC ────────────────────────────────
  console.log('[TEST 3] Verifying cross-portal fee synchronization...');

  // 1. Accountant Portal view of student
  console.log('Checking remaining balance from Accountant Portal student details...');
  const accountantStuRes = await apiFetch(`/accountant/students/${studentId}`, 'GET', null, authAc);
  const accountantBalance = accountantStuRes.data.data.remainingBalance;
  console.log(`Accountant Portal reported balance: ₹${accountantBalance}`);

  // 2. Student Portal view of student profile
  console.log('Checking remaining balance from Student Portal profile...');
  const studentStuRes = await apiFetch('/student/me/profile', 'GET', null, authStu);
  const studentBalance = studentStuRes.data.data.remainingBalance;
  console.log(`Student Portal reported balance: ₹${studentBalance}`);

  if (accountantBalance === updatedBalance && studentBalance === updatedBalance) {
    console.log('✅ SUCCESS: All three portals agree on the remaining balance!');
  } else {
    console.error('❌ Portal balance mismatch! Admin2:', updatedBalance, 'Accountant:', accountantBalance, 'Student:', studentBalance);
    process.exit(1);
  }
  console.log('');

  // ─── TEST 4: EXPENDITURE CRUD ─────────────────────────────────────
  console.log('[TEST 4] Testing Expenditure CRUD operations...');
  
  // 1. Create expenditure
  const newExp = { category: 'Infrastructure', amount: 45000, description: 'Lab AC unit replacement', date: '2026-07-07' };
  console.log('Creating new expenditure item...');
  const createExpRes = await apiFetch('/admin2/expenditure', 'POST', newExp, authA2);
  if (createExpRes.status !== 201 || !createExpRes.data.data._id) {
    console.error('❌ Failed to create expenditure:', createExpRes.data);
    process.exit(1);
  }
  const expId = createExpRes.data.data._id;
  console.log(`✅ Expenditure created. ID: ${expId}`);

  // 2. Get expenditures list & verify
  const listExpRes = await apiFetch('/admin2/expenditure', 'GET', null, authA2);
  const foundExp = listExpRes.data.data.find(e => e._id === expId);
  if (foundExp && foundExp.amount === 45000) {
    console.log('✅ Created item successfully found in fetch list.');
  } else {
    console.error('❌ Created item missing or incorrect in list.');
    process.exit(1);
  }

  // 3. Edit expenditure
  console.log('Updating expenditure description...');
  const editExpRes = await apiFetch(`/admin2/expenditure/${expId}`, 'PATCH', { description: 'Lab AC unit replacement (Server Room)' }, authA2);
  if (editExpRes.status !== 200 || editExpRes.data.data.description !== 'Lab AC unit replacement (Server Room)') {
    console.error('❌ Failed to update expenditure:', editExpRes.data);
    process.exit(1);
  }
  console.log('✅ Expenditure description updated successfully.');

  // 4. Delete expenditure
  console.log('Deleting expenditure...');
  const deleteExpRes = await apiFetch(`/admin2/expenditure/${expId}`, 'DELETE', null, authA2);
  if (deleteExpRes.status !== 200) {
    console.error('❌ Failed to delete expenditure:', deleteExpRes.data);
    process.exit(1);
  }
  console.log('✅ Expenditure deleted successfully.');

  // Verify deletion
  const listExpRes2 = await apiFetch('/admin2/expenditure', 'GET', null, authA2);
  const deletedExpFound = listExpRes2.data.data.find(e => e._id === expId);
  if (!deletedExpFound) {
    console.log('✅ Verified deletion: item no longer in database.');
  } else {
    console.error('❌ Item still exists in list after delete command.');
    process.exit(1);
  }
  console.log('');

  // ─── TEST 5: WORKER PAYMENTS CRUD ─────────────────────────────────
  console.log('[TEST 5] Testing Worker Payments CRUD operations...');
  
  // 1. Create worker payment
  const newWorker = { workerName: 'Ramesh Singh', role: 'Security Guard', amount: 15000, monthPeriod: 'June 2026', paid: false };
  console.log('Creating new worker payment...');
  const createWorkerRes = await apiFetch('/admin2/worker-payments', 'POST', newWorker, authA2);
  if (createWorkerRes.status !== 201 || !createWorkerRes.data.data._id) {
    console.error('❌ Failed to create worker payment:', createWorkerRes.data);
    process.exit(1);
  }
  const workerPaymentId = createWorkerRes.data.data._id;
  console.log(`✅ Worker payment created. ID: ${workerPaymentId}`);

  // 2. Edit worker payment (mark paid)
  console.log('Toggling worker payment paid status to true...');
  const editWorkerRes = await apiFetch(`/admin2/worker-payments/${workerPaymentId}`, 'PATCH', { paid: true }, authA2);
  if (editWorkerRes.status !== 200 || editWorkerRes.data.data.paid !== true) {
    console.error('❌ Failed to update worker payment:', editWorkerRes.data);
    process.exit(1);
  }
  console.log('✅ Worker payment status toggled successfully.');

  // 3. Delete worker payment
  console.log('Deleting worker payment...');
  const deleteWorkerRes = await apiFetch(`/admin2/worker-payments/${workerPaymentId}`, 'DELETE', null, authA2);
  if (deleteWorkerRes.status !== 200) {
    console.error('❌ Failed to delete worker payment:', deleteWorkerRes.data);
    process.exit(1);
  }
  console.log('✅ Worker payment deleted successfully.');

  // Verify deletion
  const listWorkerRes = await apiFetch('/admin2/worker-payments', 'GET', null, authA2);
  const deletedWorkerFound = listWorkerRes.data.data.find(w => w._id === workerPaymentId);
  if (!deletedWorkerFound) {
    console.log('✅ Verified deletion: worker payment no longer in database.');
  } else {
    console.error('❌ Worker payment still exists after delete command.');
    process.exit(1);
  }
  console.log('');

  // ─── TEST 6: STAFF SALARIES WIRING ─────────────────────────────────
  console.log('[TEST 6] Testing Staff Salaries Toggle operations...');
  
  // 1. Fetch teachers salaries list
  const staffSalRes = await apiFetch('/admin2/staff-salaries', 'GET', null, authA2);
  if (staffSalRes.status !== 200 || staffSalRes.data.data.length === 0) {
    console.error('❌ Failed to fetch staff salaries:', staffSalRes.data);
    process.exit(1);
  }
  const firstTeacher = staffSalRes.data.data[0];
  console.log(`Found teacher ${firstTeacher.name} (ID: ${firstTeacher.id}) with salary: ₹${firstTeacher.salary}, status: ${firstTeacher.salaryStatus || 'pending'}`);

  // 2. Toggle status
  const originalStatus = firstTeacher.salaryStatus || 'pending';
  console.log(`Toggling salary status from ${originalStatus}...`);
  const toggleRes = await apiFetch(`/admin2/staff-salaries/${firstTeacher.id}`, 'PATCH', null, authA2);
  if (toggleRes.status !== 200) {
    console.error('❌ Failed to toggle staff salary:', toggleRes.data);
    process.exit(1);
  }
  const toggledTeacher = toggleRes.data.data;
  console.log(`✅ Salary toggled. New status: ${toggledTeacher.salaryStatus}, Date: ${toggledTeacher.salaryPaymentDate}`);

  // Revert toggle back to keep DB state clean
  console.log('Reverting toggle back to original status...');
  await apiFetch(`/admin2/staff-salaries/${firstTeacher.id}`, 'PATCH', null, authA2);
  console.log('✅ Status reverted.');
  console.log('');

  // ─── TEST 7: YEARLY ENROLLMENT STATS ───────────────────────────────
  console.log('[TEST 7] Fetching Yearly Enrollment Stats...');
  const statsRes = await apiFetch('/admin2/enrollment-stats', 'GET', null, authA2);
  if (statsRes.status !== 200) {
    console.error('❌ Failed to fetch enrollment stats:', statsRes.data);
    process.exit(1);
  }
  console.log('✅ Stats fetched successfully:');
  statsRes.data.data.forEach(yearStat => {
    console.log(`- Academic Year: ${yearStat.academicYear} | MPC: ${yearStat.mpc} | BiPC: ${yearStat.bipc} | CEC: ${yearStat.cec} | Total: ${yearStat.total}`);
  });
  console.log('');

  // ─── TEST 8: AUTHORIZATION GUARD CHECKS ────────────────────────────
  console.log('[TEST 8] Verifying Authorization Guards (Admin2 gets 403 on Admin1 routing)...');
  const guardRes1 = await apiFetch('/admin1/students', 'GET', null, authA2);
  if (guardRes1.status === 403) {
    console.log('✅ Guard confirmed: Admin2 received 403 on /admin1/students.');
  } else {
    console.error(`❌ FAILED: Admin2 was allowed on Admin1 route! Status: ${guardRes1.status}`);
    process.exit(1);
  }
  console.log('');

  // ─── SANITY CHECK: EXAM RESULTS OUT OF 100 ─────────────────────────
  console.log('[SANITY CHECK] Verifying student exam results are consistent out-of-100...');
  const academicsRes = await apiFetch('/student/me/academics', 'GET', null, authStu);
  if (academicsRes.status === 200) {
    const results = academicsRes.data.data.examResults;
    const inconsistent = results.filter(r => r.maxMarks !== 100);
    if (inconsistent.length === 0) {
      console.log('✅ SANITY CHECK PASSED: All exam results show maxMarks: 100.');
    } else {
      console.warn(`⚠️ SANITY CHECK WARNING: Found ${inconsistent.length} results without maxMarks 100!`);
      inconsistent.forEach(r => {
        console.log(`  - Subject: ${r.subject}, MaxMarks: ${r.maxMarks}`);
      });
    }
  } else {
    console.error('❌ Failed to fetch academics for sanity check.');
  }

  console.log('\n======================================================');
  console.log('  🎉 ALL ADMIN2 ROUTING & WIRING TESTS PASSED SUCCESFULLY!  ');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
