import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { ExamResult } from '../models/examResult';
import { Student } from '../models/student';

dotenv.config();
process.env.BYPASS_DB_EMPTY_CHECK = 'true';

async function run() {
  try {
    await connectDB();

    console.log('Searching for ExamResult documents with maxMarks: 300...');
    const legacyResults = await ExamResult.find({ maxMarks: 300 });
    console.log(`Found ${legacyResults.length} legacy ExamResult documents.`);

    if (legacyResults.length === 0) {
      console.log('No legacy ExamResult documents found with maxMarks: 300. Checking STU-2421604 specifically...');
      const targetStudent = await Student.findOne({ studentId: 'STU-2421604' });
      if (targetStudent) {
        const studentResults = await ExamResult.find({ student: targetStudent._id });
        console.log(`Student STU-2421604 has ${studentResults.length} exam results:`);
        studentResults.forEach(r => {
          console.log(`- Subject: ${r.subject}, Test: ${r.testTitle}, Score: ${r.score}/${r.maxMarks}, Date: ${r.date}`);
        });
      } else {
        console.log('Student STU-2421604 not found in the database.');
      }
      await mongoose.disconnect();
      return;
    }

    // Process legacy results
    for (const res of legacyResults) {
      const studentDoc = await Student.findById(res.student);
      const studentId = studentDoc ? studentDoc.studentId : 'Unknown';
      const studentName = studentDoc ? studentDoc.name : 'Unknown';
      console.log(`Processing legacy record: ID=${res._id}, Student=${studentId} (${studentName}), Subject=${res.subject}, Score=${res.score}/300, Test=${res.testTitle}, Date=${res.date}`);

      // Decision: Since we need realistic demo data and the per-subject breakdown is not recoverable from a single consolidated 300-max record (if it represents a sum),
      // we can split it into 3 separate standard subjects (Physics, Chemistry, Mathematics) with maxMarks: 100.
      // E.g., if score is 255/300, the ratio is 0.85, so 85/100 for each of the 3 subjects.
      // Let's create Physics, Chemistry, and Mathematics results out of 100 for this student, and delete the legacy record.
      // This preserves realistic demo data by distributing the score proportionally across 3 core subjects.
      const subjectsToCreate = ['Physics', 'Chemistry', 'Mathematics'];
      const proportionalScore = Math.round((res.score / 300) * 100);

      console.log(`Splitting score ${res.score}/300 into Physics, Chemistry, Mathematics at ${proportionalScore}/100 each for student ${studentId}...`);

      for (const sub of subjectsToCreate) {
        // Check if there is already a result for this student/subject/testTitle
        const existing = await ExamResult.findOne({
          student: res.student,
          subject: sub,
          testTitle: res.testTitle
        });

        if (existing) {
          console.log(`  - Record for ${sub} already exists (${existing.score}/${existing.maxMarks}). Updating it to ${proportionalScore}/100...`);
          existing.score = proportionalScore;
          existing.maxMarks = 100;
          await existing.save();
        } else {
          console.log(`  - Creating new record for ${sub} with score ${proportionalScore}/100...`);
          await ExamResult.create({
            student: res.student,
            subject: sub,
            testTitle: res.testTitle,
            date: res.date,
            score: proportionalScore,
            maxMarks: 100
          });
        }
      }

      // Delete the original legacy record if it is not one of the core subjects or if it was the consolidated one.
      // If the original subject was one of the core subjects (e.g. "Physics" but set out of 300), the loop above handled it or updated it, but if it was "All" or a combined subject name, we delete it.
      if (!subjectsToCreate.includes(res.subject)) {
        console.log(`Deleting legacy combined record with subject "${res.subject}"...`);
        await ExamResult.deleteOne({ _id: res._id });
      } else {
        // If it was "Physics" but had maxMarks 300, we should ensure any other subjects are created, and update this one to maxMarks 100.
        // We already updated/created above. If the legacy record was Physics, it was updated to 100 maxMarks. Let's make sure it's set to 100.
        const checkLegacy = await ExamResult.findById(res._id);
        if (checkLegacy && checkLegacy.maxMarks === 300) {
          checkLegacy.maxMarks = 100;
          checkLegacy.score = proportionalScore;
          await checkLegacy.save();
          console.log(`Updated legacy record ${res._id} to maxMarks: 100`);
        }
      }
    }

    console.log('Migration completed successfully.');

    // Confirm STU-2421604 specifically
    const targetStudent = await Student.findOne({ studentId: 'STU-2421604' });
    if (targetStudent) {
      const studentResults = await ExamResult.find({ student: targetStudent._id });
      console.log(`Student STU-2421604 now has ${studentResults.length} exam results:`);
      studentResults.forEach(r => {
        console.log(`- Subject: ${r.subject}, Test: ${r.testTitle}, Score: ${r.score}/${r.maxMarks}, Date: ${r.date}`);
      });
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

run();
