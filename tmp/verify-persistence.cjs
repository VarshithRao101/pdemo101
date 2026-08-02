const mongoose = require('mongoose');
require('dotenv').config();

const { connectToDatabase } = require('../server/db.cjs');
const Student = require('../server/models/Student.cjs');

async function runStep4Verification() {
  console.log('=== STEP 4 REAL EVIDENCE VERIFICATION ===');

  await connectToDatabase();
  console.log('✅ DB Connected via connectToDatabase()');

  const admNo = 'ADM-VERIFY-2026-' + Math.floor(1000 + Math.random() * 9000);
  const stuName = 'Rajesh Verma (Persistence Test)';

  console.log(`\n1. Creating student via Student.create(): Name="${stuName}", Admission="${admNo}"...`);
  const createdStudent = await Student.create({
    studentId: 'STU-' + Math.floor(100000 + Math.random() * 900000),
    admissionNumber: admNo,
    name: stuName,
    course: 'MPC',
    section: 'MPC-A',
    branch: 'Erragattugutta C1',
    tuitionFee: 85000,
    academicYear: '2026-2027',
    status: 'Active'
  });
  console.log('✅ Student Created! _id:', createdStudent._id.toString());

  console.log('\n2. Querying raw MongoDB directly (db.collection("students").findOne)...');
  const rawDb = mongoose.connection.db;
  const rawDocument = await rawDb.collection('students').findOne({ _id: createdStudent._id });

  console.log('--- DIRECT MONGODB DOCUMENT FROM ATLAS DB "jc_erp_prod" ---');
  console.log(JSON.stringify(rawDocument, null, 2));

  console.log('\n3. Verifying retrieval from App layer (Student.findOne)...');
  const fetchedStudent = await Student.findOne({ admissionNumber: admNo }).lean();
  if (fetchedStudent && fetchedStudent._id.toString() === createdStudent._id.toString()) {
    console.log('✅ App layer confirmed student exists and persists correctly!');
  } else {
    console.error('❌ App layer failed to retrieve student!');
  }

  await mongoose.disconnect();
  console.log('\n=== VERIFICATION COMPLETE ===');
}

runStep4Verification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
