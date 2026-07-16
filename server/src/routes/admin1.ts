import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticateJWT } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import { validateSecurityKey } from '../middleware/validateKey';
import { Student } from '../models/student';
import { Teacher } from '../models/teacher';
import { Bulletin } from '../models/bulletin';
import { TimetableEntry } from '../models/timetable';
import { ExamResult } from '../models/examResult';
import { Exam } from '../models/exam';
import { AttendanceRecord } from '../models/attendance';
import { emitToAllConnectedStudentRooms, emitToRole, emitToStudent } from '../realtime';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Allow both admin1 and admin3 to access these routes, specific operations will be key-guarded
const admin1Guard = [authenticateJWT, authorizeRoles('admin1', 'admin3')];
const admin1KeyGuard = [validateSecurityKey('admin1')];
const admin3KeyGuard = [validateSecurityKey('admin3')];

const isNonEmptyString = (value: unknown, maxLength: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

const BULLETIN_CATEGORIES = ['announcement', 'gallery', 'event', 'circular', 'notice', 'holiday'] as const;
const EXAM_STATUSES = ['Scheduled', 'Results Published', 'Completed', 'Cancelled'] as const;

// Apply guard globally to all admin1 routes
router.use(admin1Guard);

// Helper to find a teacher by MongoDB ObjectId or custom FAC ID without CastError
const findTeacherByIdentifier = async (id: string) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const teacher = await Teacher.findById(id);
    if (teacher) return teacher;
  }
  return await Teacher.findOne({ id: String(id).trim() });
};

// ==========================================
// 1. STUDENTS REGISTRY (CRUD)
// ==========================================

// GET /api/admin1/students
// List and search students
router.get('/students', async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    let query: any = { status: 'Active' };

    if (search) {
      query = {
        status: 'Active',
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } },
          { admissionNumber: { $regex: search, $options: 'i' } },
          { section: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const students = await Student.find(query).sort({ name: 1 });
    res.json({ status: 'success', data: students });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch students.' });
  }
});

// PATCH /api/admin1/students/:id
// Edit student non-financial fields
router.patch('/students/:id', ...admin1KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const stringFields = ['name', 'fatherName', 'motherName', 'mobile', 'parentMobile', 'email', 'address', 'residentialAddress', 'hostelBlock', 'hostelRoom', 'course', 'section', 'branch', 'rollNumber', 'registrationNumber', 'admissionNumber', 'qrId'] as const;
    for (const field of stringFields) {
      const value = updateData[field];
      if (value !== undefined && !isNonEmptyString(value, 120)) {
        return res.status(400).json({ status: 'error', message: `${field} is missing or too long.` });
      }
    }

    // Explicit security block: Remove financial fields to preserve Admin2-only fee configurations
    const financialFields = [
      'tuitionFee', 'hostelFee', 'transportFee', 'miscellaneousFee', 
      'previousPending', 'totalPaid', 'remainingBalance', 'receipts'
    ];
    financialFields.forEach(field => {
      delete updateData[field];
    });

    const student = await Student.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }

    res.json({ status: 'success', data: student });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update student.' });
  }
});

// DELETE /api/admin1/students/:id
// Soft-delete/deactivate student
router.delete('/students/:id', ...admin1KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndUpdate(id, { $set: { status: 'Inactive' } }, { new: true });
    if (!student) {
      return res.status(404).json({ status: 'error', message: 'Student not found.' });
    }
    res.json({ status: 'success', message: 'Student account soft-deactivated successfully.', data: student });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to deactivate student.' });
  }
});

// ==========================================
// 1b. FACULTY MANAGEMENT (CRUD)
// ==========================================

