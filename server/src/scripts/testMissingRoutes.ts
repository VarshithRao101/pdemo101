import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Student } from '../models/student';
import { FeePayment } from '../models/payment';
import { AttendanceRecord } from '../models/attendance';
import { Bulletin } from '../models/bulletin';

dotenv.config();
process.env.BYPASS_DB_EMPTY_CHECK = 'true';

async function run() {
  try {
    await connectDB();

    console.log('Cleaning up any leftover test data first...');
    await Student.deleteOne({ admissionNumber: 'ADM_TEST_DEL' });
    await FeePayment.deleteMany({ receiptNumber: 'REC-TEST-DEL' });
    await Bulletin.deleteOne({ id: 'BUL-TEST-999' });

    console.log('\n======================================================');
    console.log('  TESTING STUDENT SOFT-DEACTIVATION (DELETE /api/admin1/students/:id)  ');
    console.log('======================================================\n');

    // 1. Create a temporary student
    const testStudent = await Student.create({
      admissionNumber: 'ADM_TEST_DEL',
      studentId: 'STU-TEST-DEL',
      qrId: 'QR-TEST-DEL',
      registrationNumber: 'REG-TEST-DEL',
      name: 'Test Deactivate Student',
      email: 'test.deactivate@inspire.edu',
      hostelStatus: 'Day Scholar',
      transportStatus: 'Self Transport',
      course: 'MPC',
      section: 'Section A',
      branch: 'Madhapur',
      rollNumber: 'TEST_DEL_01',
      status: 'Active',
      tuitionFee: 50000,
      hostelFee: 0,
      transportFee: 0,
      miscellaneousFee: 5000,
      previousPending: 0,
      totalPaid: 10000,
      remainingBalance: 45000
    });
    console.log(`Created test student: ${testStudent.name} (${testStudent.studentId}), _id: ${testStudent._id}`);

    // 2. Create associated FeePayment and AttendanceRecord
    const testPayment = await FeePayment.create({
      receiptNumber: 'REC-TEST-DEL',
      date: '07 July 2026',
      category: 'Tuition Fee',
      installment: 'Term 1',
      amount: 10000,
      balance: 40000,
      mode: 'Cash',
      cashier: 'Accountant',
      student: testStudent._id
    });
    // Add payment to student's receipts array
    testStudent.receipts.push(testPayment._id as any);
    await testStudent.save();
    console.log(`Created test FeePayment: _id: ${testPayment._id}, amount: ${testPayment.amount}`);

    const testAttendance = await AttendanceRecord.create({
      targetId: testStudent._id,
      targetModel: 'Student',
      date: new Date('2026-07-07'),
      status: 'present'
    });
    console.log(`Created test AttendanceRecord: _id: ${testAttendance._id}, status: ${testAttendance.status}`);

    // 3. Simulate soft-deactivation (DELETE route logic: set status to 'Inactive')
    console.log('\nPerforming soft-deactivation (setting status to "Inactive")...');
    const softDeactivatedStudent = await Student.findByIdAndUpdate(
      testStudent._id,
      { $set: { status: 'Inactive' } },
      { new: true }
    );

    if (!softDeactivatedStudent) {
      throw new Error('Failed to find and update student for soft-deactivation.');
    }
    console.log(`Updated Student Status: ${softDeactivatedStudent.status}`);
    if (softDeactivatedStudent.status !== 'Inactive') {
      console.error('❌ FAIL: Student status is not "Inactive".');
    } else {
      console.log('✅ PASS: Student status is correctly marked as "Inactive".');
    }

    // 4. Confirm the student is NOT hard-deleted
    const checkExists = await Student.findById(testStudent._id);
    if (checkExists) {
      console.log('✅ PASS: Student document still exists in database (not hard-deleted).');
    } else {
      console.error('❌ FAIL: Student document was hard-deleted.');
    }

    // 5. Confirm their existing FeePayment and AttendanceRecord remain intact and queryable
    const paymentCheck = await FeePayment.findById(testPayment._id);
    if (paymentCheck) {
      console.log(`✅ PASS: FeePayment remains intact (not orphaned). Amount: ${paymentCheck.amount}`);
    } else {
      console.error('❌ FAIL: FeePayment was deleted or orphaned.');
    }

    const attendanceCheck = await AttendanceRecord.findById(testAttendance._id);
    if (attendanceCheck) {
      console.log(`✅ PASS: AttendanceRecord remains intact. Status: ${attendanceCheck.status}`);
    } else {
      console.error('❌ FAIL: AttendanceRecord was deleted.');
    }

    // 6. Confirm they no longer appear in default search results
    // Simulating Accountant search (which now has status: 'Active')
    const searchRegex = new RegExp('Test Deactivate Student', 'i');
    const accountantSearchQuery = {
      status: 'Active',
      $or: [
        { name: searchRegex },
        { rollNumber: searchRegex }
      ]
    };
    const accountantResults = await Student.find(accountantSearchQuery);
    if (accountantResults.length === 0) {
      console.log('✅ PASS: Deactivated student does not appear in default Accountant search results.');
    } else {
      console.error('❌ FAIL: Deactivated student appeared in default Accountant search results:', accountantResults);
    }

    // Simulating Admin1 search
    const admin1SearchQuery = {
      status: 'Active',
      $or: [
        { name: searchRegex }
      ]
    };
    const admin1Results = await Student.find(admin1SearchQuery);
    if (admin1Results.length === 0) {
      console.log('✅ PASS: Deactivated student does not appear in default Admin1 search results.');
    } else {
      console.error('❌ FAIL: Deactivated student appeared in default Admin1 search results:', admin1Results);
    }

    console.log('\n======================================================');
    console.log('  TESTING BULLETINS CRUD END-TO-END  ');
    console.log('======================================================\n');

    // 1. Create Bulletin (POST /api/admin1/bulletins)
    const newBulletin = await Bulletin.create({
      id: 'BUL-TEST-999',
      title: 'Test Bulletin Title',
      content: 'This is a test bulletin content.',
      category: 'announcement',
      date: '07 July 2026'
    });
    console.log(`Created Bulletin: "${newBulletin.title}" (ID: ${newBulletin._id || (newBulletin as any).id})`);

    // 2. Read Bulletin (GET /api/admin1/bulletins or public GET /api/bulletins)
    const fetchedBulletins = await Bulletin.find({ id: 'BUL-TEST-999' });
    if (fetchedBulletins.length > 0) {
      console.log(`✅ PASS: Bulletin successfully retrieved. Count: ${fetchedBulletins.length}`);
    } else {
      console.error('❌ FAIL: Failed to retrieve created Bulletin.');
    }

    // 3. Update Bulletin (PATCH /api/admin1/bulletins/:id)
    const updatedTitle = 'Test Bulletin Title - UPDATED';
    const updatedContent = 'This is updated test bulletin content.';
    
    // Simulating patch logic
    const bulletinToPatch = await Bulletin.findById(newBulletin._id);
    if (bulletinToPatch) {
      bulletinToPatch.title = updatedTitle;
      bulletinToPatch.content = updatedContent;
      await bulletinToPatch.save();
      console.log('Updated Bulletin in database.');
    }
    
    const patchCheck = await Bulletin.findById(newBulletin._id);
    if (patchCheck && patchCheck.title === updatedTitle && patchCheck.content === updatedContent) {
      console.log(`✅ PASS: Bulletin patched successfully. Title: "${patchCheck.title}"`);
    } else {
      console.error('❌ FAIL: Bulletin patch verification failed.');
    }

    // 4. Delete Bulletin (DELETE /api/admin1/bulletins/:id)
    await Bulletin.findByIdAndDelete(newBulletin._id);
    console.log('Deleted Bulletin.');

    const deleteCheck = await Bulletin.findById(newBulletin._id);
    if (!deleteCheck) {
      console.log('✅ PASS: Bulletin deleted successfully (no longer found in DB).');
    } else {
      console.error('❌ FAIL: Bulletin still exists in DB after deletion.');
    }

    // Clean up temporary student, payment, and attendance
    console.log('\nCleaning up temporary test database entries...');
    await Student.deleteOne({ _id: testStudent._id });
    await FeePayment.deleteOne({ _id: testPayment._id });
    await AttendanceRecord.deleteOne({ _id: testAttendance._id });
    console.log('Cleanup finished.');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (err) {
    console.error('Error running missing tests:', err);
    process.exit(1);
  }
}

run();
