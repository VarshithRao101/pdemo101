import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
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
  branch?: string;
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



// ─── ADMIN DASHBOARD CONTROLLER ───
export const AdminDashboardView: React.FC<{ role?: 'admin1' | 'admin2' | 'admin3' }> = ({ role = 'admin1' }) => {
  const { user } = useNavigation();
  const loggedInCampus = user?.campus && user.campus !== 'All' ? user.campus : 'Erragattugutta C1';

  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState<string>('menu');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePulseKey, setLivePulseKey] = useState<'students' | 'attendance' | 'bulletins' | 'fees' | 'finance' | null>(null);
  const [securityKey, setSecurityKey] = useState('');

  // States
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);

  // Edit Buffer States (prevents keypress auto-save)
  const [searchAdm, setSearchAdm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // Students Registry States
  const [newStuName, setNewStuName] = useState('');
  const [newStuAdmissionNumber, setNewStuAdmissionNumber] = useState('');
  const [newStuCourse, setNewStuCourse] = useState('MPC');
  const [newStuBranch, setNewStuBranch] = useState(loggedInCampus);
  const [newStuFather, setNewStuFather] = useState('');
  const [newStuMobile, setNewStuMobile] = useState('');
  const [isRegStuOtpModalOpen, setIsRegStuOtpModalOpen] = useState(false);
  const [regStuOtpInput, setRegStuOtpInput] = useState('');

  // Faculty Management States
  const [searchFac, setSearchFac] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);

  const [newFacName, setNewFacName] = useState('');
  const [newFacSub, setNewFacSub] = useState('Physics');
  const [newFacSal, setNewFacSal] = useState('');
  const [newFacBranch, setNewFacBranch] = useState(loggedInCampus);
  const [newFacMobile, setNewFacMobile] = useState('');
  const [filterFacCampus, setFilterFacCampus] = useState('All');
  const [filterFacSubject, setFilterFacSubject] = useState('All');
  const [isFacOtpModalOpen, setIsFacOtpModalOpen] = useState(false);
  const [facOtpInput, setFacOtpInput] = useState('');
  const [facActionType, setFacActionType] = useState<'add' | 'edit'>('edit');
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [assignClass, setAssignClass] = useState('Junior MPC');
  const [assignSec, setAssignSec] = useState('Section A');
  const [assignSub] = useState('Physics');

  // Notices Composer States
  const [pubCat, setPubCat] = useState<'announcement' | 'gallery' | 'event' | 'circular' | 'notice' | 'holiday'>('announcement');
  const [newPubTitle, setNewPubTitle] = useState('');
  const [newPubContent, setNewPubContent] = useState('');
  const [editingPubId, setEditingPubId] = useState<string | null>(null);

  // Exam list States
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');

  const [feeRates, setFeeRates] = useState({
    tuition: 0,
    hostel: 0,
    transport: 0,
    misc: 0,
    isLocked: false
  });
  const [selectedFeeBranch, setSelectedFeeBranch] = useState<'Erragattugutta C1' | 'Erragattugutta C2' | 'Beemaram C1' | 'Beemaram C2'>(loggedInCampus as any);
  const [isEditingFees, setIsEditingFees] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  // Marks Registry States
  const [studentMarksList, setStudentMarksList] = useState<any[]>([]);
  const [editingMark, setEditingMark] = useState<any | null>(null);
  const [markSubject, setMarkSubject] = useState('Physics');
  const [markMidterm, setMarkMidterm] = useState('');
  const [markFinal, setMarkFinal] = useState('');

  // Calendars logs
  const [calendarEvents, setCalendarEvents] = useState<{ title: string; date: string }[]>([]);
  const [newCalTitle, setNewCalTitle] = useState('');
  const [newCalDate, setNewCalDate] = useState('');


  // Timetables and sections states
  const [timetable, setTimetable] = useState<any[]>([]);
  const [timetableSection, setTimetableSection] = useState('Section A');
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
  const [_reportsData, setReportsData] = useState<any>(null); // kept for fetchReports compat

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
  const [expenditures, setExpenditures] = useState<ExpenditureItem[]>([]);
  const [selectedExpBranch, setSelectedExpBranch] = useState<'Erragattugutta C1' | 'Erragattugutta C2' | 'Beemaram C1' | 'Beemaram C2'>(loggedInCampus as any);
  const [newExpCat, setNewExpCat] = useState('Utilities');
  const [newExpAmt, setNewExpAmt] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');


  const [workers, setWorkers] = useState<WorkerItem[]>([]);

  const [feeEditSearch, setFeeEditSearch] = useState('');
  const [selectedFeeStudent, setSelectedFeeStudent] = useState<Student | null>(null);
  const [editTuitionWaiver, setEditTuitionWaiver] = useState('0');
  const [editHostelWaiver, setEditHostelWaiver] = useState('0');
  const [editTransportWaiver, setEditTransportWaiver] = useState('0');
  const [editMiscWaiver, setEditMiscWaiver] = useState('0');

  // OTP modal state for each guarded action
  const [isFeeOtpOpen, setIsFeeOtpOpen] = useState(false);
  const [feeOtpInput, setFeeOtpInput] = useState('');
  const [isAcadFeeOtpOpen, setIsAcadFeeOtpOpen] = useState(false);
  const [acadFeeOtpInput, setAcadFeeOtpInput] = useState('');
  const [isUnlockFeeOtpOpen, setIsUnlockFeeOtpOpen] = useState(false);
  const [unlockFeeOtpInput, setUnlockFeeOtpInput] = useState('');
  const [isExpOtpOpen, setIsExpOtpOpen] = useState(false);
  const [expOtpInput, setExpOtpInput] = useState('');
  const [isWorkerOtpOpen, setIsWorkerOtpOpen] = useState(false);
  const [workerOtpInput, setWorkerOtpInput] = useState('');
  const [workerPendingAction, setWorkerPendingAction] = useState<any>(null);

  useEffect(() => {
    if (user?.campus && user.campus !== 'All') {
      setSelectedFeeBranch(user.campus as any);
      setSelectedExpBranch(user.campus as any);
      setNewStuBranch(user.campus);
      setNewFacBranch(user.campus);
    }
  }, [user, loggedInCampus]);

  // ── Admin2 Live Wiring State ──
  const [feeBreakdownData, setFeeBreakdownData] = useState<any>(null);
  const [lateFeeRulesText, setLateFeeRulesText] = useState('Loading...');
  const [scholarshipRulesText, setScholarshipRulesText] = useState('Loading...');
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('');
  const [newWorkerWage, setNewWorkerWage] = useState('');
  const [newWorkerPeriod, setNewWorkerPeriod] = useState('July 2026');


  // ── Admin2 Fetch Helpers ──
  const fetchFeeSettings = async (branch?: string) => {
    try {
      const targetBranch = branch || selectedFeeBranch;
      const data = await admin2Service.getFeeSettings(targetBranch);
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

  const fetchStudentMarks = async () => {
    try {
      const res = await apiClient.get('/admin2/student-marks');
      if (res.status === 'success') {
        setStudentMarksList(res.data);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load student marks.');
    }
  };

  const handleSaveStudentMark = async () => {
    if (!editingMark) return;
    try {
      const res = await apiClient.patch('/admin2/student-marks', {
        studentId: editingMark.studentId,
        subject: markSubject,
        midterm: markMidterm,
        final: markFinal
      });
      if (res.status === 'success') {
        triggerToast(`Marks updated successfully for ${editingMark.name}`);
        setEditingMark(null);
        fetchStudentMarks();
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update student marks.');
    }
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
      if (data && data.teachers) {
        setTeachers(data.teachers);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to load sections and teachers.');
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
        await fetchStudentMarks();
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
  }, [activePage, role, timetableSection, refreshCurrentPage]);

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
      fetchStudentMarks();
    }
  }, [activePage, timetableSection, attendanceDate, fetchFeeSettings]);

  const triggerToast = (msg: string) => {
    const isError = msg.toLowerCase().includes('rejected') || 
                    msg.toLowerCase().includes('failed') || 
                    msg.toLowerCase().includes('denied') || 
                    msg.toLowerCase().includes('invalid') || 
                    msg.toLowerCase().includes('not found') || 
                    msg.toLowerCase().includes('error') ||
                    msg.toLowerCase().includes('incorrect');
    const symbol = isError ? '❌ ' : '✓ ';
    setToastMessage(symbol + msg);
    setTimeout(() => setToastMessage(null), 3000);
  };



  const handleSearchStudent = () => {
    if (!searchAdm || !searchAdm.trim()) {
      triggerToast('Please type an Admission or Registration number.');
      return;
    }
    const q = searchAdm.toUpperCase().trim();
    const match = students.find(s => 
      (s.admissionNumber || '').toUpperCase().trim() === q ||
      (s.registrationNumber || '').toUpperCase().trim() === q ||
      (s.studentId || '').toUpperCase().trim() === q ||
      (s.rollNumber || '').toUpperCase().trim() === q ||
      (s.name || '').toUpperCase().trim().includes(q)
    );
    if (match) {
      setSelectedStudent(match);
      setEditStudent({ ...match });
      triggerToast(`Loaded student ${match.name} (Adm No: ${match.admissionNumber || match.studentId}).`);
    } else {
      triggerToast('Student record not found for: ' + searchAdm);
    }
  };

  const handleStudentSave = async (updated: Student, keyToUse: string) => {
    if (!updated._id) return;
    try {
      setGlobalSecurityKey(keyToUse);
      const saved = await admin1Service.updateStudent(updated._id, updated);
      const next = students.map(s => s._id === saved._id ? saved : s);
      setStudents(next);
      setSelectedStudent(saved);
      setEditStudent({ ...saved });
      triggerToast('Student profile details submitted and saved to database.');
      setIsOtpModalOpen(false);
      setOtpInput('');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save student details.');
    }
  };

  const handleTeacherSave = async (updated: Teacher) => {
    setEditTeacher({ ...updated });
    setFacActionType('edit');
    setFacOtpInput('');
    setIsFacOtpModalOpen(true);
  };

  const openStudentRegOtpModal = () => {
    if (!newStuName || !newStuFather || !newStuMobile) {
      triggerToast('Please complete all basic fields.');
      return;
    }
    setRegStuOtpInput('');
    setIsRegStuOtpModalOpen(true);
  };

  const submitStudentRegistrationWithOtp = async () => {
    if (!regStuOtpInput || !regStuOtpInput.trim()) {
      triggerToast('Please enter a valid 6-digit security key.');
      return;
    }
    setGlobalSecurityKey(regStuOtpInput.trim());
    await handleRegisterStudent();
    setIsRegStuOtpModalOpen(false);
    setRegStuOtpInput('');
  };

  const handleRegisterStudent = async () => {
    if (!newStuName || !newStuFather || !newStuMobile) {
      triggerToast('Please complete all basic fields.');
      return;
    }
    const newAdm = newStuAdmissionNumber.trim() || `ADM2400${students.length + 1}`;
    
    // Get campus-specific baseline fee settings
    let campusFee = { tuition: 120000, hostel: 85000, transport: 15000, misc: 5000 };
    try {
      const fetchedFee = await admin2Service.getFeeSettings(newStuBranch);
      if (fetchedFee && fetchedFee.tuition) {
        campusFee = fetchedFee;
      }
    } catch (_e) {
      const allSettings = JSON.parse(localStorage.getItem('jc_fee_settings') || '{}');
      if (allSettings[newStuBranch]) campusFee = allSettings[newStuBranch];
    }

    const resolvedTuition = campusFee.tuition;
    const resolvedMisc = campusFee.misc;
    const resolvedHostel = 0; // Default to day scholar
    const resolvedTransport = 0;
    const resolvedPending = 0;
    const resolvedPaid = 0;
    const remainingBalance = resolvedTuition + resolvedMisc;

    const newStu: Student = {
      admissionNumber: newAdm,
      studentId: newAdm,
      qrId: `QR-8${Math.floor(Math.random() * 9000 + 1000)}`,
      registrationNumber: newAdm,
      name: newStuName,
      fatherName: newStuFather,
      motherName: 'Mrs. Devika Rao',
      mobile: newStuMobile,
      parentMobile: newStuMobile,
      email: `${newStuName.toLowerCase().replace(/ /g, '')}@inspire.edu`,
      address: `${newStuBranch} Campus, Telangana`,
      residentialAddress: 'Day Scholar',
      hostelStatus: 'Day Scholar',
      transportStatus: 'Self Transport',
      course: newStuCourse,
      section: 'Section A',
      branch: newStuBranch,
      rollNumber: newAdm,
      status: 'Active',
      documents: ['10th Marksheet.pdf', 'Aadhaar Card.pdf'],
      tuitionFee: resolvedTuition,
      hostelFee: resolvedHostel,
      transportFee: resolvedTransport,
      miscellaneousFee: resolvedMisc,
      previousPending: resolvedPending,
      totalPaid: resolvedPaid,
      remainingBalance: remainingBalance
    };

    try {
      const response = await apiClient.post('/admin/students', newStu);
      if (response && response.status === 'success') {
        const pin = response.credential?.pin || '784920';
        newStu.tempPassword = pin;
        const next = [...students, newStu];
        setStudents(next);
        setNewStuName('');
        setNewStuAdmissionNumber('');
        setNewStuFather('');
        setNewStuMobile('');
        triggerToast(`Student registered successfully! Admission No: ${newAdm} (PIN: ${pin})`);
        fetchStudents();
      } else {
        triggerToast('Failed to register student.');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error during student registration.');
    }
  };



  const handleAddTeacher = async () => {
    if (!newFacName || !newFacSal || !newFacMobile) {
      triggerToast('Please complete all basic fields.');
      return;
    }
    setFacActionType('add');
    setFacOtpInput('');
    setIsFacOtpModalOpen(true);
  };

  const submitFacOtp = async () => {
    if (!facOtpInput || !facOtpInput.trim()) {
      triggerToast('Please enter a valid security OTP.');
      return;
    }

    try {
      setGlobalSecurityKey(facOtpInput);
      if (facActionType === 'add') {
        const newId = `FAC-20${teachers.length + 1}`;
        const saved = await admin1Service.createTeacher({
          id: newId,
          name: newFacName,
          subject: newFacSub,
          salary: parseFloat(newFacSal) || 50000,
          mobile: newFacMobile,
          branch: newFacBranch
        } as any);
        setTeachers([...teachers, saved]);
        setNewFacName('');
        setNewFacSal('');
        setNewFacMobile('');
        setIsAddTeacherModalOpen(false);
        triggerToast(`Faculty member ${newFacName} registered successfully!`);
      } else if (facActionType === 'edit' && editTeacher) {
        const saved = await admin1Service.updateTeacher(editTeacher.id, editTeacher);
        const next = teachers.map(t => t.id === saved.id ? saved : t);
        setTeachers(next);
        setSelectedTeacher(null);
        setEditTeacher(null);
        triggerToast(`Faculty credentials for ${saved.name} saved successfully.`);
      }
      setIsFacOtpModalOpen(false);
      setFacOtpInput('');
    } catch (err: any) {
      triggerToast(err.message || 'Verification failed.');
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
      triggerToast(err.message || 'Failed to allocate teacher duty.');
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

  const handleSaveAcademicFees = async (otpToUse: string) => {
    if (!otpToUse || !otpToUse.trim()) {
      triggerToast('Please enter a valid 6-digit Security Authorization Key / OTP.');
      return;
    }
    try {
      setGlobalSecurityKey(otpToUse.trim());
      const saved = await admin2Service.updateFeeSettings({ ...feeRates, isLocked: true, branch: selectedFeeBranch });
      setFeeRates(saved);
      setIsEditingFees(false);
      setIsAcadFeeOtpOpen(false);
      setAcadFeeOtpInput('');
      triggerToast(`Academic baseline fees for ${selectedFeeBranch} finalized and locked.`);
      fetchStudents();
    } catch (err: any) {
      triggerToast(err.message || 'Invalid Security OTP. Failed to save fee settings.');
    }
  };

  const handleUnlockFees = () => {
    setUnlockFeeOtpInput('');
    setIsUnlockFeeOtpOpen(true);
  };

  const handleConfirmUnlockFees = async (otpToUse: string) => {
    if (!otpToUse || !otpToUse.trim()) {
      triggerToast('Please enter a valid 6-digit Security Authorization Key / OTP.');
      return;
    }
    try {
      setGlobalSecurityKey(otpToUse.trim());
      const saved = await admin2Service.updateFeeSettings({ isLocked: false, branch: selectedFeeBranch });
      setFeeRates(saved);
      setIsEditingFees(true);
      setIsUnlockFeeOtpOpen(false);
      setUnlockFeeOtpInput('');
      triggerToast(`Security OTP verified! Baseline fee rates for ${selectedFeeBranch} unlocked for editing.`);
    } catch (err: any) {
      triggerToast(err.message || 'Invalid Security OTP. Failed to unlock fee editor.');
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
            Back to Cockpit
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
          </div>

          {selectedStudent && editStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }} className="anim-fade-in">
              <div style={styles.readOnlyBlock}>
                <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '1.3rem', fontWeight: 900, color: 'var(--dark-charcoal)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                  {selectedStudent.name}
                </h3>
                <div style={styles.metaRow}><span>Admission Number</span><strong>{selectedStudent.admissionNumber}</strong></div>
                <div style={styles.metaRow}><span>Father Name</span><strong>{selectedStudent.fatherName || 'N/A'}</strong></div>
                <div style={styles.metaRow}><span>Mother Name</span><strong>{selectedStudent.motherName || 'N/A'}</strong></div>
                <div style={styles.metaRow}><span>Contact Mobile</span><strong>{selectedStudent.mobile || 'N/A'}</strong></div>
                <div style={styles.metaRow}><span>Course</span><strong>{selectedStudent.course}</strong></div>
                <div style={styles.metaRow}><span>Branch</span><strong>{selectedStudent.branch}</strong></div>
                <div style={styles.metaRow}><span>Academic Year</span><strong>2026-27</strong></div>
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
                    <label style={styles.formLabel}>Campus</label>
                    <select
                      value={editStudent.branch}
                      onChange={(e) => setEditStudent({ ...editStudent, branch: e.target.value })}
                      style={styles.selectInput}
                    >
                      <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                      <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                      <option value="Beemaram C1">Beemaram Campus C1</option>
                      <option value="Beemaram C2">Beemaram Campus C2</option>
                    </select>
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
              </div>

              {/* SAVE AND SUBMIT PROFILE CHANGES */}
              <button 
                onClick={() => { setOtpInput(''); setIsOtpModalOpen(true); }} 
                style={styles.saveSubmitBtn} 
                className="press-interactive"
              >
                Submit Student Profile Changes
              </button>
            </div>
          ) : (
            <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Register New Admission Student</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Admission Number</label>
                    <input
                      type="text"
                      placeholder={`e.g. ADM2400${students.length + 1}`}
                      value={newStuAdmissionNumber}
                      onChange={(e) => setNewStuAdmissionNumber(e.target.value)}
                      style={styles.textInputBox}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Full Student Name</label>
                    <input type="text" placeholder="e.g. Rahul Sharma" value={newStuName} onChange={(e) => setNewStuName(e.target.value)} style={styles.textInputBox} />
                  </div>
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
                    <label style={styles.formLabel}>Select Campus</label>
                    <select value={newStuBranch} onChange={(e) => setNewStuBranch(e.target.value)} style={styles.selectInput}>
                      <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                      <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                      <option value="Beemaram C1">Beemaram Campus C1</option>
                      <option value="Beemaram C2">Beemaram Campus C2</option>
                    </select>
                  </div>
                </div>
                {/* SUBMIT REGISTER DETAILS BUTTON */}
                <button onClick={openStudentRegOtpModal} style={styles.saveSubmitBtn} className="press-interactive">Submit & Create Student Profile</button>
              </div>
            </div>
          )}

          {/* STUDENT REGISTRATION OTP MODAL */}
          {isRegStuOtpModalOpen && (
            <div style={styles.overlayOverlay}>
              <div style={{ ...styles.overlaySheet, maxWidth: '440px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ ...styles.modalTitle, color: 'var(--royal-gold)', margin: 0 }}>Security Authorization OTP</h3>
                  <button onClick={() => setIsRegStuOtpModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}>×</button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted-gray)', marginBottom: '14px', lineHeight: 1.4 }}>
                  Enter your 6-digit Security Authorization Key / OTP to finalize student registration for <strong>{newStuName}</strong> (Adm No: {newStuAdmissionNumber || `ADM2400${students.length + 1}`}).
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <label style={styles.formLabel}>Enter 6-Digit Security Key (OTP)</label>
                  <input
                    type="text"
                    placeholder="Enter OTP e.g. 080200 or Daily PIN"
                    value={regStuOtpInput}
                    onChange={(e) => setRegStuOtpInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitStudentRegistrationWithOtp()}
                    style={{ ...styles.textInputBox, fontSize: '1.1rem', letterSpacing: '0.1em', fontFamily: 'monospace', borderColor: 'var(--royal-gold)' }}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setIsRegStuOtpModalOpen(false)} style={{ ...styles.actionItemBtn, flex: 1 }} className="press-interactive">Cancel</button>
                  <button onClick={submitStudentRegistrationWithOtp} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 800 }} className="press-interactive">
                    Confirm & Create Student
                  </button>
                </div>
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
      .filter(t => {
        // Role filters
        if (role === 'admin2' && t.branch !== loggedInCampus) return false;
        // Search filter
        const matchSearch = t.name.toLowerCase().includes(searchFac.toLowerCase()) || t.subject.toLowerCase().includes(searchFac.toLowerCase());
        if (!matchSearch) return false;
        // Campus filter
        if (filterFacCampus !== 'All' && t.branch !== filterFacCampus) return false;
        // Subject filter
        if (filterFacSubject !== 'All' && t.subject !== filterFacSubject) return false;
        return true;
      });

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('gold')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setSelectedTeacher(null); setEditTeacher(null); }} style={styles.backArrowBtn} className="press-interactive">
            Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Faculty Management</h1>
          <p style={styles.subtitle}>View faculty list, assign classroom duties, check salary ledgers</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1 }}>
            {/* Search Bar at the top */}
            <input
              type="text"
              placeholder="Search faculty name or subject..."
              value={searchFac}
              onChange={(e) => setSearchFac(e.target.value)}
              style={styles.textInputBox}
            />

            {/* Add Faculty button below search bar */}
            <button
              onClick={() => {
                setNewFacName('');
                setNewFacSal('');
                setNewFacMobile('');
                setNewFacBranch(loggedInCampus);
                setNewFacSub('Physics');
                setIsAddTeacherModalOpen(true);
              }}
              style={{ ...styles.saveSubmitBtn, marginTop: '4px', marginBottom: '4px' }}
              className="press-interactive"
            >
              + Add Faculty Member
            </button>

            {/* Filters below Add Faculty button */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Campus Filter</label>
                <select
                  value={filterFacCampus}
                  onChange={(e) => setFilterFacCampus(e.target.value)}
                  disabled={role === 'admin2'}
                  style={styles.selectInput}
                >
                  <option value="All">All Campuses</option>
                  <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                  <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                  <option value="Beemaram C1">Beemaram Campus C1</option>
                  <option value="Beemaram C2">Beemaram Campus C2</option>
                </select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Subject Filter</label>
                <select
                  value={filterFacSubject}
                  onChange={(e) => setFilterFacSubject(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="All">All Subjects</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>

            {/* Faculty List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {list.map(t => (
                <div key={t.id || t._id} style={styles.receiptRowItem}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px' }}>{t.name}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 600 }}>({t.subject})</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>
                      Salary: ₹{(t.salary || 0).toLocaleString('en-IN')} • Campus: {t.branch || 'Erragattugutta C1'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTeacher(t);
                      setEditTeacher({ ...t });
                    }}
                    style={styles.actionItemBtn}
                    className="press-interactive"
                  >
                    Select
                  </button>
                </div>
              ))}
              {list.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted-gray)', fontSize: '12px' }}>
                  No faculty records match your criteria.
                </div>
              )}
            </div>
          </div>

          {/* EDIT HOVER DETAILS MODAL */}
          {selectedTeacher && editTeacher && (
            <div style={styles.overlayOverlay}>
              <div style={styles.overlaySheet}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={styles.modalTitle}>Edit Faculty Details</h3>
                  <button
                    onClick={() => { setSelectedTeacher(null); setEditTeacher(null); }}
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Faculty Name</label>
                    <input
                      type="text"
                      value={editTeacher.name}
                      onChange={(e) => setEditTeacher({ ...editTeacher, name: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Campus Branch</label>
                      <select
                        value={editTeacher.branch || 'Erragattugutta C1'}
                        disabled={role === 'admin2'}
                        onChange={(e) => setEditTeacher({ ...editTeacher, branch: e.target.value })}
                        style={styles.selectInput}
                      >
                        <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                        <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                        <option value="Beemaram C1">Beemaram Campus C1</option>
                        <option value="Beemaram C2">Beemaram Campus C2</option>
                      </select>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Subject Head</label>
                      <select
                        value={editTeacher.subject}
                        onChange={(e) => setEditTeacher({ ...editTeacher, subject: e.target.value })}
                        style={styles.selectInput}
                      >
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="English">English</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Monthly Salary (₹)</label>
                      <input
                        type="number"
                        value={editTeacher.salary || ''}
                        disabled={role === 'admin2'}
                        onChange={(e) => setEditTeacher({ ...editTeacher, salary: parseFloat(e.target.value) || 0 })}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Contact Mobile</label>
                      <input
                        type="text"
                        value={editTeacher.mobile || ''}
                        onChange={(e) => setEditTeacher({ ...editTeacher, mobile: e.target.value })}
                        style={styles.textInputBox}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleTeacherSave(editTeacher)}
                    style={{ ...styles.saveSubmitBtn, marginTop: '8px' }}
                    className="press-interactive"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADD FACULTY HOVER MODAL */}
          {isAddTeacherModalOpen && (
            <div style={styles.overlayOverlay}>
              <div style={styles.overlaySheet}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={styles.modalTitle}>Add New Faculty</h3>
                  <button
                    onClick={() => setIsAddTeacherModalOpen(false)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Faculty Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Mr. K. Sharma"
                      value={newFacName}
                      onChange={(e) => setNewFacName(e.target.value)}
                      style={styles.textInputBox}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Campus Branch</label>
                      <select
                        value={newFacBranch}
                        disabled={role === 'admin2'}
                        onChange={(e) => setNewFacBranch(e.target.value)}
                        style={styles.selectInput}
                      >
                        <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                        <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                        <option value="Beemaram C1">Beemaram Campus C1</option>
                        <option value="Beemaram C2">Beemaram Campus C2</option>
                      </select>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Subject Head</label>
                      <select
                        value={newFacSub}
                        onChange={(e) => setNewFacSub(e.target.value)}
                        style={styles.selectInput}
                      >
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="English">English</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Monthly Salary (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 75000"
                        value={newFacSal}
                        onChange={(e) => setNewFacSal(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Contact Mobile</label>
                      <input
                        type="text"
                        placeholder="e.g. 9876543210"
                        value={newFacMobile}
                        onChange={(e) => setNewFacMobile(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddTeacher}
                    style={{ ...styles.saveSubmitBtn, marginTop: '8px' }}
                    className="press-interactive"
                  >
                    Submit & Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FACULTY OTP VERIFICATION OVERLAY (MODAL ON MODAL) */}
          {isFacOtpModalOpen && (
            <div style={{ ...styles.overlayOverlay, zIndex: 1100 }}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '16px', border: '1px solid var(--card-border)' }} className="anim-slide-up glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '15px', color: 'var(--dark-charcoal)' }}>Administrative OTP Gate</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted-gray)' }}>A security passcode check is required to authorize this action.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="password"
                    placeholder="Enter Security OTP (111111)"
                    value={facOtpInput}
                    onChange={(e) => setFacOtpInput(e.target.value)}
                    style={{ ...styles.textInputBox, textAlign: 'center', letterSpacing: '0.2em', fontSize: '15px', fontWeight: 800 }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button onClick={submitFacOtp} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1 }} className="press-interactive">Confirm</button>
                    <button onClick={() => { setIsFacOtpModalOpen(false); setFacOtpInput(''); }} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }} className="press-interactive">Cancel</button>
                  </div>
                </div>
              </GlassCard>
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
            Back to Cockpit
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
            Back to Cockpit
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
              {timetableFile ? ` Selected: ${timetableFile.name}` : 'Click here or drag & drop CSV/Excel sheet to upload weekly classes timetables.'}
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
            Back to Cockpit
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
                    onClick={() => { setOtpInput(''); setIsOtpModalOpen(true); }} 
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
            Back to Cockpit
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
              {resultsFile ? ` Selected: ${resultsFile.name}` : 'Click here or drag & drop CSV/Excel results sheet to upload & parse student grades.'}
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
              { rank: '1', name: 'Varshith Rao', marks: '98.4%', badge: ' Gold' },
              { rank: '2', name: 'Aaditya Varma', marks: '96.2%', badge: ' Silver' },
              { rank: '3', name: 'Rahul Khanna', marks: '92.1%', badge: ' Bronze' }
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

  // ─── SUBPAGE 7: ACADEMIC FEES ───
  if (activePage === 'academic_fees') {
    if (role !== 'admin1' && role !== 'admin2') { setActivePage('menu'); return null; }

    const locked = feeRates.isLocked && !isEditingFees;
    const feeBarItems = [
      { key: 'tuition', label: 'Academic Tuition Fee', icon: '', value: feeRates.tuition, setter: (v: number) => setFeeRates({ ...feeRates, tuition: v }) },
      { key: 'hostel', label: 'Hostel / Residential Fee', icon: '', value: feeRates.hostel, setter: (v: number) => setFeeRates({ ...feeRates, hostel: v }) },
      { key: 'transport', label: 'Transport / Bus Fee', icon: '', value: feeRates.transport, setter: (v: number) => setFeeRates({ ...feeRates, transport: v }) },
      { key: 'misc', label: 'Miscellaneous / Lab Fee', icon: '', value: feeRates.misc, setter: (v: number) => setFeeRates({ ...feeRates, misc: v }) },
    ];
    const grandTotal = feeBarItems.reduce((s, f) => s + (f.value || 0), 0);

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('orange')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setIsEditingFees(false); }} style={styles.backArrowBtn} className="press-interactive">Back to Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Academic Fee Structure</h1>
          <p style={styles.subtitle}>Configure annual baseline fee components campus-wise.</p>
        </header>

        <main style={styles.content}>
          {role === 'admin1' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', zIndex: 1 }}>
              {['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].map(b => {
                const isActive = selectedFeeBranch === b;
                return (
                  <div
                    key={b}
                    onClick={() => { setSelectedFeeBranch(b as any); fetchFeeSettings(b); }}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '10px',
                      border: isActive ? '2px solid var(--royal-gold)' : '1px solid var(--card-border)',
                      background: isActive ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.6)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '10px',
                      color: isActive ? 'var(--royal-gold)' : 'var(--dark-charcoal)'
                    }}
                    className="press-interactive"
                  >
                    {b}
                  </div>
                );
              })}
            </div>
          )}

          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Rector Baseline: {selectedFeeBranch}</h4>
              <span style={{ fontSize: '10px', fontWeight: 800, color: locked ? '#EF4444' : 'var(--royal-gold)', backgroundColor: locked ? 'rgba(239,68,68,0.06)' : 'rgba(212,175,55,0.06)', border: `1.5px solid ${locked ? '#EF4444' : 'var(--royal-gold)'}`, padding: '4px 8px', borderRadius: '8px' }}>
                {locked ? 'Locked — Rates Finalized' : 'Edit Mode Active'}
              </span>
            </div>

            {/* Horizontal fee bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {feeBarItems.map((fee, idx) => (
                <div key={fee.key} style={{ display: 'flex', alignItems: 'center', padding: '14px 4px', borderBottom: idx < feeBarItems.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', gap: '12px' }}>
                  <span style={{ fontSize: '20px', width: '32px', textAlign: 'center', flexShrink: 0 }}>{fee.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--dark-charcoal)' }}>{fee.label}</span>
                  </div>
                  <div style={{ width: '140px', flexShrink: 0 }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '10px', fontSize: '13px', fontWeight: 900, color: locked ? 'var(--muted-gray)' : 'var(--royal-gold)' }}>₹</span>
                      <input
                        type="number"
                        min="0"
                        disabled={locked}
                        value={fee.value}
                        onChange={(e) => fee.setter(parseFloat(e.target.value) || 0)}
                        style={{ ...styles.textInputBox, width: '100%', paddingLeft: '24px', textAlign: 'right', fontWeight: 800, fontSize: '14px', opacity: locked ? 0.65 : 1, borderColor: locked ? 'rgba(0,0,0,0.1)' : 'rgba(212,175,55,0.4)' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div style={{ borderTop: '2px solid var(--royal-gold)', marginTop: '10px', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 900, fontSize: '15px', color: 'var(--dark-charcoal)' }}>Total Annual Fee</span>
              <strong style={{ fontSize: '20px', fontWeight: 900, color: 'var(--royal-gold)' }}>₹{grandTotal.toLocaleString('en-IN')}</strong>
            </div>

            {/* Action buttons */}
            <div style={{ marginTop: '20px' }}>
              {locked ? (
                <button onClick={handleUnlockFees} style={{ ...styles.saveSubmitBtn, marginTop: 0, width: '100%', backgroundColor: 'var(--royal-gold)', color: 'var(--dark-charcoal)' }} className="press-interactive">
                  Unlock & Modify Fee Rates
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setAcadFeeOtpInput(''); setIsAcadFeeOtpOpen(true); }} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1 }} className="press-interactive">
                    Submit Changes
                  </button>
                  <button onClick={() => { setIsEditingFees(false); fetchFeeSettings(); }} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }} className="press-interactive">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Unlock Academic Fee Editor OTP Modal */}
          {isUnlockFeeOtpOpen && (
            <div style={styles.modalOverlay} className="anim-fade-in">
              <GlassCard hoverable={false} style={styles.modalContentCard} className="anim-scale-in glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={styles.modalIconBadge}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <h3 style={styles.modalHeading}>Unlock Fee Structure Editor</h3>
                  <p style={styles.modalSubText}>
                    Enter the <strong>Fee Structure Security OTP</strong> from the Authenticator portal to unlock baseline fee editing for <strong>{selectedFeeBranch}</strong>.
                  </p>
                  <div style={styles.otpTipBanner}>
                    💡 <strong>Tip:</strong> Copy Fee Structure OTP from Authenticator Portal or enter master PIN (080200).
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="ENTER 6-DIGIT OTP"
                    value={unlockFeeOtpInput}
                    onChange={(e) => setUnlockFeeOtpInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter' && unlockFeeOtpInput.trim()) handleConfirmUnlockFees(unlockFeeOtpInput.trim()); }}
                    style={styles.modalOtpInput}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setIsUnlockFeeOtpOpen(false); setUnlockFeeOtpInput(''); }} style={styles.modalCancelBtn} className="press-interactive">Cancel</button>
                    <button onClick={() => handleConfirmUnlockFees(unlockFeeOtpInput.trim())} disabled={!unlockFeeOtpInput.trim()} style={{ ...styles.modalConfirmBtn, opacity: unlockFeeOtpInput.trim() ? 1 : 0.5 }} className="press-interactive">
                      Verify & Unlock
                    </button>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Academic Fee Save OTP modal */}
          {isAcadFeeOtpOpen && (
            <div style={styles.modalOverlay} className="anim-fade-in">
              <GlassCard hoverable={false} style={styles.modalContentCard} className="anim-scale-in glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={styles.modalIconBadge}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </div>
                  <h3 style={styles.modalHeading}>Fee Structure Verification</h3>
                  <p style={styles.modalSubText}>
                    Enter the <strong>Academic Fee OTP</strong> from the Authenticator to finalize & propagate the new baseline fee rates for <strong>{selectedFeeBranch}</strong>.
                  </p>
                  <div style={styles.otpTipBanner}>
                    💡 <strong>Note:</strong> Saving will update fee rates for non-customized student profiles in this campus.
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="ENTER 6-DIGIT OTP"
                    value={acadFeeOtpInput}
                    onChange={(e) => setAcadFeeOtpInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter' && acadFeeOtpInput.trim()) handleSaveAcademicFees(acadFeeOtpInput.trim()); }}
                    style={styles.modalOtpInput}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setIsAcadFeeOtpOpen(false); setAcadFeeOtpInput(''); }} style={styles.modalCancelBtn} className="press-interactive">Cancel</button>
                    <button onClick={() => handleSaveAcademicFees(acadFeeOtpInput.trim())} disabled={!acadFeeOtpInput.trim()} style={{ ...styles.modalConfirmBtn, opacity: acadFeeOtpInput.trim() ? 1 : 0.5 }} className="press-interactive">
                      Confirm & Save Rates
                    </button>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── Reports Compiler removed per admin directive ───

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
              Back to Cockpit
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
              Back to Cockpit
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



  // ─── SUBPAGE 12: STUDENT FEE EDITOR (Admin 2) ───
  if (activePage === 'fee_editor') {

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
          triggerToast(err.message || 'Failed to load fee breakdown.');
        }
      } else {
        setSelectedFeeStudent(null);
        setFeeBreakdownData(null);
        triggerToast('Student not found.');
      }
    };

    const handleApplyWaivers = async (keyToUse: string) => {
      if (!selectedFeeStudent) return;
      try {
        setGlobalSecurityKey(keyToUse);
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
          setIsFeeOtpOpen(false);
          setFeeOtpInput('');
        } else {
          throw new Error(res.message || 'Failed to apply waivers via API');
        }
      } catch (err: any) {
        triggerToast(err.message || 'Failed to apply fee overrides.');
      }
    };

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('orange')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setSelectedFeeStudent(null); setFeeBreakdownData(null); }} style={styles.backArrowBtn} className="press-interactive">Back to Finance Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Student Fee Editor</h1>
          <p style={styles.subtitle}>View fee history and apply individual waivers per student</p>
        </header>
        <main style={styles.content}>
          {/* Search bar */}
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Search Student</h4>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <input type="text" placeholder="Enter Admission No or Roll No..." value={feeEditSearch} onChange={(e) => setFeeEditSearch(e.target.value)} style={{ ...styles.textInputBox, flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && handleFeeSearch()} />
              <button onClick={handleFeeSearch} style={{ ...styles.saveSubmitBtn, marginTop: 0, padding: '12px 24px' }} className="press-interactive">Load</button>
            </div>
          </GlassCard>

          {/* Student header card once loaded */}
          {selectedFeeStudent && (
            <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1, border: '1.5px solid rgba(212,175,55,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'rgba(212,175,55,0.1)', border: '2px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900, color: 'var(--royal-gold)' }}>
                  {selectedFeeStudent.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--dark-charcoal)' }}>{selectedFeeStudent.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                    <strong>ID:</strong> {selectedFeeStudent.admissionNumber} &nbsp;|&nbsp; <strong>Course:</strong> {selectedFeeStudent.course} &nbsp;|&nbsp; <strong>Branch:</strong> {selectedFeeStudent.branch}
                  </div>
                </div>
              </div>

              {/* Fee ledger breakdown */}
              {feeBreakdownData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Fee Transaction History</h5>
                  <div style={styles.metaRow}><span>Base Tuition Fee</span><strong>₹{(feeBreakdownData.tuitionFee||0).toLocaleString('en-IN')}</strong></div>
                  {feeBreakdownData.hostelFee > 0 && <div style={styles.metaRow}><span>Hostel Fee</span><strong>₹{feeBreakdownData.hostelFee.toLocaleString('en-IN')}</strong></div>}
                  {feeBreakdownData.transportFee > 0 && <div style={styles.metaRow}><span>Transport Fee</span><strong>₹{feeBreakdownData.transportFee.toLocaleString('en-IN')}</strong></div>}
                  {feeBreakdownData.miscFee > 0 && <div style={styles.metaRow}><span>Miscellaneous Fee</span><strong>₹{feeBreakdownData.miscFee.toLocaleString('en-IN')}</strong></div>}
                  {feeBreakdownData.previousPending > 0 && <div style={styles.metaRow}><span>Previous Pending</span><strong>₹{feeBreakdownData.previousPending.toLocaleString('en-IN')}</strong></div>}
                  <div style={{ ...styles.metaRow, borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '8px', marginTop: '4px' }}><span><strong>Total Base Fee</strong></span><strong>₹{(feeBreakdownData.baseFee||0).toLocaleString('en-IN')}</strong></div>
                  {feeBreakdownData.scholarshipDeduction > 0 && (
                    <div style={{ ...styles.metaRow, color: '#2E7D32' }}>
                      <span>Scholarship ({feeBreakdownData.scholarshipCategory}: {feeBreakdownData.scholarshipPct}%)</span>
                      <strong>- ₹{feeBreakdownData.scholarshipDeduction.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  {feeBreakdownData.individualOverrideDeduction > 0 && (
                    <div style={{ ...styles.metaRow, color: '#2E7D32' }}>
                      <span>Fee Waivers Applied</span>
                      <strong>- ₹{feeBreakdownData.individualOverrideDeduction.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div style={{ ...styles.metaRow, color: '#D32F2F', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '8px', marginTop: '4px' }}><span>Total Paid by Student</span><strong>- ₹{(feeBreakdownData.totalPaid||0).toLocaleString('en-IN')}</strong></div>
                  <div style={{ ...styles.metaRow, backgroundColor: 'rgba(212,175,55,0.08)', padding: '12px', borderRadius: '12px', marginTop: '6px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--royal-gold)' }}>Remaining Balance</span>
                    <strong style={{ fontSize: '16px', color: 'var(--royal-gold)', fontWeight: 900 }}>₹{(feeBreakdownData.remainingBalance||0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '12px' }}>Loading fee breakdown…</div>
              )}
            </GlassCard>
          )}

          {/* Modified fees section */}
          {selectedFeeStudent && (
            <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
              <h4 style={{ ...styles.sectionSubtitle, color: 'var(--royal-gold)' }}>Modify Fee Waivers & Custom Overrides</h4>
              <p style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px', marginBottom: '14px' }}>Individual fee overrides & waivers are locked to the student profile upon verification.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[['Tuition Waiver (₹)', editTuitionWaiver, setEditTuitionWaiver], ['Hostel Waiver (₹)', editHostelWaiver, setEditHostelWaiver], ['Transport Waiver (₹)', editTransportWaiver, setEditTransportWaiver], ['Misc Waiver (₹)', editMiscWaiver, setEditMiscWaiver]].map(([label, val, setter]: any) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>{label}</label>
                    <input type="number" min="0" value={val} onChange={(e) => setter(e.target.value)} style={styles.textInputBox} />
                  </div>
                ))}
              </div>
              <button onClick={() => { setFeeOtpInput(''); setIsFeeOtpOpen(true); }} style={{ ...styles.saveSubmitBtn, marginTop: '16px' }} className="press-interactive">
                Submit Fee Override Changes
              </button>
            </GlassCard>
          )}

          {/* OTP modal for fee override */}
          {isFeeOtpOpen && selectedFeeStudent && (
            <div style={styles.modalOverlay} className="anim-fade-in">
              <GlassCard hoverable={false} style={styles.modalContentCard} className="anim-scale-in glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={styles.modalIconBadge}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <h3 style={styles.modalHeading}>Fee Override Verification</h3>
                  <p style={styles.modalSubText}>
                    Enter the <strong>Fee Override Security OTP</strong> from the Authenticator portal to apply fee changes for <strong>{selectedFeeStudent.name}</strong>.
                  </p>
                  <div style={styles.otpTipBanner}>
                    💡 <strong>Tip:</strong> Copy Fee Override OTP from Authenticator Portal or enter master PIN (080200).
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="ENTER 6-DIGIT OTP"
                    value={feeOtpInput}
                    onChange={(e) => setFeeOtpInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter' && feeOtpInput.trim()) handleApplyWaivers(feeOtpInput.trim()); }}
                    style={styles.modalOtpInput}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setIsFeeOtpOpen(false); setFeeOtpInput(''); }} style={styles.modalCancelBtn} className="press-interactive">Cancel</button>
                    <button onClick={() => handleApplyWaivers(feeOtpInput.trim())} disabled={!feeOtpInput.trim()} style={{ ...styles.modalConfirmBtn, opacity: feeOtpInput.trim() ? 1 : 0.5 }} className="press-interactive">
                      Confirm & Apply Waivers
                    </button>
                  </div>
                </div>
              </GlassCard>
            </div>
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
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">Back to Finance Cockpit</button>
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
    const handleLogExpenditure = async (keyToUse: string) => {
      if (!newExpAmt || !newExpDesc) { triggerToast('Please fill all fields.'); return; }
      try {
        setGlobalSecurityKey(keyToUse);
        await admin2Service.createExpenditure({
          category: newExpCat,
          amount: Number(newExpAmt),
          description: newExpDesc
        });
        setNewExpAmt(''); setNewExpDesc('');
        setIsExpOtpOpen(false); setExpOtpInput('');
        triggerToast('Expenditure logged successfully.');
        fetchExpenditures();
      } catch (err: any) { triggerToast(err.message || 'Failed to log expenditure.'); }
    };

    const handleDeleteExpenditure = async (exp: ExpenditureItem) => {
      if (role !== 'admin1') { triggerToast('Only the Rector (Admin 1) can delete expenditure entries.'); return; }
      const id = exp._id || exp.id;
      if (!id) return;
      try {
        await admin2Service.deleteExpenditure(id);
        triggerToast('Expenditure entry deleted.');
        fetchExpenditures();
      } catch (err: any) { triggerToast(err.message || 'Failed to delete expenditure.'); }
    };

    const handleDownloadExpenditureReport = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        triggerToast('Popup blocked by browser.');
        return;
      }

      const campus = role === 'admin1' ? selectedExpBranch : loggedInCampus;
      const list = role === 'admin1'
        ? expenditures.filter(e => e.branch === selectedExpBranch)
        : expenditures.filter(e => e.branch === loggedInCampus);

      const catTotals: { [key: string]: number } = {};
      let total = 0;
      list.forEach(e => {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
        total += e.amount;
      });

      const categories = Object.keys(catTotals);
      let svgBars = '';
      categories.forEach((cat, index) => {
        const amt = catTotals[cat];
        const width = total > 0 ? (amt / total) * 270 : 0;
        const y = 30 + index * 24;
        
        svgBars += `
          <text x="10" y="${y + 12}" font-size="9" font-weight="bold" fill="#475569">${cat}</text>
          <rect x="90" y="${y}" width="280" height="14" rx="4" fill="#cbd5e1" />
          <rect x="90" y="${y}" width="${width}" height="14" rx="4" fill="#0D9488" />
          <text x="${95 + width}" y="${y + 11}" font-size="8.5" font-weight="bold" fill="#0D9488">₹${amt.toLocaleString('en-IN')}</text>
        `;
      });

      const chartHeight = 40 + categories.length * 24;
      const svgChart = `
        <svg width="100%" height="${chartHeight}" viewBox="0 0 400 ${chartHeight}" xmlns="http://www.w3.org/2000/svg" style="font-family: sans-serif; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <text x="10" y="18" font-size="11" font-weight="bold" fill="#0F766E">CAMPUS EXPENDITURES BY CATEGORY</text>
          ${svgBars}
        </svg>
      `;

      const reportHtml = `
        <html>
        <head>
          <title>Expenditure Report — ${campus}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: Inter, ui-sans-serif, sans-serif; color: #1E293B; margin: 0; padding: 0; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0D9488; padding-bottom: 12px; margin-bottom: 20px; }
            .brand-name { font-size: 18px; font-weight: 900; color: #0F766E; text-transform: uppercase; }
            .brand-sub { font-size: 10px; color: #64748B; margin-top: 2px; }
            .report-title { font-size: 16px; font-weight: 800; text-align: right; }
            .report-meta { font-size: 10px; color: #64748B; text-align: right; margin-top: 4px; }
            .chart-container { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #E2E8F0; padding: 8px 10px; text-align: left; }
            th { background: #F1F5F9; color: #0F766E; font-size: 9px; text-transform: uppercase; font-weight: 800; }
            td { font-size: 11px; }
            .total-row { font-weight: 800; background: #F8FAFC; border-top: 2px solid #0D9488; }
            .no-print { text-align: right; margin-bottom: 10px; }
            .print-btn { padding: 8px 16px; background: #0D9488; border: none; border-radius: 6px; color: #fff; font-weight: 700; cursor: pointer; }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" class="print-btn">Print Report</button>
          </div>
          <div class="header">
            <div>
              <div class="brand-name">Inspire Group of Colleges</div>
              <div class="brand-sub">Campus: ${campus} • Expenditure Audit System</div>
            </div>
            <div>
              <div class="report-title">Expenditure Summary Report</div>
              <div class="report-meta">Generated on: ${new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          <div class="chart-container">
            ${list.length > 0 ? svgChart : '<div style="padding: 20px; text-align: center; color: #64748B;">No category chart data.</div>'}
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(e => `
                <tr>
                  <td>${typeof e.date === 'string' ? e.date.split('T')[0] : e.date}</td>
                  <td>${e.category}</td>
                  <td>${e.description}</td>
                  <td style="text-align: right;">₹${e.amount.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3">Grand Total</td>
                <td style="text-align: right;">₹${total.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          
          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.print();
              }, 250);
            });
          </script>
        </body>
        </html>
      `;
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.focus();
    };

    const handleDownloadBill = (exp: ExpenditureItem) => {
      const dateStr = typeof exp.date === 'string' ? exp.date.split('T')[0] : String(exp.date || '');
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Expenditure Bill — ${exp.category}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a1a;padding:40px;}
    .page{max-width:720px;margin:auto;border:2px solid #D4AF37;border-radius:16px;overflow:hidden;}
    .header{background:linear-gradient(135deg,#1a1a2e 0%,#0d1b2a 100%);padding:32px 40px;display:flex;justify-content:space-between;align-items:center;}
    .logo-text{color:#D4AF37;font-size:22px;font-weight:900;letter-spacing:0.04em;}
    .logo-sub{color:rgba(212,175,55,0.6);font-size:11px;font-weight:700;margin-top:2px;}
    .bill-no{color:rgba(212,175,55,0.8);font-size:12px;font-weight:700;text-align:right;}
    .body{padding:36px 40px;}
    .title{font-size:28px;font-weight:900;color:#1a1a1a;margin-bottom:4px;}
    .sub{font-size:13px;color:#666;margin-bottom:32px;}
    .row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:14px;}
    .row:last-of-type{border-bottom:none;}
    .row span{color:#888;}
    .row strong{font-weight:700;color:#1a1a1a;}
    .total-row{display:flex;justify-content:space-between;align-items:center;background:#fffbea;border:2px solid #D4AF37;border-radius:12px;padding:16px 20px;margin-top:20px;}
    .total-label{font-size:14px;font-weight:700;color:#1a1a1a;}
    .total-amt{font-size:28px;font-weight:900;color:#D4AF37;}
    .footer{background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999;}
    .stamp{display:inline-block;border:2px solid #D4AF37;border-radius:8px;padding:6px 16px;font-size:11px;font-weight:700;color:#D4AF37;margin-top:12px;letter-spacing:0.08em;}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo-text">INSPIRE COLLEGES</div>
      <div class="logo-sub">Expenditure Management System</div>
    </div>
    <div class="bill-no">
      Bill #${(exp._id || exp.id || 'N/A').toString().slice(-8).toUpperCase()}<br/>
      Date: ${dateStr}
    </div>
  </div>
  <div class="body">
    <div class="title">Expenditure Bill</div>
    <div class="sub">Official record for internal financial audit</div>
    <div class="row"><span>Category</span><strong>${exp.category}</strong></div>
    <div class="row"><span>Description</span><strong>${exp.description}</strong></div>
    <div class="row"><span>Branch / Campus</span><strong>${exp.branch || 'N/A'}</strong></div>
    <div class="row"><span>Date of Expenditure</span><strong>${dateStr}</strong></div>
    <div class="row"><span>Logged By</span><strong>Administrator — ${role === 'admin1' ? 'Rector' : 'Principal'}</strong></div>
    <div class="total-row">
      <div class="total-label">Total Amount Spent</div>
      <div class="total-amt">₹${exp.amount.toLocaleString('en-IN')}</div>
    </div>
    <div style="margin-top:20px;text-align:right;">
      <div class="stamp"> APPROVED</div>
    </div>
  </div>
  <div class="footer">
    This document is system-generated by the Inspire ERP — Expenditure Tracker. For queries contact finance@inspirecolleges.edu
  </div>
</div>
</body>
</html>`;
      const win = window.open('', '_blank', 'width=800,height=900');
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 600);
      }
    };

    // Filter recent entries based on role
    const filteredExpenditures = role === 'admin1'
      ? expenditures.filter(e => e.branch === selectedExpBranch)
      : expenditures.filter(e => e.branch === loggedInCampus);

    const totalFiltered = filteredExpenditures.reduce((s, e) => s + e.amount, 0);

    const getBranchTotal = (b: string) => expenditures.filter(e => e.branch === b).reduce((s, e) => s + e.amount, 0);

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('teal')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">Back to Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Expenditure Tracker</h1>
          <p style={styles.subtitle}>{role === 'admin1' ? 'Multi-branch expenditure monitoring console' : 'Log and monitor campus expenditures'}</p>
        </header>
        <main style={styles.content}>
          {/* Admin 1 Branch Overview Cards */}
          {role === 'admin1' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px', zIndex: 1 }}>
              {['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].map(b => {
                const total = getBranchTotal(b);
                const isActive = selectedExpBranch === b;
                return (
                  <div key={b} onClick={() => setSelectedExpBranch(b as any)} style={{ padding: '12px 10px', borderRadius: '12px', border: isActive ? '2px solid var(--royal-gold)' : '1px solid rgba(255,255,255,0.1)', background: isActive ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} className="press-interactive">
                    <div style={{ fontSize: '10px', color: isActive ? 'var(--royal-gold)' : 'var(--muted-gray)', fontWeight: 800 }}>{b}</div>
                    <strong style={{ fontSize: '14px', color: '#EF4444', display: 'block', marginTop: '4px' }}>₹{total.toLocaleString('en-IN')}</strong>
                  </div>
                );
              })}
            </div>
          )}

          {/* Log form */}
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>
              Log New Expenditure {role === 'admin1' ? `(For ${selectedExpBranch})` : `(Campus: ${loggedInCampus})`}
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
            <button onClick={() => { if (!newExpAmt || !newExpDesc) { triggerToast('Please fill all fields.'); return; } setExpOtpInput(''); setIsExpOtpOpen(true); }} style={{ ...styles.saveSubmitBtn, marginTop: '14px' }} className="press-interactive">
              Log Expenditure
            </button>
          </GlassCard>

          {/* Recent entries */}
          <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>
                Recent Entries {role === 'admin1' ? `(${selectedExpBranch})` : `(${loggedInCampus})`} — Total: ₹{totalFiltered.toLocaleString('en-IN')}
              </h4>
              <button 
                onClick={handleDownloadExpenditureReport} 
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '8px', 
                  border: '2px solid rgba(13,148,136,0.3)', 
                  backgroundColor: 'rgba(13,148,136,0.08)', 
                  color: '#0D9488', 
                  fontWeight: 800, 
                  fontSize: '11px', 
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)'
                }} 
                className="press-interactive"
              >
                Download PDF Report
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {filteredExpenditures.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '12px' }}>No expenditure entries logged for this branch.</div>
              ) : (
                filteredExpenditures.map((exp, i) => (
                  <div key={exp._id || i} style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--card-border)', backgroundColor: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--dark-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.category} — {exp.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>{typeof exp.date === 'string' ? exp.date.split('T')[0] : exp.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <strong style={{ fontSize: '14px', color: '#EF4444' }}>₹{exp.amount.toLocaleString('en-IN')}</strong>
                      <button onClick={() => handleDownloadBill(exp)} style={{ fontSize: '10px', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(212,175,55,0.4)', backgroundColor: 'rgba(212,175,55,0.06)', color: 'var(--royal-gold)', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }} title="Download Bill">Bill</button>
                      {role === 'admin1' && (
                        <button onClick={() => handleDeleteExpenditure(exp)} style={{ fontSize: '10px', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }}>Delete</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Expenditure OTP modal */}
          {isExpOtpOpen && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '20px', margin: '0 16px' }} className="anim-slide-up glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(212,175,55,0.1)', border: '2px solid rgba(212,175,55,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 12px' }}></div>
                  <h3 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '1.15rem', color: 'var(--dark-charcoal)' }}>Expenditure Verification</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted-gray)', lineHeight: 1.5 }}>Enter the <strong>Expenditure OTP</strong> from the Authenticator to log this entry.</p>
                  <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: '10px', fontSize: '12px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>{newExpCat} — {newExpDesc}</div>
                    <div style={{ color: '#EF4444', fontWeight: 900, fontSize: '16px', marginTop: '4px' }}>₹{Number(newExpAmt).toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" autoFocus placeholder="Enter 6-character OTP..." value={expOtpInput} onChange={(e) => setExpOtpInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter' && expOtpInput.trim()) handleLogExpenditure(expOtpInput.trim()); }} style={{ padding: '13px 16px', border: '2px solid rgba(212,175,55,0.5)', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.15em', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.8)', outline: 'none', fontFamily: 'monospace', color: 'var(--dark-charcoal)' }} />
                  <button onClick={() => handleLogExpenditure(expOtpInput.trim())} disabled={!expOtpInput.trim()} style={{ ...styles.saveSubmitBtn, marginTop: 0, opacity: expOtpInput.trim() ? 1 : 0.5 }} className="press-interactive">Confirm & Log Entry</button>
                  <button onClick={() => { setIsExpOtpOpen(false); setExpOtpInput(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted-gray)', fontFamily: 'var(--font-family)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: '4px' }}>Cancel</button>
                </div>
              </GlassCard>
            </div>
          )}
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
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">Back to Finance Cockpit</button>
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
                        {t.salaryStatus === 'paid' ? ` Paid${t.salaryPaymentDate ? ` (${t.salaryPaymentDate})` : ''}` : '● Pending'}
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
    const triggerWorkerAction = (actionType: 'add' | 'toggle' | 'delete', data: any) => {
      if (actionType === 'add' && (!newWorkerName || !newWorkerRole || !newWorkerWage)) {
        triggerToast('Please fill in name, role and wage.');
        return;
      }
      setWorkerPendingAction({ type: actionType, data });
      setWorkerOtpInput('');
      setIsWorkerOtpOpen(true);
    };

    const confirmWorkerAction = async () => {
      if (!workerPendingAction) return;
      const { type, data } = workerPendingAction;
      try {
        setGlobalSecurityKey(workerOtpInput);
        if (type === 'add') {
          const saved = await admin2Service.createWorkerPayment({
            workerName: data.name,
            role: data.role,
            amount: Number(data.wage),
            monthPeriod: data.period,
            paid: false
          });
          const mapped = { ...saved, name: saved.workerName, salary: saved.amount, id: saved._id };
          setWorkers([mapped, ...workers]);
          setNewWorkerName(''); setNewWorkerRole(''); setNewWorkerWage('');
          triggerToast('Worker entry added.');
        } else if (type === 'toggle') {
          const updated = await admin2Service.updateWorkerPayment(data._id, { paid: !data.paid });
          setWorkers(workers.map(ww => ww._id === data._id ? { ...updated, name: updated.workerName, salary: updated.amount, id: updated._id } : ww));
          triggerToast(`${data.workerName || data.name} marked ${!data.paid ? 'Paid' : 'Unpaid'}.`);
        } else if (type === 'delete') {
          await admin2Service.deleteWorkerPayment(data._id);
          setWorkers(workers.filter(ww => ww._id !== data._id));
          triggerToast('Worker entry deleted.');
        }
        setIsWorkerOtpOpen(false);
        setWorkerPendingAction(null);
        setWorkerOtpInput('');
      } catch (err: any) {
        triggerToast(err.message || 'Verification failed / action rejected.');
      }
    };

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('emerald')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">Back to Finance Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Worker Payment Details</h1>
          <p style={styles.subtitle}>Manage and record non-teaching staff payroll for the month</p>
        </header>
        <main style={styles.content}>
          <GlassCard hoverable={false} style={{ padding: '20px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Add Worker Entry</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={styles.formLabel}>Name</label><input type="text" value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} style={styles.textInputBox} placeholder="e.g. Ramesh Kumar" /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={styles.formLabel}>Role</label><input type="text" value={newWorkerRole} onChange={(e) => setNewWorkerRole(e.target.value)} style={styles.textInputBox} placeholder="e.g. Plumber" /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={styles.formLabel}>Monthly Wage (₹)</label><input type="number" min="0" value={newWorkerWage} onChange={(e) => setNewWorkerWage(e.target.value)} style={styles.textInputBox} placeholder="e.g. 15000" /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><label style={styles.formLabel}>Period</label><input type="text" value={newWorkerPeriod} onChange={(e) => setNewWorkerPeriod(e.target.value)} style={styles.textInputBox} placeholder="e.g. July 2026" /></div>
            </div>
            <button onClick={() => triggerWorkerAction('add', { name: newWorkerName, role: newWorkerRole, wage: newWorkerWage, period: newWorkerPeriod })} style={{ ...styles.saveSubmitBtn, marginTop: '14px' }} className="press-interactive">Add Worker Entry</button>
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
                    <button onClick={() => triggerWorkerAction('toggle', w)} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', backgroundColor: w.paid ? 'rgba(16,185,129,0.12)' : 'var(--royal-gold)', color: w.paid ? '#10B981' : '#000', fontWeight: 800, fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-family)' }} className="press-interactive">{w.paid ? '🟢 Paid' : '🔴 Unpaid'}</button>
                    <button onClick={() => triggerWorkerAction('delete', w)} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Worker OTP verification modal overlay */}
          {isWorkerOtpOpen && (
            <div style={styles.overlayOverlay}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '16px', border: '1px solid var(--card-border)' }} className="anim-slide-up glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '15px', color: 'var(--dark-charcoal)' }}>Finance OTP Authorization</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted-gray)' }}>A security passcode check is required to authorize this worker payroll action.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="password"
                    placeholder="Enter Security OTP"
                    value={workerOtpInput}
                    onChange={(e) => setWorkerOtpInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmWorkerAction()}
                    style={{ ...styles.textInputBox, textAlign: 'center', letterSpacing: '0.2em', fontSize: '15px', fontWeight: 800 }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button onClick={confirmWorkerAction} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1 }} className="press-interactive">Confirm</button>
                    <button onClick={() => { setIsWorkerOtpOpen(false); setWorkerPendingAction(null); setWorkerOtpInput(''); }} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }} className="press-interactive">Cancel</button>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 17: CAMPUS MARKS REGISTRY (Admin 2) ───
  if (activePage === 'enrollment_stats') {
    const list = studentMarksList
      .filter((s: any) => s.name.toLowerCase().includes(searchFac.toLowerCase()) || s.studentId.toLowerCase().includes(searchFac.toLowerCase()));

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('violet')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setEditingMark(null); }} style={styles.backArrowBtn} className="press-interactive">Back to Cockpit</button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Campus Marks</h1>
          <p style={styles.subtitle}>View and update subject midterm/final grades for local campus students</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1 }}>
            {/* Search and Subject Filter */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search student name or ID..."
                value={searchFac}
                onChange={(e) => setSearchFac(e.target.value)}
                style={{ ...styles.textInputBox, flex: 1, margin: 0 }}
              />
              <select
                value={markSubject}
                onChange={(e) => setMarkSubject(e.target.value)}
                style={{ ...styles.selectInput, width: '130px', margin: 0 }}
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English</option>
              </select>
            </div>

            {/* Marks List Table */}
            <GlassCard hoverable={false} style={{ padding: '16px' }} className="neo-2d-card">
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, marginBottom: '14px' }}>Subject Ledgers: {markSubject}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {list.map((s: any) => {
                  const subMark = s.marks.find((m: any) => m.subject === markSubject) || { midterm: 0, final: 0 };
                  return (
                    <div key={s.studentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>ID: {s.studentId}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>Midterm: <span style={{ color: 'var(--royal-gold)' }}>{subMark.midterm}</span></div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>Final Exam: <span style={{ color: '#10B981' }}>{subMark.final}</span></div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingMark(s);
                            setMarkMidterm(String(subMark.midterm));
                            setMarkFinal(String(subMark.final));
                          }}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                          className="press-interactive"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
                {list.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted-gray)', fontSize: '12px' }}>
                    No student records found.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* EDIT GRADES HOVER MODAL */}
          {editingMark && (
            <div style={styles.overlayOverlay}>
              <div style={styles.overlaySheet}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={styles.modalTitle}>Edit Student Grades</h3>
                  <button
                    onClick={() => setEditingMark(null)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>Student</div>
                    <strong style={{ fontSize: '14px', color: 'var(--dark-charcoal)' }}>{editingMark.name} ({editingMark.studentId})</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted-gray)' }}>Subject</div>
                    <strong style={{ fontSize: '14px', color: 'var(--royal-gold)' }}>{markSubject}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Midterm Marks</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={markMidterm}
                        onChange={(e) => setMarkMidterm(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Final Exam Marks</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={markFinal}
                        onChange={(e) => setMarkFinal(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveStudentMark}
                    style={{ ...styles.saveSubmitBtn, marginTop: '12px' }}
                    className="press-interactive"
                  >
                    Save Grades
                  </button>
                </div>
              </div>
            </div>
          )}
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
          clearance: 'Level 1 Executive Clearance (All 4 Branches)',
          registry: 'Global Institutional ERP Cockpit'
        };
      } else if (role === 'admin2') {
        return {
          initials: 'CP',
          name: user?.name || 'Dr. Ramesh Rao (Dean)',
          title: `${loggedInCampus} Campus Principal Dean`,
          clearance: `Level 2 Operations Clearance (${loggedInCampus})`,
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
            Back to Cockpit
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

  const totals = (attendanceSummary as any)?.totals || {
    studentsPresent: 0,
    studentsAbsent: 0,
    facultyPresent: 0,
    facultyAbsent: 0
  };

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
                  ? 'Superintendent Coordinator (All 4 Campuses)'
                  : role === 'admin2'
                  ? `Principal Coordinator (${loggedInCampus})`
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
                  <strong style={{ ...styles.metricValue, color: '#10B981' }}>
                    {(totals.studentsPresent || 0).toLocaleString()}
                  </strong>
                  <span style={styles.metricSub}>
                    {((totals.studentsPresent || 0) / Math.max((totals.studentsPresent || 0) + (totals.studentsAbsent || 0), 1) * 100).toFixed(1)}% Attendance Rate
                  </span>
                  <span className="glass-status-pill status-present">Live</span>
                </GlassCard>
                <GlassCard hoverable={false} style={styles.metricCard} className={`glass-gold-ring ${livePulseKey ? 'anim-pulse-gold' : ''}`}>
                  <span style={styles.metricLabel}>Total Students Absent Today</span>
                  <strong style={{ ...styles.metricValue, color: '#EF4444' }}>
                    {(totals.studentsAbsent || 0).toLocaleString()}
                  </strong>
                  <span style={styles.metricSub}>
                    {((totals.studentsAbsent || 0) / Math.max((totals.studentsPresent || 0) + (totals.studentsAbsent || 0), 1) * 100).toFixed(1)}% Absent
                  </span>
                  <span className="glass-status-pill status-absent">Watch</span>
                </GlassCard>
              </div>
              <div style={styles.metricsGrid}>
                <GlassCard hoverable={false} style={styles.metricCard} className={`glass-gold-ring neo-2d-card hover-gold ${livePulseKey ? 'anim-pulse-gold' : ''}`}>
                  <span style={styles.metricLabel}>Total Faculty Present Today</span>
                  <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>
                    {(totals.facultyPresent || 0).toLocaleString()}
                  </strong>
                  <span style={styles.metricSub}>
                    {((totals.facultyPresent || 0) / Math.max((totals.facultyPresent || 0) + (totals.facultyAbsent || 0), 1) * 100).toFixed(1)}% Present
                  </span>
                  <span className="glass-status-pill status-active">Stable</span>
                </GlassCard>
                <GlassCard hoverable={false} style={styles.metricCard} className={`glass-gold-ring ${livePulseKey ? 'anim-pulse-gold' : ''}`}>
                  <span style={styles.metricLabel}>Faculty on Leave Today</span>
                  <strong style={styles.metricValue}>
                    {(totals.facultyAbsent || 0).toLocaleString()}
                  </strong>
                  <span style={styles.metricSub}>
                    {((totals.facultyAbsent || 0) / Math.max((totals.facultyPresent || 0) + (totals.facultyAbsent || 0), 1) * 100).toFixed(1)}% Leave Rate
                  </span>
                  <span className="glass-status-pill status-warning">Alert</span>
                </GlassCard>
              </div>
            </>
          ) : role === 'admin2' ? (
            (() => {
              const localStudents = students.filter(s => s.branch === loggedInCampus);
              const monthlyFeeCollectedVal = localStudents.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
              const localExpenditures = expenditures.filter(e => e.branch === loggedInCampus);
              const monthlyExpenditureVal = localExpenditures.reduce((sum, e) => sum + (e.amount || 0), 0);
              const defaultersCount = localStudents.filter(s => (s.remainingBalance || 0) > 0).length;

              return (
                <>
                  <div style={styles.metricsGrid}>
                    <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring neo-2d-card hover-gold">
                      <span style={styles.metricLabel}>Monthly Fee Collected</span>
                      <strong style={{ ...styles.metricValue, color: '#10B981' }}>₹{monthlyFeeCollectedVal.toLocaleString('en-IN')}</strong>
                      <span style={styles.metricSub}>From {localStudents.length} campus profiles</span>
                      <span className="glass-status-pill status-paid">Collected</span>
                    </GlassCard>
                    <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
                      <span style={styles.metricLabel}>Monthly Expenditure</span>
                      <strong style={{ ...styles.metricValue, color: '#EF4444' }}>₹{monthlyExpenditureVal.toLocaleString('en-IN')}</strong>
                      <span style={styles.metricSub}>Local campus ledger total</span>
                      <span className="glass-status-pill status-warning">Paid Out</span>
                    </GlassCard>
                  </div>
                  <div style={styles.metricsGrid}>
                    <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring neo-2d-card hover-gold">
                      <span style={styles.metricLabel}>Fee Defaulters</span>
                      <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>{defaultersCount}</strong>
                      <span style={styles.metricSub}>Pending term payments</span>
                      <span className="glass-status-pill status-pending">Pending</span>
                    </GlassCard>
                    <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
                      <span style={styles.metricLabel}>Worker Payments Pending</span>
                      <strong style={styles.metricValue}>{workers.filter(w => !w.paid && w.branch === loggedInCampus).length}</strong>
                      <span style={styles.metricSub}>Awaiting Dean authorization</span>
                      <span className="glass-status-pill status-pending">Payroll</span>
                    </GlassCard>
                  </div>
                </>
              );
            })()
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

        {/* Module Grid */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>
            {role === 'admin1' ? 'Operations Modules' : role === 'admin2' ? 'Finance & Staff Modules' : 'Academic Modules'}
          </h3>

          {role === 'admin1' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div onClick={() => setActivePage('students')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Students Registry</h4>
                <p style={styles.moduleDesc}>Register admissions, view records across all 4 campuses.</p>
              </div>

              <div onClick={() => setActivePage('teachers')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Faculty Management</h4>
                <p style={styles.moduleDesc}>Configure lecturers, allocate subjects, check base salaries.</p>
              </div>

              <div onClick={() => setActivePage('academic_fees')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Academic Fee Structure</h4>
                <p style={styles.moduleDesc}>Set baseline yearly/term academic fees globally.</p>
              </div>

              <div onClick={() => setActivePage('fee_editor')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Student Fee & Waivers</h4>
                <p style={styles.moduleDesc}>Configure individual scholarship category fee waivers.</p>
              </div>

              <div onClick={() => setActivePage('expenditure')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Multi-Branch Expenditure</h4>
                <p style={styles.moduleDesc}>Compare totals and log expenses across all 4 campuses.</p>
              </div>

              <div onClick={() => setActivePage('profile')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.12)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Rector Profile</h4>
                <p style={styles.moduleDesc}>Review registered principal rector credentials.</p>
              </div>
            </div>

          ) : role === 'admin2' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div onClick={() => setActivePage('expenditure')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Campus Expenditures</h4>
                <p style={styles.moduleDesc}>Log and track local expenditures of {loggedInCampus}.</p>
              </div>

              <div onClick={() => setActivePage('worker_payments')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Worker Payments</h4>
                <p style={styles.moduleDesc}>Record and mark non-teaching staff payroll payouts.</p>
              </div>



              <div onClick={() => setActivePage('profile')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.12)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Campus Dean Profile</h4>
                <p style={styles.moduleDesc}>Review {loggedInCampus} principal dean credentials.</p>
              </div>
            </div>

          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div onClick={() => setActivePage('classes')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2"><path d="M22 10v6M2 10v6M12 2l10 5-10 5L2 7l10-5z"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Class Scheduling</h4>
                <p style={styles.moduleDesc}>Map sections, allocate student groups, and assign duties.</p>
              </div>

              <div onClick={() => setActivePage('exams')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Examination Portal</h4>
                <p style={styles.moduleDesc}>Create term schedules, upload results, and publish grades.</p>
              </div>

              <div onClick={() => setActivePage('publishing')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Publishing Desk</h4>
                <p style={styles.moduleDesc}>Compose bulletins, circular notices, and holiday events.</p>
              </div>

              <div onClick={() => setActivePage('calendar')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Timetables & Calendars</h4>
                <p style={styles.moduleDesc}>Upload and schedule daily class timelines and calendars.</p>
              </div>

              <div onClick={() => setActivePage('attendance')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Attendance Summary</h4>
                <p style={styles.moduleDesc}>Examine section-wise student availability reports.</p>
              </div>

              <div onClick={() => setActivePage('profile')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.12)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Publisher Profile</h4>
                <p style={styles.moduleDesc}>Review Academic Registrar & Publisher credentials.</p>
              </div>
            </div>
          )}
        </section>

        {/* Terminate Session */}
        <button onClick={handleLogout} style={{ ...styles.logoutBtn, marginTop: '8px' }} className="press-interactive">
          Terminate Director Session
        </button>

        {/* Footer */}
        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px 12px', gap: '4px', opacity: 0.6 }}>
          <InspireLogo size="sm" />
          <span style={{ fontSize: '9px', color: 'var(--muted-gray)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
            Inspire ERP General Portal v2.6.4
          </span>
        </footer>

      </main>

      {toastMessage && (
        <div style={styles.toastContainer} className="anim-slide-up">
          <div style={styles.toastCard}>
            <span style={styles.toastText}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* OTP Security Modal */}
      {isOtpModalOpen && editStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: '360px', padding: '28px', borderRadius: '16px', margin: '0 16px', backgroundColor: 'rgba(255,255,255,0.96)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px rgba(15,23,42,0.15)' }} className="anim-slide-up">
            <h3 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '15px', color: 'var(--dark-charcoal)', letterSpacing: '-0.015em' }}>Security Verification</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--muted-gray)', lineHeight: 1.5 }}>Enter the <strong>Student Administrative OTP</strong> from the Authenticator to save changes.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" autoFocus placeholder="Enter OTP..." value={otpInput} onChange={(e) => setOtpInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter' && otpInput.trim()) handleStudentSave(editStudent, otpInput.trim()); }} style={{ padding: '12px 16px', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '14px', fontWeight: 700, letterSpacing: '0.12em', textAlign: 'center', backgroundColor: '#fff', outline: 'none', fontFamily: 'monospace', color: 'var(--dark-charcoal)' }} />
              <button onClick={() => handleStudentSave(editStudent, otpInput.trim())} disabled={!otpInput.trim()} style={{ ...styles.saveSubmitBtn, marginTop: 0, opacity: otpInput.trim() ? 1 : 0.4 }} className="press-interactive">Confirm & Save Changes</button>
              <button onClick={() => { setIsOtpModalOpen(false); setOtpInput(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted-gray)', fontFamily: 'var(--font-family)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: '4px' }}>Cancel</button>
            </div>
          </div>
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
    top: 0, left: 0, right: 0, bottom: 0,
    overflowY: 'auto',
  },
  header: {
    padding: 'calc(20px + var(--safe-area-top)) 28px 18px 28px',
    background: 'var(--glass-bg)',
    borderBottom: '1px solid var(--card-border)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(20px)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.025em',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '3px',
    letterSpacing: '0.005em',
  },
  content: {
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  parentWelcomeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  avatarMini: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: 'var(--dark-charcoal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 900,
    color: 'var(--royal-gold)',
    border: '1px solid rgba(212,175,55,0.25)',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  parentWelcomeTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
  },
  greetingText: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '3px',
  },
  childMetaText: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '1px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  metricCard: {
    padding: '18px 20px',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.85)',
    border: '1px solid var(--card-border)',
    boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
  },
  metricLabel: {
    fontSize: '9.5px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  metricValue: {
    fontSize: '22px',
    fontWeight: 900,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.03em',
    lineHeight: 1,
    marginTop: '4px',
  },
  metricSub: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '2px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  moduleCardNew: {
    padding: '20px',
    borderRadius: '14px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: '1px solid var(--card-border)',
    boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  },
  moduleIconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.01em',
  },
  moduleDesc: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    lineHeight: 1.5,
    fontWeight: 400,
  },
  textInputBox: {
    flex: 1,
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid var(--card-border)',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: 'rgba(255,255,255,0.7)',
    color: 'var(--dark-charcoal)',
    fontFamily: 'var(--font-family)',
    fontWeight: 500,
  },
  saveSubmitBtn: {
    padding: '13px 20px',
    borderRadius: '10px',
    backgroundColor: 'var(--dark-charcoal)',
    color: '#ffffff',
    fontFamily: 'var(--font-family)',
    fontSize: '12.5px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    marginTop: '8px',
    letterSpacing: '0.01em',
  },
  sectionSubtitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginTop: '8px',
    marginBottom: '4px',
  },
  readOnlyBlock: {
    padding: '16px 18px',
    borderRadius: '12px',
    border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12.5px',
    padding: '5px 0',
  },
  formLabel: {
    fontSize: '9.5px',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    display: 'block',
    marginBottom: '4px',
  },
  selectInput: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--dark-charcoal)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
  },
  receiptRowItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: '12px',
  },
  actionItemBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
  },
  sheetBtn: {
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  toastContainer: {
    position: 'fixed',
    bottom: '24px',
    left: '28px',
    right: '28px',
    zIndex: 10000,
    pointerEvents: 'none',
  },
  toastCard: {
    padding: '13px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--dark-charcoal)',
    border: 'none',
    boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
    borderRadius: '10px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 9px',
    borderRadius: '999px',
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    color: 'var(--dark-charcoal)',
  },
  skeletonCard: {
    minHeight: '120px',
    borderRadius: '14px',
    backgroundColor: 'rgba(255,255,255,0.4)',
    border: '1px solid var(--card-border)',
  },
  skeletonLine: {
    width: '100%',
    height: '14px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  toastText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#ffffff',
  },
  heroAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: 'var(--dark-charcoal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 900,
    color: 'var(--royal-gold)',
    border: '1px solid rgba(212,175,55,0.2)',
    letterSpacing: '0.04em',
  },
  studentName: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.015em',
  },
  studentID: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    display: 'block',
    marginTop: '2px',
  },
  heroLineDivider: {
    width: '100%',
    height: '1px',
    backgroundColor: 'var(--card-border)',
    margin: '16px 0',
  },
  heroMetaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  logoutBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(211,47,47,0.25)',
    color: '#D32F2F',
    fontFamily: 'var(--font-family)',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    letterSpacing: '0.01em',
  },
  quickFillContainer: {
    padding: '4px 0',
  },
  quickFillPill: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.06)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: '6px',
    padding: '4px 9px',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
  },
  backArrowBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted-gray)',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  overlayOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: 1000,
    backdropFilter: 'blur(6px)',
  },
  overlaySheet: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: '16px',
    border: '2px solid var(--card-border)',
    boxShadow: 'none',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90%',
    overflowY: 'auto',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)'
  },
  modalContentCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '30px 26px',
    borderRadius: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    border: '1.5px solid rgba(212, 175, 55, 0.4)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25), 0 0 30px rgba(212, 175, 55, 0.2)',
    margin: '0 16px'
  },
  modalIconBadge: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)',
    border: '2px solid rgba(212,175,55,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
    boxShadow: '0 8px 20px rgba(212,175,55,0.2)'
  },
  modalHeading: {
    margin: '0 0 6px 0',
    fontWeight: 900,
    fontSize: '1.2rem',
    color: 'var(--dark-charcoal)'
  },
  modalSubText: {
    margin: 0,
    fontSize: '0.82rem',
    color: 'var(--muted-gray)',
    lineHeight: 1.5
  },
  otpTipBanner: {
    marginTop: '10px',
    padding: '8px 12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    border: '1px dashed rgba(212, 175, 55, 0.3)',
    fontSize: '11px',
    color: '#854D0E',
    textAlign: 'center'
  },
  modalOtpInput: {
    padding: '14px 16px',
    border: '2px solid rgba(212,175,55,0.6)',
    borderRadius: '14px',
    fontSize: '1.25rem',
    fontWeight: 800,
    letterSpacing: '0.2em',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    outline: 'none',
    fontFamily: 'monospace',
    color: 'var(--dark-charcoal)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
  },
  modalConfirmBtn: {
    flex: 1,
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    background: 'var(--gold-gradient)',
    color: '#fff',
    fontWeight: 800,
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(212, 175, 55, 0.35)'
  },
  modalCancelBtn: {
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1px solid rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    color: 'var(--dark-charcoal)',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer'
  }
};