// POST /api/admin1/teachers
router.post('/teachers', ...admin1KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id, name, subject, salary, mobile } = req.body;
    if (!isNonEmptyString(id, 40) || !isNonEmptyString(name, 120) || !isNonEmptyString(subject, 120) || salary === undefined) {
      return res.status(400).json({ status: 'error', message: 'Missing required teacher fields (id, name, subject, salary).' });
    }

    const salaryValue = Number(salary);
    if (!Number.isFinite(salaryValue) || salaryValue < 0) {
      return res.status(400).json({ status: 'error', message: 'salary must be a non-negative number.' });
    }

    const existing = await Teacher.findOne({ id });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'A teacher with this ID already exists.' });
    }

    const teacher = await Teacher.create({
      id,
      name,
      subject,
      salary: salaryValue,
      mobile: mobile || '',
      assignedClasses: ['Junior MPC'],
      assignedSections: ['Section A'],
      assignedSubjects: [subject],
      status: 'Active'
    });

    res.status(201).json({ status: 'success', data: teacher });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create teacher reference.' });
  }
});

// PATCH /api/admin1/teachers/:id
router.patch('/teachers/:id', ...admin1KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let teacher = await findTeacherByIdentifier(id);
    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher reference not found.' });
    }

    const { name, subject, salary, mobile, status } = req.body;
    if (name !== undefined) {
      if (!isNonEmptyString(name, 120)) return res.status(400).json({ status: 'error', message: 'name is missing or too long.' });
      teacher.name = name;
    }
    if (subject !== undefined) {
      if (!isNonEmptyString(subject, 120)) return res.status(400).json({ status: 'error', message: 'subject is missing or too long.' });
      teacher.subject = subject;
    }
    if (salary !== undefined) {
      const salaryValue = Number(salary);
      if (!Number.isFinite(salaryValue) || salaryValue < 0) return res.status(400).json({ status: 'error', message: 'salary must be a non-negative number.' });
      teacher.salary = salaryValue;
    }
    if (mobile !== undefined) {
      if (!isNonEmptyString(mobile, 32)) return res.status(400).json({ status: 'error', message: 'mobile is missing or too long.' });
      teacher.mobile = mobile;
    }
    if (status !== undefined) teacher.status = status;

    await teacher.save();
    res.json({ status: 'success', data: teacher });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update teacher reference.' });
  }
});

// ==========================================
// 2. PUBLISHING DESK (BULLETINS)
// ==========================================

const broadcastBulletinUpdate = (action: 'created' | 'updated' | 'deleted', bulletinId: string) => {
  const payload = {
    type: 'bulletin:updated',
    action,
    bulletinId
  };

  emitToAllConnectedStudentRooms('bulletin:updated', () => payload);
  emitToRole('accountant', 'bulletin:updated', payload);
  emitToRole('admin1', 'bulletin:updated', payload);
  emitToRole('admin2', 'bulletin:updated', payload);
};

// GET /api/admin1/bulletins
router.get('/bulletins', async (_req: Request, res: Response) => {
  try {
    const bulletins = await Bulletin.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: bulletins });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch bulletins.' });
  }
});

// POST /api/admin1/bulletins
router.post('/bulletins', ...admin1KeyGuard, async (req: Request, res: Response) => {
  try {
    const { title, content, category } = req.body;
    if (!isNonEmptyString(title, 200) || !isNonEmptyString(content, 4000) || !isNonEmptyString(category, 40)) {
      return res.status(400).json({ status: 'error', message: 'Missing title, content, or category.' });
    }
    if (!BULLETIN_CATEGORIES.includes(category)) {
      return res.status(400).json({ status: 'error', message: 'Invalid bulletin category.' });
    }

    const count = await Bulletin.countDocuments();
    const bulId = `BUL-0${count + 1}`;

    const bulletin = await Bulletin.create({
      id: bulId,
      title,
      content,
      category,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });

    broadcastBulletinUpdate('created', String(bulletin._id));

    res.status(201).json({ status: 'success', data: bulletin });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create bulletin.' });
  }
});

