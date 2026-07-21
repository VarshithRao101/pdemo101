import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { LiveConnectionIndicator } from '../components/common/LiveConnectionIndicator';
import { InspireLogo } from '../components/common/InspireLogo';
import collegeLogo from '../assets/college logo.png';
import * as accountantService from '../services/accountantService';
import { onSocketEvent } from '../services/socketClient';


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
        backgroundColor: '#3B82F6',
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
        backgroundColor: '#EF4444',
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
        backgroundColor: '#FBBF24',
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
}

interface Attendee {
  id: string;
  name: string;
  type: 'student' | 'faculty';
  section?: string;
  status: 'present' | 'absent' | 'late' | 'leave';
}


// ─── MAIN CONSOLIDATED ACCOUNTANT COCKPIT VIEW ───
const RECEIPT_INSTITUTION_NAME = 'Inspire Royal Residential Junior College';
const RECEIPT_INSTITUTION_ADDRESS = '12-4-98, Gold Avenue, Saraswathi Nagar, Vijayawada, Andhra Pradesh 520008';

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

export const AccountantDashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubPage, setActiveSubPage] = useState<'menu' | 'student_search' | 'fee_collection' | 'attendance' | 'reports' | 'late_fees' | 'scholarships' | 'profile' | 'hostel'>('menu');
  const [students, setStudents] = useState<Student[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePulseKey, setLivePulseKey] = useState<'students' | 'fees' | 'attendance' | 'hostel' | 'settings' | null>(null);
  const [securityKey, setSecurityKey] = useState('');

  // Search parameters (Local Edit Buffer state)
  const [searchAdmNo, setSearchAdmNo] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // Fee collection parameters
  const [feeCollectAdm, setFeeCollectAdm] = useState('');
  const [collectAmount, setCollectAmount] = useState('');
  const [collectInstallment, setCollectInstallment] = useState('Installment 1');
  const [collectCategory, setCollectCategory] = useState('Tuition Fee');
  const [collectMode, setCollectMode] = useState('UPI / NetBanking');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  // Attendance management parameters
  const [attTab, setAttTab] = useState<'students' | 'faculty' | 'summary'>('students');
  const [selectedSection, setSelectedSection] = useState('MPC-A');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRoster, setAttendanceRoster] = useState<Attendee[]>([]);

  // Hostel blocks parameters (Moved from admin)
  const [hostelBlocks, setHostelBlocks] = useState({
    BlockA: { name: 'Block A (Boys)', capacity: 150, occupied: 120 },
    BlockB: { name: 'Block B (Girls)', capacity: 120, occupied: 98 },
    BlockC: { name: 'Block C (Girls)', capacity: 100, occupied: 65 }
  });
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [allocateBlock, setAllocateBlock] = useState('Block A');
  const [allocateRoom, setAllocateRoom] = useState('');

  // Settings & Rules parameters
  const [settings, setSettings] = useState({
    academicYear: '2026-27',
    installments: '3 Installments',
    lateFeeRules: '',
    scholarshipRules: '',
    discountRules: 'Sibling: 10% waiver'
  });
  const [editSettings, setEditSettings] = useState({
    academicYear: '2026-27',
    installments: '3 Installments',
    lateFeeRules: '',
    scholarshipRules: '',
    discountRules: 'Sibling: 10% waiver'
  });

  const [dashboardSummary, setDashboardSummary] = useState({
    collectionToday: 0,
    pendingCount: 0,
    pendingAmount: 0,
    absentCount: 0
  });


  const fetchDashboardSummary = async () => {
    try {
      const summary = await accountantService.getDashboardSummary();
      setDashboardSummary(summary);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const list = await accountantService.searchStudents('');
      setStudents(list as any);
    } catch (err) {
      console.error('Failed to load students:', err);
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

  const fetchHostelData = async () => {
    try {
      const hostelData = await accountantService.getHostelAdmissions();
      setHostelBlocks(hostelData.blocks);
      setRoomsList(hostelData.rooms);
      // Select first room of the selected block by default if available
      const blockRooms = hostelData.rooms.filter(r => r.block === allocateBlock);
      if (blockRooms.length > 0) {
        setAllocateRoom(blockRooms[0]._id);
      } else {
        setAllocateRoom('');
      }
    } catch (err) {
      console.error('Failed to load hostel data:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const lateData = await accountantService.getLateFees();
      const schData = await accountantService.getScholarships();
      const loaded = {
        academicYear: '2026-27',
        installments: '3 Installments',
        lateFeeRules: lateData.lateFeeRules,
        scholarshipRules: schData.scholarshipRules,
        discountRules: 'Sibling: 10% waiver'
      };
      setSettings(loaded);
      setEditSettings(loaded);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const refreshWithPulse = async (pulseKey: typeof livePulseKey) => {
    setLivePulseKey(pulseKey);
    try {
      const tasks: Promise<void>[] = [];
      if (pulseKey === 'students' || pulseKey === 'fees') {
        tasks.push(fetchDashboardSummary(), fetchAllStudents());
      }
      if (pulseKey === 'attendance') {
        tasks.push(fetchDashboardSummary(), fetchAttendanceRoster(attendanceDate));
      }
      if (pulseKey === 'hostel') {
        tasks.push(fetchHostelData());
      }
      if (pulseKey === 'settings') {
        tasks.push(fetchSettings(), fetchDashboardSummary());
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
  };

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
  }, []);

  useEffect(() => {
    const unsubscribers = [
      onSocketEvent('student:created', () => refreshWithPulse('students')),
      onSocketEvent('fee:updated', () => refreshWithPulse('fees')),
      onSocketEvent('attendance:updated', () => refreshWithPulse('attendance')),
      onSocketEvent('hostel:updated', () => refreshWithPulse('hostel')),
      onSocketEvent('fee-settings:updated', () => refreshWithPulse('settings')),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [attendanceDate]);

  // On subpage navigation load page specific data
  useEffect(() => {
    if (activeSubPage === 'menu') {
      fetchDashboardSummary();
      fetchAllStudents();
    } else if (activeSubPage === 'hostel') {
      fetchHostelData();
    } else if (activeSubPage === 'attendance') {
      fetchAttendanceRoster(attendanceDate);
    } else if (activeSubPage === 'late_fees' || activeSubPage === 'scholarships' || activeSubPage === 'profile') {
      fetchSettings();
    }
  }, [activeSubPage]);

  // Refetch attendance when date changes
  useEffect(() => {
    if (activeSubPage === 'attendance') {
      fetchAttendanceRoster(attendanceDate);
    }
  }, [attendanceDate]);

  // Sync allocateRoom selection when block changes
  useEffect(() => {
    if (roomsList.length > 0) {
      const blockRooms = roomsList.filter(r => r.block === allocateBlock);
      if (blockRooms.length > 0) {
        setAllocateRoom(blockRooms[0]._id);
      } else {
        setAllocateRoom('');
      }
    }
  }, [allocateBlock, roomsList]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleQuickFill = async (admNo: string) => {
    setSearchAdmNo(admNo);
    setFeeCollectAdm(admNo);
    const match = students.find(s => s.admissionNumber === admNo) || null;
    if (match && match._id) {
      setIsLoading(true);
      try {
        const fullProfile = await accountantService.getStudentProfile(match._id);
        setSelectedStudent(fullProfile as any);
        setEditStudent({ ...fullProfile } as any);
        triggerToast(`Loaded ${fullProfile.name}`);
      } catch (err: any) {
        triggerToast('Failed to load profile.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSearchSubmit = async () => {
    if (!searchAdmNo) {
      triggerToast('Please type an Admission Number.');
      return;
    }
    setIsLoading(true);
    try {
      const list = await accountantService.searchStudents(searchAdmNo);
      if (list.length > 0) {
        const match = list[0];
        const fullProfile = await accountantService.getStudentProfile(match._id);
        setSelectedStudent(fullProfile as any);
        setEditStudent({ ...fullProfile } as any);
        triggerToast('Student loaded.');
      } else {
        triggerToast('No student found.');
        setSelectedStudent(null);
        setEditStudent(null);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error searching student.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSave = async (updated: Student) => {
    if (!updated._id) return;
    setIsLoading(true);
    try {
      const res = await accountantService.updateStudentBio(updated._id, {
        address: updated.address,
        hostelStatus: updated.hostelStatus,
        transportStatus: updated.transportStatus,
        hostelBlock: updated.hostelBlock,
        hostelRoom: updated.hostelRoom,
        residentialAddress: updated.residentialAddress
      }, securityKey);
      setSelectedStudent(res as any);
      setEditStudent({ ...res } as any);
      setStudents(prev => prev.map(s => s._id === res._id ? (res as any) : s));
      triggerToast('Profile bio updated successfully.');
      setSecurityKey('');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save changes.');
    } finally {
      setIsLoading(false);
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
      fetchDashboardSummary();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save attendance.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    setIsLoading(true);
    try {
      await accountantService.updateLateFees(editSettings.lateFeeRules);
      await accountantService.updateScholarships(editSettings.scholarshipRules);
      setSettings(editSettings);
      triggerToast('Settings changes saved successfully.');
      setActiveSubPage('menu');
      fetchDashboardSummary();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if ((window as any).logoutUser) {
      (window as any).logoutUser();
    }
  };

  const handleFeePayment = async (type: 'partial' | 'full' | 'collect') => {
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

    setIsLoading(true);
    try {
      const res = await accountantService.recordPayment(selectedStudent._id, {
        amount: paymentAmount,
        installment: collectInstallment,
        mode: collectMode,
        category: collectCategory
      }, securityKey);
      
      const updatedStudent = res.student;
      setSelectedStudent(updatedStudent as any);
      setEditStudent(updatedStudent as any);
      setStudents(prev => prev.map(s => s._id === updatedStudent._id ? (updatedStudent as any) : s));
      setCollectAmount('');
      triggerToast(`Payment logged: ₹${paymentAmount.toLocaleString('en-IN')}`);
      setSecurityKey('');
      fetchDashboardSummary();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to submit payment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Hostel assignment logic
  const handleAllocateRoom = async () => {
    if (!selectedStudent || !selectedStudent._id || !allocateRoom) {
      triggerToast('Select a student and room first.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await accountantService.allocateRoom(allocateRoom, selectedStudent._id, securityKey);
      triggerToast('Hostel room allocation changes saved successfully!');
      fetchHostelData();
      setSelectedStudent(res.student as any);
      setEditStudent({ ...res.student } as any);
      setStudents(prev => prev.map(s => s._id === res.student._id ? (res.student as any) : s));
      setSecurityKey('');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to allocate room.');
    } finally {
      setIsLoading(false);
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
    const receiptHtml = `
      <html>
      <head>
        <title>Receipt ${escapeHtml(receipt.receiptNumber)}</title>
        <style>
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; background: #ffffff; color: #1E293B; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { width: 210mm; height: 297mm; box-sizing: border-box; padding: 8mm 9mm 7mm; display: flex; flex-direction: column; gap: 4mm; background: #fff; }
          .copy { flex: 1 1 0; border: 1.2px solid #E7D39A; border-radius: 14px; padding: 10px 11px 9px; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; background: #fffdf8; overflow: hidden; }
          .copy-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
          .copy-tag { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #8B6A14; font-weight: 900; background: #FFF6DB; border: 1px solid #E7D39A; border-radius: 999px; padding: 4px 8px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; border-bottom: 1.8px solid #D4AF37; padding-bottom: 7px; }
          .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
          .brand-logo { width: 34px; height: 34px; object-fit: contain; flex: 0 0 auto; }
          .brand-copy { min-width: 0; }
          .brand-name { font-size: 14px; font-weight: 900; color: #8F6A00; text-transform: uppercase; letter-spacing: 0.06em; line-height: 1.05; }
          .brand-address { font-size: 8.5px; color: #475569; line-height: 1.25; margin-top: 2px; }
          .receipt-meta { text-align: right; min-width: 110px; }
          .receipt-title { font-size: 16px; font-weight: 900; color: #1E293B; letter-spacing: 0.12em; text-transform: uppercase; line-height: 1; }
          .receipt-number { margin-top: 4px; font-size: 9px; font-weight: 800; color: #8B6A14; }
          .receipt-date { font-size: 8.5px; color: #475569; margin-top: 2px; }
          .section-title { font-size: 9px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #8B6A14; margin-bottom: 5px; }
          .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
          .field { display: flex; flex-direction: column; gap: 2px; padding: 5px 6px; border: 1px solid #EADFBF; border-radius: 9px; background: #FFFFFF; }
          .label { font-size: 8px; text-transform: uppercase; color: #8B6A14; font-weight: 800; letter-spacing: 0.05em; }
          .value { font-size: 11px; font-weight: 800; color: #1E293B; line-height: 1.2; word-break: break-word; }
          .amount-wrap { display: flex; gap: 8px; align-items: stretch; }
          .amount-box { flex: 0 0 47%; background: linear-gradient(180deg, #FFF9E6 0%, #FFF2C7 100%); border: 1.4px solid #D4AF37; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; }
          .amount-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #8B6A14; }
          .amount-value { font-size: 18px; font-weight: 900; color: #7C5A00; margin-top: 4px; line-height: 1; }
          .amount-words { flex: 1 1 auto; border: 1.2px solid #EADFBF; border-radius: 12px; padding: 10px; background: #fff; display: flex; flex-direction: column; justify-content: center; }
          .words-text { font-size: 11px; font-weight: 800; color: #1E293B; line-height: 1.35; }
          .balance-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; font-size: 9px; color: #475569; }
          .table-wrap { border: 1.2px solid #EADFBF; border-radius: 12px; overflow: hidden; background: #fff; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #EADFBF; padding: 6px 7px; text-align: left; vertical-align: top; }
          th { background: #FFF6DB; color: #8B6A14; font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 900; }
          td { font-size: 10px; color: #1E293B; font-weight: 700; }
          tr:last-child td { border-bottom: none; }
          .footer { margin-top: auto; padding-top: 7px; border-top: 1px dashed #D4AF37; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; }
          .footer-note { font-size: 8.5px; color: #475569; line-height: 1.35; max-width: 68%; }
          .signature { min-width: 24%; text-align: right; }
          .signature-line { height: 20px; border-bottom: 1px solid #1E293B; margin-bottom: 4px; }
          .signature-label { font-size: 8px; font-weight: 800; color: #1E293B; text-transform: uppercase; letter-spacing: 0.08em; }
          .cut-line { border-top: 2px dashed #B88900; margin: 0 4px; }
          .no-print { display: inline-flex; align-self: center; margin-bottom: 2mm; }
          .print-btn { padding: 11px 18px; background: linear-gradient(180deg, #F9E6A8 0%, #D4AF37 100%); border: 1px solid #C79A15; border-radius: 12px; color: #1E293B; font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(212,175,55,0.18); }
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
              <div class="brand">
                <img src="${collegeLogo}" alt="Institution Logo" class="brand-logo" />
                <div class="brand-copy">
                  <div class="brand-name">${RECEIPT_INSTITUTION_NAME}</div>
                  <div class="brand-address">${RECEIPT_INSTITUTION_ADDRESS}</div>
                </div>
              </div>
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
                      <th style="width: 42%;">Description</th>
                      <th style="width: 20%;">Payment Type</th>
                      <th style="width: 22%;">Reference / Transaction ID</th>
                      <th style="width: 16%; text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${escapeHtml(`${receipt.category} - ${receipt.installment}`)}</td>
                      <td>${escapeHtml(receipt.mode)}</td>
                      <td>${escapeHtml(receipt.receiptNumber)}</td>
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
              <div class="copy-tag">Student Copy</div>
              <div style="width: 68px;"></div>
            </div>
            <div class="header">
              <div class="brand">
                <img src="${collegeLogo}" alt="Institution Logo" class="brand-logo" />
                <div class="brand-copy">
                  <div class="brand-name">${RECEIPT_INSTITUTION_NAME}</div>
                  <div class="brand-address">${RECEIPT_INSTITUTION_ADDRESS}</div>
                </div>
              </div>
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
                      <th style="width: 42%;">Description</th>
                      <th style="width: 20%;">Payment Type</th>
                      <th style="width: 22%;">Reference / Transaction ID</th>
                      <th style="width: 16%; text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${escapeHtml(`${receipt.category} - ${receipt.installment}`)}</td>
                      <td>${escapeHtml(receipt.mode)}</td>
                      <td>${escapeHtml(receipt.receiptNumber)}</td>
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

  // Stats calculations
  const feeCollectedToday = dashboardSummary.collectionToday;
  const pendingFeesTotal = dashboardSummary.pendingAmount;

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
        </div>
        <div style={styles.content}>
          <div style={{ height: 180, borderRadius: '24px' }} className="shimmer-item" />
        </div>
      </div>
    );
  }

  // ─── SUBPAGE 1: STUDENT SEARCH CONSOLE (Sub-page) ───
  if (activeSubPage === 'student_search') {
    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('emerald')}
        <header style={styles.header}>
          <button onClick={() => { setActiveSubPage('menu'); setSelectedStudent(null); setEditStudent(null); }} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Student Search Console</h1>
          <p style={styles.subtitle}>Audit student details profiles and update registration fields</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Enter Admission Number e.g. ADM24001"
                value={searchAdmNo}
                onChange={(e) => setSearchAdmNo(e.target.value)}
                style={styles.textInputBox}
              />
              <button onClick={handleSearchSubmit} style={{ ...styles.saveSubmitBtn, marginTop: 0 }} className="press-interactive">Search</button>
            </div>
            
            <div style={styles.quickFillContainer}>
              <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 700 }}>Quick Selection:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {students.map(s => (
                  <button key={s.admissionNumber} onClick={() => handleQuickFill(s.admissionNumber)} style={styles.quickFillPill} className="press-interactive">
                    {s.admissionNumber} ({s.name.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedStudent && editStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }} className="anim-fade-in">
              <div style={styles.readOnlyBlock}>
                <div style={styles.metaRow}><span>Admission Number</span><strong>{selectedStudent.admissionNumber}</strong></div>
                <div style={styles.metaRow}><span>Student ID</span><strong>{selectedStudent.studentId}</strong></div>
                <div style={styles.metaRow}><span>QR ID</span><strong>{selectedStudent.qrId}</strong></div>
                <div style={styles.metaRow}><span>Registration Number</span><strong>{selectedStudent.registrationNumber}</strong></div>
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
                    <label style={styles.formLabel}>Mobile Number</label>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    value={editStudent.email}
                    onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Correspondence Address</label>
                  <input
                    type="text"
                    value={editStudent.address}
                    onChange={(e) => setEditStudent({ ...editStudent, address: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Residential Address</label>
                  <input
                    type="text"
                    value={editStudent.residentialAddress}
                    onChange={(e) => setEditStudent({ ...editStudent, residentialAddress: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Hostel Status</label>
                    <select
                      value={editStudent.hostelStatus}
                      onChange={(e) => setEditStudent({ ...editStudent, hostelStatus: e.target.value as any })}
                      style={styles.selectInput}
                    >
                      <option value="Resident">Resident</option>
                      <option value="Day Scholar">Day Scholar</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Transport Status</label>
                    <select
                      value={editStudent.transportStatus}
                      onChange={(e) => setEditStudent({ ...editStudent, transportStatus: e.target.value as any })}
                      style={styles.selectInput}
                    >
                      <option value="College Bus">College Bus</option>
                      <option value="Self Transport">Self Transport</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
                <input
                  type="text"
                  placeholder="Enter Accountant Key (OTP) e.g. ACC-1234"
                  value={securityKey}
                  onChange={(e) => setSecurityKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStudentSave(editStudent)}
                  style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
                />
              </div>

              {/* SAVE / SUBMIT CHANGES BUTTON */}
              <button 
                onClick={() => handleStudentSave(editStudent)} 
                style={styles.saveSubmitBtn} 
                className="press-interactive"
              >
                Submit Student Profile Changes
              </button>

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-gray)' }}>
              Enter or select a student admission tag to display their full profile settings.
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 2: FEE COLLECTION DESK (Sub-page) ───
  if (activeSubPage === 'fee_collection') {
    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('gold')}
        <header style={styles.header}>
          <button onClick={() => { setActiveSubPage('menu'); setSelectedStudent(null); setEditStudent(null); }} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Fee Collection Desk</h1>
          <p style={styles.subtitle}>Directly search student record lists and collect term fees</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search Student Adm No e.g. ADM24001"
                value={feeCollectAdm}
                onChange={(e) => setFeeCollectAdm(e.target.value)}
                style={styles.textInputBox}
              />
              <button
                onClick={() => {
                  const match = students.find(s => s.admissionNumber === feeCollectAdm);
                  if (match) {
                    setSelectedStudent(match);
                    setEditStudent({ ...match });
                  } else triggerToast('Not found.');
                }}
                style={{ ...styles.saveSubmitBtn, marginTop: 0 }}
                className="press-interactive"
              >
                Load
              </button>
            </div>
            
            <div style={styles.quickFillContainer}>
              <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 700 }}>Quick Selection:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {students.map(s => (
                  <button key={s.admissionNumber} onClick={() => handleQuickFill(s.admissionNumber)} style={styles.quickFillPill} className="press-interactive">
                    {s.admissionNumber} ({s.name.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedStudent && editStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }} className="anim-fade-in">
              <div style={styles.readOnlyBlock}>
                <div style={styles.metaRow}><span>Student Name</span><strong>{selectedStudent.name}</strong></div>
                <div style={styles.metaRow}><span>Admission No</span><strong>{selectedStudent.admissionNumber}</strong></div>
                <div style={styles.metaRow}><span>Mobile Contact</span><strong>{selectedStudent.mobile}</strong></div>
              </div>

              {/* Fee Breakdown */}
              <div style={styles.readOnlyBlock}>
                <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Fee Balance breakdown</h4>
                <div style={styles.metaRow}><span>Tuition Fee</span><strong>₹{selectedStudent.tuitionFee.toLocaleString('en-IN')}</strong></div>
                <div style={styles.metaRow}><span>Hostel Fee</span><strong>₹{selectedStudent.hostelFee.toLocaleString('en-IN')}</strong></div>
                <div style={styles.metaRow}><span>Transport Fee</span><strong>₹{selectedStudent.transportFee.toLocaleString('en-IN')}</strong></div>
                <div style={styles.metaRow}><span>Miscellaneous Fee</span><strong>₹{selectedStudent.miscellaneousFee.toLocaleString('en-IN')}</strong></div>
                <div style={styles.metaRow}><span>Previous Pending</span><strong style={{ color: '#EF4444' }}>₹{selectedStudent.previousPending.toLocaleString('en-IN')}</strong></div>
                <div style={{ ...styles.metaRow, borderTop: '1.5px solid var(--card-border)', paddingTop: '6px' }}><span>Total Paid</span><strong style={{ color: '#10B981' }}>₹{selectedStudent.totalPaid.toLocaleString('en-IN')}</strong></div>
                <div style={styles.metaRow}><span style={{ fontWeight: 800 }}>Remaining Balance</span><strong style={{ fontSize: '15px', color: '#B45309' }}>₹{selectedStudent.remainingBalance.toLocaleString('en-IN')}</strong></div>
              </div>

              {/* Collect Cash */}
              {selectedStudent.remainingBalance > 0 ? (
                <div style={styles.readOnlyBlock}>
                  <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Collect Cash</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={styles.formLabel}>Amount (₹)</label>
                      <input
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

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={styles.formLabel}>Category</label>
                      <select value={collectCategory} onChange={(e) => setCollectCategory(e.target.value)} style={styles.selectInput}>
                        <option value="Tuition Fee">Tuition Fee</option>
                        <option value="Hostel Fee">Hostel Fee</option>
                        <option value="Transport Fee">Transport Fee</option>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', marginBottom: '8px' }}>
                    <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
                    <input
                      type="text"
                      placeholder="Enter Accountant Key (OTP) e.g. ACC-1234"
                      value={securityKey}
                      onChange={(e) => setSecurityKey(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFeePayment('collect')}
                      style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                    <button onClick={() => handleFeePayment('partial')} style={{ ...styles.sheetBtn, backgroundColor: '#E2E8F0', color: 'var(--dark-charcoal)' }} className="press-interactive">Partial Pay</button>
                    <button onClick={() => handleFeePayment('full')} style={{ ...styles.sheetBtn, backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #D4AF37' }} className="press-interactive">Full Pay</button>
                  </div>
                  {/* EXPLICIT SUBMIT PAYMENT BUTTON */}
                  <button onClick={() => handleFeePayment('collect')} style={styles.saveSubmitBtn} className="press-interactive">Submit & Collect Custom Fee Payment</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#10B981', fontWeight: 800, padding: '16px' }}>
                  ✓ Student fees settled. Balance is zero.
                </div>
              )}

              {/* Receipt Logs */}
              <h4 style={styles.sectionSubtitle}>Receipt Logs</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedStudent.receipts.map((receipt) => (
                  <div key={receipt.receiptNumber} style={styles.receiptRowItem}>
                    <div>
                      <strong>{receipt.installment} ({receipt.category})</strong>
                      <div style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>{receipt.date} • {receipt.mode}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800 }}>₹{receipt.amount.toLocaleString('en-IN')}</span>
                      <button
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setActiveOverlay('receipt_view');
                        }}
                        style={styles.actionItemBtn}
                        className="press-interactive"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-gray)' }}>
              Select one of the student admission tags above to load their fees and payment console.
            </div>
          )}
        </main>

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
                    <h4 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--royal-gold)', letterSpacing: '0.04em' }}>Inspire Junior College</h4>
                    <span style={{ fontSize: '9px', color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Official Fee Receipt</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={styles.metaRow}><span>Receipt Number:</span><strong>{selectedReceipt.receiptNumber}</strong></div>
                    <div style={styles.metaRow}><span>Payment Date:</span><strong>{selectedReceipt.date}</strong></div>
                    <div style={styles.metaRow}><span>Student Name:</span><strong>{selectedStudent.name}</strong></div>
                    <div style={styles.metaRow}><span>Admission No:</span><strong>{selectedStudent.admissionNumber}</strong></div>
                    <div style={styles.metaRow}><span>Fee Category:</span><strong>{selectedReceipt.category}</strong></div>
                    <div style={styles.metaRow}><span>Amount Paid:</span><strong style={{ color: '#10B981', fontSize: '15px' }}>₹{selectedReceipt.amount.toLocaleString('en-IN')}</strong></div>
                    <div style={styles.metaRow}><span>Remaining Bal:</span><strong>₹{selectedReceipt.balance.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => handleDownloadPDF(selectedReceipt, selectedStudent)} style={{ ...styles.sheetBtn, backgroundColor: 'var(--royal-gold)', color: 'var(--dark-charcoal)', fontWeight: 800 }} className="press-interactive">Download PDF / Print</button>
                <button onClick={() => triggerToast('Receipt shared to registered parent mobile!')} style={{ ...styles.sheetBtn, backgroundColor: '#E2E8F0', color: 'var(--dark-charcoal)' }} className="press-interactive">Share Receipt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── SUBPAGE 3: ATTENDANCE CONSOLE (Sub-page) ───
  if (activeSubPage === 'attendance') {
    const studentsList = attendanceRoster.filter(a => a.type === 'student' && a.section === selectedSection);
    const facultyList = attendanceRoster.filter(a => a.type === 'faculty');

    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('sapphire')}
        <header style={styles.header}>
          <button onClick={() => { setActiveSubPage('menu'); }} style={styles.backArrowBtn} className="press-interactive">
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
                <div style={styles.metaRow}><span>Faculty Availability</span><strong>96.8% Available (180/186)</strong></div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 4: COLLECTION REPORTS (Sub-page) ───
  if (activeSubPage === 'reports') {
    const allTransactions = students.flatMap(s => s.receipts.map(r => ({ student: s, receipt: r })));

    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('ruby')}
        <header style={styles.header}>
          <button onClick={() => { setActiveSubPage('menu'); }} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Auditing Reports compiler</h1>
          <p style={styles.subtitle}>Audit transaction streams, check category totals and export ledgers</p>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          <div style={styles.readOnlyBlock}>
            <div style={styles.metaRow}><span>Total Monthly Collection Target</span><strong>₹68,50,000</strong></div>
            <div style={styles.metaRow}><span>Total Realized Income</span><strong style={{ color: '#10B981' }}>₹{allTransactions.reduce((a, t) => a + t.receipt.amount, 0).toLocaleString('en-IN')}</strong></div>
            <div style={styles.metaRow}><span>Pending Arrears Balance</span><strong style={{ color: '#EF4444' }}>₹{students.reduce((sum, s) => sum + s.remainingBalance, 0).toLocaleString('en-IN')}</strong></div>
          </div>

          <h4 style={styles.sectionSubtitle}>Collection Audit Logs</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            {allTransactions.map((tx, idx) => (
              <div key={idx} style={styles.receiptRowItem}>
                <div>
                  <strong>{tx.receipt.receiptNumber} • {tx.student.name}</strong>
                  <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>{tx.receipt.category} • {tx.receipt.installment}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 850, color: '#10B981' }}>+ ₹{tx.receipt.amount.toLocaleString('en-IN')}</span>
                  <div style={{ fontSize: '8px', color: 'var(--muted-gray)' }}>{tx.receipt.date}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', zIndex: 1 }}>
            <button onClick={() => triggerToast('Downloaded collection audit reports as PDF.')} style={{ ...styles.sheetBtn, backgroundColor: 'var(--royal-gold)', color: 'var(--dark-charcoal)', fontWeight: 800 }} className="press-interactive">Download PDF</button>
            <button onClick={() => triggerToast('Exported collections ledger sheet as Excel.')} style={{ ...styles.sheetBtn, backgroundColor: '#E2E8F0', color: 'var(--dark-charcoal)' }} className="press-interactive">Export Excel</button>
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 5: HOSTEL ADMISSIONS (Moved from Admin Dashboard) ───
  if (activeSubPage === 'hostel') {
    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('orange')}
        <header style={styles.header}>
          <button onClick={() => { setActiveSubPage('menu'); setSelectedStudent(null); setEditStudent(null); }} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Hostel Room Admissions</h1>
          <p style={styles.subtitle}>Allocate campus block occupancies, assign dorm rooms and submit transfers</p>
        </header>

        <main style={styles.content}>
          <div style={{ ...styles.metricsGrid, zIndex: 1 }}>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Block A (Boys Block)</span>
              <strong style={styles.metricValue}>{hostelBlocks.BlockA.occupied} / {hostelBlocks.BlockA.capacity}</strong>
              <span style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>Occupancy Rate: {hostelBlocks.BlockA.capacity > 0 ? ((hostelBlocks.BlockA.occupied / hostelBlocks.BlockA.capacity) * 100).toFixed(1) : 0}%</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Block B (Girls Block)</span>
              <strong style={styles.metricValue}>{hostelBlocks.BlockB.occupied} / {hostelBlocks.BlockB.capacity}</strong>
              <span style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>Occupancy Rate: {hostelBlocks.BlockB.capacity > 0 ? ((hostelBlocks.BlockB.occupied / hostelBlocks.BlockB.capacity) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>

          {/* Allocation Room Form */}
          <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
            <h4 style={{ ...styles.sectionSubtitle, marginTop: 0 }}>Allocate Room to Student</h4>
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
                  <option value="">-- Choose Student Roster --</option>
                  {students.map(s => (
                    <option key={s.admissionNumber} value={s.admissionNumber}>{s.name} ({s.hostelStatus === 'Resident' ? `Resident Room: ${s.hostelRoom}` : 'Day Scholar'})</option>
                  ))}
                </select>
              </div>

              {selectedStudent && editStudent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="anim-fade-in">
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.formLabel}>Select Block</label>
                      <select value={allocateBlock} onChange={(e) => setAllocateBlock(e.target.value)} style={styles.selectInput}>
                        <option value="Block A">Block A (Boys)</option>
                        <option value="Block B">Block B (Girls)</option>
                        <option value="Block C">Block C (Girls)</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={styles.formLabel}>Select Room</label>
                      <select value={allocateRoom} onChange={(e) => setAllocateRoom(e.target.value)} style={styles.selectInput}>
                        <option value="">-- Select Room --</option>
                        {roomsList.filter(r => r.block === allocateBlock).map(r => (
                          <option key={r._id} value={r._id}>{r.roomNumber} ({r.occupants.length}/{r.capacity} occupied)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                    <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
                    <input
                      type="text"
                      placeholder="Enter Accountant Key (OTP) e.g. ACC-1234"
                      value={securityKey}
                      onChange={(e) => setSecurityKey(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAllocateRoom()}
                      style={{ ...styles.textInputBox, borderColor: 'var(--royal-gold)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}
                    />
                  </div>

                  {/* EXPLICIT SUBMIT CHANGES BUTTON */}
                  <button onClick={handleAllocateRoom} style={styles.saveSubmitBtn} className="press-interactive">Submit Room Allocation changes</button>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 6: LATE FEE SETTINGS (Sub-page) ───
  if (activeSubPage === 'late_fees') {
    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('rose')}
        <header style={styles.header}>
          <button onClick={() => setActiveSubPage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Late Fee Rules</h1>
          <p style={styles.subtitle}>Configure overdue fines and penalties caps</p>
        </header>
        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.formLabel}>Active Late Fee Penalties rules</label>
              <input
                type="text"
                value={editSettings.lateFeeRules}
                onChange={(e) => setEditSettings({ ...editSettings, lateFeeRules: e.target.value })}
                style={styles.textInputBox}
              />
            </div>
            {/* EXPLICIT SUBMIT CHANGES BUTTON */}
            <button onClick={handleSettingsSave} style={styles.saveSubmitBtn} className="press-interactive">Submit Late Fee Changes</button>
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 7: SCHOLARSHIPS SETTINGS (Sub-page) ───
  if (activeSubPage === 'scholarships') {
    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('teal')}
        <header style={styles.header}>
          <button onClick={() => setActiveSubPage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Scholarships waivers</h1>
          <p style={styles.subtitle}>Configure student waiver criteria and grants</p>
        </header>
        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.formLabel}>Scholarships & Fee Waivers Criteria</label>
              <input
                type="text"
                value={editSettings.scholarshipRules}
                onChange={(e) => setEditSettings({ ...editSettings, scholarshipRules: e.target.value })}
                style={styles.textInputBox}
              />
            </div>
            {/* EXPLICIT SUBMIT CHANGES BUTTON */}
            <button onClick={handleSettingsSave} style={styles.saveSubmitBtn} className="press-interactive">Submit Scholarships waivers Changes</button>
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 8: ACCOUNTANT PROFILE (Sub-page) ───
  if (activeSubPage === 'profile') {
    return (
      <div style={styles.container} className="view-container anim-slide-up">
        {renderBackgroundDesign('navy')}
        <header style={styles.header}>
          <button onClick={() => setActiveSubPage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Accountant Profile Details</h1>
          <p style={styles.subtitle}>Cashier credential profiles and academic year registers</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
            <GlassCard hoverable={false} style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.45)' }}>
              <div style={styles.heroAvatar}>VN</div>
              <h3 style={{ ...styles.studentName, marginTop: '12px' }}>Venkatesh M.</h3>
              <span style={styles.studentID}>Role: Senior Accountant & Bursar</span>
              <div style={styles.heroLineDivider} />
              <div style={styles.heroMetaGrid}>
                <div style={styles.metaRow}><span>Active ERP Registry</span><strong>Inspire Junior Campus</strong></div>
                <div style={styles.metaRow}><span>Academic Year</span><strong>{settings.academicYear}</strong></div>
                <div style={styles.metaRow}><span>Installment Terms</span><strong>{settings.installments}</strong></div>
              </div>
            </GlassCard>
          </div>
        </main>
      </div>
    );
  }

  // ─── DEFAULT VIEW: CONSOLIDATED COCKPIT MAIN MENU (No tabs) ───
  return (
    <div style={styles.container} className="view-container anim-slide-up">
      {renderBackgroundDesign('gold')}

      {/* Top Welcome Title Bar */}
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 1 }}>
          <div style={styles.parentWelcomeRow}>
            <div style={styles.avatarMini}>VN</div>
            <div>
              <span style={styles.greetingText}>Inspire ERP Control,</span>
              <h2 style={styles.parentWelcomeTitle}>Accountant Console</h2>
              <p style={styles.childMetaText}>Bursar Ledger Terminal</p>
            </div>
          </div>
          <LiveConnectionIndicator compact />
          <div style={{ paddingRight: '8px' }}>
            <InspireLogo size="md" />
          </div>
        </div>
      </header>

      <main style={{ ...styles.content, zIndex: 1 }}>
        {/* Summary Metrics */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Fee Collected Today</span>
              <strong style={{ ...styles.metricValue, color: '#10B981' }}>
                ₹{feeCollectedToday.toLocaleString('en-IN')}
              </strong>
              <span style={styles.metricSub}>Real-time ledger sync</span>
              <span className="glass-status-pill status-paid">Collected</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Pending Fees Total</span>
              <strong style={{ ...styles.metricValue, color: '#EF4444' }}>
                ₹{pendingFeesTotal.toLocaleString('en-IN')}
              </strong>
              <span style={styles.metricSub}>Across all enrolled students</span>
              <span className="glass-status-pill status-unpaid">Pending</span>
            </div>
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Students Present Today</span>
              <strong style={styles.metricValue}>
                {Math.max(0, students.length - dashboardSummary.absentCount)}
              </strong>
              <span style={styles.metricSub}>Live attendance sync</span>
              <span className="glass-status-pill status-present">Present</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Students Absent Today</span>
              <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>
                {dashboardSummary.absentCount}
              </strong>
              <span style={styles.metricSub}>Reported today</span>
              <span className="glass-status-pill status-absent">Absent</span>
            </div>
          </div>
        </section>

        {/* Module Grid */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={styles.sectionTitle}>Bursar Grid Modules</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>

            <div onClick={() => setActiveSubPage('student_search')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <h4 style={styles.moduleTitle}>Student Search</h4>
              <p style={styles.moduleDesc}>Audit student address fields and details profiles.</p>
            </div>

            <div onClick={() => setActiveSubPage('fee_collection')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              </div>
              <h4 style={styles.moduleTitle}>Fee Collection</h4>
              <p style={styles.moduleDesc}>Search student records and log term payments.</p>
            </div>

            <div onClick={() => setActiveSubPage('reports')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h4 style={styles.moduleTitle}>Audit Reports</h4>
              <p style={styles.moduleDesc}>Compile collection audit logs and spreadsheets.</p>
            </div>

            <div onClick={() => setActiveSubPage('hostel')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <h4 style={styles.moduleTitle}>Hostel Registry</h4>
              <p style={styles.moduleDesc}>Allocate campus blocks, rooms and assign residents.</p>
            </div>

            <div onClick={() => setActiveSubPage('profile')} style={styles.moduleCardNew} className="press-interactive">
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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
        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px 12px', gap: '4px', opacity: 0.6 }}>
          <InspireLogo size="sm" />
          <span style={{ fontSize: '9px', color: 'var(--muted-gray)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
            Inspire ERP Bursar Portal v2.6.4
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
    backgroundColor: 'rgba(255,255,255,0.85)', border: '1px solid var(--card-border)',
    boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
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
    flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(255,255,255,0.9)',
    border: '1px solid var(--card-border)', boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  },
  moduleIconWrapper: {
    width: '36px', height: '36px', borderRadius: '9px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  moduleTitle: { fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.01em' },
  moduleDesc: { fontSize: '11px', color: 'var(--muted-gray)', lineHeight: 1.5, fontWeight: 400 },
  textInputBox: {
    flex: 1, padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--card-border)',
    fontSize: '13px', outline: 'none', backgroundColor: 'rgba(255,255,255,0.7)',
    color: 'var(--dark-charcoal)', fontFamily: 'var(--font-family)', fontWeight: 500,
  },
  saveSubmitBtn: {
    padding: '13px 20px', borderRadius: '10px', backgroundColor: 'var(--dark-charcoal)',
    color: '#ffffff', fontFamily: 'var(--font-family)', fontSize: '12.5px', fontWeight: 700,
    border: 'none', cursor: 'pointer', textAlign: 'center', marginTop: '8px', letterSpacing: '0.01em',
  },
  readOnlyBlock: {
    padding: '16px 18px', borderRadius: '12px', border: '1px solid var(--card-border)',
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
    width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
    color: 'var(--dark-charcoal)', outline: 'none', fontFamily: 'var(--font-family)',
  },
  receiptRowItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '12px',
  },
  actionItemBtn: {
    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '11px', fontWeight: 700,
    color: 'var(--dark-charcoal)', cursor: 'pointer', fontFamily: 'var(--font-family)',
  },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '999px',
    fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.04em',
    border: '1px solid var(--card-border)', backgroundColor: 'rgba(255,255,255,0.9)',
    color: 'var(--dark-charcoal)',
  },
  skeletonCard: {
    minHeight: '120px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.4)',
    border: '1px solid var(--card-border)',
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
  toastText: { fontSize: '12px', fontWeight: 700, color: '#ffffff' },
  heroAvatar: {
    width: '56px', height: '56px', borderRadius: '12px', backgroundColor: 'var(--dark-charcoal)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
    fontWeight: 900, color: 'var(--royal-gold)', border: '1px solid rgba(212,175,55,0.2)',
    letterSpacing: '0.04em',
  },
  studentName: { fontSize: '16px', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.015em' },
  studentID: { fontSize: '11.5px', color: 'var(--muted-gray)', fontWeight: 500, display: 'block', marginTop: '2px' },
  heroLineDivider: { width: '100%', height: '1px', backgroundColor: 'var(--card-border)', margin: '16px 0' },
  heroMetaGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  logoutBtn: {
    width: '100%', padding: '14px', borderRadius: '10px', backgroundColor: 'transparent',
    border: '1px solid rgba(211,47,47,0.25)', color: '#D32F2F',
    fontFamily: 'var(--font-family)', fontSize: '13px', fontWeight: 700,
    cursor: 'pointer', textAlign: 'center', letterSpacing: '0.01em',
  },
  quickFillContainer: { padding: '4px 0' },
  quickFillPill: {
    fontSize: '10px', fontWeight: 700, color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)',
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
    borderRadius: '16px', border: '1px solid var(--card-border)',
    boxShadow: '0 20px 50px rgba(15,23,42,0.15)', padding: '24px',
    display: 'flex', flexDirection: 'column', maxHeight: '90%', overflowY: 'auto',
  },
  modalTitle: { fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)', letterSpacing: '-0.015em' },
};
