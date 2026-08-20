import React, { useState, useEffect, useRef } from 'react';
import { LIMITS, validateMobile, digitsOnly } from '../constants/fieldLimits';
import {
  openPrintDocument, pdfHeader, pdfFooter, pdfSection, pdfTable, pdfTiles,
  pdfDetailCard, money, dateStr, escapeHtml
} from '../utils/pdfDocument';
import { useNavigation } from '../context/NavigationContext';
import { GlassCard } from '../components/common/GlassCard';
import { InspireLogo } from '../components/common/InspireLogo';
import { PortalDataLoader } from '../components/common/PortalDataLoader';
import collegeLogo from '../assets/college logo.png';
import * as accountantService from '../services/accountantService';
import { CAMPUS_LIST } from '../constants/campuses';
import { useDataFreshness } from '../hooks/useDataFreshness';


// --- RENDER BACKGROUND DESIGN WITH CUSTOM COLOR ACCENT GLOWS ---
const renderBackgroundDesign = (colorTheme: 'emerald' | 'gold' | 'sapphire' | 'ruby' | 'purple' | 'rose' | 'teal' | 'navy' | 'orange' = 'gold') => {
  let primaryGlow = 'rgba(251,191,36,0.18)'; // Gold
  let secondaryGlow = 'rgba(59,130,246,0.16)'; // Blue

  if (colorTheme === 'emerald') {
    primaryGlow = 'rgba(16,185,129,0.18)';
    secondaryGlow = 'rgba(20,184,166,0.14)';
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
  } else if (colorTheme === 'orange') {
    primaryGlow = 'rgba(249,115,22,0.18)';
    secondaryGlow = 'rgba(251,191,36,0.12)';
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

      {/* Floating Colorful Neo-Brutalist Circles with Thick Outlines */}
      <div style={{
        position: 'absolute',
        top: '12%',
        left: '-40px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        border: '2.5px solid var(--card-border)',
        boxShadow: '6px 6px 0px var(--card-border)',
        opacity: 0.15,
      }} />

      <div style={{
        position: 'absolute',
        top: '35%',
        right: '-50px',
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        backgroundColor: 'var(--critical)',
        border: '2.5px solid var(--card-border)',
        boxShadow: '6px 6px 0px var(--card-border)',
        opacity: 0.12,
      }} />

      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: '10%',
        width: '90px',
        height: '90px',
        borderRadius: '16px',
        backgroundColor: 'var(--warning)',
        border: '2.5px solid var(--card-border)',
        boxShadow: '6px 6px 0px var(--card-border)',
        transform: 'rotate(15deg)',
        opacity: 0.15,
      }} />

      <div style={{
        position: 'absolute',
        bottom: '28%',
        right: '8%',
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        backgroundColor: '#22C55E',
        border: '2px solid var(--card-border)',
        boxShadow: '4px 4px 0px var(--card-border)',
        opacity: 0.15,
      }} />

      {/* Dynamic Colorful Gradient Mesh Blobs */}
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

// --- CLOSE CROSS ICON ---
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// --- STUDENT DATABASE INTERFACES ---
interface Receipt {
  receiptNumber: string;
  /** Signed by the server so a parent can open this receipt without an account. */
  receiptToken?: string;
  date: string;
  category: string;
  installment: string;
  amount: number;
  balance: number;
  mode: string;
  cashier: string;
  transactionRef?: string;
  referenceNo?: string;
}

interface FeeAdjustment {
  _id?: string;
  id?: string;
  amount: number;
  previousBalance: number;
  updatedBalance: number;
  note?: string;
  createdAt?: string;
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
  course?: string;
  section?: string;
  branch?: string;
  rollNumber?: string;
  tuitionFee: number;
  hostelFee: number;
  transportFee: number;
  miscellaneousFee: number;
  previousPending: number;
  totalPaid: number;
  remainingBalance: number;
  receipts: Receipt[];
  feeAdjustments?: FeeAdjustment[];
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
  customFeeSlots?: Array<{ id?: string; name: string; amount: number }>;
  // Year progression. Short Term never advances and Second Year completes the
  // programme, so only First Year students can be upgraded.
  studentYear?: 'First Year' | 'Second Year' | 'Short Term';
  yearFeeCleared?: boolean;
  academicYear?: string;
  yearHistory?: Array<{
    studentYear?: string;
    academicYear?: string;
    totalPayable?: number;
    totalPaid?: number;
    closedAt?: string;
    closedBy?: string;
  }>;
}


//  MAIN CONSOLIDATED ACCOUNTANT COCKPIT VIEW
// The institution name now lives in utils/pdfDocument.ts as PDF_ORG_NAME, so
// every printed document uses the same one. It used to differ between the fee
// statement and the payslips.

const numberToReceiptWords = (amount: number) => {
  const cleanAmount = Math.max(0, Math.floor(amount));
  if (cleanAmount === 0) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigitWords = (value: number) => {
    if (value === 0) return '';
    if (value < 10) return ones[value];
    if (value < 20) return teens[value - 10];
    const tenPart = tens[Math.floor(value / 10)];
    const unitPart = value % 10 ? ` ${ones[value % 10]}` : '';
    return `${tenPart}${unitPart}`;
  };

  const threeDigitWords = (value: number) => {
    const hundredPart = Math.floor(value / 100);
    const remainder = value % 100;
    const words = [];
    if (hundredPart) words.push(`${ones[hundredPart]} Hundred`);
    if (remainder) words.push(twoDigitWords(remainder));
    return words.join(' ');
  };

  const crores = Math.floor(cleanAmount / 10000000);
  const lakhs = Math.floor((cleanAmount % 10000000) / 100000);
  const thousands = Math.floor((cleanAmount % 100000) / 1000);
  const hundreds = cleanAmount % 1000;
  const segments: string[] = [];

  if (crores) segments.push(`${twoDigitWords(crores)} Crore`);
  if (lakhs) segments.push(`${twoDigitWords(lakhs)} Lakh`);
  if (thousands) segments.push(`${twoDigitWords(thousands)} Thousand`);
  if (hundreds) segments.push(threeDigitWords(hundreds));

  return `${segments.join(' ')} Rupees Only`.replace(/\s+/g, ' ').trim();
};

// escapeHtml now comes from utils/pdfDocument, so there is one implementation.

const normalizeStudentSearch = (value: string) => value.toLowerCase().trim();

const matchesStudentSearch = (student: Student, query: string) => {
  const normalizedQuery = normalizeStudentSearch(query);
  if (!normalizedQuery) return true;

  return [
    student.name,
    student.admissionNumber,
    student.studentId,
    student.rollNumber,
    student.registrationNumber,
    student.mobile,
    student.parentMobile,
    student.course,
    student.branch
  ].some((field) => String(field || '').toLowerCase().includes(normalizedQuery));
};

/**
 * `restrictTo` pins this view to a single module and is set when a CLERK is
 * borrowing it.
 *
 * A clerk granted "collect fees" gets this exact screen rather than a copy of
 * it — one implementation of the receipt and balance arithmetic. But a clerk
 * is not an accountant: they must not land on the accountant cockpit, and
 * "Back to Cockpit" has to return them to their own. Without this the clerk
 * entered fee collection and had no way back, because changing the hash does
 * not move `activeTab` and the exit button only reset this view's local page.
 */