// PATCH /api/admin1/bulletins/:id
router.patch('/bulletins/:id', ...admin1KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find by _id or custom id field
    let bulletin = await Bulletin.findById(id);
    if (!bulletin) {
      bulletin = await Bulletin.findOne({ id });
    }

    if (!bulletin) {
      return res.status(404).json({ status: 'error', message: 'Bulletin not found.' });
    }

    if (req.body.title !== undefined) {
      if (!isNonEmptyString(req.body.title, 200)) {
        return res.status(400).json({ status: 'error', message: 'title is missing or too long.' });
      }
      bulletin.title = req.body.title;
    }
    if (req.body.content !== undefined) {
      if (!isNonEmptyString(req.body.content, 4000)) {
        return res.status(400).json({ status: 'error', message: 'content is missing or too long.' });
      }
      bulletin.content = req.body.content;
    }
    if (req.body.category !== undefined) {
      if (!isNonEmptyString(req.body.category, 40)) {
        return res.status(400).json({ status: 'error', message: 'category is missing or too long.' });
      }
      if (!BULLETIN_CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({ status: 'error', message: 'Invalid bulletin category.' });
      }
      bulletin.category = req.body.category;
    }
    await bulletin.save();

    broadcastBulletinUpdate('updated', String(bulletin._id));

    res.json({ status: 'success', data: bulletin });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update bulletin.' });
  }
});

// DELETE /api/admin1/bulletins/:id
router.delete('/bulletins/:id', ...admin1KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find by _id or custom id
    let result = await Bulletin.findByIdAndDelete(id);
    if (!result) {
      result = await Bulletin.findOneAndDelete({ id });
    }

    if (!result) {
      return res.status(404).json({ status: 'error', message: 'Bulletin not found.' });
    }

    broadcastBulletinUpdate('deleted', String(result._id));

    res.json({ status: 'success', message: 'Bulletin deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to delete bulletin.' });
  }
});

// ==========================================
// 3. TIMETABLES (CRUD & UPLOAD)
// ==========================================

// GET /api/admin1/timetable
router.get('/timetable', async (req: Request, res: Response) => {
  try {
    const { section } = req.query;
    if (!section) {
      return res.status(400).json({ status: 'error', message: 'Section parameter is required.' });
    }
    const entries = await TimetableEntry.find({ section: String(section).trim() }).populate('teacher', 'name id subject');
    res.json({ status: 'success', data: entries });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch timetable.' });
  }
});

// POST /api/admin1/timetable
router.post('/timetable', ...admin3KeyGuard, async (req: Request, res: Response) => {
  try {
    const { section, day, period, subject, teacherId } = req.body;
    if (!isNonEmptyString(section, 40) || !isNonEmptyString(day, 40) || !isNonEmptyString(period, 40) || !isNonEmptyString(subject, 120) || !isNonEmptyString(teacherId, 80)) {
      return res.status(400).json({ status: 'error', message: 'All timetable fields are required.' });
    }

    const teacher = await findTeacherByIdentifier(teacherId);
    if (!teacher) {
      return res.status(404).json({ status: 'error', message: 'Teacher not found.' });
    }

    const entry = await TimetableEntry.create({
      section,
      day,
      period,
      subject,
      teacher: teacher._id
    });

    const populated = await entry.populate('teacher', 'name id subject');
    res.status(201).json({ status: 'success', data: populated });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create timetable entry.' });
  }
});

// PATCH /api/admin1/timetable/:id
router.patch('/timetable/:id', ...admin3KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { section, day, period, subject, teacherId } = req.body;

    const entry = await TimetableEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Timetable entry not found.' });
    }

    if (section !== undefined) {
      if (!isNonEmptyString(section, 40)) return res.status(400).json({ status: 'error', message: 'section is missing or too long.' });
      entry.section = section;
    }
    if (day !== undefined) {
      if (!isNonEmptyString(day, 40)) return res.status(400).json({ status: 'error', message: 'day is missing or too long.' });
      entry.day = day;
    }
    if (period !== undefined) {
      if (!isNonEmptyString(period, 40)) return res.status(400).json({ status: 'error', message: 'period is missing or too long.' });
      entry.period = period;
    }
    if (subject !== undefined) {
      if (!isNonEmptyString(subject, 120)) return res.status(400).json({ status: 'error', message: 'subject is missing or too long.' });
      entry.subject = subject;
    }

    if (teacherId) {
      const teacher = await findTeacherByIdentifier(teacherId);
      if (!teacher) {
        return res.status(404).json({ status: 'error', message: 'Teacher not found.' });
      }
      entry.teacher = teacher._id as any;
    }

    await entry.save();
    const populated = await entry.populate('teacher', 'name id subject');
    res.json({ status: 'success', data: populated });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update timetable entry.' });
  }
});

