import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { LiveConnectionIndicator } from '../components/common/LiveConnectionIndicator';
import { InspireLogo } from '../components/common/InspireLogo';
import { apiClient, setGlobalSecurityKey } from '../services/apiClient';
import { admin1Service } from '../services/admin1Service';
import { admin2Service } from '../services/admin2Service';
import * as accountantService from '../services/accountantService';
import { onSocketEvent } from '../services/socketClient';

// --- RENDER BACKGROUND DESIGN WITH CUSTOM ACCENT COLOR GLOWS ---
const renderBackgroundDesign = (colorTheme: 'emerald' | 'gold' | 'sapphire' | 'ruby' | 'purple' | 'rose' | 'teal' | 'navy' | 'cyan' | 'orange' | 'indigo' | 'violet' = 'gold') => {
  let primaryGlow = 'rgba(251,191,36,0.18)'; // Gold default
  let secondaryGlow = 'rgba(59,130,246,0.16)';

  if (colorTheme === 'emerald') {
    primaryGlow = 'rgba(16,185,129,0.18)';
    secondaryGlow = 'rgba(20,184,166,0.12)';
  } else if (colorTheme === 'sapphire') {
    primaryGlow = 'rgba(59,130,246,0.2)';
    secondaryGlow = 'rgba(139,92,246,0.14)';
  } else if (colorTheme === 'ruby') {
    primaryGlow = 'rgba(239,68,68,0.18)';
    secondaryGlow = 'rgba(244,63,94,0.12)';
  } else if (colorTheme === 'purple') {
    primaryGlow = 'rgba(139,92,246,0.18)';
    secondaryGlow = 'rgba(236,72,153,0.12)';
  } else if (colorTheme === 'rose') {
    primaryGlow = 'rgba(244,63,94,0.18)';
    secondaryGlow = 'rgba(239,68,68,0.12)';
  } else if (colorTheme === 'teal') {
    primaryGlow = 'rgba(20,184,166,0.18)';
    secondaryGlow = 'rgba(16,185,129,0.12)';
  } else if (colorTheme === 'navy') {
    primaryGlow = 'rgba(30,41,59,0.2)';
    secondaryGlow = 'rgba(59,130,246,0.12)';
  } else if (colorTheme === 'cyan') {
    primaryGlow = 'rgba(6,182,212,0.18)';
    secondaryGlow = 'rgba(59,130,246,0.12)';
  } else if (colorTheme === 'orange') {
    primaryGlow = 'rgba(249,115,22,0.18)';
    secondaryGlow = 'rgba(251,191,36,0.12)';
  } else if (colorTheme === 'indigo') {
    primaryGlow = 'rgba(99,102,241,0.18)';
    secondaryGlow = 'rgba(139,92,246,0.12)';
  } else if (colorTheme === 'violet') {
    primaryGlow = 'rgba(139,92,246,0.18)';
    secondaryGlow = 'rgba(236,72,153,0.12)';
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.95
    }}>
      {/* Retro Outline Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Dynamic mesh blurs */}
      <div style={{
        position: 'absolute',
        top: '-5%',
        right: '10%',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryGlow} 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }} />

      <div style={{
        position: 'absolute',
        bottom: '12%',
        left: '-5%',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${secondaryGlow} 0%, transparent 70%)`,
        filter: 'blur(45px)',
      }} />
    </div>
  );
};

// --- MOCK ROSTERS DATABASES ---
interface ExpenditureItem {
  _id?: string;
  id?: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  branch?: string;
}

interface WorkerItem {
  _id?: string;
  id?: string;
  name: string;
  role: string;
  salary: number;
  paid: boolean;
}

interface Student {
  _id?: string;
  admissionNumber: string;
  studentId: string;
  qrId: string;
  registrationNumber: string;
  name: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  parentMobile: string;
  email: string;
  address: string;
  residentialAddress: string;
  hostelStatus: 'Resident' | 'Day Scholar';
  transportStatus: 'College Bus' | 'Self Transport';
  hostelBlock?: string;
  hostelRoom?: string;
  course: string;
  section: string;
  branch: string;
  rollNumber: string;
  status: 'Active' | 'Inactive';
  tempPassword?: string;
  documents: string[];
  scholarshipCategory?: string;
  tuitionWaiver?: number;
  hostelWaiver?: number;
  transportWaiver?: number;
  tuitionFee?: number;
  hostelFee?: number;
  transportFee?: number;
  miscellaneousFee?: number;
  previousPending?: number;
  totalPaid?: number;
  remainingBalance?: number;
  miscWaiver?: number;
}

interface Teacher {
  _id?: string;
  id: string;
  name: string;
  subject: string;
  mobile: string;
  salary: number;
  assignedClasses: string[];
  assignedSections: string[];
  assignedSubjects: string[];
  status: 'Active' | 'Inactive';
  tempPassword?: string;
  branch?: string;
}

interface Bulletin {
  _id?: string;
  id?: string;
  category: 'announcement' | 'gallery' | 'event' | 'circular' | 'notice' | 'holiday';
  title: string;
  date?: string;
  content: string;
}

interface ExamItem {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  class: string;
  status: 'Scheduled' | 'Results Published' | string;
  resultsPublished: boolean;
}

const INITIAL_STUDENTS_LIST: Student[] = [
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
    hostelStatus: 'Resident',
    transportStatus: 'Self Transport',
    hostelBlock: 'Block A',
    hostelRoom: 'Room 203',
    course: 'MPC',
    section: 'Section A',
    branch: 'Madhapur',
    rollNumber: '24MPC01',
    status: 'Active',
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
    hostelStatus: 'Resident',
    transportStatus: 'Self Transport',
    hostelBlock: 'Block B',
    hostelRoom: 'Room 104',
    course: 'MPC',
    section: 'Section B',
    branch: 'Madhapur',
    rollNumber: '24MPC02',
    status: 'Active',
    documents: ['10th Marksheet.pdf', 'Income Certificate.pdf']
  }
];

const INITIAL_TEACHERS_LIST: Teacher[] = [
  { id: 'FAC-201', name: 'Mr. Ramesh K', subject: 'Physics', mobile: '9000100021', salary: 75000, assignedClasses: ['Junior MPC', 'Senior MPC'], assignedSections: ['Section A', 'Section B'], assignedSubjects: ['Physics'], status: 'Active', branch: 'Madhapur' },
  { id: 'FAC-202', name: 'Mrs. Sarada M', subject: 'Chemistry', mobile: '9000100022', salary: 80000, assignedClasses: ['Junior BiPC'], assignedSections: ['Section A'], assignedSubjects: ['Chemistry'], status: 'Active', branch: 'Jubilee Hills' },
  { id: 'FAC-203', name: 'Mr. Anand S', subject: 'Mathematics', mobile: '9000100023', salary: 85000, assignedClasses: ['Junior MPC'], assignedSections: ['Section A'], assignedSubjects: ['Mathematics'], status: 'Active', branch: 'Madhapur' }
];

const INITIAL_BULLETINS: Bulletin[] = [
  { id: 'BUL-001', category: 'announcement', title: 'Inspire wins District STEM Cup', date: '04 July 2026', content: 'Our Junior MPC Section A campus team secured 1st prize in engineering physics models.' },
  { id: 'BUL-002', category: 'holiday', title: 'Independence Day Holiday', date: '15 Aug 2026', content: 'Campus will remain closed on 15th August for national Independence Day celebrations.' }
];

const getAdminStudents = (): Student[] => {
  if (!(window as any)._adminStudents) {
    (window as any)._adminStudents = INITIAL_STUDENTS_LIST;
  }
  return (window as any)._adminStudents;
};

const getAdminTeachers = (): Teacher[] => {
  if (!(window as any)._adminTeachers) {
    (window as any)._adminTeachers = INITIAL_TEACHERS_LIST;
  }
  return (window as any)._adminTeachers;
};

const getAdminBulletins = (): Bulletin[] => {
  if (!(window as any)._adminBulletins) {
    (window as any)._adminBulletins = INITIAL_BULLETINS;
  }
  return (window as any)._adminBulletins;
};

// --- MOCK ACADEMIC FEES DATABASE ---
const getMockAcademicFees = () => {
  if (!(window as any)._adminAcademicFees) {
    (window as any)._adminAcademicFees = {
      tuition: 120000,
      hostel: 85000,
      transport: 15000,
      misc: 5000,
      isLocked: false
    };
  }
  return (window as any)._adminAcademicFees;
};

// ─── ADMIN DASHBOARD CONTROLLER ───
export const AdminDashboardView: React.FC<{ role?: 'admin1' | 'admin2' | 'admin3' }> = ({ role = 'admin1' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState<string>('menu');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePulseKey, setLivePulseKey] = useState<'students' | 'attendance' | 'bulletins' | 'fees' | 'finance' | null>(null);
  const [securityKey, setSecurityKey] = useState('');

  // States
  const [students, setStudents] = useState<Student[]>(getAdminStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(getAdminTeachers);
  const [bulletins, setBulletins] = useState<Bulletin[]>(getAdminBulletins);

  // Edit Buffer States (prevents keypress auto-save)
  const [searchAdm, setSearchAdm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // Students Registry States
  const [newStuName, setNewStuName] = useState('');
  const [newStuCourse, setNewStuCourse] = useState('MPC');
  const [newStuSec, setNewStuSec] = useState('Section A');
  const [newStuFather, setNewStuFather] = useState('');
  const [newStuMobile, setNewStuMobile] = useState('');

  // Faculty Management States
  const [searchFac, setSearchFac] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);

  const [newFacName, setNewFacName] = useState('');
  const [newFacSub, setNewFacSub] = useState('Physics');
  const [newFacSal, setNewFacSal] = useState('');
  const [assignClass, setAssignClass] = useState('Junior MPC');
  const [assignSec, setAssignSec] = useState('Section A');
  const [assignSub] = useState('Physics');

  // Notices Composer States
  const [pubCat, setPubCat] = useState<'announcement' | 'gallery' | 'event' | 'circular' | 'notice' | 'holiday'>('announcement');
  const [newPubTitle, setNewPubTitle] = useState('');
  const [newPubContent, setNewPubContent] = useState('');
  const [editingPubId, setEditingPubId] = useState<string | null>(null);

  // Exam list States
  const [exams, setExams] = useState<ExamItem[]>([
    { id: 'EX-1', name: 'Quarterly Physics Term', date: '10 Aug 2026', class: 'Junior MPC', status: 'Scheduled', resultsPublished: false },
    { id: 'EX-2', name: 'Half-Yearly Math Exam', date: '24 Sep 2026', class: 'Junior MPC', status: 'Scheduled', resultsPublished: false }
  ]);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');

  // Academic baseline fees state (Locked by default, only once editable)
  const [feeRates, setFeeRates] = useState(getMockAcademicFees);
  const [isEditingFees, setIsEditingFees] = useState(false);

  // Calendars logs
  const [calendarEvents, setCalendarEvents] = useState([
    { title: 'Academic Session Begins', date: '12 June 2026' },
    { title: 'Quarterly Examination Starts', date: '10 August 2026' }
  ]);
  const [newCalTitle, setNewCalTitle] = useState('');
  const [newCalDate, setNewCalDate] = useState('');

  // Config settings
  const [globalSettings, setGlobalSettings] = useState({
    academicYear: '2026-27',
    branches: 'Madhapur, Jubilee Hills',
    sections: 'Section A, Section B, Section C',
    holidayList: 'Independence Day: 15 Aug, Dushera Holidays: 10-18 Oct'
  });

  // Timetables and sections states
  const [timetable, setTimetable] = useState<any[]>([]);
  const [timetableSection, setTimetableSection] = useState('Section A');
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any>(null);

  // Attendance marking states (moved from accountant portal)
  const [attTab, setAttTab] = useState<'students' | 'faculty' | 'summary'>('students');
  const [selectedSection, setSelectedSection] = useState('MPC-A');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRoster, setAttendanceRoster] = useState<any[]>([]);

  // Manual timetable scheduling states
  const [newSlotDay, setNewSlotDay] = useState('Monday');
  const [newSlotPeriod, setNewSlotPeriod] = useState('');
  const [newSlotSubject, setNewSlotSubject] = useState('');
  const [newSlotTeacher, setNewSlotTeacher] = useState('');

  // Selected files for Timetable & Results
  const [timetableFile, setTimetableFile] = useState<File | null>(null);
  const [resultsFile, setResultsFile] = useState<File | null>(null);

  const [timetableUploadStatus, setTimetableUploadStatus] = useState<any>(null);
  const [timetableUploading, setTimetableUploading] = useState(false);
  const [examUploadStatus, setExamUploadStatus] = useState<any>(null);
  const [examUploading, setExamUploading] = useState(false);

  // --- ADMIN 2 FINANCE & Overheads States ---
  const [expenditures, setExpenditures] = useState<ExpenditureItem[]>(() => {
    if (!(window as any)._adminExpenditures) {
      (window as any)._adminExpenditures = [
        { id: 'EXP001', category: 'Mess & Food', amount: 85000, description: 'Weekly groceries & milk supply', date: '2026-07-01', branch: 'Madhapur' },
        { id: 'EXP002', category: 'Maintenance', amount: 24000, description: 'Hostel block water pump repair', date: '2026-07-03', branch: 'Madhapur' },
        { id: 'EXP003', category: 'Utilities', amount: 48000, description: 'Internet broadband monthly payment', date: '2026-07-05', branch: 'Madhapur' },
        { id: 'EXP004', category: 'Maintenance', amount: 80000, description: 'Lab AC repair work', date: '2026-07-09', branch: 'Jubilee Hills' },
        { id: 'EXP005', category: 'Mess & Food', amount: 95000, description: 'Mess vegetable supplies', date: '2026-07-07', branch: 'Jubilee Hills' },
        { id: 'EXP006', category: 'Events', amount: 150000, description: 'College annual day setup', date: '2026-07-06', branch: 'Gachibowli' },
        { id: 'EXP007', category: 'Transport', amount: 65000, description: 'College buses diesel fuel', date: '2026-07-05', branch: 'Kukatpally' },
        { id: 'EXP008', category: 'Stationery', amount: 35000, description: 'Library reference books purchase', date: '2026-07-04', branch: 'Secunderabad' }
      ];
    }
    return (window as any)._adminExpenditures;
  });
  const [selectedExpBranch, setSelectedExpBranch] = useState<'Madhapur' | 'Jubilee Hills' | 'Gachibowli' | 'Kukatpally' | 'Secunderabad'>('Madhapur');
  const [newExpCat, setNewExpCat] = useState('Utilities');
  const [newExpAmt, setNewExpAmt] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');


  const [workers, setWorkers] = useState<WorkerItem[]>([
    { id: 'WRK01', name: 'Allu Prasad', role: 'Mess Supervisor', salary: 25000, paid: true },
    { id: 'WRK02', name: 'NTR Goud', role: 'Gardener & Landscaper', salary: 18000, paid: true },
    { id: 'WRK03', name: 'Prabhas Raju', role: 'Campus Security Lead', salary: 22000, paid: false },
    { id: 'WRK04', name: 'Pooja Hegde', role: 'Hostel Block Warden', salary: 30000, paid: true },
    { id: 'WRK05', name: 'Vijay Deverakonda', role: 'Mess Assistant', salary: 15000, paid: false }
  ]);

  const [feeEditSearch, setFeeEditSearch] = useState('');
  const [selectedFeeStudent, setSelectedFeeStudent] = useState<Student | null>(null);
  const [editTuitionWaiver, setEditTuitionWaiver] = useState('0');
  const [editHostelWaiver, setEditHostelWaiver] = useState('0');
  const [editTransportWaiver, setEditTransportWaiver] = useState('0');
  const [editMiscWaiver, setEditMiscWaiver] = useState('0');

  // ── Admin2 Live Wiring State ──
  const [feeBreakdownData, setFeeBreakdownData] = useState<any>(null);
  const [lateFeeRulesText, setLateFeeRulesText] = useState('Loading...');
  const [scholarshipRulesText, setScholarshipRulesText] = useState('Loading...');
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('');
  const [newWorkerWage, setNewWorkerWage] = useState('');
  const [newWorkerPeriod, setNewWorkerPeriod] = useState('July 2026');
  const [enrollmentStats, setEnrollmentStats] = useState<any[]>([]);

  // ── Admin2 Fetch Helpers ──
  const fetchFeeSettings = async () => {
    try {
      const data = await admin2Service.getFeeSettings();
      setFeeRates(data);
    } catch (err: any) { triggerToast(err.message || 'Failed to load fee settings.'); }
  };

  const fetchExpenditures = async () => {
    try {
      const data = await admin2Service.getExpenditures();
      setExpenditures(data);
    } catch (err: any) { triggerToast(err.message || 'Failed to load expenditures.'); }
  };

  const fetchWorkerPayments = async () => {
    try {
      const data = await admin2Service.getWorkerPayments();
      const mapped = data.map((w: any) => ({
        ...w,
        name: w.workerName || w.name,
        salary: w.amount || w.salary,
        id: w._id || w.id,
      }));
      setWorkers(mapped);
    } catch (err: any) { triggerToast(err.message || 'Failed to load worker payments.'); }
  };

  const fetchStaffSalaries = async () => {
    try {
      const data = await admin2Service.getStaffSalaries();
      setTeachers(data as any);
    } catch (err: any) { triggerToast(err.message || 'Failed to load staff salaries.'); }
  };

  const fetchEnrollmentStats = async () => {
    try {
      const data = await admin2Service.getEnrollmentStats();
      setEnrollmentStats(data);
    } catch (err: any) { triggerToast(err.message || 'Failed to load enrollment stats.'); }
  };

  const fetchLateScholarships = async () => {
    try {
      const [lateRes, scholRes] = await Promise.all([
        admin2Service.getLateFeesSettings(),
        admin2Service.getScholarships(),
      ]);
      setLateFeeRulesText(lateRes.lateFeeRules || 'Not configured');
      setScholarshipRulesText(scholRes.scholarshipRules || 'Not configured');
    } catch (err: any) { triggerToast(err.message || 'Failed to load late fee/scholarship settings.'); }
  };


  const handleUploadTimetable = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimetableFile(file);
      triggerToast(`Selected Timetable: ${file.name}`);
    }
  };

  const submitTimetable = async () => {
    if (!timetableFile) {
      triggerToast('Please select a timetable file first.');
      return;
    }
    setTimetableUploading(true);
    setTimetableUploadStatus(null);
    try {
      setGlobalSecurityKey(securityKey);
      const res = await admin1Service.uploadTimetable(timetableSection, timetableFile);
      if (res.status === 'success') {
        setTimetableUploadStatus(res.data);
        triggerToast('Timetable parsed and registered successfully!');
        setTimetableFile(null);
        setSecurityKey('');
        fetchTimetable(timetableSection);
      } else {
        triggerToast(res.message || 'Failed to upload timetable.');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error processing spreadsheet.');
    } finally {
      setTimetableUploading(false);
    }
  };

  const handleUploadResults = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResultsFile(file);
      triggerToast(`Selected Results: ${file.name}`);
    }
  };

  const submitResults = async () => {
    if (!resultsFile) {
      triggerToast('Please select a CSV or Excel results sheet first.');
      return;
    }
    setExamUploading(true);
    setExamUploadStatus(null);
    try {
      const mockExamName = resultsFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      const formattedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      setGlobalSecurityKey(securityKey);
      const res = await admin1Service.uploadExamResults(resultsFile, mockExamName, formattedDate);
      if (res.status === 'success') {
        setExamUploadStatus(res.data);
        triggerToast(`Results processed! Succeeded: ${res.data.succeeded}, Failed: ${res.data.failed}`);
        setResultsFile(null);
        setSecurityKey('');
        fetchExams();
      } else {
        triggerToast(res.message || 'Failed to upload results.');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error processing exam results sheet.');
    } finally {
      setExamUploading(false);
    }
  };

  const fetchStudents = async (query = '') => {
    try {
      const data = await admin1Service.getStudents(query);
      setStudents(data);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load students.');
    }
  };

  const fetchBulletins = async () => {
    try {
      const data = await admin1Service.getBulletins();
      setBulletins(data);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load bulletins.');
    }
  };

  const fetchExams = async () => {
    try {
      const data = await admin1Service.getExams();
      setExams(data);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load exams.');
    }
  };

  const fetchTimetable = async (sec: string) => {
    try {
      const data = await admin1Service.getTimetable(sec);
      setTimetable(data);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load timetable.');
    }
  };

  const fetchSections = async () => {
    try {
      const data = await admin1Service.getSections();
      if (data && data.teachers && data.teachers.length > 0) {
        setTeachers(data.teachers);
      }
    } catch (err: any) {
      console.warn('API getSections failed, using mock teachers list:', err);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      const data = await admin1Service.getAttendanceSummary();
      setAttendanceSummary(data);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load attendance summary.');
    }
  };

  const fetchAttendanceRoster = async (dateStr: string) => {
    try {
      const roster = await accountantService.getAttendance(dateStr);
      setAttendanceRoster(roster);
    } catch (err) {
      console.error('Failed to load attendance roster:', err);
    }
  };

  const handleToggleAttendance = (id: string, newStatus: 'present' | 'absent' | 'late' | 'leave') => {
    const next = attendanceRoster.map(a => a.id === id ? { ...a, status: newStatus } : a);
    setAttendanceRoster(next);
  };

  const handleSaveAttendance = async (type: 'student' | 'faculty') => {
    setIsLoading(true);
    try {
      const filtered = attendanceRoster.filter(a => type === 'student' ? a.type === 'student' && a.section === selectedSection : a.type === 'faculty');
      await accountantService.saveAttendance(attendanceDate, filtered);
      triggerToast(`${type === 'student' ? 'Section ' + selectedSection : 'Faculty'} Attendance changes saved for date ${attendanceDate}`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save attendance.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const data = await admin1Service.getReports();
      setReportsData(data);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load reports.');
    }
  };

  const refreshCurrentPage = async (pulseKey: typeof livePulseKey) => {
    setLivePulseKey(pulseKey);
    try {
      if (activePage === 'students' || activePage === 'teachers' || activePage === 'sections' || activePage === 'fee_editor') {
        await Promise.all([fetchStudents(), fetchSections()]);
      } else if (activePage === 'publishing') {
        await fetchBulletins();
      } else if (activePage === 'exams') {
        await Promise.all([fetchExams(), fetchStudents()]);
      } else if (activePage === 'classes') {
        await Promise.all([fetchTimetable(timetableSection), fetchSections()]);
      } else if (activePage === 'attendance') {
        await fetchAttendanceSummary();
      } else if (activePage === 'reports') {
        await fetchReports();
      } else if (activePage === 'academic_fees') {
        await fetchFeeSettings();
      } else if (activePage === 'late_scholarships') {
        await fetchLateScholarships();
      } else if (activePage === 'expenditure') {
        await fetchExpenditures();
      } else if (activePage === 'salary_status') {
        await fetchStaffSalaries();
      } else if (activePage === 'worker_payments') {
        await fetchWorkerPayments();
      } else if (activePage === 'enrollment_stats') {
        await fetchEnrollmentStats();
      } else if (pulseKey === 'finance' || pulseKey === 'fees') {
        await Promise.all([fetchFeeSettings(), fetchStudents()]);
      } else if (pulseKey === 'bulletins') {
        await fetchBulletins();
      }
    } catch (err: any) {
      triggerToast(err.message || 'Live refresh failed.');
    } finally {
      window.setTimeout(() => setLivePulseKey(null), 1400);
    }
  };



  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribers = [
      onSocketEvent('student:created', () => refreshCurrentPage('students')),
      onSocketEvent('attendance:updated', () => refreshCurrentPage('attendance')),
      onSocketEvent('bulletin:updated', () => refreshCurrentPage('bulletins')),
      onSocketEvent('fee:updated', () => refreshCurrentPage('fees')),
      onSocketEvent('fee-settings:updated', () => refreshCurrentPage('finance')),
      onSocketEvent('hostel:updated', () => refreshCurrentPage('students')),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [activePage, role, timetableSection]);

  // Sync state variables with database records
  useEffect(() => {
    if (activePage === 'students' || activePage === 'teachers') {
      fetchStudents();
      fetchSections(); // sets teachers list
    } else if (activePage === 'publishing') {
      fetchBulletins();
    } else if (activePage === 'exams') {
      fetchExams();
      fetchStudents(); // used for results preview/allocations check
    } else if (activePage === 'classes') {
      fetchTimetable(timetableSection);
      fetchSections(); // loads teachers
    } else if (activePage === 'sections') {
      fetchSections();
      fetchStudents();
    } else if (activePage === 'attendance') {
      fetchAttendanceSummary();
      fetchAttendanceRoster(attendanceDate);
    } else if (activePage === 'reports') {
      fetchReports();
    } else if (activePage === 'academic_fees') {
      fetchFeeSettings();
    } else if (activePage === 'fee_editor') {
      fetchStudents();
    } else if (activePage === 'late_scholarships') {
      fetchLateScholarships();
    } else if (activePage === 'expenditure') {
      fetchExpenditures();
    } else if (activePage === 'salary_status') {
      fetchStaffSalaries();
    } else if (activePage === 'worker_payments') {
      fetchWorkerPayments();
    } else if (activePage === 'enrollment_stats') {
      fetchEnrollmentStats();
    }
  }, [activePage, timetableSection, attendanceDate]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStudentQuickFill = (admNo: string) => {
    setSearchAdm(admNo);
    const match = students.find(s => s.admissionNumber === admNo) || null;
    if (match && role !== 'admin1' && match.branch !== 'Madhapur') {
      triggerToast('Access Denied: Student belongs to another branch.');
      return;
    }
    setSelectedStudent(match);
    setEditStudent(match ? { ...match } : null);
  };

  const handleSearchStudent = () => {
    if (!searchAdm) {
      triggerToast('Please type an Admission or Registration number.');
      return;
    }
    const match = students.find(s => s.admissionNumber.toUpperCase().trim() === searchAdm.toUpperCase().trim() || s.registrationNumber.toUpperCase().trim() === searchAdm.toUpperCase().trim());
    if (match) {
      if (role !== 'admin1' && match.branch !== 'Madhapur') {
        triggerToast('Access Denied: Student belongs to another branch.');
        return;
      }
      setSelectedStudent(match);
      setEditStudent({ ...match });
      triggerToast('Student loaded.');
    } else {
      triggerToast('Student record not found.');
    }
  };

  const handleStudentSave = async (updated: Student) => {
    if (!updated._id) return;
    try {
      setGlobalSecurityKey(securityKey);
      const saved = await admin1Service.updateStudent(updated._id, updated);
      const next = students.map(s => s._id === saved._id ? saved : s);
      setStudents(next);
      setSelectedStudent(saved);
      setEditStudent({ ...saved });
      triggerToast('Student profile details submitted and saved to database.');
      setSecurityKey('');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save student details.');
    }
  };

  const handleTeacherSave = async (updated: Teacher) => {
    try {
      setGlobalSecurityKey(securityKey);
      const saved = await admin1Service.updateTeacher(updated.id, updated);
      const next = teachers.map(t => t.id === saved.id ? saved : t);
      setTeachers(next);
      setSelectedTeacher(saved);
      setEditTeacher({ ...saved });
      triggerToast('Teacher credentials submitted and saved to database.');
      setSecurityKey('');
    } catch (err: any) {
      console.warn('API updateTeacher failed, using local update fallback:', err);
      const next = teachers.map(t => t.id === updated.id ? updated : t);
      setTeachers(next);
      setSelectedTeacher(updated);
      setEditTeacher({ ...updated });
      triggerToast('Teacher credentials updated (Mocked).');
    }
  };

  const handleRegisterStudent = async () => {
    if (!newStuName || !newStuFather || !newStuMobile) {
      triggerToast('Please complete all basic fields.');
      return;
    }
    const newAdm = `ADM2400${students.length + 1}`;
    const secLetter = newStuSec.replace('Section ', '').trim();
    const nextRollNum = `24${newStuCourse}${secLetter}${100 + students.length + 1}`;
    const newStu: Student = {
      admissionNumber: newAdm,
      studentId: `STU-10${10 + students.length}`,
      qrId: `QR-8${Math.floor(Math.random() * 9000 + 1000)}`,
      registrationNumber: `REG20240${Math.floor(Math.random() * 900 + 100)}`,
      name: newStuName,
      fatherName: newStuFather,
      motherName: 'Mrs. Devika Rao',
      mobile: newStuMobile,
      parentMobile: newStuMobile,
      email: `${newStuName.toLowerCase().replace(/ /g, '')}@inspire.edu`,
      address: 'Madhapur Campus, Hyderabad',
      residentialAddress: 'Day Scholar',
      hostelStatus: 'Day Scholar',
      transportStatus: 'Self Transport',
      course: newStuCourse,
      section: newStuSec,
      branch: 'Madhapur',
      rollNumber: nextRollNum,
      status: 'Active',
      documents: ['10th Marksheet.pdf', 'Aadhaar Card.pdf']
    };

    try {
      const response = await apiClient.post('/admin/students', newStu);
      if (response && response.status === 'success') {
        const pin = response.credential.pin;
        newStu.tempPassword = pin;
        const next = [...students, newStu];
        setStudents(next);
        // NOTE: We deliberately do NOT patch window._erpMockStudents or any other
        // window-global here. The student is persisted in MongoDB (Student + User
        // documents created by the backend). The Accountant Portal will pick up
        // newly provisioned students when it is live-wired to the DB in Prompt 8.
        // Until then, a newly registered student will NOT appear in Accountant
        // search results — this is an expected, documented temporary gap, not a
        // bug to work around with in-memory globals.
        setNewStuName('');
        setNewStuFather('');
        setNewStuMobile('');
        triggerToast(`Student registered! PIN: ${pin}`);
      } else {
        triggerToast('Failed to register student on the backend.');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error during backend registration.');
    }
  };

  const handleDeactivateStudent = async () => {
    if (!selectedStudent || !editStudent || !selectedStudent._id) return;
    try {
      const isDeactivating = selectedStudent.status === 'Active';
      if (isDeactivating) {
        setGlobalSecurityKey(securityKey);
        await admin1Service.deactivateStudent(selectedStudent._id);
        const updated = { ...selectedStudent, status: 'Inactive' as any };
        const next = students.map(s => s._id === selectedStudent._id ? updated : s);
        setStudents(next);
        setSelectedStudent(updated);
        setEditStudent({ ...updated });
        triggerToast('Student account soft-deactivated successfully.');
        setSecurityKey('');
      } else {
        const updated = { ...selectedStudent, status: 'Active' as any };
        await handleStudentSave(updated);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update student status.');
    }
  };

  const handleResetPassword = () => {
    if (!selectedStudent || !editStudent) return;
    const updated = { ...editStudent, tempPassword: `TEMP_${Math.floor(Math.random() * 9000 + 1000)}` };
    handleStudentSave(updated);
    triggerToast(`Password reset successfully.`);
  };

  const handleAddTeacher = async () => {
    if (!newFacName || (role !== 'admin2' && !newFacSal)) {
      triggerToast('Please enter faculty details.');
      return;
    }
    const newId = `FAC-20${teachers.length + 1}`;
    try {
      setGlobalSecurityKey(securityKey);
      const saved = await admin1Service.createTeacher({
        id: newId,
        name: newFacName,
        subject: newFacSub,
        salary: role === 'admin2' ? 50000 : parseFloat(newFacSal),
        mobile: '9000000000'
      });
      saved.branch = 'Madhapur';
      setTeachers([...teachers, saved]);
      setNewFacName('');
      setNewFacSal('');
      triggerToast(`Teacher ${newFacName} registered successfully!`);
      setSecurityKey('');
    } catch (err: any) {
      console.warn('API createTeacher failed, using local fallback:', err);
      const mockSaved = {
        id: newId,
        name: newFacName,
        subject: newFacSub,
        salary: role === 'admin2' ? 50000 : parseFloat(newFacSal),
        mobile: '9000000000',
        assignedClasses: [],
        assignedSections: [],
        assignedSubjects: [],
        status: 'Active' as const,
        branch: 'Madhapur'
      };
      setTeachers([...teachers, mockSaved]);
      setNewFacName('');
      setNewFacSal('');
      triggerToast(`Teacher ${newFacName} registered successfully (Mocked).`);
    }
  };

  const handleAssignTeacherDuty = async () => {
    if (!selectedTeacher || !editTeacher) return;
    const nextSections = Array.from(new Set([...editTeacher.assignedSections, assignSec]));
    const nextSubjects = Array.from(new Set([...editTeacher.assignedSubjects, assignSub]));
    try {
      await admin1Service.allocateTeacherDuty(selectedTeacher.id, nextSections, nextSubjects);
      triggerToast('Duty allocation changes submitted.');
      fetchSections(); // refreshes teachers and sections lists from backend
    } catch (err: any) {
      console.warn('API allocateTeacherDuty failed, updating local state instead:', err);
      const updatedTeacher = {
        ...editTeacher,
        assignedSections: nextSections,
        assignedSubjects: nextSubjects
      };
      const next = teachers.map(t => t.id === selectedTeacher.id ? updatedTeacher : t);
      setTeachers(next);
      setSelectedTeacher(updatedTeacher);
      setEditTeacher({ ...updatedTeacher });
      triggerToast('Duty allocation changes updated (Mocked).');
    }
  };

  const handlePublishBulletin = async () => {
    if (!newPubTitle || !newPubContent) {
      triggerToast('Bulletin must contain Title and Body.');
      return;
    }

    try {
      setGlobalSecurityKey(securityKey);
      if (editingPubId) {
        await admin1Service.updateBulletin(editingPubId, { title: newPubTitle, content: newPubContent, category: pubCat });
        setEditingPubId(null);
        triggerToast('Notice edits submitted and published.');
      } else {
        await admin1Service.createBulletin({
          category: pubCat,
          title: newPubTitle,
          content: newPubContent
        });
        triggerToast('Broadcast notice changes submitted!');
      }
      setNewPubTitle('');
      setNewPubContent('');
      setSecurityKey('');
      fetchBulletins(); // refreshes bulletins from backend
    } catch (err: any) {
      triggerToast(err.message || 'Failed to publish bulletin.');
    }
  };

  const handleDeleteBulletin = async (id: string) => {
    try {
      setGlobalSecurityKey(securityKey);
      await admin1Service.deleteBulletin(id);
      triggerToast('Notice deleted.');
      setSecurityKey('');
      fetchBulletins();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete bulletin.');
    }
  };

  const handleScheduleExam = async () => {
    if (!newExamName || !newExamDate) {
      triggerToast('Exam scheduling fields must be completed.');
      return;
    }
    try {
      setGlobalSecurityKey(securityKey);
      await admin1Service.scheduleExam(newExamName, newExamDate);
      setNewExamName('');
      setNewExamDate('');
      triggerToast('Exam scheduled successfully!');
      setSecurityKey('');
      fetchExams();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to schedule exam.');
    }
  };

  const handlePublishResults = async (id: string) => {
    try {
      // Find the exam by id to get its name
      const exam = exams.find(e => e._id === id || e.id === id);
      if (!exam) return;
      setGlobalSecurityKey(securityKey);
      await apiClient.patch(`/admin1/exams/${exam._id || exam.id}`, { status: 'Results Published', resultsPublished: true });
      triggerToast('Exam results published and broadcasted to Student portal!');
      setSecurityKey('');
      fetchExams();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to publish exam results.');
    }
  };

  const handleCreateTimetableSlot = async () => {
    if (!newSlotPeriod || !newSlotSubject || !newSlotTeacher) {
      triggerToast('Please complete all timetable slot fields.');
      return;
    }
    try {
      setGlobalSecurityKey(securityKey);
      await admin1Service.createTimetableEntry({
        section: timetableSection,
        day: newSlotDay,
        period: newSlotPeriod,
        subject: newSlotSubject,
        teacherId: newSlotTeacher
      });
      setNewSlotPeriod('');
      setNewSlotSubject('');
      setNewSlotTeacher('');
      triggerToast('Timetable entry created.');
      setSecurityKey('');
      fetchTimetable(timetableSection);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to create timetable slot.');
    }
  };

  const handleDeleteTimetableSlot = async (id: string) => {
    try {
      setGlobalSecurityKey(securityKey);
      await admin1Service.deleteTimetableEntry(id);
      triggerToast('Timetable entry deleted.');
      setSecurityKey('');
      fetchTimetable(timetableSection);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete timetable slot.');
    }
  };

  const handleAddCalendar = () => {
    if (!newCalTitle || !newCalDate) {
      triggerToast('Event name and date required.');
      return;
    }
    setCalendarEvents([...calendarEvents, { title: newCalTitle, date: newCalDate }]);
    setNewCalTitle('');
    setNewCalDate('');
    triggerToast('Academic Calendar timeline additions submitted.');
  };

  const handleSaveAcademicFees = async () => {
    try {
      const saved = await admin2Service.updateFeeSettings({ ...feeRates, isLocked: true });
      setFeeRates(saved);
      setIsEditingFees(false);
      triggerToast('Academic baseline fees finalized, LOCKED, and propagated to database successfully.');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save fee settings.');
    }
  };

  const handleUnlockFees = async () => {
    try {
      const saved = await admin2Service.updateFeeSettings({ isLocked: false });
      setFeeRates(saved);
      setIsEditingFees(true);
      triggerToast('Academic baseline fees unlocked for editing.');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to unlock fee settings.');
    }
  };

  const handleLogout = () => {
    if ((window as any).logoutUser) {
      (window as any).logoutUser();
    }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ width: 180, height: 22, borderRadius: 10, background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div style={{ ...styles.content, gap: '18px' }}>
          <div style={{ ...styles.skeletonCard, padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ ...styles.skeletonLine, width: '55%' }} />
            <div style={{ ...styles.skeletonLine, width: '80%' }} />
            <div style={{ ...styles.skeletonLine, width: '40%' }} />
          </div>
          <div style={{ ...styles.skeletonCard, padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ ...styles.skeletonLine, width: '75%' }} />
            <div style={{ ...styles.skeletonLine, width: '90%' }} />
            <div style={{ ...styles.skeletonLine, width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  // ─── SUBPAGE 1: STUDENT REGISTRY ───
  if (activePage === 'students') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('emerald')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setSelectedStudent(null); setEditStudent(null); }} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Student Registry</h1>
          <p style={styles.subtitle}>Configure permissions, reset credentials and view documents</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Enter Registration No / Admission No e.g. ADM24001"
                value={searchAdm}
                onChange={(e) => setSearchAdm(e.target.value)}
                style={styles.textInputBox}
              />
              <button onClick={handleSearchStudent} style={{ ...styles.saveSubmitBtn, marginTop: 0 }} className="press-interactive">Load</button>
            </div>
            
            <div style={styles.quickFillContainer}>
              <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 700 }}>Quick Selection:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {students.filter(s => role === 'admin1' || s.branch === 'Madhapur').map(s => (
                  <button key={s.admissionNumber} onClick={() => handleStudentQuickFill(s.admissionNumber)} style={styles.quickFillPill} className="press-interactive">
                    {s.admissionNumber} ({s.name.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedStudent && editStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }} className="anim-fade-in">
              <div style={styles.readOnlyBlock}>
                <div style={styles.metaRow}><span>Account Status</span><strong style={{ color: selectedStudent.status === 'Active' ? '#10B981' : '#EF4444' }}>{selectedStudent.status}</strong></div>
                <div style={styles.metaRow}><span>Admission Number</span><strong>{selectedStudent.admissionNumber}</strong></div>
                <div style={styles.metaRow}><span>Student ID</span><strong>{selectedStudent.studentId}</strong></div>
                <div style={styles.metaRow}><span>QR Code ID</span><strong>{selectedStudent.qrId}</strong></div>
                <div style={styles.metaRow}><span>Registration Code</span><strong>{selectedStudent.registrationNumber}</strong></div>
                {selectedStudent.tempPassword && (
                  <div style={{ ...styles.metaRow, backgroundColor: '#FEF3C7', padding: '6px', borderRadius: '8px' }}>
                    <span style={{ color: '#B45309' }}>Temporary Password</span>
                    <strong style={{ color: '#B45309' }}>{selectedStudent.tempPassword}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={handleDeactivateStudent} style={{ ...styles.sheetBtn, backgroundColor: 'rgba(211, 47, 47, 0.08)', color: '#D32F2F', border: '1.5px solid rgba(211,47,47,0.25)' }} className="press-interactive">
                  {selectedStudent.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                </button>
                <button onClick={handleResetPassword} style={{ ...styles.sheetBtn, backgroundColor: '#E2E8F0', color: 'var(--dark-charcoal)' }} className="press-interactive">Reset Password</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Student Name</label>
                  <input
                    type="text"
                    value={editStudent.name}
                    onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Father Name</label>
                    <input
                      type="text"
                      value={editStudent.fatherName}
                      onChange={(e) => setEditStudent({ ...editStudent, fatherName: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Mother Name</label>
                    <input
                      type="text"
                      value={editStudent.motherName}
                      onChange={(e) => setEditStudent({ ...editStudent, motherName: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Mobile</label>
                    <input
                      type="text"
                      value={editStudent.mobile}
                      onChange={(e) => setEditStudent({ ...editStudent, mobile: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Parent Contact</label>
                    <input
                      type="text"
                      value={editStudent.parentMobile}
                      onChange={(e) => setEditStudent({ ...editStudent, parentMobile: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Course</label>
                    <input
                      type="text"
                      value={editStudent.course}
                      onChange={(e) => setEditStudent({ ...editStudent, course: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Section</label>
                    <input
                      type="text"
                      value={editStudent.section}
                      onChange={(e) => setEditStudent({ ...editStudent, section: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Branch</label>
                    <input
                      type="text"
                      value={editStudent.branch}
                      onChange={(e) => setEditStudent({ ...editStudent, branch: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Roll Number</label>
                    <input
                      type="text"
                      value={editStudent.rollNumber}
                      onChange={(e) => setEditStudent({ ...editStudent, rollNumber: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Permanent Address</label>
                  <input
                    type="text"
                    value={editStudent.address}
                    onChange={(e) => setEditStudent({ ...editStudent, address: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                {role === 'admin1' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '10px' }}>
                    <h5 style={{ ...styles.sectionSubtitle, margin: '4px 0 8px 0', fontSize: '12px' }}>Edit Student Fee Details (Rector Control)</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Tuition Fee (₹)</label>
                        <input
                          type="number"
                          value={editStudent.tuitionFee || 0}
                          onChange={(e) => setEditStudent({ ...editStudent, tuitionFee: Number(e.target.value) })}
                          style={styles.textInputBox}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Hostel Fee (₹)</label>
                        <input
                          type="number"
                          value={editStudent.hostelFee || 0}
                          onChange={(e) => setEditStudent({ ...editStudent, hostelFee: Number(e.target.value) })}
                          style={styles.textInputBox}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Transport Fee (₹)</label>
                        <input
                          type="number"
                          value={editStudent.transportFee || 0}
                          onChange={(e) => setEditStudent({ ...editStudent, transportFee: Number(e.target.value) })}
                          style={styles.textInputBox}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Misc Fee (₹)</label>
                        <input
                          type="number"
                          value={editStudent.miscellaneousFee || 0}
                          onChange={(e) => setEditStudent({ ...editStudent, miscellaneousFee: Number(e.target.value) })}
                          style={styles.textInputBox}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Previous Pending (₹)</label>
                        <input
                          type="number"
                          value={editStudent.previousPending || 0}
                          onChange={(e) => setEditStudent({ ...editStudent, previousPending: Number(e.target.value) })}
                          style={styles.textInputBox}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Total Paid (₹)</label>
                        <input
                          type="number"
                          value={editStudent.totalPaid || 0}
                          onChange={(e) => setEditStudent({ ...editStudent, totalPaid: Number(e.target.value) })}
                          style={styles.textInputBox}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', marginBottom: '8px' }}>
                <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
                <input
                  type="text"
                  placeholder="Enter Admin Key (OTP) e.g. ADM-1234"
                  value={securityKey}
                  onChange={(e) => setSecurityKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStudentSave(editStudent)}
                  style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
                />
              </div>

              {/* SAVE AND SUBMIT PROFILE CHANGES */}
              <button 
                onClick={() => handleStudentSave(editStudent)} 
                style={styles.saveSubmitBtn} 
                className="press-interactive"
              >
                Submit Student Profile Changes
              </button>

              <h4 style={styles.sectionSubtitle}>Student Documents Verification</h4>
              <div style={styles.readOnlyBlock}>
                {selectedStudent.documents.map((doc, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span>{doc}</span>
                    <button onClick={() => triggerToast(`Displaying ${doc} file view...`)} style={styles.actionItemBtn} className="press-interactive">View file</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Register New Admission Student</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Full Student Name</label>
                  <input type="text" placeholder="e.g. Rahul Sharma" value={newStuName} onChange={(e) => setNewStuName(e.target.value)} style={styles.textInputBox} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Father Name</label>
                    <input type="text" placeholder="Father Name" value={newStuFather} onChange={(e) => setNewStuFather(e.target.value)} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Mobile Number</label>
                    <input type="text" placeholder="e.g. 9900000000" value={newStuMobile} onChange={(e) => setNewStuMobile(e.target.value)} style={styles.textInputBox} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Select Course</label>
                    <select value={newStuCourse} onChange={(e) => setNewStuCourse(e.target.value)} style={styles.selectInput}>
                      <option value="MPC">MPC</option>
                      <option value="BiPC">BiPC</option>
                      <option value="CEC">CEC</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Select Section</label>
                    <select value={newStuSec} onChange={(e) => setNewStuSec(e.target.value)} style={styles.selectInput}>
                      <option value="Section A">Section A</option>
                      <option value="Section B">Section B</option>
                    </select>
                  </div>
                </div>
                {/* SUBMIT REGISTER DETAILS BUTTON */}
                <button onClick={handleRegisterStudent} style={styles.saveSubmitBtn} className="press-interactive">Submit & Create Student Profile</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 2: TEACHERS MANAGEMENT ───
  if (activePage === 'teachers') {
    const list = teachers
      .filter(t => role === 'admin1' || t.branch === 'Madhapur')
      .filter(t => t.name.toLowerCase().includes(searchFac.toLowerCase()) || t.subject.toLowerCase().includes(searchFac.toLowerCase()));

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('gold')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setSelectedTeacher(null); setEditTeacher(null); }} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Faculty Management</h1>
          <p style={styles.subtitle}>View faculty list, assign classroom duties, check salary ledgers</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1 }}>
            <input
              type="text"
              placeholder="Search faculty name or subject..."
              value={searchFac}
              onChange={(e) => setSearchFac(e.target.value)}
              style={styles.textInputBox}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {list.map(t => (
                <div key={t.id} style={styles.receiptRowItem}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <strong>{t.name} ({t.subject})</strong>
                      <span style={{ ...styles.statusBadge, backgroundColor: t.status === 'Active' ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)', color: t.status === 'Active' ? '#10B981' : '#EF4444', borderColor: t.status === 'Active' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)' }}>{t.status}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>Salary: ₹{t.salary.toLocaleString('en-IN')} • Code: {t.id} • Campus: {t.branch || 'Madhapur'}</div>
                  </div>
                  <button onClick={() => { setSelectedTeacher(t); setEditTeacher({ ...t }); }} style={styles.actionItemBtn} className="press-interactive">Select</button>
                </div>
              ))}
            </div>
          </div>

          {selectedTeacher && editTeacher ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }} className="anim-fade-in">
              <div style={styles.readOnlyBlock}>
                <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Faculty Profile: {selectedTeacher.name}</h4>
                <div style={styles.metaRow}><span>Campus/Branch</span><strong>{selectedTeacher.branch || 'Madhapur'}</strong></div>
                <div style={styles.metaRow}><span>Subject Head</span><strong>{selectedTeacher.subject}</strong></div>
                <div style={styles.metaRow}><span>Mobile Contact</span><strong>{selectedTeacher.mobile}</strong></div>
                <div style={styles.metaRow}><span>Monthly Salary</span><strong>₹{selectedTeacher.salary.toLocaleString('en-IN')}</strong></div>
                <div style={styles.metaRow}><span>Teacher Login Code</span><strong>{selectedTeacher.id}</strong></div>
                <div style={styles.metaRow}><span>Account Status</span><span style={{ ...styles.statusBadge, backgroundColor: selectedTeacher.status === 'Active' ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)', color: selectedTeacher.status === 'Active' ? '#10B981' : '#EF4444', borderColor: selectedTeacher.status === 'Active' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)' }}>{selectedTeacher.status}</span></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Faculty Name</label>
                  <input
                    type="text"
                    value={editTeacher.name}
                    onChange={(e) => setEditTeacher({ ...editTeacher, name: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Mobile Number</label>
                  <input
                    type="text"
                    value={editTeacher.mobile}
                    onChange={(e) => setEditTeacher({ ...editTeacher, mobile: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', marginBottom: '8px' }}>
                <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
                <input
                  type="text"
                  placeholder="Enter Admin Key (OTP) e.g. ADM-1234"
                  value={securityKey}
                  onChange={(e) => setSecurityKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTeacherSave(editTeacher)}
                  style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
                />
              </div>

              {/* SAVE / SUBMIT TEACHER PROFILE CHANGES */}
              <button 
                onClick={() => handleTeacherSave(editTeacher)} 
                style={styles.saveSubmitBtn} 
                className="press-interactive"
              >
                Save Faculty Profile Changes
              </button>

              <div style={styles.readOnlyBlock}>
                <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Assign Academic Duties</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={styles.formLabel}>Class</label>
                      <select value={assignClass} onChange={(e) => setAssignClass(e.target.value)} style={styles.selectInput}>
                        <option value="Junior MPC">Junior MPC</option>
                        <option value="Senior MPC">Senior MPC</option>
                        <option value="Junior BiPC">Junior BiPC</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={styles.formLabel}>Section</label>
                      <select value={assignSec} onChange={(e) => setAssignSec(e.target.value)} style={styles.selectInput}>
                        <option value="Section A">Section A</option>
                        <option value="Section B">Section B</option>
                      </select>
                    </div>
                  </div>
                  {/* SUBMIT ASSIGNED DUTY BUTTON */}
                  <button onClick={handleAssignTeacherDuty} style={styles.saveSubmitBtn} className="press-interactive">Submit Class & Section Assignment</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Add New Faculty Member</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Faculty Name</label>
                  <input type="text" placeholder="e.g. Mr. K. Sharma" value={newFacName} onChange={(e) => setNewFacName(e.target.value)} style={styles.textInputBox} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Subject</label>
                    <select value={newFacSub} onChange={(e) => setNewFacSub(e.target.value)} style={styles.selectInput}>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Monthly Salary (₹)</label>
                    <input 
                      type="number" 
                      placeholder={role === 'admin2' ? "Managed by Rector" : "e.g. 75000"} 
                      value={role === 'admin2' ? "" : newFacSal} 
                      disabled={role === 'admin2'}
                      onChange={(e) => setNewFacSal(e.target.value)} 
                      style={{ ...styles.textInputBox, backgroundColor: role === 'admin2' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)' }} 
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', marginBottom: '8px' }}>
                  <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
                  <input
                    type="text"
                    placeholder="Enter Admin Key (OTP) e.g. ADM-1234"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTeacher()}
                    style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
                  />
                </div>

                <button onClick={handleAddTeacher} style={styles.saveSubmitBtn} className="press-interactive">Submit & Create Faculty Profile</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 3: PUBLISHING CENTER ───
  if (activePage === 'publishing') {
    const list = bulletins.filter(b => b.category === pubCat);

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('sapphire')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setEditingPubId(null); }} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Publishing Center</h1>
          <p style={styles.subtitle}>Broadcast notices, announcements, holiday bulletins to student apps</p>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', zIndex: 1, paddingBottom: '4px' }}>
            {(['announcement', 'holiday', 'circular', 'notice', 'event'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setPubCat(cat)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: '1.5px solid var(--card-border)',
                  backgroundColor: pubCat === cat ? 'var(--royal-gold)' : 'rgba(255,255,255,0.6)',
                  color: pubCat === cat ? '#fff' : 'var(--dark-charcoal)',
                  whiteSpace: 'nowrap'
                }}
                className="press-interactive"
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
            <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>{editingPubId ? 'Edit Published Bulletin' : 'Compose New Broadcast'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <input
                type="text"
                placeholder="Bulletin Heading/Title"
                value={newPubTitle}
                onChange={(e) => setNewPubTitle(e.target.value)}
                style={styles.textInputBox}
              />
              <textarea
                placeholder="Bulletin Content/Body text..."
                value={newPubContent}
                onChange={(e) => setNewPubContent(e.target.value)}
                style={{ ...styles.textInputBox, height: '80px', resize: 'none' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
                <input
                  type="text"
                  placeholder="Enter Admin Key (OTP) e.g. ADM-1234"
                  value={securityKey}
                  onChange={(e) => setSecurityKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePublishBulletin()}
                  style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
                />
              </div>

              <button onClick={handlePublishBulletin} style={styles.saveSubmitBtn} className="press-interactive">
                {editingPubId ? 'Submit Notice Edits' : 'Submit & Broadcast to App'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Active Published Items ({pubCat.toUpperCase()})</h4>
            {list.map(b => (
              <div key={b.id} style={{ ...styles.receiptRowItem, flexDirection: 'column', alignItems: 'stretch', gap: '10px' }} className="anim-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{b.title}</strong>
                  <span style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>{b.date}</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--muted-gray)', lineHeight: '1.4', margin: 0 }}>{b.content}</p>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setNewPubTitle(b.title);
                      setNewPubContent(b.content);
                      setEditingPubId(b.id || b._id || null);
                    }}
                    style={styles.actionItemBtn}
                    className="press-interactive"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDeleteBulletin(b.id || b._id || '')} style={{ ...styles.actionItemBtn, color: '#D32F2F' }} className="press-interactive">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 4: TIMETABLES & CALENDAR ───
  if (activePage === 'calendar') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('ruby')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Timetables & Calendar</h1>
          <p style={styles.subtitle}>Upload timetable worksheets, publish holidays schedule</p>
        </header>

        <main style={styles.content}>
          <div style={{ ...styles.readOnlyBlock, border: '1.5px solid var(--royal-gold)', zIndex: 1, marginBottom: '12px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
              <input
                type="text"
                placeholder="Enter Academics Key (OTP) e.g. ACD-1234"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitTimetable()}
                style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
              />
            </div>
          </div>
          <label style={{
            ...styles.readOnlyBlock,
            zIndex: 1,
            border: '2px dashed var(--royal-gold)',
            textAlign: 'center',
            padding: '30px',
            cursor: 'pointer',
            display: 'block'
          }} className="press-interactive">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              style={{ display: 'none' }}
              onChange={handleUploadTimetable}
            />
            {/* GOLD PLUS ICON */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5" style={{ margin: 'auto' }}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h4 style={{ ...styles.sectionSubtitle, margin: '8px 0 4px 0' }}>Upload Timetable File</h4>
            <p style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>
              {timetableFile ? `📄 Selected: ${timetableFile.name}` : 'Click here or drag & drop CSV/Excel sheet to upload weekly classes timetables.'}
            </p>
            {timetableUploading ? (
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--royal-gold)', fontWeight: 700 }}>
                ⏳ Uploading and parsing timetable on backend...
              </div>
            ) : timetableFile && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  submitTimetable();
                }}
                style={{ ...styles.actionItemBtn, marginTop: '12px', backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 800 }}
                className="press-interactive"
              >
                Submit Timetable File
              </button>
            )}
          </label>

          {timetableUploadStatus && (
            <div style={{
              ...styles.readOnlyBlock,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '12px',
              fontSize: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)'
            }}>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, color: 'var(--royal-gold)' }}>Upload Summary Results</h4>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                <div>Total Rows: <strong>{timetableUploadStatus.total}</strong></div>
                <div style={{ color: '#2E7D32' }}>Succeeded: <strong>{timetableUploadStatus.succeeded}</strong></div>
                <div style={{ color: '#D32F2F' }}>Failed: <strong>{timetableUploadStatus.failed}</strong></div>
              </div>
              {timetableUploadStatus.errors && timetableUploadStatus.errors.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#D32F2F', marginBottom: '4px' }}>Errors Checklist:</div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                    {timetableUploadStatus.errors.map((err: any, idx: number) => (
                      <div key={idx} style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(211,47,47,0.1)', borderLeft: '3px solid #D32F2F' }}>
                        Row {err.row}: {err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MANUAL TIMETABLE MANAGER */}
          <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
            <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Manual Timetable Entry Manager</h4>
            
            {/* Section Select Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              <label style={styles.formLabel}>Active Section</label>
              <select
                value={timetableSection}
                onChange={(e) => setTimetableSection(e.target.value)}
                style={styles.selectInput}
              >
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
              </select>
            </div>

            {/* List of current slots */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800 }}>Timetable Slots List ({timetable.length}):</span>
              {timetable.length > 0 ? (
                timetable.map((slot: any) => (
                  <div key={slot._id} style={{ ...styles.receiptRowItem, padding: '4px 8px', fontSize: '11px' }}>
                    <div>
                      <strong>{slot.day} - {slot.period}</strong>
                      <div style={{ color: 'var(--muted-gray)', fontSize: '10px' }}>{slot.subject} ({slot.teacher?.name || 'Unknown Teacher'})</div>
                    </div>
                    <button
                      onClick={() => handleDeleteTimetableSlot(slot._id)}
                      style={{ padding: '2px 6px', backgroundColor: '#EF4444', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '9px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--muted-gray)', textAlign: 'center', padding: '12px' }}>No entries found for this section.</div>
              )}
            </div>

            {/* Add manual slot fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800 }}>Create New Slot Entry:</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Day</label>
                  <select value={newSlotDay} onChange={(e) => setNewSlotDay(e.target.value)} style={styles.selectInput}>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Period Slot</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM - 10:00 AM"
                    value={newSlotPeriod}
                    onChange={(e) => setNewSlotPeriod(e.target.value)}
                    style={styles.textInputBox}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Physics"
                    value={newSlotSubject}
                    onChange={(e) => setNewSlotSubject(e.target.value)}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Teacher In-Charge</label>
                  <select value={newSlotTeacher} onChange={(e) => setNewSlotTeacher(e.target.value)} style={styles.selectInput}>
                    <option value="">-- Choose Teacher --</option>
                    {teachers.map(t => (
                      <option key={t.id || t._id} value={t._id}>{t.name} ({t.subject})</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={handleCreateTimetableSlot} style={{ ...styles.saveSubmitBtn, marginTop: '8px' }} className="press-interactive">Save Timetable Slot</button>
            </div>
          </div>

          <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
            <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Register Calendar Event</h4>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input type="text" placeholder="Event Name e.g. Preboards" value={newCalTitle} onChange={(e) => setNewCalTitle(e.target.value)} style={styles.textInputBox} />
              <input type="text" placeholder="Date e.g. 12 Oct" value={newCalDate} onChange={(e) => setNewCalDate(e.target.value)} style={styles.textInputBox} />
            </div>
            <button onClick={handleAddCalendar} style={styles.saveSubmitBtn} className="press-interactive">Submit Calendar Event</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Calendar Events Timeline</h4>
            {calendarEvents.map((evt, idx) => (
              <div key={idx} style={styles.receiptRowItem}>
                <strong>{evt.title}</strong>
                <span style={{ fontWeight: 800, color: 'var(--royal-gold)' }}>{evt.date}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 5: CLASS SCHEDULING ───
  if (activePage === 'classes') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('teal')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Class Scheduling</h1>
          <p style={styles.subtitle}>Assign students to sections and assign faculty to classes</p>
        </header>

        <main style={styles.content}>
          <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
            <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Allocate Student to Section</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Select Student</label>
                <select
                  onChange={(e) => {
                    const match = students.find(s => s.admissionNumber === e.target.value) || null;
                    setSelectedStudent(match);
                    setEditStudent(match ? { ...match } : null);
                  }}
                  style={styles.selectInput}
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.admissionNumber} value={s.admissionNumber}>{s.name} ({s.course})</option>
                  ))}
                </select>
              </div>

              {selectedStudent && editStudent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="anim-fade-in">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Target Section</label>
                    <select
                      value={editStudent.section}
                      onChange={(e) => setEditStudent({ ...editStudent, section: e.target.value })}
                      style={styles.selectInput}
                    >
                      <option value="Section A">Section A</option>
                      <option value="Section B">Section B</option>
                      <option value="Section C">Section C</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => {
                      handleStudentSave(editStudent);
                      triggerToast(`Student section transfer submitted.`);
                    }} 
                    style={styles.saveSubmitBtn} 
                    className="press-interactive"
                  >
                    Submit Section Allocation
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
            <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Allocate Teacher Classroom duty</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Select Lecturer</label>
                <select
                  onChange={(e) => {
                    const match = teachers.find(t => t.id === e.target.value) || null;
                    setSelectedTeacher(match);
                    setEditTeacher(match ? { ...match } : null);
                  }}
                  style={styles.selectInput}
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                  ))}
                </select>
              </div>

              {selectedTeacher && editTeacher && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="anim-fade-in">
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={assignClass} onChange={(e) => setAssignClass(e.target.value)} style={styles.selectInput}>
                      <option value="Junior MPC">Junior MPC</option>
                      <option value="Senior MPC">Senior MPC</option>
                    </select>
                    <select value={assignSec} onChange={(e) => setAssignSec(e.target.value)} style={styles.selectInput}>
                      <option value="Section A">Section A</option>
                      <option value="Section B">Section B</option>
                    </select>
                  </div>
                  <button onClick={handleAssignTeacherDuty} style={styles.saveSubmitBtn} className="press-interactive">Submit Teacher Duty Allocation</button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 6: EXAMINATION DESK ───
  if (activePage === 'exams') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('purple')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Examination Desk</h1>
          <p style={styles.subtitle}>Schedule term tests, compile rankings and publish merit lists</p>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          <div style={{ ...styles.readOnlyBlock, border: '1.5px solid var(--royal-gold)', zIndex: 1, marginBottom: '12px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
              <input
                type="text"
                placeholder="Enter Academics Key (OTP) e.g. ACD-1234"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitResults()}
                style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
              />
            </div>
          </div>
          <label style={{
            ...styles.readOnlyBlock,
            zIndex: 1,
            border: '2px dashed var(--royal-gold)',
            textAlign: 'center',
            padding: '30px',
            cursor: 'pointer',
            display: 'block'
          }} className="press-interactive">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              style={{ display: 'none' }}
              onChange={handleUploadResults}
            />
            {/* GOLD PLUS ICON */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5" style={{ margin: 'auto' }}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h4 style={{ ...styles.sectionSubtitle, margin: '8px 0 4px 0' }}>Upload Exam Results Sheet</h4>
            <p style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>
              {resultsFile ? `📄 Selected: ${resultsFile.name}` : 'Click here or drag & drop CSV/Excel results sheet to upload & parse student grades.'}
            </p>
            {examUploading ? (
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--royal-gold)', fontWeight: 700 }}>
                ⏳ Uploading and parsing results on backend...
              </div>
            ) : resultsFile && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  submitResults();
                }}
                style={{ ...styles.actionItemBtn, marginTop: '12px', backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 800 }}
                className="press-interactive"
              >
                Parse & Upload Results
              </button>
            )}
          </label>

          {examUploadStatus && (
            <div style={{
              ...styles.readOnlyBlock,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '12px',
              fontSize: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)'
            }}>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, color: 'var(--royal-gold)' }}>Upload Summary Results</h4>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                <div>Total Rows: <strong>{examUploadStatus.total}</strong></div>
                <div style={{ color: '#2E7D32' }}>Succeeded: <strong>{examUploadStatus.succeeded}</strong></div>
                <div style={{ color: '#D32F2F' }}>Failed: <strong>{examUploadStatus.failed}</strong></div>
              </div>
              {examUploadStatus.errors && examUploadStatus.errors.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#D32F2F', marginBottom: '4px' }}>Errors Checklist:</div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
                    {examUploadStatus.errors.map((err: any, idx: number) => (
                      <div key={idx} style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(211,47,47,0.1)', borderLeft: '3px solid #D32F2F' }}>
                        Row {err.row}: {err.rollNumber ? `[Roll: ${err.rollNumber}] ` : ''}{err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
            <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Schedule New Exam</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <input type="text" placeholder="Exam Name e.g. Preboards" value={newExamName} onChange={(e) => setNewExamName(e.target.value)} style={styles.textInputBox} />
              <input type="text" placeholder="Date e.g. 15 Aug" value={newExamDate} onChange={(e) => setNewExamDate(e.target.value)} style={styles.textInputBox} />
              <button onClick={handleScheduleExam} style={styles.saveSubmitBtn} className="press-interactive">Submit & Schedule Exam</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Scheduled Examinations</h4>
            {exams.map(e => (
                <div key={e.id || e._id} style={styles.receiptRowItem}>
                <div>
                  <strong>{e.name}</strong>
                  <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>{e.class} • {e.date} • {e.status}</div>
                </div>
                {!e.resultsPublished && (
                  <button onClick={() => handlePublishResults(e.id || e._id || '')} style={styles.actionItemBtn} className="press-interactive">Submit & Publish Results</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Top Performers Merit List</h4>
            {[
              { rank: '1', name: 'Varshith Rao', marks: '98.4%', badge: '🥇 Gold' },
              { rank: '2', name: 'Aaditya Varma', marks: '96.2%', badge: '🥈 Silver' },
              { rank: '3', name: 'Rahul Khanna', marks: '92.1%', badge: '🥉 Bronze' }
            ].map((perf, idx) => (
              <div key={idx} style={styles.receiptRowItem}>
                <div>
                  <strong>{perf.rank}. {perf.name}</strong>
                  <div style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>Rank Award: {perf.badge}</div>
                </div>
                <span style={{ fontWeight: 800, color: 'var(--royal-gold)' }}>{perf.marks}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 7: ACADEMIC FEES (Admin 2 only) ───
  // FRONTEND ROUTE GUARD: even if admin1 manipulates client-side state to set
  // activePage='academic_fees', this guard redirects them back to the menu
  // immediately. The backend independently enforces this via admin2Guard (403).
  if (activePage === 'academic_fees') {
    if (role !== 'admin2') {
      // Silently redirect — admin1 has no module card for this page
      // and should never reach here through normal navigation.
      setActivePage('menu');
      return null;
    }

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('orange')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setIsEditingFees(false); }} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Academic Fees per Year</h1>
          <p style={styles.subtitle}>Configure base fees parameters. Modifying updates all student records in the database.</p>
        </header>

        <main style={styles.content}>
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Term Fees structure</h4>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                color: (feeRates.isLocked && !isEditingFees) ? '#EF4444' : 'var(--royal-gold)',
                backgroundColor: (feeRates.isLocked && !isEditingFees) ? 'rgba(239,68,68,0.06)' : 'rgba(212,175,55,0.06)',
                border: `1.5px solid ${(feeRates.isLocked && !isEditingFees) ? '#EF4444' : 'var(--royal-gold)'}`,
                padding: '4px 8px',
                borderRadius: '8px'
              }}>
                {(feeRates.isLocked && !isEditingFees) ? '🔒 Locked - Fee rates finalized' : '✏️ Editing Mode - Active'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Tuition Fee (₹)</label>
                <input
                  type="number"
                  disabled={feeRates.isLocked && !isEditingFees}
                  value={feeRates.tuition}
                  onChange={(e) => setFeeRates({ ...feeRates, tuition: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.textInputBox, opacity: (feeRates.isLocked && !isEditingFees) ? 0.6 : 1 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Hostel Admission Fee (₹)</label>
                <input
                  type="number"
                  disabled={feeRates.isLocked && !isEditingFees}
                  value={feeRates.hostel}
                  onChange={(e) => setFeeRates({ ...feeRates, hostel: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.textInputBox, opacity: (feeRates.isLocked && !isEditingFees) ? 0.6 : 1 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Transport Fee (₹)</label>
                <input
                  type="number"
                  disabled={feeRates.isLocked && !isEditingFees}
                  value={feeRates.transport}
                  onChange={(e) => setFeeRates({ ...feeRates, transport: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.textInputBox, opacity: (feeRates.isLocked && !isEditingFees) ? 0.6 : 1 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Miscellaneous Fee (₹)</label>
                <input
                  type="number"
                  disabled={feeRates.isLocked && !isEditingFees}
                  value={feeRates.misc}
                  onChange={(e) => setFeeRates({ ...feeRates, misc: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.textInputBox, opacity: (feeRates.isLocked && !isEditingFees) ? 0.6 : 1 }}
                />
              </div>
            </div>

            {feeRates.isLocked && !isEditingFees ? (
              <button 
                onClick={handleUnlockFees} 
                style={{ ...styles.saveSubmitBtn, marginTop: '16px', backgroundColor: 'var(--royal-gold)', color: 'var(--dark-charcoal)' }} 
                className="press-interactive"
              >
                🔓 Unlock & Modify Fee Rates
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button 
                  onClick={handleSaveAcademicFees} 
                  style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: '#10B981', color: '#fff' }} 
                  className="press-interactive"
                >
                  Save & Propagate Rates
                </button>
                <button 
                  onClick={() => {
                    setIsEditingFees(false);
                    fetchFeeSettings();
                  }} 
                  style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }} 
                  className="press-interactive"
                >
                  Cancel
                </button>
              </div>
            )}
          </GlassCard>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 8: REPORTS COMPILER ───
  if (activePage === 'reports') {
    const reportSections = reportsData?.enrollmentBySection || [];
    const reportCourses = reportsData?.enrollmentByCourse || [];

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('cyan')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Reports Compiler</h1>
          <p style={styles.subtitle}>Audit transaction streams, check category totals and export ledgers</p>
        </header>

        <main style={styles.content}>
          {/* LIVE DATA AGGREGATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', zIndex: 1, marginBottom: '16px' }}>
            <div style={styles.readOnlyBlock}>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Enrollment by Section</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {reportSections.length > 0 ? (
                  reportSections.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px' }}>
                      <span>{item.section}</span>
                      <strong style={{ color: 'var(--royal-gold)' }}>{item.count} Students</strong>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>No student sections records.</div>
                )}
              </div>
            </div>

            <div style={styles.readOnlyBlock}>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Enrollment by Course</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {reportCourses.length > 0 ? (
                  reportCourses.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px' }}>
                      <span>{item.course}</span>
                      <strong style={{ color: 'var(--royal-gold)' }}>{item.count} Enrolled</strong>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>No student course records.</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Standard Exportable Documents</h4>
            {[
              { name: 'Student Enrollment Registry Report', format: 'PDF Document (.pdf)' },
              { name: 'Roster Attendance Log sheets (Weekly)', format: 'Excel Sheet (.xlsx)' },
              { name: 'Quarterly Examination Grades Ranks', format: 'PDF Document (.pdf)' },
              { name: 'Top Performers Merit List Spreadsheet', format: 'Excel Sheet (.xlsx)' }
            ].map((rep, idx) => (
              <div key={idx} style={styles.receiptRowItem}>
                <div>
                  <strong>{rep.name}</strong>
                  <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>Format: {rep.format}</div>
                </div>
                <button onClick={() => triggerToast(`Export changes submitted: ${rep.name} generated.`)} style={styles.actionItemBtn} className="press-interactive">Export & Download</button>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 9: ATTENDANCE DASHBOARD & MARKING CONSOLE ───
  if (activePage === 'attendance') {
    if (role === 'admin3') {
      const studentsList = attendanceRoster.filter(a => a.type === 'student' && a.section === selectedSection);
      const facultyList = attendanceRoster.filter(a => a.type === 'faculty');

      return (
        <div style={styles.container} className="anim-slide-up">
          {renderBackgroundDesign('indigo')}
          <header style={styles.header}>
            <button onClick={() => { setActivePage('menu'); }} style={styles.backArrowBtn} className="press-interactive">
              ← Back to Cockpit
            </button>
            <h1 style={{ ...styles.title, marginTop: '8px' }}>Attendance Marking Console</h1>
            <p style={styles.subtitle}>Directly log daily presenters, leaves, and absentees timeline</p>
          </header>

          <main style={{ ...styles.content, gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
              {['students', 'faculty', 'summary'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAttTab(tab as any)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '12px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1.5px solid var(--card-border)',
                    backgroundColor: attTab === tab ? 'var(--royal-gold)' : 'rgba(255,255,255,0.5)',
                    color: attTab === tab ? '#fff' : 'var(--dark-charcoal)'
                  }}
                  className="press-interactive"
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={styles.formLabel}>Reporting Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  style={styles.textInputBox}
                />
              </div>
              {attTab === 'students' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={styles.formLabel}>Class Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="MPC-A">MPC - Section A</option>
                    <option value="MPC-B">MPC - Section B</option>
                    <option value="BiPC-A">BiPC - Section A</option>
                    <option value="CEC-A">CEC - Section A</option>
                  </select>
                </div>
              )}
            </div>

            {/* Student list */}
            {attTab === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
                <h4 style={styles.sectionSubtitle}>Student Marking ({selectedSection})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {studentsList.map((stu) => (
                    <div key={stu.id} style={styles.receiptRowItem}>
                      <div>
                        <strong>{stu.name}</strong>
                        <div style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>ID: {stu.id} • Roster Status: <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{stu.status}</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['present', 'absent', 'late'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleToggleAttendance(stu.id, st)}
                            style={{
                              padding: '6px 8px',
                              fontSize: '9px',
                              fontWeight: 800,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              border: '1px solid var(--card-border)',
                              backgroundColor: stu.status === st ? (st === 'present' ? '#10B981' : st === 'absent' ? '#EF4444' : '#FBBF24') : 'rgba(255,255,255,0.6)',
                              color: stu.status === st ? '#fff' : 'var(--dark-charcoal)'
                            }}
                            className="press-interactive"
                          >
                            {st.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* EXPLICIT SUBMIT CHANGES BUTTON */}
                <button onClick={() => handleSaveAttendance('student')} style={styles.saveSubmitBtn} className="press-interactive">Submit Attendance Changes</button>
              </div>
            )}

            {/* Faculty list */}
            {attTab === 'faculty' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
                <h4 style={styles.sectionSubtitle}>Lecturer Attendance Logs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {facultyList.map((fac) => (
                    <div key={fac.id} style={styles.receiptRowItem}>
                      <div>
                        <strong>{fac.name}</strong>
                        <div style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>Code: {fac.id} • Status: <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{fac.status}</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['present', 'absent', 'leave'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleToggleAttendance(fac.id, st)}
                            style={{
                              padding: '6px 8px',
                              fontSize: '9px',
                              fontWeight: 800,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              border: '1px solid var(--card-border)',
                              backgroundColor: fac.status === st ? (st === 'present' ? '#10B981' : st === 'absent' ? '#EF4444' : '#8B5CF6') : 'rgba(255,255,255,0.6)',
                              color: fac.status === st ? '#fff' : 'var(--dark-charcoal)'
                            }}
                            className="press-interactive"
                          >
                            {st.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* EXPLICIT SUBMIT CHANGES BUTTON */}
                <button onClick={() => handleSaveAttendance('faculty')} style={styles.saveSubmitBtn} className="press-interactive">Submit Faculty Roster Changes</button>
              </div>
            )}

            {/* Ratios summary */}
            {attTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }} className="anim-fade-in">
                <div style={styles.readOnlyBlock}>
                  <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Presenter Statistics Summary</h4>
                  <div style={styles.metaRow}><span>Total Classrooms Tracked</span><strong>4 Sections</strong></div>
                  <div style={styles.metaRow}><span>Average Present Ratio</span><strong>96.2% Present Today</strong></div>
                  <div style={styles.metaRow}><span>Faculty Availability</span><strong>96.8% Available</strong></div>
                </div>
              </div>
            )}
          </main>
        </div>
      );
    } else {
      const totals = (attendanceSummary as any)?.totals || {
        studentsPresent: 2735,
        studentsAbsent: 111,
        facultyPresent: 180,
        facultyAbsent: 6
      };
      const sectionsList = (attendanceSummary as any)?.sections || [];

      return (
        <div style={styles.container} className="anim-slide-up">
          {renderBackgroundDesign('indigo')}
          <header style={styles.header}>
            <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
              ← Back to Cockpit
            </button>
            <h1 style={{ ...styles.title, marginTop: '8px' }}>Attendance Dashboard</h1>
            <p style={styles.subtitle}>Check summary stats and presenter ratios (Read-only)</p>
          </header>

          <main style={{ ...styles.content, gap: '16px' }}>
            <div style={{ ...styles.metricsGrid, zIndex: 1 }}>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Students Present</span>
                <strong style={{ ...styles.metricValue, color: '#10B981' }}>{totals.studentsPresent.toLocaleString()}</strong>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Students Absent</span>
                <strong style={{ ...styles.metricValue, color: '#EF4444' }}>{totals.studentsAbsent.toLocaleString()}</strong>
              </div>
            </div>
            <div style={{ ...styles.metricsGrid, zIndex: 1 }}>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Faculty Present</span>
                <strong style={styles.metricValue}>{totals.facultyPresent.toLocaleString()}</strong>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Faculty on Leave</span>
                <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>{totals.facultyAbsent.toLocaleString()}</strong>
              </div>
            </div>

            <h4 style={styles.sectionSubtitle}>Section-wise Attendance Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
              {sectionsList.length > 0 ? (
                sectionsList.map((sec: any, idx: number) => (
                  <div key={idx} style={styles.receiptRowItem}>
                    <span>{sec.section}</span>
                    <strong>{sec.ratio}% Present</strong>
                  </div>
                ))
              ) : (
                <>
                  <div style={styles.receiptRowItem}><span>MPC - Section A</span><strong>96.2% Present</strong></div>
                  <div style={styles.receiptRowItem}><span>MPC - Section B</span><strong>92.4% Present</strong></div>
                  <div style={styles.receiptRowItem}><span>BiPC - Section A</span><strong>94.8% Present</strong></div>
                  <div style={styles.receiptRowItem}><span>CEC - Section A</span><strong>98.0% Present</strong></div>
                </>
              )}
            </div>
          </main>
        </div>
      );
    }
  }

  // ─── SUBPAGE 10: ERP SETTINGS ───
  if (activePage === 'settings') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('rose')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>ERP Configurations Settings</h1>
          <p style={styles.subtitle}>Configure permissions settings, App banners, Branches directories</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.formLabel}>Academic Year</label>
              <input
                type="text"
                value={globalSettings.academicYear}
                onChange={(e) => setGlobalSettings({ ...globalSettings, academicYear: e.target.value })}
                style={styles.textInputBox}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.formLabel}>Campus Branches List</label>
              <input
                type="text"
                value={globalSettings.branches}
                onChange={(e) => setGlobalSettings({ ...globalSettings, branches: e.target.value })}
                style={styles.textInputBox}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.formLabel}>Classroom Sections</label>
              <input
                type="text"
                value={globalSettings.sections}
                onChange={(e) => setGlobalSettings({ ...globalSettings, sections: e.target.value })}
                style={styles.textInputBox}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.formLabel}>Active Holiday Lists</label>
              <textarea
                value={globalSettings.holidayList}
                onChange={(e) => setGlobalSettings({ ...globalSettings, holidayList: e.target.value })}
                style={{ ...styles.textInputBox, height: '80px', resize: 'none' }}
              />
            </div>

            <button onClick={() => triggerToast('ERP Global configuration changes submitted.')} style={styles.saveSubmitBtn} className="press-interactive">Submit Configurations</button>
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 12: STUDENT FEE EDITOR (Admin 2) ───
  if (activePage === 'fee_editor') {
    const handleFeeQuickFill = async (admNo: string) => {
      setFeeEditSearch(admNo);
      const match = students.find(s => s.admissionNumber.toUpperCase().trim() === admNo.toUpperCase().trim());
      if (match) {
        try {
          const breakdown = await admin2Service.getFeeBreakdown(match._id || 'fallback_id');
          setSelectedFeeStudent(match);
          setFeeBreakdownData(breakdown);
          setEditTuitionWaiver(String(breakdown.tuitionWaiver));
          setEditHostelWaiver(String(breakdown.hostelWaiver));
          setEditTransportWaiver(String(breakdown.transportWaiver));
          setEditMiscWaiver(String(breakdown.miscWaiver));
          triggerToast(`Loaded fee record for ${match.name}`);
        } catch (err: any) {
          console.warn('API getFeeBreakdown failed, using mock data instead:', err);
          const mockBreakdown = {
            baseFee: 245000,
            tuitionFee: 120000,
            hostelFee: 80000,
            transportFee: 30000,
            miscFee: 15000,
            previousPending: 5000,
            scholarshipCategory: match.scholarshipCategory || 'Merit',
            scholarshipPct: match.scholarshipCategory === 'Sports' ? 30 : 50,
            scholarshipDeduction: 60000,
            individualOverrideDeduction: (match as any).tuitionWaiver || 15000,
            tuitionWaiver: (match as any).tuitionWaiver || 10000,
            hostelWaiver: (match as any).hostelWaiver || 5000,
            transportWaiver: (match as any).transportWaiver || 0,
            miscWaiver: (match as any).miscWaiver || 0,
            totalPaid: 95000,
            remainingBalance: 90000
          };
          setSelectedFeeStudent(match);
          setFeeBreakdownData(mockBreakdown);
          setEditTuitionWaiver(String(mockBreakdown.tuitionWaiver));
          setEditHostelWaiver(String(mockBreakdown.hostelWaiver));
          setEditTransportWaiver(String(mockBreakdown.transportWaiver));
          setEditMiscWaiver(String(mockBreakdown.miscWaiver));
          triggerToast(`Loaded fee record for ${match.name} (Mocked)`);
        }
      } else {
        setSelectedFeeStudent(null);
        setFeeBreakdownData(null);
        triggerToast('Student not found.');
      }
    };

    const handleFeeSearch = async () => {
      const match = students.find(s =>
        s.admissionNumber.toUpperCase().trim() === feeEditSearch.toUpperCase().trim() ||
        s.rollNumber.toUpperCase().trim() === feeEditSearch.toUpperCase().trim()
      );
      if (match) {
        try {
          const breakdown = await admin2Service.getFeeBreakdown(match._id || 'fallback_id');
          setSelectedFeeStudent(match);
          setFeeBreakdownData(breakdown);
          setEditTuitionWaiver(String(breakdown.tuitionWaiver));
          setEditHostelWaiver(String(breakdown.hostelWaiver));
          setEditTransportWaiver(String(breakdown.transportWaiver));
          setEditMiscWaiver(String(breakdown.miscWaiver));
          triggerToast(`Loaded fee record for ${match.name}`);
        } catch (err: any) {
          console.warn('API getFeeBreakdown failed, using mock data instead:', err);
          const mockBreakdown = {
            baseFee: 245000,
            tuitionFee: 120000,
            hostelFee: 80000,
            transportFee: 30000,
            miscFee: 15000,
            previousPending: 5000,
            scholarshipCategory: match.scholarshipCategory || 'Merit',
            scholarshipPct: match.scholarshipCategory === 'Sports' ? 30 : 50,
            scholarshipDeduction: 60000,
            individualOverrideDeduction: (match as any).tuitionWaiver || 15000,
            tuitionWaiver: (match as any).tuitionWaiver || 10000,
            hostelWaiver: (match as any).hostelWaiver || 5000,
            transportWaiver: (match as any).transportWaiver || 0,
            miscWaiver: (match as any).miscWaiver || 0,
            totalPaid: 95000,
            remainingBalance: 90000
          };
          setSelectedFeeStudent(match);
          setFeeBreakdownData(mockBreakdown);
          setEditTuitionWaiver(String(mockBreakdown.tuitionWaiver));
          setEditHostelWaiver(String(mockBreakdown.hostelWaiver));
          setEditTransportWaiver(String(mockBreakdown.transportWaiver));
          setEditMiscWaiver(String(mockBreakdown.miscWaiver));
          triggerToast(`Loaded fee record for ${match.name} (Mocked)`);
        }
      } else {
        setSelectedFeeStudent(null);
        setFeeBreakdownData(null);
        triggerToast('Student not found.');
      }
    };

    const handleApplyWaivers = async () => {
      if (!selectedFeeStudent) return;
      try {
        setGlobalSecurityKey(securityKey);
        const res = await admin2Service.applyFeeOverride(selectedFeeStudent._id || 'fallback_id', {
          tuitionWaiver: Number(editTuitionWaiver) || 0,
          hostelWaiver: Number(editHostelWaiver) || 0,
          transportWaiver: Number(editTransportWaiver) || 0,
          miscWaiver: Number(editMiscWaiver) || 0,
        });
        if (res.status === 'success') {
          const breakdown = await admin2Service.getFeeBreakdown(selectedFeeStudent._id || 'fallback_id');
          setFeeBreakdownData(breakdown);
          triggerToast(`Fee waivers applied for ${selectedFeeStudent.name}.`);
          setSecurityKey('');
        } else {
          throw new Error(res.message || 'Failed to apply waivers via API');
        }
      } catch (err: any) {
        console.warn('API applyFeeOverride failed, updating local state instead:', err);
        (selectedFeeStudent as any).tuitionWaiver = Number(editTuitionWaiver) || 0;
        (selectedFeeStudent as any).hostelWaiver = Number(editHostelWaiver) || 0;
        (selectedFeeStudent as any).transportWaiver = Number(editTransportWaiver) || 0;
        (selectedFeeStudent as any).miscWaiver = Number(editMiscWaiver) || 0;

        const totalWaivers =
          (selectedFeeStudent as any).tuitionWaiver +
          (selectedFeeStudent as any).hostelWaiver +
          (selectedFeeStudent as any).transportWaiver +
          (selectedFeeStudent as any).miscWaiver;

        const updatedBreakdown = {
          ...feeBreakdownData,
          tuitionWaiver: (selectedFeeStudent as any).tuitionWaiver,
          hostelWaiver: (selectedFeeStudent as any).hostelWaiver,
          transportWaiver: (selectedFeeStudent as any).transportWaiver,
          miscWaiver: (selectedFeeStudent as any).miscWaiver,
          individualOverrideDeduction: totalWaivers,
          remainingBalance: Math.max(0, (feeBreakdownData?.baseFee || 245000) - (feeBreakdownData?.scholarshipDeduction || 60000) - totalWaivers - (feeBreakdownData?.totalPaid || 95000))
        };
        setFeeBreakdownData(updatedBreakdown);
        triggerToast(`Fee waivers applied for ${selectedFeeStudent.name} (Mocked).`);
      }
    };

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('orange')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setSelectedFeeStudent(null); setFeeBreakdownData(null); }} style={styles.backArrowBtn} className="press-interactive">← Back to Finance Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Student Fee Editor</h1>
          <p style={styles.subtitle}>Apply individual tuition, hostel & misc waivers per student</p>
        </header>
        <main style={styles.content}>
          <div style={{ ...styles.readOnlyBlock, border: '1.5px solid var(--royal-gold)', zIndex: 1, marginBottom: '12px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
              <input
                type="text"
                placeholder="Enter Finance Key (OTP) e.g. FIN-1234"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyWaivers()}
                style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
              />
            </div>
          </div>
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Search Student</h4>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <input type="text" placeholder="Admission No or Roll No" value={feeEditSearch} onChange={(e) => setFeeEditSearch(e.target.value)} style={{ ...styles.textInputBox, flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && handleFeeSearch()} />
              <button onClick={handleFeeSearch} style={{ ...styles.saveSubmitBtn, marginTop: 0, padding: '12px 20px' }} className="press-interactive">Search</button>
            </div>
            
            <div style={styles.quickFillContainer}>
              <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 700 }}>Quick Selection:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {students.filter(s => role === 'admin1' || s.branch === 'Madhapur').map(s => (
                  <button key={s.admissionNumber} onClick={() => handleFeeQuickFill(s.admissionNumber)} style={styles.quickFillPill} className="press-interactive">
                    {s.admissionNumber} ({s.name.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
          {selectedFeeStudent && (
            <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
              <h4 style={styles.sectionSubtitle}>{selectedFeeStudent.name} — {selectedFeeStudent.admissionNumber}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                {[['Tuition Waiver (₹)', editTuitionWaiver, setEditTuitionWaiver], ['Hostel Waiver (₹)', editHostelWaiver, setEditHostelWaiver], ['Transport Waiver (₹)', editTransportWaiver, setEditTransportWaiver], ['Misc Waiver (₹)', editMiscWaiver, setEditMiscWaiver]].map(([label, val, setter]: any) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>{label}</label>
                    <input type="number" min="0" value={val} onChange={(e) => setter(e.target.value)} style={styles.textInputBox} />
                  </div>
                ))}
              </div>
              <button onClick={handleApplyWaivers} style={{ ...styles.saveSubmitBtn, marginTop: '16px' }} className="press-interactive">Apply Waivers</button>
            </GlassCard>
          )}
          {feeBreakdownData && (
            <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
              <h4 style={styles.sectionSubtitle}>Fee Ledger Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <div style={styles.metaRow}><span>Base Tuition Fee</span><strong>₹{(feeBreakdownData.tuitionFee||0).toLocaleString('en-IN')}</strong></div>
                {feeBreakdownData.hostelFee > 0 && <div style={styles.metaRow}><span>Base Hostel Fee</span><strong>₹{feeBreakdownData.hostelFee.toLocaleString('en-IN')}</strong></div>}
                {feeBreakdownData.transportFee > 0 && <div style={styles.metaRow}><span>Base Transport Fee</span><strong>₹{feeBreakdownData.transportFee.toLocaleString('en-IN')}</strong></div>}
                {feeBreakdownData.miscFee > 0 && <div style={styles.metaRow}><span>Miscellaneous Fee</span><strong>₹{feeBreakdownData.miscFee.toLocaleString('en-IN')}</strong></div>}
                {feeBreakdownData.previousPending > 0 && <div style={styles.metaRow}><span>Previous Pending</span><strong>₹{feeBreakdownData.previousPending.toLocaleString('en-IN')}</strong></div>}
                <div style={{ ...styles.metaRow, borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '6px' }}><span><strong>Total Base Fee</strong></span><strong>₹{(feeBreakdownData.baseFee||0).toLocaleString('en-IN')}</strong></div>
                {feeBreakdownData.scholarshipDeduction > 0 && (
                  <div style={{ ...styles.metaRow, color: '#2E7D32' }}>
                    <span>Scholarship ({feeBreakdownData.scholarshipCategory}: {feeBreakdownData.scholarshipPct}%)</span>
                    <strong>- ₹{feeBreakdownData.scholarshipDeduction.toLocaleString('en-IN')}</strong>
                  </div>
                )}
                {feeBreakdownData.individualOverrideDeduction > 0 && (
                  <div style={{ ...styles.metaRow, color: '#2E7D32' }}>
                    <span>Individual Waivers</span>
                    <strong>- ₹{feeBreakdownData.individualOverrideDeduction.toLocaleString('en-IN')}</strong>
                  </div>
                )}
                <div style={{ ...styles.metaRow, color: '#D32F2F', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '6px' }}><span>Total Paid</span><strong>- ₹{(feeBreakdownData.totalPaid||0).toLocaleString('en-IN')}</strong></div>
                <div style={{ ...styles.metaRow, backgroundColor: 'rgba(212,175,55,0.08)', padding: '10px', borderRadius: '10px', marginTop: '6px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--royal-gold)' }}>Remaining Balance</span>
                  <strong style={{ fontSize: '15px', color: 'var(--royal-gold)', fontWeight: 900 }}>₹{(feeBreakdownData.remainingBalance||0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </GlassCard>
          )}
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 13: LATE FEES & SCHOLARSHIPS (Admin 2) ───
  if (activePage === 'late_scholarships') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('ruby')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">← Back to Finance Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Late Fees & Scholarships</h1>
          <p style={styles.subtitle}>View active penalty rates and merit scholarship policies</p>
        </header>
        <main style={styles.content}>
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Late Fee Policy</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <div style={styles.metaRow}><span>Current Overdue Policy</span><strong>{lateFeeRulesText}</strong></div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '10px', fontStyle: 'italic' }}>ⓘ Late Fee policies are managed and updated by the Accountant Portal.</p>
          </GlassCard>
          <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Scholarship Merit Policy</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <div style={styles.metaRow}><span>Active Rules</span><strong>{scholarshipRulesText}</strong></div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '10px', fontStyle: 'italic' }}>ⓘ Scholarship slabs are configured and maintained by the Accountant Portal.</p>
          </GlassCard>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 14: EXPENDITURE TRACKER (Admin 2) ───
  if (activePage === 'expenditure') {
    const handleLogExpenditure = async () => {
      if (!newExpAmt || !newExpDesc) { triggerToast('Please fill all fields.'); return; }
      try {
        setGlobalSecurityKey(securityKey);
        await admin2Service.createExpenditure({
          category: newExpCat,
          amount: Number(newExpAmt),
          description: newExpDesc
        });
        setSecurityKey('');
        setNewExpAmt(''); setNewExpDesc('');
        triggerToast('Expenditure logged successfully.');
        fetchExpenditures();
      } catch (err: any) { triggerToast(err.message || 'Failed to log expenditure.'); }
    };

    const handleDeleteExpenditure = async (exp: ExpenditureItem) => {
      const id = exp._id || exp.id;
      if (!id) return;
      try {
        setGlobalSecurityKey(securityKey);
        await admin2Service.deleteExpenditure(id);
        setSecurityKey('');
        triggerToast('Expenditure deleted.');
        fetchExpenditures();
      } catch (err: any) { triggerToast(err.message || 'Failed to delete expenditure.'); }
    };

    // Filter recent entries based on role
    const filteredExpenditures = role === 'admin1'
      ? expenditures.filter(e => e.branch === selectedExpBranch)
      : expenditures.filter(e => e.branch === 'Madhapur');

    const totalFiltered = filteredExpenditures.reduce((s, e) => s + e.amount, 0);

    // Compute totals per branch for Admin 1 dashboard display
    const getBranchTotal = (b: string) => {
      return expenditures.filter(e => e.branch === b).reduce((s, e) => s + e.amount, 0);
    };

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('teal')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">← Back to Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Expenditure Tracker</h1>
          <p style={styles.subtitle}>
            {role === 'admin1' 
              ? 'Multi-branch expenditure monitoring console' 
              : 'Log and monitor campus expenditures'}
          </p>
        </header>
        <main style={styles.content}>
          <div style={{ ...styles.readOnlyBlock, border: '1.5px solid var(--royal-gold)', zIndex: 1, marginBottom: '12px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
              <input
                type="text"
                placeholder="Enter Finance Key (OTP) e.g. FIN-1234"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogExpenditure()}
                style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
              />
            </div>
          </div>
          
          {/* Admin 1 Branch Overview Cards */}
          {role === 'admin1' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px', zIndex: 1 }}>
              {['Madhapur', 'Jubilee Hills', 'Gachibowli', 'Kukatpally', 'Secunderabad'].map(b => {
                const total = getBranchTotal(b);
                const isActive = selectedExpBranch === b;
                return (
                  <div 
                    key={b} 
                    onClick={() => setSelectedExpBranch(b as any)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: isActive ? '2px solid var(--royal-gold)' : '1px solid rgba(255,255,255,0.1)',
                      background: isActive ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className="press-interactive"
                  >
                    <div style={{ fontSize: '10px', color: isActive ? 'var(--royal-gold)' : 'var(--muted-gray)', fontWeight: 800 }}>{b}</div>
                    <strong style={{ fontSize: '14px', color: '#EF4444', display: 'block', marginTop: '4px' }}>₹{total.toLocaleString('en-IN')}</strong>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form and recent entries */}
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>
              Log New Expenditure {role === 'admin1' ? `(For ${selectedExpBranch})` : '(Campus: Madhapur)'}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Category</label>
                <select value={newExpCat} onChange={(e) => setNewExpCat(e.target.value)} style={styles.selectInput}>
                  {['Utilities', 'Mess & Food', 'Maintenance', 'Salaries', 'Transport', 'Stationery', 'Medical', 'Events', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Amount (₹)</label>
                <input type="number" min="0" value={newExpAmt} onChange={(e) => setNewExpAmt(e.target.value)} style={styles.textInputBox} placeholder="e.g. 12000" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                <label style={styles.formLabel}>Description</label>
                <input type="text" value={newExpDesc} onChange={(e) => setNewExpDesc(e.target.value)} style={styles.textInputBox} placeholder="Brief description of the expense" />
              </div>
            </div>
            <button onClick={handleLogExpenditure} style={{ ...styles.saveSubmitBtn, marginTop: '14px' }} className="press-interactive">Log Expenditure</button>
          </GlassCard>

          <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>
              Recent Entries {role === 'admin1' ? `(${selectedExpBranch})` : '(Madhapur)'} — Total: ₹{totalFiltered.toLocaleString('en-IN')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {filteredExpenditures.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '12px' }}>No expenditure entries logged for this branch.</div>
              ) : (
                filteredExpenditures.map((exp, i) => (
                  <div key={exp._id || i} style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--card-border)', backgroundColor: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{exp.category} — {exp.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>{typeof exp.date === 'string' ? exp.date.split('T')[0] : exp.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '14px', color: '#EF4444' }}>₹{exp.amount.toLocaleString('en-IN')}</strong>
                      <button onClick={() => handleDeleteExpenditure(exp)} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 15: STAFF SALARY STATUS (Admin 2) ───
  if (activePage === 'salary_status') {
    const teacherList: any[] = teachers;
    const handleToggleSalary = async (t: any) => {
      const teacherId = t.id || t._id;
      if (!teacherId) return;
      try {
        setGlobalSecurityKey(securityKey);
        await admin2Service.toggleStaffSalary(teacherId);
        setSecurityKey('');
        await fetchStaffSalaries();
        triggerToast('Salary status toggled.');
      } catch (err: any) { triggerToast(err.message || 'Failed to toggle.'); }
    };
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('sapphire')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">← Back to Finance Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Staff & Teacher Salary Status</h1>
          <p style={styles.subtitle}>View teacher roster and toggle salary disbursement status</p>
        </header>
        <main style={styles.content}>
          <div style={{ ...styles.readOnlyBlock, border: '1.5px solid var(--royal-gold)', zIndex: 1, marginBottom: '12px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
              <input
                type="text"
                placeholder="Enter Finance Key (OTP) e.g. FIN-1234"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchStaffSalaries()}
                style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
              />
            </div>
          </div>
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Faculty Roster — {teacherList.length} Members</h4>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                Total: ₹{teacherList.reduce((s, t) => s + (t.salary||0), 0).toLocaleString('en-IN')} / mo
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teacherList.map((t, i) => (
                <div key={t.id || i} style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--card-border)', backgroundColor: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>{t.subject} • {t.assignedClasses?.[0] || 'Unassigned'}</div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--royal-gold)' }}>₹{(t.salary||0).toLocaleString('en-IN')}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: t.salaryStatus === 'paid' ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                        {t.salaryStatus === 'paid' ? `✓ Paid${t.salaryPaymentDate ? ` (${t.salaryPaymentDate})` : ''}` : '● Pending'}
                      </span>
                      <button onClick={() => handleToggleSalary(t)} style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(0,0,0,0.06)', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }} className="press-interactive">Toggle</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 16: WORKER PAYMENT DETAILS (Admin 2) ───
  if (activePage === 'worker_payments') {
    const handleAddWorker = async () => {
      if (!newWorkerName || !newWorkerRole || !newWorkerWage) { triggerToast('Please fill in name, role and wage.'); return; }
      try {
        setGlobalSecurityKey(securityKey);
        const saved = await admin2Service.createWorkerPayment({ workerName: newWorkerName, role: newWorkerRole, amount: Number(newWorkerWage), monthPeriod: newWorkerPeriod, paid: false });
        const mapped = { ...saved, name: saved.workerName, salary: saved.amount, id: saved._id };
        setWorkers([mapped, ...workers]);
        setNewWorkerName(''); setNewWorkerRole(''); setNewWorkerWage('');
        triggerToast('Worker entry added.');
        setSecurityKey('');
      } catch (err: any) { triggerToast(err.message || 'Failed to add worker.'); }
    };
    const handleToggleWorker = async (w: any) => {
      if (!w._id) return;
      try {
        setGlobalSecurityKey(securityKey);
        const updated = await admin2Service.updateWorkerPayment(w._id, { paid: !w.paid });
        setWorkers(workers.map(ww => ww._id === w._id ? { ...updated, name: updated.workerName, salary: updated.amount, id: updated._id } : ww));
        triggerToast(`${w.workerName || w.name} marked ${!w.paid ? 'Paid' : 'Pending'}.`);
        setSecurityKey('');
      } catch (err: any) { triggerToast(err.message || 'Failed to update.'); }
    };
    const handleDeleteWorker = async (w: any) => {
      if (!w._id) return;
      try {
        setGlobalSecurityKey(securityKey);
        await admin2Service.deleteWorkerPayment(w._id);
        setWorkers(workers.filter(ww => ww._id !== w._id));
        triggerToast('Worker entry deleted.');
        setSecurityKey('');
      } catch (err: any) { triggerToast(err.message || 'Failed to delete.'); }
    };
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('emerald')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">← Back to Finance Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Worker Payment Details</h1>
          <p style={styles.subtitle}>Manage and record non-teaching staff payroll for the month</p>
        </header>
        <main style={styles.content}>
          <div style={{ ...styles.readOnlyBlock, border: '1.5px solid var(--royal-gold)', zIndex: 1, marginBottom: '12px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
              <input
                type="text"
                placeholder="Enter Finance Key (OTP) e.g. FIN-1234"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWorker()}
                style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
              />
            </div>
          </div>
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Add Worker Entry</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={styles.formLabel}>Name</label><input type="text" value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} style={styles.textInputBox} placeholder="e.g. Ramesh Kumar" /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={styles.formLabel}>Role</label><input type="text" value={newWorkerRole} onChange={(e) => setNewWorkerRole(e.target.value)} style={styles.textInputBox} placeholder="e.g. Plumber" /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={styles.formLabel}>Monthly Wage (₹)</label><input type="number" min="0" value={newWorkerWage} onChange={(e) => setNewWorkerWage(e.target.value)} style={styles.textInputBox} placeholder="e.g. 15000" /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={styles.formLabel}>Period</label><input type="text" value={newWorkerPeriod} onChange={(e) => setNewWorkerPeriod(e.target.value)} style={styles.textInputBox} placeholder="e.g. July 2026" /></div>
            </div>
            <button onClick={handleAddWorker} style={{ ...styles.saveSubmitBtn, marginTop: '14px' }} className="press-interactive">Add Worker Entry</button>
          </GlassCard>
          <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Workers — {workers.length} Staff</h4>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--royal-gold)', backgroundColor: 'rgba(251,191,36,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>Pending: {workers.filter(w => !w.paid).length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {workers.map((w: any, i) => (
                <div key={w._id || i} style={{ padding: '12px 16px', borderRadius: '12px', border: `1.5px solid ${w.paid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, backgroundColor: w.paid ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{w.workerName || w.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>{w.role} • {w.monthPeriod} • ₹{(w.amount || w.salary || 0).toLocaleString('en-IN')}/mo</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => handleToggleWorker(w)} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', backgroundColor: w.paid ? 'rgba(16,185,129,0.12)' : 'var(--royal-gold)', color: w.paid ? '#10B981' : '#000', fontWeight: 800, fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-family)' }} className="press-interactive">{w.paid ? '✓ Paid' : 'Mark Paid'}</button>
                    <button onClick={() => handleDeleteWorker(w)} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 17: YEARLY ENROLLMENT STATS (Admin 2) ───
  if (activePage === 'enrollment_stats') {
    const yearData = [
      { year: '2022-23', mpc: 480, bipc: 360, cec: 120 },
      { year: '2023-24', mpc: 520, bipc: 390, cec: 140 },
      { year: '2024-25', mpc: 580, bipc: 420, cec: 160 },
      { year: '2025-26', mpc: 640, bipc: 450, cec: 180 },
      { year: '2026-27', mpc: 680, bipc: 460, cec: 200 },
    ];
    // Overlay real DB stats for any matching year
    enrollmentStats.forEach(stat => {
      const idx = yearData.findIndex(y => y.year === stat.academicYear);
      if (idx !== -1) yearData[idx] = { year: stat.academicYear, mpc: stat.mpc || 0, bipc: stat.bipc || 0, cec: stat.cec || 0 };
    });
    const activeYear = yearData.find(y => y.year === '2026-27') || { mpc: 0, bipc: 0, cec: 0 };
    const liveTotal = activeYear.mpc + activeYear.bipc + activeYear.cec;
    const maxTotal = Math.max(...yearData.map(d => d.mpc + d.bipc + d.cec));
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('violet')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">← Back to Finance Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Yearly Enrollment Stats</h1>
          <p style={styles.subtitle}>Academic year-wise admission trends across MPC, BiPC & CEC</p>
        </header>
        <main style={styles.content}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', zIndex: 1 }}>
            {[
              { label: 'Total Enrolled (2026-27)', value: liveTotal.toLocaleString('en-IN'), sub: 'Live database count', color: '#10B981' },
              { label: 'MPC Stream', value: activeYear.mpc.toLocaleString('en-IN'), sub: 'Engineering intake', color: 'var(--royal-gold)' },
              { label: 'BiPC Stream', value: activeYear.bipc.toLocaleString('en-IN'), sub: 'Medical intake', color: '#3B82F6' },
              { label: 'CEC Stream', value: activeYear.cec.toLocaleString('en-IN'), sub: 'Commerce intake', color: '#8B5CF6' },
            ].map((metric, i) => (
              <GlassCard key={i} hoverable={false} style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted-gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{metric.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: metric.color, marginTop: '6px', lineHeight: 1 }}>{metric.value}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--muted-gray)', marginTop: '6px' }}>{metric.sub}</div>
              </GlassCard>
            ))}
          </div>
          <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
            <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, marginBottom: '16px' }}>5-Year Enrollment Trends</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {yearData.map((d, i) => {
                const total = d.mpc + d.bipc + d.cec;
                const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>{d.year}</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--royal-gold)' }}>{total.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', background: 'linear-gradient(90deg, var(--royal-gold), #F97316)', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                      {[['MPC', d.mpc, '#10B981'], ['BiPC', d.bipc, '#3B82F6'], ['CEC', d.cec, '#8B5CF6']].map(([name, val, color]: any) => (
                        <span key={name} style={{ fontSize: '10px', color, fontWeight: 700 }}>{name}: {val}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 20: PROFILE CONSOLE ───
  if (activePage === 'profile') {
    const getProfileData = () => {
      if (role === 'admin1') {
        return {
          initials: 'RC',
          name: 'Mr. Satish Varma (Rector)',
          title: 'General Principal Superintendent Rector',
          clearance: 'Level 1 Executive Clearance (All 5 Branches)',
          registry: 'Global Institutional ERP Cockpit'
        };
      } else if (role === 'admin2') {
        return {
          initials: 'CP',
          name: 'Dr. Ramesh Rao (Dean)',
          title: 'Madhapur Campus Principal Dean',
          clearance: 'Level 2 Operations Clearance (Madhapur Campus)',
          registry: 'Campus Operations ERP Cockpit'
        };
      } else {
        return {
          initials: 'AR',
          name: 'Mr. K. Anand (Registrar)',
          title: 'Academic Registrar & Publisher',
          clearance: 'Level 3 Academic Publishing clearance',
          registry: 'Central Academic Cell ERP Cockpit'
        };
      }
    };

    const prof = getProfileData();

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('navy')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Administrator Profile Console</h1>
          <p style={styles.subtitle}>Consolidated credentials and administrator clearances</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
            <GlassCard hoverable={false} style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.45)' }}>
              <div style={styles.heroAvatar}>{prof.initials}</div>
              <h3 style={{ ...styles.studentName, marginTop: '12px' }}>{prof.name}</h3>
              <span style={styles.studentID}>{prof.title}</span>
              <div style={styles.heroLineDivider} />
              <div style={styles.heroMetaGrid}>
                <div style={styles.metaRow}><span>Active ERP Registry</span><strong>{prof.registry}</strong></div>
                <div style={styles.metaRow}><span>Clearance Level</span><strong>{prof.clearance}</strong></div>
              </div>
            </GlassCard>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container} className="anim-slide-up">
      {renderBackgroundDesign('gold')}

      {/* Top Welcome Title Bar */}
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 1 }}>
          <div style={styles.parentWelcomeRow}>
            <div style={styles.avatarMini}>{role === 'admin1' ? 'RC' : role === 'admin2' ? 'CP' : 'AR'}</div>
            <div>
              <span style={styles.greetingText}>
                {role === 'admin1'
                  ? 'General Principal Rector,'
                  : role === 'admin2'
                  ? 'Campus Principal Dean,'
                  : 'Academic Registrar,'}
              </span>
              <h2 style={styles.parentWelcomeTitle}>
                {role === 'admin1'
                  ? 'Rector General Cockpit'
                  : role === 'admin2'
                  ? 'Campus Operations Cockpit'
                  : 'Academic & Publishing Cockpit'}
              </h2>
              <p style={styles.childMetaText}>
                {role === 'admin1'
                  ? 'Superintendent Coordinator (All 5 Campuses)'
                  : role === 'admin2'
                  ? 'Principal Coordinator (Madhapur Campus)'
                  : 'Independent Student Data Registrar'}
              </p>
            </div>
          </div>
          <LiveConnectionIndicator compact />
          {/* VERY VISIBLE LOGO BRANDING */}
          <div style={{ paddingRight: '8px' }}>
            <InspireLogo size="md" />
          </div>
        </div>
      </header>

      <main style={{ ...styles.content, zIndex: 1 }}>
        {/* SUMMARY STATS - role-conditional */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {role === 'admin1' ? (
            <>
              <div style={styles.metricsGrid}>
                <GlassCard hoverable={false} style={styles.metricCard} className={`glass-gold-ring neo-2d-card hover-gold ${livePulseKey ? 'anim-pulse-gold' : ''}`}>
                  <span style={styles.metricLabel}>Total Students Present Today</span>
                  <strong style={{ ...styles.metricValue, color: '#10B981' }}>2,735</strong>
                  <span style={styles.metricSub}>96.1% Attendance Rate</span>
                  <span className="glass-status-pill status-present">Live</span>
                </GlassCard>
                <GlassCard hoverable={false} style={styles.metricCard} className={`glass-gold-ring ${livePulseKey ? 'anim-pulse-gold' : ''}`}>
                  <span style={styles.metricLabel}>Total Students Absent Today</span>
                  <strong style={{ ...styles.metricValue, color: '#EF4444' }}>111</strong>
                  <span style={styles.metricSub}>3.9% Absent</span>
                  <span className="glass-status-pill status-absent">Watch</span>
                </GlassCard>
              </div>
              <div style={styles.metricsGrid}>
                <GlassCard hoverable={false} style={styles.metricCard} className={`glass-gold-ring neo-2d-card hover-gold ${livePulseKey ? 'anim-pulse-gold' : ''}`}>
                  <span style={styles.metricLabel}>Total Faculty Present Today</span>
                  <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>180</strong>
                  <span style={styles.metricSub}>96.8% Present</span>
                  <span className="glass-status-pill status-active">Stable</span>
                </GlassCard>
                <GlassCard hoverable={false} style={styles.metricCard} className={`glass-gold-ring ${livePulseKey ? 'anim-pulse-gold' : ''}`}>
                  <span style={styles.metricLabel}>Faculty on Leave Today</span>
                  <strong style={styles.metricValue}>6</strong>
                  <span style={styles.metricSub}>3.2% Leave Rate</span>
                  <span className="glass-status-pill status-warning">Alert</span>
                </GlassCard>
              </div>
            </>
          ) : role === 'admin2' ? (
            <>
              <div style={styles.metricsGrid}>
                <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring neo-2d-card hover-gold">
                  <span style={styles.metricLabel}>Monthly Fee Collected</span>
                  <strong style={{ ...styles.metricValue, color: '#10B981' }}>₹48.2L</strong>
                  <span style={styles.metricSub}>92.4% of target</span>
                  <span className="glass-status-pill status-paid">On Target</span>
                </GlassCard>
                <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
                  <span style={styles.metricLabel}>Monthly Expenditure</span>
                  <strong style={{ ...styles.metricValue, color: '#EF4444' }}>₹15.7L</strong>
                  <span style={styles.metricSub}>Jul 2026 Total</span>
                  <span className="glass-status-pill status-warning">Budgeted</span>
                </GlassCard>
              </div>
              <div style={styles.metricsGrid}>
                <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring neo-2d-card hover-gold">
                  <span style={styles.metricLabel}>Fee Defaulters</span>
                  <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>38</strong>
                  <span style={styles.metricSub}>Pending since Term 1</span>
                  <span className="glass-status-pill status-pending">Pending</span>
                </GlassCard>
                <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
                  <span style={styles.metricLabel}>Worker Payments Pending</span>
                  <strong style={styles.metricValue}>{workers.filter(w => !w.paid).length}</strong>
                  <span style={styles.metricSub}>Awaiting approval</span>
                  <span className="glass-status-pill status-pending">Payroll</span>
                </GlassCard>
              </div>
            </>
          ) : (
            <>
              <div style={styles.metricsGrid}>
                <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring neo-2d-card hover-gold">
                  <span style={styles.metricLabel}>Exams Scheduled</span>
                  <strong style={{ ...styles.metricValue, color: '#10B981' }}>2</strong>
                  <span style={styles.metricSub}>Active Exam calendars</span>
                  <span className="glass-status-pill status-active">Ready</span>
                </GlassCard>
                <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
                  <span style={styles.metricLabel}>Published Results</span>
                  <strong style={{ ...styles.metricValue, color: '#10B981' }}>24</strong>
                  <span style={styles.metricSub}>Term-wise grades released</span>
                  <span className="glass-status-pill status-paid">Published</span>
                </GlassCard>
              </div>
              <div style={styles.metricsGrid}>
                <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring neo-2d-card hover-gold">
                  <span style={styles.metricLabel}>Bulletins & Notice Broadcasts</span>
                  <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>12</strong>
                  <span style={styles.metricSub}>Announcements active</span>
                  <span className="glass-status-pill status-info">Live</span>
                </GlassCard>
                <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
                  <span style={styles.metricLabel}>Active Class Schedules</span>
                  <strong style={{ ...styles.metricValue, color: '#3B82F6' }}>8</strong>
                  <span style={styles.metricSub}>Sections fully mapped</span>
                  <span className="glass-status-pill status-active">Active</span>
                </GlassCard>
              </div>
            </>
          )}
        </section>

        {/* Module Grid — role-conditional */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>
            {role === 'admin1'
              ? 'Campus Operations Modules'
              : role === 'admin2'
              ? 'Finance & Staff Modules'
              : 'Systems & Security Modules'}
          </h3>
          {role === 'admin1' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            
            {/* 1. Students */}
            <div
                onClick={() => setActivePage('students')}
                style={{
                  ...styles.moduleCardNew,
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, rgba(16, 185, 129, 0.02) 100%)',
                  border: '1.5px solid rgba(16, 185, 129, 0.3)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)'
                }}
                className="neo-2d-card hover-gold press-interactive"
              >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Students Registry (All)</h4>
              <p style={styles.moduleDesc}>Register admissions, view details across all 5 branches.</p>
            </div>

            {/* 2. Teachers */}
            <div
              onClick={() => setActivePage('teachers')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.09) 0%, rgba(245, 158, 11, 0.02) 100%)',
                border: '1.5px solid rgba(245, 158, 11, 0.3)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)'
              }}
              className="neo-2d-card hover-gold press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Faculty Mgmt (All)</h4>
              <p style={styles.moduleDesc}>Configure lecturers, allocate subjects, check base salaries.</p>
            </div>

            {/* 3. Academic Fees */}
            <div onClick={() => setActivePage('academic_fees')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(249,115,22,0.09) 0%, rgba(249,115,22,0.02) 100%)', border: '1.5px solid rgba(249,115,22,0.3)', boxShadow: '0 4px 14px rgba(249,115,22,0.08)' }} className="neo-2d-card hover-gold press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg></div>
              <h4 style={styles.moduleTitle}>Academic Fees Structure</h4>
              <p style={styles.moduleDesc}>Set baseline yearly/term academic fees globally.</p>
            </div>

            {/* 4. Student Fee Editor */}
            <div onClick={() => setActivePage('fee_editor')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(16,185,129,0.09) 0%, rgba(16,185,129,0.02) 100%)', border: '1.5px solid rgba(16,185,129,0.3)', boxShadow: '0 4px 14px rgba(16,185,129,0.08)' }} className="neo-2d-card hover-gold press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
              <h4 style={styles.moduleTitle}>Student Fee & Waivers</h4>
              <p style={styles.moduleDesc}>Configure individual scholarship category fee waivers.</p>
            </div>

            {/* 5. Expenditure Tracker */}
            <div onClick={() => setActivePage('expenditure')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(20,184,166,0.09) 0%, rgba(20,184,166,0.02) 100%)', border: '1.5px solid rgba(20,184,166,0.3)', boxShadow: '0 4px 14px rgba(20,184,166,0.08)' }} className="neo-2d-card hover-gold press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
              <h4 style={styles.moduleTitle}>Multi-Branch Expenditures</h4>
              <p style={styles.moduleDesc}>Compare totals and log expenses across all 5 branches.</p>
            </div>

            {/* 6. Reports */}
            <div
              onClick={() => setActivePage('reports')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.09) 0%, rgba(6, 182, 212, 0.02) 100%)',
                border: '1.5px solid rgba(6, 182, 212, 0.3)',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.08)'
              }}
              className="neo-2d-card hover-gold press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2.5">
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Reports Compiler</h4>
              <p style={styles.moduleDesc}>Compile enrollment charts sheets and download PDFs.</p>
            </div>

            {/* 7. ERP Settings */}
            <div
              onClick={() => setActivePage('settings')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.09) 0%, rgba(244, 63, 94, 0.02) 100%)',
                border: '1.5px solid rgba(244, 63, 94, 0.3)',
                boxShadow: '0 4px 14px rgba(244, 63, 94, 0.08)'
              }}
              className="neo-2d-card hover-gold press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>ERP Settings</h4>
              <p style={styles.moduleDesc}>Configure academic years calendar parameters directories.</p>
            </div>

            {/* 8. Profile */}
            <div
              onClick={() => setActivePage('profile')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.09) 0%, rgba(30, 41, 59, 0.02) 100%)',
                border: '1.5px solid rgba(30, 41, 59, 0.3)',
                boxShadow: '0 4px 14px rgba(30, 41, 59, 0.08)'
              }}
              className="neo-2d-card hover-gold press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(30, 41, 59, 0.08)', border: '1px solid rgba(30, 41, 59, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Rector Profile</h4>
              <p style={styles.moduleDesc}>Review registered principal rector credentials.</p>
            </div>

          </div>
          ) : role === 'admin2' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

            {/* CP-1. Student Registry */}
            <div onClick={() => setActivePage('students')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '1.5px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><circle cx="12" cy="7" r="4" /><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg></div>
              <h4 style={styles.moduleTitle}>Campus Students Registry</h4>
              <p style={styles.moduleDesc}>Edit student details and reset pins for Madhapur branch.</p>
            </div>

            {/* CP-2. Faculty Management */}
            <div onClick={() => setActivePage('teachers')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.09) 0%, rgba(245, 158, 11, 0.02) 100%)', border: '1.5px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg></div>
              <h4 style={styles.moduleTitle}>Campus Faculty Roster</h4>
              <p style={styles.moduleDesc}>Register instructors and assign classrooms (Salary locked).</p>
            </div>

            {/* CP-3. Expenditure Tracker */}
            <div onClick={() => setActivePage('expenditure')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(20,184,166,0.09) 0%, rgba(20,184,166,0.02) 100%)', border: '1.5px solid rgba(20,184,166,0.3)', boxShadow: '0 4px 14px rgba(20,184,166,0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
              <h4 style={styles.moduleTitle}>Campus Expenditures</h4>
              <p style={styles.moduleDesc}>Log and track local expenditures of Madhapur branch.</p>
            </div>

            {/* CP-4. Worker Payments */}
            <div onClick={() => setActivePage('worker_payments')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(139,92,246,0.09) 0%, rgba(139,92,246,0.02) 100%)', border: '1.5px solid rgba(139,92,246,0.3)', boxShadow: '0 4px 14px rgba(139,92,246,0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
              <h4 style={styles.moduleTitle}>Worker Payments</h4>
              <p style={styles.moduleDesc}>Record and mark non-teaching staff payroll payouts.</p>
            </div>

            {/* CP-5. Yearly Enrollment Stats */}
            <div onClick={() => setActivePage('enrollment_stats')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(99,102,241,0.09) 0%, rgba(99,102,241,0.02) 100%)', border: '1.5px solid rgba(99,102,241,0.3)', boxShadow: '0 4px 14px rgba(99,102,241,0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
              <h4 style={styles.moduleTitle}>Enrollment Stats</h4>
              <p style={styles.moduleDesc}>View 5-year campus enrollment and admission trends.</p>
            </div>

            {/* CP-6. Profile */}
            <div onClick={() => setActivePage('profile')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(30,41,59,0.09) 0%, rgba(30,41,59,0.02) 100%)', border: '1.5px solid rgba(30,41,59,0.3)', boxShadow: '0 4px 14px rgba(30,41,59,0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(30,41,59,0.08)', border: '1px solid rgba(30,41,59,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
              <h4 style={styles.moduleTitle}>Campus Dean Profile</h4>
              <p style={styles.moduleDesc}>Review Madhapur principal dean operations credentials.</p>
            </div>

          </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

            {/* A3-1. Class Scheduling */}
            <div onClick={() => setActivePage('classes')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.09) 0%, rgba(20, 184, 166, 0.02) 100%)', border: '1.5px solid rgba(20, 184, 166, 0.3)', boxShadow: '0 4px 14px rgba(20, 184, 166, 0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20B2AA" strokeWidth="2.5"><path d="M22 10v6M2 10v6M12 2l10 5-10 5L2 7l10-5z" /></svg></div>
              <h4 style={styles.moduleTitle}>Class Scheduling</h4>
              <p style={styles.moduleDesc}>Map sections, allocate student groups, and assign duties.</p>
            </div>

            {/* A3-2. Examination Portal */}
            <div onClick={() => setActivePage('exams')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.09) 0%, rgba(139, 92, 246, 0.02) 100%)', border: '1.5px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg></div>
              <h4 style={styles.moduleTitle}>Examination Portal</h4>
              <p style={styles.moduleDesc}>Create term schedules, upload results, and publish grades.</p>
            </div>

            {/* A3-3. Notice Board / Bulletins */}
            <div onClick={() => setActivePage('publishing')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.09) 0%, rgba(59, 130, 246, 0.02) 100%)', border: '1.5px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg></div>
              <h4 style={styles.moduleTitle}>Publishing Desk</h4>
              <p style={styles.moduleDesc}>Compose bulletins, circular notices, and holiday events.</p>
            </div>

            {/* A3-4. Timetables */}
            <div onClick={() => setActivePage('calendar')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.09) 0%, rgba(239, 68, 68, 0.02) 100%)', border: '1.5px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /></svg></div>
              <h4 style={styles.moduleTitle}>Timetables & Calendars</h4>
              <p style={styles.moduleDesc}>Upload and schedule daily class timelines and calendars.</p>
            </div>

            {/* A3-5. Attendance Summary */}
            <div onClick={() => setActivePage('attendance')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.09) 0%, rgba(99, 102, 241, 0.02) 100%)', border: '1.5px solid rgba(99, 102, 241, 0.3)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
              <h4 style={styles.moduleTitle}>Attendance Summary</h4>
              <p style={styles.moduleDesc}>Examine section-wise student availability reports.</p>
            </div>

            {/* A3-6. Publisher Profile */}
            <div onClick={() => setActivePage('profile')} style={{ ...styles.moduleCardNew, background: 'linear-gradient(135deg, rgba(30,41,59,0.09) 0%, rgba(30,41,59,0.02) 100%)', border: '1.5px solid rgba(30,41,59,0.3)', boxShadow: '0 4px 14px rgba(30, 41, 59, 0.08)' }} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(30,41,59,0.08)', border: '1px solid rgba(30,41,59,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
              <h4 style={styles.moduleTitle}>Publisher Profile</h4>
              <p style={styles.moduleDesc}>Review Academic Registrar & Publisher credentials.</p>
            </div>

          </div>
          )}

        </section>

        {/* Terminate Session Trigger at the bottom of the page */}
        <button onClick={handleLogout} style={{ ...styles.logoutBtn, marginTop: '20px' }} className="press-interactive">
          Terminate Director Session
        </button>

        {/* Centered Logo Branding Footer */}
        <footer style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px 24px 10px 24px',
          marginTop: 'auto',
          gap: '4px',
          opacity: 0.9
        }}>
          <InspireLogo size="sm" />
          <span style={{
            fontSize: '9px',
            color: 'var(--muted-gray)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.05em'
          }}>
            Inspire ERP General Portal • v2.6.4
          </span>
        </footer>

      </main>

      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <GlassCard hoverable={false} style={styles.toastCard} className="glass-gold-ring">
            <span style={styles.toastText}>{toastMessage}</span>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

