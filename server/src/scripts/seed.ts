import dotenv from 'dotenv';
import mongoose from 'mongoose';
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
const ADMIN_STUDENTS_MOCK = [
  {
    admissionNumber: 'ADM24001',
    studentId: 'STU-1001',
    qrId: 'QR-90382',
    registrationNumber: 'REG20240918',
    name: 'Varshith Rao',
    fatherName: 'Mr. Satish Rao',
    motherName: 'Mrs. Sandhya Rao',
    mobile: '9876543210',
    parentMobile: '9123456789',
    email: 'varshith.rao@inspire.edu',
    address: 'Flat 402, Gold Crest Residency, Madhapur, Hyderabad',
    residentialAddress: 'Hostel Block A, Room 203, Inspire Campus',
    hostelStatus: 'Resident' as const,
    transportStatus: 'Self Transport' as const,
    hostelBlock: 'Block A',
    hostelRoom: 'Room 203',
    course: 'MPC',
    section: 'Section A',
    branch: 'Madhapur',
    rollNumber: '24MPC01',
    status: 'Active' as const,
    documents: ['10th Marksheet.pdf', 'SSC Transfer Certificate.pdf', 'Aadhaar Card.pdf']
  },
  {
    admissionNumber: 'ADM24002',
    studentId: 'STU-1002',
    qrId: 'QR-18294',
    registrationNumber: 'REG20240801',
    name: 'Aaditya Varma',
    fatherName: 'Mr. Vijay Varma',
    motherName: 'Mrs. Rekha Varma',
    mobile: '8765432109',
    parentMobile: '9234567890',
    email: 'aaditya.varma@inspire.edu',
    address: 'Plot 12, Road No 4, Jubilee Hills, Hyderabad',
    residentialAddress: 'Hostel Block B, Room 104, Inspire Campus',
    hostelStatus: 'Resident' as const,
    transportStatus: 'Self Transport' as const,
    hostelBlock: 'Block B',
    hostelRoom: 'Room 104',
    course: 'MPC',
    section: 'Section B',
    branch: 'Madhapur',
    rollNumber: '24MPC02',
    status: 'Active' as const,
    documents: ['10th Marksheet.pdf', 'Income Certificate.pdf']
  }
];

