import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { GlassCard } from '../components/common/GlassCard';
import { InspireLogo } from '../components/common/InspireLogo';
import { apiClient, setGlobalSecurityKey } from '../services/apiClient';
import { admin1Service } from '../services/admin1Service';
import { admin2Service } from '../services/admin2Service';
import * as accountantService from '../services/accountantService';
import { PortalDataLoader } from '../components/common/PortalDataLoader';
import { AdminDataAnalytics } from '../components/AdminDataAnalytics';
import collegeLogo from '../assets/college logo.png';
import { useDataFreshness } from '../hooks/useDataFreshness';


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

const escapeHtml = (str: any): string => {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface WorkerItem {
  _id?: string;
  id?: string;
  workerName?: string;
  name: string;
  role: string;
  salary: number;
  amount?: number;
  monthPeriod?: string;
  paid: boolean;
  amountPaid?: number;
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
  year?: '1st Year' | '2nd Year' | 'Short Term' | string;
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
  customFeeSlots?: Array<{ id?: string; name: string; amount: number }>;
  dob?: string;
  pastSchool?: string;
  previousSchool?: string;
  booksFee?: number;
  uniformFees?: number;
  hndFees?: number;
  internalExamFees?: number;
  annualExamFees?: number;
  partyFees?: number;
  busFees?: number;
  labFees?: number;
  handLoan?: number;
  othersFee?: number;
}

interface Teacher {
  _id?: string;
  id: string;
  name: string;
  role?: string;
  classification?: 'Teaching' | 'Non-Teaching';
  subject: string;
  email?: string;
  mobile: string;
  salary: number;
  joiningDate?: string;
  assignedClasses: string[];
  assignedSections: string[];
  assignedSubjects: string[];
  status: 'Active' | 'Inactive';
  salaryStatus?: 'paid' | 'pending';
  salaryPaidAmount?: number;
  salaryPaymentDate?: string;
  tempPassword?: string;
  branch?: string;
  monthlySalaries?: Record<string, {
    month: string;
    status: 'Paid' | 'Unpaid';
    amountPaid: number;
    paymentDate: string;
    paymentMode?: string;
    note?: string;
  }>;
}

const matchesStudentQuery = (student: Student, query: string) => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return true;

  return [
    student.name,
    student.admissionNumber,
    student.registrationNumber,
    student.studentId,
    student.rollNumber,
    student.mobile,
    student.parentMobile,
    student.course,
    student.branch
  ].some((field) => String(field || '').toLowerCase().includes(normalizedQuery));
};

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


// --- Input Validation Helpers ---
// Mobile: optional strips spaces/dashes then checks for exactly 10 digits
const validateMobile = (val: string): string | null => {
  if (!val || val.trim() === '') return null; // empty is allowed (optional field)
  const digits = val.replace(/[\s\-]/g, '');
  if (!/^\d{10}$/.test(digits)) return 'Mobile number must be exactly 10 digits.';
  return null;
};
const MAX_STUDENT_FEE = 1_000_000; // Rs. 10,00,000

