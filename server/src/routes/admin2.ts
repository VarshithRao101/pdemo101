import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateJWT, AuthRequest } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import { Student } from '../models/student';
import { Teacher } from '../models/teacher';
import { AcademicFeeSettings } from '../models/feeSettings';
import { Expenditure } from '../models/expenditure';
import { WorkerPayment } from '../models/workerPayment';
import { emitToRole, emitToStudent } from '../realtime';

const router = Router();

// Protect all routes in this file with JWT verification and admin2 role check
const admin2Guard = [authenticateJWT, authorizeRoles('admin2')];

const isNonEmptyString = (value: unknown, maxLength: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

// Helper to parse scholarship waiver percentage dynamically from string config
const getScholarshipPct = (rulesStr: string, category: string): number => {
  if (!category || category === 'None') return 0;
  const regex = new RegExp(`${category}:\\s*(\\d+)%`, 'i');
  const match = rulesStr.match(regex);
  return match ? parseInt(match[1]) : 0;
};

// ─── 1. FEE SETTINGS ROUTE (GET/PATCH) ───

// GET /api/admin2/fee-settings
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

// PATCH /api/admin2/fee-settings
router.patch('/fee-settings', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const existing = await AcademicFeeSettings.findOne().sort({ createdAt: -1 });
    
    // Check lock state
    if (existing && existing.isLocked) {
      // If the request tries to unlock by explicitly setting isLocked to false, we allow it
      // but warn about it (logged on server). If it does NOT set isLocked: false, we block.
      if (req.body.isLocked === false) {
        console.warn('[ADMIN2 WARNING] Reverting locked baseline rates back to unlocked state for demo purposes.');
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'Baseline rates are locked for this academic year and cannot be modified.'
        });
      }
    }

    const numericFields = ['tuition', 'hostel', 'transport', 'misc'] as const;
    for (const field of numericFields) {
      const value = req.body[field];
      if (value !== undefined && (typeof value !== 'number' || Number.isNaN(value) || value < 0)) {
        return res.status(400).json({ status: 'error', message: `${field} must be a non-negative number.` });
      }
    }

    const textFields = ['academicYear', 'installments', 'lateFeeRules', 'scholarshipRules', 'discountRules'] as const;
    for (const field of textFields) {
      const value = req.body[field];
      if (value !== undefined && !isNonEmptyString(value, 120)) {
        return res.status(400).json({ status: 'error', message: `${field} is missing or too long.` });
      }
    }

    let settings = await AcademicFeeSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await AcademicFeeSettings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }

    // Propagate the updated baseline fees to the entire students database
    const newTuition = settings.tuition;
    const newHostel = settings.hostel;
    const newTransport = settings.transport;
    const newMisc = settings.misc;

    const studentsList = await Student.find({});
    for (const student of studentsList) {
      student.tuitionFee = newTuition;
      student.hostelFee = student.hostelStatus === 'Resident' ? newHostel : 0;
      student.transportFee = student.transportStatus === 'College Bus' ? newTransport : 0;
      student.miscellaneousFee = newMisc;

      // Recompute remainingBalance based on complete order of operations
      const baseFee = student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending;
      const pct = getScholarshipPct(settings.scholarshipRules || '', student.scholarshipCategory || 'None');
      const policyDeduction = Math.round(student.tuitionFee * (pct / 100));
      const totalOverride = (student.tuitionWaiver || 0) + (student.hostelWaiver || 0) + (student.transportWaiver || 0) + (student.miscWaiver || 0);

      let remaining = baseFee - policyDeduction - totalOverride - student.totalPaid;
      if (remaining < 0) remaining = 0;

      student.remainingBalance = remaining;
      await student.save();

      emitToStudent(String(student._id), 'fee:updated', {
        type: 'fee:updated',
        studentId: String(student._id)
      });
    }

    emitToRole('accountant', 'fee-settings:updated', {
      type: 'fee-settings:updated'
    });

    res.json({ status: 'success', data: settings });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update fee settings.' });
  }
});

// ─── 2. STUDENT FEE OVERRIDES & BREAKDOWNS ───

