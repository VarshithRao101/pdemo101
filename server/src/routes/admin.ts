import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateJWT, AuthRequest } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import { Student } from '../models/student';
import { User } from '../models/user';
import { AcademicFeeSettings } from '../models/feeSettings';
import { emitToRole } from '../realtime';

const router = Router();

// Only admin1 and admin2 are authorized to run admin tasks
const adminGuard = [authenticateJWT, authorizeRoles('admin1', 'admin2')];

const isNonEmptyString = (value: unknown, maxLength: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

const parseOptionalNonNegativeNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
};

// POST /api/admin/students
// Registers a new student and automatically provisions a student User credential account.
router.post('/students', ...adminGuard, async (req: Request, res: Response) => {
  const fields = req.body;

  if (
    !isNonEmptyString(fields.name, 120) ||
    !isNonEmptyString(fields.rollNumber, 40) ||
    !isNonEmptyString(fields.admissionNumber, 40) ||
    !isNonEmptyString(fields.studentId, 40) ||
    !isNonEmptyString(fields.qrId, 40) ||
    !isNonEmptyString(fields.registrationNumber, 40) ||
    !isNonEmptyString(fields.course, 40) ||
    !isNonEmptyString(fields.section, 40) ||
    !isNonEmptyString(fields.branch, 40)
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing or invalid required student details.',
    });
  }

  try {
    // 1. Check duplicate rollNumber or studentId or admissionNumber
    const existing = await Student.findOne({
      $or: [
        { rollNumber: fields.rollNumber },
        { studentId: fields.studentId },
        { admissionNumber: fields.admissionNumber }
      ]
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'A student with this Roll Number, ID, or Admission Number already exists.',
      });
    }

    // 2. Set default fee structures if not provided by form
    const isResident = fields.hostelStatus === 'Resident';
    const isBus = fields.transportStatus === 'College Bus';

    const tuitionFee = parseOptionalNonNegativeNumber(fields.tuitionFee);
    const hostelFee = parseOptionalNonNegativeNumber(fields.hostelFee);
    const transportFee = parseOptionalNonNegativeNumber(fields.transportFee);
    const miscellaneousFee = parseOptionalNonNegativeNumber(fields.miscellaneousFee);
    const previousPending = parseOptionalNonNegativeNumber(fields.previousPending);
    const totalPaid = parseOptionalNonNegativeNumber(fields.totalPaid);

    if ([tuitionFee, hostelFee, transportFee, miscellaneousFee, previousPending, totalPaid].some(value => value === null)) {
      return res.status(400).json({
        status: 'error',
        message: 'Fee fields must be non-negative numbers.',
      });
    }

    const resolvedTuition = tuitionFee === undefined ? 120000 : (tuitionFee as number);
    const resolvedHostel = hostelFee === undefined ? (isResident ? 85000 : 0) : (hostelFee as number);
    const resolvedTransport = transportFee === undefined ? (isBus ? 15000 : 0) : (transportFee as number);
    const resolvedMisc = miscellaneousFee === undefined ? 5000 : (miscellaneousFee as number);
    const resolvedPending = previousPending === undefined ? 0 : (previousPending as number);
    const resolvedPaid = totalPaid === undefined ? 0 : (totalPaid as number);

    const remainingBalance = (resolvedTuition + resolvedHostel + resolvedTransport + resolvedMisc + resolvedPending) - resolvedPaid;

    const studentData = {
      ...fields,
      tuitionFee: resolvedTuition,
      hostelFee: resolvedHostel,
      transportFee: resolvedTransport,
      miscellaneousFee: resolvedMisc,
      previousPending: resolvedPending,
      totalPaid: resolvedPaid,
      remainingBalance
    };

    const student = await Student.create(studentData);

    // 3. Auto-provision credentials (shared demo PIN)
    const pinVal = '111111';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pinVal, salt);

    await User.create({
      username: student.rollNumber.toLowerCase().trim(),
      passwordHash,
      role: 'student',
      profileId: student._id,
      profileModel: 'Student'
    });

    console.log(`[PROVISION] Auto-created login for student "${student.name}" | Roll: ${student.rollNumber} | PIN: ${pinVal}`);

    emitToRole('accountant', 'student:created', {
      type: 'student:created',
      studentId: String(student._id)
    });
    emitToRole('admin1', 'student:created', {
      type: 'student:created',
      studentId: String(student._id)
    });

    res.status(201).json({
      status: 'success',
      data: student,
      credential: {
        pin: pinVal,
        username: student.rollNumber.toLowerCase().trim()
      }
    });

  } catch (error: any) {
    console.error('Error during student registration:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to register student and provision credentials.',
    });
  }
});

// ─── ACADEMIC FEE SETTINGS — ADMIN2 ONLY ───
// These routes are intentionally guarded ONLY for admin2.
// admin1 (Campus Ops) cannot read or write fee configuration.
// Any request from admin1 with a valid JWT will receive 403 Forbidden.

const admin2Guard = [authenticateJWT, authorizeRoles('admin2')];

// GET /api/admin/fee-settings
// Returns the current AcademicFeeSettings document (creates default if none exists).
router.get('/fee-settings', ...admin2Guard, async (_req: Request, res: Response) => {
  try {
    let settings = await AcademicFeeSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await AcademicFeeSettings.create({});
    }
    res.json({ status: 'success', data: settings });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch fee settings.' });
  }
});

// PUT /api/admin/fee-settings
// Saves (or upserts) the AcademicFeeSettings document. Lock state is honoured — once isLocked=true,
// subsequent PUT requests are rejected with 423 Locked unless isLocked is explicitly set back to false.
router.put('/fee-settings', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const existing = await AcademicFeeSettings.findOne().sort({ createdAt: -1 });
    if (existing && existing.isLocked) {
      return res.status(423).json({
        status: 'error',
        message: 'Fee settings are locked for this academic year and cannot be modified.',
      });
    }

    const numericFields = ['tuition', 'hostel', 'transport', 'misc'] as const;
    for (const field of numericFields) {
      const value = req.body[field];
      if (value !== undefined && (typeof value !== 'number' || Number.isNaN(value) || value < 0)) {
        return res.status(400).json({
          status: 'error',
          message: `${field} must be a non-negative number.`,
        });
      }
    }

    const textFields = ['academicYear', 'installments', 'lateFeeRules', 'scholarshipRules', 'discountRules'] as const;
    for (const field of textFields) {
      const value = req.body[field];
      if (value !== undefined && (!isNonEmptyString(value, 120))) {
        return res.status(400).json({
          status: 'error',
          message: `${field} is missing or too long.`,
        });
      }
    }

    const updated = await AcademicFeeSettings.findOneAndUpdate(
      {},
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ status: 'success', data: updated });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to save fee settings.' });
  }
});

export default router;