export const AdminDashboardView: React.FC<{ role?: 'admin1' | 'admin2' }> = ({ role = 'admin1' }) => {
  const { user } = useNavigation();
  const loggedInCampus = user?.campus && user.campus !== 'All' ? user.campus : 'Erragattugutta C1';

  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [activePage, setActivePage] = useState<string>('menu');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePulseKey, setLivePulseKey] = useState<'students' | 'attendance' | 'bulletins' | 'fees' | 'finance' | null>(null);
  const [securityKey, setSecurityKey] = useState('');
  const [admin1Tab, setAdmin1Tab] = useState<'dashboard' | 'overview'>('dashboard');


  // States
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);

  // Edit Buffer States (prevents keypress auto-save)
  const [searchAdm, setSearchAdm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [registryPage, setRegistryPage] = useState(1);

  // Students Registry States (3-Screen Reduced Field List)
  const [isStudentHoverModalOpen, setIsStudentHoverModalOpen] = useState(false);
  const [newStuFormPage, setNewStuFormPage] = useState<1 | 2 | 3>(1);
  const [newStuName, setNewStuName] = useState('');
  const [newStuAdmissionNumber, setNewStuAdmissionNumber] = useState('');
  const [newStuBranch, setNewStuBranch] = useState(loggedInCampus);
  const [newStuMobile, setNewStuMobile] = useState('');
  const [newStuCourse, setNewStuCourse] = useState('MPC');
  const [newStuSection, setNewStuSection] = useState('MPC-A');

  // Screen 2: Personal & Family Information
  const [newStuFatherName, setNewStuFatherName] = useState('');
  const [newStuMotherName, setNewStuMotherName] = useState('');
  const [newStuDob, setNewStuDob] = useState('');
  const [newStuParentMobile, setNewStuParentMobile] = useState('');
  const [newStuPreviousSchool, setNewStuPreviousSchool] = useState('');
  const [newStuPreviousBoard, setNewStuPreviousBoard] = useState('State Board');
  const [newStuAddress, setNewStuAddress] = useState('');

  // Itemized Fee Breakdown & Slots for New Student Registration
  const INITIAL_REG_FEE_SLOTS = [
    { id: 'tuitionFee', key: 'tuitionFee', name: 'Tuition Fee', amount: '' },
    { id: 'booksFee', key: 'booksFee', name: 'Books Fee', amount: '' },
    { id: 'uniformFees', key: 'uniformFees', name: 'Uniform Fees', amount: '' },
    { id: 'hndFees', key: 'hndFees', name: 'HND Fees', amount: '' },
    { id: 'internalExamFees', key: 'internalExamFees', name: 'Internal Exam Fee', amount: '' },
    { id: 'annualExamFees', key: 'annualExamFees', name: 'Annual Exam Fee', amount: '' },
    { id: 'partyFees', key: 'partyFees', name: 'Party / Event Fees', amount: '' },
    { id: 'busFees', key: 'busFees', name: 'Bus Transport Fees', amount: '' },
    { id: 'labFees', key: 'labFees', name: 'Lab Fees', amount: '' },
    { id: 'handLoan', key: 'handLoan', name: 'Hand Loan', amount: '' },
    { id: 'othersFee', key: 'othersFee', name: 'Others Fee', amount: '' },
  ];

  const [newStuFeeSlots, setNewStuFeeSlots] = useState<Array<{ id: string; key?: string; name: string; amount: string | number; isCustom?: boolean }>>(INITIAL_REG_FEE_SLOTS);
  const [newStuIsAddingSlot, setNewStuIsAddingSlot] = useState(false);
  const [newStuSlotName, setNewStuSlotName] = useState('');
  const [newStuSlotAmount, setNewStuSlotAmount] = useState('');

  const handleAddNewStuCustomSlot = () => {
    if (!newStuSlotName.trim()) {
      triggerToast('Please enter fee section description.');
      return;
    }
    const amt = parseFloat(newStuSlotAmount) || 0;
    const newSlot = {
      id: 'slot_' + Date.now(),
      name: newStuSlotName.trim(),
      amount: amt,
      isCustom: true
    };
    setNewStuFeeSlots(prev => [...prev, newSlot]);
    setNewStuSlotName('');
    setNewStuSlotAmount('');
    setNewStuIsAddingSlot(false);
    triggerToast(`Fee section slot "${newSlot.name}" added.`);
  };

  const handleRemoveNewStuFeeSlot = (slotId: string) => {
    setNewStuFeeSlots(prev => prev.filter(s => s.id !== slotId));
    triggerToast('Fee section slot deleted.');
  };

  const [isRegStuOtpModalOpen, setIsRegStuOtpModalOpen] = useState(false);
  const [regStuOtpInput, setRegStuOtpInput] = useState('');
  const [regStuError, setRegStuError] = useState('');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Faculty Management & 12-Month Ledger States
  const [searchFac, setSearchFac] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [facultyPage, setFacultyPage] = useState(1);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2026-2027');
  const [employeeTab, setEmployeeTab] = useState<'employees' | 'history'>('employees');
  const [workerPaymentsHistory, setWorkerPaymentsHistory] = useState<any[]>([]);
  const [pendingDeleteTeacherId, setPendingDeleteTeacherId] = useState<string | null>(null);

  const [newFacName, setNewFacName] = useState('');
  const [newFacSub, setNewFacSub] = useState('');
  const [newFacEmail, setNewFacEmail] = useState('');
  const [newFacSal, setNewFacSal] = useState('');
  const [newFacBranch, setNewFacBranch] = useState(loggedInCampus);
  const [newFacMobile, setNewFacMobile] = useState('');
  const [filterFacCampus, setFilterFacCampus] = useState('All');
  const [filterFacSubject, setFilterFacSubject] = useState('All');
  const [isFacOtpModalOpen, setIsFacOtpModalOpen] = useState(false);
  const [facOtpInput, setFacOtpInput] = useState('');
  const [facActionType, setFacActionType] = useState<'add' | 'edit' | 'delete' | 'salary_payment'>('edit');
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [assignClass, setAssignClass] = useState('Junior MPC');
  const [assignSec, setAssignSec] = useState('Section A');
  const [assignSub] = useState('Physics');

  // Admission Enquiries States
  const [enquiriesList, setEnquiriesList] = useState<any[]>([]);
  const [searchEnquiry, setSearchEnquiry] = useState('');
  const [filterEnquiryCampus, setFilterEnquiryCampus] = useState('All');
  const [filterEnquiryStatus, setFilterEnquiryStatus] = useState('All');
  const [isLoadingEnquiries, setIsLoadingEnquiries] = useState(false);

  const fetchEnquiries = async () => {
    setIsLoadingEnquiries(true);
    try {
      const data = await admin1Service.getEnquiries();
      if (data && Array.isArray(data)) {
        setEnquiriesList(data);
      } else if (data && (data as any).data && Array.isArray((data as any).data)) {
        setEnquiriesList((data as any).data);
      }
    } catch (err) {
      console.warn('Failed to fetch enquiries:', err);
    } finally {
      setIsLoadingEnquiries(false);
    }
  };

  // Staff Registration & 12-Month Ledger States
  const [newStaffClassification, setNewStaffClassification] = useState<'Teaching' | 'Non-Teaching'>('Teaching');
  const [newStaffRolePreset, setNewStaffRolePreset] = useState('Teacher');
  const [newStaffCustomRole, setNewStaffCustomRole] = useState('');
  const [selectedStaffMonthForEdit, setSelectedStaffMonthForEdit] = useState<string | null>(null);
  const [staffMonthStatus, setStaffMonthStatus] = useState<'Paid' | 'Unpaid'>('Paid');
  const [staffMonthAmount, setStaffMonthAmount] = useState('');
  const [staffMonthDate, setStaffMonthDate] = useState('');
  const [staffMonthMode, setStaffMonthMode] = useState('Bank Transfer');
  const [staffMonthNote, setStaffMonthNote] = useState('');
  const [filterStaffClassification, setFilterStaffClassification] = useState('All');

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
  const [customExpCat, setCustomExpCat] = useState('');
  const [newExpAmt, setNewExpAmt] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [pendingExpDelete, setPendingExpDelete] = useState<ExpenditureItem | null>(null);
  const [isExpDeleteOtpOpen, setIsExpDeleteOtpOpen] = useState(false);
  const [expDeleteOtpInput, setExpDeleteOtpInput] = useState('');

  const [editTuitionRate, setEditTuitionRate] = useState('120000');
  const [editHostelRate, setEditHostelRate] = useState('85000');
  const [editMiscRate, setEditMiscRate] = useState('5000');

  const [isDeleteStuOtpOpen, setIsDeleteStuOtpOpen] = useState(false);
  const [deleteStuOtpInput, setDeleteStuOtpInput] = useState('');

  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [salaryPage, setSalaryPage] = useState(1);
  const [selectedSalaryTeacher, setSelectedSalaryTeacher] = useState<Teacher | null>(null);
  const [salaryActionType, setSalaryActionType] = useState<'paid' | 'pending'>('paid');
  const [salaryAmountInput, setSalaryAmountInput] = useState('');
  const [isSalaryActionOpen, setIsSalaryActionOpen] = useState(false);

  const [feeEditSearch, setFeeEditSearch] = useState('');
  const [selectedFeeStudent, setSelectedFeeStudent] = useState<Student | null>(null);
  const [feeEditorPage, setFeeEditorPage] = useState(1);
  const [editTuitionWaiver, setEditTuitionWaiver] = useState('0');
  const [editHostelWaiver, setEditHostelWaiver] = useState('0');
  const [editMiscWaiver, setEditMiscWaiver] = useState('0');
  const [editSlotWaivers, setEditSlotWaivers] = useState<Record<string, number>>({});

  // Admin Custom Fee Slot Management
  const [adminNewSlotName, setAdminNewSlotName] = useState('');
  const [adminNewSlotAmount, setAdminNewSlotAmount] = useState('');
  const [adminIsAddingSlot, setAdminIsAddingSlot] = useState(false);

  const getAdminActiveFeeSlots = (stu: any, breakdown?: any) => {
    if (!stu && !breakdown) return [];
    if (stu?.customFeeSlots && Array.isArray(stu.customFeeSlots) && stu.customFeeSlots.length > 0) {
      return stu.customFeeSlots.map((c: any, idx: number) => ({
        id: c.id ? `${c.id}_${idx}` : `${c.name}_${idx}`,
        name: c.name,
        amount: Number(c.amount) || 0,
        isDefault: false
      }));
    }
    const baseSlots: Array<{ id: string; name: string; amount: number; isDefault?: boolean }> = [];
    
    const tuition = breakdown ? breakdown.tuitionFee : (stu?.tuitionFee || 0);
    const hostel = breakdown ? breakdown.hostelFee : (stu?.hostelFee || 0);
    const misc = breakdown ? breakdown.miscFee : (stu?.miscellaneousFee || 0);
    const prevPending = breakdown ? breakdown.previousPending : (stu?.previousPending || 0);

    if (tuition) baseSlots.push({ id: 'tuitionFee', name: 'Tuition Fee', amount: Number(tuition) || 0, isDefault: true });
    if (hostel) baseSlots.push({ id: 'hostelFee', name: 'Hostel Fee', amount: Number(hostel) || 0, isDefault: true });
    if (misc) baseSlots.push({ id: 'miscFee', name: 'Miscellaneous Fee', amount: Number(misc) || 0, isDefault: true });
    if (prevPending) baseSlots.push({ id: 'previousPending', name: 'Previous Pending', amount: Number(prevPending) || 0, isDefault: true });

    if (stu?.booksFee) baseSlots.push({ id: 'booksFee', name: 'Books Fee', amount: Number(stu.booksFee) || 0, isDefault: true });
    if (stu?.uniformFees) baseSlots.push({ id: 'uniformFees', name: 'Uniform Fees', amount: Number(stu.uniformFees) || 0, isDefault: true });
    if (stu?.hndFees) baseSlots.push({ id: 'hndFees', name: 'HND Fees', amount: Number(stu.hndFees) || 0, isDefault: true });
    if (stu?.internalExamFees) baseSlots.push({ id: 'internalExamFees', name: 'Internal Exam', amount: Number(stu.internalExamFees) || 0, isDefault: true });
    if (stu?.annualExamFees) baseSlots.push({ id: 'annualExamFees', name: 'Annual Exam', amount: Number(stu.annualExamFees) || 0, isDefault: true });
    if (stu?.partyFees) baseSlots.push({ id: 'partyFees', name: 'Party Fees', amount: Number(stu.partyFees) || 0, isDefault: true });
    if (stu?.busFees) baseSlots.push({ id: 'busFees', name: 'Bus Fees', amount: Number(stu.busFees) || 0, isDefault: true });
    if (stu?.labFees) baseSlots.push({ id: 'labFees', name: 'Lab Fees', amount: Number(stu.labFees) || 0, isDefault: true });
    if (stu?.handLoan) baseSlots.push({ id: 'handLoan', name: 'Hand Loan', amount: Number(stu.handLoan) || 0, isDefault: true });

    return baseSlots;
  };

  const handleAdminAddFeeSlot = () => {
    if (!adminNewSlotName.trim()) {
      triggerToast('Please enter a section slot name.');
      return;
    }
    if (!selectedFeeStudent) return;
    const amt = parseFloat(adminNewSlotAmount) || 0;
    const newSlot = {
      id: 'slot_' + Date.now(),
      name: adminNewSlotName.trim(),
      amount: amt
    };
    const updatedSlots = [...((selectedFeeStudent as any).customFeeSlots || []), newSlot];
    const updatedStudent = {
      ...selectedFeeStudent,
      customFeeSlots: updatedSlots
    };
    setSelectedFeeStudent(updatedStudent as any);
    setAdminNewSlotName('');
    setAdminNewSlotAmount('');
    setAdminIsAddingSlot(false);
    triggerToast(`Fee section slot "${newSlot.name}" added successfully.`);
  };

  const handleAdminRemoveFeeSlot = (slotId: string) => {
    if (!selectedFeeStudent) return;
    const updatedSlots = ((selectedFeeStudent as any).customFeeSlots || []).filter((s: any) => s.id !== slotId);
    const updatedStudent = {
      ...selectedFeeStudent,
      customFeeSlots: updatedSlots
    };
    setSelectedFeeStudent(updatedStudent as any);
    triggerToast('Fee section slot removed.');
  };

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

  const [otpCountdown, setOtpCountdown] = useState('');
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      const diffMs = midnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        setOtpCountdown('00h 00m 00s');
        return;
      }
      const h = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
      const m = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const s = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');
      setOtpCountdown(`${h}h ${m}m ${s}s`);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.campus && user.campus !== 'All') {
      setSelectedFeeBranch(user.campus as any);
      setSelectedExpBranch(user.campus as any);
      setNewStuBranch(user.campus);
      setNewFacBranch(user.campus);
    }
  }, [user, loggedInCampus]);

  //  Admin2 Live Wiring State
  const [feeBreakdownData, setFeeBreakdownData] = useState<any>(null);
  const [lateFeeRulesText, setLateFeeRulesText] = useState('Loading...');
  const [scholarshipRulesText, setScholarshipRulesText] = useState('Loading...');

  const [workerSearch, setWorkerSearch] = useState('');
  const [workerPage, setWorkerPage] = useState(1);
  const [selectedWorkerForPayment, setSelectedWorkerForPayment] = useState<any>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [isPaymentAmountModalOpen, setIsPaymentAmountModalOpen] = useState(false);


  //  Worker PDF Generator Helpers
  const handleDownloadWorkerBill = (w: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast('Popup blocked by browser. Please allow popups to download bill.');
      return;
    }

    const workerName = w.workerName || w.name || 'Worker';
    const role = w.role || 'Staff';
    const month = w.monthPeriod || 'Current Month';
    const wage = Number(w.amount || w.salary || 0);
    const paidAmt = Number(w.amountPaid !== undefined ? w.amountPaid : (w.paid ? wage : 0));
    const balance = Math.max(0, wage - paidAmt);
    const statusText = w.paid ? 'PAID' : 'UNPAID';
    const generatedDate = new Date().toLocaleString('en-IN');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Worker Payslip - ${escapeHtml(workerName)}</title>
      <style>
        @page { size: A4; margin: 12mm }
        * { box-sizing: border-box }
        body { margin: 0; color: #0F172A; background: #FFF; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact }
        .page { max-width: 182mm; margin: 0 auto; padding: 4px }
        .hdr { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 16px; margin-bottom: 20px; border-bottom: 3px solid #D4AF37 }
        .brand { display: flex; align-items: center; gap: 14px }
        .logo { width: 44px; height: 44px; object-fit: contain; background: #FFF; border-radius: 10px; padding: 4px; border: 1px solid #D4AF37 }
        .iname { color: #FFF; font-size: 15px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase }
        .iaddr { color: #94A3B8; font-size: 10px; line-height: 1.4; margin-top: 2px }
        .slbl strong { display: block; color: #FFF; font-size: 16px; font-weight: 900; text-transform: uppercase; text-align: right; letter-spacing: 0.04em }
        .slbl span { color: #F59E0B; font-size: 10px; font-weight: 800; text-transform: uppercase; display: block; margin-top: 2px }
        .scard { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(3,1fr); gap: 16px }
        .fl { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; display: block }
        .fv { font-size: 13.5px; font-weight: 800; color: #0F172A; display: block; margin-top: 4px }
        .sgrid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 16px }
        .sc { border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #FFF }
        .sc.hi { border-color: #D4AF37; background: #FFFDF4 }
        .sc .sl { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em }
        .sc .sv { font-size: 19px; font-weight: 900; color: #0F172A; display: block; margin-top: 6px }
        .sc.pd .sv { color: #059669 }
        .sc.hi .sv { color: #D97706 }
        .ftr { margin-top: 32px; padding-top: 16px; border-top: 1.5px dashed #CBD5E1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #64748B }
        .sig { border-top: 1.5px solid #0F172A; padding-top: 6px; font-size: 9px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin-top: 32px; text-align: center; width: 140px }
        .pbtn { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 20px; padding: 12px 26px; background: linear-gradient(135deg, #0F172A, #1E293B); color: #FFF; border: none; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(15,23,42,0.15) }
        @media print { .pbtn { display: none } }
      </style></head><body>
      <div class="page">
        <button class="pbtn" onclick="window.print()">⬇ Print Worker Payslip PDF</button>
        <div class="hdr">
          <div class="brand">
            <img class="logo" src="${collegeLogo}" alt="Logo"/>
            <div>
              <div class="iname">INSPIRE JUNIOR COLLEGE</div>
              <div class="iaddr">Campus: ${escapeHtml(loggedInCampus)} &middot; Official Worker Payslip</div>
            </div>
          </div>
          <div class="slbl">
            <strong>Worker Payslip</strong>
            <span>Period: ${escapeHtml(month)}</span>
          </div>
        </div>
        <div class="scard">
          <div><span class="fl">Worker Name</span><span class="fv">${escapeHtml(workerName)}</span></div>
          <div><span class="fl">Role / Designation</span><span class="fv">${escapeHtml(role)}</span></div>
          <div><span class="fl">Payroll Period</span><span class="fv">${escapeHtml(month)}</span></div>
          <div><span class="fl">Campus Branch</span><span class="fv">${escapeHtml(loggedInCampus)}</span></div>
          <div><span class="fl">Payment Status</span><span class="fv" style="color:${w.paid ? '#059669' : '#DC2626'}">${statusText}</span></div>
          <div><span class="fl">Reference Voucher</span><span class="fv">${escapeHtml(w._id || w.id || 'WRK-REC')}</span></div>
        </div>
        <div class="sgrid">
          <div class="sc"><span class="sl">Monthly Wage</span><span class="sv">Rs. ${wage.toLocaleString('en-IN')}</span></div>
          <div class="sc pd"><span class="sl">Amount Disbursed</span><span class="sv">Rs. ${paidAmt.toLocaleString('en-IN')}</span></div>
          <div class="sc hi"><span class="sl">Remaining Due</span><span class="sv">Rs. ${balance.toLocaleString('en-IN')}</span></div>
        </div>
        <div class="ftr">
          <div>
            <div><strong>Generated On:</strong> ${escapeHtml(generatedDate)}</div>
            <div style="margin-top:3px">Computer-generated payroll record &middot; Verified via Inspire ERP</div>
          </div>
          <div class="sig">Authorized Signatory</div>
        </div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>
      </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    triggerToast('Worker payslip opened for ' + workerName);
  };

  const handleDownloadAllWorkerRecords = (workerList: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast('Popup blocked by browser. Please allow popups to download report.');
      return;
    }

    const totalStaff = workerList.length;
    const totalSalary = workerList.reduce((sum, w) => sum + Number(w.amount || w.salary || 0), 0);
    const totalPaid = workerList.reduce((sum, w) => sum + Number(w.amountPaid !== undefined ? w.amountPaid : (w.paid ? (w.amount || w.salary || 0) : 0)), 0);
    const totalPending = Math.max(0, totalSalary - totalPaid);
    const generatedDate = new Date().toLocaleString('en-IN');

    const tableRows = workerList.map((w, idx) => {
      const wName = w.workerName || w.name || 'Worker';
      const wRole = w.role || 'Staff';
      const wMonth = w.monthPeriod || 'Current Month';
      const wSal = Number(w.amount || w.salary || 0);
      const wPaid = Number(w.amountPaid !== undefined ? w.amountPaid : (w.paid ? wSal : 0));
      const wBal = Math.max(0, wSal - wPaid);
      const stColor = w.paid ? '#059669' : '#DC2626';

      return '<tr>'
        + '<td style="text-align:center;font-weight:700;">' + (idx + 1) + '</td>'
        + '<td style="font-weight:800;color:#0F172A;">' + escapeHtml(wName) + '</td>'
        + '<td>' + escapeHtml(wRole) + '</td>'
        + '<td>' + escapeHtml(wMonth) + '</td>'
        + '<td class="tr">Rs. ' + wSal.toLocaleString('en-IN') + '</td>'
        + '<td class="tr" style="color:#059669;font-weight:800;">Rs. ' + wPaid.toLocaleString('en-IN') + '</td>'
        + '<td class="tr" style="color:' + (wBal > 0 ? '#DC2626' : '#059669') + ';font-weight:800;">Rs. ' + wBal.toLocaleString('en-IN') + '</td>'
        + '<td style="text-align:center;"><span style="color:' + stColor + ';font-weight:900;padding:3px 8px;border-radius:6px;background:' + (w.paid ? '#ECFDF5' : '#FEF2F2') + ';font-size:9.5px;letter-spacing:0.04em;">' + (w.paid ? 'PAID' : 'UNPAID') + '</span></td>'
        + '</tr>';
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Master Worker Payroll Ledger Report</title>
      <style>
        @page { size: A4 landscape; margin: 10mm }
        * { box-sizing: border-box }
        body { margin: 0; color: #0F172A; background: #FFF; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact }
        .page { max-width: 275mm; margin: 0 auto; padding: 4px }
        .hdr { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 14px; margin-bottom: 16px; border-bottom: 3px solid #D4AF37 }
        .brand { display: flex; align-items: center; gap: 12px }
        .logo { width: 42px; height: 42px; object-fit: contain; background: #FFF; border-radius: 10px; padding: 4px; border: 1px solid #D4AF37 }
        .iname { color: #FFF; font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em }
        .iaddr { color: #94A3B8; font-size: 10px; margin-top: 2px }
        .slbl strong { display: block; color: #FFF; font-size: 15px; font-weight: 900; text-transform: uppercase; text-align: right }
        .slbl span { color: #F59E0B; font-size: 10px; font-weight: 800; text-transform: uppercase; display: block; margin-top: 2px }
        .sgrid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px }
        .sc { border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 12px 16px; background: #F8FAFC }
        .sc.hi { border-color: #D4AF37; background: #FFFDF4 }
        .sc .sl { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em }
        .sc .sv { font-size: 18px; font-weight: 900; color: #0F172A; display: block; margin-top: 4px }
        .sc.pd .sv { color: #059669 }
        .sc.hi .sv { color: #D97706 }
        .tbl { width: 100%; border-collapse: collapse; border: 1.5px solid #CBD5E1; border-radius: 12px; overflow: hidden; font-size: 10.5px }
        .tbl th { padding: 10px 12px; background: #F1F5F9; color: #475569; font-size: 8.5px; text-transform: uppercase; text-align: left; border-bottom: 1.5px solid #CBD5E1; font-weight: 800; letter-spacing: 0.06em }
        .tbl td { padding: 9px 12px; border-bottom: 1px solid #E2E8F0 }
        .tbl tr:last-child td { border-bottom: none }
        .tbl tr:nth-child(even) td { background: #FAFBFC }
        .tr { text-align: right }
        .ftr { margin-top: 20px; padding-top: 12px; border-top: 1.5px dashed #CBD5E1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #64748B }
        .sig { border-top: 1.5px solid #0F172A; padding-top: 6px; font-size: 9px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin-top: 24px; text-align: center; width: 140px }
        .pbtn { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 16px; padding: 10px 24px; background: linear-gradient(135deg, #0F172A, #1E293B); color: #FFF; border: none; border-radius: 10px; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(15,23,42,0.15) }
        @media print { .pbtn { display: none } }
      </style></head><body>
      <div class="page">
        <button class="pbtn" onclick="window.print()">⬇ Download Master Worker Payroll PDF</button>
        <div class="hdr">
          <div class="brand">
            <img class="logo" src="${collegeLogo}" alt="Logo"/>
            <div>
              <div class="iname">INSPIRE JUNIOR COLLEGE</div>
              <div class="iaddr">Master Worker Payroll Ledger &middot; Campus: ${escapeHtml(loggedInCampus)}</div>
            </div>
          </div>
          <div class="slbl">
            <strong>Payroll Master Ledger</strong>
            <span>Total Records: ${totalStaff}</span>
          </div>
        </div>
        <div class="sgrid">
          <div class="sc"><span class="sl">Total Workers</span><span class="sv">${totalStaff}</span></div>
          <div class="sc"><span class="sl">Total Monthly Payroll</span><span class="sv">Rs. ${totalSalary.toLocaleString('en-IN')}</span></div>
          <div class="sc pd"><span class="sl">Total Disbursed</span><span class="sv">Rs. ${totalPaid.toLocaleString('en-IN')}</span></div>
          <div class="sc hi"><span class="sl">Total Outstanding Due</span><span class="sv">Rs. ${totalPending.toLocaleString('en-IN')}</span></div>
        </div>
        <table class="tbl">
          <thead><tr><th>#</th><th>Worker Name</th><th>Role</th><th>Period</th><th class="tr">Monthly Wage</th><th class="tr">Paid Amount</th><th class="tr">Pending Balance</th><th style="text-align:center;">Status</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="ftr">
          <div><div><strong>Generated On:</strong> ${escapeHtml(generatedDate)}</div><div style="margin-top:3px">Computer-generated master payroll summary &middot; Verified via Inspire ERP</div></div>
          <div class="sig">Authorized Signatory</div>
        </div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>
      </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    triggerToast('Master worker payroll report downloaded (' + totalStaff + ' records).');
  };

  const handleDownloadStaffPayslip = (t: Teacher, monthName: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast('Popup blocked by browser. Please allow popups.');
      return;
    }
    const monthlyRec = (t.monthlySalaries as any)?.[monthName] || {
      month: monthName,
      status: 'Unpaid',
      amountPaid: 0,
      paymentDate: 'N/A',
      paymentMode: 'N/A',
      note: ''
    };
    const baseSal = Number(t.salary || 0);
    const paidAmt = Number(monthlyRec.amountPaid || (monthlyRec.status === 'Paid' ? baseSal : 0));
    const dueAmt = Math.max(0, baseSal - paidAmt);
    const generatedDate = new Date().toLocaleString('en-IN');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Salary Payslip - ${escapeHtml(t.name)} (${monthName})</title>
    <style>
      @page { size: A4; margin: 12mm }
      * { box-sizing: border-box }
      body { margin: 0; color: #0F172A; background: #FFF; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact }
      .page { max-width: 182mm; margin: 0 auto; padding: 4px }
      .hdr { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 16px; margin-bottom: 20px; border-bottom: 3px solid #D4AF37 }
      .brand { display: flex; align-items: center; gap: 14px }
      .logo { width: 44px; height: 44px; object-fit: contain; background: #FFF; border-radius: 10px; padding: 4px; border: 1px solid #D4AF37 }
      .iname { color: #FFF; font-size: 15px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase }
      .iaddr { color: #94A3B8; font-size: 10px; line-height: 1.4; margin-top: 2px }
      .slbl strong { display: block; color: #FFF; font-size: 16px; font-weight: 900; text-transform: uppercase; text-align: right; letter-spacing: 0.04em }
      .slbl span { color: #F59E0B; font-size: 10px; font-weight: 800; text-transform: uppercase; display: block; margin-top: 2px }
      .scard { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(3,1fr); gap: 16px }
      .fl { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; display: block }
      .fv { font-size: 13.5px; font-weight: 800; color: #0F172A; display: block; margin-top: 4px }
      .sgrid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 16px }
      .sc { border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #FFF }
      .sc.hi { border-color: #D4AF37; background: #FFFDF4 }
      .sc .sl { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em }
      .sc .sv { font-size: 19px; font-weight: 900; color: #0F172A; display: block; margin-top: 6px }
      .sc.pd .sv { color: #059669 }
      .sc.hi .sv { color: #D97706 }
      .ftr { margin-top: 32px; padding-top: 16px; border-top: 1.5px dashed #CBD5E1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #64748B }
      .sig { border-top: 1.5px solid #0F172A; padding-top: 6px; font-size: 9px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin-top: 32px; text-align: center; width: 140px }
      .pbtn { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 20px; padding: 12px 26px; background: linear-gradient(135deg, #0F172A, #1E293B); color: #FFF; border: none; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(15,23,42,0.15) }
      @media print { .pbtn { display: none } }
    </style></head>
    <body>
      <div class="page">
        <button class="pbtn" onclick="window.print()">⬇ Print Official Monthly Payslip</button>
        <div class="hdr">
          <div class="brand">
            <img class="logo" src="${collegeLogo}" alt="Logo"/>
            <div>
              <div class="iname">INSPIRE JUNIOR COLLEGE</div>
              <div class="iaddr">Campus: ${escapeHtml(t.branch || loggedInCampus)} &middot; Staff Payroll</div>
            </div>
          </div>
          <div class="slbl">
            <strong>Staff Monthly Payslip</strong>
            <span>Month: ${escapeHtml(monthName)}</span>
          </div>
        </div>
        <div class="scard">
          <div><span class="fl">Employee Name</span><span class="fv">${escapeHtml(t.name)}</span></div>
          <div><span class="fl">Designation / Role</span><span class="fv">${escapeHtml(t.role || t.subject || 'Staff Member')}</span></div>
          <div><span class="fl">Classification</span><span class="fv">${escapeHtml(t.classification || 'Teaching')}</span></div>
          <div><span class="fl">Employee ID</span><span class="fv">${escapeHtml(t.id || t._id || 'STF-000')}</span></div>
          <div><span class="fl">Mobile</span><span class="fv">${escapeHtml(t.mobile || 'N/A')}</span></div>
          <div><span class="fl">Campus Branch</span><span class="fv">${escapeHtml(t.branch || loggedInCampus)}</span></div>
        </div>
        <div class="sgrid">
          <div class="sc"><span class="sl">Base Monthly Salary</span><span class="sv">Rs. ${baseSal.toLocaleString('en-IN')}</span></div>
          <div class="sc pd"><span class="sl">Amount Disbursed</span><span class="sv">Rs. ${paidAmt.toLocaleString('en-IN')}</span></div>
          <div class="sc hi"><span class="sl">Status / Balance</span><span class="sv">${monthlyRec.status === 'Paid' ? 'PAID' : `DUE Rs. ${dueAmt.toLocaleString('en-IN')}`}</span></div>
        </div>
        <div style="margin-top:20px; padding:16px; background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; font-size:11.5px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div><strong>Payment Mode:</strong> ${escapeHtml(monthlyRec.paymentMode || 'N/A')}</div>
            <div><strong>Payment Date:</strong> ${escapeHtml(monthlyRec.paymentDate || 'N/A')}</div>
          </div>
          ${monthlyRec.note ? `<div style="margin-top:8px;"><strong>Remarks:</strong> ${escapeHtml(monthlyRec.note)}</div>` : ''}
        </div>
        <div class="ftr">
          <div>
            <div><strong>Generated On:</strong> ${escapeHtml(generatedDate)}</div>
            <div style="margin-top:3px">Computer-generated staff salary statement &middot; Verified via Inspire ERP</div>
          </div>
          <div class="sig">Authorized Signatory</div>
        </div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleDownloadStaffAnnualStatement = (t: Teacher) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast('Popup blocked by browser. Please allow popups.');
      return;
    }
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const baseSal = Number(t.salary || 0);
    let totalDisbursed = 0;

    const monthRows = months.map(m => {
      const rec = (t.monthlySalaries as any)?.[m] || { status: 'Unpaid', amountPaid: 0, paymentDate: '—', paymentMode: '—' };
      const amt = Number(rec.amountPaid || (rec.status === 'Paid' ? baseSal : 0));
      totalDisbursed += amt;
      return `<tr>
        <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; font-weight:700; color:#0F172A">${m}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; color:${rec.status === 'Paid' ? '#059669' : '#DC2626'}; font-weight:800">${rec.status || 'Unpaid'}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; text-align:right; font-weight:800; color:#0F172A">Rs. ${amt.toLocaleString('en-IN')}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; text-align:center">${rec.paymentDate || '—'}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; text-align:center">${rec.paymentMode || '—'}</td>
      </tr>`;
    }).join('');

    const generatedDate = new Date().toLocaleString('en-IN');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Annual Salary Ledger - ${escapeHtml(t.name)}</title>
    <style>
      @page { size: A4; margin: 12mm }
      * { box-sizing: border-box }
      body { margin: 0; color: #0F172A; background: #FFF; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact }
      .page { max-width: 182mm; margin: 0 auto; padding: 4px }
      .hdr { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 14px; margin-bottom: 16px; border-bottom: 3px solid #D4AF37 }
      .brand { display: flex; align-items: center; gap: 12px }
      .logo { width: 42px; height: 42px; object-fit: contain; background: #FFF; border-radius: 10px; padding: 4px; border: 1px solid #D4AF37 }
      .iname { color: #FFF; font-size: 14px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase }
      .scard { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(4,1fr); gap: 12px }
      .fl { font-size: 8.5px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; display: block }
      .fv { font-size: 12px; font-weight: 800; color: #0F172A; display: block; margin-top: 3px }
      table { width: 100%; border-collapse: collapse; border: 1.5px solid #CBD5E1; border-radius: 12px; overflow: hidden; margin-top: 12px }
      th { background: #F1F5F9; color: #475569; padding: 10px 12px; font-size: 8.5px; text-transform: uppercase; text-align: left; font-weight: 800; letter-spacing: 0.06em; border-bottom: 1.5px solid #CBD5E1 }
      .ftr { margin-top: 24px; padding-top: 12px; border-top: 1.5px dashed #CBD5E1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #64748B }
      .sig { border-top: 1.5px solid #0F172A; padding-top: 6px; font-size: 9px; font-weight: 800; color: #0F172A; text-transform: uppercase; margin-top: 24px; text-align: center; width: 140px }
      .pbtn { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 16px; padding: 10px 24px; background: linear-gradient(135deg, #0F172A, #1E293B); color: #FFF; border: none; border-radius: 10px; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(15,23,42,0.15) }
      @media print { .pbtn { display: none } }
    </style></head>
    <body>
      <div class="page">
        <button class="pbtn" onclick="window.print()">⬇ Print 12-Month Annual Ledger Statement</button>
        <div class="hdr">
          <div class="brand">
            <img class="logo" src="${collegeLogo}" alt="Logo"/>
            <div>
              <div class="iname">INSPIRE JUNIOR COLLEGE</div>
              <div style="color:#94A3B8; font-size:10px; margin-top:2px">Annual Staff Payroll Statement - 2026</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="color:#F59E0B; font-size:16px; font-weight:900">Rs. ${totalDisbursed.toLocaleString('en-IN')}</div>
            <div style="color:#94A3B8; font-size:9px; font-weight:700">Total Annual Disbursed</div>
          </div>
        </div>
        <div class="scard">
          <div><span class="fl">Employee Name</span><span class="fv">${escapeHtml(t.name)}</span></div>
          <div><span class="fl">Role</span><span class="fv">${escapeHtml(t.role || t.subject)}</span></div>
          <div><span class="fl">Classification</span><span class="fv">${escapeHtml(t.classification || 'Teaching')}</span></div>
          <div><span class="fl">Campus</span><span class="fv">${escapeHtml(t.branch || loggedInCampus)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Status</th>
              <th style="text-align:right">Amount Paid</th>
              <th style="text-align:center">Payment Date</th>
              <th style="text-align:center">Mode</th>
            </tr>
          </thead>
          <tbody>
            ${monthRows}
          </tbody>
        </table>
        <div class="ftr">
          <div><div><strong>Generated On:</strong> ${escapeHtml(generatedDate)}</div><div style="margin-top:3px">Computer-generated annual salary ledger &middot; Verified via Inspire ERP</div></div>
          <div class="sig">Authorized Signatory</div>
        </div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  //  Admin2 Fetch Helpers
  const fetchFeeSettings = async (branch?: string, forceRefresh = false) => {
    if (isEditingFees && !forceRefresh) return;
    try {
      const targetBranch = branch || selectedFeeBranch;
      const data = await admin2Service.getFeeSettings(targetBranch);
      setFeeRates(data);
      setEditTuitionRate(String(data.tuition !== undefined ? data.tuition : 120000));
      setEditHostelRate(String(data.hostel !== undefined ? data.hostel : 85000));
      setEditMiscRate(String(data.misc !== undefined ? data.misc : 5000));
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

  const fetchStudents = async (query = '', suppressToast = false) => {
    try {
      const branchParam = role === 'admin2' ? loggedInCampus : '';
      const data = await admin1Service.getStudents(query, branchParam);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // On 404/503 (Vercel cold-start or transient error), retry once silently after a short delay
      if (err?.status === 404 || err?.status === 503) {
        try {
          await new Promise(r => setTimeout(r, 1500));
          const branchParam = role === 'admin2' ? loggedInCampus : '';
          const data = await admin1Service.getStudents(query, branchParam);
          setStudents(Array.isArray(data) ? data : []);
          return;
        } catch { /* fall through to toast below */ }
      }
      if (!suppressToast) {
        triggerToast(err.message || 'Failed to load students.');
      }
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

  const fetchTeachers = async () => {
    try {
      const branchParam = role === 'admin2' ? loggedInCampus : (filterFacCampus !== 'All' ? filterFacCampus : undefined);
      const data = await admin1Service.getTeachers(branchParam);
      if (Array.isArray(data)) {
        const uniqueMap = new Map();
        data.forEach((t: any) => {
          const key = String(t._id || t.id);
          uniqueMap.set(key, t);
        });
        setTeachers(Array.from(uniqueMap.values()));
      }
    } catch (err: any) {
      console.error('Failed to load teachers from backend:', err);
    }
  };

  const fetchWorkerPaymentsHistory = async () => {
    try {
      const data = await admin2Service.getWorkerPayments();
      if (Array.isArray(data)) {
        const filtered = data.filter((item: any) => role === 'admin2' ? item.branch === loggedInCampus : true);
        setWorkerPaymentsHistory(filtered);
      }
    } catch (err: any) {
      console.error('Failed to load worker payments history:', err);
    }
  };

  const fetchSections = fetchTeachers;

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

  const refreshCurrentPage = async (pulseKey?: any) => {
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



  // Initial data load on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const branchParam = role === 'admin2' ? loggedInCampus : undefined;
        const tasks: Promise<any>[] = [
          fetchStudents('', true), // suppressToast=true: cold-start 404s silently retry
          fetchBulletins(),
          fetchFeeSettings(branchParam, true)
        ];
        if (role === 'admin2') {
          tasks.push(fetchExpenditures(), fetchWorkerPayments(), fetchStaffSalaries());
        }
        await Promise.all(tasks);
      } catch (err) {
        console.error('Initial admin data load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [role, loggedInCampus]);

  // Smart polling: checks last-changed timestamp first, only triggers full refetch when data changed.
  // Pauses automatically when tab is hidden; immediately checks on tab focus/visibility restore.
  const adminRefetch = React.useCallback(async () => {
    await refreshCurrentPage(activePage);
  }, [refreshCurrentPage, activePage]);

  const { triggerRefetch: triggerFreshnessRefetch } = useDataFreshness(loggedInCampus, adminRefetch);

  useEffect(() => {
    // Supplementary window.focus listener — ensures activePage context is always current
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshCurrentPage(activePage);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activePage, refreshCurrentPage]);

  // Sync state variables with database records on subpage change
  useEffect(() => {
    const loadPageData = async () => {
      if (activePage === 'menu') return;
      setIsPageLoading(true);
      try {
        if (activePage === 'students' || activePage === 'teachers') {
          await Promise.all([fetchStudents(''), fetchSections()]);
        } else if (activePage === 'publishing') {
          await fetchBulletins();
        } else if (activePage === 'exams') {
          await Promise.all([fetchExams(), fetchStudents('')]);
        } else if (activePage === 'classes') {
          await Promise.all([fetchTimetable(timetableSection), fetchSections()]);
        } else if (activePage === 'sections') {
          await Promise.all([fetchSections(), fetchStudents('')]);
        } else if (activePage === 'attendance') {
          await Promise.all([fetchAttendanceSummary(), fetchAttendanceRoster(attendanceDate)]);
        } else if (activePage === 'reports') {
          await fetchReports();
        } else if (activePage === 'academic_fees') {
          await fetchFeeSettings();
        } else if (activePage === 'fee_editor') {
          await fetchStudents('');
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
        } else if (activePage === 'enquiries') {
          await fetchEnquiries();
        }
      } catch (err) {
        console.error('Page data load error for', activePage, err);
      } finally {
        setIsPageLoading(false);
      }
    };
    loadPageData();
  }, [activePage, timetableSection, attendanceDate]);

  const triggerToast = (msg: string, type?: 'success' | 'error') => {
    let isError = false;
    if (type) {
      isError = type === 'error';
    } else {
      const lower = msg.toLowerCase();
      isError = lower.includes('rejected') ||
                lower.includes('failed') ||
                lower.includes('denied') ||
                (lower.includes('invalid') && !lower.includes('invalidated')) ||
                lower.includes('not found') ||
                lower.includes('error') ||
                lower.includes('incorrect');
    }
    const symbol = isError ? 'ERROR: ' : 'Success: ';
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
    const targetStu = updated || editStudent;
    if (!targetStu) return;
    const targetId = targetStu._id || targetStu.studentId || targetStu.admissionNumber;
    if (!targetId) return;

    // Mobile validation
    const mobileErr = validateMobile((targetStu as any).mobile || '');
    if (mobileErr) { triggerToast(mobileErr); return; }
    const parentMobileErr = validateMobile((targetStu as any).parentMobile || '');
    if (parentMobileErr) { triggerToast('Parent mobile: ' + parentMobileErr); return; }

    // Fee cap validation
    const stuCustomSlots: any[] = (targetStu as any).customFeeSlots || [];
    const editedGross =
      Number((targetStu as any).tuitionFee || 0) +
      Number((targetStu as any).hostelFee || 0) +
      Number((targetStu as any).transportFee || 0) +
      Number((targetStu as any).miscellaneousFee || 0) +
      Number((targetStu as any).previousPending || 0) +
      stuCustomSlots.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
    if (editedGross > MAX_STUDENT_FEE) {
      triggerToast(`Total fees (Rs. ${editedGross.toLocaleString('en-IN')}) exceed the maximum allowed per student (Rs. ${MAX_STUDENT_FEE.toLocaleString('en-IN')}).`);
      return;
    }

    try {
      setGlobalSecurityKey(keyToUse.trim());
      const saved = await admin1Service.updateStudent(targetId, targetStu);
      const nextStu = (saved && (saved._id || saved.admissionNumber)) ? saved : targetStu;
      setStudents(prev => prev.map(s => (s._id === targetId || s.studentId === targetId || s.admissionNumber === targetId) ? { ...s, ...nextStu } : s));
      setSelectedStudent({ ...nextStu });
      setEditStudent({ ...nextStu });
      setIsOtpModalOpen(false);
      setOtpInput('');
      triggerToast(`Student profile and fee breakdown for ${nextStu.name} updated successfully.`);
      await triggerFreshnessRefetch();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save student details.');
    }
  };

  const handlePermanentDeleteStudent = async (keyToUse: string) => {
    const targetStu = selectedStudent || editStudent;
    if (!targetStu) {
      triggerToast('No student selected for deletion.');
      return;
    }
    const targetId = targetStu._id || targetStu.studentId || targetStu.admissionNumber;
    if (!targetId) {
      triggerToast('Invalid student ID for deletion.');
      return;
    }
    if (!keyToUse || !keyToUse.trim()) {
      triggerToast('Please enter a valid Security Authorization OTP.');
      return;
    }

    try {
      setGlobalSecurityKey(keyToUse.trim());
      await admin1Service.deleteStudent(targetId, keyToUse.trim());
      setStudents(prev => prev.filter(s =>
        s._id !== targetId &&
        s.studentId !== targetId &&
        s.admissionNumber !== targetId &&
        s._id !== targetStu._id &&
        s.studentId !== targetStu.studentId &&
        s.admissionNumber !== targetStu.admissionNumber
      ));
      setSelectedStudent(null);
      setEditStudent(null);
      setIsDeleteStuOtpOpen(false);
      setDeleteStuOtpInput('');
      triggerToast(`Student record for ${targetStu.name} (${targetStu.admissionNumber || targetId}) permanently deleted.`);
      await triggerFreshnessRefetch();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete student record. Check Security OTP.');
    }
  };

  const handleTeacherSave = async (updated: Teacher) => {
    setEditTeacher({ ...updated });
    setFacActionType('save');
    setFacOtpInput('');
    setIsFacOtpModalOpen(true);
  };

  const openStudentRegOtpModal = () => {
    if (!newStuName.trim() || !newStuAdmissionNumber.trim() || !newStuMobile.trim() || !newStuCourse.trim() || !newStuBranch.trim()) {
      triggerToast('Please complete Name, Admission Number, Mobile, Course, and Campus.');
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
    setIsSubmittingStudent(true);
    try {
      setGlobalSecurityKey(regStuOtpInput.trim());
      await handleRegisterStudent();
      setIsRegStuOtpModalOpen(false);
      setRegStuOtpInput('');
    } catch (err: any) {
      if (err?.status === 409) setRegStuError(err.message);
      triggerToast(err.message || 'Registration failed.');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleRegisterStudent = async () => {
    if (!newStuName.trim() || !newStuAdmissionNumber.trim() || !newStuMobile.trim() || !newStuCourse.trim() || !newStuBranch.trim()) {
      triggerToast('Please complete Student Name, Admission Number, Mobile, Course, and Campus.');
      return;
    }

    // Mobile validation
    const mobileErr = validateMobile(newStuMobile);
    if (mobileErr) { triggerToast(mobileErr); return; }
    const parentMobileErr = validateMobile(newStuParentMobile);
    if (parentMobileErr) { triggerToast('Parent mobile: ' + parentMobileErr); return; }

    const newAdm = newStuAdmissionNumber.trim();

    const activeSlots = newStuFeeSlots.filter(s => Number(s.amount) > 0);
    const grossFeeTotal = activeSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    // Fee cap validation
    if (grossFeeTotal > MAX_STUDENT_FEE) {
      triggerToast(`Total fees (Rs. ${grossFeeTotal.toLocaleString('en-IN')}) exceed the maximum allowed per student (Rs. ${MAX_STUDENT_FEE.toLocaleString('en-IN')}).`);
      return;
    }

    const stdKeys = ['tuitionFee', 'hostelFee', 'transportFee', 'miscellaneousFee', 'previousPending'];
    const finalCustomSlots = activeSlots
      .filter(s => s.isCustom || (!stdKeys.includes(s.id) && !stdKeys.includes(s.key)))
      .map(s => ({
        id: s.id,
        key: s.key,
        name: s.name,
        amount: Number(s.amount) || 0
      }));

    const getSlotAmt = (k: string) => {
      const found = activeSlots.find(s => s.key === k);
      return found ? (Number(found.amount) || 0) : 0;
    };

    const newStu: any = {
      admissionNumber: newAdm,
      studentId: newAdm,
      name: newStuName.trim(),
      branch: newStuBranch,
      mobile: newStuMobile.trim(),
      course: newStuCourse.trim(),
      section: newStuSection.trim(),
      fatherName: newStuFatherName.trim(),
      motherName: newStuMotherName.trim(),
      dob: newStuDob,
      parentMobile: newStuParentMobile.trim(),
      previousSchool: newStuPreviousSchool.trim(),
      previousBoard: newStuPreviousBoard.trim(),
      address: newStuAddress.trim(),
      status: 'Active',
      tuitionFee: getSlotAmt('tuitionFee'),
      booksFee: getSlotAmt('booksFee'),
      uniformFees: getSlotAmt('uniformFees'),
      hndFees: getSlotAmt('hndFees'),
      internalExamFees: getSlotAmt('internalExamFees'),
      annualExamFees: getSlotAmt('annualExamFees'),
      partyFees: getSlotAmt('partyFees'),
      busFees: getSlotAmt('busFees'),
      labFees: getSlotAmt('labFees'),
      handLoan: getSlotAmt('handLoan'),
      othersFee: getSlotAmt('othersFee'),
      customFeeSlots: finalCustomSlots,
      hostelFee: 0,
      transportFee: 0,
      miscellaneousFee: 0,
      previousPending: 0,
      totalPaid: 0,
      remainingBalance: grossFeeTotal
    };

    try {
      const response = await apiClient.post('/admin1/students', newStu);
      if (response && (response.status === 'success' || response.data)) {
        const pin = response.credential?.pin || '';
        newStu.tempPassword = pin;
        setStudents(prev => [...prev, newStu]);
        setSelectedStudent(newStu);
        setEditStudent({ ...newStu });
        setNewStuName('');
        setNewStuAdmissionNumber('');
        setNewStuMobile('');
        setNewStuCourse('MPC');
        setNewStuSection('MPC-A');
        setNewStuFatherName('');
        setNewStuMotherName('');
        setNewStuDob('');
        setNewStuParentMobile('');
        setNewStuPreviousSchool('');
        setNewStuPreviousBoard('State Board');
        setNewStuAddress('');
        setNewStuFormPage(1);
        setIsStudentHoverModalOpen(false);
        setNewStuBranch(loggedInCampus);
        setRegistryPage(1);
        triggerToast(`Student ${newStu.name} registered successfully! ID: ${newAdm}`);
        await triggerFreshnessRefetch();
      } else {
        triggerToast(response?.message || 'Failed to register student.');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error creating student.');
    }
  };

  const handleAddTeacher = async () => {
    if (!newFacName.trim() || !newFacSub.trim() || !newFacSal || !newFacMobile.trim() || !newFacBranch.trim()) {
      triggerToast('Please complete name, role, salary, mobile, and branch.');
      return;
    }
    // Mobile validation
    const facMobileErr = validateMobile(newFacMobile);
    if (facMobileErr) { triggerToast(facMobileErr); return; }
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
      setGlobalSecurityKey(facOtpInput.trim());
      if (facActionType === 'add') {
        const newId = `FAC-20${Math.floor(1000 + Math.random() * 9000)}`;
        const teacherPayload = {
          id: newId,
          name: newFacName,
          subject: newFacSub || 'Faculty',
          email: newFacEmail,
          salary: parseFloat(newFacSal) || 50000,
          mobile: newFacMobile,
          branch: role === 'admin2' ? loggedInCampus : newFacBranch
        };
        await admin1Service.createTeacher(teacherPayload as any);
        setNewFacName('');
        setNewFacEmail('');
        setNewFacSal('');
        setNewFacMobile('');
        setNewFacSub('');
        setIsAddTeacherModalOpen(false);
        setIsFacOtpModalOpen(false);
        setFacOtpInput('');
        triggerToast(`Faculty member ${teacherPayload.name} registered successfully!`);
        await fetchTeachers();
      } else if (facActionType === 'edit' && editTeacher) {
        // Mobile validation on teacher edit
        const editFacMobileErr = validateMobile(editTeacher.mobile || '');
        if (editFacMobileErr) { triggerToast(editFacMobileErr); return; }
        const targetId = editTeacher._id || editTeacher.id || '';
        await admin1Service.updateTeacher(targetId, editTeacher);
        setSelectedTeacher(null);
        setEditTeacher(null);
        setIsFacOtpModalOpen(false);
        setFacOtpInput('');
        triggerToast(`Faculty credentials for ${editTeacher.name} saved successfully.`);
        await fetchTeachers();
      } else if (facActionType === 'delete' && pendingDeleteTeacherId) {
        await admin1Service.deleteTeacher(pendingDeleteTeacherId, facOtpInput.trim());
        setSelectedTeacher(null);
        setEditTeacher(null);
        setPendingDeleteTeacherId(null);
        setIsFacOtpModalOpen(false);
        setFacOtpInput('');
        triggerToast('Faculty record permanently deleted.');
        await fetchTeachers();
      } else if (facActionType === 'salary_payment' && (editTeacher || selectedTeacher) && selectedStaffMonthForEdit) {
        const targetObj = editTeacher || selectedTeacher;
        const targetId = targetObj._id || targetObj.id || '';
        const res = await admin1Service.payTeacherSalary(targetId, {
          academicYear: selectedAcademicYear,
          month: selectedStaffMonthForEdit,
          amountPaid: Number(staffMonthAmount || targetObj.salary || 0),
          paymentMode: staffMonthMode || 'Bank Transfer',
          note: staffMonthNote || ''
        }, facOtpInput.trim());

        if (res && res.data) {
          setEditTeacher(res.data);
          setSelectedTeacher(res.data);
        }
        setIsFacOtpModalOpen(false);
        setFacOtpInput('');
        setSelectedStaffMonthForEdit(null);
        triggerToast(`Salary payment recorded for ${selectedStaffMonthForEdit} (${selectedAcademicYear}).`);
        await fetchTeachers();
        await fetchWorkerPaymentsHistory();
      }
    } catch (err: any) {
      triggerToast(err.message || 'Verification failed.');
    }
  };

  const handleConfirmDeleteStudent = async (otpToUse: string) => {
    await handlePermanentDeleteStudent(otpToUse);
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
      const payload = {
        tuition: Number(feeRates.tuition !== undefined ? feeRates.tuition : editTuitionRate) || 0,
        hostel: Number(feeRates.hostel !== undefined ? feeRates.hostel : editHostelRate) || 0,
        transport: 0,
        misc: Number(feeRates.misc !== undefined ? feeRates.misc : editMiscRate) || 0,
        isLocked: true,
        branch: selectedFeeBranch
      };
      const saved = await admin2Service.updateFeeSettings(payload);
      setFeeRates(saved);
      setEditTuitionRate(String(saved.tuition));
      setEditHostelRate(String(saved.hostel));
      setEditMiscRate(String(saved.misc));
      setIsEditingFees(false);
      setIsAcadFeeOtpOpen(false);
      setAcadFeeOtpInput('');
      triggerToast(`Academic baseline fees for ${selectedFeeBranch} finalized and locked.`);
      // Refetch from server immediately after fee settings update
      await triggerFreshnessRefetch();
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
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '4px solid rgba(0,0,0,.1)',
          borderLeftColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin89345 1s linear infinite'
        }} />
      </div>
    );
  }

  //  SUBPAGE 1: STUDENT REGISTRY
  if (activePage === 'students') {
    const filteredRegistryStudents = students.filter((student) => matchesStudentQuery(student, searchAdm));
    const registryPageSize = 20;
    const registryTotalPages = Math.max(1, Math.ceil(filteredRegistryStudents.length / registryPageSize));
    const registryCurrentPage = Math.min(registryPage, registryTotalPages);
    const registryPageStudents = filteredRegistryStudents.slice((registryCurrentPage - 1) * registryPageSize, registryCurrentPage * registryPageSize);

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
          {/* Surface Bar: Single Quick Entry Horizontal Bar */}
          <div style={{ ...styles.readOnlyBlock, zIndex: 1, marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <h4 style={{ ...styles.sectionSubtitle, margin: 0, fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                  Register New Student Admission
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                  Quick single-bar surface entry. Fill basic info and click submit to open detailed hover modal.
                </p>
              </div>
            </div>

            {/* Single Horizontal Surface Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Admission Number *</label>
                <input
                  type="text"
                  placeholder={`ADM2400${students.length + 1}`}
                  value={newStuAdmissionNumber}
                  onChange={(e) => { setNewStuAdmissionNumber(e.target.value); setRegStuError(''); }}
                  style={{ ...styles.textInputBox, fontSize: '12.5px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Student Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newStuName}
                  onChange={(e) => setNewStuName(e.target.value)}
                  style={{ ...styles.textInputBox, fontSize: '12.5px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Mobile Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 9900000000"
                  value={newStuMobile}
                  onChange={(e) => setNewStuMobile(e.target.value)}
                  style={{ ...styles.textInputBox, fontSize: '12.5px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Campus / Branch *</label>
                <select
                  value={newStuBranch}
                  onChange={(e) => setNewStuBranch(e.target.value)}
                  style={{ ...styles.selectInput, fontSize: '12.5px' }}
                >
                  <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                  <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                  <option value="Beemaram C1">Beemaram Campus C1</option>
                  <option value="Beemaram C2">Beemaram Campus C2</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Course *</label>
                <select
                  value={newStuCourse}
                  onChange={(e) => setNewStuCourse(e.target.value)}
                  style={{ ...styles.selectInput, fontSize: '12.5px' }}
                >
                  <option value="MPC">MPC</option>
                  <option value="BiPC">BiPC</option>
                  <option value="CEC">CEC</option>
                  <option value="MEC">MEC</option>
                  <option value="HEC">HEC</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Academic Year *</label>
                <select
                  value={newStuYear}
                  onChange={(e) => setNewStuYear(e.target.value as any)}
                  style={{ ...styles.selectInput, fontSize: '12.5px' }}
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="Short Term">Short Term</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!newStuName.trim() || !newStuMobile.trim()) {
                      triggerToast('Please complete Student Name and Mobile Number first.');
                      return;
                    }
                    if (!newStuAdmissionNumber.trim()) {
                      setNewStuAdmissionNumber(`ADM2400${students.length + 1}`);
                    }
                    setNewStuFormPage(1);
                    setIsStudentHoverModalOpen(true);
                  }}
                  style={{
                    ...styles.saveSubmitBtn,
                    marginTop: 0,
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  className="press-interactive"
                >
                  Submit Student →
                </button>
              </div>
            </div>
          </div>

          {/* Hover Modal Overlay for Telangana Student Profile & Fee Structure */}
          {isStudentHoverModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '920px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1.5px solid #CBD5E1',
                display: 'flex',
                flexDirection: 'column'
              }} className="anim-scale-up">
                {/* Modal Header */}
                <div style={{
                  padding: '16px 24px',
                  borderBottom: '1.5px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      INSPIRE JUNIOR COLLEGE • STUDENT ADMISSION REGISTRATION
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>
                      {newStuFormPage === 1 ? 'Screen 1 of 3: Basic Academic Information' : newStuFormPage === 2 ? 'Screen 2 of 3: Personal & Family Information' : 'Screen 3 of 3: Fee Structure & Bill Format'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: newStuFormPage === 1 ? '#0F172A' : '#E2E8F0',
                        color: newStuFormPage === 1 ? '#FFFFFF' : '#475569'
                      }}>
                        1. Basic Info
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: newStuFormPage === 2 ? '#0F172A' : '#E2E8F0',
                        color: newStuFormPage === 2 ? '#FFFFFF' : '#475569'
                      }}>
                        2. Personal & Family
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: newStuFormPage === 3 ? '#0F172A' : '#E2E8F0',
                        color: newStuFormPage === 3 ? '#FFFFFF' : '#475569'
                      }}>
                        3. Fee Structure
                      </span>
                    </div>
                    <button
                      onClick={() => setIsStudentHoverModalOpen(false)}
                      style={{
                        background: '#E2E8F0',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 900,
                        color: '#334155'
                      }}
                      title="Close Modal"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div style={{ padding: '20px 24px' }}>
                  {newStuFormPage === 1 ? (
                    <div>
                      {/* Screen 1: Basic Information */}
                      <div style={{ marginBottom: '18px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '12px' }}>
                          1. Basic Academic Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                          <div>
                            <label style={styles.formLabel}>Admission Number *</label>
                            <input type="text" placeholder="e.g. 2400101" value={newStuAdmissionNumber} onChange={(e) => setNewStuAdmissionNumber(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Student Full Name *</label>
                            <input type="text" placeholder="e.g. Rahul Sharma" value={newStuName} onChange={(e) => setNewStuName(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Student Mobile Number *</label>
                            <input type="text" placeholder="10-digit mobile" value={newStuMobile} onChange={(e) => setNewStuMobile(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Campus / Branch *</label>
                            <select value={newStuBranch} onChange={(e) => setNewStuBranch(e.target.value)} style={styles.selectInput}>
                              <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                              <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                              <option value="Beemaram C1">Beemaram Campus C1</option>
                              <option value="Beemaram C2">Beemaram Campus C2</option>
                            </select>
                          </div>
                          <div>
                            <label style={styles.formLabel}>Course *</label>
                            <select value={newStuCourse} onChange={(e) => setNewStuCourse(e.target.value)} style={styles.selectInput}>
                              <option value="MPC">MPC (Maths, Physics, Chem)</option>
                              <option value="BiPC">BiPC (Biology, Phys, Chem)</option>
                              <option value="CEC">CEC (Civics, Econ, Commerce)</option>
                              <option value="MEC">MEC (Maths, Econ, Commerce)</option>
                              <option value="HEC">HEC (Hist, Econ, Civics)</option>
                            </select>
                          </div>
                          <div>
                            <label style={styles.formLabel}>Section *</label>
                            <input type="text" placeholder="e.g. MPC-A" value={newStuSection} onChange={(e) => setNewStuSection(e.target.value)} style={styles.textInputBox} />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setIsStudentHoverModalOpen(false)}
                          style={{ ...styles.actionItemBtn, backgroundColor: '#E2E8F0', color: '#475569', padding: '10px 20px', border: 'none' }}
                          className="press-interactive"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newStuName.trim() || !newStuAdmissionNumber.trim() || !newStuMobile.trim()) {
                              triggerToast('Please provide Student Name, Admission Number, and Mobile Number.');
                              return;
                            }
                            setNewStuFormPage(2);
                          }}
                          style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '10px 28px', backgroundColor: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}
                          className="press-interactive"
                        >
                          Next: Personal & Family Info (Screen 2 of 3) →
                        </button>
                      </div>
                    </div>
                  ) : newStuFormPage === 2 ? (
                    <div>
                      {/* Screen 2: Personal & Family Information */}
                      <div style={{ marginBottom: '18px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '12px' }}>
                          2. Personal & Family Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                          <div>
                            <label style={styles.formLabel}>Father's Name</label>
                            <input type="text" placeholder="e.g. Ramesh Sharma" value={newStuFatherName} onChange={(e) => setNewStuFatherName(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Mother's Name</label>
                            <input type="text" placeholder="e.g. Sunitha Sharma" value={newStuMotherName} onChange={(e) => setNewStuMotherName(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Date of Birth</label>
                            <input type="date" value={newStuDob} onChange={(e) => setNewStuDob(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Parent Contact Mobile</label>
                            <input type="text" placeholder="e.g. 9876543210" value={newStuParentMobile} onChange={(e) => setNewStuParentMobile(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Previous School</label>
                            <input type="text" placeholder="e.g. ZPHS / St. Johns High School" value={newStuPreviousSchool} onChange={(e) => setNewStuPreviousSchool(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Previous School Board</label>
                            <select value={newStuPreviousBoard} onChange={(e) => setNewStuPreviousBoard(e.target.value)} style={styles.selectInput}>
                              <option value="State Board">State Board (SSC)</option>
                              <option value="CBSE">CBSE</option>
                              <option value="ICSE">ICSE</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={styles.formLabel}>Permanent Address</label>
                            <input type="text" placeholder="H.No., Street, Village/Mandal, District" value={newStuAddress} onChange={(e) => setNewStuAddress(e.target.value)} style={styles.textInputBox} />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setNewStuFormPage(1)}
                          style={{ ...styles.actionItemBtn, backgroundColor: '#E2E8F0', color: '#1E293B', padding: '10px 18px', fontWeight: 800 }}
                          className="press-interactive"
                        >
                          ← Back to Basic Info (Screen 1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewStuFormPage(3)}
                          style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '10px 28px', backgroundColor: '#0F172A', color: '#FFFFFF', fontWeight: 800 }}
                          className="press-interactive"
                        >
                          Next: Fee Structure & Bill Format (Screen 3 of 3) →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Screen 3: Fee Structure */}
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '8px', marginBottom: '4px' }}>
                          <div>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              INSPIRE JUNIOR COLLEGE
                            </span>
                            <h4 style={{ margin: '1px 0 0', fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>
                              Fee Structure & Bill Format Breakdown
                            </h4>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>Live Accumulated Total:</span>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#059669', marginLeft: '6px' }}>
                              Rs.{newStuFeeSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 32px', gap: '8px', paddingBottom: '4px', borderBottom: '1px solid #CBD5E1' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                            Fee Section Description
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                            Amount (Rs)
                          </span>
                          <span></span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
                          {newStuFeeSlots.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '12px', fontStyle: 'italic' }}>
                              All fee slots removed. Click "+ Add Fee Section Slot" below to add slots.
                            </div>
                          ) : (
                            newStuFeeSlots.map((slot) => (
                              <div key={slot.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 32px', gap: '8px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{slot.name}</label>
                                  {slot.isCustom && (
                                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--royal-gold)', backgroundColor: '#FFFDF5', padding: '1px 4px', borderRadius: '4px' }}>Custom</span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={slot.amount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNewStuFeeSlots(prev => prev.map(s => s.id === slot.id ? { ...s, amount: val } : s));
                                  }}
                                  style={{ ...styles.textInputBox, textAlign: 'right', fontWeight: 700, padding: '4px 8px', fontSize: '12px' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNewStuFeeSlot(slot.id)}
                                  style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800, fontSize: '11px' }}
                                  title="Delete Fee Slot"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {newStuIsAddingSlot ? (
                          <div style={{ display: 'flex', gap: '8px', padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', marginTop: '4px' }}>
                            <input
                              type="text"
                              placeholder="Fee Section Description"
                              value={newStuSlotName}
                              onChange={(e) => setNewStuSlotName(e.target.value)}
                              style={{ ...styles.textInputBox, flex: 2, fontSize: '12px' }}
                            />
                            <input
                              type="number"
                              placeholder="Amount (Rs)"
                              value={newStuSlotAmount}
                              onChange={(e) => setNewStuSlotAmount(e.target.value)}
                              style={{ ...styles.textInputBox, flex: 1, textAlign: 'right', fontSize: '12px' }}
                            />
                            <button
                              type="button"
                              onClick={handleAddNewStuCustomSlot}
                              style={{ ...styles.actionItemBtn, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '4px 12px', fontSize: '12px', fontWeight: 800 }}
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => { setNewStuIsAddingSlot(false); setNewStuSlotName(''); setNewStuSlotAmount(''); }}
                              style={{ ...styles.actionItemBtn, backgroundColor: '#E2E8F0', color: '#475569', border: 'none', padding: '4px 8px', fontSize: '12px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setNewStuIsAddingSlot(true)}
                            style={{
                              marginTop: '4px',
                              alignSelf: 'flex-start',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px dashed var(--royal-gold)',
                              backgroundColor: '#FFFDF5',
                              color: '#7C5A00',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            className="press-interactive"
                          >
                            + Add Fee Section Slot
                          </button>
                        )}

                        <div style={{ borderTop: '2px solid #0F172A', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A' }}>
                            GROSS BASE FEES TOTAL:
                          </span>
                          <span style={{ fontSize: '16px', fontWeight: 900, color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 14px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                            Rs. {newStuFeeSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setNewStuFormPage(2)}
                          style={{ ...styles.actionItemBtn, backgroundColor: '#E2E8F0', color: '#1E293B', padding: '10px 18px', fontWeight: 800 }}
                          className="press-interactive"
                        >
                          ← Back to Personal & Family Info (Screen 2)
                        </button>
                        <button
                          type="button"
                          onClick={handleRegisterStudent}
                          style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '10px 28px', backgroundColor: '#059669', color: '#FFFFFF', fontWeight: 900 }}
                          className="press-interactive"
                        >
                          Submit & Create Student Profile Directly
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search student by Name or Admission Number..."
                value={searchAdm}
                onChange={(e) => { setSearchAdm(e.target.value); setRegistryPage(1); }}
                style={styles.textInputBox}
              />
              <button onClick={handleSearchStudent} style={{ ...styles.saveSubmitBtn, marginTop: 0 }} className="press-interactive">Load</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1, marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Student Cards</h4>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted-gray)' }}>
                Showing <strong>{registryPageStudents.length}</strong> of <strong>{filteredRegistryStudents.length}</strong>
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px'
            }}>
              {registryPageStudents.map((student) => (
                <GlassCard
                  key={student._id || student.admissionNumber || student.studentId}
                  hoverable={true}
                  onClick={() => {
                    setSelectedStudent(student);
                    setEditStudent({ ...student });
                  }}
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255,255,255,0.75)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {(student.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '14px', color: 'var(--dark-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.name}
                        </strong>
                        <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                          Adm: {student.admissionNumber}  |  Reg: {student.registrationNumber || student.studentId}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                          {student.branch} ({student.course})
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: student.status === 'Active' ? '#10B981' : '#EF4444' }}>
                      {student.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudent(student);
                        setEditStudent({ ...student });
                      }}
                      style={{
                        padding: '8px 12px',
                        border: '1.5px solid var(--royal-gold)',
                        color: '#8A6500',
                        backgroundColor: '#FFFDF5',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      className="press-interactive"
                    >
                      Open Profile
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={() => setRegistryPage(prev => Math.max(1, prev - 1))}
                disabled={registryCurrentPage <= 1}
                style={{
                  ...styles.actionItemBtn,
                  border: '1.5px solid var(--card-border)',
                  opacity: registryCurrentPage <= 1 ? 0.45 : 1
                }}
                className="press-interactive"
              >
                Previous Page
              </button>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted-gray)' }}>
                Page <strong>{registryCurrentPage}</strong> of <strong>{registryTotalPages}</strong>
              </div>
              <button
                onClick={() => setRegistryPage(prev => Math.min(registryTotalPages, prev + 1))}
                disabled={registryCurrentPage >= registryTotalPages}
                style={{
                  ...styles.actionItemBtn,
                  border: '1.5px solid var(--card-border)',
                  opacity: registryCurrentPage >= registryTotalPages ? 0.45 : 1
                }}
                className="press-interactive"
              >
                Next Page
              </button>
            </div>
          </div>

          {selectedStudent && editStudent ? (
            <div style={styles.modalOverlay} className="anim-fade-in">
              <div style={{ ...styles.overlaySheet, maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={styles.modalTitle}>Student Master Profile & Details Editor</h3>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                      Modify student profile, family information, and campus itemized fee structure details below.
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelectedStudent(null); setEditStudent(null); }}
                    style={{ background: 'none', border: 'none', fontSize: '24px', fontWeight: 900, cursor: 'pointer', color: 'var(--muted-gray)' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Top Student Banner */}
                  <div style={{ ...styles.readOnlyBlock, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>
                        {(editStudent.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: '16px', color: 'var(--dark-charcoal)', display: 'block' }}>{editStudent.name || 'Student Name'}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--muted-gray)', fontWeight: 600 }}>Admission No: {editStudent.admissionNumber || editStudent.studentId}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', backgroundColor: '#E0E7FF', color: '#3730A3' }}>
                        {editStudent.branch || 'Campus'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', backgroundColor: '#ECFDF5', color: '#065F46' }}>
                        {editStudent.course || 'Course'}
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Basic & Academic Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase' }}>
                      1. Basic & Academic Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Full Student Name</label>
                        <input type="text" value={editStudent.name || ''} onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Admission Number</label>
                        <input type="text" value={editStudent.admissionNumber || ''} onChange={(e) => setEditStudent({ ...editStudent, admissionNumber: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Campus / Branch</label>
                        <select value={editStudent.branch || ''} onChange={(e) => setEditStudent({ ...editStudent, branch: e.target.value })} style={styles.selectInput}>
                          <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                          <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                          <option value="Beemaram C1">Beemaram Campus C1</option>
                          <option value="Beemaram C2">Beemaram Campus C2</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Student Mobile</label>
                        <input type="text" value={editStudent.mobile || ''} onChange={(e) => setEditStudent({ ...editStudent, mobile: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Course</label>
                        <select value={editStudent.course || 'MPC'} onChange={(e) => setEditStudent({ ...editStudent, course: e.target.value })} style={styles.selectInput}>
                          <option value="MPC">MPC</option>
                          <option value="BiPC">BiPC</option>
                          <option value="CEC">CEC</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Section</label>
                        <input type="text" placeholder="e.g. Section A" value={editStudent.section || ''} onChange={(e) => setEditStudent({ ...editStudent, section: e.target.value })} style={styles.textInputBox} />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Personal & Family Profile */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase' }}>
                      2. Personal & Family Profile
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Father Name</label>
                        <input type="text" value={editStudent.fatherName || ''} onChange={(e) => setEditStudent({ ...editStudent, fatherName: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Mother Name</label>
                        <input type="text" value={editStudent.motherName || ''} onChange={(e) => setEditStudent({ ...editStudent, motherName: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Date of Birth</label>
                        <input type="date" value={editStudent.dob || ''} onChange={(e) => setEditStudent({ ...editStudent, dob: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Parent Mobile Contact</label>
                        <input type="text" value={editStudent.parentMobile || ''} onChange={(e) => setEditStudent({ ...editStudent, parentMobile: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Past School</label>
                        <input type="text" value={editStudent.pastSchool || ''} onChange={(e) => setEditStudent({ ...editStudent, pastSchool: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Previous School / Board</label>
                        <input type="text" value={editStudent.previousSchool || ''} onChange={(e) => setEditStudent({ ...editStudent, previousSchool: e.target.value })} style={styles.textInputBox} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Permanent Address</label>
                      <input type="text" value={editStudent.address || ''} onChange={(e) => setEditStudent({ ...editStudent, address: e.target.value })} style={styles.textInputBox} />
                    </div>
                  </div>

                  {/* Section 3: Itemized Fee Structure Breakdown (Bill Format) */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '16px',
                    padding: '18px',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '8px'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          INSPIRE JUNIOR COLLEGE
                        </span>
                        <h4 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>
                          Fee Structure & Bill Format
                        </h4>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 12px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                        Gross Total Base Fee: Rs.{(
                          (Number(editStudent.tuitionFee) || 0) +
                          (Number(editStudent.booksFee) || 0) +
                          (Number(editStudent.uniformFees) || 0) +
                          (Number(editStudent.hndFees) || 0) +
                          (Number(editStudent.internalExamFees) || 0) +
                          (Number(editStudent.annualExamFees) || 0) +
                          (Number(editStudent.partyFees) || 0) +
                          (Number(editStudent.busFees) || 0) +
                          (Number(editStudent.labFees) || 0) +
                          (Number(editStudent.handLoan) || 0) +
                          (Number(editStudent.othersFee) || 0) +
                          (Number(editStudent.hostelFee) || 0) +
                          (Number(editStudent.miscellaneousFee) || 0) +
                          ((editStudent.customFeeSlots || []).reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0))
                        ).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Fee Section Description (Left) & Amount Inputs (Right) - Only Finalized Active Slots */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {((editStudent.customFeeSlots && editStudent.customFeeSlots.length > 0)
                        ? editStudent.customFeeSlots
                        : getAdminActiveFeeSlots(editStudent)
                      ).map((slot: any) => (
                        <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ ...styles.formLabel, fontWeight: 700, color: '#1E293B' }}>
                              {slot.name}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const currentSlots = editStudent.customFeeSlots && editStudent.customFeeSlots.length > 0
                                  ? editStudent.customFeeSlots
                                  : getAdminActiveFeeSlots(editStudent);
                                const updatedSlots = currentSlots.filter((s: any) => s.id !== slot.id);
                                setEditStudent({ ...editStudent, customFeeSlots: updatedSlots });
                                triggerToast(`Fee slot "${slot.name}" deleted.`);
                              }}
                              style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                              title="Delete Fee Slot"
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            type="number"
                            value={slot.amount}
                            onChange={(e) => {
                              const amt = parseFloat(e.target.value) || 0;
                              const currentSlots = editStudent.customFeeSlots && editStudent.customFeeSlots.length > 0
                                ? editStudent.customFeeSlots
                                : getAdminActiveFeeSlots(editStudent);
                              const updatedSlots = currentSlots.map((s: any) => s.id === slot.id ? { ...s, amount: amt } : s);
                              setEditStudent({ ...editStudent, customFeeSlots: updatedSlots });
                            }}
                            style={{ ...styles.textInputBox, fontWeight: 700, textAlign: 'right' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '14px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
                    <button
                      onClick={() => { setOtpInput(''); setIsOtpModalOpen(true); }}
                      style={{ ...styles.saveSubmitBtn, flex: 2, marginTop: 0 }}
                      className="press-interactive"
                    >
                      Submit & Save Complete Profile
                    </button>
                    {(role === 'admin1' || role === 'admin2' || role === 'accountant') && (
                      <button
                        onClick={() => { setDeleteStuOtpInput(''); setIsDeleteStuOtpOpen(true); }}
                        style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: '#DC2626', color: '#fff', border: 'none' }}
                        className="press-interactive"
                      >
                        Delete Student
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* STUDENT REGISTRATION OTP MODAL */}
          {isRegStuOtpModalOpen && (
            <div style={styles.overlayOverlay}>
              <div style={{ ...styles.overlaySheet, maxWidth: '440px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ ...styles.modalTitle, color: 'var(--royal-gold)', margin: 0 }}>Security Authorization OTP</h3>
                  <button onClick={() => !isSubmittingStudent && setIsRegStuOtpModalOpen(false)} disabled={isSubmittingStudent} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: isSubmittingStudent ? 'not-allowed' : 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}>×</button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted-gray)', marginBottom: '14px', lineHeight: 1.4 }}>
                  Enter your 6-digit Security Authorization Key / OTP to finalize student registration for <strong>{newStuName}</strong> (Adm No: {newStuAdmissionNumber || `ADM2400${students.length + 1}`}).
                </p>
                {regStuError && <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '12px', fontWeight: 700 }}>{regStuError}</div>}

                {isSubmittingStudent ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
                    <div style={{ width: '36px', height: '36px', border: '4px solid rgba(0,0,0,.1)', borderLeftColor: 'transparent', borderRadius: '50%', animation: 'spin89345 1s linear infinite' }} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      <label style={styles.formLabel}>Enter 6-Digit Security Key (OTP)</label>
                      <input
                        type="text"
                        placeholder="Enter OTP or Daily PIN"
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* DELETE STUDENT OTP VERIFICATION MODAL */}
          {isDeleteStuOtpOpen && editStudent && (
            <div style={styles.modalOverlay} className="anim-fade-in">
              <GlassCard hoverable={false} style={styles.modalContentCard} className="anim-scale-in glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ ...styles.modalIconBadge, backgroundColor: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.4)' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#DC2626' }}>DELETE</span>
                  </div>
                  <h3 style={{ ...styles.modalHeading, color: '#DC2626' }}>Delete Student Record</h3>
                  <p style={styles.modalSubText}>
                    Enter the <strong>Student Registry OTP</strong> to permanently purge <strong>{editStudent.name}</strong> ({editStudent.admissionNumber}).
                  </p>
                  <div style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '8px' }}>
                    24h Key Reset Timer: {otpCountdown}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="ENTER 6-DIGIT OTP"
                    value={deleteStuOtpInput}
                    onChange={(e) => setDeleteStuOtpInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter' && deleteStuOtpInput.trim()) handleConfirmDeleteStudent(deleteStuOtpInput.trim()); }}
                    style={{ ...styles.modalOtpInput, borderColor: 'rgba(239,68,68,0.5)' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setIsDeleteStuOtpOpen(false); setDeleteStuOtpInput(''); }} style={styles.modalCancelBtn} className="press-interactive">Cancel</button>
                    <button
                      onClick={() => handleConfirmDeleteStudent(deleteStuOtpInput.trim())}
                      disabled={!deleteStuOtpInput.trim()}
                      style={{ ...styles.modalConfirmBtn, backgroundColor: '#DC2626', opacity: deleteStuOtpInput.trim() ? 1 : 0.5 }}
                      className="press-interactive"
                    >
                      Confirm & Purge Record
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

  // SUBPAGE 2: STAFF & FACULTY REGISTRY (WITH 12-MONTH SALARY LEDGER)
  if (activePage === 'teachers') {
    const monthsList = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    const currentMonth = "July";

    const filteredStaff = teachers.filter(t => {
      // Role & campus isolation
      if (role === 'admin2' && t.branch !== loggedInCampus) return false;
      if (filterFacCampus !== 'All' && t.branch !== filterFacCampus) return false;
      if (filterStaffClassification !== 'All' && (t.classification || 'Teaching') !== filterStaffClassification) return false;
      if (filterFacSubject !== 'All' && (t.role || t.subject) !== filterFacSubject) return false;

      // Search match
      const query = searchFac.toLowerCase().trim();
      if (!query) return true;
      return (
        t.name.toLowerCase().includes(query) ||
        (t.role || t.subject || '').toLowerCase().includes(query) ||
        (t.id || t._id || '').toLowerCase().includes(query) ||
        (t.mobile || '').includes(query) ||
        (t.email || '').toLowerCase().includes(query)
      );
    });

    // Metrics calculations
    let thisMonthTotalPaid = 0;
    let overallTotalPaid = 0;

    filteredStaff.forEach(t => {
      const baseSal = Number(t.salary || 0);
      const mSal = t.monthlySalaries || {};
      
      // Current Month Paid
      const curRec = mSal[currentMonth] || { status: 'Unpaid', amountPaid: 0 };
      const curPaid = Number(curRec.amountPaid || (curRec.status === 'Paid' ? baseSal : 0));
      thisMonthTotalPaid += curPaid;

      // Overall Paid across 12 months
      monthsList.forEach(m => {
        const rec = mSal[m] || { status: 'Unpaid', amountPaid: 0 };
        const amt = Number(rec.amountPaid || (rec.status === 'Paid' ? baseSal : 0));
        overallTotalPaid += amt;
      });
    });

    const facultyPageSize = 20;
    const facultyTotalPages = Math.max(1, Math.ceil(filteredStaff.length / facultyPageSize));
    const facultyCurrentPage = Math.min(facultyPage, facultyTotalPages);
    const facultyPageItems = filteredStaff.slice((facultyCurrentPage - 1) * facultyPageSize, facultyCurrentPage * facultyPageSize);
    const canEditFaculty = true;

    const handleSaveStaffMonthPayment = async () => {
      if (!editTeacher || !selectedStaffMonthForEdit) return;
      setFacActionType('salary_payment');
      setFacOtpInput('');
      setIsFacOtpModalOpen(true);
    };

    const handleSaveNewStaffMember = async () => {
      if (!newFacName.trim() || !newFacSal.trim() || !newFacMobile.trim()) {
        triggerToast('Please complete Employee Name, Mobile, and Monthly Salary.');
        return;
      }

      const finalRole = newStaffRolePreset === 'Custom' ? (newStaffCustomRole.trim() || 'Custom Staff') : newStaffRolePreset;
      const salaryVal = parseFloat(newFacSal) || 35000;
      const empId = `STF${Math.floor(100000 + Math.random() * 900000)}`;

      const newStaffPayload = {
        id: empId,
        name: newFacName.trim(),
        role: finalRole,
        subject: finalRole,
        classification: newStaffClassification,
        salary: salaryVal,
        mobile: newFacMobile.trim(),
        email: newFacEmail.trim(),
        branch: role === 'admin2' ? loggedInCampus : newFacBranch,
        status: 'Active',
        joiningDate: new Date().toISOString().split('T')[0]
      };

      try {
        await admin1Service.createTeacher(newStaffPayload);
        triggerToast(`New staff member ${newFacName} registered under ${newStaffPayload.branch}.`);
        setIsAddTeacherModalOpen(false);
        setNewFacName('');
        setNewFacSal('');
        setNewFacMobile('');
        setNewFacEmail('');
        setNewStaffCustomRole('');
        fetchStaffSalaries();
      } catch (err: any) {
        triggerToast(err.message || 'Failed to register staff member.');
      }
    };

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('gold')}
        <header style={styles.header}>
          <button onClick={() => { setActivePage('menu'); setSelectedTeacher(null); setEditTeacher(null); }} style={styles.backArrowBtn} className="press-interactive">
            Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Staff & Faculty Registry</h1>
          <p style={styles.subtitle}>Register teaching & non-teaching staff, track custom roles, and manage 12-month salary ledgers</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
            
            {/* Top Level Employee Tabs */}
            <div style={{ display: 'flex', gap: '10px', backgroundColor: 'rgba(255,255,255,0.7)', padding: '6px', borderRadius: '12px', border: '1.5px solid var(--card-border)' }}>
              <button
                onClick={() => setEmployeeTab('employees')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '12px',
                  backgroundColor: employeeTab === 'employees' ? '#0F172A' : 'transparent',
                  color: employeeTab === 'employees' ? '#FFFFFF' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="press-interactive"
              >
                👥 Active Employees Roster & Management
              </button>
              <button
                onClick={() => { setEmployeeTab('history'); fetchWorkerPaymentsHistory(); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '12px',
                  backgroundColor: employeeTab === 'history' ? '#0F172A' : 'transparent',
                  color: employeeTab === 'history' ? '#FFFFFF' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="press-interactive"
              >
                📜 Disbursement Payment History Log ({role === 'admin2' ? loggedInCampus : 'All Campuses'})
              </button>
            </div>

            {employeeTab === 'history' ? (
              <GlassCard style={{ padding: '20px', borderRadius: '16px', border: '1.5px solid var(--card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--dark-charcoal)' }}>
                      Staff & Worker Payment History Log ({role === 'admin2' ? loggedInCampus : 'All Campuses'})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                      Read-only audit log of salary payments disbursed to employees
                    </div>
                  </div>
                  <button onClick={fetchWorkerPaymentsHistory} style={{ ...styles.actionItemBtn, padding: '6px 14px', fontSize: '11px', backgroundColor: '#0F172A', color: '#fff' }} className="press-interactive">
                    🔄 Refresh Log
                  </button>
                </div>

                {workerPaymentsHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted-gray)', fontSize: '13px', fontWeight: 700 }}>
                    No payment history records found for {role === 'admin2' ? loggedInCampus : 'selected campus'}.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                          <th style={{ padding: '10px', fontWeight: 900 }}>Disbursement Date</th>
                          <th style={{ padding: '10px', fontWeight: 900 }}>Employee Name</th>
                          <th style={{ padding: '10px', fontWeight: 900 }}>Role / Designation</th>
                          <th style={{ padding: '10px', fontWeight: 900 }}>Amount Disbursed</th>
                          <th style={{ padding: '10px', fontWeight: 900 }}>Period / Month</th>
                          <th style={{ padding: '10px', fontWeight: 900 }}>Campus Branch</th>
                          <th style={{ padding: '10px', fontWeight: 900 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workerPaymentsHistory.map((item: any, idx: number) => (
                          <tr key={item._id || item.id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '10px', fontWeight: 700 }}>{new Date(item.createdAt || Date.now()).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '10px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{item.workerName || item.name}</td>
                            <td style={{ padding: '10px' }}>{item.role}</td>
                            <td style={{ padding: '10px', fontWeight: 900, color: '#059669' }}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '10px' }}>{item.monthPeriod}</td>
                            <td style={{ padding: '10px' }}>{item.branch}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: '6px', fontWeight: 900, fontSize: '10px' }}>
                                DISBURSED
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            ) : (
              <>
            {/* Top Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <GlassCard style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid var(--card-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Filtered Staff Members</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--dark-charcoal)', marginTop: '4px' }}>{filteredStaff.length} Employees</div>
                <div style={{ fontSize: '10px', color: 'var(--royal-gold)', fontWeight: 700, marginTop: '2px' }}>Active Staff & Faculty Roster</div>
              </GlassCard>

              <GlassCard style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid #10B981', backgroundColor: 'rgba(236, 253, 245, 0.6)' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Salary Given This Month ({currentMonth})</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#065F46', marginTop: '4px' }}>₹{thisMonthTotalPaid.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '10px', color: '#047857', fontWeight: 700, marginTop: '2px' }}>Disbursed in Current Month</div>
              </GlassCard>

              <GlassCard style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid #D4AF37', backgroundColor: 'rgba(255, 253, 244, 0.7)' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#B88708', textTransform: 'uppercase' }}>Total Salary Given (All 12 Months)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#855E00', marginTop: '4px' }}>₹{overallTotalPaid.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '10px', color: '#B88708', fontWeight: 700, marginTop: '2px' }}>Cumulative Annual Disbursement</div>
              </GlassCard>
            </div>

            {/* Admin 1 Campus Selector Bar */}
            {role !== 'admin2' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', padding: '10px 14px', borderRadius: '16px', border: '1.5px solid var(--card-border)' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--dark-charcoal)', marginRight: '6px' }}>Campus:</span>
                {['All', 'Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].map(cName => (
                  <button
                    key={cName}
                    onClick={() => { setFilterFacCampus(cName); setFacultyPage(1); }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      border: filterFacCampus === cName ? '1.5px solid #0F172A' : '1px solid rgba(0,0,0,0.1)',
                      backgroundColor: filterFacCampus === cName ? '#0F172A' : '#fff',
                      color: filterFacCampus === cName ? '#FFFFFF' : 'var(--dark-charcoal)',
                      cursor: 'pointer'
                    }}
                    className="press-interactive"
                  >
                    {cName === 'All' ? 'All Campuses' : cName}
                  </button>
                ))}
              </div>
            )}

            {/* Search, Register & Filters Bar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search staff name, role (e.g. Electrician, Mechanic), mobile, ID..."
                value={searchFac}
                onChange={(e) => { setSearchFac(e.target.value); setFacultyPage(1); }}
                style={{ ...styles.textInputBox, flex: 2, minWidth: '220px' }}
              />

              <div style={{ flex: 1, minWidth: '150px' }}>
                <select
                  value={filterStaffClassification}
                  onChange={(e) => { setFilterStaffClassification(e.target.value); setFacultyPage(1); }}
                  style={styles.selectInput}
                >
                  <option value="All">All Classifications</option>
                  <option value="Teaching">Teaching Staff</option>
                  <option value="Non-Teaching">Non-Teaching Staff</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <select
                  value={filterFacSubject}
                  onChange={(e) => { setFilterFacSubject(e.target.value); setFacultyPage(1); }}
                  style={styles.selectInput}
                >
                  <option value="All">All Staff Roles</option>
                  <option value="Teacher">Teacher / Lecturer</option>
                  <option value="Professor">Professor</option>
                  <option value="Senior Electrician">Electrician</option>
                  <option value="Plumbing Specialist">Plumber</option>
                  <option value="Vehicle & Bus Mechanic">Mechanic</option>
                  <option value="Software Repair Specialist">Software Repair</option>
                  <option value="Lab Assistant">Lab Assistant</option>
                  <option value="Chief Security Guard">Security Staff</option>
                </select>
              </div>

              {canEditFaculty && (
                <button
                  onClick={() => setIsAddTeacherModalOpen(true)}
                  style={{ ...styles.saveSubmitBtn, marginTop: 0, padding: '10px 18px', whiteSpace: 'nowrap' }}
                  className="press-interactive"
                >
                  + Add New Staff Member
                </button>
              )}
            </div>

            {/* Staff Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '4px' }}>
              {facultyPageItems.map(t => {
                const baseSal = Number(t.salary || 0);
                const curMonthRec = (t.monthlySalaries as any)?.[currentMonth] || { status: 'Unpaid' };
                const isCurPaid = curMonthRec.status === 'Paid';

                return (
                  <div
                    key={t.id || t._id}
                    onClick={() => {
                      setSelectedTeacher(t);
                      setEditTeacher({ ...t });
                      setSelectedStaffMonthForEdit(null);
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1.5px solid var(--card-border)',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
                      transition: 'all 0.2s ease'
                    }}
                    className="press-interactive hover-glow-gold"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--dark-charcoal)' }}>{t.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                          {t.role || t.subject || 'Staff Member'}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        backgroundColor: (t.classification || 'Teaching') === 'Teaching' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                        color: (t.classification || 'Teaching') === 'Teaching' ? '#2563EB' : '#7C3AED',
                        border: '1px solid rgba(0,0,0,0.05)'
                      }}>
                        {t.classification || 'Teaching'}
                      </span>
                    </div>

                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Emp ID:</span>
                        <span style={{ fontWeight: 800, color: 'var(--dark-charcoal)' }}>{t.id || t._id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Campus:</span>
                        <span style={{ fontWeight: 800, color: 'var(--dark-charcoal)' }}>{t.branch || 'Erragattugutta C1'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Monthly Salary:</span>
                        <span style={{ fontWeight: 900, color: '#059669' }}>₹{baseSal.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Mobile:</span>
                        <span style={{ fontWeight: 800 }}>{t.mobile || '—'}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted-gray)' }}>{currentMonth}:</span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isCurPaid ? '#ECFDF5' : '#FEF2F2',
                          color: isCurPaid ? '#059669' : '#DC2626'
                        }}>
                          {isCurPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeacher(t);
                          setEditTeacher({ ...t });
                          setSelectedStaffMonthForEdit(null);
                        }}
                        style={{ ...styles.actionItemBtn, padding: '5px 12px', fontSize: '10px', backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 900 }}
                        className="press-interactive"
                      >
                        Open 12-Month Ledger
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredStaff.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: 'var(--muted-gray)', fontSize: '13px' }}>
                  No staff or faculty records match your criteria.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <button
                onClick={() => setFacultyPage(prev => Math.max(1, prev - 1))}
                disabled={facultyCurrentPage <= 1}
                style={{ ...styles.actionItemBtn, opacity: facultyCurrentPage <= 1 ? 0.45 : 1 }}
                className="press-interactive"
              >
                Previous Page
              </button>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted-gray)' }}>
                Page <strong>{facultyCurrentPage}</strong> of <strong>{facultyTotalPages}</strong>
              </div>
              <button
                onClick={() => setFacultyPage(prev => Math.min(facultyTotalPages, prev + 1))}
                disabled={facultyCurrentPage >= facultyTotalPages}
                style={{ ...styles.actionItemBtn, opacity: facultyCurrentPage >= facultyTotalPages ? 0.45 : 1 }}
                className="press-interactive"
              >
                Next Page
              </button>
            </div>
          </>
          )}
        </div>

          {/* 12-MONTH STAFF LEDGER & DETAILS MODAL */}
          {selectedTeacher && editTeacher && (
            <div style={styles.overlayOverlay}>
              <div style={{ ...styles.overlaySheet, maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1.5px solid var(--card-border)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ ...styles.modalTitle, margin: 0 }}>Staff Profile & 12-Month Salary Ledger</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--muted-gray)' }}>{editTeacher.name} ({editTeacher.id || editTeacher._id}) &middot; {editTeacher.branch || loggedInCampus}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedTeacher(null); setEditTeacher(null); setSelectedStaffMonthForEdit(null); }}
                    style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}
                  >
                    ×
                  </button>
                </div>

                {/* Top Details Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1.5px solid #E2E8F0', marginBottom: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>Employee Profile & Salary Info</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={styles.formLabel}>Employee Name</label>
                      <input
                        type="text"
                        value={editTeacher.name || ''}
                        readOnly={!canEditFaculty}
                        onChange={(e) => canEditFaculty && setEditTeacher({ ...editTeacher, name: e.target.value })}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div>
                      <label style={styles.formLabel}>Role / Designation</label>
                      <input
                        type="text"
                        value={editTeacher.role || editTeacher.subject || ''}
                        readOnly={!canEditFaculty}
                        onChange={(e) => canEditFaculty && setEditTeacher({ ...editTeacher, role: e.target.value, subject: e.target.value })}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div>
                      <label style={styles.formLabel}>Classification</label>
                      <select
                        value={editTeacher.classification || 'Teaching'}
                        disabled={!canEditFaculty}
                        onChange={(e) => canEditFaculty && setEditTeacher({ ...editTeacher, classification: e.target.value as any })}
                        style={styles.selectInput}
                      >
                        <option value="Teaching">Teaching Staff</option>
                        <option value="Non-Teaching">Non-Teaching Staff</option>
                      </select>
                    </div>

                    <div>
                      <label style={styles.formLabel}>Campus Branch</label>
                      <select
                        value={editTeacher.branch || 'Erragattugutta C1'}
                        disabled={!canEditFaculty}
                        onChange={(e) => canEditFaculty && setEditTeacher({ ...editTeacher, branch: e.target.value })}
                        style={styles.selectInput}
                      >
                        <option value="Erragattugutta C1">Erragattugutta Campus C1</option>
                        <option value="Erragattugutta C2">Erragattugutta Campus C2</option>
                        <option value="Beemaram C1">Beemaram Campus C1</option>
                        <option value="Beemaram C2">Beemaram Campus C2</option>
                      </select>
                    </div>

                    <div>
                      <label style={styles.formLabel}>Base Monthly Salary (Rs.)</label>
                      <input
                        type="number"
                        value={editTeacher.salary || 0}
                        readOnly={!canEditFaculty}
                        onChange={(e) => canEditFaculty && setEditTeacher({ ...editTeacher, salary: parseFloat(e.target.value) || 0 })}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div>
                      <label style={styles.formLabel}>Mobile Number</label>
                      <input
                        type="text"
                        value={editTeacher.mobile || ''}
                        readOnly={!canEditFaculty}
                        onChange={(e) => canEditFaculty && setEditTeacher({ ...editTeacher, mobile: e.target.value })}
                        style={styles.textInputBox}
                      />
                    </div>
                  </div>

                  {canEditFaculty && (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        onClick={() => handleTeacherSave(editTeacher)}
                        style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '8px 18px', fontSize: '11px' }}
                        className="press-interactive"
                      >
                        Save Profile Changes
                      </button>
                    </div>
                  )}
                </div>

                {/* 12-MONTH SALARY GRID */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>
                      12-Month Academic Year Salary Disbursement Ledger
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Academic Year:</span>
                      <select
                        value={selectedAcademicYear}
                        onChange={(e) => setSelectedAcademicYear(e.target.value)}
                        style={{ ...styles.selectInput, width: 'auto', padding: '4px 10px', fontSize: '11px', fontWeight: 800 }}
                      >
                        <option value="2026-2027">2026-2027 (June to May)</option>
                        <option value="2027-2028">2027-2028 (Year Lock Enforced)</option>
                        <option value="2028-2029">2028-2029 (Year Lock Enforced)</option>
                      </select>
                    </div>

                    <div style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 700 }}>Click any month to view/update payment details</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                    {monthsList.map(mName => {
                      const ledgerObj = (editTeacher.salaryLedger as any)?.[selectedAcademicYear] || {};
                      const mRec = ledgerObj[mName] || (editTeacher.monthlySalaries as any)?.[mName] || { status: 'Unpaid', amountPaid: 0, paymentDate: '—', paymentMode: '—' };
                      const isPaid = mRec.status === 'Paid' || mRec.paid === true;
                      const amtPaid = Number(mRec.amountPaid || (isPaid ? editTeacher.salary || 0 : 0));
                      const isSelectedForEdit = selectedStaffMonthForEdit === mName;

                      return (
                        <div
                          key={mName}
                          onClick={() => {
                            if (!canEditFaculty) return;
                            setSelectedStaffMonthForEdit(mName);
                            setStaffMonthStatus(mRec.status || 'Paid');
                            setStaffMonthAmount(String(amtPaid || editTeacher.salary || 0));
                            setStaffMonthDate(mRec.paymentDate || new Date().toISOString().split('T')[0]);
                            setStaffMonthMode(mRec.paymentMode || 'Bank Transfer');
                            setStaffMonthNote(mRec.note || '');
                          }}
                          style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: isSelectedForEdit ? '2px solid var(--royal-gold)' : '1.5px solid #E2E8F0',
                            backgroundColor: isSelectedForEdit ? '#FFFDF4' : isPaid ? '#F0FDF4' : '#FEF2F2',
                            cursor: canEditFaculty ? 'pointer' : 'default',
                            transition: 'all 0.15s ease'
                          }}
                          className="press-interactive"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>{mName}</span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 900,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isPaid ? '#10B981' : '#EF4444',
                              color: '#fff'
                            }}>
                              {isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                          </div>

                          <div style={{ fontSize: '14px', fontWeight: 900, color: isPaid ? '#059669' : '#DC2626', marginTop: '6px' }}>
                            ₹{amtPaid.toLocaleString('en-IN')}
                          </div>

                          <div style={{ fontSize: '9px', color: 'var(--muted-gray)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>Date: {mRec.paymentDate || '—'}</span>
                            <span>Mode: {mRec.paymentMode || '—'}</span>
                          </div>

                          {canEditFaculty && (
                            <div style={{ marginTop: '8px', fontSize: '9.5px', color: 'var(--royal-gold)', fontWeight: 800, textAlign: 'right' }}>
                              {isSelectedForEdit ? '▼ Active Editor' : 'Click to Edit ›'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* MONTH PAYMENT EDITOR (Appears when a month is clicked) */}
                {selectedStaffMonthForEdit && canEditFaculty && (
                  <div style={{ backgroundColor: '#FFFDF4', border: '2px solid var(--royal-gold)', borderRadius: '14px', padding: '16px', marginBottom: '18px' }} className="anim-slide-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#855E00' }}>
                        Edit Salary Disbursement for {selectedStaffMonthForEdit} 2026
                      </div>
                      <button onClick={() => setSelectedStaffMonthForEdit(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', fontWeight: 900 }}>×</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={styles.formLabel}>Disbursement Status</label>
                        <select
                          value={staffMonthStatus}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setStaffMonthStatus(val);
                            if (val === 'Paid' && (!staffMonthAmount || parseFloat(staffMonthAmount) === 0)) {
                              setStaffMonthAmount(String(editTeacher.salary || 0));
                            }
                          }}
                          style={styles.selectInput}
                        >
                          <option value="Paid">PAID</option>
                          <option value="Unpaid">UNPAID / PENDING</option>
                        </select>
                      </div>

                      <div>
                        <label style={styles.formLabel}>Amount Disbursed (Rs.)</label>
                        <input
                          type="number"
                          value={staffMonthAmount}
                          onChange={(e) => setStaffMonthAmount(e.target.value)}
                          style={styles.textInputBox}
                          placeholder={String(editTeacher.salary || 0)}
                        />
                      </div>

                      <div>
                        <label style={styles.formLabel}>Payment Date</label>
                        <input
                          type="date"
                          value={staffMonthDate}
                          onChange={(e) => setStaffMonthDate(e.target.value)}
                          style={styles.textInputBox}
                        />
                      </div>

                      <div>
                        <label style={styles.formLabel}>Payment Mode</label>
                        <select
                          value={staffMonthMode}
                          onChange={(e) => setStaffMonthMode(e.target.value)}
                          style={styles.selectInput}
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash Handover</option>
                          <option value="UPI">UPI / Digital</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <label style={styles.formLabel}>Payment Remarks / Notes</label>
                      <input
                        type="text"
                        value={staffMonthNote}
                        onChange={(e) => setStaffMonthNote(e.target.value)}
                        placeholder="e.g. Monthly salary credited via bank account"
                        style={styles.textInputBox}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setSelectedStaffMonthForEdit(null)} style={{ ...styles.modalCancelBtn, width: 'auto', padding: '8px 16px' }} className="press-interactive">Cancel</button>
                      <button onClick={handleSaveStaffMonthPayment} style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '8px 22px' }} className="press-interactive">
                        Save Month Payment
                      </button>
                    </div>
                  </div>
                )}

                {/* BOTTOM BILL GENERATOR & ACTIONS */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #E2E8F0', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleDownloadStaffPayslip(editTeacher, currentMonth)}
                      style={{ ...styles.actionItemBtn, padding: '10px 16px', fontSize: '11px', fontWeight: 900, backgroundColor: '#0F172A', color: '#fff' }}
                      className="press-interactive"
                    >
                      Download Payslip ({currentMonth})
                    </button>

                    <button
                      onClick={() => handleDownloadStaffAnnualStatement(editTeacher)}
                      style={{ ...styles.actionItemBtn, padding: '10px 16px', fontSize: '11px', fontWeight: 900, backgroundColor: 'var(--royal-gold)', color: '#000' }}
                      className="press-interactive"
                    >
                      Download 12-Month Annual Statement
                    </button>
                  </div>

                  {(role === 'admin1' || role === 'admin2') && (
                    <button
                      onClick={() => {
                        setFacActionType('delete' as any);
                        setPendingDeleteTeacherId(editTeacher._id || editTeacher.id || null);
                        setFacOtpInput('');
                        setIsFacOtpModalOpen(true);
                      }}
                      style={{ ...styles.actionItemBtn, padding: '10px 16px', fontSize: '11px', fontWeight: 900, backgroundColor: '#DC2626', color: '#fff' }}
                      className="press-interactive"
                    >
                      Delete Staff Record
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* REGISTER NEW STAFF MEMBER MODAL */}
          {isAddTeacherModalOpen && (
            <div style={styles.overlayOverlay}>
              <div style={{ ...styles.overlaySheet, maxWidth: '580px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={styles.modalTitle}>Register New Staff Member</h3>
                  <button
                    onClick={() => setIsAddTeacherModalOpen(false)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Campus & Classification */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Campus Branch</label>
                      <select
                        value={newFacBranch}
                        disabled={(role as string) === 'admin2'}
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
                      <label style={styles.formLabel}>Staff Classification</label>
                      <select
                        value={newStaffClassification}
                        onChange={(e) => setNewStaffClassification(e.target.value as any)}
                        style={styles.selectInput}
                      >
                        <option value="Teaching">Teaching Staff</option>
                        <option value="Non-Teaching">Non-Teaching Staff</option>
                      </select>
                    </div>
                  </div>

                  {/* Role Selection & Custom Role */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Role Designation</label>
                      <select
                        value={newStaffRolePreset}
                        onChange={(e) => setNewStaffRolePreset(e.target.value)}
                        style={styles.selectInput}
                      >
                        <option value="Teacher">Teacher</option>
                        <option value="Lecturer">Lecturer</option>
                        <option value="Professor">Professor</option>
                        <option value="Senior Electrician">Electrician</option>
                        <option value="Plumbing Specialist">Plumber</option>
                        <option value="Vehicle & Bus Mechanic">Mechanic</option>
                        <option value="Software Repair Specialist">Software Repair</option>
                        <option value="Lab Assistant">Lab Assistant</option>
                        <option value="Chief Security Guard">Security Guard</option>
                        <option value="Housekeeping / Cleaner">Cleaner / Worker</option>
                        <option value="Custom">Custom / Other Role...</option>
                      </select>
                    </div>

                    {newStaffRolePreset === 'Custom' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Enter Custom Role Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Carpenter / IT Specialist"
                          value={newStaffCustomRole}
                          onChange={(e) => setNewStaffCustomRole(e.target.value)}
                          style={styles.textInputBox}
                        />
                      </div>
                    )}
                  </div>

                  {/* Name & Mobile */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Full Employee Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Mr. K. Sammaiah"
                        value={newFacName}
                        onChange={(e) => setNewFacName(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Contact Mobile</label>
                      <input
                        type="text"
                        placeholder="e.g. 9848011223"
                        value={newFacMobile}
                        onChange={(e) => setNewFacMobile(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>
                  </div>

                  {/* Salary & Email */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Base Monthly Salary (Rs.)</label>
                      <input
                        type="number"
                        placeholder="e.g. 45000"
                        value={newFacSal}
                        onChange={(e) => setNewFacSal(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Email (Optional)</label>
                      <input
                        type="email"
                        placeholder="staff@inspire.edu"
                        value={newFacEmail}
                        onChange={(e) => setNewFacEmail(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveNewStaffMember}
                    style={{ ...styles.saveSubmitBtn, marginTop: '8px' }}
                    className="press-interactive"
                  >
                    Submit & Register Staff Member
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FACULTY/STAFF OTP VERIFICATION OVERLAY */}
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
                    placeholder="Enter Security OTP (784920)"
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

  //  SUBPAGE 3: PUBLISHING CENTER
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
                  border: pubCat === cat ? '1.5px solid #0F172A' : '1.5px solid var(--card-border)',
                  backgroundColor: pubCat === cat ? '#0F172A' : 'rgba(255,255,255,0.6)',
                  color: pubCat === cat ? '#FFFFFF' : 'var(--dark-charcoal)',
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

  //  SUBPAGE 4: TIMETABLES & CALENDAR
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
                 Uploading and parsing timetable on backend...
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

  //  SUBPAGE 5: CLASS SCHEDULING
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

  //  SUBPAGE 6: EXAMINATION DESK
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
                 Uploading and parsing results on backend...
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
                  <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>{e.class}  {e.date}  {e.status}</div>
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

  //  SUBPAGE 7: ACADEMIC FEES
  if (activePage === 'academic_fees') {
    if (role !== 'admin1' && role !== 'admin2') { setActivePage('menu'); return null; }

    const locked = feeRates.isLocked && !isEditingFees;
    const feeBarItems = [
      {
        key: 'tuition',
        label: 'Academic Tuition Fee',
        icon: '',
        value: feeRates.tuition,
        setter: (v: number) => {
          setFeeRates(prev => ({ ...prev, tuition: v }));
          setEditTuitionRate(String(v));
        }
      },
      {
        key: 'hostel',
        label: 'Hostel / Residential Fee',
        icon: '',
        value: feeRates.hostel,
        setter: (v: number) => {
          setFeeRates(prev => ({ ...prev, hostel: v }));
          setEditHostelRate(String(v));
        }
      },
      {
        key: 'misc',
        label: 'Miscellaneous / Lab Fee',
        icon: '',
        value: feeRates.misc,
        setter: (v: number) => {
          setFeeRates(prev => ({ ...prev, misc: v }));
          setEditMiscRate(String(v));
        }
      },
    ];
    const grandTotal = feeBarItems.reduce((s, f) => s + (Number(f.value) || 0), 0);

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
                    onClick={() => { setSelectedFeeBranch(b as any); setIsEditingFees(false); fetchFeeSettings(b, true); }}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '10px',
                      border: isActive ? '2px solid #0F172A' : '1px solid var(--card-border)',
                      background: isActive ? '#0F172A' : 'rgba(255,255,255,0.6)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '10px',
                      color: isActive ? '#FFFFFF' : 'var(--dark-charcoal)'
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
                {locked ? 'Locked  Rates Finalized' : 'Edit Mode Active'}
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
                      <span style={{ position: 'absolute', left: '10px', fontSize: '13px', fontWeight: 900, color: locked ? 'var(--muted-gray)' : 'var(--royal-gold)' }}>Rs.</span>
                      <input
                        type="number"
                        min="0"
                        disabled={locked}
                        value={fee.value === undefined || isNaN(fee.value) ? '' : fee.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          fee.setter(val === '' ? '' as any : parseFloat(val));
                        }}
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
              <strong style={{ fontSize: '20px', fontWeight: 900, color: 'var(--royal-gold)' }}>Rs.{grandTotal.toLocaleString('en-IN')}</strong>
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
                    <strong>Tip:</strong> Copy Fee Structure OTP from Authenticator Portal.
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
                    <strong>Note:</strong> Saving will update fee rates for non-customized student profiles in this campus.
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

  // SUBPAGE: ADMISSION ENQUIRIES DESK
  if (activePage === 'enquiries') {
    const filteredEnquiries = enquiriesList.filter(e => {
      const matchSearch = !searchEnquiry || 
        (e.studentName || '').toLowerCase().includes(searchEnquiry.toLowerCase()) ||
        (e.mobile || '').includes(searchEnquiry) ||
        (e.referenceCode || '').toLowerCase().includes(searchEnquiry.toLowerCase()) ||
        (e.parentName || '').toLowerCase().includes(searchEnquiry.toLowerCase());
      
      const matchCampus = filterEnquiryCampus === 'All' ||
        (e.preferredCampus || '').toLowerCase().includes(filterEnquiryCampus.toLowerCase());

      const matchStatus = filterEnquiryStatus === 'All' || e.status === filterEnquiryStatus;

      return matchSearch && matchCampus && matchStatus;
    });

    const handleUpdateStatus = async (id: string, newStatus: string) => {
      try {
        await admin1Service.updateEnquiryStatus(id, newStatus);
        triggerToast(`Enquiry ${id} status updated to ${newStatus}`);
        fetchEnquiries();
      } catch (err: any) {
        triggerToast(err.message || 'Failed to update enquiry status');
      }
    };

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('indigo')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Admission Enquiries Desk</h1>
          <p style={styles.subtitle}>Real-time prospective student enquiries submitted via portfolio admission form across all 4 campuses.</p>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', zIndex: 1 }}>
            <input
              type="text"
              placeholder="Search student, parent, mobile, ref code..."
              value={searchEnquiry}
              onChange={(e) => setSearchEnquiry(e.target.value)}
              style={{ ...styles.textInputBox, flex: 2, minWidth: '220px' }}
            />

            <select
              value={filterEnquiryCampus}
              onChange={(e) => setFilterEnquiryCampus(e.target.value)}
              style={{ ...styles.selectInput, flex: 1, minWidth: '160px' }}
            >
              <option value="All">All Campuses</option>
              <option value="Erragattugutta Campus 1">Erragattugutta Campus 1</option>
              <option value="Erragattugutta Campus 2">Erragattugutta Campus 2</option>
              <option value="Bheemaram Campus 1">Bheemaram Campus 1</option>
              <option value="Bheemaram Campus 2">Bheemaram Campus 2</option>
            </select>

            <select
              value={filterEnquiryStatus}
              onChange={(e) => setFilterEnquiryStatus(e.target.value)}
              style={{ ...styles.selectInput, flex: 1, minWidth: '140px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Contacted">Contacted</option>
              <option value="Enrolled">Enrolled</option>
              <option value="Closed">Closed</option>
            </select>

            <button
              onClick={fetchEnquiries}
              style={{ ...styles.actionItemBtn, padding: '10px 18px', backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 900 }}
              className="press-interactive"
            >
              Refresh Enquiries
            </button>
          </div>

          {/* Enquiries Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', zIndex: 1 }}>
            {filteredEnquiries.map(enq => {
              const statusColorMap: Record<string, { bg: string; text: string; border: string }> = {
                Pending: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
                New: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
                Contacted: { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6' },
                Enrolled: { bg: '#ECFDF5', text: '#065F46', border: '#10B981' },
                Closed: { bg: '#F1F5F9', text: '#475569', border: '#94A3B8' },
                Archived: { bg: '#F1F5F9', text: '#475569', border: '#94A3B8' }
              };
              const badgeStyle = statusColorMap[enq.status] || statusColorMap.Pending;

              return (
                <div
                  key={enq._id || enq.id || enq.referenceCode}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255,255,255,0.82)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid var(--card-border)',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                  className="anim-slide-up"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--royal-gold)', letterSpacing: '0.05em' }}>
                        REF: {enq.referenceCode}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--dark-charcoal)', margin: '2px 0 0' }}>
                        {enq.studentName}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--muted-gray)', fontWeight: 700 }}>
                        Parent: {enq.parentName || 'N/A'}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      backgroundColor: badgeStyle.bg,
                      color: badgeStyle.text,
                      border: `1px solid ${badgeStyle.border}`
                    }}>
                      {enq.status}
                    </span>
                  </div>

                  <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Preferred Campus:</span>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>{enq.preferredCampus}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Stream Choice:</span>
                      <span style={{ fontWeight: 800, color: '#2563EB' }}>{enq.stream}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Current Grade:</span>
                      <span style={{ fontWeight: 800 }}>{enq.currentGrade}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Mobile Number:</span>
                      <a href={`tel:${enq.mobile}`} style={{ fontWeight: 900, color: '#059669', textDecoration: 'none' }}>{enq.mobile}</a>
                    </div>
                    {enq.email && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Email Address:</span>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{enq.email}</span>
                      </div>
                    )}
                  </div>

                  {enq.notes && (
                    <div style={{ fontSize: '11px', color: '#334155', fontStyle: 'italic', backgroundColor: '#FFFDF4', padding: '8px 10px', borderRadius: '8px', border: '1px solid #FEF08A' }}>
                      "{enq.notes}"
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '9.5px', color: 'var(--muted-gray)', fontWeight: 700 }}>
                      Received: {new Date(enq.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted-gray)' }}>Status:</span>
                      <select
                        value={enq.status}
                        onChange={(e) => handleUpdateStatus(enq._id || enq.id || enq.referenceCode, e.target.value)}
                        style={{ ...styles.selectInput, padding: '3px 8px', fontSize: '10px', width: 'auto' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Enrolled">Enrolled</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredEnquiries.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--muted-gray)', fontSize: '13px' }}>
                No admission enquiries found matching your criteria.
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  //  Reports Compiler removed per admin directive

  //  SUBPAGE 9: ATTENDANCE DASHBOARD & MARKING CONSOLE
  if (activePage === 'attendance') {
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



  //  SUBPAGE 12: STUDENT FEE EDITOR (Admin 2)
  if (activePage === 'fee_editor') {
    const filteredFeeStudents = students.filter((student) => matchesStudentQuery(student, feeEditSearch));
    const feeEditorPageSize = 20;
    const feeEditorTotalPages = Math.max(1, Math.ceil(filteredFeeStudents.length / feeEditorPageSize));
    const feeEditorCurrentPage = Math.min(feeEditorPage, feeEditorTotalPages);
    const feeEditorPageStudents = filteredFeeStudents.slice((feeEditorCurrentPage - 1) * feeEditorPageSize, feeEditorCurrentPage * feeEditorPageSize);

    const openFeeStudent = async (student: Student) => {
      try {
        setSelectedFeeStudent(student);
        setFeeBreakdownData(null);
        setEditSlotWaivers({});
        const targetBranch = student.branch || (role === 'admin1' ? selectedFeeBranch : loggedInCampus);
        const studentKey = student._id || student.studentId || student.admissionNumber;
        const breakdown = await admin2Service.getFeeBreakdown(studentKey, targetBranch);
        setFeeBreakdownData(breakdown);
        setEditTuitionWaiver(String(breakdown.tuitionWaiver || 0));
        setEditHostelWaiver(String(breakdown.hostelWaiver || 0));
        setEditMiscWaiver(String(breakdown.miscWaiver || 0));
        triggerToast(`Loaded fee record for ${student.name}`);
      } catch (err: any) {
        triggerToast(err.message || 'Failed to load fee breakdown.');
      }
    };

    const handleFeeSearch = async () => {
      if (!feeEditSearch.trim()) {
        triggerToast('Please type a student name or admission number.');
        return;
      }
      const match = filteredFeeStudents[0];
      if (match) {
        await openFeeStudent(match);
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
        const targetBranch = selectedFeeStudent.branch || (role === 'admin1' ? selectedFeeBranch : loggedInCampus);
        const studentKey = selectedFeeStudent._id || selectedFeeStudent.studentId || selectedFeeStudent.admissionNumber;

        const activeSlots = getAdminActiveFeeSlots(selectedFeeStudent, feeBreakdownData);
        let updatedCustomSlots: any[] = [];

        if (selectedFeeStudent.customFeeSlots && Array.isArray(selectedFeeStudent.customFeeSlots) && selectedFeeStudent.customFeeSlots.length > 0) {
          updatedCustomSlots = selectedFeeStudent.customFeeSlots.map((slot: any) => {
            const slotKey = slot.id || slot.name;
            const waiver = Number(editSlotWaivers[slotKey]) || 0;
            const newAmt = Math.max(0, Number(slot.amount) - waiver);
            return { ...slot, amount: newAmt };
          });
        } else {
          updatedCustomSlots = activeSlots.map((slot: any) => {
            const slotKey = slot.id || slot.name;
            const waiver = Number(editSlotWaivers[slotKey]) || 0;
            const newAmt = Math.max(0, Number(slot.amount) - waiver);
            return { id: slot.id, name: slot.name, amount: newAmt };
          });
        }

        const totalWaivers = Object.values(editSlotWaivers).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);

        const res = await admin2Service.applyFeeOverride(studentKey, {
          tuitionWaiver: Number(editTuitionWaiver) || 0,
          hostelWaiver: Number(editHostelWaiver) || 0,
          transportWaiver: 0,
          miscWaiver: Number(editMiscWaiver) || 0,
          customFeeSlots: updatedCustomSlots,
          totalWaiver: totalWaivers
        } as any, targetBranch);

        if (res.status === 'success') {
          const breakdown = await admin2Service.getFeeBreakdown(studentKey, targetBranch);
          setFeeBreakdownData(breakdown);
          const updatedStu = { ...selectedFeeStudent, customFeeSlots: updatedCustomSlots };
          setSelectedFeeStudent(updatedStu as any);
          setStudents(prev => prev.map(s => (s._id === selectedFeeStudent._id || s.admissionNumber === selectedFeeStudent.admissionNumber) ? { ...s, customFeeSlots: updatedCustomSlots } : s));

          triggerToast(`Fee overrides & slot amounts updated for ${selectedFeeStudent.name}.`);
          setIsFeeOtpOpen(false);
          setFeeOtpInput('');
          setEditSlotWaivers({});
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
              <input type="text" placeholder="Search student by Name or Admission Number..." value={feeEditSearch} onChange={(e) => { setFeeEditSearch(e.target.value); setFeeEditorPage(1); }} style={{ ...styles.textInputBox, flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && handleFeeSearch()} />
              <button onClick={handleFeeSearch} style={{ ...styles.saveSubmitBtn, marginTop: 0, padding: '12px 24px' }} className="press-interactive">Load</button>
            </div>
          </GlassCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1, marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Student Grid</h4>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted-gray)' }}>
                Showing <strong>{feeEditorPageStudents.length}</strong> of <strong>{filteredFeeStudents.length}</strong>
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px'
            }}>
              {feeEditorPageStudents.map((student) => (
                <GlassCard
                  key={student._id || student.admissionNumber || student.studentId}
                  hoverable={true}
                  onClick={() => void openFeeStudent(student)}
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255,255,255,0.75)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(212,175,55,0.14)',
                        color: '#8A6500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {(student.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '14px', color: 'var(--dark-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.name}
                        </strong>
                        <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                          Adm: {student.admissionNumber}  |  Roll: {student.rollNumber || 'N/A'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                          {student.branch} ({student.course})
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: Number(student.remainingBalance || 0) > 0 ? '#EF4444' : '#10B981', whiteSpace: 'nowrap' }}>
                      {Number(student.remainingBalance || 0) > 0 ? `Due: Rs.${Number(student.remainingBalance || 0).toLocaleString('en-IN')}` : 'Settled'}
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openFeeStudent(student);
                      }}
                      style={{
                        padding: '8px 12px',
                        border: '1.5px solid var(--royal-gold)',
                        color: '#8A6500',
                        backgroundColor: '#FFFDF5',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      className="press-interactive"
                    >
                      Open Fee Breakdown
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={() => setFeeEditorPage(prev => Math.max(1, prev - 1))}
                disabled={feeEditorCurrentPage <= 1}
                style={{
                  ...styles.actionItemBtn,
                  border: '1.5px solid var(--card-border)',
                  opacity: feeEditorCurrentPage <= 1 ? 0.45 : 1
                }}
                className="press-interactive"
              >
                Previous Page
              </button>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted-gray)' }}>
                Page <strong>{feeEditorCurrentPage}</strong> of <strong>{feeEditorTotalPages}</strong>
              </div>
              <button
                onClick={() => setFeeEditorPage(prev => Math.min(feeEditorTotalPages, prev + 1))}
                disabled={feeEditorCurrentPage >= feeEditorTotalPages}
                style={{
                  ...styles.actionItemBtn,
                  border: '1.5px solid var(--card-border)',
                  opacity: feeEditorCurrentPage >= feeEditorTotalPages ? 0.45 : 1
                }}
                className="press-interactive"
              >
                Next Page
              </button>
            </div>
          </div>

          {selectedFeeStudent && (
            <div style={styles.overlayOverlay} className="anim-fade-in">
              <div style={{ ...styles.overlaySheet, maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <button
                  onClick={() => { setSelectedFeeStudent(null); setFeeBreakdownData(null); setFeeOtpInput(''); setIsFeeOtpOpen(false); }}
                  style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}
                >
                  ×
                </button>

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

                {feeBreakdownData ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Bill Format Statement Card */}
                    <div style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '16px',
                      padding: '18px',
                      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1.5px solid #E2E8F0',
                        paddingBottom: '10px'
                      }}>
                        <div>
                          <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            INSPIRE JUNIOR COLLEGE
                          </span>
                          <h4 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>
                            Fee Structure & Bill Format
                          </h4>
                        </div>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '20px',
                          backgroundColor: (feeBreakdownData.remainingBalance || 0) > 0 ? '#FEF2F2' : '#ECFDF5',
                          color: (feeBreakdownData.remainingBalance || 0) > 0 ? '#DC2626' : '#059669',
                          border: (feeBreakdownData.remainingBalance || 0) > 0 ? '1px solid #FCA5A5' : '1px solid #A7F3D0'
                        }}>
                          {(feeBreakdownData.remainingBalance || 0) > 0 ? 'BALANCE DUE' : 'FULLY SETTLED'}
                        </span>
                      </div>

                      {/* Left: Description, Right: Amount Slots */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', borderBottom: '1px solid #F1F5F9', paddingBottom: '4px' }}>
                          <span>Fee Section Description</span>
                          <span>Amount (Rs)</span>
                        </div>

                        {getAdminActiveFeeSlots(selectedFeeStudent, feeBreakdownData).map((slot: any) => {
                          const slotKey = slot.id || slot.name;
                          const waiverAmt = Number(editSlotWaivers[slotKey]) || 0;
                          const netSlotAmt = Math.max(0, slot.amount - waiverAmt);
                          return (
                            <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', padding: '4px 0', borderBottom: '1px dashed #F1F5F9' }}>
                              <span style={{ color: '#334155', fontWeight: 600 }}>
                                {slot.name}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <strong style={{ color: '#0F172A', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                  Rs.{netSlotAmt.toLocaleString('en-IN')}
                                </strong>
                                {waiverAmt > 0 && (
                                  <span style={{ fontSize: '9.5px', color: '#059669', fontWeight: 700 }}>
                                    (Waiver: -Rs.{waiverAmt.toLocaleString('en-IN')})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Horizontal Dashed Separator */}
                      <div style={{ borderTop: '1.5px dashed #CBD5E1', margin: '4px 0' }} />

                      {/* Breakdown Calculations */}
                      {(() => {
                        const totalWaiversLocal = Object.values(editSlotWaivers).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
                        const existingWaiver = Number(feeBreakdownData.individualOverrideDeduction || 0);
                        const totalDeduction = totalWaiversLocal > 0 ? totalWaiversLocal : existingWaiver;
                        const baseFee = Number(feeBreakdownData.baseFee || 0);
                        const paid = Number(feeBreakdownData.totalPaid || 0);
                        const netRemaining = Math.max(0, baseFee - totalDeduction - paid);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: '#475569', fontWeight: 700 }}>Total Base Fee</span>
                              <strong style={{ color: '#0F172A', fontWeight: 800 }}>
                                Rs.{baseFee.toLocaleString('en-IN')}
                              </strong>
                            </div>

                            {totalDeduction > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#059669' }}>
                                <span>Fee Waivers / Deductions</span>
                                <strong style={{ fontWeight: 800 }}>- Rs.{totalDeduction.toLocaleString('en-IN')}</strong>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#059669' }}>
                              <span>Total Paid by Student</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{paid.toLocaleString('en-IN')}</strong>
                            </div>

                            {/* Horizontal Double Line */}
                            <div style={{ borderTop: '2px solid #0F172A', margin: '4px 0 2px' }} />

                            {/* Net Remaining Balance Banner */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              backgroundColor: netRemaining > 0 ? '#FFFBEB' : '#ECFDF5',
                              border: netRemaining > 0 ? '1.5px solid #FCD34D' : '1.5px solid #A7F3D0'
                            }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: netRemaining > 0 ? '#B45309' : '#047857', textTransform: 'uppercase' }}>
                                Remaining Balance
                              </span>
                              <strong style={{ fontSize: '16px', fontWeight: 900, color: netRemaining > 0 ? '#D97706' : '#059669' }}>
                                Rs.{netRemaining.toLocaleString('en-IN')}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={styles.readOnlyBlock}>
                      <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>Modify Fee Waivers & Custom Overrides</h4>
                      <p style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px', marginBottom: '14px' }}>
                        Enter waiver/deduction amount for each finalized fee slot below.
                      </p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        {getAdminActiveFeeSlots(selectedFeeStudent, feeBreakdownData).map((slot: any) => {
                          const slotKey = slot.id || slot.name;
                          return (
                            <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ ...styles.formLabel, fontWeight: 700, color: '#1E293B' }}>
                                {slot.name} Waiver (Rs)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={slot.amount}
                                value={editSlotWaivers[slotKey] !== undefined ? editSlotWaivers[slotKey] : ''}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditSlotWaivers(prev => ({ ...prev, [slotKey]: val }));
                                }}
                                style={styles.textInputBox}
                              />
                              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
                                Slot Base: Rs.{slot.amount.toLocaleString('en-IN')}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button onClick={() => { setFeeOtpInput(''); setIsFeeOtpModalOpen(true); }} style={{ ...styles.saveSubmitBtn, marginTop: '16px' }} className="press-interactive">
                        Submit Fee Override Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '12px' }}>Loading fee breakdown</div>
                )}
              </div>
            </div>
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
                    <strong>Tip:</strong> Copy Fee Override OTP from Authenticator Portal.
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

  //  SUBPAGE 13: LATE FEES & SCHOLARSHIPS (Admin 2)
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
            <p style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '10px', fontStyle: 'italic' }}> Late Fee policies are managed and updated by the Accountant Portal.</p>
          </GlassCard>
          <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
            <h4 style={styles.sectionSubtitle}>Scholarship Merit Policy</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <div style={styles.metaRow}><span>Active Rules</span><strong>{scholarshipRulesText}</strong></div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '10px', fontStyle: 'italic' }}> Scholarship slabs are configured and maintained by the Accountant Portal.</p>
          </GlassCard>
        </main>
      </div>
    );
  }

  //  SUBPAGE 14: EXPENDITURE TRACKER (Admin 2)
  if (activePage === 'expenditure') {
        const handleLogExpenditure = async (keyToUse: string) => {
      if (!newExpAmt || !newExpDesc) { triggerToast('Please fill all fields.'); return; }
      const finalCategory = newExpCat === 'Others' ? (customExpCat.trim() || 'Others') : newExpCat;
      try {
        setGlobalSecurityKey(keyToUse);
        const targetBranch = role === 'admin1' ? selectedExpBranch : loggedInCampus;
        await admin2Service.createExpenditure({
          category: finalCategory,
          amount: Number(newExpAmt),
          description: newExpDesc,
          date: newExpDate || new Date().toISOString().split('T')[0]
        } as any, targetBranch);
        setNewExpAmt(''); setNewExpDesc(''); setCustomExpCat('');
        setIsExpOtpOpen(false); setExpOtpInput('');
        triggerToast('Expenditure logged successfully.');
        fetchExpenditures();
      } catch (err: any) { triggerToast(err.message || 'Failed to log expenditure.'); }
    };

    const handleDeleteExpenditure = async (exp: ExpenditureItem, otpKey: string) => {
      const id = exp._id || exp.id;
      if (!id) return;
      try {
        setGlobalSecurityKey(otpKey.trim());
        await admin2Service.deleteExpenditure(id, exp.branch || (role === 'admin1' ? selectedExpBranch : loggedInCampus), otpKey.trim());
        triggerToast('Expenditure entry deleted.');
        setPendingExpDelete(null);
        setIsExpDeleteOtpOpen(false);
        setExpDeleteOtpInput('');
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
          <text x="${95 + width}" y="${y + 11}" font-size="8.5" font-weight="bold" fill="#0D9488">Rs.${amt.toLocaleString('en-IN')}</text>
        `;
      });

      const chartHeight = 40 + categories.length * 24;
      const svgChart = `
        <svg width="100%" height="${chartHeight}" viewBox="0 0 400 ${chartHeight}" xmlns="http://www.w3.org/2000/svg" style="font-family: sans-serif; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <text x="10" y="18" font-size="11" font-weight="bold" fill="#0F766E">CAMPUS EXPENDITURES BY CATEGORY</text>
          ${svgBars}
        </svg>
      `;

      const reportHtml = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8"/>
          <title>Expenditure Audit Report - ${campus}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; color: #0F172A; margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { max-width: 182mm; margin: 0 auto; padding: 4px; }
            .hdr { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 16px; margin-bottom: 20px; border-bottom: 3px solid #D4AF37; }
            .brand { display: flex; align-items: center; gap: 14px; }
            .logo { width: 44px; height: 44px; object-fit: contain; background: #FFF; border-radius: 10px; padding: 4px; border: 1px solid #D4AF37; }
            .iname { color: #FFF; font-size: 15px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; }
            .iaddr { color: #94A3B8; font-size: 10px; line-height: 1.4; margin-top: 2px; }
            .slbl strong { display: block; color: #FFF; font-size: 16px; font-weight: 900; text-transform: uppercase; text-align: right; letter-spacing: 0.04em; }
            .slbl span { color: #F59E0B; font-size: 10px; font-weight: 800; text-transform: uppercase; display: block; margin-top: 2px; }
            .chart-container { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1.5px solid #CBD5E1; border-radius: 12px; overflow: hidden; }
            th, td { border-bottom: 1px solid #E2E8F0; padding: 10px 12px; text-align: left; }
            th { background: #F1F5F9; color: #475569; font-size: 8.5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.06em; }
            td { font-size: 11px; }
            .total-row { font-weight: 900; background: #F8FAFC; border-top: 2px solid #D4AF37; font-size: 12px; }
            .pbtn { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 20px; padding: 12px 26px; background: linear-gradient(135deg, #0F172A, #1E293B); color: #FFF; border: none; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(15,23,42,0.15); }
            @media print {
              .pbtn { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <button onclick="window.print()" class="pbtn">⬇ Print Expenditure Report PDF</button>
            <div class="hdr">
              <div class="brand">
                <img class="logo" src="${collegeLogo}" alt="Logo"/>
                <div>
                  <div class="iname">INSPIRE JUNIOR COLLEGE</div>
                  <div class="iaddr">Campus: ${escapeHtml(campus)} &middot; Expenditure Audit System</div>
                </div>
              </div>
              <div class="slbl">
                <strong>Expenditure Audit</strong>
                <span>Generated: ${new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            <div class="chart-container">
              ${list.length > 0 ? svgChart : '<div style="padding: 20px; text-align: center; color: #64748B;">No category chart data available.</div>'}
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
                    <td><strong style="color:#0F172A">${escapeHtml(e.category)}</strong></td>
                    <td>${escapeHtml(e.description)}</td>
                    <td style="text-align: right; font-weight: 800; color: #0F172A">Rs. ${e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3">Grand Total Campus Expenditures</td>
                  <td style="text-align: right; color:#D97706">Rs. ${total.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

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
  <title>Expenditure Bill  ${exp.category}</title>
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
    <div class="row"><span>Logged By</span><strong>Administrator  ${role === 'admin1' ? 'Rector' : 'Principal'}</strong></div>
    <div class="total-row">
      <div class="total-label">Total Amount Spent</div>
      <div class="total-amt">Rs.${exp.amount.toLocaleString('en-IN')}</div>
    </div>
    <div style="margin-top:20px;text-align:right;">
      <div class="stamp"> APPROVED</div>
    </div>
  </div>
  <div class="footer">
    This document is system-generated by the Inspire ERP  Expenditure Tracker. For queries contact finance@inspirecolleges.edu
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
                  <div key={b} onClick={() => setSelectedExpBranch(b as any)} style={{ padding: '12px 10px', borderRadius: '12px', border: isActive ? '2px solid #0F172A' : '1px solid rgba(255,255,255,0.1)', background: isActive ? '#0F172A' : 'rgba(255,255,255,0.03)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} className="press-interactive">
                    <div style={{ fontSize: '10px', color: isActive ? '#FFFFFF' : 'var(--muted-gray)', fontWeight: 800 }}>{b}</div>
                    <strong style={{ fontSize: '14px', color: isActive ? '#38BDF8' : '#EF4444', display: 'block', marginTop: '4px' }}>Rs.{total.toLocaleString('en-IN')}</strong>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Reporting Date</label>
                <input type="date" value={newExpDate} onChange={(e) => setNewExpDate(e.target.value)} style={styles.textInputBox} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Category</label>
                <select value={newExpCat} onChange={(e) => setNewExpCat(e.target.value)} style={styles.selectInput}>
                  {['Utilities', 'Salaries', 'Mess', 'Purchase', 'Hand loan', 'Interest', 'Diesel', 'Rents', 'Advance', 'Electricity bill', 'Repairs', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {newExpCat === 'Others' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Custom Category Name</label>
                  <input type="text" placeholder="e.g. Office Equipment" value={customExpCat} onChange={(e) => setCustomExpCat(e.target.value)} style={styles.textInputBox} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Amount (Rs.)</label>
                  <input type="number" min="0" value={newExpAmt} onChange={(e) => setNewExpAmt(e.target.value)} style={styles.textInputBox} placeholder="e.g. 12000" />
                </div>
              )}
              {newExpCat === 'Others' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Amount (Rs.)</label>
                  <input type="number" min="0" value={newExpAmt} onChange={(e) => setNewExpAmt(e.target.value)} style={styles.textInputBox} placeholder="e.g. 12000" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                <label style={styles.formLabel}>Description</label>
                <input type="text" value={newExpDesc} onChange={(e) => setNewExpDesc(e.target.value)} style={styles.textInputBox} placeholder="Brief description of the expense" />
              </div>
            </div>
            <button onClick={() => { if (!newExpAmt || !newExpDesc) { triggerToast('Please fill all fields.'); return; } setIsExpOtpOpen(true); }} style={{ ...styles.saveSubmitBtn, marginTop: '14px' }} className="press-interactive">
              Log Expenditure
            </button>
          </GlassCard>

          {/* Recent entries */}
          <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>
                Recent Entries {role === 'admin1' ? `(${selectedExpBranch})` : `(${loggedInCampus})`}  Total: Rs.{totalFiltered.toLocaleString('en-IN')}
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
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--dark-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.category}  {exp.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>{typeof exp.date === 'string' ? exp.date.split('T')[0] : exp.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <strong style={{ fontSize: '14px', color: '#EF4444' }}>Rs.{exp.amount.toLocaleString('en-IN')}</strong>
                      <button onClick={() => handleDownloadBill(exp)} style={{ fontSize: '10px', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(212,175,55,0.4)', backgroundColor: 'rgba(212,175,55,0.06)', color: 'var(--royal-gold)', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }} title="Download Bill">Bill</button>
                      <button onClick={() => { setPendingExpDelete(exp); setIsExpDeleteOtpOpen(true); }} style={{ fontSize: '10px', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Expenditure Delete OTP modal */}
          {isExpDeleteOtpOpen && pendingExpDelete && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '400px', padding: '28px', borderRadius: '20px', margin: '0 16px' }} className="anim-slide-up glass-gold-ring">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--dark-charcoal)' }}>Delete Expenditure</h3>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted-gray)' }}>Enter the Authenticator OTP to remove this entry.</p>
                  </div>
                  <button onClick={() => { setIsExpDeleteOtpOpen(false); setPendingExpDelete(null); setExpDeleteOtpInput(''); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}>×</button>
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.6)', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{pendingExpDelete.category}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '3px' }}>{pendingExpDelete.description}</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#EF4444', marginTop: '4px' }}>Rs.{pendingExpDelete.amount.toLocaleString('en-IN')}</div>
                </div>
                <input
                  type="password"
                  placeholder="Enter 6-digit OTP"
                  value={expDeleteOtpInput}
                  onChange={(e) => setExpDeleteOtpInput(e.target.value)}
                  style={{ ...styles.textInputBox, textAlign: 'center', letterSpacing: '0.2em', fontWeight: 800, marginBottom: '12px' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleDeleteExpenditure(pendingExpDelete, expDeleteOtpInput.trim())}
                    disabled={!expDeleteOtpInput.trim()}
                    style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: '#DC2626', color: '#fff', opacity: expDeleteOtpInput.trim() ? 1 : 0.5 }}
                    className="press-interactive"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => { setIsExpDeleteOtpOpen(false); setPendingExpDelete(null); setExpDeleteOtpInput(''); }}
                    style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }}
                    className="press-interactive"
                  >
                    Cancel
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Expenditure OTP modal */}
          {isExpOtpOpen && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '20px', margin: '0 16px' }} className="anim-slide-up glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(212,175,55,0.1)', border: '2px solid rgba(212,175,55,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 12px' }}></div>
                  <h3 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '1.15rem', color: 'var(--dark-charcoal)' }}>Expenditure Verification</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted-gray)', lineHeight: 1.5 }}>Enter the <strong>Expenditure OTP</strong> from the Authenticator to log this entry.</p>
                  <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: '10px', fontSize: '12px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>{newExpCat}  {newExpDesc}</div>
                    <div style={{ color: '#EF4444', fontWeight: 900, fontSize: '16px', marginTop: '4px' }}>Rs.{Number(newExpAmt).toLocaleString('en-IN')}</div>
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

  //  SUBPAGE 15: STAFF SALARY STATUS (Admin 2)
  if (activePage === 'salary_status') {
    const teacherList: any[] = teachers.filter(t => role === 'admin2' ? t.branch === loggedInCampus : true);
    const salaryPageSize = 20;
    const salaryTotalPages = Math.max(1, Math.ceil(teacherList.length / salaryPageSize));
    const salaryCurrentPage = Math.min(salaryPage, salaryTotalPages);
    const salaryPageItems = teacherList.slice((salaryCurrentPage - 1) * salaryPageSize, salaryCurrentPage * salaryPageSize);
    const totalPaidAmount = teacherList
      .filter(t => t.salaryStatus === 'paid')
      .reduce((sum, t) => sum + Number(t.salaryPaidAmount || t.salary || 0), 0);
    const totalUnpaidAmount = teacherList
      .filter(t => t.salaryStatus !== 'paid')
      .reduce((sum, t) => sum + Number(t.salary || 0), 0);

    const openSalaryAction = (teacher: any, nextStatus: 'paid' | 'pending') => {
      setSelectedSalaryTeacher(teacher);
      setSalaryActionType(nextStatus);
      setSalaryAmountInput(String(teacher.salaryPaidAmount || teacher.salary || 0));
      setIsSalaryActionOpen(true);
    };

    const confirmSalaryAction = async () => {
      if (!selectedSalaryTeacher) return;
      const teacherId = selectedSalaryTeacher.id || selectedSalaryTeacher._id;
      if (!teacherId) return;
      try {
        setGlobalSecurityKey(securityKey);
        await admin2Service.toggleStaffSalary(teacherId, {
          salaryStatus: salaryActionType,
          paidAmount: salaryActionType === 'paid' ? Number(salaryAmountInput || selectedSalaryTeacher.salary || 0) : 0
        });
        setSecurityKey('');
        setIsSalaryActionOpen(false);
        setSelectedSalaryTeacher(null);
        setSalaryAmountInput('');
        await fetchStaffSalaries();
        triggerToast(salaryActionType === 'paid' ? 'Salary marked as paid.' : 'Salary marked as unpaid.');
      } catch (err: any) {
        triggerToast(err.message || 'Failed to update salary status.');
      }
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '12px', zIndex: 1, width: '100%' }}>
            <GlassCard hoverable={false} style={{ padding: '16px', border: '1px solid rgba(16,185,129,0.18)' }}>
              <div style={styles.metricLabel}>Total Paid Amount</div>
              <strong style={{ ...styles.metricValue, color: '#10B981', fontSize: '22px' }}>₹{totalPaidAmount.toLocaleString('en-IN')}</strong>
            </GlassCard>
            <GlassCard hoverable={false} style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.18)' }}>
              <div style={styles.metricLabel}>Total Unpaid Amount</div>
              <strong style={{ ...styles.metricValue, color: '#EF4444', fontSize: '22px' }}>₹{totalUnpaidAmount.toLocaleString('en-IN')}</strong>
            </GlassCard>
          </div>

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
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Faculty Roster  {teacherList.length} Members</h4>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                Total: ₹{teacherList.reduce((s, t) => s + (t.salary||0), 0).toLocaleString('en-IN')} / mo
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {salaryPageItems.map((t, i) => (
                <div key={t.id || i} style={{ padding: '14px', borderRadius: '16px', border: `1.5px solid ${t.salaryStatus === 'paid' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, backgroundColor: t.salaryStatus === 'paid' ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--dark-charcoal)', lineHeight: 1.25 }}>{t.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '4px' }}>{t.subject || 'Role'}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: t.salaryStatus === 'paid' ? '#10B981' : '#EF4444', backgroundColor: 'rgba(255,255,255,0.75)', padding: '4px 8px', borderRadius: '999px' }}>
                      {t.salaryStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', fontSize: '11px', color: 'var(--muted-gray)', lineHeight: 1.5 }}>
                    <span>Campus: {t.branch || loggedInCampus}</span>
                    <span>Salary: ₹{Number(t.salary || 0).toLocaleString('en-IN')}</span>
                    <span>Paid: ₹{Number(t.salaryPaidAmount || 0).toLocaleString('en-IN')}</span>
                    <span>Balance: ₹{Math.max(0, Number(t.salary || 0) - Number(t.salaryPaidAmount || 0)).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => openSalaryAction(t, 'paid')}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                      className="press-interactive"
                    >
                      Mark Given
                    </button>
                    <button
                      onClick={() => openSalaryAction(t, 'pending')}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                      className="press-interactive"
                    >
                      Unmark
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={() => setSalaryPage(prev => Math.max(1, prev - 1))}
                disabled={salaryCurrentPage <= 1}
                style={{ ...styles.actionItemBtn, border: '1.5px solid var(--card-border)', opacity: salaryCurrentPage <= 1 ? 0.45 : 1 }}
                className="press-interactive"
              >
                Previous Page
              </button>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted-gray)' }}>
                Page <strong>{salaryCurrentPage}</strong> of <strong>{salaryTotalPages}</strong>
              </div>
              <button
                onClick={() => setSalaryPage(prev => Math.min(salaryTotalPages, prev + 1))}
                disabled={salaryCurrentPage >= salaryTotalPages}
                style={{ ...styles.actionItemBtn, border: '1.5px solid var(--card-border)', opacity: salaryCurrentPage >= salaryTotalPages ? 0.45 : 1 }}
                className="press-interactive"
              >
                Next Page
              </button>
            </div>
          </GlassCard>

          {isSalaryActionOpen && selectedSalaryTeacher && (
            <div style={styles.overlayOverlay}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '420px', padding: '28px', borderRadius: '18px', border: '1px solid var(--card-border)' }} className="anim-slide-up glass-gold-ring">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--dark-charcoal)' }}>
                      {salaryActionType === 'paid' ? 'Mark Salary as Paid' : 'Mark Salary as Unpaid'}
                    </h3>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted-gray)' }}>
                      {selectedSalaryTeacher.name} • {selectedSalaryTeacher.subject || 'Role'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setIsSalaryActionOpen(false); setSelectedSalaryTeacher(null); setSalaryAmountInput(''); }}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.6)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>Salary Due</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--dark-charcoal)' }}>₹{Number(selectedSalaryTeacher.salary || 0).toLocaleString('en-IN')}</div>
                  </div>
                  {salaryActionType === 'paid' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Exact Amount Paid</label>
                      <input
                        type="number"
                        min="0"
                        value={salaryAmountInput}
                        onChange={(e) => setSalaryAmountInput(e.target.value)}
                        style={styles.textInputBox}
                        placeholder="Enter paid amount"
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button onClick={confirmSalaryAction} style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0 }} className="press-interactive">
                      Confirm
                    </button>
                    <button
                      onClick={() => { setIsSalaryActionOpen(false); setSelectedSalaryTeacher(null); setSalaryAmountInput(''); }}
                      style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }}
                      className="press-interactive"
                    >
                      Cancel
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

  //  SUBPAGE 16: WORKER PAYMENT DETAILS (Admin 2)
  if (activePage === 'worker_payments') {
    const filteredWorkers = workers.filter((w: any) => {
      const q = workerSearch.toLowerCase().trim();
      if (!q) return true;
      const wName = String(w.workerName || w.name || '').toLowerCase();
      const wRole = String(w.role || '').toLowerCase();
      const wMonth = String(w.monthPeriod || '').toLowerCase();
      const wId = String(w._id || w.id || '').toLowerCase();
      return wName.includes(q) || wRole.includes(q) || wMonth.includes(q) || wId.includes(q);
    });

    const WORKER_PER_PAGE = 50;
    const workerTotalPages = Math.max(1, Math.ceil(filteredWorkers.length / WORKER_PER_PAGE));
    const workerCurrentPage = Math.min(workerPage, workerTotalPages);
    const workerPaginatedList = filteredWorkers.slice((workerCurrentPage - 1) * WORKER_PER_PAGE, workerCurrentPage * WORKER_PER_PAGE);

    const triggerWorkerAction = (actionType: 'toggle' | 'delete', data: any) => {
      setWorkerPendingAction({ actionType, data });
      setWorkerOtpInput('');
      setIsWorkerOtpOpen(true);
    };

    const confirmWorkerAction = async () => {};

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('emerald')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">Back to Cockpit</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: '8px' }}>
            <div>
              <h1 style={styles.title}>Worker Payment Details</h1>
              <p style={styles.subtitle}>Audit non-teaching staff payroll, log term payments and export statements</p>
            </div>
            <button
              onClick={() => handleDownloadAllWorkerRecords(workers)}
              style={{
                ...styles.actionItemBtn,
                backgroundColor: 'var(--royal-gold)',
                color: '#000',
                border: 'none',
                fontWeight: 900,
                fontSize: '12px',
                padding: '10px 18px',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="press-interactive"
            >
              Download All Records (PDF)
            </button>
          </div>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', zIndex: 1 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Worker by Name, Role, Month Period, ID..."
                value={workerSearch}
                onChange={(e) => { setWorkerSearch(e.target.value); setWorkerPage(1); }}
                style={{ ...styles.textInputBox, fontSize: '13px', padding: '12px 14px' }}
              />
            </div>
            {workerSearch && (
              <button
                onClick={() => { setWorkerSearch(''); setWorkerPage(1); }}
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}
              >
                Clear Search
              </button>
            )}
            <div style={{ fontSize: '12px', color: 'var(--muted-gray)', fontWeight: 700, padding: '0 8px' }}>
              Showing <strong>{filteredWorkers.length}</strong> Workers
            </div>
          </div>

          {/* Top Pagination Controls */}
          {workerTotalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                Showing {((workerCurrentPage - 1) * WORKER_PER_PAGE) + 1}â€“{Math.min(workerCurrentPage * WORKER_PER_PAGE, filteredWorkers.length)} of {filteredWorkers.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setWorkerPage(p => Math.max(1, p - 1))} disabled={workerCurrentPage === 1}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: workerCurrentPage === 1 ? '#F8FAFC' : '#fff', color: workerCurrentPage === 1 ? '#94A3B8' : '#1E293B', fontWeight: 800, fontSize: '12px', cursor: workerCurrentPage === 1 ? 'default' : 'pointer' }}>
                  â† Prev
                </button>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center' }}>Page {workerCurrentPage} / {workerTotalPages}</span>
                <button onClick={() => setWorkerPage(p => Math.min(workerTotalPages, p + 1))} disabled={workerCurrentPage === workerTotalPages}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: workerCurrentPage === workerTotalPages ? '#F8FAFC' : '#fff', color: workerCurrentPage === workerTotalPages ? '#94A3B8' : '#1E293B', fontWeight: 800, fontSize: '12px', cursor: workerCurrentPage === workerTotalPages ? 'default' : 'pointer' }}>
                  Next â†’
                </button>
              </div>
            </div>
          )}

          {/* WORKERS GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
            marginTop: '4px',
            zIndex: 1
          }}>
            {workerPaginatedList.map((w: any) => {
              const wName = w.workerName || w.name || 'Worker';
              const wWage = Number(w.amount || w.salary || 0);
              const wPaid = Number(w.amountPaid !== undefined ? w.amountPaid : (w.paid ? wWage : 0));
              const wDue = Math.max(0, wWage - wPaid);

              return (
                <GlassCard
                  key={w._id || w.id}
                  hoverable={true}
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    border: `1.5px solid ${w.paid ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.4)'}`,
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  {/* Top Row: Avatar + Name + Status */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      backgroundColor: w.paid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: w.paid ? '#059669' : '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      {wName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '15px', color: 'var(--dark-charcoal)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {wName}
                        </strong>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 900,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: w.paid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: w.paid ? '#059669' : '#DC2626',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}>
                          {w.paid ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                        Role: <span style={{ color: '#1E293B', fontWeight: 800 }}>{w.role || 'Staff'}</span> Â· Period: <span style={{ color: '#1E293B', fontWeight: 800 }}>{w.monthPeriod || 'July 2026'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', fontSize: '11.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Monthly Wage:</span>
                      <strong>Rs.{wWage.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                      <span>Amount Paid:</span>
                      <strong>Rs.{wPaid.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: wDue > 0 ? '#DC2626' : '#059669' }}>
                      <span>Balance Due:</span>
                      <strong>Rs.{wDue.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!w.paid ? (
                      <button
                        onClick={() => {
                          setSelectedWorkerForPayment(w);
                          setPaymentAmountInput(String(wWage));
                          setIsPaymentAmountModalOpen(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          border: 'none',
                          color: '#000',
                          backgroundColor: 'var(--royal-gold)',
                          borderRadius: '8px',
                          fontWeight: 900,
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(251, 191, 36, 0.25)'
                        }}
                        className="press-interactive"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerWorkerAction('toggle', { ...w, paid: false, amountPaid: 0 })}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          border: '1.5px solid rgba(239, 68, 68, 0.3)',
                          color: '#DC2626',
                          backgroundColor: 'rgba(254, 242, 242, 0.8)',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '11.5px',
                          cursor: 'pointer'
                        }}
                        className="press-interactive"
                      >
                        Mark Unpaid
                      </button>
                    )}

                    <button
                      onClick={() => handleDownloadWorkerBill(w)}
                      style={{
                        padding: '9px 12px',
                        border: '1.5px solid #CBD5E1',
                        color: '#334155',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      className="press-interactive"
                    >
                      Download Bill
                    </button>
                  </div>
                </GlassCard>
              );
            })}

            {workerPaginatedList.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--muted-gray)', fontSize: '13px', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '16px' }}>
                No worker payroll records found matching your search.
              </div>
            )}
          </div>

          {/* Bottom Pagination Controls */}
          {workerTotalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '8px' }}>
              <button onClick={() => setWorkerPage(p => Math.max(1, p - 1))} disabled={workerCurrentPage === 1}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: workerCurrentPage === 1 ? '#F8FAFC' : '#fff', color: workerCurrentPage === 1 ? '#94A3B8' : '#1E293B', fontWeight: 800, fontSize: '12px', cursor: workerCurrentPage === 1 ? 'default' : 'pointer' }}>
                â† Previous
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Page {workerCurrentPage} of {workerTotalPages}</span>
              <button onClick={() => setWorkerPage(p => Math.min(workerTotalPages, p + 1))} disabled={workerCurrentPage === workerTotalPages}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: workerCurrentPage === workerTotalPages ? '#F8FAFC' : '#fff', color: workerCurrentPage === workerTotalPages ? '#94A3B8' : '#1E293B', fontWeight: 800, fontSize: '12px', cursor: workerCurrentPage === workerTotalPages ? 'default' : 'pointer' }}>
                Next â†’
              </button>
            </div>
          )}

          {/* ENTER PAYMENT AMOUNT MODAL */}
          {isPaymentAmountModalOpen && selectedWorkerForPayment && (
            <div style={{ ...styles.overlayOverlay, zIndex: 1300 }} className="anim-fade-in">
              <div style={{ ...styles.overlaySheet, maxWidth: '420px', borderTop: '4px solid var(--royal-gold)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ ...styles.modalTitle, color: '#7C5A00' }}>Record Worker Payment</h3>
                  <button onClick={() => { setIsPaymentAmountModalOpen(false); setSelectedWorkerForPayment(null); }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}>âœ•</button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted-gray)', lineHeight: 1.5, marginBottom: '14px' }}>
                  Worker: <strong>{selectedWorkerForPayment.workerName || selectedWorkerForPayment.name}</strong> ({selectedWorkerForPayment.role})<br/>
                  Monthly Wage: <strong>Rs.{(selectedWorkerForPayment.amount || selectedWorkerForPayment.salary || 0).toLocaleString('en-IN')}</strong>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <label style={styles.formLabel}>Amount Paid (Rs.) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter paid amount"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    style={{ ...styles.textInputBox, fontSize: '16px', fontWeight: 800, color: '#059669' }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const amt = Number(paymentAmountInput);
                      if (isNaN(amt) || amt <= 0) {
                        triggerToast('Please enter a valid payment amount.');
                        return;
                      }
                      setIsPaymentAmountModalOpen(false);
                      triggerWorkerAction('toggle', {
                        ...selectedWorkerForPayment,
                        paid: true,
                        amountPaid: amt
                      });
                    }}
                    style={{ ...styles.saveSubmitBtn, flex: 1.5, marginTop: 0, backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 900 }}
                    className="press-interactive"
                  >
                    Proceed to OTP Verification 
                  </button>
                  <button onClick={() => { setIsPaymentAmountModalOpen(false); setSelectedWorkerForPayment(null); }} style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }} className="press-interactive">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Worker OTP verification modal overlay */}
          {isWorkerOtpOpen && (
            <div style={{ ...styles.overlayOverlay, zIndex: 1400 }} className="anim-fade-in">
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
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button onClick={confirmWorkerAction} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 900 }} className="press-interactive">Confirm & Save</button>
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

  //  SUBPAGE 17: CAMPUS MARKS REGISTRY (Admin 2)
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
                    -
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

  //  SUBPAGE 20: PROFILE CONSOLE
  if (activePage === 'profile') {
    const getProfileData = () => {
      if (role === 'admin1') {
        return {
          initials: 'SR',
          name: 'Sriram Reddy',
          title: 'Head & General Principal, Superintendent Rector',
          clearance: 'Level 1 Clearance',
          registry: 'Global Institution ERP'
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

  return (
    <div style={styles.container} className="anim-slide-up">
      <PortalDataLoader visible={isPageLoading} colorAccent={role === 'admin2' ? '#3B82F6' : '#FBBF24'} />
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
          {/* VERY VISIBLE LOGO BRANDING WITH THICK BLACK BOX IN PORTAL */}
          <div style={{ paddingRight: '8px' }}>
            <InspireLogo size="md" inPortal={true} />
          </div>
        </div>
      </header>

      <main style={{ ...styles.content, zIndex: 1 }}>
        {/* ADMIN 1 TWO SLOTS SWITCHER (DASHBOARD & OVERVIEW) */}
        {role === 'admin1' && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            padding: '6px',
            backgroundColor: '#0F172A',
            borderRadius: '16px',
            border: '1px solid #334155'
          }}>
            <button
              onClick={() => setAdmin1Tab('dashboard')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '14px',
                border: 'none',
                backgroundColor: admin1Tab === 'dashboard' ? '#2563EB' : '#1E293B',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: admin1Tab === 'dashboard' ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              className="press-interactive"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span style={{ color: '#FFFFFF' }}>Dashboard (Operations Modules)</span>
            </button>

            <button
              onClick={() => setAdmin1Tab('overview')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '14px',
                border: 'none',
                backgroundColor: admin1Tab === 'overview' ? '#2563EB' : '#1E293B',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: admin1Tab === 'overview' ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              className="press-interactive"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              <span style={{ color: '#FFFFFF' }}>Overview (Data Science Analytics)</span>
            </button>
          </div>
        )}

        {/* SUMMARY STATS / OVERVIEW - role-conditional */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {role === 'admin1' ? (
            admin1Tab === 'overview' ? (
              <AdminDataAnalytics
                students={students}
                teachers={teachers}
                expenditures={expenditures}
                feeSettings={feeRates}
              />
            ) : null
          ) : role === 'admin2' ? (
            (() => {
              const localStudents = students.filter(s => s.branch === loggedInCampus);
              const localExpenditures = expenditures.filter(e => e.branch === loggedInCampus);
              const localTeachers = teachers.filter(t => t.branch === loggedInCampus);
              const totalStudents = localStudents.length;
              const totalEmployees = localTeachers.length;
              const totalExpenses = localExpenditures.reduce((sum, e) => sum + (e.amount || 0), 0);
              const totalSalariesPaid = localTeachers
                .filter(t => t.salaryStatus === 'paid')
                .reduce((sum, t) => sum + Number(t.salaryPaidAmount || t.salary || 0), 0);
              const totalSalariesUnpaid = localTeachers
                .filter(t => t.salaryStatus !== 'paid')
                .reduce((sum, t) => sum + Number(t.salary || 0), 0);

              return (
                <>
                  <div style={styles.metricsGrid}>
                    <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring neo-2d-card hover-gold">
                      <span style={styles.metricLabel}>Total Students</span>
                      <strong style={{ ...styles.metricValue, color: '#10B981' }}>{totalStudents}</strong>
                      <span style={styles.metricSub}>{loggedInCampus} branch students</span>
                      <span className="glass-status-pill status-paid">Active</span>
                    </GlassCard>
                    <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
                      <span style={styles.metricLabel}>Total Employees</span>
                      <strong style={{ ...styles.metricValue, color: '#3B82F6' }}>{totalEmployees}</strong>
                      <span style={styles.metricSub}>Faculty & staff on campus</span>
                      <span className="glass-status-pill status-warning">Working</span>
                    </GlassCard>
                  </div>
                  <div style={styles.metricsGrid}>
                    <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring neo-2d-card hover-gold">
                      <span style={styles.metricLabel}>Total Expenses</span>
                      <strong style={{ ...styles.metricValue, color: '#EF4444' }}>₹{totalExpenses.toLocaleString('en-IN')}</strong>
                      <span style={styles.metricSub}>Branch expenses logged</span>
                      <span className="glass-status-pill status-pending">Ledger</span>
                    </GlassCard>
                    <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
                      <span style={styles.metricLabel}>Salaries Given</span>
                      <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>₹{totalSalariesPaid.toLocaleString('en-IN')}</strong>
                      <span style={styles.metricSub}>Unpaid: ₹{totalSalariesUnpaid.toLocaleString('en-IN')}</span>
                      <span className="glass-status-pill status-info">Payroll</span>
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
        {(role !== 'admin1' || admin1Tab === 'dashboard') && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>
              {role === 'admin1' ? 'Operations Modules' : role === 'admin2' ? 'Finance & Staff Modules' : 'Academic Modules'}
            </h3>

          {role === 'admin1' ? (
            <div className="grid-container">
              <div onClick={() => setActivePage('students')} style={styles.moduleCardNew} className="module-card press-interactive">
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

              <div onClick={() => setActivePage('enquiries')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.22)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Admission Enquiries</h4>
                <p style={styles.moduleDesc}>View and manage prospective student enquiries from portfolio.</p>
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
            <div className="grid-container">
              <div onClick={() => setActivePage('expenditure')} style={styles.moduleCardNew} className="module-card press-interactive">
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

              <div onClick={() => setActivePage('enquiries')} style={styles.moduleCardNew} className="press-interactive">
                <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.22)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <h4 style={styles.moduleTitle}>Admission Enquiries</h4>
                <p style={styles.moduleDesc}>View incoming student enquiries for {loggedInCampus}.</p>
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
            <div className="grid-container">
              <div onClick={() => setActivePage('classes')} style={styles.moduleCardNew} className="module-card press-interactive">
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
        )}

        {/* Terminate Session */}
        <button onClick={handleLogout} style={{ ...styles.logoutBtn, marginTop: '8px' }} className="press-interactive">
          Terminate Director Session
        </button>

        {/* Footer */}
        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px 12px', gap: '8px', opacity: 0.85 }}>
          <InspireLogo size="sm" inPortal={true} />
          <span style={{ fontSize: '9px', color: 'var(--muted-gray)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
            Inspire ERP General Portal v2.6.4 • Powered by TRNT BEE Technologies
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

      {/* Permanent Student Delete Confirmation OTP Modal */}
      {isDeleteStuOtpOpen && selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '20px', margin: '0 16px', backgroundColor: 'rgba(255,255,255,0.98)', border: '2px solid #EF4444', boxShadow: '0 25px 60px rgba(239,68,68,0.25)' }} className="anim-slide-up">
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '20px', fontWeight: 900 }}>!</div>
              <h3 style={{ margin: '0 0 6px', fontWeight: 900, fontSize: '16px', color: '#DC2626' }}>Permanent Database Purge</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--dark-charcoal)', lineHeight: 1.5, fontWeight: 600 }}>
                This action will <strong>PERMANENTLY DELETE</strong> student record for <strong style={{ color: '#DC2626' }}>{selectedStudent.name}</strong> ({selectedStudent.admissionNumber}) from MongoDB, fees, accountants, attendance, and all databases.
              </p>
              <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '10.5px', color: '#B91C1C', fontWeight: 700 }}>
                THIS ACTION CANNOT BE RECOVERED.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" autoFocus placeholder="Enter Security OTP..." value={deleteStuOtpInput} onChange={(e) => setDeleteStuOtpInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter' && deleteStuOtpInput.trim()) handlePermanentDeleteStudent(deleteStuOtpInput.trim()); }} style={{ padding: '12px 16px', border: '2px solid #EF4444', borderRadius: '12px', fontSize: '15px', fontWeight: 800, letterSpacing: '0.15em', textAlign: 'center', backgroundColor: '#fff', outline: 'none', fontFamily: 'monospace', color: '#DC2626' }} />
              <button onClick={() => handlePermanentDeleteStudent(deleteStuOtpInput.trim())} disabled={!deleteStuOtpInput.trim()} style={{ ...styles.saveSubmitBtn, marginTop: 0, backgroundColor: '#DC2626', opacity: deleteStuOtpInput.trim() ? 1 : 0.4 }} className="press-interactive">PERMANENTLY PURGE STUDENT</button>
              <button onClick={() => { setIsDeleteStuOtpOpen(false); setDeleteStuOtpInput(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted-gray)', fontFamily: 'var(--font-family)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: '4px' }}>Cancel  Keep Student Record</button>
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



