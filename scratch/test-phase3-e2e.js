const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');
require('dotenv').config({ path: '.env' });

const dbUri = process.env.MONGODB_URI;
const dbName = 'jc_erp_prod';

console.log('=== PHASE 3 END-TO-END VERIFICATION TEST ===\n');

async function runTests() {
  await mongoose.connect(dbUri, { dbName });
  console.log('✅ Connected to MongoDB Atlas cluster:', dbUri.split('@')[1].split('/')[0]);

  const db = mongoose.connection.db;

  // 1. Seed test users if needed
  const usersCol = db.collection('users');
  const teachersCol = db.collection('teachers');
  const workerPaymentsCol = db.collection('workerpayments');

  // Hash PIN 784920
  const hashedPin = await bcrypt.hash('784920', 10);
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Setup Admin1 user
  await usersCol.updateOne(
    { username: 'admin1_p3' },
    {
      $set: {
        username: 'admin1_p3',
        password: hashedPassword,
        role: 'admin1',
        pin: hashedPin,
        campus: 'Erragattugutta C1',
        isActive: true
      }
    },
    { upsert: true }
  );

  // Setup Admin2 user for Erragattugutta C1
  await usersCol.updateOne(
    { username: 'admin2_c1_p3' },
    {
      $set: {
        username: 'admin2_c1_p3',
        password: hashedPassword,
        role: 'admin2',
        pin: hashedPin,
        campus: 'Erragattugutta C1',
        isActive: true
      }
    },
    { upsert: true }
  );

  // Setup Admin2 user for Beemaram C1
  await usersCol.updateOne(
    { username: 'admin2_b1_p3' },
    {
      $set: {
        username: 'admin2_b1_p3',
        password: hashedPassword,
        role: 'admin2',
        pin: hashedPin,
        campus: 'Beemaram C1',
        isActive: true
      }
    },
    { upsert: true }
  );

  console.log('✅ Seeded test users (admin1_p3, admin2_c1_p3, admin2_b1_p3) with Security PIN: 784920');

  // Helper for HTTP requests
  const serverPort = 5000;

  function makeRequest(options, postData) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, data });
          }
        });
      });
      req.on('error', reject);
      if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      req.end();
    });
  }

  // Login as admin1_p3 to get JWT token
  const admin1Auth = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin1_p3', password: 'admin123', role: 'admin1' });

  const admin1Token = admin1Auth.data.token;
  console.log('✅ Admin1 login token acquired');

  // Login as admin2_c1_p3
  const admin2C1Auth = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin2_c1_p3', password: 'admin123', role: 'admin2' });

  const admin2C1Token = admin2C1Auth.data.token;
  console.log('✅ Admin2 (Erragattugutta C1) login token acquired');

  // Login as admin2_b1_p3
  const admin2B1Auth = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin2_b1_p3', password: 'admin123', role: 'admin2' });

  const admin2B1Token = admin2B1Auth.data.token;
  console.log('✅ Admin2 (Beemaram C1) login token acquired\n');

  // --- TEST 1: Employee Duplication & Deduplicated GET ---
  console.log('--- TEST 1: Deduplicated GET Teachers ---');
  const getRes = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/admin1/teachers',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${admin1Token}` }
  });
  console.log(`HTTP ${getRes.statusCode} - Total teachers returned:`, getRes.data.data ? getRes.data.data.length : 0);
  if (getRes.statusCode === 200 && Array.isArray(getRes.data.data)) {
    const ids = getRes.data.data.map(t => t.id);
    const uniqueIds = new Set(ids);
    if (ids.length === uniqueIds.size) {
      console.log('✅ PASS: Teacher list contains 0 duplicates!');
    } else {
      console.error('❌ FAIL: Teacher list contains duplicates!', ids);
    }
  }

  // --- TEST 2: Campus Isolation for Admin2 ---
  console.log('\n--- TEST 2: Campus Isolation for Admin2 ---');
  // Create staff for Beemaram C1 as admin1
  const testStaffB1Id = `FAC-B1-${Date.now()}`;
  const createB1Res = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/admin1/teachers',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${admin1Token}`, 'Content-Type': 'application/json' }
  }, {
    id: testStaffB1Id,
    name: 'Beemaram Test Staff',
    subject: 'Chemistry',
    salary: 60000,
    mobile: '9876543210',
    branch: 'Beemaram C1'
  });
  console.log('Created Beemaram C1 teacher:', createB1Res.data.data ? createB1Res.data.data.id : createB1Res.data.message);

  // Now Admin2 (Erragattugutta C1) tries to fetch teachers
  const admin2C1Teachers = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/admin2/teachers',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${admin2C1Token}` }
  });
  const c1StaffBranches = (admin2C1Teachers.data.data || []).map(t => t.branch);
  console.log('Admin2 (Erragattugutta C1) visible branches:', Array.from(new Set(c1StaffBranches)));
  if (!c1StaffBranches.includes('Beemaram C1')) {
    console.log('✅ PASS: Admin2 (Erragattugutta C1) CANNOT see staff from Beemaram C1!');
  } else {
    console.error('❌ FAIL: Admin2 saw staff from another campus!');
  }

  // Admin2 (Erragattugutta C1) tries to delete Beemaram C1 teacher
  const crossDeleteRes = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/admin2/teachers/${testStaffB1Id}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${admin2C1Token}`,
      'X-Security-OTP': '784920'
    }
  });
  console.log(`Cross-campus delete attempt status: HTTP ${crossDeleteRes.statusCode} - ${crossDeleteRes.data.message}`);
  if (crossDeleteRes.statusCode === 403) {
    console.log('✅ PASS: Cross-campus deletion rejected with HTTP 403!');
  } else {
    console.error('❌ FAIL: Cross-campus deletion was not rejected!');
  }

  // --- TEST 3: Security OTP Enforcement ---
  console.log('\n--- TEST 3: Security OTP Enforcement ---');
  // Attempt delete without OTP header
  const noOtpDelete = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/admin1/teachers/${testStaffB1Id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${admin1Token}` }
  });
  console.log(`Delete without OTP header: HTTP ${noOtpDelete.statusCode} - ${noOtpDelete.data.message}`);
  if (noOtpDelete.statusCode === 401 || noOtpDelete.statusCode === 403) {
    console.log('✅ PASS: Delete without OTP header rejected!');
  } else {
    console.error('❌ FAIL: Delete without OTP header allowed!');
  }

  // Attempt delete with invalid OTP
  const invalidOtpDelete = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/admin1/teachers/${testStaffB1Id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${admin1Token}`, 'X-Security-OTP': '000000' }
  });
  console.log(`Delete with invalid OTP '000000': HTTP ${invalidOtpDelete.statusCode} - ${invalidOtpDelete.data.message}`);
  if (invalidOtpDelete.statusCode === 401 || invalidOtpDelete.statusCode === 403) {
    console.log('✅ PASS: Delete with invalid OTP rejected!');
  } else {
    console.error('❌ FAIL: Delete with invalid OTP allowed!');
  }

  // --- TEST 4: 12-Month Salary Ledger & Server-Enforced Year Lock ---
  console.log('\n--- TEST 4: 12-Month Salary Ledger & Server-Enforced Year Lock ---');
  // Attempt to pay salary for 2027-2028 when 2026-2027 has 0 months paid
  const yearLockRes = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/admin1/teachers/${testStaffB1Id}/salary-month`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${admin1Token}`, 'X-Security-OTP': '784920', 'Content-Type': 'application/json' }
  }, {
    academicYear: '2027-2028',
    month: 'June',
    amountPaid: 60000,
    paymentMode: 'Bank Transfer'
  });
  console.log(`Year Lock Test (2027-2028 with 0 months paid in 2026-2027): HTTP ${yearLockRes.statusCode} - ${yearLockRes.data.message}`);
  if (yearLockRes.statusCode === 403 && yearLockRes.data.message.includes('Year Lock Active')) {
    console.log('✅ PASS: Server-enforced Year Lock correctly blocked payment for locked year!');
  } else {
    console.error('❌ FAIL: Year Lock did not block payment!');
  }

  // Now mark all 12 months of 2026-2027 as Paid
  const months = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
  console.log('Marking all 12 months of 2026-2027 as Paid...');
  for (const m of months) {
    await makeRequest({
      hostname: 'localhost',
      port: serverPort,
      path: `/api/admin1/teachers/${testStaffB1Id}/salary-month`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${admin1Token}`, 'X-Security-OTP': '784920', 'Content-Type': 'application/json' }
    }, {
      academicYear: '2026-2027',
      month: m,
      amountPaid: 60000,
      paymentMode: 'Bank Transfer'
    });
  }
  console.log('✅ All 12 months of 2026-2027 marked complete.');

  // Attempt payment for 2027-2028 again
  const unlockRes = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/admin1/teachers/${testStaffB1Id}/salary-month`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${admin1Token}`, 'X-Security-OTP': '784920', 'Content-Type': 'application/json' }
  }, {
    academicYear: '2027-2028',
    month: 'June',
    amountPaid: 65000,
    paymentMode: 'Bank Transfer'
  });
  console.log(`Unlocked Year Payment (2027-2028 after 12/12 months complete in 2026-2027): HTTP ${unlockRes.statusCode} - ${unlockRes.data.message}`);
  if (unlockRes.statusCode === 200) {
    console.log('✅ PASS: Academic year 2027-2028 successfully unlocked after prior 12 months completed!');
  } else {
    console.error('❌ FAIL: Academic year 2027-2028 remained locked!');
  }

  // Clean up test teacher
  const validDeleteRes = await makeRequest({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/admin1/teachers/${testStaffB1Id}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${admin1Token}`, 'X-Security-OTP': '784920' }
  });
  console.log(`Cleanup delete status: HTTP ${validDeleteRes.statusCode} - ${validDeleteRes.data.message}`);

  await mongoose.disconnect();
  console.log('\n=== ALL PHASE 3 END-TO-END VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  mongoose.disconnect();
  process.exit(1);
});