// PATCH /api/admin2/students/:id/fee-override
router.patch('/students/:id/fee-override', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tuitionWaiver, hostelWaiver, transportWaiver, miscWaiver } = req.body;

    const waiverValues = [tuitionWaiver, hostelWaiver, transportWaiver, miscWaiver];
    for (const waiver of waiverValues) {
      if (waiver !== undefined) {
        const parsed = Number(waiver);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return res.status(400).json({ status: 'error', message: 'Waiver values must be non-negative numbers.' });
        }
      }
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    // Apply individual waiver updates if supplied in request
    if (tuitionWaiver !== undefined) student.tuitionWaiver = Number(tuitionWaiver);
    if (hostelWaiver !== undefined) student.hostelWaiver = Number(hostelWaiver);
    if (transportWaiver !== undefined) student.transportWaiver = Number(transportWaiver);
    if (miscWaiver !== undefined) student.miscWaiver = Number(miscWaiver);

    // Recompute remainingBalance based on complete order of operations:
    // 1. Base Fee
    const baseFee = student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending;

    // 2. Global Policy Slab (Scholarships)
    const settings = await AcademicFeeSettings.findOne().sort({ createdAt: -1 }) || { scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver' };
    const pct = getScholarshipPct((settings as any).scholarshipRules || '', student.scholarshipCategory || 'None');
    const policyDeduction = Math.round(student.tuitionFee * (pct / 100));

    // 3. Individual Overrides (Waivers)
    const totalOverride = (student.tuitionWaiver || 0) + (student.hostelWaiver || 0) + (student.transportWaiver || 0) + (student.miscWaiver || 0);

    // 4. Remaining Balance = Base Fee - Policy Deduction - Overrides - Total Paid
    let remaining = baseFee - policyDeduction - totalOverride - student.totalPaid;
    if (remaining < 0) remaining = 0;

    student.remainingBalance = remaining;
    await student.save();

    emitToStudent(String(student._id), 'fee:updated', {
      type: 'fee:updated',
      studentId: String(student._id)
    });

    res.json({
      status: 'success',
      message: 'Student fee overrides updated and remaining balance recomputed successfully.',
      data: student
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update student fee overrides.' });
  }
});

// GET /api/admin2/students/:id/fee-breakdown
router.get('/students/:id/fee-breakdown', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    const baseFee = student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending;

    const settings = await AcademicFeeSettings.findOne().sort({ createdAt: -1 }) || { scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver' };
    const pct = getScholarshipPct((settings as any).scholarshipRules || '', student.scholarshipCategory || 'None');
    const policyDeduction = Math.round(student.tuitionFee * (pct / 100));

    const totalOverride = (student.tuitionWaiver || 0) + (student.hostelWaiver || 0) + (student.transportWaiver || 0) + (student.miscWaiver || 0);

    res.json({
      status: 'success',
      data: {
        baseFee,
        tuitionFee: student.tuitionFee,
        hostelFee: student.hostelFee,
        transportFee: student.transportFee,
        miscFee: student.miscellaneousFee,
        previousPending: student.previousPending,
        scholarshipCategory: student.scholarshipCategory || 'None',
        scholarshipPct: pct,
        scholarshipDeduction: policyDeduction,
        individualOverrideDeduction: totalOverride,
        tuitionWaiver: student.tuitionWaiver || 0,
        hostelWaiver: student.hostelWaiver || 0,
        transportWaiver: student.transportWaiver || 0,
        miscWaiver: student.miscWaiver || 0,
        totalPaid: student.totalPaid,
        remainingBalance: student.remainingBalance
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve fee breakdown.' });
  }
});

// ─── 3. EXPENDITURE CRUD ───

// GET /api/admin2/expenditure
router.get('/expenditure', ...admin2Guard, async (_req: Request, res: Response) => {
  try {
    const list = await Expenditure.find().sort({ date: -1 });
    res.json({ status: 'success', data: list });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch expenditures.' });
  }
});

// POST /api/admin2/expenditure
router.post('/expenditure', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { category, amount, description, date } = req.body;

    if (!isNonEmptyString(category, 80) || !isNonEmptyString(description, 400)) {
      return res.status(400).json({ status: 'error', message: 'category and description are required.' });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ status: 'error', message: 'amount must be a non-negative number.' });
    }

    const exp = await Expenditure.create({
      category,
      amount: parsedAmount,
      description,
      date: date ? new Date(date) : new Date(),
      recordedBy: authReq.user?.id as any
    });

    res.status(201).json({ status: 'success', data: exp });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to log expenditure.' });
  }
});

// PATCH /api/admin2/expenditure/:id
router.patch('/expenditure/:id', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.amount !== undefined) {
      const parsedAmount = Number(updateData.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ status: 'error', message: 'amount must be a non-negative number.' });
      }
      updateData.amount = parsedAmount;
    }
    if (updateData.category !== undefined && !isNonEmptyString(updateData.category, 80)) {
      return res.status(400).json({ status: 'error', message: 'category is missing or too long.' });
    }
    if (updateData.description !== undefined && !isNonEmptyString(updateData.description, 400)) {
      return res.status(400).json({ status: 'error', message: 'description is missing or too long.' });
    }
    const exp = await Expenditure.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    if (!exp) {
      return res.status(404).json({ status: 'error', message: 'Expenditure entry not found.' });
    }
    res.json({ status: 'success', data: exp });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update expenditure.' });
  }
});

// DELETE /api/admin2/expenditure/:id
router.delete('/expenditure/:id', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exp = await Expenditure.findByIdAndDelete(id);
    if (!exp) {
      return res.status(404).json({ status: 'error', message: 'Expenditure entry not found.' });
    }
    res.json({ status: 'success', message: 'Expenditure entry deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to delete expenditure.' });
  }
});

// ─── 4. WORKER PAYMENTS CRUD ───

// GET /api/admin2/worker-payments
router.get('/worker-payments', ...admin2Guard, async (_req: Request, res: Response) => {
  try {
    const list = await WorkerPayment.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: list });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch worker payments.' });
  }
});