const ACCOUNTANT_STUDENTS_MOCK = [
  {
    admissionNumber: 'ADM24001',
    studentId: 'STU-1001',
    qrId: 'QR-90382',
    registrationNumber: 'REG20240918',
    name: 'Varshith Rao',
    fatherName: 'Mr. Satish Rao',
    motherName: 'Mrs. Sandhya Rao',
    mobile: '9876543210',
    parentMobile: '9123456789',
    email: 'varshith.rao@inspire.edu',
    address: 'Flat 402, Gold Crest Residency, Madhapur, Hyderabad',
    residentialAddress: 'Hostel Block A, Room 203, Inspire Campus',
    hostelStatus: 'Resident' as const,
    transportStatus: 'Self Transport' as const,
    hostelBlock: 'Block A',
    hostelRoom: 'Room 203',
    tuitionFee: 120000,
    hostelFee: 85000,
    transportFee: 0,
    miscellaneousFee: 5000,
    previousPending: 0,
    totalPaid: 151000,
    remainingBalance: 59000,
    receipts: [
      { receiptNumber: 'REC-2026-001', date: '12 June 2026', category: 'Tuition Fee Initial', installment: 'Installment 1', amount: 80000, balance: 130000, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' },
      { receiptNumber: 'REC-2026-002', date: '14 June 2026', category: 'Hostel Fee Initial', installment: 'Installment 1', amount: 71000, balance: 59000, mode: 'Cash Payment', cashier: 'Mr. Venkatesh' }
    ]
  },
  {
    admissionNumber: 'ADM24002',
    studentId: 'STU-1002',
    qrId: 'QR-18294',
    registrationNumber: 'REG20240801',
    name: 'Aaditya Varma',
    fatherName: 'Mr. Vijay Varma',
    motherName: 'Mrs. Rekha Varma',
    mobile: '8765432109',
    parentMobile: '9234567890',
    email: 'aaditya.varma@inspire.edu',
    address: 'Plot 12, Road No 4, Jubilee Hills, Hyderabad',
    residentialAddress: 'Hostel Block B, Room 104, Inspire Campus',
    hostelStatus: 'Resident' as const,
    transportStatus: 'Self Transport' as const,
    hostelBlock: 'Block B',
    hostelRoom: 'Room 104',
    tuitionFee: 120000,
    hostelFee: 85000,
    transportFee: 0,
    miscellaneousFee: 5000,
    previousPending: 10000,
    totalPaid: 95000,
    remainingBalance: 115000,
    receipts: [
      { receiptNumber: 'REC-2026-003', date: '13 June 2026', category: 'Tuition Fee Partial', installment: 'Installment 1', amount: 60000, balance: 150000, mode: 'Credit Card', cashier: 'Mr. Venkatesh' },
      { receiptNumber: 'REC-2026-004', date: '18 June 2026', category: 'Previous Arrears Settled', installment: 'Overdue Balance', amount: 35000, balance: 115000, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' }
    ]
  },
  {
    admissionNumber: 'ADM24003',
    studentId: 'STU-1003',
    qrId: 'QR-65123',
    registrationNumber: 'REG20241011',
    name: 'Rahul Khanna',
    fatherName: 'Mr. Satish Khanna',
    motherName: 'Mrs. Neha Khanna',
    mobile: '7654321098',
    parentMobile: '9345678901',
    email: 'rahul.khanna@inspire.edu',
    address: 'Flat 101, Elite Residency, Secunderabad',
    residentialAddress: 'Flat 101, Elite Residency, Secunderabad',
    hostelStatus: 'Day Scholar' as const,
    transportStatus: 'College Bus' as const,
    tuitionFee: 120000,
    hostelFee: 0,
    transportFee: 15000,
    miscellaneousFee: 5000,
    previousPending: 15000,
    totalPaid: 80000,
    remainingBalance: 75000,
    receipts: [
      { receiptNumber: 'REC-2026-005', date: '15 June 2026', category: 'Tuition Fee Partial', installment: 'Installment 1', amount: 80000, balance: 75000, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' }
    ]
  },
  {
    admissionNumber: 'ADM24004',
    studentId: 'STU-1004',
    qrId: 'QR-73921',
    registrationNumber: 'REG20240902',
    name: 'Sneha Reddy',
    fatherName: 'Mr. Ramana Reddy',
    motherName: 'Mrs. Sunitha Reddy',
    mobile: '6543210987',
    parentMobile: '9456789012',
    email: 'sneha.reddy@inspire.edu',
    address: 'Plot 44, Gachibowli, Hyderabad',
    residentialAddress: 'Hostel Block C, Room 302, Inspire Campus',
    hostelStatus: 'Resident' as const,
    transportStatus: 'Self Transport' as const,
    hostelBlock: 'Block C',
    hostelRoom: 'Room 302',
    tuitionFee: 130000,
    hostelFee: 85000,
    transportFee: 0,
    miscellaneousFee: 5000,
    previousPending: 0,
    totalPaid: 100000,
    remainingBalance: 120000,
    receipts: [
      { receiptNumber: 'REC-2026-006', date: '20 June 2026', category: 'Tuition Fee Initial', installment: 'Installment 1', amount: 100000, balance: 120000, mode: 'Demand Draft', cashier: 'Mr. Venkatesh' }
    ]
  }
];

const TEACHERS_MOCK = [
  { id: 'FAC-201', name: 'Mr. Ramesh K', subject: 'Physics', mobile: '9000100021', salary: 75000, assignedClasses: ['Junior MPC', 'Senior MPC'], assignedSections: ['Section A', 'Section B'], assignedSubjects: ['Physics'], status: 'Active' as const },
  { id: 'FAC-202', name: 'Mrs. Sarada M', subject: 'Chemistry', mobile: '9000100022', salary: 80000, assignedClasses: ['Junior BiPC'], assignedSections: ['Section A'], assignedSubjects: ['Chemistry'], status: 'Active' as const },
  { id: 'FAC-203', name: 'Mr. Anand S', subject: 'Mathematics', mobile: '9000100023', salary: 85000, assignedClasses: ['Junior MPC'], assignedSections: ['Section A'], assignedSubjects: ['Mathematics'], status: 'Active' as const }
];

const BULLETINS_MOCK = [
  { id: 'BUL-001', category: 'announcement' as const, title: 'Inspire wins District STEM Cup', date: '04 July 2026', content: 'Our Junior MPC Section A campus team secured 1st prize in engineering physics models.' },
  { id: 'BUL-002', category: 'holiday' as const, title: 'Independence Day Holiday', date: '15 Aug 2026', content: 'Campus will remain closed on 15th August for national Independence Day celebrations.' }
];

const ATTENDANCE_ROSTER_MOCK = [
  { id: 'STU-1001', name: 'Varshith Rao', type: 'student', section: 'MPC-A', status: 'present' as const },
  { id: 'STU-1002', name: 'Aaditya Varma', type: 'student', section: 'MPC-A', status: 'present' as const },
  { id: 'STU-1003', name: 'Rahul Khanna', type: 'student', section: 'MPC-A', status: 'present' as const },
  { id: 'STU-1004', name: 'Sneha Reddy', type: 'student', section: 'MPC-A', status: 'absent' as const },
  { id: 'STU-1005', name: 'Pooja Hegde', type: 'student', section: 'MPC-B', status: 'present' as const },
  { id: 'STU-1006', name: 'Prabhas Kumar', type: 'student', section: 'MPC-B', status: 'present' as const },
  { id: 'STU-1007', name: 'Allu Arjun', type: 'student', section: 'BiPC-A', status: 'present' as const },
  { id: 'STU-1008', name: 'NTR Rama Rao', type: 'student', section: 'BiPC-A', status: 'late' as const },
  { id: 'STU-1009', name: 'Vijay Deverakonda', type: 'student', section: 'CEC-A', status: 'present' as const },
  { id: 'FAC-201', name: 'Mr. Ramesh (Physics)', type: 'faculty', status: 'present' as const },
  { id: 'FAC-202', name: 'Mrs. Sarada (Chemistry)', type: 'faculty', status: 'present' as const },
  { id: 'FAC-203', name: 'Mr. Anand (Maths)', type: 'faculty', status: 'present' as const },
  { id: 'FAC-204', name: 'Mrs. Grace (English)', type: 'faculty', status: 'leave' as const }
];

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

    // Reconcile and add Mrs. Grace (FAC-204) who is only in the attendance mock
    const graceData = {
      id: 'FAC-204',
      name: 'Mrs. Grace',
      subject: 'English',
      mobile: '9000100024',
      salary: 68000,
      assignedClasses: ['Junior MPC', 'Junior BiPC'],
      assignedSections: ['Section A', 'Section B'],
      assignedSubjects: ['English'],
      status: 'Active' as const
    };
    const graceTeacher = await Teacher.create(graceData);
    seededTeachers[graceTeacher.id] = graceTeacher;
    console.log(`[RECONCILE] Added Mrs. Grace (FAC-204) to Teachers (found in attendance list, missing from teacher list).`);

    // 3. Reconcile and Seed Students
    const studentMapping: Record<string, any> = {};

    // Base mock student lists merging
    for (const accountantStudent of ACCOUNTANT_STUDENTS_MOCK) {
      const adminStudent = ADMIN_STUDENTS_MOCK.find(s => s.studentId === accountantStudent.studentId);
      
      let mergedStudentData: any = { ...accountantStudent };
      
      if (adminStudent) {
        console.log(`[RECONCILE] Merging Student details for ${accountantStudent.studentId} (${accountantStudent.name}) from Admin and Accountant portals.`);
        mergedStudentData = {
          ...accountantStudent,
          course: adminStudent.course,
          section: adminStudent.section,
          branch: adminStudent.branch,
          rollNumber: adminStudent.rollNumber,
          status: adminStudent.status,
          documents: adminStudent.documents
        };
      } else {
        // Default academic settings for students only in accountant list
        let course = 'MPC';
        let section = 'Section A';
        let rollNumber = '24MPC03'; // default fallback for STU-1003
        if (accountantStudent.studentId === 'STU-1004') {
          rollNumber = '24MPC04';
        }
        
        console.log(`[RECONCILE] Student ${accountantStudent.studentId} (${accountantStudent.name}) missing from Admin list. Assigning defaults: course=${course}, section=${section}, rollNumber=${rollNumber}.`);
        mergedStudentData = {
          ...accountantStudent,
          course,
          section,
          branch: 'Madhapur',
          rollNumber,
          status: 'Active',
          documents: []
        };
      }

      // Remove nested receipts from Student creation payload since they are handled as refs
      const receiptsMockData = mergedStudentData.receipts || [];
      delete mergedStudentData.receipts;

      const studentDoc = await Student.create(mergedStudentData);
      studentMapping[studentDoc.studentId] = studentDoc;
      console.log(`[SEED] Student ${studentDoc.studentId} (${studentDoc.name}) created.`);

      // Seed fee payments for this student
      const paymentIds: mongoose.Types.ObjectId[] = [];
      for (const rec of receiptsMockData) {
        const pay = await FeePayment.create({
          receiptNumber: rec.receiptNumber,
          date: rec.date,
          category: rec.category,
          installment: rec.installment,
          amount: rec.amount,
          balance: rec.balance,
          mode: rec.mode,
          cashier: rec.cashier,
          student: studentDoc._id
        });
        paymentIds.push(pay._id as mongoose.Types.ObjectId);
        console.log(`  [SEED] Payment ${pay.receiptNumber} (₹${pay.amount}) linked to ${studentDoc.studentId}.`);
      }

      // Save references back to Student
      studentDoc.receipts = paymentIds as any[];
      await studentDoc.save();
    }

    // Add extra students from Attendance Roster (STU-1005 to STU-1009)
    const extraAttendanceStudents = [
      { id: 'STU-1005', name: 'Pooja Hegde', course: 'MPC', section: 'Section B', rollNumber: '24MPC05', email: 'pooja.hegde@inspire.edu' },
      { id: 'STU-1006', name: 'Prabhas Kumar', course: 'MPC', section: 'Section B', rollNumber: '24MPC06', email: 'prabhas.kumar@inspire.edu' },
      { id: 'STU-1007', name: 'Allu Arjun', course: 'BiPC', section: 'Section A', rollNumber: '24BIPC01', email: 'allu.arjun@inspire.edu' },
      { id: 'STU-1008', name: 'NTR Rama Rao', course: 'BiPC', section: 'Section A', rollNumber: '24BIPC02', email: 'ntr.ramarao@inspire.edu' },
      { id: 'STU-1009', name: 'Vijay Deverakonda', course: 'CEC', section: 'Section A', rollNumber: '24CEC01', email: 'vijay.d@inspire.edu' }
    ];

    for (const extra of extraAttendanceStudents) {
      const studentDoc = await Student.create({
        admissionNumber: `ADM2400${extra.id.split('-')[1]}`,
        studentId: extra.id,
        qrId: `QR-${Math.floor(10000 + Math.random() * 90000)}`,
        registrationNumber: `REG202409${extra.id.split('-')[1]}`,
        name: extra.name,
        fatherName: `Mr. ${extra.name.split(' ')[1] || 'Parent'}`,
        motherName: `Mrs. ${extra.name.split(' ')[1] || 'Parent'}`,
        mobile: '9000100099',
        parentMobile: '9000200099',
        email: extra.email,
        address: 'Madhapur, Hyderabad',
        residentialAddress: 'Madhapur, Hyderabad',
        hostelStatus: 'Day Scholar',
        transportStatus: 'Self Transport',
        course: extra.course,
        section: extra.section,
        branch: 'Madhapur',
        rollNumber: extra.rollNumber,
        status: 'Active',
        documents: [],
        tuitionFee: 120000,
        hostelFee: 0,
        transportFee: 0,
        miscellaneousFee: 5000,
        previousPending: 0,
        totalPaid: 0,
        remainingBalance: 125000,
        receipts: []
      });
      studentMapping[studentDoc.studentId] = studentDoc;
      console.log(`[RECONCILE] Created Student record for attendance attendee: ${studentDoc.studentId} (${studentDoc.name}).`);
    }

    // Add Polsani Manoneeth Rao (STU-2421604) for Student Portal View
    const polsaniDoc = await Student.create({
      admissionNumber: 'ADM24010',
      studentId: 'STU-2421604',
      qrId: 'QR-90383',
      registrationNumber: 'REG20240925',
      name: 'Polsani Manoneeth Rao',
      fatherName: 'Mr. Satish Rao',
      motherName: 'Mrs. Sandhya Rao',
      mobile: '9876543211',
      parentMobile: '9123456788',
      email: 'polsani.manoneeth@inspire.edu',
      address: 'Flat 402, Gold Crest Residency, Madhapur, Hyderabad',
      residentialAddress: 'Hostel Block A, Room 203, Inspire Campus',
      hostelStatus: 'Resident',
      transportStatus: 'Self Transport',
      hostelBlock: 'Block A',
      hostelRoom: 'Room 203',
      course: 'MPC',
      section: 'Section A',
      branch: 'Madhapur',
      rollNumber: '2421604',
      status: 'Active',
      documents: ['10th Marksheet.pdf', 'SSC Transfer Certificate.pdf', 'Aadhaar Card.pdf'],
      tuitionFee: 120000,
      hostelFee: 85000,
      transportFee: 0,
      miscellaneousFee: 5000,
      previousPending: 0,
      totalPaid: 120000,
      remainingBalance: 90000,
      receipts: []
    });
    studentMapping[polsaniDoc.studentId] = polsaniDoc;
    
    // Seed receipts for Polsani
    const polsaniPayments = [
      { receiptNumber: 'REC-2026-007', date: '12 June 2026', category: 'Tuition Fee Initial', installment: 'Installment 1', amount: 100000, balance: 110000, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' },
      { receiptNumber: 'REC-2026-008', date: '15 June 2026', category: 'Hostel Fee Initial', installment: 'Installment 1', amount: 20000, balance: 90000, mode: 'Cash Payment', cashier: 'Mr. Venkatesh' }
    ];
    
    const polsaniPayIds: mongoose.Types.ObjectId[] = [];
    for (const rec of polsaniPayments) {
      const pay = await FeePayment.create({
        receiptNumber: rec.receiptNumber,
        date: rec.date,
        category: rec.category,
        installment: rec.installment,
        amount: rec.amount,
        balance: rec.balance,
        mode: rec.mode,
        cashier: rec.cashier,
        student: polsaniDoc._id
      });
      polsaniPayIds.push(pay._id as mongoose.Types.ObjectId);
    }
    polsaniDoc.receipts = polsaniPayIds as any[];
    await polsaniDoc.save();
    console.log(`[SEED] Created canonical student profile & linked payments for student portal: Polsani Manoneeth Rao (STU-2421604).`);

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

    // 6. Seed Exam Results (placeholders)
    const examSubjects = ['Physics', 'Chemistry', 'Mathematics', 'English'];
    for (const studentId of ['STU-1001', 'STU-1002', 'STU-1003', 'STU-1004', 'STU-2421604']) {
      const student = studentMapping[studentId];
      if (!student) continue;

      for (const subject of examSubjects) {
        const score = Math.floor(55 + Math.random() * 40); // score between 55 and 95 (out of 100)
        await ExamResult.create({
          subject,
          testTitle: 'Unit Test 2',
          date: '28 June 2026',
          score,
          maxMarks: 100, // Each subject is out of 100 (combined 3 subjects = 300)
          student: student._id
        });
      }
      console.log(`[SEED] Placeholder exam results seeded for ${studentId} (${student.name}).`);
    }

    // 7. Seed Timetable (placeholders)
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
      { time: '09:00 AM - 10:00 AM', subject: 'Mathematics', teacherId: 'FAC-203' },
      { time: '10:00 AM - 11:00 AM', subject: 'Physics', teacherId: 'FAC-201' },
      { time: '11:15 AM - 12:15 PM', subject: 'Chemistry', teacherId: 'FAC-202' },
      { time: '01:00 PM - 02:00 PM', subject: 'English', teacherId: 'FAC-204' }
    ];

    for (const day of weekdays) {
      for (const p of periods) {
        const teacher = seededTeachers[p.teacherId];
        if (!teacher) continue;

        await TimetableEntry.create({
          section: 'Section A',
          day,
          period: p.time,
          subject: p.subject,
          teacher: teacher._id
        });
      }
    }
    console.log('[SEED] Timetable entries seeded for Section A.');

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
      if (r.block === 'Block A' && r.roomNumber === 'Room 203') {
        if (studentMapping['STU-1001']) occupants.push(studentMapping['STU-1001']._id);
        if (studentMapping['STU-2421604']) occupants.push(studentMapping['STU-2421604']._id);
      } else if (r.block === 'Block B' && r.roomNumber === 'Room 104') {
        if (studentMapping['STU-1002']) occupants.push(studentMapping['STU-1002']._id);
      }
      await Room.create({
        ...r,
        occupants
      });
      console.log(`[SEED] Room ${r.roomNumber} (${r.block}) created with ${occupants.length} occupants.`);
    }

    // 7c. Seed Initial Scheduled Exams
    console.log('\nStarting exam seeding...');
    const examsToSeed = [
      { id: 'EX-1', name: 'Quarterly Physics Term', date: '10 Aug 2026', class: 'Junior MPC', status: 'Scheduled', resultsPublished: false },
      { id: 'EX-2', name: 'Half-Yearly Math Exam', date: '24 Sep 2026', class: 'Junior MPC', status: 'Scheduled', resultsPublished: false }
    ];

    for (const ex of examsToSeed) {
      await Exam.create(ex);
      console.log(`[SEED] Exam ${ex.id} (${ex.name}) seeded.`);
    }

    // 8. Seed Users & Print Credentials
    const demoPassword = '111111';
    const usersToSeed = [
      { username: 'admin1', role: 'admin1' as const },
      { username: 'admin2', role: 'admin2' as const },
      { username: 'accountant', role: 'accountant' as const },
      { username: 'student', role: 'student' as const, profileId: studentMapping['STU-2421604']._id, profileModel: 'Student' as const }
    ];

    console.log('\n==================================================');
    console.log('SEED USER CREDENTIALS FOR TESTING (Save these!):');
    console.log('==================================================');

    for (const u of usersToSeed) {
      await User.create({
        username: u.username,
        passwordHash: demoPassword, // plain placeholder for now
        role: u.role,
        profileId: u.profileId,
        profileModel: u.profileModel
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
