import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { InspireLogo } from '../components/common/InspireLogo';

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
  tuitionFee: number;
  hostelFee: number;
  transportFee: number;
  miscellaneousFee: number;
  previousPending: number;
  totalPaid: number;
  remainingBalance: number;
  receipts: Receipt[];
}

const INITIAL_STUDENTS: Student[] = [
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
    tuitionFee: 120000,
    hostelFee: 85000,
    transportFee: 0,
    miscellaneousFee: 5000,
    previousPending: 0,
    totalPaid: 151000,
    remainingBalance: 59000,
    receipts: [
      { receiptNumber: 'REC-2026-001', date: '12 June 2026', category: 'Tuition Fee Initial', installment: 'Installment 1', amount: 80000, balance: 130000, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' },
      { receiptNumber: 'REC-2026-002', date: '14 June 2026', category: 'Hostel Fee Initial', installment: 'Installment 1', amount: 71000, balance: 59000, mode: 'Cash Payment', cashier: 'Mr. Venkatesh' }
    ]
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
    tuitionFee: 120000,
    hostelFee: 85000,
    transportFee: 0,
    miscellaneousFee: 5000,
    previousPending: 10000,
    totalPaid: 95000,
    remainingBalance: 115000,
    receipts: [
      { receiptNumber: 'REC-2026-003', date: '13 June 2026', category: 'Tuition Fee Partial', installment: 'Installment 1', amount: 60000, balance: 150000, mode: 'Credit Card', cashier: 'Mr. Venkatesh' },
      { receiptNumber: 'REC-2026-004', date: '18 June 2026', category: 'Previous Arrears Settled', installment: 'Overdue Balance', amount: 35000, balance: 115000, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' }
    ]
  },
  {
    admissionNumber: 'ADM24003',
    studentId: 'STU-1003',
    qrId: 'QR-65123',
    registrationNumber: 'REG20241011',
    name: 'Rahul Khanna',
    fatherName: 'Mr. Satish Khanna',
    motherName: 'Mrs. Neha Khanna',
    mobile: '7654321098',
    parentMobile: '9345678901',
    email: 'rahul.khanna@inspire.edu',
    address: 'Flat 101, Elite Residency, Secunderabad',
    residentialAddress: 'Flat 101, Elite Residency, Secunderabad',
    hostelStatus: 'Day Scholar',
    transportStatus: 'College Bus',
    tuitionFee: 120000,
    hostelFee: 0,
    transportFee: 15000,
    miscellaneousFee: 5000,
    previousPending: 15000,
    totalPaid: 80000,
    remainingBalance: 75000,
    receipts: [
      { receiptNumber: 'REC-2026-005', date: '15 June 2026', category: 'Tuition Fee Partial', installment: 'Installment 1', amount: 80000, balance: 75000, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' }
    ]
  },
  {
    admissionNumber: 'ADM24004',
    studentId: 'STU-1004',
    qrId: 'QR-73921',
    registrationNumber: 'REG20240902',
    name: 'Sneha Reddy',
    fatherName: 'Mr. Ramana Reddy',
    motherName: 'Mrs. Sunitha Reddy',
    mobile: '6543210987',
    parentMobile: '9456789012',
    email: 'sneha.reddy@inspire.edu',
    address: 'Plot 44, Gachibowli, Hyderabad',
    residentialAddress: 'Hostel Block C, Room 302, Inspire Campus',
    hostelStatus: 'Resident',
    transportStatus: 'Self Transport',
    hostelBlock: 'Block C',
    hostelRoom: 'Room 302',
    tuitionFee: 130000,
    hostelFee: 85000,
    transportFee: 0,
    miscellaneousFee: 5000,
    previousPending: 0,
    totalPaid: 100000,
    remainingBalance: 120000,
    receipts: [
      { receiptNumber: 'REC-2026-006', date: '20 June 2026', category: 'Tuition Fee Initial', installment: 'Installment 1', amount: 100000, balance: 120000, mode: 'Demand Draft', cashier: 'Mr. Venkatesh' }
    ]
  }
];

const getMockStudents = (): Student[] => {
  if (!(window as any)._erpMockStudents) {
    (window as any)._erpMockStudents = INITIAL_STUDENTS;
  }
  return (window as any)._erpMockStudents;
};

const setMockStudents = (students: Student[]) => {
  (window as any)._erpMockStudents = students;
};

// --- MOCK ATTENDANCE RECORDS DATABASE ---
interface Attendee {
  id: string;
  name: string;
  type: 'student' | 'faculty';
  section?: string;
  status: 'present' | 'absent' | 'late' | 'leave';
}

const INITIAL_ATTENDANCE_ROSTER: Attendee[] = [
  { id: 'STU-1001', name: 'Varshith Rao', type: 'student', section: 'MPC-A', status: 'present' },
  { id: 'STU-1002', name: 'Aaditya Varma', type: 'student', section: 'MPC-A', status: 'present' },
  { id: 'STU-1003', name: 'Rahul Khanna', type: 'student', section: 'MPC-A', status: 'present' },
  { id: 'STU-1004', name: 'Sneha Reddy', type: 'student', section: 'MPC-A', status: 'absent' },
  { id: 'STU-1005', name: 'Pooja Hegde', type: 'student', section: 'MPC-B', status: 'present' },
  { id: 'STU-1006', name: 'Prabhas Kumar', type: 'student', section: 'MPC-B', status: 'present' },
  { id: 'STU-1007', name: 'Allu Arjun', type: 'student', section: 'BiPC-A', status: 'present' },
  { id: 'STU-1008', name: 'NTR Rama Rao', type: 'student', section: 'BiPC-A', status: 'late' },
  { id: 'STU-1009', name: 'Vijay Deverakonda', type: 'student', section: 'CEC-A', status: 'present' },
  
  { id: 'FAC-201', name: 'Mr. Ramesh (Physics)', type: 'faculty', status: 'present' },
  { id: 'FAC-202', name: 'Mrs. Sarada (Chemistry)', type: 'faculty', status: 'present' },
  { id: 'FAC-203', name: 'Mr. Anand (Maths)', type: 'faculty', status: 'present' },
  { id: 'FAC-204', name: 'Mrs. Grace (English)', type: 'faculty', status: 'leave' }
];

const getMockAttendance = (): Attendee[] => {
  if (!(window as any)._erpMockAttendance) {
    (window as any)._erpMockAttendance = INITIAL_ATTENDANCE_ROSTER;
  }
  return (window as any)._erpMockAttendance;
};

const setMockAttendance = (roster: Attendee[]) => {
  (window as any)._erpMockAttendance = roster;
};

// --- MOCK SETTINGS DB ---
const getMockSettings = () => {
  if (!(window as any)._erpMockSettings) {
    (window as any)._erpMockSettings = {
      academicYear: '2026-27',
      installments: '3 Installments',
      lateFeeRules: '₹100 per day after due date',
      scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver',
      discountRules: 'Sibling: 10% waiver'
    };
  }
  return (window as any)._erpMockSettings;
};

const setMockSettings = (settings: any) => {
  (window as any)._erpMockSettings = settings;
};

// ─── MAIN CONSOLIDATED ACCOUNTANT COCKPIT VIEW ───
export const AccountantDashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubPage, setActiveSubPage] = useState<'menu' | 'student_search' | 'fee_collection' | 'attendance' | 'reports' | 'late_fees' | 'scholarships' | 'profile' | 'hostel'>('menu');
  const [students, setStudents] = useState<Student[]>(getMockStudents);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
  const [attendanceRoster, setAttendanceRoster] = useState<Attendee[]>(getMockAttendance);

  // Hostel blocks parameters (Moved from admin)
  const [hostelBlocks, setHostelBlocks] = useState({
    BlockA: { name: 'Block A (Boys)', capacity: 150, occupied: 120 },
    BlockB: { name: 'Block B (Girls)', capacity: 120, occupied: 98 },
    BlockC: { name: 'Block C (Girls)', capacity: 100, occupied: 65 }
  });
  const [allocateBlock, setAllocateBlock] = useState('Block A');
  const [allocateRoom, setAllocateRoom] = useState('Room 101');

  // Settings & Rules parameters
  const [settings, setSettings] = useState(getMockSettings);
  const [editSettings, setEditSettings] = useState(getMockSettings);

  const { theme, setThemeMode } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Sync states on view sub-navigation
  useEffect(() => {
    setStudents(getMockStudents());
    setAttendanceRoster(getMockAttendance());
    const sets = getMockSettings();
    setSettings(sets);
    setEditSettings(sets);
  }, [activeSubPage]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleQuickFill = (admNo: string) => {
    setSearchAdmNo(admNo);
    setFeeCollectAdm(admNo);
    const match = students.find(s => s.admissionNumber === admNo) || null;
    setSelectedStudent(match);
    setEditStudent(match ? { ...match } : null);
    triggerToast(`Loaded ${match?.name}`);
  };

  const handleSearchSubmit = () => {
    if (!searchAdmNo) {
      triggerToast('Please type an Admission Number.');
      return;
    }
    const match = students.find(s => s.admissionNumber.toUpperCase().trim() === searchAdmNo.toUpperCase().trim());
    if (match) {
      setSelectedStudent(match);
      setEditStudent({ ...match });
      triggerToast('Student loaded.');
    } else {
      triggerToast('No student found.');
    }
  };

  const handleStudentSave = (updated: Student) => {
    const next = students.map(s => s.admissionNumber === updated.admissionNumber ? updated : s);
    setStudents(next);
    setMockStudents(next);
    setSelectedStudent(updated);
    setEditStudent({ ...updated });
    triggerToast('Profile updated and changes submitted successfully.');
  };

  const handleToggleAttendance = (id: string, newStatus: 'present' | 'absent' | 'late' | 'leave') => {
    const next = attendanceRoster.map(a => a.id === id ? { ...a, status: newStatus } : a);
    setAttendanceRoster(next);
    setMockAttendance(next);
  };

  const handleSaveAttendance = (type: 'student' | 'faculty') => {
    triggerToast(`${type === 'student' ? 'Section ' + selectedSection : 'Faculty'} Attendance changes saved for date ${attendanceDate}`);
  };

  const handleSettingsSave = () => {
    setMockSettings(editSettings);
    setSettings(editSettings);
    triggerToast('Settings changes submitted and saved successfully.');
    setActiveSubPage('menu');
  };

  const handleLogout = () => {
    if ((window as any).logoutUser) {
      (window as any).logoutUser();
    }
  };

  const handleFeePayment = (type: 'partial' | 'full' | 'collect') => {
    if (!selectedStudent) return;
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

    const nextBal = selectedStudent.remainingBalance - paymentAmount;
    const nextPaid = selectedStudent.totalPaid + paymentAmount;
    const newReceipt: Receipt = {
      receiptNumber: `REC-2026-0${selectedStudent.receipts.length + 11}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      category: collectCategory,
      installment: collectInstallment,
      amount: paymentAmount,
      balance: nextBal,
      mode: collectMode,
      cashier: 'Mr. Venkatesh'
    };

    const updatedStudent: Student = {
      ...selectedStudent,
      totalPaid: nextPaid,
      remainingBalance: nextBal,
      receipts: [...selectedStudent.receipts, newReceipt]
    };

    const nextList = students.map(s => s.admissionNumber === selectedStudent.admissionNumber ? updatedStudent : s);
    setStudents(nextList);
    setMockStudents(nextList);
    setSelectedStudent(updatedStudent);
    setEditStudent(updatedStudent);
    setCollectAmount('');
    triggerToast(`Payment changes submitted: ₹${paymentAmount.toLocaleString('en-IN')} logged.`);
  };

  // Hostel assignment logic
  const handleAllocateRoom = () => {
    if (!selectedStudent || !editStudent) {
      triggerToast('Select a student first.');
      return;
    }
    const updated: Student = {
      ...editStudent,
      hostelStatus: 'Resident',
      hostelBlock: allocateBlock,
      hostelRoom: allocateRoom,
      residentialAddress: `${allocateBlock}, ${allocateRoom}, Madhapur Campus`
    };
    const next = students.map(s => s.admissionNumber === selectedStudent.admissionNumber ? updated : s);
    setStudents(next);
    setMockStudents(next);
    setSelectedStudent(updated);
    setEditStudent(updated);

    if (allocateBlock === 'Block A') {
      setHostelBlocks({ ...hostelBlocks, BlockA: { ...hostelBlocks.BlockA, occupied: hostelBlocks.BlockA.occupied + 1 } });
    } else if (allocateBlock === 'Block B') {
      setHostelBlocks({ ...hostelBlocks, BlockB: { ...hostelBlocks.BlockB, occupied: hostelBlocks.BlockB.occupied + 1 } });
    } else {
      setHostelBlocks({ ...hostelBlocks, BlockC: { ...hostelBlocks.BlockC, occupied: hostelBlocks.BlockC.occupied + 1 } });
    }

    triggerToast(`Hostel room allocation changes submitted successfully!`);
  };

  const handleDownloadPDF = (receipt: Receipt, student: Student) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast('Popup blocked by browser.');
      return;
    }
    const receiptHtml = `
      <html>
      <head>
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #1E293B; background: #f8fafc; }
          .receipt-box { max-width: 600px; margin: auto; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { border-bottom: 2.5px solid #D4AF37; padding-bottom: 12px; margin-bottom: 20px; text-align: center; }
          .logo { font-size: 20px; font-weight: 900; color: #D4AF37; text-transform: uppercase; letter-spacing: 0.05em; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
          .item { display: flex; flex-direction: column; }
          .label { font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; }
          .value { font-size: 14px; font-weight: 800; margin-top: 2px; }
          .amount-section { background-color: #FFFDF5; border: 1.5px solid #F3E8C4; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
          .footer { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 12px 24px; background: #D4AF37; border: none; border-radius: 12px; color: #0F172A; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(212,175,55,0.25);">
            Print Receipt Now
          </button>
        </div>
        <div class="receipt-box">
          <div class="header">
            <div class="logo">Inspire Junior College</div>
          </div>
          <div class="grid">
            <div class="item"><span class="label">Receipt Number</span><span class="value">${receipt.receiptNumber}</span></div>
            <div class="item"><span class="label">Payment Date</span><span class="value">${receipt.date}</span></div>
            <div class="item"><span class="label">Student Name</span><span class="value">${student.name}</span></div>
            <div class="item"><span class="label">Admission Number</span><span class="value">${student.admissionNumber}</span></div>
            <div class="item"><span class="label">Fee Category</span><span class="value">${receipt.category}</span></div>
            <div class="item"><span class="label">Installment</span><span class="value">${receipt.installment}</span></div>
            <div class="item"><span class="label">Payment Mode</span><span class="value">${receipt.mode}</span></div>
            <div class="item"><span class="label">Authorized Cashier</span><span class="value">${receipt.cashier}</span></div>
          </div>
          <div class="amount-section">
            <div>
              <span class="label" style="color: #B45309;">Amount Paid</span>
              <div class="value" style="font-size: 22px; color: #B45309;">₹${receipt.amount.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <span class="label">Remaining Balance</span>
              <div class="value">₹${receipt.balance.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div class="footer">Thank you. Computer Generated Acknowledgment.</div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    triggerToast('PDF receipt opened in a new tab.');
  };

  // Stats calculations
  const feeCollectedToday = students.reduce((sum, s) => {
    return sum + s.receipts.reduce((acc, r) => acc + r.amount, 0);
  }, 0) - 410000 + 215000;
  const pendingFeesTotal = students.reduce((sum, s) => sum + s.remainingBalance, 0);

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
              <span style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>Occupancy Rate: 80.0%</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Block B (Girls Block)</span>
              <strong style={styles.metricValue}>{hostelBlocks.BlockB.occupied} / {hostelBlocks.BlockB.capacity}</strong>
              <span style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>Occupancy Rate: 81.6%</span>
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
                        <option value="Room 101">Room 101</option>
                        <option value="Room 102">Room 102</option>
                        <option value="Room 203">Room 203</option>
                        <option value="Room 302">Room 302</option>
                      </select>
                    </div>
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
          {/* VERY VISIBLE LOGO BRANDING */}
          <div style={{ paddingRight: '8px' }}>
            <InspireLogo size="md" />
          </div>
        </div>
      </header>

      <main style={{ ...styles.content, zIndex: 1 }}>
        {/* Top Summary Metrics Cards */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={styles.metricsGrid}>
            <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
              <span style={styles.metricLabel}>Total Fee Collected Today</span>
              <strong style={{ ...styles.metricValue, color: '#10B981' }}>₹{feeCollectedToday.toLocaleString('en-IN')}</strong>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
              <span style={styles.metricLabel}>Pending Fees Total</span>
              <strong style={{ ...styles.metricValue, color: '#EF4444' }}>₹{pendingFeesTotal.toLocaleString('en-IN')}</strong>
            </GlassCard>
          </div>

          <div style={styles.metricsGrid}>
            <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
              <span style={styles.metricLabel}>Students Present Today</span>
              <strong style={styles.metricValue}>2,735</strong>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
              <span style={styles.metricLabel}>Students Absent Today</span>
              <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>111</strong>
            </GlassCard>
          </div>
        </section>

        {/* 2-Column Mosaic Grid of Cards with Unique Backgrounds */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
          <h3 style={styles.sectionTitle}>Bursar Grid Modules</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            
            {/* 1. Student Search */}
            <div
              onClick={() => setActiveSubPage('student_search')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, rgba(16, 185, 129, 0.02) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Student Search</h4>
              <p style={styles.moduleDesc}>Audit student address fields and details profiles.</p>
            </div>

            {/* 2. Fee Collection */}
            <div
              onClick={() => setActiveSubPage('fee_collection')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.09) 0%, rgba(245, 158, 11, 0.02) 100%)',
                border: '1.5px solid rgba(245, 158, 11, 0.3)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Fee Collection</h4>
              <p style={styles.moduleDesc}>Search student records and log term payments.</p>
            </div>

            {/* 3. Attendance marking */}
            <div
              onClick={() => setActiveSubPage('attendance')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.09) 0%, rgba(59, 130, 246, 0.02) 100%)',
                border: '1.5px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Attendance</h4>
              <p style={styles.moduleDesc}>Mark daily attendance section-wise roster.</p>
            </div>

            {/* 4. Collection Reports */}
            <div
              onClick={() => setActiveSubPage('reports')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.09) 0%, rgba(239, 68, 68, 0.02) 100%)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Audit Reports</h4>
              <p style={styles.moduleDesc}>Compile collections audits logs spreadsheets.</p>
            </div>

            {/* 5. Hostel Admissions (Moved here!) */}
            <div
              onClick={() => setActiveSubPage('hostel')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.09) 0%, rgba(249, 115, 22, 0.02) 100%)',
                border: '1.5px solid rgba(249, 115, 22, 0.3)',
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Hostel Registry</h4>
              <p style={styles.moduleDesc}>Allocate blocks rooms and assign residents.</p>
            </div>

            {/* 6. Switch Color Theme */}
            <div
              onClick={() => {
                const nextTheme = theme === 'light' ? 'Dark' : 'Light';
                setThemeMode(nextTheme);
                triggerToast(`Accent switched to ${nextTheme} Mode`);
              }}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.09) 0%, rgba(139, 92, 246, 0.02) 100%)',
                border: '1.5px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Appearance Accent</h4>
              <p style={styles.moduleDesc}>Toggle theme Mode ({theme === 'light' ? 'Standard Light' : 'Dark Mode'}).</p>
            </div>

            {/* 7. Late Fee Rules */}
            <div
              onClick={() => setActiveSubPage('late_fees')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.09) 0%, rgba(244, 63, 94, 0.02) 100%)',
                border: '1.5px solid rgba(244, 63, 94, 0.3)',
                boxShadow: '0 4px 14px rgba(244, 63, 94, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Late Fees Config</h4>
              <p style={styles.moduleDesc}>Define penalties dues and grace periods.</p>
            </div>

            {/* 8. Scholarships waivers */}
            <div
              onClick={() => setActiveSubPage('scholarships')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.09) 0%, rgba(20, 184, 166, 0.02) 100%)',
                border: '1.5px solid rgba(20, 184, 166, 0.3)',
                boxShadow: '0 4px 14px rgba(20, 184, 166, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Scholarships waivers</h4>
              <p style={styles.moduleDesc}>Set grants percentages and discount terms.</p>
            </div>

            {/* 9. Accountant Profile Info */}
            <div
              onClick={() => setActiveSubPage('profile')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.09) 0%, rgba(30, 41, 59, 0.02) 100%)',
                border: '1.5px solid rgba(30, 41, 59, 0.3)',
                boxShadow: '0 4px 14px rgba(30, 41, 59, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(30, 41, 59, 0.08)', border: '1px solid rgba(30, 41, 59, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Bursar Profile</h4>
              <p style={styles.moduleDesc}>Review registered cashier bio and access tokens.</p>
            </div>

          </div>
        </section>

        {/* Terminate Session Trigger at the bottom of the page */}
        <button onClick={handleLogout} style={{ ...styles.logoutBtn, marginTop: '20px' }} className="press-interactive">
          Terminate Bursar Session
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

// --- STUB ROUTERS SO COMPILER DOES NOT FAIL ---
export const AccountantAcademicsView: React.FC = () => null;
export const AccountantUpdatesView: React.FC = () => null;
export const AccountantProfileView: React.FC = () => null;

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
    padding: '16px',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    backgroundColor: 'var(--card-bg)',
    border: '1.5px solid var(--card-border)',
    boxShadow: 'var(--shadow-sm)',
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
    fontWeight: 900,
    color: 'var(--dark-charcoal)',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  moduleCardNew: {
    padding: '20px',
    borderRadius: '24px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: 'var(--card-bg)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  moduleIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
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
    padding: '14px',
    borderRadius: '16px',
    border: '1px solid rgba(0,0,0,0.04)',
    backgroundColor: 'rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
    padding: '12px 14px',
    border: '1.5px solid rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: '16px',
  },
  actionItemBtn: {
    padding: '6px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
  printableReceiptBlock: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
  },
  overlayOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  overlaySheet: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '24px',
    border: '1.5px solid var(--card-border)',
    boxShadow: 'var(--shadow-lg)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90%',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '16.5px',
    fontWeight: 850,
    color: 'var(--dark-charcoal)',
  }
};
