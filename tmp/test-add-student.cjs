const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../server/app.cjs');
const { connectToDatabase } = require('../server/db.cjs');
const Student = require('../server/models/Student.cjs');

async function runLiveWriteVerification() {
  console.log('--- STEP 2: LIVE WRITE & DIRECT MONGODB QUERY VERIFICATION ---');

  // Connect to DB
  await connectToDatabase();
  console.log('✅ Connected to MongoDB via db.cjs');

  const testAdmissionNo = 'ATLAS-VERIFY-' + Date.now();
  const testStudentName = 'Atlas Verification Student ' + Math.floor(Math.random() * 1000);

  console.log(`\nCreating student in MongoDB: Name="${testStudentName}", AdmissionNo="${testAdmissionNo}"...`);

  // Write directly using Student model (simulating route handler write)
  const newStudent = await Student.create({
    studentId: 'STU-' + Math.floor(100000 + Math.random() * 900000),
    admissionNumber: testAdmissionNo,
    name: testStudentName,
    course: 'MPC',
    section: 'MPC-A',
    branch: 'Erragattugutta C1',
    tuitionFee: 95000,
    academicYear: '2026-2027',
    status: 'Active'
  });

  console.log('✅ Student created successfully. ID:', newStudent._id.toString());

  // Immediately query MongoDB directly using raw db collection (bypassing Mongoose model cache)
  const rawDb = mongoose.connection.db;
  const queriedDoc = await rawDb.collection('students').findOne({ admissionNumber: testAdmissionNo });

  console.log('\n--- RAW DIRECT MONGODB DOCUMENT QUERY RESULT ---');
  if (queriedDoc) {
    console.log('✅ Found document in MongoDB Atlas database "jc_erp_prod", collection "students":');
    console.log(JSON.stringify(queriedDoc, null, 2));
  } else {
    console.error('❌ CRITICAL: Document NOT found in MongoDB Atlas!');
  }

  // Cleanup test document after verification
  await rawDb.collection('students').deleteOne({ admissionNumber: testAdmissionNo });
  console.log('\nCleaned up verification student.');

  await mongoose.disconnect();
  console.log('Disconnected cleanly.');
}

runLiveWriteVerification().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