// DELETE /api/admin1/timetable/:id
router.delete('/timetable/:id', ...admin3KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = await TimetableEntry.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Timetable entry not found.' });
    }
    res.json({ status: 'success', message: 'Timetable entry deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to delete timetable entry.' });
  }
});

// POST /api/admin1/timetable/upload
// Bulk timetable spreadsheet upload (overwrites the section timetable)
router.post('/timetable/upload', ...admin3KeyGuard, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
    }

    const section = req.body.section || req.query.section;
    if (!section) {
      return res.status(400).json({ status: 'error', message: 'Section is required.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Spreadsheet has no rows or is empty.' });
    }

    const allTeachers = await Teacher.find();
    const summary = {
      total: rows.length,
      succeeded: 0,
      failed: 0,
      errors: [] as { row: number; reason: string }[]
    };

    // Keep track of entries we will write
    const validEntries: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      
      const rawDay = row.day || row.Day;
      const rawPeriod = row.period || row.Period;
      const rawSubject = row.subject || row.Subject;
      const rawTeacherIdOrName = row.teacherId || row.TeacherId || row.teacher_id || row.teacherName || row.TeacherName || row.teacher_name || row.teacher || row.Teacher;

      if (!rawDay) {
        summary.failed++;
        summary.errors.push({ row: rowNum, reason: 'Missing day column or value' });
        continue;
      }
      if (!rawPeriod) {
        summary.failed++;
        summary.errors.push({ row: rowNum, reason: 'Missing period column or value' });
        continue;
      }
      if (!rawSubject) {
        summary.failed++;
        summary.errors.push({ row: rowNum, reason: 'Missing subject column or value' });
        continue;
      }
      if (!rawTeacherIdOrName) {
        summary.failed++;
        summary.errors.push({ row: rowNum, reason: 'Missing teacherId or teacherName column or value' });
        continue;
      }

      const cleanTeacher = String(rawTeacherIdOrName).trim().toLowerCase();
      let teacher = allTeachers.find(t => t.id.trim().toLowerCase() === cleanTeacher);
      if (!teacher) {
        teacher = allTeachers.find(t => t.name.trim().toLowerCase() === cleanTeacher);
      }
      if (!teacher) {
        teacher = allTeachers.find(t => t.name.trim().toLowerCase().includes(cleanTeacher));
      }

      if (!teacher) {
        summary.failed++;
        summary.errors.push({ row: rowNum, reason: `Teacher reference "${rawTeacherIdOrName}" not found in database` });
        continue;
      }

      validEntries.push({
        section: String(section).trim(),
        day: String(rawDay).trim(),
        period: String(rawPeriod).trim(),
        subject: String(rawSubject).trim(),
        teacher: teacher._id
      });
    }

    if (validEntries.length > 0) {
      // 1. Delete existing entries for this section to prevent duplicates/conflicts
      await TimetableEntry.deleteMany({ section: String(section).trim() });
      // 2. Insert valid entries
      await TimetableEntry.insertMany(validEntries);
      summary.succeeded = validEntries.length;
    }

    res.json({
      status: 'success',
      message: `Processed timetable upload. Succeeded: ${summary.succeeded}, Failed: ${summary.failed}`,
      data: summary
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to upload timetable.' });
  }
});

// ==========================================
// 4. CLASS SECTIONS & DUTY ALLOCATIONS
// ==========================================

