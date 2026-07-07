import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateJWT, AuthRequest } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import { Student } from '../models/student';
import { AttendanceRecord } from '../models/attendance';
import { ExamResult } from '../models/examResult';
import { FeePayment } from '../models/payment';
import { TimetableEntry } from '../models/timetable';
import { Bulletin } from '../models/bulletin';

const router = Router();

// All student routes require a valid JWT with role student
const studentGuard = [authenticateJWT, authorizeRoles('student')];

// ---------------------------------------------------------------------------
// Helper: resolve the student ObjectId from the JWT payload.
// SECURITY: identity is ALWAYS derived from req.user — never from URL params.
// ---------------------------------------------------------------------------
const resolveStudentId = (req: Request): mongoose.Types.ObjectId | null => {
  const authReq = req as AuthRequest;
  const pid = authReq.user?.profileId;
  if (!pid) return null;
  try {
    return new mongoose.Types.ObjectId(pid);
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// GET /api/student/me/profile
// Returns the full student document for the logged-in user.
// ---------------------------------------------------------------------------
router.get('/me/profile', ...studentGuard, async (req: Request, res: Response) => {
  const studentId = resolveStudentId(req);
  if (!studentId) {
    return res.status(403).json({ status: 'error', message: 'No student profile linked to this account.' });
  }

  try {
    const student = await Student.findById(studentId).select('-__v');
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student profile not found.' });
    }
    res.json({ status: 'success', data: student });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch profile.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/student/me/academics
// Returns: attendance records summary + exam results for this student.
// ---------------------------------------------------------------------------
router.get('/me/academics', ...studentGuard, async (req: Request, res: Response) => {
  const studentId = resolveStudentId(req);
  if (!studentId) {
    return res.status(403).json({ status: 'error', message: 'No student profile linked to this account.' });
  }

  try {
    const [attendanceRecords, examResults] = await Promise.all([
      AttendanceRecord.find({ targetId: studentId, targetModel: 'Student' }).sort({ date: -1 }),
      ExamResult.find({ student: studentId }).sort({ date: -1 }),
    ]);

    // Compute overall attendance percentage
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

    // Group exam results by testTitle for the marks tab
    const byTestTitle: Record<string, { subject: string; score: number; maxMarks: number; date: string }[]> = {};
    for (const r of examResults) {
      if (!byTestTitle[r.testTitle]) byTestTitle[r.testTitle] = [];
      byTestTitle[r.testTitle].push({ subject: r.subject, score: r.score, maxMarks: r.maxMarks, date: r.date });
    }

    res.json({
      status: 'success',
      data: {
        attendance: {
          records: attendanceRecords,
          total,
          present,
          attendancePct,
        },
        examResults,
        byTestTitle,
      },
    });
  } catch (err) {
    console.error('Academics fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch academic data.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/student/me/fees
// Returns: FeePayment history + remainingBalance from Student doc.
// ---------------------------------------------------------------------------
router.get('/me/fees', ...studentGuard, async (req: Request, res: Response) => {
  const studentId = resolveStudentId(req);
  if (!studentId) {
    return res.status(403).json({ status: 'error', message: 'No student profile linked to this account.' });
  }

  try {
    const [student, payments] = await Promise.all([
      Student.findById(studentId).select('name tuitionFee hostelFee transportFee miscellaneousFee totalPaid remainingBalance previousPending'),
      FeePayment.find({ student: studentId }).sort({ date: -1 }),
    ]);

    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    const totalFee = student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee;

    res.json({
      status: 'success',
      data: {
        totalFee,
        totalPaid: student.totalPaid,
        remainingBalance: student.remainingBalance,
        previousPending: student.previousPending,
        breakdown: {
          tuitionFee: student.tuitionFee,
          hostelFee: student.hostelFee,
          transportFee: student.transportFee,
          miscellaneousFee: student.miscellaneousFee,
        },
        payments,
      },
    });
  } catch (err) {
    console.error('Fees fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch fee data.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/student/me/timetable
// Returns: TimetableEntry[] for this student's section (resolved from profile).
// ---------------------------------------------------------------------------
router.get('/me/timetable', ...studentGuard, async (req: Request, res: Response) => {
  const studentId = resolveStudentId(req);
  if (!studentId) {
    return res.status(403).json({ status: 'error', message: 'No student profile linked to this account.' });
  }

  try {
    const student = await Student.findById(studentId).select('section');
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    const entries = await TimetableEntry.find({ section: student.section })
      .populate('teacher', 'name id subject')
      .sort({ day: 1, period: 1 });

    res.json({ status: 'success', data: entries });
  } catch (err) {
    console.error('Timetable fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch timetable.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bulletins
// Public to authenticated users. Returns all bulletins sorted newest first.
// Accessible by student, admin, accountant.
// ---------------------------------------------------------------------------
router.get('/bulletins', authenticateJWT, async (_req: Request, res: Response) => {
  try {
    const bulletins = await Bulletin.find({}).sort({ createdAt: -1 }).select('-__v');
    res.json({ status: 'success', data: bulletins });
  } catch (err) {
    console.error('Bulletins fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch bulletins.' });
  }
});

export default router;
