import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
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

// Ensure empty check is bypassed during seed execution
process.env.BYPASS_DB_EMPTY_CHECK = 'true';

// 1. Define mock data directly from source views
const ADMIN_STUDENTS_MOCK: any[] = [];

const ACCOUNTANT_STUDENTS_MOCK: any[] = [];

const TEACHERS_MOCK: any[] = [];

const BULLETINS_MOCK: any[] = [];

const ATTENDANCE_ROSTER_MOCK: any[] = [];

const SETTINGS_MOCK = {
  tuition: 120000,
  hostel: 85000,
  transport: 15000,
  misc: 5000,
  isLocked: false,
  academicYear: '2026-27',
  installments: '3 Installments',
  lateFeeRules: '₹100 per day after due date',
  scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver',
  discountRules: 'Sibling: 10% waiver'
};

const seed = async () => {
  try {
    await connectDB();

    // Safety checks: verify collections count
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
      { name: 'Exam', model: Exam }
    ];

    const nonEmpty: string[] = [];
    for (const item of models) {
      const count = await (item.model as any).countDocuments();
      if (count > 0) {
        nonEmpty.push(`${item.name} (${count} docs)`);
      }
    }

    if (nonEmpty.length > 0) {
      console.error(`\n======================================================================`);
      console.error(`CRITICAL SAFETY ABORT: Seeding aborted because database already contains documents:`);
      console.error(nonEmpty.join(', '));
      console.error(`Please run 'npm run reset:demo-data' if you explicitly want to wipe and reseed.`);
      console.error(`======================================================================\n`);
      process.exit(1);
    }

    console.log('\nStarting database seeding...');

    // 1. Seed Academic Fee Settings
    const feeSettings = await AcademicFeeSettings.create(SETTINGS_MOCK);
    console.log('[SEED] Academic Fee Settings created.');

    // 2. Seed Teachers
    const seededTeachers: Record<string, any> = {};
    for (const teacherData of TEACHERS_MOCK) {
      const t = await Teacher.create(teacherData);
      seededTeachers[t.id] = t;
      console.log(`[SEED] Teacher ${t.id} (${t.name}) seeded.`);
    }

    // 3. Reconcile and Seed Students
    const studentMapping: Record<string, any> = {};

    // 4. Seed Bulletins
    for (const bData of BULLETINS_MOCK) {
      await Bulletin.create(bData);
      console.log(`[SEED] Bulletin ${bData.id} seeded.`);
    }

    // 5. Seed Attendance Records
    for (const att of ATTENDANCE_ROSTER_MOCK) {
      let targetId: any;
      let targetModel: 'Student' | 'Teacher';

      if (att.type === 'student') {
        const student = studentMapping[att.id];
        if (student) {
          targetId = student._id;
          targetModel = 'Student';
        } else {
          console.warn(`[SEED WARNING] Student ${att.id} not found in mappings during attendance seed.`);
          continue;
        }
      } else {
        const teacher = seededTeachers[att.id];
        if (teacher) {
          targetId = teacher._id;
          targetModel = 'Teacher';
        } else {
          console.warn(`[SEED WARNING] Teacher ${att.id} not found in mappings during attendance seed.`);
          continue;
        }
      }

      await AttendanceRecord.create({
        targetId,
        targetModel,
        date: new Date('2026-07-07'),
        status: att.status
      });
      console.log(`[SEED] Attendance recorded: ${att.id} (${att.name}) -> ${att.status}.`);
    }

    // 7b. Seed Hostel Rooms
    console.log('\nStarting room seeding...');
    const roomsToSeed = [
      { roomNumber: 'Room 101', block: 'Block A', capacity: 4 },
      { roomNumber: 'Room 102', block: 'Block A', capacity: 4 },
      { roomNumber: 'Room 203', block: 'Block A', capacity: 4 },
      { roomNumber: 'Room 302', block: 'Block A', capacity: 4 },

      { roomNumber: 'Room 101', block: 'Block B', capacity: 4 },
      { roomNumber: 'Room 102', block: 'Block B', capacity: 4 },
      { roomNumber: 'Room 104', block: 'Block B', capacity: 4 },
      { roomNumber: 'Room 203', block: 'Block B', capacity: 4 },
      { roomNumber: 'Room 302', block: 'Block B', capacity: 4 },

      { roomNumber: 'Room 101', block: 'Block C', capacity: 4 },
      { roomNumber: 'Room 102', block: 'Block C', capacity: 4 },
      { roomNumber: 'Room 203', block: 'Block C', capacity: 4 },
      { roomNumber: 'Room 302', block: 'Block C', capacity: 4 },
    ];

    for (const r of roomsToSeed) {
      const occupants: mongoose.Types.ObjectId[] = [];
      await Room.create({
        ...r,
        occupants
      });
      console.log(`[SEED] Room ${r.roomNumber} (${r.block}) created with ${occupants.length} occupants.`);
    }

    // 8. Seed Users & Print Credentials
    const demoPassword = '111111';
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(demoPassword, salt);

    const usersToSeed = [
      {
        username: 'admin1',
        role: 'admin1' as const,
        name: 'Rector Office',
        email: 'admin1@inspirehnk.org',
        mobile: '+91 9876543210',
        department: 'Rectorate'
      },
      {
        username: 'admin2',
        role: 'admin2' as const,
        name: 'Principal Desk',
        email: 'admin2@inspirehnk.org',
        mobile: '+91 9876543211',
        department: 'Campus Administration'
      },
      {
        username: 'accountant',
        role: 'accountant' as const,
        name: 'Accounts Officer',
        email: 'accountant@inspirehnk.org',
        mobile: '+91 9876543213',
        department: 'Finance & Billing'
      },
      {
        username: 'authenticator',
        role: 'authenticator' as const,
        name: 'Security Command Center',
        email: 'security@inspirehnk.org',
        mobile: '+91 9876543214',
        department: 'Security Controls'
      }
    ];

    console.log('\n==================================================');
    console.log('SEED USER CREDENTIALS FOR TESTING (Save these!):');
    console.log('==================================================');

    for (const u of usersToSeed) {
      await User.create({
        username: u.username,
        passwordHash: hashed,
        role: u.role,
        backupCode: '111111',
        usedBackupCodes: [],
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        department: u.department
      });
      console.log(`Role: ${u.role.toUpperCase().padEnd(12)} | Username: ${u.username.padEnd(12)} | Password: ${demoPassword}`);
    }
    console.log('==================================================\n');

    console.log('Database seeding completed successfully.\n');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding process failed:', error);
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
    process.exit(1);
  }
};

seed();
