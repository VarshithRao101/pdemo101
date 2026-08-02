import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback

async function testPhase2E2E() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas via Mongoose...');
  
  try {
    await mongoose.connect(uri, { dbName: 'jc_erp_prod' });
    console.log('Connected to MongoDB database jc_erp_prod');

    const db = mongoose.connection.db;
    const studentsCol = db.collection('students');

    const testId = 'TEST_ADM_PHASE2_' + Date.now();
    console.log(`\n--- Test 1: Insert student into MongoDB (${testId}) ---`);
    
    const newStudent = {
      admissionNumber: testId,
      studentId: testId,
      name: 'Phase 2 Verification Student',
      branch: 'Erragattugutta C1',
      mobile: '9876543210',
      course: 'MPC',
      section: 'MPC-A',
      fatherName: 'Test Father',
      motherName: 'Test Mother',
      dob: '2006-05-15',
      parentMobile: '9876543211',
      previousSchool: 'ZPHS Warangal',
      previousBoard: 'State Board',
      address: 'H.No 1-2-3, Erragattugutta, Warangal',
      tuitionFee: 120000,
      totalFee: 125000,
      totalPaid: 0,
      dueAmount: 125000,
      feeSlots: [
        { id: 'tuition', name: 'Tuition Fee', amount: 120000 },
        { id: 'misc', name: 'Misc Fee', amount: 5000 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertResult = await studentsCol.insertOne(newStudent);
    console.log('Inserted Mongo ObjectId:', insertResult.insertedId.toString());

    console.log('\n--- Test 2: Query student directly from MongoDB ---');
    const foundDoc = await studentsCol.findOne({ admissionNumber: testId });
    if (!foundDoc) {
      throw new Error(`Student ${testId} was not found in MongoDB after insertion!`);
    }
    console.log('Found Student in DB:');
    console.log(' - Name:', foundDoc.name);
    console.log(' - Admission No:', foundDoc.admissionNumber);
    console.log(' - Branch:', foundDoc.branch);
    console.log(' - Course:', foundDoc.course);
    console.log(' - Previous School:', foundDoc.previousSchool);
    console.log(' - Previous Board:', foundDoc.previousBoard);

    console.log('\n--- Test 3: Delete student directly from MongoDB ---');
    const deleteResult = await studentsCol.deleteOne({ admissionNumber: testId });
    console.log('Delete count:', deleteResult.deletedCount);

    const recheckDoc = await studentsCol.findOne({ admissionNumber: testId });
    if (recheckDoc) {
      throw new Error(`Student ${testId} still exists in MongoDB after deletion!`);
    }
    console.log('Verified student purged from MongoDB successfully.');

    console.log('\n=========================================');
    console.log('PHASE 2 DATABASE INTEGRITY TEST PASSED!');
    console.log('=========================================');

  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testPhase2E2E();
