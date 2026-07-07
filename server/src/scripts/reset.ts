import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { execSync } from 'child_process';
import path from 'path';
import { connectDB } from '../config/db';
import { Student } from '../models/student';
import { Teacher } from '../models/teacher';
import { Bulletin } from '../models/bulletin';
import { AttendanceRecord } from '../models/attendance';
import { FeePayment } from '../models/payment';
import { AcademicFeeSettings } from '../models/feeSettings';
import { ExamResult } from '../models/examResult';
import { TimetableEntry } from '../models/timetable';
import { User } from '../models/user';
import { Room } from '../models/room';
import { Exam } from '../models/exam';


dotenv.config();

// Ensure connection checks bypass the empty collection guard
process.env.BYPASS_DB_EMPTY_CHECK = 'true';

const reset = async () => {
  try {
    await connectDB();
    console.log('\n==================================================');
    console.log('RESETTING DEMO DATA (JC ERP DATABASE)');
    console.log('==================================================');

    const models = [
      { name: 'Student', model: Student },
      { name: 'Teacher', model: Teacher },
      { name: 'Bulletin', model: Bulletin },
      { name: 'AttendanceRecord', model: AttendanceRecord },
      { name: 'FeePayment', model: FeePayment },
      { name: 'AcademicFeeSettings', model: AcademicFeeSettings },
      { name: 'ExamResult', model: ExamResult },
      { name: 'TimetableEntry', model: TimetableEntry },
      { name: 'User', model: User },
      { name: 'Room', model: Room },
      { name: 'Exam', model: Exam },
    ];

    // Wipe documents from each collection
    for (const item of models) {
      const result = await (item.model as any).deleteMany({});
      console.log(`[WIPE] Deleted ${result.deletedCount} documents from "${item.name}" collection.`);
    }

    console.log('All collections cleared successfully.');
    
    // Close the connection before starting the child process
    await mongoose.connection.close();
    console.log('Database connection closed. Invoking seed script to repopulate data...\n');

    // Execute the seed script as a child process
    const serverRoot = path.resolve(__dirname, '../..');
    execSync('npx ts-node src/scripts/seed.ts', { stdio: 'inherit', cwd: serverRoot });

  } catch (error) {
    console.error('Reset process failed:', error);
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
    process.exit(1);
  }
};

reset();
