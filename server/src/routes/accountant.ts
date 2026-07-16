import { Router, Request, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import { validateSecurityKey } from '../middleware/validateKey';
import { Student } from '../models/student';
import { Teacher } from '../models/teacher';
import { FeePayment } from '../models/payment';

import { Room } from '../models/room';
import { AcademicFeeSettings } from '../models/feeSettings';
import { AttendanceRecord } from '../models/attendance';
import { emitToRole, emitToStudent } from '../realtime';

const router = Router();
const accountantGuard = [authenticateJWT, authorizeRoles('accountant')];
const accountantKeyGuard = [authenticateJWT, authorizeRoles('accountant'), validateSecurityKey('accountant')];
const attendanceGuard = [authenticateJWT, authorizeRoles('accountant', 'admin3', 'admin1')];

const isNonEmptyString = (value: unknown, maxLength: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

// GET /api/accountant/students?search=<query>
router.get('/students', ...accountantGuard, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    let query: any = { status: 'Active' };
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        status: 'Active',
        $or: [
          { name: regex },
          { rollNumber: regex },
          { section: regex },
          { admissionNumber: regex }
        ]
      };
    }
    const list = await Student.find(query).populate('receipts').sort({ name: 1 });
    res.json({ status: 'success', data: list });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to search students.' });
  }
});

// GET /api/accountant/students/:id
router.get('/students/:id', ...accountantGuard, async (req: Request, res: Response) => {
  try {
    const student = await Student.findById(req.params.id).populate('receipts');
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }
    res.json({ status: 'success', data: student });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to get student profile.' });
  }
});

// PATCH /api/accountant/students/:id/bio
router.patch('/students/:id/bio', ...accountantKeyGuard, async (req: Request, res: Response) => {
  try {
    const { address, hostelStatus, transportStatus, hostelBlock, hostelRoom, residentialAddress } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if (address !== undefined) {
      if (!isNonEmptyString(address, 400)) return res.status(400).json({ status: 'error', message: 'address is missing or too long.' });
      student.address = address;
    }
    if (hostelStatus !== undefined) {
      if (!['Resident', 'Day Scholar'].includes(hostelStatus)) return res.status(400).json({ status: 'error', message: 'Invalid hostelStatus.' });
      student.hostelStatus = hostelStatus;
    }
    if (transportStatus !== undefined) {
      if (!['College Bus', 'Self Transport'].includes(transportStatus)) return res.status(400).json({ status: 'error', message: 'Invalid transportStatus.' });
      student.transportStatus = transportStatus;
    }
    if (hostelBlock !== undefined) {
      if (!isNonEmptyString(hostelBlock, 40)) return res.status(400).json({ status: 'error', message: 'hostelBlock is missing or too long.' });
      student.hostelBlock = hostelBlock;
    }
    if (hostelRoom !== undefined) {
      if (!isNonEmptyString(hostelRoom, 40)) return res.status(400).json({ status: 'error', message: 'hostelRoom is missing or too long.' });
      student.hostelRoom = hostelRoom;
    }
    if (residentialAddress !== undefined) {
      if (!isNonEmptyString(residentialAddress, 400)) return res.status(400).json({ status: 'error', message: 'residentialAddress is missing or too long.' });
      student.residentialAddress = residentialAddress;
    }

    await student.save();
    res.json({ status: 'success', data: student });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update student bio.' });
  }
});

// POST /api/accountant/students/:id/payments
router.post('/students/:id/payments', ...accountantKeyGuard, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { amount, installment, mode, category, date } = req.body;
    const payAmt = Number(amount);

    if (!Number.isFinite(payAmt) || payAmt <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid payment amount.' });
    }

    if (!isNonEmptyString(installment, 80) || !isNonEmptyString(mode, 80) || !isNonEmptyString(category, 80)) {
      return res.status(400).json({ status: 'error', message: 'installment, mode, and category are required.' });
    }

    const student = await Student.findById(req.params.id).populate('receipts');
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if (payAmt > student.remainingBalance) {
      return res.status(400).json({ status: 'error', message: 'Amount exceeds remaining fee balance.' });
    }

    const nextBal = student.remainingBalance - payAmt;
    const nextPaid = student.totalPaid + payAmt;
    const cashierName = authReq.user?.username || 'accountant';

    // Receipt format: REC-YYYY-MMDD-random
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '').slice(2);
    const rand = Math.floor(Math.random() * 900 + 100).toString();
    const receiptNum = `REC-2026-${dateStr}-${rand}`;

    const formattedDate = date && isNonEmptyString(date, 40)
      ? date
      : today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const payment = await FeePayment.create({
      receiptNumber: receiptNum,
      date: formattedDate,
      category,
      installment,
      amount: payAmt,
      balance: nextBal,
      mode,
      cashier: cashierName,
      student: student._id
    });

    student.totalPaid = nextPaid;
    student.remainingBalance = nextBal;
    student.receipts.push(payment._id as any);
    await student.save();

    const studentRoomId = String(student._id);
    emitToStudent(studentRoomId, 'fee:updated', {
      type: 'fee:updated',
      studentId: studentRoomId
    });
    emitToRole('accountant', 'fee:updated', {
      type: 'fee:updated',
      studentId: studentRoomId
    });
    emitToRole('admin2', 'fee:updated', {
      type: 'fee:updated',
      studentId: studentRoomId
    });

    res.status(201).json({
      status: 'success',
      data: {
        payment,
        student: await Student.findById(student._id).populate('receipts')
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to record payment.' });
  }
});