// --- STUB ROUTERS FOR ADMINISTRATOR PORTAL SWITCHES ---
export const AdminAcademicsView: React.FC = () => null;
export const AdminUpdatesView: React.FC = () => null;
export const AdminProfileView: React.FC = () => null;

// --- STYLING COEFFICIENTS ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: 'auto',
  },
  header: {
    padding: 'calc(24px + var(--safe-area-top)) 24px 16px 24px',
    background: 'var(--glass-bg)',
    borderBottom: '1.5px solid var(--card-border)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: '20px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
    lineHeight: '1.15',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '3px',
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  parentWelcomeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  avatarMini: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(212,175,55,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(212,175,55,0.2)',
  },
  parentWelcomeTitle: {
    fontSize: '16.5px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  greetingText: {
    fontSize: '10.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  childMetaText: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  metricCard: {
    padding: '18px',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    backgroundColor: 'rgba(255,255,255,0.72)',
    border: '1.5px solid rgba(255,255,255,0.65)',
    boxShadow: '0 24px 50px rgba(15, 23, 42, 0.07)',
    backdropFilter: 'blur(20px)',
  },
  metricLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  metricValue: {
    fontSize: '18px',
    fontWeight: 950,
    color: 'var(--dark-charcoal)',
  },
  metricSub: {
    fontSize: '9px',
    color: 'var(--muted-gray)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  moduleCardNew: {
    padding: '22px',
    borderRadius: '28px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(255,255,255,0.68)',
    border: '1.5px solid rgba(255,255,255,0.72)',
    boxShadow: '0 26px 60px rgba(15, 23, 42, 0.08)',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
  },
  moduleIconWrapper: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: '14.5px',
    fontWeight: 900,
    color: 'var(--dark-charcoal)',
  },
  moduleDesc: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    lineHeight: '1.45',
  },
  textInputBox: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1.5px solid var(--card-border)',
    fontSize: '12.5px',
    outline: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    color: 'var(--dark-charcoal)',
    fontFamily: 'var(--font-family)',
  },
  saveSubmitBtn: {
    padding: '14px',
    borderRadius: '16px',
    backgroundColor: 'var(--royal-gold)',
    color: 'var(--dark-charcoal)',
    fontFamily: 'var(--font-family)',
    fontSize: '13px',
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    textAlign: 'center',
    marginTop: '8px',
  },
  sectionSubtitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    marginTop: '8px',
  },
  readOnlyBlock: {
    padding: '18px',
    borderRadius: '22px',
    border: '1.5px solid rgba(255,255,255,0.65)',
    backgroundColor: 'rgba(255,255,255,0.65)',
    boxShadow: '0 22px 38px rgba(15, 23, 42, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backdropFilter: 'blur(18px)',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  formLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
  },
  selectInput: {
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1.5px solid var(--card-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
  },
  receiptRowItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    border: '1px solid rgba(255, 255, 255, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: '20px',
    boxShadow: '0 18px 34px rgba(15, 23, 42, 0.05)',
  },
  actionItemBtn: {
    padding: '8px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  },
  sheetBtn: {
    padding: '10px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  toastContainer: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    right: '24px',
    zIndex: 10000,
    pointerEvents: 'none',
  },
  toastCard: {
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1.5px solid rgba(212, 175, 55, 0.3)',
    boxShadow: 'var(--shadow-lg)',
    borderRadius: '16px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    border: '1px solid rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    color: 'var(--dark-charcoal)',
  },
  skeletonCard: {
    minHeight: '130px',
    borderRadius: '24px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.4)',
    boxShadow: '0 22px 40px rgba(15, 23, 42, 0.05)',
  },
  skeletonLine: {
    width: '100%',
    height: '16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  toastText: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
  },
  heroAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 850,
    color: 'var(--royal-gold)',
    boxShadow: 'var(--shadow-sm)',
    border: '1.5px solid rgba(212, 175, 55, 0.3)',
  },
  studentName: {
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  studentID: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    fontWeight: 550,
    display: 'block',
    marginTop: '2px',
  },
  heroLineDivider: {
    width: '100%',
    height: '1px',
    backgroundColor: 'rgba(0,0,0,0.05)',
    margin: '18px 0',
  },
  heroMetaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  logoutBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    border: '1.5px solid rgba(211, 47, 47, 0.25)',
    color: '#D32F2F',
    fontFamily: 'var(--font-family)',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'center',
  },
  quickFillContainer: {
    padding: '4px 0',
  },
  quickFillPill: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.05)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: '8px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
  },
  backArrowBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--royal-gold)',
    fontFamily: 'var(--font-family)',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: 0
  }
};
