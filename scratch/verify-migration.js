import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const OLD_URI = 'mongodb+srv://ravindarraodevarneni_db_user:VGm%403007250967@cluster0.q74oac9.mongodb.net/jc_erp_prod?retryWrites=true&w=majority&appName=Cluster0';
const NEW_URI = process.env.MONGODB_URI;

async function verifyMigration() {
  console.log('====================================================');
  console.log('STARTING POST-MIGRATION VERIFICATION & ISOLATION TEST');
  console.log('====================================================');

  console.log(`Connecting to NEW database (${NEW_URI.split('@')[1].split('/')[0]})...`);
  const newConn = await mongoose.createConnection(NEW_URI, { dbName: 'jc_erp_prod' }).asPromise();
  console.log('Connected to NEW database successfully.');

  const newDb = newConn.db;
  const usersCol = newDb.collection('users');
  const studentsCol = newDb.collection('students');
  const teachersCol = newDb.collection('teachers');

  console.log('\n--- 1. User Authentication Verification against NEW DB ---');
  const targetRoles = ['authenticator', 'admin1', 'admin2', 'accountant'];

  for (const role of targetRoles) {
    const user = await usersCol.findOne({ role });
    if (!user) {
      console.error(`❌ ERROR: User with role "${role}" not found in NEW database!`);
      continue;
    }
    console.log(` - Role "${user.role}": Found user "${user.username || user.email || user.name}" (Campus: ${user.campus || 'All'})`);
  }

  console.log('\n--- 2. Data Retrieval Verification (Students & Teachers) ---');
  const studentCount = await studentsCol.countDocuments({});
  const teacherCount = await teachersCol.countDocuments({});
  console.log(`NEW DB Student Count: ${studentCount}`);
  console.log(`NEW DB Teacher Count: ${teacherCount}`);

  const sampleStudent = await studentsCol.findOne({});
  const sampleTeacher = await teachersCol.findOne({});
  console.log('Sample Student Name:', sampleStudent?.name || 'N/A', '(Adm:', sampleStudent?.admissionNumber || 'N/A', ')');
  console.log('Sample Teacher Name:', sampleTeacher?.name || 'N/A', '(Dept:', sampleTeacher?.department || sampleTeacher?.subject || 'N/A', ')');

  console.log('\n--- 3. Database Isolation Test (Write to NEW, verify ABSENT in OLD) ---');
  const testId = 'TEST_MIGRATION_ISOLATION_' + Date.now();
  const testStudent = {
    admissionNumber: testId,
    studentId: testId,
    name: 'Migration Isolation Verification Student',
    branch: 'Erragattugutta C1',
    mobile: '9998887776',
    course: 'MPC',
    section: 'MPC-A',
    createdAt: new Date()
  };

  console.log(`Writing test student "${testId}" to NEW DB...`);
  await studentsCol.insertOne(testStudent);

  const foundInNew = await studentsCol.findOne({ admissionNumber: testId });
  console.log('Checking NEW DB:', foundInNew ? '✅ Document EXISTS in NEW DB' : '❌ Document NOT found in NEW DB');

  console.log(`Connecting to OLD DB (${OLD_URI.split('@')[1].split('/')[0]}) to verify isolation...`);
  const oldConn = await mongoose.createConnection(OLD_URI, { dbName: 'jc_erp_prod' }).asPromise();
  const oldDb = oldConn.db;
  const oldStudentsCol = oldDb.collection('students');

  const foundInOld = await oldStudentsCol.findOne({ admissionNumber: testId });
  console.log('Checking OLD DB:', foundInOld ? '❌ ERROR: Document WAS FOUND in OLD DB!' : '✅ Document ABSENT in OLD DB (100% Isolated)');

  console.log('\nCleaning up test document from NEW DB...');
  await studentsCol.deleteOne({ admissionNumber: testId });
  console.log('Cleanup complete.');

  await newConn.close();
  await oldConn.close();

  if (foundInNew && !foundInOld) {
    console.log('\n====================================================');
    console.log('VERIFICATION COMPLETE: NEW DATABASE IS 100% LIVE & ISOLATED!');
    console.log('====================================================');
  } else {
    console.error('\n====================================================');
    console.error('VERIFICATION FAILED!');
    console.error('====================================================');
    process.exit(1);
  }
}

verifyMigration().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