// GET /api/accountant/students/:id/payments
router.get('/students/:id/payments', ...accountantGuard, async (req: Request, res: Response) => {
  try {
    const list = await FeePayment.find({ student: req.params.id }).sort({ createdAt: -1 });
    res.json({ status: 'success', data: list });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to get payment history.' });
  }
});

// GET /api/accountant/hostel
router.get('/hostel', ...accountantGuard, async (_req: Request, res: Response) => {
  try {
    const rooms = await Room.find().populate('occupants');
    
    // Calculate summaries per block
    const blocks: any = {
      BlockA: { name: 'Block A (Boys)', capacity: 0, occupied: 0 },
      BlockB: { name: 'Block B (Girls)', capacity: 0, occupied: 0 },
      BlockC: { name: 'Block C (Girls)', capacity: 0, occupied: 0 }
    };

    for (const room of rooms) {
      const blockKey = room.block.replace(/ /g, ''); // Block A -> BlockA
      if (blocks[blockKey]) {
        blocks[blockKey].capacity += room.capacity;
        blocks[blockKey].occupied += room.occupants.length;
      }
    }

    res.json({
      status: 'success',
      data: {
        blocks,
        rooms
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch hostel details.' });
  }
});

// PATCH /api/accountant/hostel/:roomId
router.patch('/hostel/:roomId', ...accountantKeyGuard, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;
    if (!isNonEmptyString(studentId, 80)) {
      return res.status(400).json({ status: 'error', message: 'studentId is required.' });
    }
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ status: 'error', message: 'Room not found.' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ status: 'error', message: 'Room capacity is full.' });
    }

    // 1. Remove student from previous room occupants if any
    await Room.updateMany(
      { occupants: student._id },
      { $pull: { occupants: student._id } }
    );

    // 2. Add student to new room occupants
    room.occupants.push(student._id as any);
    await room.save();

    // 3. Update student hostel status details
    student.hostelStatus = 'Resident';
    student.hostelBlock = room.block;
    student.hostelRoom = room.roomNumber;
    student.residentialAddress = `${room.block}, ${room.roomNumber}, Madhapur Campus`;
    await student.save();

    emitToStudent(String(student._id), 'hostel:updated', {
      type: 'hostel:updated',
      studentId: String(student._id),
      roomId: String(room._id)
    });

    res.json({
      status: 'success',
      data: {
        student,
        room: await Room.findById(room._id).populate('occupants')
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to allocate hostel room.' });
  }
});

// GET /api/accountant/late-fees-settings
router.get('/late-fees-settings', ...accountantGuard, async (_req: Request, res: Response) => {
  try {
    let settings = await AcademicFeeSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await AcademicFeeSettings.create({});
    }
    res.json({ status: 'success', data: { lateFeeRules: settings.lateFeeRules } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch late fee settings.' });
  }
});

// PATCH /api/accountant/late-fees-settings
router.patch('/late-fees-settings', ...accountantGuard, async (req: Request, res: Response) => {
  try {
    const { lateFeeRules } = req.body;
    if (!isNonEmptyString(lateFeeRules, 400)) {
      return res.status(400).json({ status: 'error', message: 'lateFeeRules is required.' });
    }
    let settings = await AcademicFeeSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await AcademicFeeSettings.create({ lateFeeRules });
    } else {
      settings.lateFeeRules = lateFeeRules;
      await settings.save();
    }
    res.json({ status: 'success', data: { lateFeeRules: settings.lateFeeRules } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update late fee settings.' });
  }
});

// GET /api/accountant/scholarships
router.get('/scholarships', ...accountantGuard, async (_req: Request, res: Response) => {
  try {
    let settings = await AcademicFeeSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await AcademicFeeSettings.create({});
    }
    res.json({ status: 'success', data: { scholarshipRules: settings.scholarshipRules } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch scholarship settings.' });
  }
});

// PATCH /api/accountant/scholarships
router.patch('/scholarships', ...accountantGuard, async (req: Request, res: Response) => {
  try {
    const { scholarshipRules } = req.body;
    if (!isNonEmptyString(scholarshipRules, 400)) {
      return res.status(400).json({ status: 'error', message: 'scholarshipRules is required.' });
    }
    let settings = await AcademicFeeSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await AcademicFeeSettings.create({ scholarshipRules });
    } else {
      settings.scholarshipRules = scholarshipRules;
      await settings.save();
    }
    res.json({ status: 'success', data: { scholarshipRules: settings.scholarshipRules } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update scholarship settings.' });
  }
});

// GET /api/accountant/dashboard-summary
router.get('/dashboard-summary', ...accountantGuard, async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's payment sum
    const paymentsToday = await FeePayment.find({
      createdAt: { $gte: today }
    });
    const collectionToday = paymentsToday.reduce((sum, p) => sum + p.amount, 0);

    // Pending fees count and total amount
    const pendingStudents = await Student.find({ remainingBalance: { $gt: 0 } });
    const pendingCount = pendingStudents.length;
    const pendingAmount = pendingStudents.reduce((sum, s) => sum + s.remainingBalance, 0);

    // Absent count today
    const absentCount = await AttendanceRecord.countDocuments({
      targetModel: 'Student',
      status: 'absent',
      createdAt: { $gte: today }
    });

    res.json({
      status: 'success',
      data: {
        collectionToday,
        pendingCount,
        pendingAmount,
        absentCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to compile dashboard summary.' });
  }
});

// GET /api/accountant/attendance
router.get('/attendance', ...attendanceGuard, async (req: Request, res: Response) => {
  try {
    const dateParam = req.query.date as string;
    const queryDate = dateParam ? new Date(dateParam) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const startOfDay = new Date(queryDate);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await AttendanceRecord.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const [allStudents, allTeachers] = await Promise.all([
      Student.find({ status: 'Active' }),
      Teacher.find({ status: 'Active' })
    ]);

    const roster: any[] = [];

    for (const s of allStudents) {
      const match = records.find(r => r.targetId.toString() === s._id.toString() && r.targetModel === 'Student');
      roster.push({
        id: s.studentId,
        name: s.name,
        type: 'student',
        section: s.section,
        status: match ? match.status : 'present'
      });
    }

    for (const t of allTeachers) {
      const match = records.find(r => r.targetId.toString() === t._id.toString() && r.targetModel === 'Teacher');
      roster.push({
        id: t.id,
        name: t.name,
        type: 'faculty',
        status: match ? match.status : 'present'
      });
    }

    res.json({ status: 'success', data: roster });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch attendance.' });
  }
});

// POST /api/accountant/attendance
router.post('/attendance', ...attendanceGuard, async (req: Request, res: Response) => {
  try {
    const { date, records } = req.body;
    if (date !== undefined && !isNonEmptyString(date, 40)) {
      return res.status(400).json({ status: 'error', message: 'date is too long or invalid.' });
    }
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ status: 'error', message: 'records array is required.' });
    }
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(12, 0, 0, 0); // avoid timezone issues

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    const touchedStudentIds = new Set<string>();

    for (const rec of records) {
      if (!rec || !['student', 'faculty'].includes(rec.type) || !isNonEmptyString(rec.id, 80) || !['present', 'absent', 'late', 'leave'].includes(rec.status)) {
        continue;
      }
      let targetDoc: any = null;
      if (rec.type === 'student') {
        targetDoc = await Student.findOne({ studentId: rec.id });
      } else {
        targetDoc = await Teacher.findOne({ id: rec.id });
      }

      if (!targetDoc) continue;

      // Upsert record for that target on that day
      await AttendanceRecord.findOneAndUpdate(
        {
          targetId: targetDoc._id,
          targetModel: rec.type === 'student' ? 'Student' : 'Teacher',
          date: { $gte: startOfDay, $lte: endOfDay }
        },
        {
          $set: {
            status: rec.status,
            date: targetDate
          }
        },
          { upsert: true, new: true }
      );

      if (rec.type === 'student') {
        touchedStudentIds.add(String(targetDoc._id));
      }
    }

    for (const studentId of touchedStudentIds) {
      emitToStudent(studentId, 'attendance:updated', {
        type: 'attendance:updated',
        studentId,
        date: targetDate.toISOString()
      });
    }
    emitToRole('admin1', 'attendance:updated', {
      type: 'attendance:updated',
      date: targetDate.toISOString()
    });

    res.json({ status: 'success', message: 'Attendance records saved successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to save attendance.' });
  }
});

export default router;