export const AccountantDashboardView: React.FC<{ restrictTo?: 'fee_collection'; campusOverride?: string }> = ({ restrictTo, campusOverride }) => {
  const { user, activeTab: globalActiveTab, setActiveTab } = useNavigation();
  // An org-wide account (the Rector) has campus "All", which is not a campus
  // this module can act on — it collects fees for exactly one. campusOverride
  // is the campus they picked; everyone else is pinned by their own account.
  // The old fallback silently used Erragattugutta C1 for any org-wide caller,
  // which would have taken payments against the wrong campus.
  const loggedInCampus = campusOverride
    || (user?.campus && user.campus !== 'All' ? user.campus : 'Erragattugutta C1');

  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [activeSubPage, setActiveSubPage] = useState<'menu' | 'student_search' | 'fee_collection' | 'reports' | 'profile'>(
    restrictTo || 'menu'
  );

  /**
   * Leaving this view.
   *
   * A borrowing clerk goes back to their OWN cockpit, which means moving the
   * global tab — this component is only mounted for them while that tab says
   * fee_collection. An accountant just returns to their menu as before.
   */
  const exitToCockpit = () => {
    setSelectedStudent(null);
    setEditStudent(null);
    setFeeCollectAdm('');
    if (restrictTo) {
      setActiveTab('dashboard');
      return;
    }
    setActiveSubPage('menu');
  };
  const [students, setStudents] = useState<Student[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePulseKey, setLivePulseKey] = useState<'students' | 'fees' | 'settings' | null>(null);
  const [securityKey] = useState('');

  // Sync globalActiveTab from sidebar/navigation drawer into local activeSubPage
  useEffect(() => {
    // A restricted mount is pinned to its one module and must never follow the
    // tab elsewhere — a clerk borrowing fee collection has no business landing
    // on the accountant's reports or profile.
    if (restrictTo) {
      setActiveSubPage(restrictTo);
      return;
    }
    if (globalActiveTab) {
      if (globalActiveTab === 'dashboard' || globalActiveTab === 'home') {
        setActiveSubPage('menu');
      } else if (globalActiveTab === 'add_student') {
        setIsAddStudentModalOpen(true);
      } else if (['student_search', 'fee_collection', 'reports', 'profile'].includes(globalActiveTab)) {
        setActiveSubPage(globalActiveTab as any);
      }
    }
  }, [globalActiveTab, restrictTo]);

  // New Student & Delete Student Modals
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStuFormPage, setNewStuFormPage] = useState<1 | 2 | 3>(1);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [, setDeleteOtpInput] = useState('');
  const [registryPage, setRegistryPage] = useState(1);
  // Fee collection: its own page and filters, kept separate from the registry's
  // so moving between the two screens does not carry one's filters into the
  // other.
  const [feeCollectPage, setFeeCollectPage] = useState(1);
  const [feeFilterCampus, setFeeFilterCampus] = useState('All');
  const [feeFilterCourse, setFeeFilterCourse] = useState('All');
  const [feeFilterYear, setFeeFilterYear] = useState('All');
  const [feeFilterDues, setFeeFilterDues] = useState('All');
  const [isRegStuOtpModalOpen, setIsRegStuOtpModalOpen] = useState(false);
  const [, setRegStuOtpInput] = useState('');
  const [regStuError, setRegStuError] = useState('');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [auditPage, setAuditPage] = useState(1);

  const initialNewStudent = {
    admissionNumber: '',
    name: '',
    mobile: '',
    course: 'MPC',
    section: 'MPC-A',
    // Which year of the programme they are joining. Needed at admission
    // because a student can be enrolled straight into Second Year, and the
    // upgrade flow reads this to decide who is eligible to move up.
    studentYear: 'First Year',
    branch: loggedInCampus,
    fatherName: '',
    motherName: '',
    dob: '',
    parentMobile: '',
    previousSchool: '',
    previousBoard: 'State Board',
    address: '',
    tuitionFee: 0,
    hostelFee: 0,
    transportFee: 0,
    miscellaneousFee: 0,
    previousPending: 0
  };
  const [newStudentData, setNewStudentData] = useState(initialNewStudent);
  const [newStudentAdmissionError, setNewStudentAdmissionError] = useState('');
  const [newStudentMobileError, setNewStudentMobileError] = useState('');
  const [newStudentParentMobileError, setNewStudentParentMobileError] = useState('');
  const [isCheckingAdmission, setIsCheckingAdmission] = useState(false);

  // Admission numbers are unique college-wide and the server refuses a
  // duplicate with a 409 — but that only used to be reached after all three
  // screens and the confirmation, so a clash surfaced at the very end of the
  // form. Ask while the field is still on screen.
  //
  // Debounced, and guarded against a stale answer overwriting a newer one:
  // typing "24001" then "240012" fires twice, and without the generation check
  // the slower first reply could land last and mark a free number as taken.
  // One reset for the whole add-student form. Three call sites each cleared a
  // different subset, so an error from a previous attempt could still be on
  // screen when the form was reopened.
  const resetNewStudentForm = () => {
    setNewStudentData({ ...initialNewStudent, branch: loggedInCampus });
    setNewStudentAdmissionError('');
    setNewStudentMobileError('');
    setNewStudentParentMobileError('');
    setNewStuCustomSlots([]);
    setNewStuFormPage(1);
  };

  const admissionCheckRef = useRef(0);
  useEffect(() => {
    const value = newStudentData.admissionNumber.trim();
    if (!isAddStudentModalOpen || !value) {
      setIsCheckingAdmission(false);
      return;
    }
    const generation = ++admissionCheckRef.current;
    setIsCheckingAdmission(true);

    const timer = setTimeout(async () => {
      try {
        const result = await accountantService.checkAdmissionAvailable(value);
        if (generation !== admissionCheckRef.current) return;
        setNewStudentAdmissionError(result.available ? '' : (result.message || 'That admission number is already in use.'));
      } catch {
        // A failed availability check is not a validation failure — the create
        // route re-checks and is the real guard. Staying silent here avoids
        // blocking the form when the network hiccups.
        if (generation === admissionCheckRef.current) setNewStudentAdmissionError('');
      } finally {
        if (generation === admissionCheckRef.current) setIsCheckingAdmission(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [newStudentData.admissionNumber, isAddStudentModalOpen]);

  // Custom Fee Section Slots for Accountant Registration
  const [newStuCustomSlots, setNewStuCustomSlots] = useState<Array<{ id: string; name: string; amount: number }>>([]);
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
      amount: amt
    };
    setNewStuCustomSlots(prev => [...prev, newSlot]);
    setNewStuSlotName('');
    setNewStuSlotAmount('');
    setNewStuIsAddingSlot(false);
    triggerToast(`Fee section slot "${newSlot.name}" added.`);
  };

  const handleRemoveNewStuCustomSlot = (slotId: string) => {
    setNewStuCustomSlots(prev => prev.filter(s => s.id !== slotId));
    triggerToast('Fee section slot removed.');
  };

  // Search parameters (Local Edit Buffer state)
  const [searchAdmNo, setSearchAdmNo] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isStuOtpModalOpen, setIsStuOtpModalOpen] = useState(false);
  const [, setStuOtpInput] = useState('');

  // Fee collection parameters
  const [feeCollectAdm, setFeeCollectAdm] = useState('');
  const [collectAmount, setCollectAmount] = useState('');
  const [collectInstallment, setCollectInstallment] = useState('Installment 1');
  const [collectCategory, setCollectCategory] = useState('Tuition Fee');
  const [collectMode, setCollectMode] = useState('UPI / NetBanking');
  const [collectTransactionRef, setCollectTransactionRef] = useState('');
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  // Year upgrade. Eligibility always comes from the server — the balance held
  // in this component can be minutes old, and deciding here would put the rule
  // in two places.
  const [upgradeInfo, setUpgradeInfo] = useState<accountantService.UpgradeEligibility | null>(null);
  const [isCheckingUpgrade, setIsCheckingUpgrade] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeFees, setUpgradeFees] = useState<any>(null);
  const [isPayOtpModalOpen, setIsPayOtpModalOpen] = useState(false);
  const [, setPayOtpInput] = useState('');
  const [pendingPayType, setPendingPayType] = useState<'partial' | 'full' | 'collect'>('collect');

  // Custom Fee Slot Management State

  const getActiveFeeSlots = React.useCallback((stu: any) => {
    if (!stu) return [];
    const baseSlots: Array<{ id: string; name: string; amount: number; isDefault?: boolean }> = [];
    if (stu.tuitionFee) baseSlots.push({ id: 'tuitionFee', name: 'Tuition Fee', amount: Number(stu.tuitionFee) || 0, isDefault: true });
    if (stu.hostelFee) baseSlots.push({ id: 'hostelFee', name: 'Hostel Fee', amount: Number(stu.hostelFee) || 0, isDefault: true });
    if (stu.booksFee) baseSlots.push({ id: 'booksFee', name: 'Books Fee', amount: Number(stu.booksFee) || 0, isDefault: true });
    if (stu.uniformFees) baseSlots.push({ id: 'uniformFees', name: 'Uniform Fees', amount: Number(stu.uniformFees) || 0, isDefault: true });
    if (stu.hndFees) baseSlots.push({ id: 'hndFees', name: 'HND Fees', amount: Number(stu.hndFees) || 0, isDefault: true });
    if (stu.internalExamFees) baseSlots.push({ id: 'internalExamFees', name: 'Internal Exam', amount: Number(stu.internalExamFees) || 0, isDefault: true });
    if (stu.annualExamFees) baseSlots.push({ id: 'annualExamFees', name: 'Annual Exam', amount: Number(stu.annualExamFees) || 0, isDefault: true });
    if (stu.partyFees) baseSlots.push({ id: 'partyFees', name: 'Party Fees', amount: Number(stu.partyFees) || 0, isDefault: true });
    if (stu.busFees) baseSlots.push({ id: 'busFees', name: 'Bus Fees', amount: Number(stu.busFees) || 0, isDefault: true });
    if (stu.labFees) baseSlots.push({ id: 'labFees', name: 'Lab Fees', amount: Number(stu.labFees) || 0, isDefault: true });
    if (stu.handLoan) baseSlots.push({ id: 'handLoan', name: 'Hand Loan', amount: Number(stu.handLoan) || 0, isDefault: true });
    if (stu.miscellaneousFee) baseSlots.push({ id: 'miscellaneousFee', name: 'Miscellaneous Fee', amount: Number(stu.miscellaneousFee) || 0, isDefault: true });
    if (stu.othersFee) baseSlots.push({ id: 'othersFee', name: 'Others Fee', amount: Number(stu.othersFee) || 0, isDefault: true });
    if (stu.previousPending) baseSlots.push({ id: 'previousPending', name: 'Previous Pending', amount: Number(stu.previousPending) || 0, isDefault: true });

    const custom = (stu.customFeeSlots || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      amount: Number(c.amount) || 0,
      isDefault: false
    }));

    return [...baseSlots, ...custom];
  }, []);



  // Settings & Rules parameters
  const [settings] = useState({
    academicYear: '2026-27',
    installments: '3 Installments',
    lateFeeRules: '',
    scholarshipRules: '',
    discountRules: 'Sibling: 10% waiver'
  });
  const [, setDashboardSummary] = useState({
    collectionToday: 0,
    pendingCount: 0,
    pendingAmount: 0,
    absentCount: 0
  });


  const fetchDashboardSummary = React.useCallback(async () => {
    try {
      const summary = await accountantService.getDashboardSummary();
      setDashboardSummary(summary);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    }
  }, []);

  const fetchAllStudents = React.useCallback(async () => {
    try {
      // No campus filter. Students are ONE registry across all four campuses:
      // a student who moved, or was registered at the wrong campus, or is
      // simply standing at this counter today, has to be findable here.
      // Hunting for the campus that happens to hold the record is not a
      // safeguard, it is an obstacle to collecting the fee.
      //
      // A clerk borrowing this screen is still pinned to its own campus —
      // the server decides that from the account, not from this call.
      const list = await accountantService.searchStudents('');
      setStudents(list as any);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, []);


  const refreshWithPulse = React.useCallback(async (pulseKey: typeof livePulseKey) => {
    setLivePulseKey(pulseKey);
    try {
      const tasks: Promise<void>[] = [];
      if (pulseKey === 'students' || pulseKey === 'fees') {
        tasks.push(fetchDashboardSummary(), fetchAllStudents());
      }
      if (pulseKey === 'settings') {
        tasks.push(fetchDashboardSummary());
      }
      if (tasks.length === 0) {
        tasks.push(fetchDashboardSummary(), fetchAllStudents());
      }
      await Promise.all(tasks);
    } catch (err) {
      console.error('Accountant live refresh error:', err);
    } finally {
      window.setTimeout(() => setLivePulseKey(null), 1400);
    }
  }, [fetchAllStudents, fetchDashboardSummary]);

  // On mount load dashboard metrics & student list
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchDashboardSummary(),
        fetchAllStudents()
      ]);
      setIsLoading(false);
    };
    loadInitialData();
  }, [fetchDashboardSummary, fetchAllStudents]);

  // Smart polling: checks timestamp first, only refetches full data if something changed.
  // Pauses when tab is hidden, resumes + immediately checks on tab focus/visibility.
  const accountantRefetch = React.useCallback(async () => {
    await Promise.all([fetchDashboardSummary(), fetchAllStudents()]);
  }, [fetchDashboardSummary, fetchAllStudents]);

  const { triggerRefetch: triggerFreshnessRefetch } = useDataFreshness(loggedInCampus, accountantRefetch);

  useEffect(() => {
    // Keep storage/custom-event sync for same-browser-tab coordination
    const handleSync = () => refreshWithPulse('students');
    window.addEventListener('storage', handleSync);
    window.addEventListener('jc_sync_data', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('jc_sync_data', handleSync);
    };
  }, [refreshWithPulse]);

  // On subpage navigation load page specific data
  useEffect(() => {
    const loadSubPage = async () => {
      setIsPageLoading(true);
      try {
        if (activeSubPage === 'menu') {
          await Promise.all([fetchDashboardSummary(), fetchAllStudents()]);
        } else if (activeSubPage === 'student_search' || activeSubPage === 'fee_collection' || activeSubPage === 'reports') {
          await fetchAllStudents();
        }
      } finally {
        setIsPageLoading(false);
      }
    };
    loadSubPage();
  }, [activeSubPage, fetchDashboardSummary, fetchAllStudents]);




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

  // --- Year upgrade -------------------------------------------------------

  // Ask the server whether this student can move up, and open the form with
  // the current year's fees prefilled so they can be adjusted rather than
  // retyped.
  const openUpgradeDialog = async (student: Student) => {
    setIsCheckingUpgrade(true);
    try {
      const info = await accountantService.getUpgradeEligibility(student.studentId || student.admissionNumber);
      setUpgradeInfo(info);
      if (!info.eligible) {
        triggerToast(info.reason, 'error');
        return;
      }
      const f = info.currentFees;
      setUpgradeFees({
        // No waiver keys: this screen cannot set them, and sending them —
        // even as zeros — would imply it could.
        tuitionFee: f.tuitionFee, hostelFee: f.hostelFee,
        transportFee: f.transportFee, miscellaneousFee: f.miscellaneousFee,
        customFeeSlots: (f.customFeeSlots || []).map(s => ({ name: s.name, amount: s.amount }))
      });
      setActiveOverlay('upgrade_year');
    } catch (err: any) {
      triggerToast(err?.message || 'Could not check upgrade eligibility.', 'error');
    } finally {
      setIsCheckingUpgrade(false);
    }
  };

  // Gross IS payable here. Waivers are the Rector's and are applied after the
  // upgrade, so this screen has nothing that reduces the total.
  const upgradeTotals = React.useMemo(() => {
    if (!upgradeFees) return { gross: 0, payable: 0 };
    const slots = (upgradeFees.customFeeSlots || []).reduce((a: number, s: any) => a + (Number(s.amount) || 0), 0);
    const gross = Number(upgradeFees.tuitionFee || 0) + Number(upgradeFees.hostelFee || 0)
      + Number(upgradeFees.transportFee || 0) + Number(upgradeFees.miscellaneousFee || 0) + slots;
    return { gross, payable: gross };
  }, [upgradeFees]);

  const handleConfirmUpgrade = async () => {
    if (!selectedStudent || !upgradeFees) return;
    const confirmed = window.confirm(
      `Move ${selectedStudent.name} to Second Year?\n\n` +
      `New fees payable: Rs.${upgradeTotals.payable.toLocaleString('en-IN')}\n\n` +
      'First-year records are kept and stay visible in the history. ' +
      'This cannot be undone.'
    );
    if (!confirmed) return;

    setIsUpgrading(true);
    try {
      const updated = await accountantService.upgradeStudentYear(
        selectedStudent.studentId || selectedStudent.admissionNumber,
        upgradeFees
      );
      setSelectedStudent(updated as any);
      setEditStudent(updated as any);
      setActiveOverlay(null);
      setUpgradeInfo(null);
      setUpgradeFees(null);
      triggerToast(`${selectedStudent.name} is now in Second Year. New balance Rs.${upgradeTotals.payable.toLocaleString('en-IN')}.`, 'success');
      await triggerFreshnessRefetch();
    } catch (err: any) {
      // 409 means the server re-checked and disagreed — usually because a
      // payment was reversed after this screen was opened.
      triggerToast(err?.data?.message || err?.message || 'The upgrade failed. Nothing was changed.', 'error');
    } finally {
      setIsUpgrading(false);
    }
  };


  const submitStudentRegistrationWithOtp = async () => {
    setIsSubmittingStudent(true);
    /* security PIN is collected by apiClient on demand */
    await handleCreateStudent();
    setIsRegStuOtpModalOpen(false);
    setRegStuOtpInput('');
    setIsSubmittingStudent(false);
  };

  const handleCreateStudent = async () => {
    setIsLoading(true);
    try {
      const created = await accountantService.createStudent({
        ...newStudentData,
        customFeeSlots: newStuCustomSlots,
        branch: loggedInCampus,
        studentId: newStudentData.admissionNumber,
        rollNumber: newStudentData.admissionNumber,
        registrationNumber: newStudentData.admissionNumber
      });
      triggerToast(`Student ${created.name} (${created.admissionNumber}) registered successfully!`);
      setIsAddStudentModalOpen(false);
      resetNewStudentForm();
      // Refetch from server immediately so local state matches true DB state
      await triggerFreshnessRefetch();
    } catch (err: any) {
      if (err?.status === 409) setNewStudentAdmissionError(err.message);
      triggerToast(err.message || 'Failed to create student.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudentConfirm = async () => {
    if (!studentToDelete) return;
    const targetId = studentToDelete._id || studentToDelete.studentId || studentToDelete.admissionNumber;
    setIsLoading(true);
    try {
      /* security PIN is collected by apiClient on demand */
      await accountantService.deleteStudent(targetId, undefined);
      setStudents(prev => prev.filter(s =>
        s._id !== targetId &&
        s.studentId !== targetId &&
        s.admissionNumber !== targetId &&
        s._id !== studentToDelete._id &&
        s.studentId !== studentToDelete.studentId &&
        s.admissionNumber !== studentToDelete.admissionNumber
      ));
      triggerToast(`Student ${studentToDelete.name} permanently deleted from database.`);
      setIsDeleteConfirmModalOpen(false);
      setStudentToDelete(null);
      setDeleteOtpInput('');
      if (selectedStudent && (selectedStudent._id === targetId || selectedStudent.studentId === targetId || selectedStudent.admissionNumber === targetId)) {
        setIsStudentModalOpen(false);
        setSelectedStudent(null);
        setEditStudent(null);
      }
      await triggerFreshnessRefetch();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete student.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSave = async (updated: Student, otp?: string) => {
    if (!updated._id) return;
    setIsLoading(true);
    try {
      const res = await accountantService.updateStudent(updated._id, updated, otp);
      setSelectedStudent(res as any);
      setEditStudent({ ...res } as any);
      triggerToast('Student profile details & fee structure updated in database.');
      setIsStudentModalOpen(false);
      setIsStuOtpModalOpen(false);
      setStuOtpInput('');
      // Refetch from server immediately after update
      await triggerFreshnessRefetch();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save changes.');
    } finally {
      setIsLoading(false);
    }
  };

  const openStudentEditor = async (student: Student) => {
    const identifier = student._id || student.studentId || student.admissionNumber;
    setIsLoading(true);
    try {
      const fullProfile = await accountantService.getStudentProfile(identifier);
      setSelectedStudent(fullProfile as any);
      setEditStudent({ ...fullProfile } as any);
      setIsStuOtpModalOpen(false);
      setIsStudentModalOpen(true);
      setActiveOverlay(null);
    } catch {
      setSelectedStudent(student);
      setEditStudent({ ...student } as any);
      setIsStuOtpModalOpen(false);
      setIsStudentModalOpen(true);
      setActiveOverlay(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if ((window as any).logoutUser) {
      (window as any).logoutUser();
    }
  };

  const handleFeePayment = async (type: 'partial' | 'full' | 'collect', otp?: string) => {
    if (!selectedStudent || !selectedStudent._id) return;
    let paymentAmount = 0;

    if (type === 'full') {
      paymentAmount = selectedStudent.remainingBalance;
    } else if (type === 'partial') {
      paymentAmount = Math.floor(selectedStudent.remainingBalance / 2);
    } else {
      paymentAmount = parseFloat(collectAmount);
    }

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      triggerToast('Invalid payment amount.');
      return;
    }

    if (paymentAmount > selectedStudent.remainingBalance) {
      triggerToast('Amount exceeds remaining fee balance.');
      return;
    }

    setIsProcessingUpload(true);
    try {
      const res = await accountantService.recordPayment(selectedStudent._id, {
        amount: paymentAmount,
        installment: collectInstallment,
        mode: collectMode,
        category: collectCategory,
        date: collectDate,
        transactionRef: collectTransactionRef
      }, otp || securityKey);

      // Money figures come from the server or not at all.
      //
      // This used to fall back to a locally-computed balance
      // (selectedStudent.remainingBalance - paymentAmount) whenever the
      // response lacked the field. That silently displayed a figure the
      // database did not hold — and it would be wrong for any payment the
      // server had adjusted, deduplicated, or rejected part of. If the server
      // did not send a student back, we refetch instead of inventing one.
      if (!res.student || typeof res.student.remainingBalance !== 'number') {
        triggerToast('Payment recorded. Refreshing balances from the server...');
        await triggerFreshnessRefetch();
        setCollectAmount('');
        setCollectTransactionRef('');
        setIsPayOtpModalOpen(false);
        setPayOtpInput('');
        return;
      }

      const updatedStudent = { ...selectedStudent, ...res.student };
      setSelectedStudent(updatedStudent as any);
      setEditStudent(updatedStudent as any);
      setCollectAmount('');
      setCollectTransactionRef('');
      triggerToast(`Payment logged: Rs.${paymentAmount.toLocaleString('en-IN')}`);
      setIsPayOtpModalOpen(false);
      setPayOtpInput('');

      /**
       * Show the receipt and open WhatsApp, both without being asked.
       *
       * Taking the money, producing the receipt and telling the parent are one
       * action at the counter, so they happen together rather than leaving the
       * clerk to remember a second button after every payment.
       *
       * The balance comes from the SERVER's updated student, not from
       * subtracting locally — the same rule the block above enforces for the
       * figures on screen. A receipt is a statement about what the database
       * holds.
       */
      const receipt: Receipt = {
        receiptNumber: res.payment?.receiptNumber || '',
        date: res.payment?.date || collectDate,
        category: res.payment?.category || collectCategory,
        installment: res.payment?.installment || collectInstallment,
        amount: Number(res.payment?.amount ?? paymentAmount),
        balance: Number(updatedStudent.remainingBalance || 0),
        mode: (res.payment as any)?.mode || collectMode,
        cashier: (res.payment as any)?.cashier || '',
        receiptToken: (res.payment as any)?.receiptToken || ''
      } as Receipt & { receiptToken?: string };
      setSelectedReceipt(receipt);
      setActiveOverlay('receipt_view');

      // Deliberately does NOT send anything here. Taking the payment and
      // choosing how the parent gets the receipt are separate decisions —
      // some want it printed, some want it on the phone — so the receipt is
      // shown and the clerk picks Print or Share Digital.
      // Refetch full list and dashboard from server immediately after payment
      await triggerFreshnessRefetch();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to submit payment.');
    } finally {
      setIsProcessingUpload(false);
    }
  };




  /**
   * The receipt, written out as a WhatsApp message.
   *
   * Kept as its own function, separate from sending, for two reasons: it is
   * the thing most likely to be reworded, and if the college later adds the
   * Cloud API bot the same text is reused rather than written twice and left
   * to drift.
   *
   * WhatsApp renders *asterisks* as bold. There is no table support, so the
   * layout is carried by short lines and a rule — anything cleverer collapses
   * on a narrow phone.
   */
  const buildReceiptMessage = (receipt: Receipt, student: Student): string => {
    const money = (n: any) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
    const balance = Number(receipt?.balance || 0);

    // Dates are stored in several shapes across this app. Print what we were
    // given rather than risk "Invalid Date" on a parent's receipt.
    const parsed = new Date(receipt?.date as any);
    const when = isNaN(parsed.getTime())
      ? String(receipt?.date || '')
      : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const lines = [
      '*INSPIRE JUNIOR COLLEGE*',
      'Fee Payment Acknowledgement',
      '',
      'Dear Parent,',
      'We have received the following payment. Thank you.',
      '',
      `*Student:* ${student?.name || '—'}`,
      `*Admission No:* ${student?.admissionNumber || student?.studentId || '—'}`,
    ];

    if (student?.branch) lines.push(`*Campus:* ${student.branch}`);
    if ((student as any)?.course) {
      const stream = [(student as any).course, (student as any).section].filter(Boolean).join(' - ');
      lines.push(`*Course:* ${stream}`);
    }

    lines.push(
      '',
      '━━━━━━━━━━━━━━━━━━',
      `*Amount Paid:* ${money(receipt?.amount)}`,
    );

    // Only state what we actually know. A line reading "Towards: undefined"
    // on a parent's receipt is worse than no line at all.
    const towards = [receipt?.category, receipt?.installment].filter(Boolean).join(' · ');
    if (towards) lines.push(`*Towards:* ${towards}`);
    if (receipt?.mode) lines.push(`*Paid by:* ${receipt.mode}`);

    lines.push(
      '━━━━━━━━━━━━━━━━━━',
      '',
      balance > 0
        ? `*Balance Remaining:* ${money(balance)}`
        : '*Balance Remaining:* Nil — fees fully cleared',
      '',
      `*Receipt No:* ${receipt?.receiptNumber || '—'}`,
      `*Date:* ${when}`
    );

    // The document itself, behind a signed link.
    //
    // A wa.me message cannot carry a file — only text — so the receipt is
    // served as a page the parent opens and saves as PDF. The token is an
    // HMAC produced by the server; without it the URL cannot be guessed by
    // walking receipt numbers.
    const token = (receipt as any)?.receiptToken;
    if (token && receipt?.receiptNumber) {
      lines.push(
        '',
        'View / download your receipt:',
        `${window.location.origin}/r/${encodeURIComponent(receipt.receiptNumber)}/${token}`,
        '',
        '_To open it, enter the last 4 digits of your registered mobile number._'
      );
    }

    lines.push(
      '',
      '_This is a computer-generated acknowledgement._',
      '_For any query, please contact the college office._'
    );

    return lines.join('\n');
  };

  /**
   * Open WhatsApp with the receipt already written, addressed to the parent.
   *
   * Deliberately a wa.me link and not an API. It costs nothing, needs no
   * account, no token and no approval, and cannot get the college's number
   * banned — the message is sent by a person from the college's own WhatsApp.
   *
   * On a counter PC this requires WhatsApp Web to be linked once (phone →
   * Settings → Linked devices). Without that link the tab will show the QR
   * screen instead, which is why the toast says so rather than leaving
   * someone staring at it.
   *
   * The parent's number is preferred over the student's: the parent is who
   * paid and who asks what is left.
   */
  /**
   * The whole digital hand-over: the receipt as a WhatsApp message, and the
   * printable version opened so it can be saved and attached.
   *
   * A wa.me link CANNOT carry a file — it pre-fills text and nothing else.
   * So the text goes on its own, and the PDF opens alongside for the clerk to
   * attach if the parent wants the document rather than the summary. The
   * toast says exactly that, because a button called "share digital" that
   * quietly sent only half of it would be worse than one that explains.
   */
  const shareReceiptDigitally = (receipt: Receipt, student: Student) => {
    const sent = sendReceiptOnWhatsApp(receipt, student);
    if (!sent) return;   // no number, or pop-up blocked — already reported

    // Opened second so WhatsApp is the window in front.
    handleDownloadPDF(receipt, student);
  };

  const sendReceiptOnWhatsApp = (receipt: Receipt, student: Student): boolean => {
    const raw = String((student as any)?.parentMobile || student?.mobile || '').replace(/\D/g, '');

    if (raw.length < 10) {
      triggerToast(
        `No mobile number saved for ${student?.name || 'this student'}. Add a parent or student mobile on their record first.`,
        'error'
      );
      return false;
    }

    // wa.me wants the country code and no plus. Ten digits is a bare Indian
    // number; anything longer already carries its own code.
    const to = raw.length === 10 ? `91${raw}` : raw;

    // encodeURIComponent rather than a template in the URL: a student name
    // containing & or # would otherwise truncate the message silently.
    const url = `https://wa.me/${to}?text=${encodeURIComponent(buildReceiptMessage(receipt, student))}`;

    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      triggerToast('Allow pop-ups for this site so WhatsApp can open.', 'error');
      return false;
    }

    triggerToast(
      `WhatsApp opened for ${student?.name || 'the parent'} — press send. `
      + 'The printable receipt has also opened: save it as PDF and attach it if they want the document.'
    );
    return true;
  };

  /**
   * The receipt, as a printable document.
   *
   * Built from the same blocks and in the same order as the fee statement —
   * letterhead, detail grid, itemised table, summary tiles, footer — because a
   * parent holding both should see one college, not two. The previous version
   * printed two half-A4 copies with a cut line between them, at 9.5px, and
   * looked like a till slip beside the statement.
   */
  const handleDownloadPDF = (receipt: Receipt, student: Student) => {
    const receiptWords = numberToReceiptWords(receipt.amount);
    const paidToDate = Number(student.totalPaid || 0);
    const outstanding = Number(receipt.balance ?? student.remainingBalance ?? 0);

    const body = [
      pdfHeader({
        logoSrc: collegeLogo,
        title: 'Fee Receipt',
        subtitle: `Official payment receipt · ${receipt.receiptNumber}`,
        campus: student.branch || loggedInCampus
      }),

      // Roll number deliberately absent. The admission number is the
      // identifier the college and the parent both use, and printing two
      // near-identical numbers on a receipt invites quoting the wrong one.
      pdfDetailCard([
        ['Student Name', student.name],
        ['Admission No.', student.admissionNumber || student.studentId],
        ['Course / Section', `${student.course || 'N/A'} — ${student.section || 'N/A'}`],
        ['Contact Mobile', student.mobile],
        ['Academic Year', student.academicYear],
        ['Year', (student as any).studentYear],
        ['Receipt Date', dateStr(receipt.date)],
        ['Payment Mode', receipt.mode]
      ]),

      pdfSection('Payment Received'),
      pdfTable({
        headers: ['Particulars', 'Mode', 'Reference', 'Amount'],
        numeric: [3],
        rows: [[
          escapeHtml(`${receipt.category || 'Tuition'} — ${receipt.installment || 'Installment'}`),
          escapeHtml(receipt.mode || 'Cash'),
          escapeHtml(receipt.transactionRef || (receipt as any).referenceNo || receipt.receiptNumber),
          money(receipt.amount)
        ]],
        footer: ['Amount Received', '', '', money(receipt.amount)]
      }),

      // In words, because a figure alone can be altered on a printed page and
      // this is the line a parent is told to check.
      pdfTable({
        headers: ['Amount in Words', ''],
        rows: [[`<span class="pdf-strong">${escapeHtml(receiptWords)}</span>`, '']]
      }),

      pdfTiles([
        { label: 'Amount Paid Now', value: money(receipt.amount), tone: 'good' },
        { label: 'Total Paid to Date', value: money(paidToDate), tone: 'good' },
        {
          label: outstanding > 0 ? 'Balance Remaining' : 'Fully Cleared',
          value: money(outstanding),
          tone: outstanding > 0 ? 'due' : 'good'
        }
      ]),

      pdfFooter({
        note: 'Computer-generated official receipt, verified against the Inspire College ERP records. Valid without a stamp.',
        signatory: 'Authorised Signatory'
      })
    ].join('');

    const opened = openPrintDocument({
      title: `Fee Receipt - ${receipt.receiptNumber}`,
      body,
      buttonLabel: 'Print / Save Receipt as PDF',
      framed: true,
      // Authored at full size and scaled onto half an A4 sheet, cut across the
      // short edge. The document is the statement's, the paper is the
      // college's — the fitter reconciles the two.
      halfA4: true,
      onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to print the receipt.')
    });
    if (opened) triggerToast('Receipt opened for printing.');
  };

  const handleDownloadStudentStatement = (student: Student) => {
    // Fee components, dropping anything that is zero — a statement listing a
    // dozen "Rs. 0" lines buries the ones that matter.
    const customSlots: Array<[string, number]> = ((student as any).customFeeSlots || [])
      .map((s: any) => [s.name, Number(s.amount || 0)] as [string, number]);

    const feeRows: Array<[string, number]> = ([
      ['Tuition Fee', Number(student.tuitionFee || 0)],
      ['Hostel Fee', Number(student.hostelFee || 0)],
      ['Transport Fee', Number(student.transportFee || 0)],
      ['Miscellaneous Fee', Number(student.miscellaneousFee || 0)],
      ['Previous Pending', Number(student.previousPending || 0)],
      ['Books Fee', Number((student as any).booksFee || 0)],
      ['Uniform Fee', Number((student as any).uniformFees || 0)],
      ['Internal Exam Fee', Number((student as any).internalExamFees || 0)],
      ['Annual Exam Fee', Number((student as any).annualExamFees || 0)],
      ['Lab Fee', Number((student as any).labFees || 0)],
      ['Bus Fee', Number((student as any).busFees || 0)],
      ...customSlots
    ] as Array<[string, number]>).filter(([, amount]) => amount > 0);

    const waiverRows: Array<[string, number]> = ([
      ['Tuition Waiver', Number((student as any).tuitionWaiver || 0)],
      ['Hostel Waiver', Number((student as any).hostelWaiver || 0)],
      ['Transport Waiver', Number((student as any).transportWaiver || 0)],
      ['Miscellaneous Waiver', Number((student as any).miscWaiver || 0)]
    ] as Array<[string, number]>).filter(([, amount]) => amount > 0);

    const totalBaseFee = feeRows.reduce((t, [, a]) => t + a, 0);
    const totalWaiver = waiverRows.reduce((t, [, a]) => t + a, 0);
    const totalPaid = Number(student.totalPaid || 0);
    const remaining = Number(student.remainingBalance ?? Math.max(0, totalBaseFee - totalWaiver - totalPaid));

    const receipts = [...(student.receipts || [])]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Years already closed. Their receipts live in the archive, not in the
    // live list, so a second-year student would otherwise appear to have paid
    // nothing in their first year.
    const history = student.yearHistory || [];

    const body = [
      pdfHeader({
        logoSrc: collegeLogo,
        title: 'Fee Statement',
        subtitle: `Complete financial statement${student.studentYear ? ` · ${student.studentYear}` : ''}`,
        campus: student.branch || loggedInCampus
      }),

      pdfDetailCard([
        ['Student Name', student.name],
        ['Admission No.', student.admissionNumber || student.studentId],
        ['Course / Section', `${student.course || 'N/A'} — ${student.section || 'N/A'}`],
        ["Father's Name", student.fatherName],
        ['Contact Mobile', student.mobile],
        ['Academic Year', student.academicYear],
        ['Year', student.studentYear],
        ['Hostel Status', student.hostelStatus],
      ]),

      pdfSection('Fee Structure and Applied Waivers'),
      pdfTable({
        headers: ['Particulars', 'Amount'],
        numeric: [1],
        rows: [
          ...feeRows.map(([label, amount]) => [escapeHtml(label), money(amount)]),
          ...waiverRows.map(([label, amount]) => [
            `<span class="pdf-strong">${escapeHtml(label)}</span>`,
            `<span class="pdf-strong">- ${money(amount)}</span>`
          ])
        ],
        footer: ['Net Payable', money(Math.max(0, totalBaseFee - totalWaiver))],
        emptyMessage: 'No fee components recorded.'
      }),

      pdfTiles([
        { label: 'Gross Fee', value: money(totalBaseFee) },
        { label: 'Waivers', value: `- ${money(totalWaiver)}`, tone: 'good' },
        { label: 'Total Paid', value: money(totalPaid), tone: 'good' },
        {
          label: remaining > 0 ? 'Outstanding' : 'Fully Cleared',
          value: money(remaining),
          tone: remaining > 0 ? 'due' : 'good'
        }
      ]),

      pdfSection('Receipt and Payment History'),
      pdfTable({
        headers: ['Receipt No.', 'Date', 'Category / Installment', 'Mode', 'Amount Paid', 'Balance After'],
        numeric: [4, 5],
        rows: receipts.map(r => [
          `<strong>${escapeHtml(r.receiptNumber)}</strong>`,
          dateStr(r.date),
          `${escapeHtml(r.category || 'Tuition')} &middot; ${escapeHtml(r.installment || 'Installment')}`,
          escapeHtml(r.mode || 'Cash'),
          `<span class="pdf-strong">${money(r.amount)}</span>`,
          money(r.balance)
        ]),
        footer: ['', '', '', 'Total Paid', money(totalPaid), ''],
        emptyMessage: 'No payments recorded for this academic year.'
      }),

      history.length ? pdfSection('Completed Academic Years') : '',
      history.length ? pdfTable({
        headers: ['Year', 'Academic Year', 'Payable', 'Paid', 'Closed On', 'Closed By'],
        numeric: [2, 3],
        rows: history.map(h => [
          escapeHtml(h.studentYear || '—'),
          escapeHtml(h.academicYear || '—'),
          money(h.totalPayable),
          `<span class="pdf-strong">${money(h.totalPaid)}</span>`,
          dateStr(h.closedAt),
          escapeHtml(h.closedBy || '—')
        ])
      }) : '',

      pdfFooter({
        note: 'Computer-generated official statement, verified against the Inspire College ERP records.',
        signatory: 'Authorised Signatory'
      })
    ].join('');

    const opened = openPrintDocument({
      title: `Fee Statement - ${student.admissionNumber || student.name}`,
      body,
      buttonLabel: 'Print / Save Fee Statement as PDF',
      framed: true,
      onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the statement.', 'error')
    });
    if (opened) triggerToast('Fee statement opened for printing.');
  };

  // Stats calculations

  if (isLoading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--surface-sunken)' }} className="anim-fade-in">
        <div style={{ width: '36px', height: '36px', border: '4px solid rgba(0,0,0,.1)', borderLeftColor: 'transparent', borderRadius: '50%', animation: 'spin89345 1s linear infinite' }} />
      </div>
    );
  }

  const renderModals = () => (
    <>
      {isProcessingUpload && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--surface)'
        }} className="anim-fade-in">
          <div style={{
            width: '56px',
            height: '56px',
            border: '4px solid rgba(251, 191, 36, 0.2)',
            borderTop: '4px solid var(--warning)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '20px'
          }} />
          <h3 style={{ margin: 0, fontSize: '1.2857rem', fontWeight: 900, color: 'var(--warning)', letterSpacing: '0.04em' }}>
            Processing & Uploading...
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '0.8571rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
            Please wait while your request is being saved to the database.
          </p>
        </div>
      )}

      {/* STUDENT PROFILE & FEE EDITOR MODAL */}
      {isStudentModalOpen && selectedStudent && editStudent && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={{ ...styles.overlaySheet, maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
              <div>
                <h3 style={styles.modalTitle}>Student Profile & Complete Fee Structure Editor</h3>
                <p style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', margin: 0 }}>
                  Campus: <strong>{loggedInCampus}</strong> (Locked) | Adm No: <strong>{selectedStudent.admissionNumber || 'N/A'}</strong>
                </p>
              </div>
              <button
                onClick={() => { setIsStudentModalOpen(false); setSelectedStudent(null); setEditStudent(null); }}
                style={{ background: 'none', border: 'none', fontSize: '1.4286rem', cursor: 'pointer', color: 'var(--muted-gray)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary Stats Header Bar */}
              <div style={{ ...styles.readOnlyBlock, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '10px' }}>
                <div><span style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Student Name</span><strong style={{ fontSize: '0.9286rem', color: 'var(--dark-charcoal)' }}>{selectedStudent.name || 'N/A'}</strong></div>
                <div><span style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Adm Number</span><strong style={{ fontSize: '0.9286rem', color: 'var(--dark-charcoal)' }}>{selectedStudent.admissionNumber || 'N/A'}</strong></div>
                <div><span style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Campus</span><strong style={{ fontSize: '0.9286rem', color: 'var(--good)' }}>{loggedInCampus}</strong></div>
                <div><span style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Gross Total Fee</span><strong style={{ fontSize: '0.9286rem', color: 'var(--dark-charcoal)' }}>Rs.{((editStudent.tuitionFee || 0) + (editStudent.hostelFee || 0) + (editStudent.transportFee || 0) + (editStudent.miscellaneousFee || 0) + (editStudent.previousPending || 0) + ((editStudent.customFeeSlots || []).reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0))).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total Paid</span><strong style={{ fontSize: '0.9286rem', color: 'var(--good)' }}>Rs.{(selectedStudent.totalPaid || 0).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Remaining Balance</span><strong style={{ fontSize: '0.9286rem', color: selectedStudent.remainingBalance > 0 ? 'var(--critical)' : 'var(--good)' }}>Rs.{(selectedStudent.remainingBalance || 0).toLocaleString('en-IN')}</strong></div>
              </div>

              {/* Section 1: Personal & Academic Details */}
              <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8571rem', fontWeight: 800, color: 'var(--dark-charcoal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                   Profile & Personal Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Student Name</label>
                    <input maxLength={LIMITS.personName} type="text" value={editStudent.name || ''} onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Admission Number</label>
                    <input maxLength={LIMITS.admissionNumber} type="text" value={editStudent.admissionNumber || ''} onChange={(e) => setEditStudent({ ...editStudent, admissionNumber: e.target.value })} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Student Mobile</label>
                    <input maxLength={LIMITS.mobile} type="text" value={editStudent.mobile || ''} onChange={(e) => setEditStudent({ ...editStudent, mobile: e.target.value })} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Parent Contact</label>
                    <input maxLength={LIMITS.mobile} type="text" value={editStudent.parentMobile || ''} onChange={(e) => setEditStudent({ ...editStudent, parentMobile: e.target.value })} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Course</label>
                    <input maxLength={LIMITS.course} type="text" value={editStudent.course || ''} onChange={(e) => setEditStudent({ ...editStudent, course: e.target.value })} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Section</label>
                    <input maxLength={LIMITS.section} type="text" value={editStudent.section || ''} onChange={(e) => setEditStudent({ ...editStudent, section: e.target.value })} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Father Name</label>
                    <input maxLength={LIMITS.personName} type="text" value={editStudent.fatherName || ''} onChange={(e) => setEditStudent({ ...editStudent, fatherName: e.target.value })} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Mother Name</label>
                    <input maxLength={LIMITS.personName} type="text" value={editStudent.motherName || ''} onChange={(e) => setEditStudent({ ...editStudent, motherName: e.target.value })} style={styles.textInputBox} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Hostel Status</label>
                    <select value={editStudent.hostelStatus || 'Day Scholar'} onChange={(e) => setEditStudent({ ...editStudent, hostelStatus: e.target.value as any })} style={styles.selectInput}>
                      <option value="Day Scholar">Day Scholar</option>
                      <option value="Resident">Resident</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Transport Status</label>
                    <select value={editStudent.transportStatus || 'Self Transport'} onChange={(e) => setEditStudent({ ...editStudent, transportStatus: e.target.value as any })} style={styles.selectInput}>
                      <option value="Self Transport">Self Transport</option>
                      <option value="College Bus">College Bus</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => handleStudentSave(editStudent, undefined)}
                  style={{ ...styles.saveSubmitBtn, flex: 2, marginTop: 0, backgroundColor: 'var(--good)', color: '#fff', fontWeight: 800 }}
                  className="press-interactive"
                >
                  Save & Update Student Profile
                </button>
                <button
                  onClick={() => { setStudentToDelete(editStudent); setIsDeleteConfirmModalOpen(true); }}
                  style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'var(--critical)', color: '#fff', border: 'none' }}
                  className="press-interactive"
                >
                  ️ Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT EDIT CONFIRMATION MODAL */}
      {isStuOtpModalOpen && editStudent && (
        <div style={{ ...styles.overlayOverlay, zIndex: 1400 }} className="anim-fade-in">
          <div style={{ ...styles.overlaySheet, maxWidth: '420px', borderTop: '4px solid var(--royal-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ ...styles.modalTitle, color: 'var(--warning)' }}>Confirm Save Changes</h3>
              <button onClick={() => setIsStuOtpModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2857rem', cursor: 'pointer', color: 'var(--muted-gray)' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.9286rem', color: 'var(--dark-charcoal)', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
              Are you sure you want to update student details for <strong>{editStudent.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsStuOtpModalOpen(false)} style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }} className="press-interactive">
                Cancel
              </button>
              <button
                onClick={() => handleStudentSave(editStudent, undefined)}
                style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 800 }}
                className="press-interactive"
              >
                Yes, Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW STUDENT MODAL OVERLAY */}
      {isAddStudentModalOpen && (
        <div style={{ ...styles.overlayOverlay, zIndex: 1200 }}>
          <div style={{ ...styles.overlaySheet, maxWidth: '920px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1.5px solid var(--line)', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  INSPIRE JUNIOR COLLEGE • ACCOUNTANT STUDENT ADMISSION
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.2143rem', fontWeight: 900, color: 'var(--ink)' }}>
                  {newStuFormPage === 1 ? 'Screen 1 of 3: Basic Academic Information' : newStuFormPage === 2 ? 'Screen 2 of 3: Personal & Family Information' : 'Screen 3 of 3: Fee Structure & Bill Format'}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7857rem', fontWeight: 800, backgroundColor: newStuFormPage === 1 ? 'var(--ink)' : 'var(--line)', color: newStuFormPage === 1 ? 'var(--surface)' : 'var(--ink-secondary)' }}>1. Basic Info</span>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7857rem', fontWeight: 800, backgroundColor: newStuFormPage === 2 ? 'var(--ink)' : 'var(--line)', color: newStuFormPage === 2 ? 'var(--surface)' : 'var(--ink-secondary)' }}>2. Personal & Family</span>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7857rem', fontWeight: 800, backgroundColor: newStuFormPage === 3 ? 'var(--ink)' : 'var(--line)', color: newStuFormPage === 3 ? 'var(--surface)' : 'var(--ink-secondary)' }}>3. Fee Structure</span>
                </div>
                <button onClick={() => { setIsAddStudentModalOpen(false); resetNewStudentForm(); }} style={{ background: 'none', border: 'none', fontSize: '1.4286rem', cursor: 'pointer', color: 'var(--muted-gray)' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '10px 4px' }}>
              {newStuFormPage === 1 ? (
                <div>
                  {/* Screen 1: Basic Information */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)', paddingBottom: '4px', marginBottom: '12px' }}>
                      1. Basic Academic Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
                      <div>
                        <label style={styles.formLabel}>Admission Number *</label>
                        <input maxLength={LIMITS.admissionNumber}
                          type="text"
                          placeholder="e.g. 2400101"
                          value={newStudentData.admissionNumber}
                          onChange={(e) => { setNewStudentData({ ...newStudentData, admissionNumber: e.target.value }); setNewStudentAdmissionError(''); }}
                          style={{ ...styles.textInputBox, borderColor: newStudentAdmissionError ? 'var(--critical)' : undefined }}
                        />
                        {newStudentAdmissionError && <span style={{ color: 'var(--critical)', fontSize: '0.7857rem', fontWeight: 700 }}>{newStudentAdmissionError}</span>}
                      </div>
                      <div>
                        <label style={styles.formLabel}>Student Full Name *</label>
                        <input maxLength={LIMITS.personName}
                          type="text"
                          placeholder="e.g. Rahul Sharma"
                          value={newStudentData.name}
                          onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                          style={styles.textInputBox}
                        />
                      </div>
                      <div>
                        <label style={styles.formLabel}>Student Mobile Number *</label>
                        <input maxLength={LIMITS.mobile}
                          type="text"
                          inputMode="numeric"
                          placeholder="10-digit mobile"
                          value={newStudentData.mobile}
                          onChange={(e) => {
                            const digits = digitsOnly(e.target.value);
                            setNewStudentData({ ...newStudentData, mobile: digits });
                            setNewStudentMobileError(validateMobile(digits, 'Student mobile number') || '');
                          }}
                          style={{ ...styles.textInputBox, borderColor: newStudentMobileError ? 'var(--critical)' : undefined }}
                        />
                        {newStudentMobileError && <span style={{ color: 'var(--critical)', fontSize: '0.7857rem', fontWeight: 700 }}>{newStudentMobileError}</span>}
                      </div>
                      <div>
                        <label style={styles.formLabel}>Campus / Branch (Locked)</label>
                        <input
                          type="text"
                          value={loggedInCampus}
                          disabled
                          style={{ ...styles.textInputBox, backgroundColor: 'var(--surface-sunken)', color: 'var(--ink-secondary)', fontWeight: 800, cursor: 'not-allowed' }}
                        />
                      </div>
                      <div>
                        <label style={styles.formLabel}>Course *</label>
                        <select
                          value={newStudentData.course}
                          onChange={(e) => setNewStudentData({ ...newStudentData, course: e.target.value })}
                          style={styles.selectInput}
                        >
                          <option value="MPC">MPC (Maths, Physics, Chem)</option>
                          <option value="BiPC">BiPC (Biology, Phys, Chem)</option>
                          <option value="CEC">CEC (Civics, Econ, Commerce)</option>
                          <option value="MEC">MEC (Maths, Econ, Commerce)</option>
                          <option value="HEC">HEC (Hist, Econ, Civics)</option>
                        </select>
                      </div>
                      <div>
                        <label style={styles.formLabel}>Year *</label>
                        <select
                          value={newStudentData.studentYear}
                          onChange={(e) => setNewStudentData({ ...newStudentData, studentYear: e.target.value })}
                          style={styles.selectInput}
                        >
                          <option value="First Year">First Year</option>
                          <option value="Second Year">Second Year</option>
                          <option value="Short Term">Short Term</option>
                        </select>
                      </div>
                      <div>
                        <label style={styles.formLabel}>Section *</label>
                        <input maxLength={LIMITS.section}
                          type="text"
                          placeholder="e.g. MPC-A"
                          value={newStudentData.section}
                          onChange={(e) => setNewStudentData({ ...newStudentData, section: e.target.value })}
                          style={styles.textInputBox}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddStudentModalOpen(false)}
                      style={{ ...styles.actionItemBtn, backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', padding: '10px 20px', border: 'none' }}
                      className="press-interactive"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isCheckingAdmission || !!newStudentAdmissionError}
                      onClick={() => {
                        if (!newStudentData.name.trim() || !newStudentData.admissionNumber.trim() || !newStudentData.mobile.trim()) {
                          setNewStudentAdmissionError('Admission Number, Name, and Mobile are required.');
                          triggerToast('Please fill in Admission Number, Student Name, and Mobile Number.');
                          return;
                        }
                        // Both of these used to be left to the server, which
                        // only saw them after screen 3 — so a wrong mobile or a
                        // taken admission number failed at the end of the form
                        // with the answers already typed.
                        const mobileError = validateMobile(newStudentData.mobile, 'Student mobile number');
                        if (mobileError) {
                          setNewStudentMobileError(mobileError);
                          triggerToast(mobileError, 'error');
                          return;
                        }
                        setNewStudentMobileError('');
                        setNewStuFormPage(2);
                      }}
                      style={{
                        ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '10px 28px',
                        backgroundColor: 'var(--ink)', color: 'var(--surface)', fontWeight: 800,
                        opacity: (isCheckingAdmission || newStudentAdmissionError) ? 0.5 : 1,
                        cursor: (isCheckingAdmission || newStudentAdmissionError) ? 'not-allowed' : 'pointer'
                      }}
                      className="press-interactive"
                    >
                      {isCheckingAdmission ? 'Checking admission number…' : 'Next: Personal & Family Info (Screen 2 of 3) →'}
                    </button>
                  </div>
                </div>
              ) : newStuFormPage === 2 ? (
                <div>
                  {/* Screen 2: Personal & Family Information */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)', paddingBottom: '4px', marginBottom: '12px' }}>
                      2. Personal & Family Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
                      <div>
                        <label style={styles.formLabel}>Father's Name</label>
                        <input maxLength={LIMITS.personName} type="text" placeholder="e.g. Ramesh Sharma" value={newStudentData.fatherName} onChange={(e) => setNewStudentData({ ...newStudentData, fatherName: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div>
                        <label style={styles.formLabel}>Mother's Name</label>
                        <input maxLength={LIMITS.personName} type="text" placeholder="e.g. Sunitha Sharma" value={newStudentData.motherName} onChange={(e) => setNewStudentData({ ...newStudentData, motherName: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div>
                        <label style={styles.formLabel}>Date of Birth</label>
                        <input type="date" value={newStudentData.dob} onChange={(e) => setNewStudentData({ ...newStudentData, dob: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div>
                        <label style={styles.formLabel}>Parent Contact Mobile</label>
                        <input maxLength={LIMITS.mobile}
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 9876543210"
                          value={newStudentData.parentMobile}
                          onChange={(e) => {
                            const digits = digitsOnly(e.target.value);
                            setNewStudentData({ ...newStudentData, parentMobile: digits });
                            setNewStudentParentMobileError(validateMobile(digits, 'Parent mobile number') || '');
                          }}
                          style={{ ...styles.textInputBox, borderColor: newStudentParentMobileError ? 'var(--critical)' : undefined }}
                        />
                        {newStudentParentMobileError && <span style={{ color: 'var(--critical)', fontSize: '0.7857rem', fontWeight: 700 }}>{newStudentParentMobileError}</span>}
                      </div>
                      <div>
                        <label style={styles.formLabel}>Previous School</label>
                        <input maxLength={LIMITS.previousSchool} type="text" placeholder="e.g. ZPHS / St. Johns High School" value={newStudentData.previousSchool} onChange={(e) => setNewStudentData({ ...newStudentData, previousSchool: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div>
                        <label style={styles.formLabel}>Previous School Board</label>
                        <select value={newStudentData.previousBoard} onChange={(e) => setNewStudentData({ ...newStudentData, previousBoard: e.target.value })} style={styles.selectInput}>
                          <option value="State Board">State Board (SSC)</option>
                          <option value="CBSE">CBSE</option>
                          <option value="ICSE">ICSE</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={styles.formLabel}>Permanent Address</label>
                        <input maxLength={LIMITS.address} type="text" placeholder="H.No., Street, Village/Mandal, District" value={newStudentData.address} onChange={(e) => setNewStudentData({ ...newStudentData, address: e.target.value })} style={styles.textInputBox} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setNewStuFormPage(1)}
                      style={{ ...styles.actionItemBtn, backgroundColor: 'var(--line)', color: 'var(--ink)', padding: '10px 18px', fontWeight: 800 }}
                      className="press-interactive"
                    >
                      ← Back to Basic Info (Screen 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const parentError = validateMobile(newStudentData.parentMobile, 'Parent mobile number');
                        if (parentError) {
                          setNewStudentParentMobileError(parentError);
                          triggerToast(parentError, 'error');
                          return;
                        }
                        setNewStudentParentMobileError('');
                        setNewStuFormPage(3);
                      }}
                      style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '10px 28px', backgroundColor: 'var(--ink)', color: 'var(--surface)', fontWeight: 800 }}
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
                    background: 'var(--surface)',
                    border: '1.5px solid var(--line-strong)',
                    borderRadius: '16px',
                    padding: '18px',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--line)', paddingBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.6786rem', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          INSPIRE JUNIOR COLLEGE
                        </span>
                        <h4 style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 900, color: 'var(--ink)' }}>
                          Fee Structure & Bill Format
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.8571rem', fontWeight: 900, color: 'var(--good)', backgroundColor: 'var(--good-wash)', padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--good-wash)' }}>
                        Gross Base Fee: Rs.{(
                          (Number(newStudentData.tuitionFee) || 0) +
                          (Number(newStudentData.hostelFee) || 0) +
                          (Number(newStudentData.miscellaneousFee) || 0) +
                          newStuCustomSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
                        ).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <label style={styles.formLabel}>Tuition Fee (Rs)</label>
                        <input min={0} max={999999999} type="number" value={newStudentData.tuitionFee} onChange={(e) => setNewStudentData({ ...newStudentData, tuitionFee: Number(e.target.value) })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <label style={styles.formLabel}>Hostel Fee (Rs)</label>
                        <input min={0} max={999999999} type="number" value={newStudentData.hostelFee} onChange={(e) => setNewStudentData({ ...newStudentData, hostelFee: Number(e.target.value) })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <label style={styles.formLabel}>Misc Fee (Rs)</label>
                        <input min={0} max={999999999} type="number" value={newStudentData.miscellaneousFee} onChange={(e) => setNewStudentData({ ...newStudentData, miscellaneousFee: Number(e.target.value) })} style={styles.textInputBox} />
                      </div>

                      {newStuCustomSlots.map((slot) => (
                        <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={styles.formLabel}>
                              {slot.name} <span style={{ fontSize: '0.6429rem', color: 'var(--royal-gold)', fontWeight: 800 }}>(Custom)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveNewStuCustomSlot(slot.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--critical)', cursor: 'pointer', fontSize: '0.7857rem', padding: '0 2px' }}
                              title="Remove section slot"
                            >
                              ✕
                            </button>
                          </div>
                          <input min={0} max={999999999}
                            type="number"
                            value={slot.amount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setNewStuCustomSlots(prev => prev.map(s => s.id === slot.id ? { ...s, amount: val } : s));
                            }}
                            style={styles.textInputBox}
                          />
                        </div>
                      ))}
                    </div>

                    {newStuIsAddingSlot ? (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', padding: '10px', backgroundColor: 'var(--surface-sunken)', borderRadius: '10px', border: '1px dashed var(--line-strong)' }}>
                        <input maxLength={LIMITS.feeSlotName}
                          type="text"
                          placeholder="Fee Section Description"
                          value={newStuSlotName}
                          onChange={(e) => setNewStuSlotName(e.target.value)}
                          style={{ ...styles.textInputBox, flex: 2, fontSize: '0.8571rem' }}
                        />
                        <input min={0} max={999999999}
                          type="number"
                          placeholder="Amount (Rs)"
                          value={newStuSlotAmount}
                          onChange={(e) => setNewStuSlotAmount(e.target.value)}
                          style={{ ...styles.textInputBox, flex: 1, fontSize: '0.8571rem' }}
                        />
                        <button
                          type="button"
                          onClick={handleAddNewStuCustomSlot}
                          style={{ ...styles.actionItemBtn, backgroundColor: 'var(--good)', color: '#fff', border: 'none', padding: '6px 12px' }}
                          className="press-interactive"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNewStuIsAddingSlot(false); setNewStuSlotName(''); setNewStuSlotAmount(''); }}
                          style={{ ...styles.actionItemBtn, backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', border: 'none', padding: '6px 10px' }}
                          className="press-interactive"
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
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px dashed var(--royal-gold)',
                          backgroundColor: 'var(--surface-sunken)',
                          // See above: amber on the sunken surface is unreadable.
                          color: 'var(--royal-gold)',
                          fontSize: '0.8214rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                        className="press-interactive"
                      >
                        + Add Fee Section Slot
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setNewStuFormPage(2)}
                      style={{ ...styles.actionItemBtn, backgroundColor: 'var(--line)', color: 'var(--ink)', padding: '10px 18px', fontWeight: 800 }}
                      className="press-interactive"
                    >
                      ← Back to Personal & Family Info (Screen 2)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newStudentData.admissionNumber || !newStudentData.name || !newStudentData.mobile) {
                          setNewStudentAdmissionError('Admission Number, Student Name, and Mobile are required.');
                          triggerToast('Please fill in Admission Number, Student Name, and Mobile.');
                          setNewStuFormPage(1);
                          return;
                        }
                        // Last line of defence in the form: someone can reach
                        // screen 3 and then go back and edit an earlier field.
                        const blocker = newStudentAdmissionError
                          || validateMobile(newStudentData.mobile, 'Student mobile number')
                          || validateMobile(newStudentData.parentMobile, 'Parent mobile number');
                        if (blocker) {
                          triggerToast(blocker, 'error');
                          setNewStuFormPage(1);
                          return;
                        }
                        setIsAddStudentModalOpen(false);
                        setIsRegStuOtpModalOpen(true);
                      }}
                      style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '10px 28px', backgroundColor: 'var(--good)', color: 'var(--surface)', fontWeight: 800 }}
                      className="press-interactive"
                    >
                      Register Student
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW STUDENT — CONFIRMATION MODAL */}
      {isRegStuOtpModalOpen && (
        <div style={{ ...styles.overlayOverlay, zIndex: 1300 }} className="anim-fade-in">
          <div style={{ ...styles.overlaySheet, maxWidth: '420px', borderTop: '4px solid var(--good)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ ...styles.modalTitle, color: 'var(--good)' }}>Confirm Student Registration</h3>
              <button onClick={() => { setIsRegStuOtpModalOpen(false); setRegStuOtpInput(''); setRegStuError(''); }} style={{ background: 'none', border: 'none', fontSize: '1.2857rem', cursor: 'pointer', color: 'var(--muted-gray)' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.9286rem', color: 'var(--dark-charcoal)', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
              Are you sure you want to register student <strong>{newStudentData.name || '—'}</strong> (Admission No: <strong>{newStudentData.admissionNumber || '—'}</strong>)?
            </p>
            {regStuError && <div style={{ color: 'var(--critical)', fontSize: '0.7857rem', fontWeight: 700, marginBottom: '8px', padding: '8px 12px', background: 'rgba(220,38,38,0.05)', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.2)' }}>{regStuError}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setIsRegStuOtpModalOpen(false); setRegStuOtpInput(''); setRegStuError(''); }} style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }} className="press-interactive">
                Cancel
              </button>
              <button onClick={submitStudentRegistrationWithOtp} disabled={isSubmittingStudent} style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'var(--good)', color: '#fff', opacity: isSubmittingStudent ? 0.7 : 1 }} className="press-interactive">
                {isSubmittingStudent ? 'Registering...' : 'Yes, Confirm & Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL OVERLAY */}
      {isDeleteConfirmModalOpen && studentToDelete && (
        <div style={{ ...styles.overlayOverlay, zIndex: 1300 }}>
          <div style={{ ...styles.overlaySheet, maxWidth: '420px', borderTop: '4px solid var(--critical)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ ...styles.modalTitle, color: 'var(--critical)' }}>Confirm Permanent Deletion</h3>
              <button onClick={() => { setIsDeleteConfirmModalOpen(false); setStudentToDelete(null); setDeleteOtpInput(''); }} style={{ background: 'none', border: 'none', fontSize: '1.2857rem', cursor: 'pointer', color: 'var(--muted-gray)' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.9286rem', color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              Are you sure you want to permanently delete student <strong>{studentToDelete.name}</strong> (Adm No: <strong>{studentToDelete.admissionNumber || studentToDelete.studentId}</strong>)?
              <br /><br />
              <span style={{ color: 'var(--critical)', fontWeight: 700 }}>
                This purges the student record permanently from MongoDB and all portal databases. Cannot be undone.
              </span>
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setIsDeleteConfirmModalOpen(false); setStudentToDelete(null); setDeleteOtpInput(''); }} style={{ flex: 1, padding: '10px', border: '1px solid var(--line-strong)', backgroundColor: 'var(--surface-sunken)', color: 'var(--ink-secondary)', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteStudentConfirm} style={{ flex: 1.5, padding: '10px', border: 'none', backgroundColor: 'var(--critical)', color: 'var(--surface)', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }} className="press-interactive">Yes, Permanently Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (activeSubPage === 'student_search') {
    const filteredSearchList = students.filter((student) => matchesStudentSearch(student, searchAdmNo));

    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('emerald')}
        <header style={styles.header}>
          <button onClick={() => { setActiveSubPage('menu'); setSelectedStudent(null); setEditStudent(null); setSearchAdmNo(''); }} style={styles.backArrowBtn} className="press-interactive">
             Back to Cockpit
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: '8px' }}>
            <div>
              <h1 style={styles.title}>Student Management Console</h1>
              <p style={styles.subtitle}>Audit profiles, edit fee structures, register new students, or purge records from database</p>
            </div>
            <button
              onClick={() => {
                resetNewStudentForm();
                setIsAddStudentModalOpen(true);
              }}
              style={{
                ...styles.actionItemBtn,
                backgroundColor: 'var(--good)',
                color: 'var(--surface)',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.8571rem',
                padding: '10px 18px',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="press-interactive"
            >
              + Register New Student
            </button>
          </div>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input maxLength={100}
                  type="text"
                  placeholder="Search any student by name, admission number or phone — all campuses"
                  value={searchAdmNo}
                  onChange={(e) => setSearchAdmNo(e.target.value)}
                  style={{ ...styles.textInputBox, fontSize: '0.9286rem', padding: '12px 14px' }}
                />
              </div>
              {searchAdmNo && (
                <button
                  onClick={() => setSearchAdmNo('')}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--critical)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: '0.7857rem',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                >
                  Clear Search
                </button>
              )}
              <div style={{ fontSize: '0.8571rem', color: 'var(--muted-gray)', fontWeight: 700, padding: '0 8px' }}>
                Showing <strong>{filteredSearchList.length}</strong> Students
              </div>
            </div>

            {/* STUDENT BOXES GRID */}
            {(() => {
              // Five columns, five rows. A page that fills the screen exactly
              // is easier to scan than one that runs past the fold.
              const REGISTRY_PER_PAGE = 25;
              const totalPages = Math.max(1, Math.ceil(filteredSearchList.length / REGISTRY_PER_PAGE));
              const currentPage = Math.min(registryPage, totalPages);
              const paginated = filteredSearchList.slice((currentPage - 1) * REGISTRY_PER_PAGE, currentPage * REGISTRY_PER_PAGE);
              return (<>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '4px' }}>
                  <button onClick={() => setRegistryPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: currentPage === 1 ? 'var(--surface-sunken)' : '#fff', color: currentPage === 1 ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: currentPage === 1 ? 'default' : 'pointer' }}>
                    ←  Prev
                  </button>
                  <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>Page {currentPage} / {totalPages}</span>
                  <button onClick={() => setRegistryPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: currentPage === totalPages ? 'var(--surface-sunken)' : '#fff', color: currentPage === totalPages ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: currentPage === totalPages ? 'default' : 'pointer' }}>
                    Next ← ’
                  </button>
                </div>
              )}
            <div style={{
              display: 'grid',
              // 200px tracks give five columns on a normal desktop and fold
              // down to fewer on narrow screens without a media query.
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
              gap: '12px',
              marginTop: '8px'
            }}>
              {paginated.map(s => {
                const totalPaid = Number(s.totalPaid || 0);
                const remaining = Number(s.remainingBalance || 0);
                const totalFee = totalPaid + remaining;
                const paidPct = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : 100;
                const isResident = s.hostelStatus === 'Resident';

                return (
                  <GlassCard
                    key={s._id || s.studentId}
                    hoverable={true}
                    style={{
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      border: '1.5px solid rgba(226, 232, 240, 0.9)',
                      borderRadius: '16px',
                      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Top Row: Avatar + Name + Adm Badge */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        backgroundColor: isResident ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isResident ? 'var(--warning)' : 'var(--good)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9286rem',
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {(s.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '0.8571rem', color: 'var(--dark-charcoal)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.name}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', marginTop: '2px', fontWeight: 600 }}>
                          Adm: <span style={{ color: 'var(--ink)', fontWeight: 800 }}>{s.admissionNumber || s.studentId}</span>
                        </div>
                        <div style={{ fontSize: '0.7857rem', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                          {s.branch || loggedInCampus} ({s.course || 'MPC'}{s.section ? ` - ${s.section}` : ''})
                        </div>
                      </div>
                    </div>

                    {/* Middle Info Row: Contact & Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--surface-sunken)', padding: '10px 12px', borderRadius: '10px', fontSize: '0.7857rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-secondary)' }}>
                        <span>Student Mob: <strong>{s.mobile || 'N/A'}</strong></span>
                        <span>Parent: <strong>{s.parentMobile || 'N/A'}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '0.7143rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          color: '#1D4ED8'
                        }}>
                          {s.transportStatus || 'Self Transport'}
                        </span>
                      </div>
                    </div>

                    {/* Financial Progress Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7857rem', fontWeight: 800 }}>
                        <span style={{ color: 'var(--good)' }}>Paid: Rs.{totalPaid.toLocaleString('en-IN')}</span>
                        <span style={{ color: remaining > 0 ? 'var(--critical)' : 'var(--good)' }}>
                          Due: Rs.{remaining.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--line)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${paidPct}%`, height: '100%', backgroundColor: remaining > 0 ? 'var(--warning)' : 'var(--good)', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => void openStudentEditor(s as any)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1.5px solid var(--royal-gold)',
                          // #FAB219 on the #F5F5F4 sunken surface is a 1.68
                          // contrast ratio — the label was there but unreadable.
                          // Matches the border instead.
                          color: 'var(--royal-gold)',
                          backgroundColor: 'var(--surface-sunken)',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.7857rem',
                          cursor: 'pointer'
                        }}
                        className="press-interactive"
                      >
                        Edit Profile & Fees
                      </button>

                      <button
                        onClick={() => {
                          setStudentToDelete(s);
                          setIsDeleteConfirmModalOpen(true);
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1.5px solid rgba(239, 68, 68, 0.3)',
                          color: 'var(--critical)',
                          backgroundColor: 'rgba(254, 242, 242, 0.8)',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.7857rem',
                          cursor: 'pointer'
                        }}
                        className="press-interactive"
                      >
                        Delete
                      </button>
                    </div>
                  </GlassCard>
                );
              })}
              {paginated.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--muted-gray)', fontSize: '0.9286rem', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '16px' }}>
                  No student records match your search criteria. Try searching by Name, Admission Number, or Phone.
                </div>
              )}
            </div>
            </>);
            })()}
          </div>

          {renderModals()}


        </main>
      </div>
    );
  }

  //  SUBPAGE 2: FEE COLLECTION DESK (Sub-page)
  if (activeSubPage === 'fee_collection') {
    // Search, then filters, then a page. Applied in that order so a filter
    // narrows what the search found rather than the whole registry.
    const searched = students.filter((student) => matchesStudentSearch(student, feeCollectAdm));
    const filteredCollectList = searched.filter((s: any) => {
      if (feeFilterCampus !== 'All' && (s.branch || '') !== feeFilterCampus) return false;
      if (feeFilterCourse !== 'All' && (s.course || '') !== feeFilterCourse) return false;
      if (feeFilterYear !== 'All' && (s.studentYear || 'First Year') !== feeFilterYear) return false;
      if (feeFilterDues === 'pending' && !(Number(s.remainingBalance) > 0)) return false;
      if (feeFilterDues === 'settled' && Number(s.remainingBalance) > 0) return false;
      return true;
    });

    const COLLECT_PER_PAGE = 24;
    const collectTotalPages = Math.max(1, Math.ceil(filteredCollectList.length / COLLECT_PER_PAGE));
    // Clamped rather than stored: deleting or filtering can leave the stored
    // page beyond the end, and an empty grid reads as "no students" when the
    // truth is "no students on page 7".
    const collectPage = Math.min(feeCollectPage, collectTotalPages);
    const collectPageItems = filteredCollectList.slice(
      (collectPage - 1) * COLLECT_PER_PAGE, collectPage * COLLECT_PER_PAGE
    );

    const collectCourses = Array.from(new Set(students.map((s: any) => s.course).filter(Boolean))).sort();

    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('gold')}
        <header style={styles.header}>
          <button onClick={exitToCockpit} style={styles.backArrowBtn} className="press-interactive">
             Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Fee Collection Desk</h1>
          <p style={styles.subtitle}>Directly search student record lists and collect term fees</p>
          {/* An account pinned to one campus knows which campus it is. The
              Rector does not — they chose it a screen ago and every other
              screen they use spans all four, so the campus is stated here
              rather than left to memory. Taking a payment against the wrong
              campus is the mistake this prevents. */}
          {campusOverride && (
            <div style={{
              display: 'inline-block', marginTop: '8px', padding: '4px 12px',
              borderRadius: '20px', fontSize: '0.7857rem', fontWeight: 900,
              backgroundColor: 'var(--good-wash)', color: 'var(--good)',
              border: '1.5px solid var(--good)'
            }}>
              Collecting for {campusOverride}
            </div>
          )}
        </header>

        <main style={styles.content}>
          {!selectedStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
              <input maxLength={LIMITS.admissionNumber}
                type="text"
                placeholder="Search student by Name or Admission Number..."
                value={feeCollectAdm}
                onChange={(e) => { setFeeCollectAdm(e.target.value); setFeeCollectPage(1); }}
                style={styles.textInputBox}
              />

              {/* Filters. Every one resets to page 1 — narrowing the list while
                  sitting on page 4 of the old one shows nothing and looks
                  broken. */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={feeFilterCampus} onChange={(e) => { setFeeFilterCampus(e.target.value); setFeeCollectPage(1); }}
                  style={{ ...styles.selectInput, width: 'auto', minWidth: '150px' }}>
                  <option value="All">All campuses</option>
                  {CAMPUS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select value={feeFilterCourse} onChange={(e) => { setFeeFilterCourse(e.target.value); setFeeCollectPage(1); }}
                  style={{ ...styles.selectInput, width: 'auto', minWidth: '120px' }}>
                  <option value="All">All courses</option>
                  {collectCourses.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
                </select>

                <select value={feeFilterYear} onChange={(e) => { setFeeFilterYear(e.target.value); setFeeCollectPage(1); }}
                  style={{ ...styles.selectInput, width: 'auto', minWidth: '130px' }}>
                  <option value="All">All years</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Short Term">Short Term</option>
                </select>

                <select value={feeFilterDues} onChange={(e) => { setFeeFilterDues(e.target.value); setFeeCollectPage(1); }}
                  style={{ ...styles.selectInput, width: 'auto', minWidth: '130px' }}>
                  <option value="All">Paid and pending</option>
                  <option value="pending">Pending only</option>
                  <option value="settled">Settled only</option>
                </select>

                {(feeFilterCampus !== 'All' || feeFilterCourse !== 'All' || feeFilterYear !== 'All' || feeFilterDues !== 'All' || feeCollectAdm) && (
                  <button
                    onClick={() => {
                      setFeeFilterCampus('All'); setFeeFilterCourse('All');
                      setFeeFilterYear('All'); setFeeFilterDues('All');
                      setFeeCollectAdm(''); setFeeCollectPage(1);
                    }}
                    style={{ ...styles.actionItemBtn, padding: '8px 14px', backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', border: 'none' }}
                    className="press-interactive"
                  >
                    Clear
                  </button>
                )}

                <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--ink-secondary)', marginLeft: 'auto' }}>
                  {filteredCollectList.length} student{filteredCollectList.length === 1 ? '' : 's'}
                  {collectTotalPages > 1 ? ` · page ${collectPage} of ${collectTotalPages}` : ''}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                gap: '12px',
                marginTop: '12px'
              }}>
                {collectPageItems.map(s => (
                  <GlassCard
                    key={s._id || s.studentId || s.admissionNumber}
                    hoverable={true}
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const fullProfile = await accountantService.getStudentProfile(s._id || s.studentId || s.admissionNumber);
                        setSelectedStudent(fullProfile as any);
                        setEditStudent({ ...fullProfile } as any);
                        setCollectDate(new Date().toISOString().split('T')[0]);
                        triggerToast(`Loaded fee details for ${fullProfile.name}`);
                      } catch {
                        triggerToast('Failed to load profile.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    style={{
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      backgroundColor: 'rgba(255,255,255,0.75)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '14px',
                          backgroundColor: 'rgba(212,175,55,0.16)',
                          color: 'var(--warning)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1429rem',
                          fontWeight: 900,
                          flexShrink: 0
                        }}>
                          {(s.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--dark-charcoal)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</strong>
                          <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '3px' }}>
                            Adm: {s.admissionNumber || s.studentId}  |  ID: {s.studentId || s.admissionNumber}
                          </div>
                          <div style={{ fontSize: '0.7857rem', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                            {s.branch || loggedInCampus} ({s.course || 'MPC'}{s.section ? ` - ${s.section}` : ''})
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: s.remainingBalance > 0 ? 'var(--critical)' : 'var(--good)', whiteSpace: 'nowrap' }}>
                        {s.remainingBalance > 0 ? `Pending: Rs.${Number(s.remainingBalance || 0).toLocaleString('en-IN')}` : 'Settled'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openStudentEditor(s as any);
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1.5px solid var(--royal-gold)',
                          // #FAB219 on the #F5F5F4 sunken surface is a 1.68
                          // contrast ratio — the label was there but unreadable.
                          // Matches the border instead.
                          color: 'var(--royal-gold)',
                          backgroundColor: 'var(--surface-sunken)',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.7857rem',
                          cursor: 'pointer'
                        }}
                        className="press-interactive"
                      >
                        Edit Student
                      </button>
                    </div>
                  </GlassCard>
                ))}
                {filteredCollectList.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--muted-gray)', fontSize: '0.8571rem' }}>
                    No students match. Try a different name or admission number, or clear the filters.
                  </div>
                )}
              </div>

              {/* Paging. Hidden entirely on a single page rather than shown
                  greyed out — controls that can never do anything are noise. */}
              {collectTotalPages > 1 && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', paddingTop: '4px' }}>
                  <button
                    disabled={collectPage <= 1}
                    onClick={() => setFeeCollectPage(collectPage - 1)}
                    style={{
                      ...styles.actionItemBtn, padding: '8px 16px', border: 'none',
                      backgroundColor: collectPage <= 1 ? 'var(--line)' : 'var(--ink)',
                      color: collectPage <= 1 ? 'var(--muted-gray)' : 'var(--surface)',
                      cursor: collectPage <= 1 ? 'not-allowed' : 'pointer'
                    }}
                    className="press-interactive"
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--ink-secondary)' }}>
                    Page {collectPage} of {collectTotalPages}
                  </span>
                  <button
                    disabled={collectPage >= collectTotalPages}
                    onClick={() => setFeeCollectPage(collectPage + 1)}
                    style={{
                      ...styles.actionItemBtn, padding: '8px 16px', border: 'none',
                      backgroundColor: collectPage >= collectTotalPages ? 'var(--line)' : 'var(--ink)',
                      color: collectPage >= collectTotalPages ? 'var(--muted-gray)' : 'var(--surface)',
                      cursor: collectPage >= collectTotalPages ? 'not-allowed' : 'pointer'
                    }}
                    className="press-interactive"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }} className="anim-fade-in">
              {/* Profile Bar */}
              <GlassCard hoverable={false} style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{selectedStudent.name}</h4>
                  <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                    Adm No: {selectedStudent.admissionNumber}  Branch: {selectedStudent.branch}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => void openStudentEditor(selectedStudent)}
                    style={{ ...styles.actionItemBtn, border: '1.5px solid var(--royal-gold)', color: 'var(--royal-gold)', backgroundColor: 'var(--surface-sunken)' }}
                    className="press-interactive"
                  >
                    Edit Student
                  </button>
                  <button
                    onClick={() => { setSelectedStudent(null); setEditStudent(null); setCollectDate(new Date().toISOString().split('T')[0]); }}
                    style={{ ...styles.actionItemBtn, border: '1px solid rgba(0,0,0,0.1)', color: 'var(--muted-gray)' }}
                    className="press-interactive"
                  >
                    Change Student
                  </button>
                </div>
              </GlassCard>

              {/* Double Column Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '16px' }}>
                {/* Column 1: Cool Bill Format Statement Card */}
                <div style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--line-strong)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative'
                }}>
                  {/* Bill Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1.5px solid var(--line)',
                    paddingBottom: '12px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        INSPIRE JUNIOR COLLEGE
                      </span>
                      <h3 style={{ margin: '2px 0 0', fontSize: '1.0714rem', fontWeight: 900, color: 'var(--ink)' }}>
                        Fee Structure & Bill Statement
                      </h3>
                    </div>
                    <span style={{
                      fontSize: '0.7857rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: selectedStudent.remainingBalance > 0 ? 'var(--critical-wash)' : 'var(--good-wash)',
                      color: selectedStudent.remainingBalance > 0 ? 'var(--critical)' : 'var(--good)',
                      border: selectedStudent.remainingBalance > 0 ? '1px solid var(--critical-wash)' : '1px solid var(--good-wash)'
                    }}>
                      {selectedStudent.remainingBalance > 0 ? 'BALANCE DUE' : 'FULLY SETTLED'}
                    </span>
                  </div>

                  {/* Fee Section Description (Left) & Amount (Right) Table */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7857rem', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--surface-sunken)', paddingBottom: '6px' }}>
                      <span>Fee Section Description</span>
                      <span>Amount (Rs)</span>
                    </div>

                    {getActiveFeeSlots(selectedStudent).map((slot) => (
                      <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9286rem', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)' }}>
                        <span style={{ color: 'var(--ink-secondary)', fontWeight: 600 }}>
                          {slot.name}
                        </span>
                        <strong style={{ color: 'var(--ink)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {/* Guarded: a custom fee slot saved without an
                              amount would otherwise throw here and take the
                              whole fee-collection screen down for that
                              student, with an error boundary in place of the
                              till. */}
                          Rs.{Number(slot.amount || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    ))}

                    {Number((selectedStudent as any).tuitionWaiver || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9286rem', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)', color: 'var(--good)' }}>
                        <span style={{ fontWeight: 700 }}>Tuition Waiver</span>
                        <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>- Rs.{Number((selectedStudent as any).tuitionWaiver).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {Number((selectedStudent as any).hostelWaiver || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9286rem', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)', color: 'var(--good)' }}>
                        <span style={{ fontWeight: 700 }}>Hostel Waiver</span>
                        <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>- Rs.{Number((selectedStudent as any).hostelWaiver).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {Number((selectedStudent as any).transportWaiver || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9286rem', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)', color: 'var(--good)' }}>
                        <span style={{ fontWeight: 700 }}>Transport Waiver</span>
                        <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>- Rs.{Number((selectedStudent as any).transportWaiver).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {Number((selectedStudent as any).miscWaiver || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9286rem', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)', color: 'var(--good)' }}>
                        <span style={{ fontWeight: 700 }}>Miscellaneous Waiver</span>
                        <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>- Rs.{Number((selectedStudent as any).miscWaiver).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                  </div>

                  {/* Horizontal Dashed Line */}
                  <div style={{ borderTop: '1.5px dashed var(--line-strong)', margin: '4px 0' }} />

                  {/* Calculations Summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(() => {
                      const activeSlots = getActiveFeeSlots(selectedStudent);
                      const grossTotal = activeSlots.reduce((sum, s) => sum + s.amount, 0);
                      const totalPaid = Number(selectedStudent.totalPaid) || 0;
                      const tW = Number((selectedStudent as any).tuitionWaiver || 0);
                      const hW = Number((selectedStudent as any).hostelWaiver || 0);
                      const trW = Number((selectedStudent as any).transportWaiver || 0);
                      const mW = Number((selectedStudent as any).miscWaiver || 0);
                      const totalWaivers = tW + hW + trW + mW;
                      const remaining = selectedStudent.remainingBalance;

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9286rem' }}>
                            <span style={{ color: 'var(--ink-secondary)', fontWeight: 700 }}>Gross Total Base Fee</span>
                            <strong style={{ color: 'var(--ink)', fontWeight: 800 }}>Rs.{grossTotal.toLocaleString('en-IN')}</strong>
                          </div>

                          {tW > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8929rem', color: 'var(--good)' }}>
                              <span style={{ fontWeight: 600 }}>Tuition Waiver</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{tW.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                          {hW > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8929rem', color: 'var(--good)' }}>
                              <span style={{ fontWeight: 600 }}>Hostel Waiver</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{hW.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                          {trW > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8929rem', color: 'var(--good)' }}>
                              <span style={{ fontWeight: 600 }}>Transport Waiver</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{trW.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                          {mW > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8929rem', color: 'var(--good)' }}>
                              <span style={{ fontWeight: 600 }}>Miscellaneous Waiver</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{mW.toLocaleString('en-IN')}</strong>
                            </div>
                          )}

                          {totalWaivers > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8929rem', color: 'var(--good)', borderTop: '1px dashed var(--good-wash)', paddingTop: '4px', marginTop: '2px' }}>
                              <span style={{ fontWeight: 700 }}>Total Waivers Applied</span>
                              <strong style={{ fontWeight: 900 }}>- Rs.{totalWaivers.toLocaleString('en-IN')}</strong>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8929rem', color: 'var(--good)' }}>
                            <span style={{ fontWeight: 600 }}>Total Payments Received</span>
                            <strong style={{ fontWeight: 800 }}>- Rs.{totalPaid.toLocaleString('en-IN')}</strong>
                          </div>

                          {/* Horizontal Double Line */}
                          <div style={{ borderTop: '2.5px solid var(--ink)', margin: '6px 0 2px' }} />

                          {/* Net Remaining Balance Banner */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            backgroundColor: remaining > 0 ? 'var(--warning-wash)' : 'var(--good-wash)',
                            border: remaining > 0 ? '1.5px solid #FCD34D' : '1.5px solid var(--good-wash)'
                          }}>
                            <span style={{ fontSize: '0.8571rem', fontWeight: 800, color: remaining > 0 ? 'var(--warning)' : 'var(--good)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Net Remaining Balance
                            </span>
                            <strong style={{ fontSize: '1.2857rem', fontWeight: 900, color: remaining > 0 ? 'var(--warning)' : 'var(--good)', fontVariantNumeric: 'tabular-nums' }}>
                              Rs.{remaining.toLocaleString('en-IN')}
                            </strong>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Column 2: Collect Fees Form */}
                <div style={styles.readOnlyBlock}>
                  <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>Collect Fee Payment</h4>
                  {selectedStudent.remainingBalance > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <label style={styles.formLabel}>Amount (Rs.)</label>
                          <input min={0} max={999999999}
                            type="number"
                            placeholder="e.g. 15000"
                            value={collectAmount}
                            onChange={(e) => setCollectAmount(e.target.value)}
                            style={styles.textInputBox}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <label style={styles.formLabel}>Installment Slot</label>
                          <select value={collectInstallment} onChange={(e) => setCollectInstallment(e.target.value)} style={styles.selectInput}>
                            <option value="Installment 1">Installment 1</option>
                            <option value="Installment 2">Installment 2</option>
                            <option value="Installment 3">Installment 3</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <label style={styles.formLabel}>Payment Date</label>
                          <input
                            type="date"
                            value={collectDate}
                            onChange={(e) => setCollectDate(e.target.value)}
                            style={styles.textInputBox}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <label style={styles.formLabel}>Transaction / UPI Ref No.</label>
                          <input maxLength={LIMITS.transactionRef}
                            type="text"
                            placeholder="e.g. UPI/9849204128"
                            value={collectTransactionRef}
                            onChange={(e) => setCollectTransactionRef(e.target.value)}
                            style={styles.textInputBox}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <label style={styles.formLabel}>Category</label>
                          <select value={collectCategory} onChange={(e) => setCollectCategory(e.target.value)} style={styles.selectInput}>
                            {getActiveFeeSlots(selectedStudent).map(s => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                            <option value="Tuition Fee">Tuition Fee</option>
                            <option value="Hostel Fee">Hostel Fee</option>
                            <option value="Miscellaneous Fee">Miscellaneous Fee</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <label style={styles.formLabel}>Mode</label>
                          <select value={collectMode} onChange={(e) => setCollectMode(e.target.value)} style={styles.selectInput}>
                            <option value="UPI / NetBanking">UPI / NetBanking</option>
                            <option value="Cash Payment">Cash Payment</option>
                            <option value="Credit Card">Credit Card</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '8px', marginTop: '10px' }}>
                        <button
                          onClick={() => { setPendingPayType('partial'); setPayOtpInput(''); setIsPayOtpModalOpen(true); }}
                          style={{ ...styles.sheetBtn, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }}
                          className="press-interactive"
                        >
                          Partial Pay (50%)
                        </button>
                        <button
                          onClick={() => { setPendingPayType('full'); setPayOtpInput(''); setIsPayOtpModalOpen(true); }}
                          style={{ ...styles.sheetBtn, backgroundColor: 'var(--warning-wash)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                          className="press-interactive"
                        >
                          Full Pay (100%)
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          if (!collectAmount || parseFloat(collectAmount) <= 0) {
                            triggerToast('Please enter a valid payment amount.');
                            return;
                          }
                          setPendingPayType('collect');
                          setPayOtpInput('');
                          setIsPayOtpModalOpen(true);
                        }}
                        style={{ ...styles.saveSubmitBtn, marginTop: '8px' }}
                        className="press-interactive"
                      >
                        Submit Custom Payment
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--good)', fontWeight: 800, padding: '30px 10px' }}>
                       All student baseline fees have been fully settled. Remaining balance is zero.
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Logs */}
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                  <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Receipt Logs / Transaction History</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Upgrade to the next year.
                        Shown only for First Year — Short Term does not progress
                        and Second Year completes the programme, so for those the
                        control is absent rather than present-and-disabled.
                        Locked until the balance reaches zero. The server checks
                        the same rule again on submit; this is only the display. */}
                    {selectedStudent.studentYear === 'First Year' && (() => {
                      const cleared = (selectedStudent.remainingBalance || 0) <= 0;
                      return (
                        <button
                          onClick={() => cleared ? openUpgradeDialog(selectedStudent) : undefined}
                          disabled={!cleared || isCheckingUpgrade}
                          title={cleared
                            ? 'Fees cleared — move this student to Second Year'
                            : `Locked: Rs.${(selectedStudent.remainingBalance || 0).toLocaleString('en-IN')} still outstanding`}
                          style={{
                            ...styles.actionItemBtn,
                            border: `1.5px solid ${cleared ? 'var(--good)' : 'var(--line-strong)'}`,
                            backgroundColor: cleared ? '#ECFDF5' : 'var(--surface-sunken)',
                            color: cleared ? 'var(--good)' : 'var(--muted-gray)',
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                            cursor: cleared ? 'pointer' : 'not-allowed',
                            opacity: cleared ? 1 : 0.75,
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                          className={cleared ? 'press-interactive' : undefined}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            {cleared
                              ? <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>
                              : <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>}
                          </svg>
                          {isCheckingUpgrade ? 'Checking...' : cleared ? 'Upgrade to Second Year' : 'Upgrade Locked'}
                        </button>
                      );
                    })()}

                    {/* Once upgraded there is nowhere further to go, so say so
                        rather than leaving a dead control on screen. */}
                    {selectedStudent.studentYear === 'Second Year' && (
                      <span style={{
                        fontSize: '0.7857rem', fontWeight: 800, color: 'var(--good)',
                        backgroundColor: '#ECFDF5', border: '1.5px solid var(--good)',
                        borderRadius: '8px', padding: '5px 10px', whiteSpace: 'nowrap'
                      }}>
                        Second Year{selectedStudent.academicYear ? ` (${selectedStudent.academicYear})` : ''}
                      </span>
                    )}
                    {selectedStudent.studentYear === 'Short Term' && (
                      <span style={{
                        fontSize: '0.7857rem', fontWeight: 800, color: 'var(--ink-secondary)',
                        backgroundColor: 'var(--surface-sunken)', border: '1.5px solid var(--line-strong)',
                        borderRadius: '8px', padding: '5px 10px', whiteSpace: 'nowrap'
                      }}>
                        Short Term
                      </span>
                    )}

                    <button onClick={() => handleDownloadStudentStatement(selectedStudent)} style={{ ...styles.actionItemBtn, border: '1.5px solid var(--royal-gold)', backgroundColor: '#FFF8DB', color: 'var(--royal-gold)', fontWeight: 900, whiteSpace: 'nowrap' }} className="press-interactive">Download Complete Statement</button>
                  </div>
                </div>

                {/* First-year records after an upgrade. The live receipt list
                    below shows only the current year, so without this the
                    closed year would look like it never happened. */}
                {(selectedStudent.yearHistory || []).map((h, i) => (
                  <div key={`yh-${i}`} style={{
                    marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
                    border: '1.5px dashed var(--line-strong)', backgroundColor: 'var(--surface-sunken)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px'
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.8571rem', color: 'var(--ink)' }}>
                        {h.studentYear} completed{h.academicYear ? ` — ${h.academicYear}` : ''}
                      </strong>
                      <div style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                        Closed {h.closedAt ? new Date(h.closedAt).toLocaleDateString('en-GB') : 'n/a'}
                        {h.closedBy ? ` by ${h.closedBy}` : ''}
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.9286rem', color: 'var(--good)' }}>
                      Rs.{Number(h.totalPaid || 0).toLocaleString('en-IN')} paid
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {selectedStudent.feeAdjustments?.map((adjustment) => (
                    <div key={adjustment._id || adjustment.id || adjustment.createdAt} style={{ ...styles.receiptRowItem, borderColor: 'var(--warning)', backgroundColor: 'var(--warning-wash)' }}>
                      <div>
                        <strong style={{ fontSize: '0.9286rem', color: 'var(--warning)' }}>Fee Structure Revision</strong>
                        <div style={{ fontSize: '0.7143rem', color: 'var(--warning)', marginTop: '2px' }}>{adjustment.note || 'Baseline fee structure was updated.'}</div>
                        <div style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', marginTop: '2px' }}>Balance: Rs.{adjustment.previousBalance.toLocaleString('en-IN')}  Rs.{adjustment.updatedBalance.toLocaleString('en-IN')} {adjustment.createdAt ? `| ${new Date(adjustment.createdAt).toLocaleDateString('en-GB')}` : ''}</div>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: adjustment.amount >= 0 ? 'var(--warning)' : 'var(--good)' }}>{adjustment.amount >= 0 ? '+' : '-'}Rs.{Math.abs(adjustment.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {selectedStudent.receipts && selectedStudent.receipts.map((receipt) => (
                    <div key={receipt.receiptNumber} style={styles.receiptRowItem}>
                      <div>
                        <strong style={{ fontSize: '0.9286rem', color: 'var(--dark-charcoal)' }}>{receipt.installment} ({receipt.category})</strong>
                        <div style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                          Ref ID: {receipt.receiptNumber}  {new Date(receipt.date).toLocaleDateString('en-GB')}  Mode: {receipt.mode}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--good)' }}>Rs.{receipt.amount.toLocaleString('en-IN')}</span>
                        <button
                          onClick={() => {
                            setSelectedReceipt(receipt);
                            setActiveOverlay('receipt_view');
                          }}
                          style={{ ...styles.actionItemBtn, border: '1.5px solid var(--royal-gold)', color: 'var(--royal-gold)', background: 'transparent' }}
                          className="press-interactive"
                        >
                          Print / PDF
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!selectedStudent.receipts || selectedStudent.receipts.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted-gray)', fontSize: '0.7857rem' }}>
                      No payments have been recorded for this student account yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT CONFIRMATION HOVER OVERLAY */}
          {isPayOtpModalOpen && selectedStudent && (
            <div style={{ ...styles.overlayOverlay, zIndex: 1100 }}>
              <div style={{ ...styles.overlaySheet, maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={styles.modalTitle}>Confirm Fee Payment</h3>
                  <button
                    onClick={() => setIsPayOtpModalOpen(false)}
                    style={{ background: 'none', border: 'none', fontSize: '1.2857rem', cursor: 'pointer', color: 'var(--muted-gray)' }}
                  >
                    ×
                  </button>
                </div>

                <p style={{ fontSize: '0.9286rem', color: 'var(--dark-charcoal)', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
                  Are you sure you want to log a fee payment of <strong>Rs.{(pendingPayType === 'full' ? selectedStudent.remainingBalance : pendingPayType === 'partial' ? Math.floor(selectedStudent.remainingBalance / 2) : (parseFloat(collectAmount) || 0)).toLocaleString('en-IN')}</strong> for student <strong>{selectedStudent.name}</strong>?
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setIsPayOtpModalOpen(false)}
                    style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }}
                    className="press-interactive"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleFeePayment(pendingPayType, undefined)}
                    style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'var(--good)', color: '#FFF', fontWeight: 800 }}
                    className="press-interactive"
                  >
                    Yes, Confirm & Log Payment
                  </button>
                </div>
              </div>
            </div>
          )}


        {/* Year upgrade — same fees as this year, offered for editing.
            Every figure here is a starting point read from the server; the
            server recomputes the total and re-checks eligibility on submit,
            so nothing shown below is trusted as an input to the decision. */}
        {activeOverlay === 'upgrade_year' && selectedStudent && upgradeFees && (
          <div style={styles.overlayOverlay} className="anim-fade-in">
            <div style={{ ...styles.overlaySheet, position: 'relative', maxWidth: '560px' }} className="glass-panel-heavy">
              <div style={{ marginBottom: '14px', borderBottom: '2px solid var(--line)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1429rem', fontWeight: 900, color: 'var(--ink)' }}>
                  Upgrade to Second Year
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  {selectedStudent.name} · {selectedStudent.admissionNumber}
                  {upgradeInfo?.academicYear ? ` · currently ${upgradeInfo.academicYear}` : ''}
                </p>
              </div>

              <div style={{
                padding: '10px 12px', borderRadius: '10px', marginBottom: '14px',
                backgroundColor: '#ECFDF5', border: '1.5px solid var(--good)',
                fontSize: '0.8214rem', fontWeight: 700, color: 'var(--good)'
              }}>
                First year fully paid. Its receipts and fee structure are kept and stay
                visible in the history below.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
                {/* Fees only. The four waiver fields that used to sit here
                    were a way to write off next year's charges from this
                    screen, bypassing the Rector-only waiver route — the server
                    now refuses them, so showing the inputs would only produce
                    a guaranteed error. Waivers are applied by the Rector after
                    the upgrade. */}
                {[
                  ['tuitionFee', 'Tuition Fee'],
                  ['hostelFee', 'Hostel Fee'],
                  ['transportFee', 'Transport Fee'],
                  ['miscellaneousFee', 'Miscellaneous Fee']
                ].map(([key, label]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '0.7143rem', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={999999999}
                      value={upgradeFees[key] ?? 0}
                      onChange={(e) => setUpgradeFees((p: any) => ({ ...p, [key]: Math.max(0, Number(e.target.value) || 0) }))}
                      style={styles.textInputBox}
                    />
                  </div>
                ))}
              </div>

              {(upgradeFees.customFeeSlots || []).length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Additional Fees
                  </div>
                  {upgradeFees.customFeeSlots.map((slot: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <input
                        type="text"
                        maxLength={LIMITS.feeSlotName}
                        value={slot.name}
                        onChange={(e) => setUpgradeFees((p: any) => {
                          const next = [...p.customFeeSlots];
                          next[i] = { ...next[i], name: e.target.value };
                          return { ...p, customFeeSlots: next };
                        })}
                        style={{ ...styles.textInputBox, flex: 2 }}
                      />
                      <input
                        type="number"
                        min={0}
                        max={999999999}
                        value={slot.amount}
                        onChange={(e) => setUpgradeFees((p: any) => {
                          const next = [...p.customFeeSlots];
                          next[i] = { ...next[i], amount: Math.max(0, Number(e.target.value) || 0) };
                          return { ...p, customFeeSlots: next };
                        })}
                        style={{ ...styles.textInputBox, flex: 1 }}
                      />
                      <button
                        onClick={() => setUpgradeFees((p: any) => ({
                          ...p, customFeeSlots: p.customFeeSlots.filter((_: any, j: number) => j !== i)
                        }))}
                        style={{ ...styles.actionItemBtn, border: '1.5px solid var(--critical)', color: 'var(--critical)', background: 'transparent' }}
                        className="press-interactive"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setUpgradeFees((p: any) => ({
                  ...p, customFeeSlots: [...(p.customFeeSlots || []), { name: '', amount: 0 }]
                }))}
                style={{ ...styles.actionItemBtn, marginTop: '8px', border: '1.5px dashed var(--line-strong)', color: 'var(--ink-secondary)', background: 'transparent' }}
                className="press-interactive"
              >
                + Add a fee line
              </button>

              <div style={{
                marginTop: '16px', padding: '12px', borderRadius: '10px',
                backgroundColor: 'var(--surface-sunken)', border: '2px solid var(--ink)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  <span>Total fees</span><span>Rs.{upgradeTotals.gross.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8571rem', fontWeight: 700, color: 'var(--good)', marginTop: '3px' }}>
                  <span>Waivers</span><span>Set by the Rector after upgrading</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.0714rem', fontWeight: 900, color: 'var(--ink)', marginTop: '8px', paddingTop: '8px', borderTop: '1.5px solid var(--line-strong)' }}>
                  <span>Payable in Second Year</span>
                  <span>Rs.{upgradeTotals.payable.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={() => { setActiveOverlay(null); setUpgradeFees(null); setUpgradeInfo(null); }}
                  disabled={isUpgrading}
                  style={{ ...styles.actionItemBtn, flex: 1, border: '1.5px solid var(--line-strong)', color: 'var(--ink-secondary)', background: 'transparent' }}
                  className="press-interactive"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpgrade}
                  disabled={isUpgrading}
                  style={{
                    ...styles.actionItemBtn, flex: 2,
                    border: '1.5px solid var(--good)', backgroundColor: 'var(--good)', color: '#fff',
                    fontWeight: 900,
                    opacity: isUpgrading ? 0.6 : 1,
                    cursor: isUpgrading ? 'wait' : 'pointer'
                  }}
                  className="press-interactive"
                >
                  {isUpgrading ? 'Upgrading...' : 'Confirm — Move to Second Year'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ack Receipt popup */}
        {activeOverlay === 'receipt_view' && selectedReceipt && selectedStudent && (
          <div style={styles.overlayOverlay} className="anim-fade-in">
            <div style={{ ...styles.overlaySheet, position: 'relative' }} className="glass-panel-heavy">
              <button
                onClick={() => setActiveOverlay(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0,0,0,0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'var(--dark-charcoal)',
                  zIndex: 11000
                }}
                className="press-interactive"
              >
                <CloseIcon />
              </button>

              <h3 style={{ ...styles.modalTitle, marginBottom: '18px' }}>Acknowledgment Receipt</h3>

              <div style={styles.printableReceiptBlock}>
                <div style={{ border: '2px solid var(--royal-gold)', borderRadius: '16px', padding: '18px', backgroundColor: 'rgba(255,255,255,0.45)' }}>
                  <div style={{ textAlign: 'center', borderBottom: '1.5px solid var(--royal-gold)', paddingBottom: '10px', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '1.0714rem', fontWeight: 900, color: 'var(--royal-gold)', letterSpacing: '0.04em' }}>Inspire Junior College X TRNT BEE</h4>
                    <span style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Official Fee Receipt</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={styles.metaRow}><span>Receipt Number:</span><strong>{selectedReceipt.receiptNumber}</strong></div>
                    <div style={styles.metaRow}><span>Payment Date:</span><strong>{selectedReceipt.date}</strong></div>
                    <div style={styles.metaRow}><span>Student Name:</span><strong>{selectedStudent.name}</strong></div>
                    <div style={styles.metaRow}><span>Admission No:</span><strong>{selectedStudent.admissionNumber}</strong></div>
                    <div style={styles.metaRow}><span>Fee Category:</span><strong>{selectedReceipt.category}</strong></div>
                    <div style={styles.metaRow}><span>Amount Paid:</span><strong style={{ color: 'var(--good)', fontSize: '1.0714rem' }}>Rs.{selectedReceipt.amount.toLocaleString('en-IN')}</strong></div>
                    <div style={styles.metaRow}><span>Remaining Bal:</span><strong>Rs.{selectedReceipt.balance.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => handleDownloadPDF(selectedReceipt, selectedStudent)} style={{ ...styles.sheetBtn, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 800 }} className="press-interactive">Download PDF / Print</button>
                <button
                  onClick={() => shareReceiptDigitally(selectedReceipt, selectedStudent)}
                  style={{ ...styles.sheetBtn, backgroundColor: '#25D366', color: '#FFFFFF', fontWeight: 800 }}
                  className="press-interactive"
                >
                  Share Digital
                </button>
              </div>
            </div>
          </div>
        )}
          {renderModals()}

        </main>
      </div>
    );
  }

  //  SUBPAGE 3: ATTENDANCE CONSOLE (Sub-page)

  //  SUBPAGE 4: COLLECTION REPORTS (Sub-page)
  if (activeSubPage === 'reports') {
    const allTransactions = students
      .flatMap(s => s.receipts.map(r => ({ student: s, receipt: r })))
      .sort((a, b) => new Date(b.receipt.date).getTime() - new Date(a.receipt.date).getTime());
    const AUDIT_PER_PAGE = 50;
    const auditTotalPages = Math.max(1, Math.ceil(allTransactions.length / AUDIT_PER_PAGE));
    const auditCurrentPage = Math.min(auditPage, auditTotalPages);
    const auditPagedTx = allTransactions.slice((auditCurrentPage - 1) * AUDIT_PER_PAGE, auditCurrentPage * AUDIT_PER_PAGE);

    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('ruby')}
        <header style={styles.header}>
          <button onClick={() => { setActiveSubPage('menu'); }} style={styles.backArrowBtn} className="press-interactive">
             Back to Cockpit
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: '8px' }}>
            <div>
              <h1 style={styles.title}>Audit Report Compiler</h1>
              <p style={styles.subtitle}>Transaction audit stream — {allTransactions.length} records total</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  if (allTransactions.length === 0) { triggerToast('No transactions to export.'); return; }
                  const totalAmount = allTransactions.reduce((sum, tx) => sum + Number(tx.receipt.amount || 0), 0);

                  const body = [
                    pdfHeader({
                      logoSrc: collegeLogo,
                      title: 'Audit Report',
                      subtitle: `${allTransactions.length} transaction(s)`,
                      campus: loggedInCampus
                    }),
                    pdfTiles([
                      { label: 'Transactions', value: String(allTransactions.length) },
                      { label: 'Total Collected', value: money(totalAmount), tone: 'good' }
                    ]),
                    pdfSection('Transaction Ledger'),
                    pdfTable({
                      headers: ['#', 'Receipt No.', 'Student', 'Adm No.', 'Category', 'Installment', 'Mode', 'Date', 'Amount'],
                      numeric: [8],
                      rows: allTransactions.map((tx, idx) => [
                        String(idx + 1),
                        `<strong>${escapeHtml(tx.receipt.receiptNumber)}</strong>`,
                        escapeHtml(tx.student.name),
                        escapeHtml(tx.student.admissionNumber),
                        escapeHtml(tx.receipt.category),
                        escapeHtml(tx.receipt.installment),
                        escapeHtml(tx.receipt.mode),
                        dateStr(tx.receipt.date),
                        `<span class="pdf-strong">${money(tx.receipt.amount)}</span>`
                      ]),
                      footer: ['', '', '', '', '', '', '', 'Total', money(totalAmount)]
                    }),
                    pdfFooter({ note: 'Computer-generated audit report, verified against the Inspire College ERP records.' })
                  ].join('');

                  // Landscape: nine columns do not fit across a portrait page.
                  const opened = openPrintDocument({
                    title: 'Audit Report',
                    body,
                    landscape: true,
                    buttonLabel: 'Print / Save Audit Report as PDF',
                    onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the report.')
                  });
                  if (opened) triggerToast('Audit report opened — ' + allTransactions.length + ' records.');
                }}
                style={{ ...styles.sheetBtn, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 800, padding: '10px 18px', borderRadius: '10px' }}
                className="press-interactive"
              >
                 Download PDF
              </button>
            </div>
          </div>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          {/* Pagination Controls — top */}
          {auditTotalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
              <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                Showing {((auditCurrentPage - 1) * AUDIT_PER_PAGE) + 1}–{Math.min(auditCurrentPage * AUDIT_PER_PAGE, allTransactions.length)} of {allTransactions.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditCurrentPage === 1}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: auditCurrentPage === 1 ? 'var(--surface-sunken)' : '#fff', color: auditCurrentPage === 1 ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: auditCurrentPage === 1 ? 'default' : 'pointer' }}>
                  ← Prev
                </button>
                <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center' }}>Page {auditCurrentPage} / {auditTotalPages}</span>
                <button onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditCurrentPage === auditTotalPages}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: auditCurrentPage === auditTotalPages ? 'var(--surface-sunken)' : '#fff', color: auditCurrentPage === auditTotalPages ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: auditCurrentPage === auditTotalPages ? 'default' : 'pointer' }}>
                  Next →
                </button>
              </div>
            </div>
          )}

          <h4 style={styles.sectionSubtitle}>Collection Audit Logs</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            {auditPagedTx.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted-gray)', fontSize: '0.9286rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '16px' }}>
                No transactions recorded yet.
              </div>
            )}
            {auditPagedTx.map((tx, idx) => (
              <div key={idx} style={styles.receiptRowItem}>
                <div>
                  <strong>{tx.receipt.receiptNumber} — {tx.student.name}</strong>
                  <div style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)' }}>{tx.receipt.category} · {tx.receipt.installment} · Adm: {tx.student.admissionNumber}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 850, color: 'var(--good)' }}>+ Rs.{tx.receipt.amount.toLocaleString('en-IN')}</span>
                  <div style={{ fontSize: '0.5714rem', color: 'var(--muted-gray)' }}>{tx.receipt.date} · {tx.receipt.mode}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Pagination Controls */}
          {auditTotalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '8px' }}>
              <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditCurrentPage === 1}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid var(--line)', background: auditCurrentPage === 1 ? 'var(--surface-sunken)' : '#fff', color: auditCurrentPage === 1 ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: auditCurrentPage === 1 ? 'default' : 'pointer' }}>
                ← Previous
              </button>
              <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>Page {auditCurrentPage} of {auditTotalPages}</span>
              <button onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditCurrentPage === auditTotalPages}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid var(--line)', background: auditCurrentPage === auditTotalPages ? 'var(--surface-sunken)' : '#fff', color: auditCurrentPage === auditTotalPages ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: auditCurrentPage === auditTotalPages ? 'default' : 'pointer' }}>
                Next →
              </button>
            </div>
          )}
          {renderModals()}

        </main>
      </div>
    );
  }

  //  SUBPAGE 6: LATE FEE SETTINGS (Sub-page)

  //  SUBPAGE 7: SCHOLARSHIPS SETTINGS (Sub-page)

  //  SUBPAGE 8: ACCOUNTANT PROFILE (Sub-page)
  if (activeSubPage === 'profile') {
    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('navy')}
        <header style={styles.header}>
          <button onClick={() => setActiveSubPage('menu')} style={styles.backArrowBtn} className="press-interactive">
             Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Accountant Profile Details</h1>
          <p style={styles.subtitle}>Cashier credential profiles and academic year registers</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
            <GlassCard hoverable={false} style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.45)' }}>
              <div style={styles.heroAvatar}>{user?.name ? user.name.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2) : 'VN'}</div>
              <h3 style={{ ...styles.studentName, marginTop: '12px' }}>{user?.name || 'Venkatesh M.'}</h3>
              <span style={styles.studentID}>Role: Accountant ({loggedInCampus})</span>
              <div style={styles.heroLineDivider} />
              <div style={styles.heroMetaGrid}>
                <div style={styles.metaRow}><span>Active ERP Registry</span><strong>{user?.campus ? `Inspire ${user.campus} Campus` : 'Inspire Junior Campus'}</strong></div>
                <div style={styles.metaRow}><span>Academic Year</span><strong>{settings.academicYear}</strong></div>
                <div style={styles.metaRow}><span>Installment Terms</span><strong>{settings.installments}</strong></div>
              </div>
            </GlassCard>
          </div>
          {renderModals()}

        </main>
      </div>
    );
  }

  //  DEFAULT VIEW: CONSOLIDATED COCKPIT MAIN MENU (No tabs)
  return (
    <div style={styles.container} className="view-container anim-slide-up">
      <PortalDataLoader visible={isPageLoading} colorAccent="var(--warning)" />
      {renderBackgroundDesign('gold')}

      {/* Top Welcome Title Bar */}
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 1 }}>
          <div style={styles.parentWelcomeRow}>
            <div style={styles.avatarMini}>{user?.name ? user.name.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2) : 'VN'}</div>
            <div>
              <span style={styles.greetingText}>Inspire ERP Control, ({loggedInCampus})</span>
              <h2 style={styles.parentWelcomeTitle}>{user?.name || 'Venkatesh M.'}</h2>
              <p style={styles.childMetaText}>Bursar Ledger Terminal</p>
            </div>
          </div>
          <div style={{ paddingRight: '8px' }}>
            <InspireLogo size="md" inPortal={true} />
          </div>
        </div>
      </header>

      <main style={{ ...styles.content, zIndex: 1 }}>
        {/* Summary Metrics Bar - Single Bar as requested */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '18px 24px',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            border: '2px solid rgba(212, 175, 55, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Campus Registration Summary
              </span>
              <h3 style={{ margin: 0, fontSize: '1.2857rem', fontWeight: 900, color: 'var(--dark-charcoal)' }}>
                Total Students in {loggedInCampus}: <span style={{ color: 'var(--good)', fontSize: '1.4286rem' }}>{students.length}</span>
              </h3>
            </div>
            <div style={{
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--good)',
              fontSize: '0.8571rem',
              fontWeight: 800,
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              Active Campus: {loggedInCampus}
            </div>
          </div>
        </section>

        {/* Module Grid */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={styles.sectionTitle}>Bursar Grid Modules</h3>
          <div className="grid-container">

            <div onClick={() => setActiveSubPage('student_search')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <h4 style={styles.moduleTitle}>Student Registry & Management</h4>
              <p style={styles.moduleDesc}>Register students, audit profiles, and edit complete fee structures.</p>
            </div>

            <div onClick={() => setActiveSubPage('fee_collection')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              </div>
              <h4 style={styles.moduleTitle}>Fee Collection</h4>
              <p style={styles.moduleDesc}>Search student records and log term payments.</p>
            </div>

            <div onClick={() => setActiveSubPage('reports')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--critical)" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h4 style={styles.moduleTitle}>Audit Reports</h4>
              <p style={styles.moduleDesc}>Compile collection audit logs and spreadsheets.</p>
            </div>

            <div onClick={() => setActiveSubPage('profile')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h4 style={styles.moduleTitle}>Bursar Profile</h4>
              <p style={styles.moduleDesc}>Review registered cashier bio and access tokens.</p>
            </div>

          </div>
        </section>

        {/* Terminate Session */}
        <button onClick={handleLogout} style={{ ...styles.logoutBtn, marginTop: '8px' }} className="press-interactive">
          Sign Out
        </button>

        {/* Footer */}
        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px 12px', gap: '8px', opacity: 0.85 }}>
          <InspireLogo size="sm" inPortal={true} />
          <span style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
            Inspire ERP Bursar Portal v2.6.4 • Powered by TRNT BEE Technologies
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

    </div>
  );
};

// --- STUB ROUTERS SO COMPILER DOES NOT FAIL ---
export const AccountantAcademicsView: React.FC = () => null;
export const AccountantUpdatesView: React.FC = () => null;
export const AccountantProfileView: React.FC = () => null;

// --- STYLING COEFFICIENTS ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)', position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto',
  },
  header: {
    padding: 'calc(20px + var(--safe-area-top)) 28px 18px 28px',
    background: 'var(--glass-bg)', borderBottom: '1px solid var(--card-border)',
    position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)',
  },
  title: {
    fontSize: '1.2857rem', fontWeight: 800, color: 'var(--dark-charcoal)',
    letterSpacing: '-0.025em', lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '0.8214rem', color: 'var(--muted-gray)', fontWeight: 500,
    marginTop: '3px', letterSpacing: '0.005em',
  },
  content: {
    padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  parentWelcomeRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatarMini: {
    width: '42px', height: '42px', borderRadius: '10px',
    backgroundColor: 'var(--dark-charcoal)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '0.9286rem',
    fontWeight: 900, color: 'var(--royal-gold)',
    border: '1px solid rgba(212,175,55,0.25)', letterSpacing: '0.04em', flexShrink: 0,
  },
  parentWelcomeTitle: {
    fontSize: '1.1429rem', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.02em',
  },
  greetingText: {
    fontSize: '0.7143rem', color: 'var(--muted-gray)', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '3px',
  },
  childMetaText: { fontSize: '0.7857rem', color: 'var(--muted-gray)', fontWeight: 500, marginTop: '1px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' },
  metricCard: {
    padding: '18px 20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.7)', border: '2px solid var(--card-border)',
    boxShadow: 'none',
  },
  metricLabel: {
    fontSize: '0.6786rem', fontWeight: 700, color: 'var(--muted-gray)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  metricValue: {
    fontSize: '1.5714rem', fontWeight: 900, color: 'var(--dark-charcoal)',
    letterSpacing: '-0.03em', lineHeight: 1, marginTop: '4px',
  },
  metricSub: { fontSize: '0.6786rem', color: 'var(--muted-gray)', fontWeight: 500, marginTop: '2px' },
  sectionTitle: {
    fontSize: '0.7857rem', fontWeight: 700, color: 'var(--muted-gray)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  sectionSubtitle: {
    fontSize: '0.7857rem', fontWeight: 700, color: 'var(--muted-gray)',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '8px', marginBottom: '4px',
  },
  moduleCardNew: {
    padding: '20px', borderRadius: '14px', cursor: 'pointer', display: 'flex',
    flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(255,255,255,0.7)',
    border: '2px solid var(--card-border)', boxShadow: 'none',
    transition: 'border-color 0.15s ease, transform 0.15s ease',
  },
  moduleIconWrapper: {
    width: '36px', height: '36px', borderRadius: '9px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  moduleTitle: { fontSize: '0.9286rem', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.01em' },
  moduleDesc: { fontSize: '0.7857rem', color: 'var(--muted-gray)', lineHeight: 1.5, fontWeight: 400 },
  textInputBox: {
    flex: 1, padding: '11px 14px', borderRadius: '10px', border: '2px solid var(--card-border)',
    fontSize: '0.9286rem', outline: 'none', backgroundColor: 'rgba(255,255,255,0.7)',
    color: 'var(--dark-charcoal)', fontFamily: 'var(--font-family)', fontWeight: 500,
  },
  saveSubmitBtn: {
    padding: '13px 20px', borderRadius: '10px', backgroundColor: 'var(--dark-charcoal)',
    color: 'var(--surface)', fontFamily: 'var(--font-family)', fontSize: '0.8929rem', fontWeight: 700,
    border: 'none', cursor: 'pointer', textAlign: 'center', marginTop: '8px', letterSpacing: '0.01em',
  },
  readOnlyBlock: {
    padding: '16px 18px', borderRadius: '12px', border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '10px',
  },
  metaRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '0.8929rem', padding: '5px 0',
  },
  formLabel: {
    fontSize: '0.6786rem', fontWeight: 700, color: 'var(--muted-gray)', textTransform: 'uppercase',
    letterSpacing: '0.07em', display: 'block', marginBottom: '4px',
  },
  selectInput: {
    width: '100%', padding: '11px 14px', borderRadius: '10px', border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)', fontSize: '0.9286rem', fontWeight: 600,
    color: 'var(--dark-charcoal)', outline: 'none', fontFamily: 'var(--font-family)',
  },
  receiptRowItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '12px',
  },
  actionItemBtn: {
    padding: '8px 14px', borderRadius: '8px', border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '0.7857rem', fontWeight: 700,
    color: 'var(--dark-charcoal)', cursor: 'pointer', fontFamily: 'var(--font-family)',
  },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '999px',
    fontSize: '0.6786rem', fontWeight: 700, letterSpacing: '0.04em',
    border: '2px solid var(--card-border)', backgroundColor: 'rgba(255,255,255,0.9)',
    color: 'var(--dark-charcoal)',
  },
  skeletonCard: {
    minHeight: '120px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.4)',
    border: '2px solid var(--card-border)',
  },
  skeletonLine: {
    width: '100%', height: '14px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.5)',
  },
  sheetBtn: {
    padding: '10px', borderRadius: '8px', border: 'none',
    fontFamily: 'var(--font-family)', fontSize: '0.8571rem', fontWeight: 700, cursor: 'pointer',
  },
  printableReceiptBlock: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  toastContainer: {
    position: 'fixed', bottom: '24px', left: '28px', right: '28px',
    zIndex: 10000, pointerEvents: 'none',
  },
  toastCard: {
    padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'var(--dark-charcoal)', border: 'none',
    boxShadow: '0 8px 24px rgba(15,23,42,0.18)', borderRadius: '10px',
  },
  toastText: { fontSize: '0.8571rem', fontWeight: 700, color: 'var(--surface)' },
  heroAvatar: {
    width: '56px', height: '56px', borderRadius: '12px', backgroundColor: 'var(--dark-charcoal)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1429rem',
    fontWeight: 900, color: 'var(--royal-gold)', border: '2px solid rgba(212,175,55,0.25)',
    letterSpacing: '0.04em',
  },
  studentName: { fontSize: '1.1429rem', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.015em' },
  studentID: { fontSize: '0.8214rem', color: 'var(--muted-gray)', fontWeight: 500, display: 'block', marginTop: '2px' },
  heroLineDivider: { width: '100%', height: '2px', backgroundColor: 'var(--card-border)', margin: '16px 0' },
  heroMetaGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  logoutBtn: {
    width: '100%', padding: '14px', borderRadius: '10px', backgroundColor: 'transparent',
    border: '2px solid rgba(211,47,47,0.25)', color: '#D32F2F',
    fontFamily: 'var(--font-family)', fontSize: '0.9286rem', fontWeight: 700,
    cursor: 'pointer', textAlign: 'center', letterSpacing: '0.01em',
  },
  quickFillContainer: { padding: '4px 0' },
  quickFillPill: {
    fontSize: '0.7143rem', fontWeight: 700, color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.06)', border: '2px solid rgba(212,175,55,0.25)',
    borderRadius: '6px', padding: '4px 9px', cursor: 'pointer', fontFamily: 'var(--font-family)',
  },
  backArrowBtn: {
    background: 'none', border: 'none', color: 'var(--muted-gray)',
    fontFamily: 'var(--font-family)', fontSize: '0.8571rem', fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '5px', padding: 0,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  overlayOverlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', zIndex: 1000, backdropFilter: 'blur(6px)',
  },
  overlaySheet: {
    width: '100%', maxWidth: '480px', backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: '16px', border: '2px solid var(--card-border)',
    boxShadow: 'none', padding: '24px',
    display: 'flex', flexDirection: 'column', maxHeight: '90%', overflowY: 'auto',
  },
  modalTitle: { fontSize: '1.0714rem', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.015em' },
};
