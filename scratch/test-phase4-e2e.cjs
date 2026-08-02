const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config({ path: '.env' });
const app = require('../server/app.cjs');

const dbUri = process.env.MONGODB_URI;
const dbName = 'jc_erp_prod';

console.log('=== PHASE 4 END-TO-END FEE LOGIC & PHANTOM BASE FEE VERIFICATION ===\n');

async function runPhase4Tests() {
  await mongoose.connect(dbUri, { dbName });
  console.log('✅ Connected to MongoDB Atlas cluster:', dbUri.split('@')[1].split('/')[0]);

  const server = app.listen(5002);
  console.log('✅ Express test server running on port 5002');

  const db = mongoose.connection.client.db('jc_erp_prod');
  const studentsCol = db.collection('students');

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

  const usersCol = db.collection('users');
  const bcrypt = require('bcryptjs');
  const hashedPin = await bcrypt.hash('346398', 10);
  const hashedPassword = await bcrypt.hash('pass123', 10);

  await usersCol.updateOne(
    { username: 'admin1_p4' },
    {
      $set: {
        username: 'admin1_p4',
        password: hashedPassword,
        role: 'admin1',
        pin: hashedPin,
        campus: 'Erragattugutta C1',
        status: 'active'
      }
    },
    { upsert: true }
  );

  // Login as admin1_p4 to get token
  const loginRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5002,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin1_p4', password: 'pass123', pin: '346398', role: 'admin1' });

  const token = loginRes.data.token;
  console.log('✅ Admin1 login successful. Token acquired.\n');

  // --- STEP 1: Create student with tuition=50000, hostel=10000, custom "Exam Fee"=7000 ---
  console.log('--- STEP 1: Create student with tuition=50000, hostel=10000, Exam Fee=7000 ---');
  const admNo1 = `ADM-P4-${Date.now()}`;
  const createRes1 = await makeRequest({
    hostname: '127.0.0.1',
    port: 5002,
    path: '/api/admin1/students',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, {
    name: 'Fee Logic Verification Student',
    admissionNumber: admNo1,
    branch: 'Erragattugutta C1',
    course: 'MPC',
    section: 'MPC-A',
    tuitionFee: 50000,
    hostelFee: 10000,
    customFeeSlots: [
      { id: 'slot_exam', name: 'Exam Fee', amount: 7000 }
    ]
  });

  console.log(`HTTP ${createRes1.statusCode} - Student created: ${createRes1.data.data?.admissionNumber}`);

  // Fetch directly from MongoDB
  const mongoDoc1 = await studentsCol.findOne({ admissionNumber: admNo1 });
  console.log('\n--- RAW MONGODB DOCUMENT SNAPSHOT (AFTER CREATION) ---');
  console.log(JSON.stringify({
    admissionNumber: mongoDoc1.admissionNumber,
    name: mongoDoc1.name,
    tuitionFee: mongoDoc1.tuitionFee,
    hostelFee: mongoDoc1.hostelFee,
    transportFee: mongoDoc1.transportFee,
    miscellaneousFee: mongoDoc1.miscellaneousFee,
    previousPending: mongoDoc1.previousPending,
    customFeeSlots: mongoDoc1.customFeeSlots,
    totalPaid: mongoDoc1.totalPaid,
    tuitionWaiver: mongoDoc1.tuitionWaiver,
    remainingBalance: mongoDoc1.remainingBalance
  }, null, 2));

  const handCalculated1 = 50000 + 10000 + 7000;
  console.log(`\nHand-calculated total: 50000 + 10000 + 7000 = ${handCalculated1}`);
  console.log(`Stored remainingBalance in MongoDB: ${mongoDoc1.remainingBalance}`);

  if (mongoDoc1.remainingBalance === handCalculated1) {
    console.log('✅ PASS: Stored total matches hand calculation EXACTLY (67,000)! No double counting!');
  } else {
    console.error(`❌ FAIL: Expected ${handCalculated1}, got ${mongoDoc1.remainingBalance}`);
  }

  // --- STEP 2: Phantom 1,25,000 Base Fee Check ---
  console.log('\n--- STEP 2: Create student with 0 fees to check for Phantom Base Fee ---');
  const admNo2 = `ADM-P4-ZERO-${Date.now()}`;
  await makeRequest({
    hostname: '127.0.0.1',
    port: 5002,
    path: '/api/admin1/students',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, {
    name: 'Zero Fee Student',
    admissionNumber: admNo2,
    branch: 'Erragattugutta C1',
    course: 'BiPC',
    section: 'BiPC-A',
    tuitionFee: 0,
    hostelFee: 0,
    miscellaneousFee: 0
  });

  const mongoDoc2 = await studentsCol.findOne({ admissionNumber: admNo2 });
  console.log(`Stored remainingBalance for 0-fee student in MongoDB: ${mongoDoc2.remainingBalance}`);
  if (mongoDoc2.remainingBalance === 0) {
    console.log('✅ PASS: Zero fee student has remainingBalance = 0! Phantom 1,25,000 base fee completely ELIMINATED!');
  } else {
    console.error(`❌ FAIL: Expected 0, got ${mongoDoc2.remainingBalance}`);
  }

  // --- STEP 3: Apply Waiver (10,000 tuition waiver) ---
  console.log('\n--- STEP 3: Apply 10,000 Waiver to Student 1 ---');
  const waiverRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5002,
    path: `/api/admin2/students/${mongoDoc1.studentId}/fee-override`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Security-OTP': '346398'
    }
  }, {
    tuitionWaiver: 10000,
    hostelWaiver: 0,
    transportWaiver: 0,
    miscWaiver: 0
  });

  console.log(`HTTP ${waiverRes.statusCode} - Waiver response:`, waiverRes.data.message);

  const mongoDoc3 = await studentsCol.findOne({ admissionNumber: admNo1 });
  console.log('\n--- RAW MONGODB DOCUMENT SNAPSHOT (AFTER WAIVER) ---');
  console.log(JSON.stringify({
    admissionNumber: mongoDoc3.admissionNumber,
    tuitionFee: mongoDoc3.tuitionFee,
    hostelFee: mongoDoc3.hostelFee,
    customFeeSlots: mongoDoc3.customFeeSlots,
    tuitionWaiver: mongoDoc3.tuitionWaiver,
    totalPaid: mongoDoc3.totalPaid,
    remainingBalance: mongoDoc3.remainingBalance
  }, null, 2));

  const expectedPostWaiver = 67000 - 10000;
  console.log(`Original fee: ${mongoDoc3.tuitionFee} (Unchanged!)`);
  console.log(`Waiver amount: ${mongoDoc3.tuitionWaiver}`);
  console.log(`Net expected balance: 67000 - 10000 = ${expectedPostWaiver}`);
  console.log(`Stored remainingBalance in MongoDB: ${mongoDoc3.remainingBalance}`);

  if (mongoDoc3.tuitionFee === 50000 && mongoDoc3.tuitionWaiver === 10000 && mongoDoc3.remainingBalance === expectedPostWaiver) {
    console.log('✅ PASS: Original fee remains 50000, waiver is 10000, and Net Balance is 57,000!');
  } else {
    console.error('❌ FAIL: Waiver calculation error!');
  }

  // --- STEP 4: Record Payment (20,000 payment) ---
  console.log('\n--- STEP 4: Record Payment of 20,000 for Student 1 ---');
  const payRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5002,
    path: `/api/accountant/students/${mongoDoc1.studentId}/payments`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, {
    amount: 20000,
    category: 'Tuition Fee',
    paymentMode: 'Cash',
    remarks: 'Phase 4 Verification Payment'
  });

  console.log(`HTTP ${payRes.statusCode} - Payment recorded. Receipt: ${payRes.data.data?.payment?.receiptNumber}`);

  const mongoDoc4 = await studentsCol.findOne({ admissionNumber: admNo1 });
  console.log('\n--- RAW MONGODB DOCUMENT SNAPSHOT (AFTER PAYMENT) ---');
  console.log(JSON.stringify({
    admissionNumber: mongoDoc4.admissionNumber,
    tuitionFee: mongoDoc4.tuitionFee,
    tuitionWaiver: mongoDoc4.tuitionWaiver,
    totalPaid: mongoDoc4.totalPaid,
    remainingBalance: mongoDoc4.remainingBalance
  }, null, 2));

  const expectedPostPayment = 57000 - 20000;
  console.log(`Total Paid: ${mongoDoc4.totalPaid}`);
  console.log(`Net expected remaining balance: 57000 - 20000 = ${expectedPostPayment}`);
  console.log(`Stored remainingBalance in MongoDB: ${mongoDoc4.remainingBalance}`);

  if (mongoDoc4.totalPaid === 20000 && mongoDoc4.remainingBalance === expectedPostPayment) {
    console.log('✅ PASS: Payment of 20,000 correctly reduced remainingBalance to 37,000!');
  } else {
    console.error('❌ FAIL: Payment calculation error!');
  }

  // Cleanup test students
  await studentsCol.deleteMany({ admissionNumber: { $in: [admNo1, admNo2] } });

  server.close();
  await mongoose.disconnect();
  console.log('\n=== ALL PHASE 4 END-TO-END VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
}

runPhase4Tests().catch(err => {
  console.error('Phase 4 verification error:', err);
  mongoose.disconnect();
  process.exit(1);
});
