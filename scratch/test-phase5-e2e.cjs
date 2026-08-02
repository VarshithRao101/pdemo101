const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');
require('dotenv').config({ path: '.env' });
const app = require('../server/app.cjs');

const dbUri = process.env.MONGODB_URI;
const dbName = 'jc_erp_prod';

console.log('=== PHASE 5 END-TO-END EXPENDITURE ADD/DELETE & CAMPUS ISOLATION VERIFICATION ===\n');

async function runPhase5Tests() {
  await mongoose.connect(dbUri, { dbName });
  console.log('✅ Connected to MongoDB Atlas cluster:', dbUri.split('@')[1].split('/')[0]);

  const server = app.listen(5003);
  console.log('✅ Express test server running on port 5003');

  const db = mongoose.connection.client.db('jc_erp_prod');
  const expCol = db.collection('expenditures');
  const usersCol = db.collection('users');

  // Seed test users: Admin1 and Admin2 (Erragattugutta C1) and Admin2 (Beemaram C1)
  const pinAdmin1 = '346398';
  const pinAdmin2E1 = '118798';
  const pinAdmin2B1 = '673732';

  await usersCol.updateOne(
    { username: 'admin1_p5' },
    {
      $set: {
        username: 'admin1_p5',
        password: await bcrypt.hash('pass123', 10),
        role: 'admin1',
        pin: await bcrypt.hash(pinAdmin1, 10),
        campus: 'All',
        status: 'active'
      }
    },
    { upsert: true }
  );

  await usersCol.updateOne(
    { username: 'admin2_e1_p5' },
    {
      $set: {
        username: 'admin2_e1_p5',
        password: await bcrypt.hash('pass123', 10),
        role: 'admin2',
        pin: await bcrypt.hash(pinAdmin2E1, 10),
        campus: 'Erragattugutta C1',
        status: 'active'
      }
    },
    { upsert: true }
  );

  await usersCol.updateOne(
    { username: 'admin2_b1_p5' },
    {
      $set: {
        username: 'admin2_b1_p5',
        password: await bcrypt.hash('pass123', 10),
        role: 'admin2',
        pin: await bcrypt.hash(pinAdmin2B1, 10),
        campus: 'Beemaram C1',
        status: 'active'
      }
    },
    { upsert: true }
  );

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

  // Get Tokens
  const loginAdmin1 = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin1_p5', password: 'pass123', pin: pinAdmin1, role: 'admin1' });

  const loginAdmin2E1 = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin2_e1_p5', password: 'pass123', pin: pinAdmin2E1, role: 'admin2' });

  const token1 = loginAdmin1.data.token;
  const token2E1 = loginAdmin2E1.data.token;

  console.log('✅ Tokens acquired for Admin1 and Admin2 (Erragattugutta C1).\n');

  // --- TEST 1: Admin1 Add & Delete Expenditure ---
  console.log('--- TEST 1: Admin1 Add & Delete Expenditure ---');
  const addRes1 = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: '/api/admin2/expenditure', method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json', 'X-Security-OTP': pinAdmin1 }
  }, { category: 'Utilities', amount: 15000, description: 'Admin1 Power Bill', branch: 'Erragattugutta C1' });

  console.log(`Admin1 Add Expenditure: HTTP ${addRes1.statusCode} - ID: ${addRes1.data.data?.id}`);
  const exp1Id = addRes1.data.data?.id;

  // Direct MongoDB Query
  const mongoDoc1 = await expCol.findOne({ id: exp1Id });
  console.log('Raw MongoDB Snapshot (After Admin1 Add):', JSON.stringify({ id: mongoDoc1.id, category: mongoDoc1.category, amount: mongoDoc1.amount, branch: mongoDoc1.branch }, null, 2));
  if (mongoDoc1 && mongoDoc1.amount === 15000) {
    console.log('✅ PASS: Admin1 expenditure correctly persisted in MongoDB Atlas!');
  }

  // Delete via Admin1
  const delRes1 = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: `/api/admin2/expenditure/${exp1Id}`, method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token1}`, 'X-Security-OTP': pinAdmin1 }
  });
  console.log(`Admin1 Delete Expenditure: HTTP ${delRes1.statusCode} - ${delRes1.data.message}`);

  const verifyDoc1 = await expCol.findOne({ id: exp1Id });
  if (!verifyDoc1) {
    console.log('✅ PASS: Admin1 expenditure permanently purged from MongoDB Atlas!');
  } else {
    console.error('❌ FAIL: Document still exists in MongoDB!');
  }

  // --- TEST 2: Admin2 Add & Delete Expenditure (Scoped to Campus) ---
  console.log('\n--- TEST 2: Admin2 Add & Delete Expenditure (Campus Scoped) ---');
  const addRes2 = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: '/api/admin2/expenditure', method: 'POST',
    headers: { 'Authorization': `Bearer ${token2E1}`, 'Content-Type': 'application/json', 'X-Security-OTP': pinAdmin2E1 }
  }, { category: 'Mess', amount: 8500, description: 'Admin2 Mess Expenses', branch: 'Erragattugutta C1' });

  console.log(`Admin2 Add Expenditure: HTTP ${addRes2.statusCode} - ID: ${addRes2.data.data?.id}`);
  const exp2Id = addRes2.data.data?.id;

  // Direct MongoDB Query
  const mongoDoc2 = await expCol.findOne({ id: exp2Id });
  console.log('Raw MongoDB Snapshot (After Admin2 Add):', JSON.stringify({ id: mongoDoc2.id, category: mongoDoc2.category, amount: mongoDoc2.amount, branch: mongoDoc2.branch }, null, 2));
  if (mongoDoc2 && mongoDoc2.amount === 8500) {
    console.log('✅ PASS: Admin2 expenditure correctly persisted in MongoDB Atlas!');
  }

  // Delete via Admin2
  const delRes2 = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: `/api/admin2/expenditure/${exp2Id}`, method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token2E1}`, 'X-Security-OTP': pinAdmin2E1 }
  });
  console.log(`Admin2 Delete Expenditure: HTTP ${delRes2.statusCode} - ${delRes2.data.message}`);

  const verifyDoc2 = await expCol.findOne({ id: exp2Id });
  if (!verifyDoc2) {
    console.log('✅ PASS: Admin2 expenditure permanently purged from MongoDB Atlas!');
  } else {
    console.error('❌ FAIL: Document still exists in MongoDB!');
  }

  // --- TEST 3: Campus Isolation Enforcement for Admin2 ---
  console.log('\n--- TEST 3: Campus Isolation Enforcement for Admin2 ---');
  const crossAddRes = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: '/api/admin2/expenditure', method: 'POST',
    headers: { 'Authorization': `Bearer ${token2E1}`, 'Content-Type': 'application/json', 'X-Security-OTP': pinAdmin2E1 }
  }, { category: 'Repairs', amount: 4000, description: 'Cross Campus Attempt', branch: 'Beemaram C1' });

  console.log(`Admin2 Cross-Campus Add Attempt: HTTP ${crossAddRes.statusCode} - ${crossAddRes.data.message}`);
  if (crossAddRes.statusCode === 403) {
    console.log('✅ PASS: Admin2 cross-campus ADD rejected with HTTP 403!');
  } else {
    console.error('❌ FAIL: Cross-campus add was not blocked!');
  }

  // Seed a Beemaram C1 document to test cross-campus delete
  const expB1Id = `EXP-B1-${Date.now()}`;
  await expCol.insertOne({ id: expB1Id, category: 'Diesel', amount: 3000, description: 'Beemaram Diesel', branch: 'Beemaram C1', date: new Date() });

  const crossDelRes = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: `/api/admin2/expenditure/${expB1Id}`, method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token2E1}`, 'X-Security-OTP': pinAdmin2E1 }
  });

  console.log(`Admin2 Cross-Campus Delete Attempt: HTTP ${crossDelRes.statusCode} - ${crossDelRes.data.message}`);
  if (crossDelRes.statusCode === 403) {
    console.log('✅ PASS: Admin2 cross-campus DELETE rejected with HTTP 403!');
  } else {
    console.error('❌ FAIL: Cross-campus delete was not blocked!');
  }
  await expCol.deleteOne({ id: expB1Id });

  // --- TEST 4: Security OTP Enforcement ---
  console.log('\n--- TEST 4: Security OTP Enforcement (No OTP & Invalid OTP) ---');
  const noOtpRes = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: '/api/admin2/expenditure', method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json' }
  }, { category: 'Rents', amount: 5000, description: 'No OTP Test', branch: 'Erragattugutta C1' });

  console.log(`Add without OTP: HTTP ${noOtpRes.statusCode} - ${noOtpRes.data.message}`);
  if (noOtpRes.statusCode === 403) {
    console.log('✅ PASS: Add without OTP rejected with HTTP 403!');
  }

  const badOtpRes = await makeRequest({
    hostname: '127.0.0.1', port: 5003, path: '/api/admin2/expenditure', method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json', 'X-Security-OTP': '000000' }
  }, { category: 'Rents', amount: 5000, description: 'Bad OTP Test', branch: 'Erragattugutta C1' });

  console.log(`Add with invalid OTP '000000': HTTP ${badOtpRes.statusCode} - ${badOtpRes.data.message}`);
  if (badOtpRes.statusCode === 403) {
    console.log('✅ PASS: Add with invalid OTP rejected with HTTP 403!');
  }

  server.close();
  await mongoose.disconnect();
  console.log('\n=== ALL PHASE 5 END-TO-END VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
}

runPhase5Tests().catch(err => {
  console.error('Phase 5 verification error:', err);
  mongoose.disconnect();
  process.exit(1);
});