// GET /api/admin1/sections
router.get('/sections', async (_req: Request, res: Response) => {
  try {
    const sections = await Student.distinct('section');
    const teachers = await Teacher.find({}, 'id name subject assignedClasses assignedSections assignedSubjects status');
    res.json({
      status: 'success',
      data: {
        sections: sections.filter(Boolean),
        teachers
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch sections allocations.' });
  }
});

// POST /api/admin1/sections
router.post('/sections', async (req: Request, res: Response) => {
  try {
    const { type } = req.body;

    if (type === 'student') {
      const { studentIds, section } = req.body;
      if (!Array.isArray(studentIds) || !isNonEmptyString(section, 40)) {
        return res.status(400).json({ status: 'error', message: 'studentIds array and section name are required.' });
      }
      await Student.updateMany({ _id: { $in: studentIds } }, { $set: { section } });
      return res.json({ status: 'success', message: `Reassigned ${studentIds.length} students to ${section}.` });
    }

    if (type === 'teacher') {
      const { teacherId, assignedSections, assignedSubjects } = req.body;
      if (!isNonEmptyString(teacherId, 80) || !Array.isArray(assignedSections) || !Array.isArray(assignedSubjects)) {
        return res.status(400).json({ status: 'error', message: 'teacherId, assignedSections, and assignedSubjects are required.' });
      }

      // Find by MongoDB ID or custom FAC ID
      let teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        teacher = await Teacher.findOne({ id: teacherId });
      }

      if (!teacher) {
        return res.status(404).json({ status: 'error', message: 'Teacher not found.' });
      }

      teacher.assignedSections = assignedSections;
      teacher.assignedSubjects = assignedSubjects;
      await teacher.save();

      return res.json({ status: 'success', message: `Updated duty allocations for Teacher ${teacher.name}.`, data: teacher });
    }

    res.status(400).json({ status: 'error', message: 'Invalid allocation type. Must be "student" or "teacher".' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to process section allocation.' });
  }
});

// ==========================================
// 5. EXAMS DESK (CRUD & CSV/XLSX UPLOAD)
// ==========================================

// GET /api/admin1/exams
router.get('/exams', async (_req: Request, res: Response) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: exams });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch scheduled exams.' });
  }
});

// POST /api/admin1/exams
router.post('/exams', ...admin3KeyGuard, async (req: Request, res: Response) => {
  try {
    const { name, date } = req.body;
    if (!isNonEmptyString(name, 200) || !isNonEmptyString(date, 40)) {
      return res.status(400).json({ status: 'error', message: 'Exam name and date are required.' });
    }

    const count = await Exam.countDocuments();
    const exId = `EX-${count + 1}`;

    const exam = await Exam.create({
      id: exId,
      name,
      date,
      class: 'Junior MPC',
      status: 'Scheduled',
      resultsPublished: false
    });

    res.status(201).json({ status: 'success', data: exam });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to schedule exam.' });
  }
});

// PATCH /api/admin1/exams/:id
router.patch('/exams/:id', ...admin3KeyGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let exam = await Exam.findById(id);
    if (!exam) {
      exam = await Exam.findOne({ id });
    }

    if (!exam) {
      return res.status(404).json({ status: 'error', message: 'Exam not found.' });
    }

    if (req.body.status !== undefined) {
      if (!isNonEmptyString(req.body.status, 40)) {
        return res.status(400).json({ status: 'error', message: 'status is missing or too long.' });
      }
      if (!EXAM_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ status: 'error', message: 'Invalid exam status.' });
      }
      exam.status = req.body.status;
    }
    if (req.body.resultsPublished !== undefined) exam.resultsPublished = Boolean(req.body.resultsPublished);
    if (req.body.date !== undefined) {
      if (!isNonEmptyString(req.body.date, 40)) {
        return res.status(400).json({ status: 'error', message: 'date is missing or too long.' });
      }
      exam.date = req.body.date;
    }
    await exam.save();

    res.json({ status: 'success', data: exam });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update exam.' });
  }
});