// POST /api/admin2/worker-payments
router.post('/worker-payments', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const { workerName, role, amount, monthPeriod, paid } = req.body;
    if (!isNonEmptyString(workerName, 120) || !isNonEmptyString(role, 120) || !isNonEmptyString(monthPeriod, 40)) {
      return res.status(400).json({ status: 'error', message: 'workerName, role, and monthPeriod are required.' });
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ status: 'error', message: 'amount must be a non-negative number.' });
    }
    const payment = await WorkerPayment.create({
      workerName,
      role,
      amount: parsedAmount,
      monthPeriod,
      paid: paid || false
    });
    res.status(201).json({ status: 'success', data: payment });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to log worker payment.' });
  }
});

// PATCH /api/admin2/worker-payments/:id
router.patch('/worker-payments/:id', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.amount !== undefined) {
      const parsedAmount = Number(updateData.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ status: 'error', message: 'amount must be a non-negative number.' });
      }
      updateData.amount = parsedAmount;
    }
    if (updateData.workerName !== undefined && !isNonEmptyString(updateData.workerName, 120)) {
      return res.status(400).json({ status: 'error', message: 'workerName is missing or too long.' });
    }
    if (updateData.role !== undefined && !isNonEmptyString(updateData.role, 120)) {
      return res.status(400).json({ status: 'error', message: 'role is missing or too long.' });
    }
    if (updateData.monthPeriod !== undefined && !isNonEmptyString(updateData.monthPeriod, 40)) {
      return res.status(400).json({ status: 'error', message: 'monthPeriod is missing or too long.' });
    }
    const payment = await WorkerPayment.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Worker payment entry not found.' });
    }
    res.json({ status: 'success', data: payment });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update worker payment.' });
  }
});

// DELETE /api/admin2/worker-payments/:id
router.delete('/worker-payments/:id', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await WorkerPayment.findByIdAndDelete(id);
    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Worker payment entry not found.' });
    }
    res.json({ status: 'success', message: 'Worker payment entry deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to delete worker payment.' });
  }
});

// ─── 5. STAFF SALARY STATUS (TEACHERS) ───

// GET /api/admin2/staff-salaries
router.get('/staff-salaries', ...admin2Guard, async (_req: Request, res: Response) => {
  try {
    const list = await Teacher.find({}, 'id name subject salary salaryStatus salaryPaymentDate status');
    res.json({ status: 'success', data: list });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch staff salaries.' });
  }
});

// PATCH /api/admin2/staff-salaries/:teacherId
router.patch('/staff-salaries/:teacherId', ...admin2Guard, async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    // Note: teacherId can be MongoDB ObjectId or custom id FAC-xxx
    let teacher = null;
    if (mongoose.Types.ObjectId.isValid(teacherId)) {
      teacher = await Teacher.findById(teacherId);
    }
    if (!teacher) {
      teacher = await Teacher.findOne({ id: String(teacherId).trim() });
    }

    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher not found.' });
    }

    // Toggle paid status
    const currentStatus = teacher.salaryStatus || 'pending';
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    teacher.salaryStatus = nextStatus;

    if (nextStatus === 'paid') {
      teacher.salaryPaymentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } else {
      teacher.salaryPaymentDate = '';
    }

    await teacher.save();

    res.json({ status: 'success', message: 'Staff salary status updated.', data: teacher });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update staff salary status.' });
  }
});

// ─── 6. YEARLY ENROLLMENT STATS (AGGREGATION) ───

// GET /api/admin2/enrollment-stats
router.get('/enrollment-stats', ...admin2Guard, async (_req: Request, res: Response) => {
  try {
    // Aggregation that counts students by stream grouped by creation year
    const rawStats = await Student.aggregate([
      {
        $group: {
          _id: {
            year: {
              // Fallback to current year if createdAt doesn't exist
              $cond: {
                if: { $gt: ['$createdAt', null] },
                then: { $year: '$createdAt' },
                else: 2026
              }
            },
            course: '$course'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.year',
          streams: {
            $push: {
              course: '$_id.course',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map raw stats to a clean format: [{ academicYear, mpc, bipc, cec, total }]
    const formattedStats = rawStats.map(stat => {
      const yearStart = stat._id;
      const academicYear = `${yearStart}-${String(yearStart + 1).slice(2)}`;
      
      let mpc = 0;
      let bipc = 0;
      let cec = 0;

      stat.streams.forEach((s: any) => {
        const c = String(s.course).toUpperCase();
        if (c === 'MPC') mpc = s.count;
        else if (c === 'BIPC') bipc = s.count;
        else if (c === 'CEC') cec = s.count;
      });

      return {
        academicYear,
        mpc,
        bipc,
        cec,
        total: stat.total
      };
    });

    res.json({ status: 'success', data: formattedStats });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to calculate enrollment stats.' });
  }
});

// ─── 7. LATE FEES & SCHOLARSHIPS (READ ONLY REDUNDANCY RESOLUTION) ───

// GET /api/admin2/late-fees-settings
router.get('/late-fees-settings', ...admin2Guard, async (_req: Request, res: Response) => {
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

// GET /api/admin2/scholarships
router.get('/scholarships', ...admin2Guard, async (_req: Request, res: Response) => {
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

export default router;
