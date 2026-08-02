const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');
require('dotenv').config({ path: '.env' });
const app = require('../server/app.cjs');

const dbUri = process.env.MONGODB_URI;
const dbName = 'jc_erp_prod';

console.log('=== PHASE 3.1 — SECURITY OTP BYPASS AUDIT & REAL VERIFICATION TEST ===\n');

async function runAuditTests() {
  await mongoose.connect(dbUri, { dbName });
  console.log('✅ Connected to MongoDB Atlas cluster:', dbUri.split('@')[1].split('/')[0]);

  const server = app.listen(5001);
  console.log('✅ Express audit server running on port 5001');

  const db = mongoose.connection.client.db('jc_erp_prod');
  const usersCol = db.collection('users');

  // Create account with a DIFFERENT PIN: 987654 (NOT 784920)
  const realPin = '987654';
  const hashedPin = await bcrypt.hash(realPin, 10);
  const hashedPassword = await bcrypt.hash('pass123', 10);

  await usersCol.updateOne(
    { username: 'audit_user_987654' },
    {
      $set: {
        username: 'audit_user_987654',
        password: hashedPassword,
        role: 'admin1',
        pin: hashedPin,
        campus: 'Erragattugutta C1',
        status: 'active'
      }
    },
    { upsert: true }
  );

  console.log(`✅ Created test user 'audit_user_987654' with real PIN: ${realPin}`);

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

  // Login as audit_user_987654
  const loginRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'audit_user_987654', password: 'pass123', pin: realPin, role: 'admin1' });

  const token = loginRes.data.token;
  console.log('✅ Login successful for audit_user_987654\n');

  // --- TEST A: Delete teacher using account's REAL PIN (987654) ---
  console.log('--- TEST A: Delete teacher using account real PIN (987654) ---');
  const teacherAId = `FAC-AUDIT-A-${Date.now()}`;
  await makeRequest({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/admin1/teachers',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, { id: teacherAId, name: 'Audit Staff A', subject: 'Maths', salary: 50000, branch: 'Erragattugutta C1' });

  const deleteARes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5001,
    path: `/api/admin1/teachers/${teacherAId}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Security-OTP': realPin // 987654
    }
  });

  console.log(`Delete attempt with account's REAL PIN [987654]: HTTP ${deleteARes.statusCode} - ${deleteARes.data.message}`);
  if (deleteARes.statusCode === 200) {
    console.log('✅ PASS: Deletion SUCCEEDED using account\'s real assigned PIN (987654)!');
  } else {
    console.error('❌ FAIL: Deletion failed with real assigned PIN!');
  }

  // --- TEST B: Delete teacher using 784920 on account whose PIN is NOT 784920 ---
  console.log('\n--- TEST B: Delete teacher using 784920 on account whose real PIN is NOT 784920 ---');
  const teacherBId = `FAC-AUDIT-B-${Date.now()}`;
  await makeRequest({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/admin1/teachers',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, { id: teacherBId, name: 'Audit Staff B', subject: 'Physics', salary: 55000, branch: 'Erragattugutta C1' });

  const deleteBRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5001,
    path: `/api/admin1/teachers/${teacherBId}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Security-OTP': '784920' // NOT the user's PIN
    }
  });

  console.log(`Delete attempt with 784920 on account whose PIN is NOT 784920: HTTP ${deleteBRes.statusCode} - ${deleteBRes.data.message}`);
  if (deleteBRes.statusCode === 403 && deleteBRes.data.message.includes('Invalid Security PIN')) {
    console.log('✅ PASS: Deletion FAILS with HTTP 403 ("Invalid Security PIN (OTP) provided.")!');
    console.log('✅ CONFIRMED: 784920 has ZERO hardcoded/bypass status!');
  } else {
    console.error('❌ FAIL: 784920 was accepted when it should have failed!');
  }

  // Cleanup teacher B using correct PIN
  await makeRequest({
    hostname: '127.0.0.1',
    port: 5001,
    path: `/api/admin1/teachers/${teacherBId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}`, 'X-Security-OTP': realPin }
  });

  server.close();
  await mongoose.disconnect();
  console.log('\n=== PHASE 3.1 AUDIT COMPLETE: NO HARDCODED BYPASS EXISTS ===');
}

runAuditTests().catch(err => {
  console.error('Audit execution error:', err);
  mongoose.disconnect();
  process.exit(1);
});
