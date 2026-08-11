import React, { useState, useEffect } from 'react';
import { LIMITS } from '../constants/fieldLimits';
import { useNavigation } from '../context/NavigationContext';
import { GlassCard } from '../components/common/GlassCard';
import { InspireLogo } from '../components/common/InspireLogo';
import { PortalDataLoader } from '../components/common/PortalDataLoader';
import collegeLogo from '../assets/college logo.png';
import * as accountantService from '../services/accountantService';
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
const RECEIPT_INSTITUTION_NAME = 'Inspire Royal Residential Junior College';

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

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

export const AccountantDashboardView: React.FC = () => {
  const { user, activeTab: globalActiveTab } = useNavigation();
  const loggedInCampus = user?.campus && user.campus !== 'All' ? user.campus : 'Erragattugutta C1';

  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [activeSubPage, setActiveSubPage] = useState<'menu' | 'student_search' | 'fee_collection' | 'reports' | 'profile'>('menu');
  const [students, setStudents] = useState<Student[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePulseKey, setLivePulseKey] = useState<'students' | 'fees' | 'settings' | null>(null);
  const [securityKey] = useState('');

  // Sync globalActiveTab from sidebar/navigation drawer into local activeSubPage
  useEffect(() => {
    if (globalActiveTab) {
      if (globalActiveTab === 'dashboard' || globalActiveTab === 'home') {
        setActiveSubPage('menu');
      } else if (globalActiveTab === 'add_student') {
        setIsAddStudentModalOpen(true);
      } else if (['student_search', 'fee_collection', 'reports', 'profile'].includes(globalActiveTab)) {
        setActiveSubPage(globalActiveTab as any);
      }
    }
  }, [globalActiveTab]);

  // New Student & Delete Student Modals
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStuFormPage, setNewStuFormPage] = useState<1 | 2 | 3>(1);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [, setDeleteOtpInput] = useState('');
  const [registryPage, setRegistryPage] = useState(1);
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
      // Pass campus so only this campus's students are returned
      const list = await accountantService.searchStudents('', loggedInCampus);
      setStudents(list as any);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, [loggedInCampus]);


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
        tuitionFee: f.tuitionFee, hostelFee: f.hostelFee,
        transportFee: f.transportFee, miscellaneousFee: f.miscellaneousFee,
        tuitionWaiver: 0, hostelWaiver: 0, transportWaiver: 0, miscWaiver: 0,
        customFeeSlots: (f.customFeeSlots || []).map(s => ({ name: s.name, amount: s.amount }))
      });
      setActiveOverlay('upgrade_year');
    } catch (err: any) {
      triggerToast(err?.message || 'Could not check upgrade eligibility.', 'error');
    } finally {
      setIsCheckingUpgrade(false);
    }
  };

  const upgradeTotals = React.useMemo(() => {
    if (!upgradeFees) return { gross: 0, waivers: 0, payable: 0 };
    const slots = (upgradeFees.customFeeSlots || []).reduce((a: number, s: any) => a + (Number(s.amount) || 0), 0);
    const gross = Number(upgradeFees.tuitionFee || 0) + Number(upgradeFees.hostelFee || 0)
      + Number(upgradeFees.transportFee || 0) + Number(upgradeFees.miscellaneousFee || 0) + slots;
    const waivers = Number(upgradeFees.tuitionWaiver || 0) + Number(upgradeFees.hostelWaiver || 0)
      + Number(upgradeFees.transportWaiver || 0) + Number(upgradeFees.miscWaiver || 0);
    return { gross, waivers, payable: Math.max(0, gross - waivers) };
  }, [upgradeFees]);

  const handleConfirmUpgrade = async () => {
    if (!selectedStudent || !upgradeFees) return;
    if (upgradeTotals.waivers > upgradeTotals.gross) {
      triggerToast('Total waivers cannot exceed the total fees.', 'error');
      return;
    }

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
      setNewStudentData({ ...initialNewStudent, branch: loggedInCampus });
      setNewStuCustomSlots([]);
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
      // Refetch full list and dashboard from server immediately after payment
      await triggerFreshnessRefetch();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to submit payment.');
    } finally {
      setIsProcessingUpload(false);
    }
  };




  const handleDownloadPDF = (receipt: Receipt, student: Student) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast('Popup blocked by browser.');
      return;
    }

    const receiptWords = numberToReceiptWords(receipt.amount);
    const studentClass = student.course || student.branch || 'Junior College';
    const studentSection = student.section || 'N/A';
    const studentRoll = student.rollNumber || student.studentId || student.admissionNumber;
    const receiptAmount = `Rs. ${receipt.amount.toLocaleString('en-IN')}`;
    const receiptBalance = `Rs. ${receipt.balance.toLocaleString('en-IN')}`;
    const txnRefDisplay = receipt.transactionRef || receipt.referenceNo || receipt.receiptNumber;
    const receiptHtml = `
      <html>
      <head>
        <title>Receipt ${escapeHtml(receipt.receiptNumber)}</title>
        <style>
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; background: var(--surface); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { width: 210mm; height: 297mm; box-sizing: border-box; padding: 8mm 9mm 7mm; display: flex; flex-direction: column; gap: 4mm; background: #fff; }
          .copy { flex: 1 1 0; border: 1.2px solid #E7D39A; border-radius: 14px; padding: 10px 11px 9px; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; background: #fffdf8; overflow: hidden; }
          .copy-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
          .copy-tag { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--warning); font-weight: 900; background: #FFF6DB; border: 1px solid #E7D39A; border-radius: 999px; padding: 4px 8px; }
          .header { text-align: center; border-bottom: 2px solid var(--accent); padding-bottom: 8px; margin-bottom: 6px; }
          .brand-logo { height: 50px; width: auto; object-fit: contain; margin: 0 auto 4px; display: block; }
          .brand-name { font-size: 18px; font-weight: 900; color: #8F6A00; text-transform: uppercase; letter-spacing: 0.08em; line-height: 1.1; margin: 0; }
          .receipt-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; border-top: 1px dashed var(--line); padding-top: 4px; }
          .receipt-title { font-size: 13px; font-weight: 900; color: var(--ink); letter-spacing: 0.08em; text-transform: uppercase; }
          .receipt-number { font-size: 9px; font-weight: 800; color: var(--warning); }
          .receipt-date { font-size: 8.5px; color: var(--ink-secondary); }
          .section-title { font-size: 9px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: var(--warning); margin-bottom: 5px; }
          .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
          .field { display: flex; flex-direction: column; gap: 2px; padding: 5px 6px; border: 1px solid var(--line); border-radius: 99px; background: var(--surface); padding-left: 10px; }
          .label { font-size: 8px; text-transform: uppercase; color: var(--warning); font-weight: 800; letter-spacing: 0.05em; }
          .value { font-size: 11px; font-weight: 800; color: var(--ink); line-height: 1.2; word-break: break-word; }
          .amount-wrap { display: flex; gap: 8px; align-items: stretch; }
          .amount-box { flex: 0 0 47%; background: linear-gradient(180deg, #FFF9E6 0%, #FFF2C7 100%); border: 1.4px solid var(--accent); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; }
          .amount-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: var(--warning); }
          .amount-value { font-size: 18px; font-weight: 900; color: var(--warning); margin-top: 4px; line-height: 1; }
          .amount-words { flex: 1 1 auto; border: 1.2px solid var(--line); border-radius: 12px; padding: 10px; background: #fff; display: flex; flex-direction: column; justify-content: center; }
          .words-text { font-size: 11px; font-weight: 800; color: var(--ink); line-height: 1.35; }
          .balance-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; font-size: 9px; color: var(--ink-secondary); }
          .table-wrap { border: 1.2px solid var(--line); border-radius: 12px; overflow: hidden; background: #fff; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid var(--line); padding: 6px 7px; text-align: left; vertical-align: top; }
          th { background: #FFF6DB; color: var(--warning); font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 900; }
          td { font-size: 10px; color: var(--ink); font-weight: 700; }
          tr:last-child td { border-bottom: none; }
          .footer { margin-top: auto; padding-top: 7px; border-top: 1px dashed var(--accent); display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; }
          .footer-note { font-size: 8.5px; color: var(--ink-secondary); line-height: 1.35; max-width: 68%; }
          .signature { min-width: 24%; text-align: right; }
          .signature-line { height: 20px; border-bottom: 1px solid var(--ink); margin-bottom: 4px; }
          .signature-label { font-size: 8px; font-weight: 800; color: var(--ink); text-transform: uppercase; letter-spacing: 0.08em; }
          .cut-line { border-top: 2px dashed #B88900; margin: 0 4px; }
          .no-print { display: inline-flex; align-self: center; margin-bottom: 2mm; }
          .print-btn { padding: 11px 18px; background: linear-gradient(180deg, #F9E6A8 0%, var(--accent) 100%); border: 1px solid #C79A15; border-radius: 12px; color: var(--ink); font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(212,175,55,0.18); }
          @media print {
            .no-print { display: none !important; }
            .page { padding: 0; gap: 0; }
            .copy { border-radius: 0; border-left: none; border-right: none; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="no-print">
            <button onclick="window.print()" class="print-btn">Print Receipt Now</button>
          </div>
          <div class="copy">
            <div class="copy-top">
              <div class="copy-tag">Parent Copy</div>
              <div style="width: 68px;"></div>
            </div>
            <div class="header">
              <img src="${collegeLogo}" alt="Institution Logo" class="brand-logo" />
              <div class="brand-name">INSPIRE JUNIOR COLLEGE</div>
              <div class="receipt-meta">
                <div class="receipt-title">Payment Receipt</div>
                <div class="receipt-number">Receipt No. ${escapeHtml(receipt.receiptNumber)}</div>
                <div class="receipt-date">Date: ${escapeHtml(receipt.date)}</div>
              </div>
            </div>
            <div>
              <div class="section-title">Student Details</div>
              <div class="student-grid">
                <div class="field"><span class="label">Student Name</span><span class="value">${escapeHtml(student.name)}</span></div>
                <div class="field"><span class="label">Roll / ID No.</span><span class="value">${escapeHtml(studentRoll)}</span></div>
                <div class="field"><span class="label">Course / Class</span><span class="value">${escapeHtml(studentClass)}</span></div>
                <div class="field"><span class="label">Section</span><span class="value">${escapeHtml(studentSection)}</span></div>
                <div class="field"><span class="label">Mobile</span><span class="value">${escapeHtml(student.mobile)}</span></div>
                <div class="field"><span class="label">Admission No.</span><span class="value">${escapeHtml(student.admissionNumber)}</span></div>
              </div>
            </div>
            <div class="amount-wrap">
              <div class="amount-box">
                <div class="amount-label">Amount Paid</div>
                <div class="amount-value">${receiptAmount}</div>
                <div class="balance-row" style="margin-top: 10px;">
                  <span>Remaining Balance</span>
                  <strong>${receiptBalance}</strong>
                </div>
              </div>
              <div class="amount-words">
                <div class="amount-label">Amount in Words</div>
                <div class="words-text" style="margin-top: 5px;">${escapeHtml(receiptWords)}</div>
                <div class="balance-row" style="margin-top: 12px;">
                  <span>Payment Mode</span>
                  <strong>${escapeHtml(receipt.mode)}</strong>
                </div>
              </div>
            </div>
            <div>
              <div class="section-title">Particulars</div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 38%;">Description</th>
                      <th style="width: 20%;">Payment Type</th>
                      <th style="width: 26%;">Transaction / UPI Ref No.</th>
                      <th style="width: 16%; text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${escapeHtml(`${receipt.category} - ${receipt.installment}`)}</td>
                      <td>${escapeHtml(receipt.mode)}</td>
                      <td>${escapeHtml(txnRefDisplay)}</td>
                      <td style="text-align: right;">${receiptAmount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="footer">
              <div class="footer-note">
                Thank you for your payment. This is a computer-generated receipt.
                <div style="margin-top: 6px;">Cashier: ${escapeHtml(receipt.cashier)}</div>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-label">Authorized Signature</div>
              </div>
            </div>
          </div>
          <div class="cut-line"></div>
          <div class="copy">
            <div class="copy-top">
              <div class="copy-tag">Campus Copy</div>
              <div style="width: 68px;"></div>
            </div>
            <div class="header">
              <img src="${collegeLogo}" alt="Institution Logo" class="brand-logo" />
              <div class="brand-name">INSPIRE JUNIOR COLLEGE</div>
              <div class="receipt-meta">
                <div class="receipt-title">Payment Receipt</div>
                <div class="receipt-number">Receipt No. ${escapeHtml(receipt.receiptNumber)}</div>
                <div class="receipt-date">Date: ${escapeHtml(receipt.date)}</div>
              </div>
            </div>
            <div>
              <div class="section-title">Student Details</div>
              <div class="student-grid">
                <div class="field"><span class="label">Student Name</span><span class="value">${escapeHtml(student.name)}</span></div>
                <div class="field"><span class="label">Roll / ID No.</span><span class="value">${escapeHtml(studentRoll)}</span></div>
                <div class="field"><span class="label">Course / Class</span><span class="value">${escapeHtml(studentClass)}</span></div>
                <div class="field"><span class="label">Section</span><span class="value">${escapeHtml(studentSection)}</span></div>
                <div class="field"><span class="label">Mobile</span><span class="value">${escapeHtml(student.mobile)}</span></div>
                <div class="field"><span class="label">Admission No.</span><span class="value">${escapeHtml(student.admissionNumber)}</span></div>
              </div>
            </div>
            <div class="amount-wrap">
              <div class="amount-box">
                <div class="amount-label">Amount Paid</div>
                <div class="amount-value">${receiptAmount}</div>
                <div class="balance-row" style="margin-top: 10px;">
                  <span>Remaining Balance</span>
                  <strong>${receiptBalance}</strong>
                </div>
              </div>
              <div class="amount-words">
                <div class="amount-label">Amount in Words</div>
                <div class="words-text" style="margin-top: 5px;">${escapeHtml(receiptWords)}</div>
                <div class="balance-row" style="margin-top: 12px;">
                  <span>Payment Mode</span>
                  <strong>${escapeHtml(receipt.mode)}</strong>
                </div>
              </div>
            </div>
            <div>
              <div class="section-title">Particulars</div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 38%;">Description</th>
                      <th style="width: 20%;">Payment Type</th>
                      <th style="width: 26%;">Transaction / UPI Ref No.</th>
                      <th style="width: 16%; text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${escapeHtml(`${receipt.category} - ${receipt.installment}`)}</td>
                      <td>${escapeHtml(receipt.mode)}</td>
                      <td>${escapeHtml(txnRefDisplay)}</td>
                      <td style="text-align: right;">${receiptAmount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="footer">
              <div class="footer-note">
                Thank you for your payment. This is a computer-generated receipt.
                <div style="margin-top: 6px;">Cashier: ${escapeHtml(receipt.cashier)}</div>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-label">Authorized Signature</div>
              </div>
            </div>
          </div>
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
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    triggerToast('PDF receipt opened in a new tab.');
  };

  const handleDownloadStudentStatement = (student: Student) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast('Popup blocked by browser. Please allow popups to download the statement.');
      return;
    }

    const generatedDate = new Date().toLocaleString('en-IN');
    const customSlots: Array<[string, number]> = ((student as any).customFeeSlots || []).map((s: any) => [s.name, Number(s.amount || 0)]);
    const allFeeRows: Array<[string, number]> = [
      ['Tuition Fee', Number(student.tuitionFee || 0)],
      ['Hostel Fee', Number(student.hostelFee || 0)],
      ['Miscellaneous Fee', Number(student.miscellaneousFee || 0)],
      ['Previous Pending', Number(student.previousPending || 0)],
      ['Books Fee', Number((student as any).booksFee || 0)],
      ['Uniform Fee', Number((student as any).uniformFees || 0)],
      ['Internal Exam Fee', Number((student as any).internalExamFees || 0)],
      ['Annual Exam Fee', Number((student as any).annualExamFees || 0)],
      ['Lab Fee', Number((student as any).labFees || 0)],
      ['Bus Fee', Number((student as any).busFees || 0)],
      ...customSlots
    ];
    const feeRows = allFeeRows.filter(([, amount]) => amount > 0);

    const tuitionWaiver = Number((student as any).tuitionWaiver || 0);
    const hostelWaiver = Number((student as any).hostelWaiver || 0);
    const transportWaiver = Number((student as any).transportWaiver || 0);
    const miscWaiver = Number((student as any).miscWaiver || 0);
    const overrideDeduction = Number((student as any).individualOverrideDeduction || (student as any).scholarshipDeduction || 0);

    const allWaiverRows: Array<[string, number]> = [
      ['Tuition Waiver', tuitionWaiver],
      ['Hostel Waiver', hostelWaiver],
      ['Transport Waiver', transportWaiver],
      ['Miscellaneous Waiver', miscWaiver]
    ];
    if (overrideDeduction > 0 && tuitionWaiver === 0 && hostelWaiver === 0 && miscWaiver === 0) {
      allWaiverRows.push(['Special Scholarship Waiver', overrideDeduction]);
    }
    const waiverRows = allWaiverRows.filter(([, amount]) => amount > 0);
    const totalWaiver = waiverRows.reduce((sum, [, amount]) => sum + amount, 0);

    const totalBaseFee = feeRows.reduce((total, [, amount]) => total + amount, 0) || Number((student as any).totalBaseFee || (student as any).calculatedFee || student.tuitionFee || 0);
    const totalPaid = Number(student.totalPaid || 0);
    const remaining = Number(student.remainingBalance ?? Math.max(0, totalBaseFee - totalWaiver - totalPaid));
    const receipts = [...(student.receipts || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const feeTableRows = feeRows.length > 0
      ? feeRows.map(([label, amount]) => `<tr><td>${escapeHtml(label)}</td><td class="tr">Rs. ${amount.toLocaleString('en-IN')}</td></tr>`).join('')
      : `<tr><td>Baseline Academic Course Fee</td><td class="tr">Rs. ${totalBaseFee.toLocaleString('en-IN')}</td></tr>`;

    const waiverTableRows = waiverRows.map(([label, amount]) =>
      `<tr class="wr" style="background:var(--good-wash);color:var(--good);font-weight:800;"><td>${escapeHtml(label)}</td><td class="tr" style="color:var(--good);">&minus; Rs. ${amount.toLocaleString('en-IN')}</td></tr>`
    ).join('');

    const receiptLogRows = receipts.length > 0
      ? receipts.map(r => `
          <tr>
            <td><strong>${escapeHtml(r.receiptNumber)}</strong></td>
            <td>${escapeHtml(r.date)}</td>
            <td>${escapeHtml(r.category || 'Tuition')} &middot; ${escapeHtml(r.installment || 'Installment')}</td>
            <td>${escapeHtml(r.mode || 'Cash')}</td>
            <td class="tr" style="color:var(--good);font-weight:900;">Rs. ${Number(r.amount || 0).toLocaleString('en-IN')}</td>
            <td class="tr" style="font-weight:800;color:var(--ink);">Rs. ${Number(r.balance || 0).toLocaleString('en-IN')}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="6" style="text-align:center;color:var(--ink-muted);padding:12px;">No payment receipts logged yet.</td></tr>`;

    const css = `@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#fff;font-family:'Inter','Segoe UI',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:11px}.page{max-width:182mm;margin:0 auto;padding:4px}.hdr{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;background:linear-gradient(135deg,var(--ink),var(--ink));border-radius:14px;margin-bottom:16px;border-bottom:3px solid var(--accent)}.brand{display:flex;align-items:center;gap:12px}.logo{width:42px;height:42px;object-fit:contain;background:#fff;border-radius:10px;padding:4px;border:1px solid var(--accent)}.iname{color:#fff;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.iaddr{color:var(--ink-muted);font-size:9.5px;line-height:1.3;margin-top:2px}.slbl strong{display:block;color:#fff;font-size:15px;font-weight:900;text-transform:uppercase;text-align:right}.slbl span{color:var(--warning);font-size:9.5px;font-weight:800;text-transform:uppercase}.scard{background:var(--surface-sunken);border:1.5px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.fl{font-size:8.5px;font-weight:800;color:var(--ink-secondary);text-transform:uppercase;display:block}.fv{font-size:12.5px;font-weight:800;color:var(--ink);display:block;margin-top:3px}.stit{font-size:9.5px;font-weight:900;color:var(--ink);text-transform:uppercase;letter-spacing:.08em;margin:16px 0 8px;border-bottom:1.5px solid var(--line);padding-bottom:4px}.ftbl{width:100%;border-collapse:collapse;border:1.5px solid var(--line-strong);border-radius:10px;overflow:hidden;font-size:11px}.ftbl th{padding:8px 10px;background:var(--surface-sunken);color:var(--ink-secondary);font-size:8.5px;text-transform:uppercase;text-align:left;border-bottom:1.5px solid var(--line-strong);font-weight:800}.ftbl td{padding:8px 10px;border-bottom:1px solid var(--line)}.ftbl tr:last-child td{border-bottom:none}.tr{text-align:right;font-weight:800}.sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.sc{border:1.5px solid var(--line);border-radius:10px;padding:12px 14px;background:#FFF}.sc.hi{border-color:var(--accent);background:var(--surface-sunken)}.sc .sl{font-size:8.5px;font-weight:800;color:var(--ink-secondary);text-transform:uppercase}.sc .sv{font-size:16px;font-weight:900;color:var(--ink);display:block;margin-top:4px}.sc.pd .sv{color:var(--good)}.sc.hi .sv{color:var(--warning)}.ftr{margin-top:24px;padding-top:12px;border-top:1.5px dashed var(--line-strong);display:flex;justify-content:space-between;align-items:flex-end;font-size:9px;color:var(--ink-secondary)}.sig{border-top:1.5px solid var(--ink);padding-top:4px;font-size:8px;font-weight:800;color:var(--ink);text-transform:uppercase;margin-top:24px;text-align:center;width:130px}.pbtn{display:flex;align-items:center;justify-content:center;margin:0 auto 16px;padding:10px 24px;background:linear-gradient(135deg,var(--ink),var(--ink));color:#fff;border:none;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer}@media print{.pbtn{display:none}}`;

    const statementHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fee Statement - ${escapeHtml(student.admissionNumber || student.name)}</title><style>${css}</style></head><body><div class="page">
      <button class="pbtn" onclick="window.print()">Print Complete Fee Statement PDF</button>
      <div class="hdr">
        <div class="brand">
          <img class="logo" src="${collegeLogo}" alt="Logo"/>
          <div>
            <div class="iname">${RECEIPT_INSTITUTION_NAME}</div>
            <div class="iaddr">Campus: ${escapeHtml(student.branch || loggedInCampus)} &middot; Complete Financial Statement</div>
          </div>
        </div>
        <div class="slbl">
          <strong>Fee Statement</strong>
          <span>Adm No: ${escapeHtml(student.admissionNumber || (student as any).studentId || 'N/A')}</span>
        </div>
      </div>
      <div class="scard">
        <div><span class="fl">Student Name</span><span class="fv">${escapeHtml(student.name)}</span></div>
        <div><span class="fl">Admission No.</span><span class="fv">${escapeHtml(student.admissionNumber || (student as any).studentId || 'N/A')}</span></div>
        <div><span class="fl">Course / Section</span><span class="fv">${escapeHtml(student.course || 'N/A')} &mdash; ${escapeHtml(student.section || 'N/A')}</span></div>
        <div><span class="fl">Father's Name</span><span class="fv">${escapeHtml(student.fatherName || 'N/A')}</span></div>
        <div><span class="fl">Contact Mobile</span><span class="fv">${escapeHtml(student.mobile || 'N/A')}</span></div>
        <div><span class="fl">Hostel Status</span><span class="fv">${escapeHtml(student.hostelStatus || 'Day Scholar')}</span></div>
      </div>
      <div class="stit">Baseline Fee Structure & Applied Waivers</div>
      <table class="ftbl">
        <thead><tr><th>Fee Component / Particulars</th><th class="tr">Amount</th></tr></thead>
        <tbody>${feeTableRows}${waiverTableRows}</tbody>
      </table>
      <div class="sgrid">
        <div class="sc"><span class="sl">Gross Base Fee</span><span class="sv">Rs. ${totalBaseFee.toLocaleString('en-IN')}</span></div>
        <div class="sc" style="border-color:var(--good); background:var(--good-wash);"><span class="sl" style="color:var(--good);">Waivers Applied</span><span class="sv" style="color:var(--good);">- Rs. ${totalWaiver.toLocaleString('en-IN')}</span></div>
        <div class="sc"><span class="sl" style="color:var(--good)">Total Paid</span><span class="sv" style="color:var(--good)">Rs. ${totalPaid.toLocaleString('en-IN')}</span></div>
        <div class="sc hi"><span class="sl" style="color:var(--warning)">Outstanding Balance</span><span class="sv" style="color:var(--warning)">Rs. ${remaining.toLocaleString('en-IN')}</span></div>
      </div>
      <div class="stit">Complete Receipt & Payment Transaction History</div>
      <table class="ftbl">
        <thead><tr><th>Receipt No.</th><th>Date</th><th>Category & Installment</th><th>Payment Mode</th><th class="tr">Amount Paid</th><th class="tr">Balance After</th></tr></thead>
        <tbody>${receiptLogRows}</tbody>
      </table>
      <div class="ftr">
        <div><div><strong>Generated On:</strong> ${escapeHtml(generatedDate)}</div><div style="margin-top:3px">Computer-generated official statement &middot; Verified via Inspire College ERP System</div></div>
        <div class="sig">Authorized Signatory</div>
      </div>
    </div>
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>
    </body></html>`;
    printWindow.document.write(statementHtml);
    printWindow.document.close();
    printWindow.focus();
    triggerToast('Complete fee statement opened for printing/download.');
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
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--warning)', letterSpacing: '0.04em' }}>
            Processing & Uploading...
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 600 }}>
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
                <p style={{ fontSize: '11px', color: 'var(--ink-secondary)', margin: 0 }}>
                  Campus: <strong>{loggedInCampus}</strong> (Locked) | Adm No: <strong>{selectedStudent.admissionNumber || 'N/A'}</strong>
                </p>
              </div>
              <button
                onClick={() => { setIsStudentModalOpen(false); setSelectedStudent(null); setEditStudent(null); }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted-gray)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary Stats Header Bar */}
              <div style={{ ...styles.readOnlyBlock, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div><span style={{ fontSize: '10px', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Student Name</span><strong style={{ fontSize: '13px', color: 'var(--dark-charcoal)' }}>{selectedStudent.name || 'N/A'}</strong></div>
                <div><span style={{ fontSize: '10px', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Adm Number</span><strong style={{ fontSize: '13px', color: 'var(--dark-charcoal)' }}>{selectedStudent.admissionNumber || 'N/A'}</strong></div>
                <div><span style={{ fontSize: '10px', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Campus</span><strong style={{ fontSize: '13px', color: 'var(--good)' }}>{loggedInCampus}</strong></div>
                <div><span style={{ fontSize: '10px', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Gross Total Fee</span><strong style={{ fontSize: '13px', color: 'var(--dark-charcoal)' }}>Rs.{((editStudent.tuitionFee || 0) + (editStudent.hostelFee || 0) + (editStudent.transportFee || 0) + (editStudent.miscellaneousFee || 0) + (editStudent.previousPending || 0) + ((editStudent.customFeeSlots || []).reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0))).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ fontSize: '10px', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total Paid</span><strong style={{ fontSize: '13px', color: 'var(--good)' }}>Rs.{(selectedStudent.totalPaid || 0).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ fontSize: '10px', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Remaining Balance</span><strong style={{ fontSize: '13px', color: selectedStudent.remainingBalance > 0 ? 'var(--critical)' : 'var(--good)' }}>Rs.{(selectedStudent.remainingBalance || 0).toLocaleString('en-IN')}</strong></div>
              </div>

              {/* Section 1: Personal & Academic Details */}
              <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 800, color: 'var(--dark-charcoal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                   Profile & Personal Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
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
              <button onClick={() => setIsStuOtpModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--dark-charcoal)', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
              Are you sure you want to update student details for <strong>{editStudent.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsStuOtpModalOpen(false)} style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }} className="press-interactive">
                Cancel
              </button>
              <button
                onClick={() => handleStudentSave(editStudent, undefined)}
                style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'var(--royal-gold)', color: '#000', fontWeight: 800 }}
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
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  INSPIRE JUNIOR COLLEGE • ACCOUNTANT STUDENT ADMISSION
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 900, color: 'var(--ink)' }}>
                  {newStuFormPage === 1 ? 'Screen 1 of 3: Basic Academic Information' : newStuFormPage === 2 ? 'Screen 2 of 3: Personal & Family Information' : 'Screen 3 of 3: Fee Structure & Bill Format'}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, backgroundColor: newStuFormPage === 1 ? 'var(--ink)' : 'var(--line)', color: newStuFormPage === 1 ? 'var(--surface)' : 'var(--ink-secondary)' }}>1. Basic Info</span>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, backgroundColor: newStuFormPage === 2 ? 'var(--ink)' : 'var(--line)', color: newStuFormPage === 2 ? 'var(--surface)' : 'var(--ink-secondary)' }}>2. Personal & Family</span>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, backgroundColor: newStuFormPage === 3 ? 'var(--ink)' : 'var(--line)', color: newStuFormPage === 3 ? 'var(--surface)' : 'var(--ink-secondary)' }}>3. Fee Structure</span>
                </div>
                <button onClick={() => { setIsAddStudentModalOpen(false); setNewStudentAdmissionError(''); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted-gray)' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '10px 4px' }}>
              {newStuFormPage === 1 ? (
                <div>
                  {/* Screen 1: Basic Information */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)', paddingBottom: '4px', marginBottom: '12px' }}>
                      1. Basic Academic Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={styles.formLabel}>Admission Number *</label>
                        <input maxLength={LIMITS.admissionNumber}
                          type="text"
                          placeholder="e.g. 2400101"
                          value={newStudentData.admissionNumber}
                          onChange={(e) => { setNewStudentData({ ...newStudentData, admissionNumber: e.target.value }); setNewStudentAdmissionError(''); }}
                          style={{ ...styles.textInputBox, borderColor: newStudentAdmissionError ? 'var(--critical)' : undefined }}
                        />
                        {newStudentAdmissionError && <span style={{ color: 'var(--critical)', fontSize: '11px', fontWeight: 700 }}>{newStudentAdmissionError}</span>}
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
                          placeholder="10-digit mobile"
                          value={newStudentData.mobile}
                          onChange={(e) => setNewStudentData({ ...newStudentData, mobile: e.target.value })}
                          style={styles.textInputBox}
                        />
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
                      onClick={() => {
                        if (!newStudentData.name.trim() || !newStudentData.admissionNumber.trim() || !newStudentData.mobile.trim()) {
                          setNewStudentAdmissionError('Admission Number, Name, and Mobile are required.');
                          triggerToast('Please fill in Admission Number, Student Name, and Mobile Number.');
                          return;
                        }
                        setNewStuFormPage(2);
                      }}
                      style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '10px 28px', backgroundColor: 'var(--ink)', color: 'var(--surface)', fontWeight: 800 }}
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
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)', paddingBottom: '4px', marginBottom: '12px' }}>
                      2. Personal & Family Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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
                        <input maxLength={LIMITS.mobile} type="text" placeholder="e.g. 9876543210" value={newStudentData.parentMobile} onChange={(e) => setNewStudentData({ ...newStudentData, parentMobile: e.target.value })} style={styles.textInputBox} />
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
                      onClick={() => setNewStuFormPage(3)}
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
                        <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          INSPIRE JUNIOR COLLEGE
                        </span>
                        <h4 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 900, color: 'var(--ink)' }}>
                          Fee Structure & Bill Format
                        </h4>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--good)', backgroundColor: 'var(--good-wash)', padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--good-wash)' }}>
                        Gross Base Fee: Rs.{(
                          (Number(newStudentData.tuitionFee) || 0) +
                          (Number(newStudentData.hostelFee) || 0) +
                          (Number(newStudentData.miscellaneousFee) || 0) +
                          newStuCustomSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
                        ).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
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
                              {slot.name} <span style={{ fontSize: '9px', color: 'var(--royal-gold)', fontWeight: 800 }}>(Custom)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveNewStuCustomSlot(slot.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--critical)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
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
                          style={{ ...styles.textInputBox, flex: 2, fontSize: '12px' }}
                        />
                        <input min={0} max={999999999}
                          type="number"
                          placeholder="Amount (Rs)"
                          value={newStuSlotAmount}
                          onChange={(e) => setNewStuSlotAmount(e.target.value)}
                          style={{ ...styles.textInputBox, flex: 1, fontSize: '12px' }}
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
                          color: 'var(--warning)',
                          fontSize: '11.5px',
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
              <button onClick={() => { setIsRegStuOtpModalOpen(false); setRegStuOtpInput(''); setRegStuError(''); }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--dark-charcoal)', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
              Are you sure you want to register student <strong>{newStudentData.name || '—'}</strong> (Admission No: <strong>{newStudentData.admissionNumber || '—'}</strong>)?
            </p>
            {regStuError && <div style={{ color: 'var(--critical)', fontSize: '11px', fontWeight: 700, marginBottom: '8px', padding: '8px 12px', background: 'rgba(220,38,38,0.05)', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.2)' }}>{regStuError}</div>}
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
              <button onClick={() => { setIsDeleteConfirmModalOpen(false); setStudentToDelete(null); setDeleteOtpInput(''); }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
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
                setNewStudentData({ ...initialNewStudent, branch: loggedInCampus });
                setNewStudentAdmissionError('');
                setNewStuFormPage(1);
                setIsAddStudentModalOpen(true);
              }}
              style={{
                ...styles.actionItemBtn,
                backgroundColor: 'var(--good)',
                color: 'var(--surface)',
                border: 'none',
                fontWeight: 900,
                fontSize: '12px',
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
                  placeholder="Search Student by Name, ID, Adm No, Roll No, Phone..."
                  value={searchAdmNo}
                  onChange={(e) => setSearchAdmNo(e.target.value)}
                  style={{ ...styles.textInputBox, fontSize: '13px', padding: '12px 14px' }}
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
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                >
                  Clear Search
                </button>
              )}
              <div style={{ fontSize: '12px', color: 'var(--muted-gray)', fontWeight: 700, padding: '0 8px' }}>
                Showing <strong>{filteredSearchList.length}</strong> Students
              </div>
            </div>

            {/* STUDENT BOXES GRID */}
            {(() => {
              const REGISTRY_PER_PAGE = 30;
              const totalPages = Math.max(1, Math.ceil(filteredSearchList.length / REGISTRY_PER_PAGE));
              const currentPage = Math.min(registryPage, totalPages);
              const paginated = filteredSearchList.slice((currentPage - 1) * REGISTRY_PER_PAGE, currentPage * REGISTRY_PER_PAGE);
              return (<>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '4px' }}>
                  <button onClick={() => setRegistryPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: currentPage === 1 ? 'var(--surface-sunken)' : '#fff', color: currentPage === 1 ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '12px', cursor: currentPage === 1 ? 'default' : 'pointer' }}>
                    ←  Prev
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>Page {currentPage} / {totalPages}</span>
                  <button onClick={() => setRegistryPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: currentPage === totalPages ? 'var(--surface-sunken)' : '#fff', color: currentPage === totalPages ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '12px', cursor: currentPage === totalPages ? 'default' : 'pointer' }}>
                    Next ← ’
                  </button>
                </div>
              )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
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
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
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
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: isResident ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isResident ? 'var(--warning)' : 'var(--good)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {(s.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '15px', color: 'var(--dark-charcoal)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.name}
                          </strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '2px', fontWeight: 600 }}>
                          Adm: <span style={{ color: 'var(--ink)', fontWeight: 800 }}>{s.admissionNumber || s.studentId}</span>  Roll: <span style={{ color: 'var(--ink)', fontWeight: 800 }}>{s.rollNumber || s.studentId}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                          {s.branch || loggedInCampus} ({s.course || 'MPC'}{s.section ? ` - ${s.section}` : ''})
                        </div>
                      </div>
                    </div>

                    {/* Middle Info Row: Contact & Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--surface-sunken)', padding: '10px 12px', borderRadius: '10px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-secondary)' }}>
                        <span>Student Mob: <strong>{s.mobile || 'N/A'}</strong></span>
                        <span>Parent: <strong>{s.parentMobile || 'N/A'}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '10px',
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800 }}>
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
                          color: 'var(--warning)',
                          backgroundColor: 'var(--surface-sunken)',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '11px',
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
                          fontSize: '11px',
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
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--muted-gray)', fontSize: '13px', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '16px' }}>
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
    const filteredCollectList = students.filter((student) => matchesStudentSearch(student, feeCollectAdm));

    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('gold')}
        <header style={styles.header}>
          <button onClick={() => { setActiveSubPage('menu'); setSelectedStudent(null); setEditStudent(null); setFeeCollectAdm(''); }} style={styles.backArrowBtn} className="press-interactive">
             Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Fee Collection Desk</h1>
          <p style={styles.subtitle}>Directly search student record lists and collect term fees</p>
        </header>

        <main style={styles.content}>
          {!selectedStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
              <input maxLength={LIMITS.admissionNumber}
                type="text"
                placeholder="Search student by Name or Admission Number..."
                value={feeCollectAdm}
                onChange={(e) => setFeeCollectAdm(e.target.value)}
                style={styles.textInputBox}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {filteredCollectList.map(s => (
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
                          fontSize: '16px',
                          fontWeight: 900,
                          flexShrink: 0
                        }}>
                          {(s.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: '14px', color: 'var(--dark-charcoal)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '3px' }}>
                            Adm: {s.admissionNumber || s.studentId}  |  ID: {s.studentId || s.admissionNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                            {s.branch || loggedInCampus} ({s.course || 'MPC'}{s.section ? ` - ${s.section}` : ''})
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: s.remainingBalance > 0 ? 'var(--critical)' : 'var(--good)', whiteSpace: 'nowrap' }}>
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
                          color: 'var(--warning)',
                          backgroundColor: 'var(--surface-sunken)',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '11px',
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
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-gray)', fontSize: '12px' }}>
                    No student records match your query. Try searching by Name or Admission Number.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }} className="anim-fade-in">
              {/* Profile Bar */}
              <GlassCard hoverable={false} style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{selectedStudent.name}</h4>
                  <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                    Adm No: {selectedStudent.admissionNumber}  Roll: {selectedStudent.rollNumber || 'N/A'}  Branch: {selectedStudent.branch}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => void openStudentEditor(selectedStudent)}
                    style={{ ...styles.actionItemBtn, border: '1.5px solid var(--royal-gold)', color: 'var(--warning)', backgroundColor: 'var(--surface-sunken)' }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
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
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        INSPIRE JUNIOR COLLEGE
                      </span>
                      <h3 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 900, color: 'var(--ink)' }}>
                        Fee Structure & Bill Statement
                      </h3>
                    </div>
                    <span style={{
                      fontSize: '11px',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--surface-sunken)', paddingBottom: '6px' }}>
                      <span>Fee Section Description</span>
                      <span>Amount (Rs)</span>
                    </div>

                    {getActiveFeeSlots(selectedStudent).map((slot) => (
                      <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)' }}>
                        <span style={{ color: 'var(--ink-secondary)', fontWeight: 600 }}>
                          {slot.name}
                        </span>
                        <strong style={{ color: 'var(--ink)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          Rs.{slot.amount.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    ))}

                    {Number((selectedStudent as any).tuitionWaiver || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)', color: 'var(--good)' }}>
                        <span style={{ fontWeight: 700 }}>Tuition Waiver</span>
                        <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>- Rs.{Number((selectedStudent as any).tuitionWaiver).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {Number((selectedStudent as any).hostelWaiver || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)', color: 'var(--good)' }}>
                        <span style={{ fontWeight: 700 }}>Hostel Waiver</span>
                        <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>- Rs.{Number((selectedStudent as any).hostelWaiver).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {Number((selectedStudent as any).transportWaiver || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)', color: 'var(--good)' }}>
                        <span style={{ fontWeight: 700 }}>Transport Waiver</span>
                        <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>- Rs.{Number((selectedStudent as any).transportWaiver).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {Number((selectedStudent as any).miscWaiver || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '5px 0', borderBottom: '1px dashed var(--surface-sunken)', color: 'var(--good)' }}>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--ink-secondary)', fontWeight: 700 }}>Gross Total Base Fee</span>
                            <strong style={{ color: 'var(--ink)', fontWeight: 800 }}>Rs.{grossTotal.toLocaleString('en-IN')}</strong>
                          </div>

                          {tW > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--good)' }}>
                              <span style={{ fontWeight: 600 }}>Tuition Waiver</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{tW.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                          {hW > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--good)' }}>
                              <span style={{ fontWeight: 600 }}>Hostel Waiver</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{hW.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                          {trW > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--good)' }}>
                              <span style={{ fontWeight: 600 }}>Transport Waiver</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{trW.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                          {mW > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--good)' }}>
                              <span style={{ fontWeight: 600 }}>Miscellaneous Waiver</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{mW.toLocaleString('en-IN')}</strong>
                            </div>
                          )}

                          {totalWaivers > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--good)', borderTop: '1px dashed var(--good-wash)', paddingTop: '4px', marginTop: '2px' }}>
                              <span style={{ fontWeight: 700 }}>Total Waivers Applied</span>
                              <strong style={{ fontWeight: 900 }}>- Rs.{totalWaivers.toLocaleString('en-IN')}</strong>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--good)' }}>
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
                            <span style={{ fontSize: '12px', fontWeight: 800, color: remaining > 0 ? 'var(--warning)' : 'var(--good)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Net Remaining Balance
                            </span>
                            <strong style={{ fontSize: '18px', fontWeight: 900, color: remaining > 0 ? 'var(--warning)' : 'var(--good)', fontVariantNumeric: 'tabular-nums' }}>
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                        <button
                          onClick={() => { setPendingPayType('partial'); setPayOtpInput(''); setIsPayOtpModalOpen(true); }}
                          style={{ ...styles.sheetBtn, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }}
                          className="press-interactive"
                        >
                          Partial Pay (50%)
                        </button>
                        <button
                          onClick={() => { setPendingPayType('full'); setPayOtpInput(''); setIsPayOtpModalOpen(true); }}
                          style={{ ...styles.sheetBtn, backgroundColor: 'var(--warning-wash)', color: 'var(--warning)', border: '1px solid var(--accent)' }}
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
                        fontSize: '11px', fontWeight: 800, color: 'var(--good)',
                        backgroundColor: '#ECFDF5', border: '1.5px solid var(--good)',
                        borderRadius: '8px', padding: '5px 10px', whiteSpace: 'nowrap'
                      }}>
                        Second Year{selectedStudent.academicYear ? ` (${selectedStudent.academicYear})` : ''}
                      </span>
                    )}
                    {selectedStudent.studentYear === 'Short Term' && (
                      <span style={{
                        fontSize: '11px', fontWeight: 800, color: 'var(--ink-secondary)',
                        backgroundColor: 'var(--surface-sunken)', border: '1.5px solid var(--line-strong)',
                        borderRadius: '8px', padding: '5px 10px', whiteSpace: 'nowrap'
                      }}>
                        Short Term
                      </span>
                    )}

                    <button onClick={() => handleDownloadStudentStatement(selectedStudent)} style={{ ...styles.actionItemBtn, border: '1.5px solid var(--royal-gold)', backgroundColor: '#FFF8DB', color: 'var(--warning)', fontWeight: 900, whiteSpace: 'nowrap' }} className="press-interactive">Download Complete Statement</button>
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
                      <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>
                        {h.studentYear} completed{h.academicYear ? ` — ${h.academicYear}` : ''}
                      </strong>
                      <div style={{ fontSize: '10px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                        Closed {h.closedAt ? new Date(h.closedAt).toLocaleDateString('en-GB') : 'n/a'}
                        {h.closedBy ? ` by ${h.closedBy}` : ''}
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--good)' }}>
                      Rs.{Number(h.totalPaid || 0).toLocaleString('en-IN')} paid
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {selectedStudent.feeAdjustments?.map((adjustment) => (
                    <div key={adjustment._id || adjustment.id || adjustment.createdAt} style={{ ...styles.receiptRowItem, borderColor: 'var(--warning)', backgroundColor: 'var(--warning-wash)' }}>
                      <div>
                        <strong style={{ fontSize: '13px', color: 'var(--warning)' }}>Fee Structure Revision</strong>
                        <div style={{ fontSize: '10px', color: 'var(--warning)', marginTop: '2px' }}>{adjustment.note || 'Baseline fee structure was updated.'}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted-gray)', marginTop: '2px' }}>Balance: Rs.{adjustment.previousBalance.toLocaleString('en-IN')}  Rs.{adjustment.updatedBalance.toLocaleString('en-IN')} {adjustment.createdAt ? `| ${new Date(adjustment.createdAt).toLocaleDateString('en-GB')}` : ''}</div>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: adjustment.amount >= 0 ? 'var(--warning)' : 'var(--good)' }}>{adjustment.amount >= 0 ? '+' : '-'}Rs.{Math.abs(adjustment.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {selectedStudent.receipts && selectedStudent.receipts.map((receipt) => (
                    <div key={receipt.receiptNumber} style={styles.receiptRowItem}>
                      <div>
                        <strong style={{ fontSize: '13px', color: 'var(--dark-charcoal)' }}>{receipt.installment} ({receipt.category})</strong>
                        <div style={{ fontSize: '10px', color: 'var(--muted-gray)', marginTop: '2px' }}>
                          Ref ID: {receipt.receiptNumber}  {new Date(receipt.date).toLocaleDateString('en-GB')}  Mode: {receipt.mode}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--good)' }}>Rs.{receipt.amount.toLocaleString('en-IN')}</span>
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
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted-gray)', fontSize: '11px' }}>
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
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted-gray)' }}
                  >
                    ×
                  </button>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--dark-charcoal)', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
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
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'var(--ink)' }}>
                  Upgrade to Second Year
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  {selectedStudent.name} · {selectedStudent.admissionNumber}
                  {upgradeInfo?.academicYear ? ` · currently ${upgradeInfo.academicYear}` : ''}
                </p>
              </div>

              <div style={{
                padding: '10px 12px', borderRadius: '10px', marginBottom: '14px',
                backgroundColor: '#ECFDF5', border: '1.5px solid var(--good)',
                fontSize: '11.5px', fontWeight: 700, color: 'var(--good)'
              }}>
                First year fully paid. Its receipts and fee structure are kept and stay
                visible in the history below.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  ['tuitionFee', 'Tuition Fee'],
                  ['hostelFee', 'Hostel Fee'],
                  ['transportFee', 'Transport Fee'],
                  ['miscellaneousFee', 'Miscellaneous Fee'],
                  ['tuitionWaiver', 'Tuition Waiver'],
                  ['hostelWaiver', 'Hostel Waiver'],
                  ['transportWaiver', 'Transport Waiver'],
                  ['miscWaiver', 'Misc Waiver']
                ].map(([key, label]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
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
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  <span>Total fees</span><span>Rs.{upgradeTotals.gross.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--good)', marginTop: '3px' }}>
                  <span>Less waivers</span><span>- Rs.{upgradeTotals.waivers.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, color: 'var(--ink)', marginTop: '8px', paddingTop: '8px', borderTop: '1.5px solid var(--line-strong)' }}>
                  <span>Payable in Second Year</span>
                  <span>Rs.{upgradeTotals.payable.toLocaleString('en-IN')}</span>
                </div>
                {upgradeTotals.waivers > upgradeTotals.gross && (
                  <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 800, color: 'var(--critical)' }}>
                    Waivers cannot exceed the total fees.
                  </div>
                )}
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
                  disabled={isUpgrading || upgradeTotals.waivers > upgradeTotals.gross}
                  style={{
                    ...styles.actionItemBtn, flex: 2,
                    border: '1.5px solid var(--good)', backgroundColor: 'var(--good)', color: '#fff',
                    fontWeight: 900,
                    opacity: (isUpgrading || upgradeTotals.waivers > upgradeTotals.gross) ? 0.6 : 1,
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
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--royal-gold)', letterSpacing: '0.04em' }}>Inspire Junior College X TRNT BEE</h4>
                    <span style={{ fontSize: '9px', color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Official Fee Receipt</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={styles.metaRow}><span>Receipt Number:</span><strong>{selectedReceipt.receiptNumber}</strong></div>
                    <div style={styles.metaRow}><span>Payment Date:</span><strong>{selectedReceipt.date}</strong></div>
                    <div style={styles.metaRow}><span>Student Name:</span><strong>{selectedStudent.name}</strong></div>
                    <div style={styles.metaRow}><span>Admission No:</span><strong>{selectedStudent.admissionNumber}</strong></div>
                    <div style={styles.metaRow}><span>Fee Category:</span><strong>{selectedReceipt.category}</strong></div>
                    <div style={styles.metaRow}><span>Amount Paid:</span><strong style={{ color: 'var(--good)', fontSize: '15px' }}>Rs.{selectedReceipt.amount.toLocaleString('en-IN')}</strong></div>
                    <div style={styles.metaRow}><span>Remaining Bal:</span><strong>Rs.{selectedReceipt.balance.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => handleDownloadPDF(selectedReceipt, selectedStudent)} style={{ ...styles.sheetBtn, backgroundColor: 'var(--royal-gold)', color: 'var(--dark-charcoal)', fontWeight: 800 }} className="press-interactive">Download PDF / Print</button>
                <button onClick={() => triggerToast('Receipt shared to registered parent mobile!')} style={{ ...styles.sheetBtn, backgroundColor: 'var(--line)', color: 'var(--dark-charcoal)' }} className="press-interactive">Share Receipt</button>
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
                  const csvRows = [
                    ['Receipt No.', 'Student Name', 'Admission No.', 'Category', 'Installment', 'Mode', 'Date', 'Amount (Rs.)'].join(','),
                    ...allTransactions.map(tx => [
                      '"' + (tx.receipt.receiptNumber || '') + '"',
                      '"' + (tx.student.name || '').replace(/"/g, '""') + '"',
                      '"' + (tx.student.admissionNumber || '') + '"',
                      '"' + (tx.receipt.category || '') + '"',
                      '"' + (tx.receipt.installment || '') + '"',
                      '"' + (tx.receipt.mode || '') + '"',
                      '"' + (tx.receipt.date || '') + '"',
                      tx.receipt.amount || 0
                    ].join(','))
                  ];
                  const csvContent = csvRows.join('\n');
                  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Audit_Report_' + loggedInCampus.replace(/\s+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.csv';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  triggerToast('Exported ' + allTransactions.length + ' transactions as Excel/CSV.');
                }}
                style={{ ...styles.sheetBtn, backgroundColor: 'var(--line)', color: 'var(--dark-charcoal)', padding: '10px 18px', borderRadius: '10px', fontWeight: 700 }}
                className="press-interactive"
              >
                 Export Excel
              </button>
              <button
                onClick={() => {
                  if (allTransactions.length === 0) { triggerToast('No transactions to export.'); return; }
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) { triggerToast('Popup blocked — please allow popups and try again.'); return; }
                  const totalAmount = allTransactions.reduce((sum, tx) => sum + Number(tx.receipt.amount || 0), 0);
                  const generatedDate = new Date().toLocaleString('en-IN');
                  const tableRows = allTransactions.map((tx, idx) =>
                    '<tr>' +
                    '<td>' + (idx + 1) + '</td>' +
                    '<td style="font-weight:800">' + escapeHtml(tx.receipt.receiptNumber) + '</td>' +
                    '<td>' + escapeHtml(tx.student.name) + '</td>' +
                    '<td>' + escapeHtml(tx.student.admissionNumber) + '</td>' +
                    '<td>' + escapeHtml(tx.receipt.category) + '</td>' +
                    '<td>' + escapeHtml(tx.receipt.installment) + '</td>' +
                    '<td>' + escapeHtml(tx.receipt.mode) + '</td>' +
                    '<td>' + escapeHtml(tx.receipt.date) + '</td>' +
                    '<td class="tr" style="font-weight:900;color:var(--good)">Rs.' + Number(tx.receipt.amount || 0).toLocaleString('en-IN') + '</td>' +
                    '</tr>'
                  ).join('');
                  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Audit Report</title><style>
                    @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#fff;font-family:'Segoe UI',sans-serif;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
                    .page{max-width:270mm;margin:0 auto;padding:0 4mm}
                    .hdr{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:linear-gradient(135deg,var(--ink),var(--ink));border-radius:12px;margin-bottom:14px}
                    .iname{color:#fff;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em}
                    .iaddr{color:var(--ink-muted);font-size:9px;margin-top:3px}
                    .slbl strong{display:block;color:#fff;font-size:13px;font-weight:900;text-align:right}
                    .slbl span{color:var(--warning);font-size:9px;font-weight:800;text-transform:uppercase}
                    .sgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
                    .sc{border:1.5px solid var(--line);border-radius:10px;padding:10px 14px;background:var(--surface-sunken)}
                    .sc .sl{font-size:8px;font-weight:800;color:var(--ink-secondary);text-transform:uppercase;letter-spacing:0.06em}
                    .sc .sv{font-size:18px;font-weight:900;color:var(--ink);display:block;margin-top:4px}
                    table{width:100%;border-collapse:collapse;border:1.5px solid var(--line);border-radius:10px;overflow:hidden;font-size:10px}
                    th{padding:8px 10px;background:var(--surface-sunken);color:var(--ink-secondary);font-size:8px;text-transform:uppercase;text-align:left;border-bottom:1.5px solid var(--line);font-weight:800;letter-spacing:0.05em}
                    td{padding:7px 10px;border-bottom:1px solid var(--surface-sunken)}
                    tr:last-child td{border-bottom:none}
                    tr:nth-child(even) td{background:#FAFBFC}
                    .tr{text-align:right}
                    .ftr{margin-top:14px;padding-top:10px;border-top:1.5px solid var(--line);display:flex;justify-content:space-between;align-items:flex-end;font-size:8px;color:var(--ink-muted)}
                    .sig{border-top:1.5px solid var(--ink);padding-top:4px;font-size:8px;font-weight:800;color:var(--ink);text-transform:uppercase;margin-top:24px;text-align:center;width:140px}
                    .pbtn{display:block;margin:0 auto 16px;padding:9px 22px;background:linear-gradient(135deg,var(--ink),var(--ink-secondary));color:#fff;border:none;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;letter-spacing:0.04em}
                    @media print{.pbtn{display:none}}
                  </style></head><body>
                  <div class="page">
                    <button class="pbtn" onclick="window.print()">&#11015; Download Audit Report PDF</button>
                    <div class="hdr">
                      <div><div class="iname">Inspire Junior College</div><div class="iaddr">Collection Audit Report &middot; Campus: ${escapeHtml(loggedInCampus)}</div></div>
                      <div class="slbl"><strong>Audit Log</strong><span>Generated: ${escapeHtml(generatedDate)}</span></div>
                    </div>
                    <div class="sgrid">
                      <div class="sc"><span class="sl">Total Transactions</span><span class="sv">${allTransactions.length}</span></div>
                      <div class="sc"><span class="sl">Total Collected</span><span class="sv" style="color:var(--good)">Rs.${totalAmount.toLocaleString('en-IN')}</span></div>
                      <div class="sc"><span class="sl">Campus</span><span class="sv" style="font-size:13px">${escapeHtml(loggedInCampus)}</span></div>
                    </div>
                    <table>
                      <thead><tr><th>#</th><th>Receipt No.</th><th>Student Name</th><th>Admission No.</th><th>Category</th><th>Installment</th><th>Mode</th><th>Date</th><th class="tr">Amount</th></tr></thead>
                      <tbody>${tableRows}</tbody>
                    </table>
                    <div class="ftr">
                      <div><div>Generated: ${escapeHtml(generatedDate)}</div><div style="margin-top:3px">Computer-generated audit report. No physical signature required.</div></div>
                      <div class="sig">Authorised Signatory</div>
                    </div>
                  </div>
                  <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script>
                  </body></html>`;
                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.focus();
                  triggerToast('PDF opened — ' + allTransactions.length + ' records.');
                }}
                style={{ ...styles.sheetBtn, backgroundColor: 'var(--royal-gold)', color: 'var(--dark-charcoal)', fontWeight: 800, padding: '10px 18px', borderRadius: '10px' }}
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
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                Showing {((auditCurrentPage - 1) * AUDIT_PER_PAGE) + 1}–{Math.min(auditCurrentPage * AUDIT_PER_PAGE, allTransactions.length)} of {allTransactions.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditCurrentPage === 1}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: auditCurrentPage === 1 ? 'var(--surface-sunken)' : '#fff', color: auditCurrentPage === 1 ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '12px', cursor: auditCurrentPage === 1 ? 'default' : 'pointer' }}>
                  ← Prev
                </button>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center' }}>Page {auditCurrentPage} / {auditTotalPages}</span>
                <button onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditCurrentPage === auditTotalPages}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: auditCurrentPage === auditTotalPages ? 'var(--surface-sunken)' : '#fff', color: auditCurrentPage === auditTotalPages ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '12px', cursor: auditCurrentPage === auditTotalPages ? 'default' : 'pointer' }}>
                  Next →
                </button>
              </div>
            </div>
          )}

          <h4 style={styles.sectionSubtitle}>Collection Audit Logs</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            {auditPagedTx.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted-gray)', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '16px' }}>
                No transactions recorded yet.
              </div>
            )}
            {auditPagedTx.map((tx, idx) => (
              <div key={idx} style={styles.receiptRowItem}>
                <div>
                  <strong>{tx.receipt.receiptNumber} — {tx.student.name}</strong>
                  <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>{tx.receipt.category} · {tx.receipt.installment} · Adm: {tx.student.admissionNumber}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 850, color: 'var(--good)' }}>+ Rs.{tx.receipt.amount.toLocaleString('en-IN')}</span>
                  <div style={{ fontSize: '8px', color: 'var(--muted-gray)' }}>{tx.receipt.date} · {tx.receipt.mode}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Pagination Controls */}
          {auditTotalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '8px' }}>
              <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditCurrentPage === 1}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid var(--line)', background: auditCurrentPage === 1 ? 'var(--surface-sunken)' : '#fff', color: auditCurrentPage === 1 ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '12px', cursor: auditCurrentPage === 1 ? 'default' : 'pointer' }}>
                ← Previous
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>Page {auditCurrentPage} of {auditTotalPages}</span>
              <button onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditCurrentPage === auditTotalPages}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid var(--line)', background: auditCurrentPage === auditTotalPages ? 'var(--surface-sunken)' : '#fff', color: auditCurrentPage === auditTotalPages ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '12px', cursor: auditCurrentPage === auditTotalPages ? 'default' : 'pointer' }}>
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
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Campus Registration Summary
              </span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--dark-charcoal)' }}>
                Total Students in {loggedInCampus}: <span style={{ color: 'var(--good)', fontSize: '20px' }}>{students.length}</span>
              </h3>
            </div>
            <div style={{
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--good)',
              fontSize: '12px',
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
          Terminate Bursar Session
        </button>

        {/* Footer */}
        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px 12px', gap: '8px', opacity: 0.85 }}>
          <InspireLogo size="sm" inPortal={true} />
          <span style={{ fontSize: '9px', color: 'var(--muted-gray)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
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
    fontSize: '18px', fontWeight: 800, color: 'var(--dark-charcoal)',
    letterSpacing: '-0.025em', lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '11.5px', color: 'var(--muted-gray)', fontWeight: 500,
    marginTop: '3px', letterSpacing: '0.005em',
  },
  content: {
    padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  parentWelcomeRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatarMini: {
    width: '42px', height: '42px', borderRadius: '10px',
    backgroundColor: 'var(--dark-charcoal)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '13px',
    fontWeight: 900, color: 'var(--royal-gold)',
    border: '1px solid rgba(212,175,55,0.25)', letterSpacing: '0.04em', flexShrink: 0,
  },
  parentWelcomeTitle: {
    fontSize: '16px', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.02em',
  },
  greetingText: {
    fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '3px',
  },
  childMetaText: { fontSize: '11px', color: 'var(--muted-gray)', fontWeight: 500, marginTop: '1px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  metricCard: {
    padding: '18px 20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.7)', border: '2px solid var(--card-border)',
    boxShadow: 'none',
  },
  metricLabel: {
    fontSize: '9.5px', fontWeight: 700, color: 'var(--muted-gray)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  metricValue: {
    fontSize: '22px', fontWeight: 900, color: 'var(--dark-charcoal)',
    letterSpacing: '-0.03em', lineHeight: 1, marginTop: '4px',
  },
  metricSub: { fontSize: '9.5px', color: 'var(--muted-gray)', fontWeight: 500, marginTop: '2px' },
  sectionTitle: {
    fontSize: '11px', fontWeight: 700, color: 'var(--muted-gray)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  sectionSubtitle: {
    fontSize: '11px', fontWeight: 700, color: 'var(--muted-gray)',
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
  moduleTitle: { fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.01em' },
  moduleDesc: { fontSize: '11px', color: 'var(--muted-gray)', lineHeight: 1.5, fontWeight: 400 },
  textInputBox: {
    flex: 1, padding: '11px 14px', borderRadius: '10px', border: '2px solid var(--card-border)',
    fontSize: '13px', outline: 'none', backgroundColor: 'rgba(255,255,255,0.7)',
    color: 'var(--dark-charcoal)', fontFamily: 'var(--font-family)', fontWeight: 500,
  },
  saveSubmitBtn: {
    padding: '13px 20px', borderRadius: '10px', backgroundColor: 'var(--dark-charcoal)',
    color: 'var(--surface)', fontFamily: 'var(--font-family)', fontSize: '12.5px', fontWeight: 700,
    border: 'none', cursor: 'pointer', textAlign: 'center', marginTop: '8px', letterSpacing: '0.01em',
  },
  readOnlyBlock: {
    padding: '16px 18px', borderRadius: '12px', border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '10px',
  },
  metaRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '12.5px', padding: '5px 0',
  },
  formLabel: {
    fontSize: '9.5px', fontWeight: 700, color: 'var(--muted-gray)', textTransform: 'uppercase',
    letterSpacing: '0.07em', display: 'block', marginBottom: '4px',
  },
  selectInput: {
    width: '100%', padding: '11px 14px', borderRadius: '10px', border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
    color: 'var(--dark-charcoal)', outline: 'none', fontFamily: 'var(--font-family)',
  },
  receiptRowItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '12px',
  },
  actionItemBtn: {
    padding: '8px 14px', borderRadius: '8px', border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '11px', fontWeight: 700,
    color: 'var(--dark-charcoal)', cursor: 'pointer', fontFamily: 'var(--font-family)',
  },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '999px',
    fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.04em',
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
    fontFamily: 'var(--font-family)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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
  toastText: { fontSize: '12px', fontWeight: 700, color: 'var(--surface)' },
  heroAvatar: {
    width: '56px', height: '56px', borderRadius: '12px', backgroundColor: 'var(--dark-charcoal)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
    fontWeight: 900, color: 'var(--royal-gold)', border: '2px solid rgba(212,175,55,0.25)',
    letterSpacing: '0.04em',
  },
  studentName: { fontSize: '16px', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.015em' },
  studentID: { fontSize: '11.5px', color: 'var(--muted-gray)', fontWeight: 500, display: 'block', marginTop: '2px' },
  heroLineDivider: { width: '100%', height: '2px', backgroundColor: 'var(--card-border)', margin: '16px 0' },
  heroMetaGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  logoutBtn: {
    width: '100%', padding: '14px', borderRadius: '10px', backgroundColor: 'transparent',
    border: '2px solid rgba(211,47,47,0.25)', color: '#D32F2F',
    fontFamily: 'var(--font-family)', fontSize: '13px', fontWeight: 700,
    cursor: 'pointer', textAlign: 'center', letterSpacing: '0.01em',
  },
  quickFillContainer: { padding: '4px 0' },
  quickFillPill: {
    fontSize: '10px', fontWeight: 700, color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.06)', border: '2px solid rgba(212,175,55,0.25)',
    borderRadius: '6px', padding: '4px 9px', cursor: 'pointer', fontFamily: 'var(--font-family)',
  },
  backArrowBtn: {
    background: 'none', border: 'none', color: 'var(--muted-gray)',
    fontFamily: 'var(--font-family)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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
  modalTitle: { fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.015em' },
};