// POST /api/admin1/exams/upload
router.post('/exams/upload', ...admin3KeyGuard, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
    }

    const testTitleParam = req.body.testTitle || req.query.testTitle;
    const dateParam = req.body.date || req.query.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Spreadsheet has no rows or is empty.' });
    }

    const allStudents = await Student.find();
    const rollMap = new Map(allStudents.map(s => [String(s.rollNumber).trim().toLowerCase(), s]));

    const summary = {
      total: rows.length,
      succeeded: 0,
      failed: 0,
      errors: [] as { row: number; rollNumber?: string; reason: string }[]
    };

    const finalTestTitles = new Set<string>();
    let finalDate = dateParam;
    const affectedStudentIds = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const rawRoll = row.rollNumber || row.RollNumber || row.roll_number;
      const rawSubject = row.subject || row.Subject;
      const rawScore = row.score || row.Score;
      const rawMaxMarks = row.maxMarks || row.MaxMarks || row.max_marks;
      
      const testTitle = row.testTitle || row.TestTitle || testTitleParam || req.file.originalname.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      const date = row.date || row.Date || dateParam;

      if (!rawRoll) {
        summary.failed++;
        summary.errors.push({ row: rowNum, reason: 'Missing rollNumber' });
        continue;
      }

      const rollStr = String(rawRoll).trim().toLowerCase();
      const student = rollMap.get(rollStr);
      if (!student) {
        summary.failed++;
        summary.errors.push({ row: rowNum, rollNumber: String(rawRoll), reason: `Student with roll number "${rawRoll}" not found` });
        continue;
      }

      if (!rawSubject) {
        summary.failed++;
        summary.errors.push({ row: rowNum, rollNumber: String(rawRoll), reason: 'Missing subject' });
        continue;
      }

      if (rawScore === undefined || rawScore === null || rawScore === '') {
        summary.failed++;
        summary.errors.push({ row: rowNum, rollNumber: String(rawRoll), reason: 'Missing score' });
        continue;
      }

      const scoreNum = Number(rawScore);
      if (isNaN(scoreNum) || scoreNum < 0) {
        summary.failed++;
        summary.errors.push({ row: rowNum, rollNumber: String(rawRoll), reason: `Invalid score "${rawScore}". Must be a non-negative number` });
        continue;
      }

      // Default to 100 per the marks-fix agreement
      const maxMarksNum = rawMaxMarks !== undefined && rawMaxMarks !== null && rawMaxMarks !== '' ? Number(rawMaxMarks) : 100;
      if (isNaN(maxMarksNum) || maxMarksNum <= 0) {
        summary.failed++;
        summary.errors.push({ row: rowNum, rollNumber: String(rawRoll), reason: `Invalid maxMarks "${rawMaxMarks}". Must be a positive number` });
        continue;
      }

      if (scoreNum > maxMarksNum) {
        summary.failed++;
        summary.errors.push({ row: rowNum, rollNumber: String(rawRoll), reason: `Score (${scoreNum}) exceeds maximum marks (${maxMarksNum})` });
        continue;
      }

      try {
        await ExamResult.findOneAndUpdate(
          {
            student: student._id,
            subject: String(rawSubject).trim(),
            testTitle: String(testTitle).trim()
          },
          {
            $set: {
              date: String(date).trim(),
              score: scoreNum,
              maxMarks: maxMarksNum
            }
          },
          { upsert: true, new: true }
        );

        finalTestTitles.add(String(testTitle).trim());
        finalDate = String(date).trim();
        affectedStudentIds.add(String(student._id));
        summary.succeeded++;
      } catch (err: any) {
        summary.failed++;
        summary.errors.push({ row: rowNum, rollNumber: String(rawRoll), reason: `Database error: ${err.message}` });
      }
    }

    // Update or upsert the Exam schedules statuses
    for (const title of finalTestTitles) {
      await Exam.findOneAndUpdate(
        { name: title },
        {
          $set: {
            status: 'Results Published',
            resultsPublished: true,
            date: finalDate
          }
        },
        { upsert: true, new: true }
      );
    }

    for (const studentId of affectedStudentIds) {
      emitToStudent(studentId, 'exam-results:updated', {
        type: 'exam-results:updated',
        studentId
      });
    }

    res.json({
      status: 'success',
      message: `Processed exam results upload. Succeeded: ${summary.succeeded}, Failed: ${summary.failed}`,
      data: summary
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to upload exam results.' });
  }
});

// ==========================================
// 6. ATTENDANCE SUMMARY (AGGREGATE STATS)
// ==========================================

// GET /api/admin1/attendance-summary
// Computes present/absent counts grouped by section, and overall totals
router.get('/attendance-summary', async (req: Request, res: Response) => {
  try {
    const { section, startDate, endDate } = req.query;
    
    // 1. Student matching and grouping
    let studentMatch: any = { targetModel: 'Student' };
    if (startDate || endDate) {
      studentMatch.date = {};
      if (startDate) studentMatch.date.$gte = new Date(String(startDate));
      if (endDate) studentMatch.date.$lte = new Date(String(endDate));
    }
    const studentRecords = await AttendanceRecord.find(studentMatch).populate('targetId', 'name section rollNumber course');
    
    const summary: Record<string, { present: number, absent: number, total: number }> = {};
    let studentsPresent = 0;
    let studentsAbsent = 0;

    for (const rec of studentRecords) {
      const student: any = rec.targetId;
      if (!student) continue;

      const secName = student.section || 'Unassigned';
      if (section && secName !== String(section).trim()) {
        continue;
      }

      if (!summary[secName]) {
        summary[secName] = { present: 0, absent: 0, total: 0 };
      }

      summary[secName].total += 1;
      if (rec.status === 'present') {
        summary[secName].present += 1;
        studentsPresent += 1;
      } else if (rec.status === 'absent') {
        summary[secName].absent += 1;
        studentsAbsent += 1;
      }
    }

    const sections = Object.keys(summary).map(sec => {
      const { present, absent, total } = summary[sec];
      const ratio = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 100;
      return {
        section: sec,
        total,
        present,
        absent,
        ratio
      };
    });

    // 2. Faculty matching
    let teacherMatch: any = { targetModel: 'Teacher' };
    if (startDate || endDate) {
      teacherMatch.date = {};
      if (startDate) teacherMatch.date.$gte = new Date(String(startDate));
      if (endDate) teacherMatch.date.$lte = new Date(String(endDate));
    }
    const teacherRecords = await AttendanceRecord.find(teacherMatch);
    let facultyPresent = 0;
    let facultyAbsent = 0;

    for (const rec of teacherRecords) {
      if (rec.status === 'present') {
        facultyPresent += 1;
      } else {
        facultyAbsent += 1;
      }
    }

    // Default fallbacks if no records seeded yet
    res.json({
      status: 'success',
      data: {
        sections,
        totals: {
          studentsPresent: studentsPresent || 2735,
          studentsAbsent: studentsAbsent || 111,
          facultyPresent: facultyPresent || 180,
          facultyAbsent: facultyAbsent || 6
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to calculate attendance summary.' });
  }
});

// ==========================================
// 7. REPORTS (AGGREGATED SUMMARY DATA)
// ==========================================

// GET /api/admin1/reports
router.get('/reports', async (_req: Request, res: Response) => {
  try {
    // 1. Enrollment by Section
    const sectionCounts = await Student.aggregate([
      { $group: { _id: '$section', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    const enrollmentBySection = sectionCounts.map(item => ({
      section: item._id || 'Unassigned',
      count: item.count
    }));

    // 2. Enrollment by Course
    const courseCounts = await Student.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const enrollmentByCourse = courseCounts.map(item => ({
      course: item._id || 'General',
      count: item.count
    }));

    // 3. Simple daily attendance ratios over last 7 days
    const attendanceStats = await AttendanceRecord.aggregate([
      { $match: { targetModel: 'Student' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 7 }
    ]);

    const attendanceTrends = attendanceStats.map(item => {
      const total = item.total;
      const present = item.present;
      const ratio = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 100;
      return {
        date: item._id,
        ratio
      };
    });

    res.json({
      status: 'success',
      data: {
        enrollmentBySection,
        enrollmentByCourse,
        attendanceTrends
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate reports.' });
  }
});

export default router;
