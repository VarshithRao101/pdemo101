import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';

// --- SHARED CLOSE ICON ---
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// --- RENDER BACKGROUND DESIGN (Glows, shapes, grids) ---
const renderBackgroundDesign = () => {
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

      {/* Floating Colorful Neo-Brutalist 2D Shapes */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '-30px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: '#3B82F6',
        border: '2.5px solid var(--card-border)',
        boxShadow: '6px 6px 0px var(--card-border)',
        opacity: 0.14,
      }} />

      <div style={{
        position: 'absolute',
        top: '40%',
        right: '-40px',
        width: '120px',
        height: '120px',
        borderRadius: '20px',
        backgroundColor: '#EF4444',
        border: '2.5px solid var(--card-border)',
        boxShadow: '6px 6px 0px var(--card-border)',
        transform: 'rotate(15deg)',
        opacity: 0.12,
      }} />

      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '8%',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#FBBF24',
        border: '2.5px solid var(--card-border)',
        boxShadow: '5px 5px 0px var(--card-border)',
        opacity: 0.14,
      }} />

      {/* Dynamic Colorful Gradient Mesh Blobs */}
      <div style={{
        position: 'absolute',
        top: '-5%',
        right: '10%',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      <div style={{
        position: 'absolute',
        bottom: '12%',
        left: '-5%',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.16) 0%, transparent 70%)',
        filter: 'blur(45px)',
      }} />
    </div>
  );
};

// --- MOCK DATABASE (Stateful client database for prototype) ---
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
    tuitionFee: 120000,
    hostelFee: 85000,
    transportFee: 0,
    miscellaneousFee: 5000,
    previousPending: 10000,
    totalPaid: 150000,
    remainingBalance: 70000,
    receipts: [
      { receiptNumber: 'REC-2026-001', date: '02 June 2026', category: 'Tuition Fee', installment: 'Installment 1', amount: 80000, balance: 140000, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' },
      { receiptNumber: 'REC-2026-002', date: '25 June 2026', category: 'Hostel Fee', installment: 'Installment 2', amount: 70000, balance: 70000, mode: 'Cash', cashier: 'Mr. Venkatesh' }
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
    tuitionFee: 120000,
    hostelFee: 85000,
    transportFee: 0,
    miscellaneousFee: 5000,
    previousPending: 0,
    totalPaid: 210000,
    remainingBalance: 0,
    receipts: [
      { receiptNumber: 'REC-2026-003', date: '10 June 2026', category: 'Full Term Fee', installment: 'Installment 1', amount: 150000, balance: 60000, mode: 'Credit Card', cashier: 'Mr. Venkatesh' },
      { receiptNumber: 'REC-2026-004', date: '04 July 2026', category: 'Term Settlement', installment: 'Installment 2', amount: 60000, balance: 0, mode: 'UPI / NetBanking', cashier: 'Mr. Venkatesh' }
    ]
  },
  {
    admissionNumber: 'ADM24003',
    studentId: 'STU-1003',
    qrId: 'QR-83920',
    registrationNumber: 'REG20240755',
    name: 'Rahul Khanna',
    fatherName: 'Mr. Anil Khanna',
    motherName: 'Mrs. Kiran Khanna',
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

// Shared Global Sync Hook for Prototypes
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


// ─── 1. MAIN ACCOUNTANT DASHBOARD VIEW ───
export const AccountantDashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubPage, setActiveSubPage] = useState<'menu' | 'student_search' | 'attendance'>('menu');
  const [students, setStudents] = useState<Student[]>(getMockStudents);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search local inputs
  const [searchAdmNo, setSearchAdmNo] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Attendance Page local States
  const [attTab, setAttTab] = useState<'students' | 'faculty' | 'summary'>('students');
  const [selectedSection, setSelectedSection] = useState('MPC-A');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRoster, setAttendanceRoster] = useState<Attendee[]>(getMockAttendance);

  const { setActiveTab } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Sync data whenever page mounts/changes
  useEffect(() => {
    setStudents(getMockStudents());
    setAttendanceRoster(getMockAttendance());
  }, [activeSubPage]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleQuickFill = (admNo: string) => {
    setSearchAdmNo(admNo);
    const match = students.find(s => s.admissionNumber === admNo) || null;
    setSelectedStudent(match);
  };

  const handleSearchSubmit = () => {
    if (!searchAdmNo) {
      triggerToast('Please type an Admission Number.');
      return;
    }
    const match = students.find(s => s.admissionNumber.toUpperCase().trim() === searchAdmNo.toUpperCase().trim());
    if (match) {
      setSelectedStudent(match);
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
    triggerToast('Profile updated.');
  };

  const handleToggleAttendance = (id: string, newStatus: 'present' | 'absent' | 'late' | 'leave') => {
    const next = attendanceRoster.map(a => a.id === id ? { ...a, status: newStatus } : a);
    setAttendanceRoster(next);
    setMockAttendance(next);
  };

  const handleSaveAttendance = (type: 'student' | 'faculty') => {
    triggerToast(`${type === 'student' ? 'Section ' + selectedSection : 'Faculty'} Attendance saved for date ${attendanceDate}`);
  };

  // Stats
  const feeCollectedToday = students.reduce((sum, s) => {
    return sum + s.receipts.reduce((acc, r) => acc + r.amount, 0);
  }, 0) - 540000 + 215000;
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

  // --- SUBPAGE A: STUDENT SEARCH PAGE (FULL SCREEN) ---
  if (activeSubPage === 'student_search') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign()}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => { setActiveSubPage('menu'); setSelectedStudent(null); }} style={styles.backArrowBtn} className="press-interactive">
              ← Back to Dashboard
            </button>
          </div>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Student Search Console</h1>
          <p style={styles.subtitle}>Audit college rosters and update permanent address fields</p>
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

            {/* Quick Fill Tags Block */}
            <div style={styles.quickFillContainer}>
              <span style={{ fontSize: '10px', color: 'var(--muted-gray)', fontWeight: 700 }}>Quick Selection:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {students.map(s => (
                  <button
                    key={s.admissionNumber}
                    onClick={() => handleQuickFill(s.admissionNumber)}
                    style={styles.quickFillPill}
                    className="press-interactive"
                  >
                    {s.admissionNumber} ({s.name.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
              <div style={styles.readOnlyBlock}>
                <div style={styles.metaRow}><span>Admission Number</span><strong>{selectedStudent.admissionNumber}</strong></div>
                <div style={styles.metaRow}><span>Student ID</span><strong>{selectedStudent.studentId}</strong></div>
                <div style={styles.metaRow}><span>QR ID</span><strong>{selectedStudent.qrId}</strong></div>
                <div style={styles.metaRow}><span>Registration Number</span><strong>{selectedStudent.registrationNumber}</strong></div>
              </div>

              {/* Editable Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Student Name</label>
                  <input
                    type="text"
                    value={selectedStudent.name}
                    onChange={(e) => handleStudentSave({ ...selectedStudent, name: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Father Name</label>
                    <input
                      type="text"
                      value={selectedStudent.fatherName}
                      onChange={(e) => handleStudentSave({ ...selectedStudent, fatherName: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Mother Name</label>
                    <input
                      type="text"
                      value={selectedStudent.motherName}
                      onChange={(e) => handleStudentSave({ ...selectedStudent, motherName: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Student Mobile</label>
                    <input
                      type="text"
                      value={selectedStudent.mobile}
                      onChange={(e) => handleStudentSave({ ...selectedStudent, mobile: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Parent Mobile</label>
                    <input
                      type="text"
                      value={selectedStudent.parentMobile}
                      onChange={(e) => handleStudentSave({ ...selectedStudent, parentMobile: e.target.value })}
                      style={styles.textInputBox}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    value={selectedStudent.email}
                    onChange={(e) => handleStudentSave({ ...selectedStudent, email: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Permanent Address</label>
                  <input
                    type="text"
                    value={selectedStudent.address}
                    onChange={(e) => handleStudentSave({ ...selectedStudent, address: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Residential Address</label>
                  <input
                    type="text"
                    value={selectedStudent.residentialAddress}
                    onChange={(e) => handleStudentSave({ ...selectedStudent, residentialAddress: e.target.value })}
                    style={styles.textInputBox}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Hostel Status</label>
                    <select
                      value={selectedStudent.hostelStatus}
                      onChange={(e) => handleStudentSave({ ...selectedStudent, hostelStatus: e.target.value as any })}
                      style={styles.selectInput}
                    >
                      <option value="Resident">Resident</option>
                      <option value="Day Scholar">Day Scholar</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={styles.formLabel}>Transport Status</label>
                    <select
                      value={selectedStudent.transportStatus}
                      onChange={(e) => handleStudentSave({ ...selectedStudent, transportStatus: e.target.value as any })}
                      style={styles.selectInput}
                    >
                      <option value="College Bus">College Bus</option>
                      <option value="Self Transport">Self Transport</option>
                    </select>
                  </div>
                </div>
              </div>
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

  // --- SUBPAGE B: ATTENDANCE MANAGEMENT PAGE (FULL SCREEN, MARKING, TIMELINE) ---
  if (activeSubPage === 'attendance') {
    const studentsList = attendanceRoster.filter(a => a.type === 'student' && a.section === selectedSection);
    const facultyList = attendanceRoster.filter(a => a.type === 'faculty');

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign()}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => { setActiveSubPage('menu'); }} style={styles.backArrowBtn} className="press-interactive">
              ← Back to Dashboard
            </button>
          </div>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Attendance Marking Console</h1>
          <p style={styles.subtitle}>Directly log daily presenters, leaves, and absentees timeline</p>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          {/* Sub-tabs header */}
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

          {/* Render Students List */}
          {attTab === 'students' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
              <h4 style={styles.sectionSubtitle}>Student Marking ({selectedSection})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {studentsList.map((stu) => (
                  <div key={stu.id} style={styles.receiptRowItem}>
                    <div>
                      <strong>{stu.name}</strong>
                      <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>ID: {stu.id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['present', 'absent', 'late'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleToggleAttendance(stu.id, st)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,0,0,0.06)',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            backgroundColor: stu.status === st ? (st === 'present' ? '#10B981' : st === 'absent' ? '#EF4444' : '#F59E0B') : 'rgba(255,255,255,0.7)',
                            color: stu.status === st ? '#fff' : 'var(--dark-charcoal)'
                          }}
                        >
                          {st.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => handleSaveAttendance('student')} style={styles.saveSubmitBtn} className="press-interactive">Submit Section Attendance</button>
            </div>
          )}

          {/* Render Faculty List */}
          {attTab === 'faculty' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
              <h4 style={styles.sectionSubtitle}>Faculty Marking</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {facultyList.map((fac) => (
                  <div key={fac.id} style={styles.receiptRowItem}>
                    <div>
                      <strong>{fac.name}</strong>
                      <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>Code: {fac.id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['present', 'absent', 'leave'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleToggleAttendance(fac.id, st)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,0,0,0.06)',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            backgroundColor: fac.status === st ? (st === 'present' ? '#10B981' : st === 'absent' ? '#EF4444' : '#D4AF37') : 'rgba(255,255,255,0.7)',
                            color: fac.status === st ? '#fff' : 'var(--dark-charcoal)'
                          }}
                        >
                          {st.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => handleSaveAttendance('faculty')} style={styles.saveSubmitBtn} className="press-interactive">Submit Faculty Attendance</button>
            </div>
          )}

          {/* Render Summary Stats */}
          {attTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
              <div style={styles.readOnlyBlock}>
                <div style={styles.metaRow}><span>Total Present Roster</span><strong>2,735</strong></div>
                <div style={styles.metaRow}><span>Total Absentees</span><strong style={{ color: '#EF4444' }}>111</strong></div>
                <div style={styles.metaRow}><span>Faculty On Duty</span><strong>180</strong></div>
                <div style={styles.metaRow}><span>Faculty On Leave</span><strong style={{ color: 'var(--royal-gold)' }}>6</strong></div>
              </div>

              <h4 style={styles.sectionSubtitle}>Section-wise Rates</h4>
              <div style={styles.readOnlyBlock}>
                <div style={styles.metaRow}><span>MPC - Section A</span><strong>96.2% Present</strong></div>
                <div style={styles.metaRow}><span>MPC - Section B</span><strong>92.4% Present</strong></div>
                <div style={styles.metaRow}><span>BiPC - Section A</span><strong>94.8% Present</strong></div>
                <div style={styles.metaRow}><span>CEC - Section A</span><strong>98.0% Present</strong></div>
              </div>
            </div>
          )}
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
  }

  // --- DUSTY DASHBOARD MAIN MENU (WITH 4 METRICS CARDS & HEADER WELCOME) ---
  return (
    <div style={styles.container}>
      {renderBackgroundDesign()}
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 1 }}>
          <div style={styles.parentWelcomeRow}>
            <div style={styles.avatarMini}>VN</div>
            <div>
              <span style={styles.greetingText}>Inspire ERP Console,</span>
              <h2 style={styles.parentWelcomeTitle}>Finance Wing Console</h2>
              <p style={styles.childMetaText}>Principal Accountant Console</p>
            </div>
          </div>
        </div>
      </header>

      <main style={{ ...styles.content, zIndex: 1 }}>
        {/* TOP DASHBOARD METRICS CARDS (Luxury Glassmorphism, 24px) */}
        <section style={styles.metricsGrid}>
          <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
            <span style={styles.metricLabel}>Total Fee Collection Today</span>
            <span style={{ ...styles.metricValue, color: '#10B981' }}>₹{feeCollectedToday.toLocaleString('en-IN')}</span>
          </GlassCard>
          
          <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
            <span style={styles.metricLabel}>Pending Fees</span>
            <span style={{ ...styles.metricValue, color: '#EF4444' }}>₹{pendingFeesTotal.toLocaleString('en-IN')}</span>
          </GlassCard>

          <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
            <span style={styles.metricLabel}>Total Students Present Today</span>
            <span style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>2,735</span>
            <span style={styles.metricSub}>96.1% Attendance Rate</span>
          </GlassCard>

          <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
            <span style={styles.metricLabel}>Total Students Absent Today</span>
            <span style={styles.metricValue}>111</span>
            <span style={styles.metricSub}>3.9% Absentees</span>
          </GlassCard>
        </section>

        <h3 style={styles.sectionTitle}>Main Finance Actions</h3>
        
        {/* Module cards grid (Contains 1 & 4 as subpages, and redirects to 2 & 5) */}
        <div style={styles.quickGrid}>
          {/* 1. Student Search */}
          <GlassCard hoverable={true} style={styles.moduleCard} onClick={() => setActiveSubPage('student_search')}>
            <div style={styles.moduleIconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h4 style={styles.moduleTitle}>1. Student Search</h4>
            <p style={styles.moduleDesc}>Access full registry files and update permanent parent contact info.</p>
          </GlassCard>

          {/* 2. Fee Collection (Redirects to active academics tab) */}
          <GlassCard hoverable={true} style={styles.moduleCard} onClick={() => setActiveTab('academics')}>
            <div style={styles.moduleIconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            </div>
            <h4 style={styles.moduleTitle}>2. Fee Collection Desk</h4>
            <p style={styles.moduleDesc}>Go to unified cash collector view to log partial or full term installments.</p>
          </GlassCard>

          {/* 4. Attendance Management (Marking console subpage) */}
          <GlassCard hoverable={true} style={styles.moduleCard} onClick={() => setActiveSubPage('attendance')}>
            <div style={styles.moduleIconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="15" rx="2" />
                <line x1="16" y1="2" x2="16" y2="4" />
              </svg>
            </div>
            <h4 style={styles.moduleTitle}>3. Attendance Management</h4>
            <p style={styles.moduleDesc}>Mark daily attendance for students (section-wise) and faculty staff.</p>
          </GlassCard>

          {/* 5. Collection Reports (Redirects to updates tab) */}
          <GlassCard hoverable={true} style={styles.moduleCard} onClick={() => setActiveTab('updates')}>
            <div style={styles.moduleIconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h4 style={styles.moduleTitle}>4. Collection Reports</h4>
            <p style={styles.moduleDesc}>Audit daily collection worksheets and export spreadsheets.</p>
          </GlassCard>
        </div>
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

// ─── 2. ACADEMICS TAB (FULL FEE COLLECTION PAGE) ───
export const AccountantAcademicsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(getMockStudents);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<'receipt_view' | null>(null);

  // Input states
  const [feeCollectAdm, setFeeCollectAdm] = useState('');
  const [collectAmount, setCollectAmount] = useState('');
  const [collectCategory, setCollectCategory] = useState('Tuition Fee');
  const [collectMode, setCollectMode] = useState('UPI / NetBanking');
  const [collectInstallment, setCollectInstallment] = useState('Installment 1');

  // Trigger sync
  useEffect(() => {
    setStudents(getMockStudents());
  }, [activeOverlay]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleQuickFill = (admNo: string) => {
    setFeeCollectAdm(admNo);
    const match = students.find(s => s.admissionNumber === admNo) || null;
    setSelectedStudent(match);
  };

  const handleFeePayment = (type: 'collect' | 'partial' | 'full') => {
    if (!selectedStudent) return;
    
    let payAmount = 0;
    if (type === 'full') {
      payAmount = selectedStudent.remainingBalance;
    } else if (type === 'partial') {
      payAmount = Math.round(selectedStudent.remainingBalance / 2);
    } else {
      payAmount = parseFloat(collectAmount);
    }

    if (isNaN(payAmount) || payAmount <= 0) {
      triggerToast('Please type a valid amount.');
      return;
    }

    if (payAmount > selectedStudent.remainingBalance) {
      triggerToast('Payment exceeds balance.');
      return;
    }

    const newBal = selectedStudent.remainingBalance - payAmount;
    const newReceipt: Receipt = {
      receiptNumber: `REC-2026-0${Date.now().toString().slice(-3)}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      category: collectCategory,
      installment: collectInstallment,
      amount: payAmount,
      balance: newBal,
      mode: collectMode,
      cashier: 'Mr. Venkatesh'
    };

    const updatedStudent: Student = {
      ...selectedStudent,
      totalPaid: selectedStudent.totalPaid + payAmount,
      remainingBalance: newBal,
      receipts: [newReceipt, ...selectedStudent.receipts]
    };

    const next = students.map(s => s.admissionNumber === selectedStudent.admissionNumber ? updatedStudent : s);
    setStudents(next);
    setMockStudents(next);
    setSelectedStudent(updatedStudent);
    setSelectedReceipt(newReceipt);
    setCollectAmount('');
    
    triggerToast(`Payment of ₹${payAmount.toLocaleString('en-IN')} logged.`);
    setActiveOverlay('receipt_view');
  };

  // Fixed PDF opening to prevent parent window lock (No auto blocking window.print)
  const handleDownloadPDF = (receipt: Receipt, student: Student) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast('Please allow popups to open receipts.');
      return;
    }
    
    const receiptHtml = `
      <html>
      <head>
        <title>Receipt_${receipt.receiptNumber}</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1E293B; background: #FAFBFD; }
          .receipt-box { border: 2.5px solid #D4AF37; border-radius: 20px; padding: 30px; background: #fff; max-width: 600px; margin: auto; }
          .header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: #D4AF37; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
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

  return (
    <div style={styles.container}>
      {renderBackgroundDesign()}
      <header style={styles.header}>
        <h1 style={styles.title}>Fee Collection Desk</h1>
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
                if (match) setSelectedStudent(match);
                else triggerToast('Not found.');
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
                <button
                  key={s.admissionNumber}
                  onClick={() => handleQuickFill(s.admissionNumber)}
                  style={styles.quickFillPill}
                  className="press-interactive"
                >
                  {s.admissionNumber} ({s.name.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedStudent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
            
            <div style={styles.readOnlyBlock}>
              <div style={styles.metaRow}><span>Student Name</span><strong>{selectedStudent.name}</strong></div>
              <div style={styles.metaRow}><span>Admission No</span><strong>{selectedStudent.admissionNumber}</strong></div>
              <div style={styles.metaRow}><span>Mobile Contact</span><strong>{selectedStudent.mobile}</strong></div>
            </div>

            {/* Fee sheet */}
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
                <button onClick={() => handleFeePayment('collect')} style={styles.saveSubmitBtn} className="press-interactive">Collect Custom Fee</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#10B981', fontWeight: 800, padding: '16px' }}>
                ✓ Student fees settled. Balance is zero.
              </div>
            )}

            {/* Receipt logs */}
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

      {/* Printable receipt modal popup */}
      {activeOverlay === 'receipt_view' && selectedReceipt && selectedStudent && (
        <div style={styles.overlayOverlay} className="anim-fade-in">
          <div style={{ ...styles.overlaySheet, position: 'relative' }} className="glass-panel-heavy">
            {/* Highly clickable close button at top-right */}
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
              title="Close Panel"
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
                  <div style={styles.metaRow}><span>Installment:</span><strong>{selectedReceipt.installment}</strong></div>
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

// ─── 3. UPDATES TAB (FULL COLLECTION REPORTS PAGE) ───
export const AccountantUpdatesView: React.FC = () => {
  const [students] = useState<Student[]>(getMockStudents);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const allTransactions = students.flatMap(s => s.receipts.map(r => ({ student: s, receipt: r })));

  return (
    <div style={styles.container}>
      {renderBackgroundDesign()}
      <header style={styles.header}>
        <h1 style={styles.title}>Collection Reports & Auditing</h1>
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
          {allTransactions.length === 0 ? (
            <span style={{ fontSize: '11px', color: 'var(--muted-gray)', textAlign: 'center' }}>No payments logged yet.</span>
          ) : (
            allTransactions.map((tx, idx) => (
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
            ))
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', zIndex: 1 }}>
          <button onClick={() => triggerToast('Downloaded collection audit reports as PDF.')} style={{ ...styles.sheetBtn, backgroundColor: 'var(--royal-gold)', color: 'var(--dark-charcoal)', fontWeight: 800 }} className="press-interactive">Download PDF</button>
          <button onClick={() => triggerToast('Exported collections ledger sheet as Excel.')} style={{ ...styles.sheetBtn, backgroundColor: '#E2E8F0', color: 'var(--dark-charcoal)' }} className="press-interactive">Export Excel</button>
        </div>
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

// ─── 4. PROFILE TAB (WITH ACCENT THEME & RULES SUBPAGES) ───
export const AccountantProfileView: React.FC = () => {
  const [profilePage, setProfilePage] = useState<'menu' | 'appearance' | 'late_fees' | 'scholarships'>('menu');
  const [settings, setSettings] = useState(getMockSettings);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const { setThemeMode, theme } = useNavigation();

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSettingsSave = () => {
    setMockSettings(settings);
    triggerToast('Settings configuration saved successfully.');
    setProfilePage('menu');
  };

  const handleLogout = () => {
    if ((window as any).logoutUser) {
      (window as any).logoutUser();
    }
  };

  // --- SUBPAGE A: ACCENT APPEARANCE ---
  if (profilePage === 'appearance') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign()}
        <header style={styles.header}>
          <button onClick={() => setProfilePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Settings
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Appearance Accent</h1>
          <p style={styles.subtitle}>Select visual mode preference for the cashier dashboard</p>
        </header>
        <main style={styles.content}>
          <div style={styles.readOnlyBlock}>
            <p style={{ fontSize: '12px', color: 'var(--muted-gray)', lineHeight: '1.4', marginBottom: '12px' }}>
              Shift between standard light mode, low-light dark mode, or follow system default settings.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(['Light', 'Dark', 'System'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setThemeMode(m);
                    triggerToast(`Accent switched to ${m} mode.`);
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1.5px solid var(--card-border)',
                    fontFamily: 'var(--font-family)',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    backgroundColor: theme === (m === 'Dark' ? 'dark' : m === 'Light' ? 'light' : theme) ? 'var(--royal-gold)' : 'rgba(255,255,255,0.5)',
                    color: theme === (m === 'Dark' ? 'dark' : m === 'Light' ? 'light' : theme) ? '#fff' : 'var(--dark-charcoal)'
                  }}
                  className="press-interactive"
                >
                  {m} Accent Mode
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- SUBPAGE B: LATE FEE RULES ---
  if (profilePage === 'late_fees') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign()}
        <header style={styles.header}>
          <button onClick={() => setProfilePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Settings
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
                value={settings.lateFeeRules}
                onChange={(e) => setSettings({ ...settings, lateFeeRules: e.target.value })}
                style={styles.textInputBox}
              />
            </div>
            <button onClick={handleSettingsSave} style={styles.saveSubmitBtn} className="press-interactive">Save Late Fee Rules</button>
          </div>
        </main>
      </div>
    );
  }

  // --- SUBPAGE C: SCHOLARSHIPS RULES ---
  if (profilePage === 'scholarships') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign()}
        <header style={styles.header}>
          <button onClick={() => setProfilePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Settings
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Scholarships & Discounts</h1>
          <p style={styles.subtitle}>Configure waivers, sibling discounts, and sports quotas</p>
        </header>
        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.formLabel}>Scholarship Quotas configuration</label>
              <input
                type="text"
                value={settings.scholarshipRules}
                onChange={(e) => setSettings({ ...settings, scholarshipRules: e.target.value })}
                style={styles.textInputBox}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={styles.formLabel}>Discounts / Sibling rules</label>
              <input
                type="text"
                value={settings.discountRules}
                onChange={(e) => setSettings({ ...settings, discountRules: e.target.value })}
                style={styles.textInputBox}
              />
            </div>
            <button onClick={handleSettingsSave} style={styles.saveSubmitBtn} className="press-interactive">Save Waivers Rules</button>
          </div>
        </main>
      </div>
    );
  }

  // --- DEFAULT MENU VIEW ---
  return (
    <div style={styles.container} className="anim-slide-up">
      {renderBackgroundDesign()}
      <header style={styles.header}>
        <h1 style={styles.title}>Accountant Settings</h1>
        <p style={styles.subtitle}>System configuration switches and cashier profile</p>
      </header>

      <main style={styles.content}>
        <GlassCard hoverable={false} style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.45)', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '24px' }}>
          <div style={styles.heroAvatar}>VN</div>
          <h3 style={{ ...styles.studentName, marginTop: '12px' }}>Mr. Venkatesh</h3>
          <span style={styles.studentID}>Emp ID: EMP-2026-9048 • Head Cashier</span>
        </GlassCard>

        {/* List of separate settings sub-pages (Student-side style panels) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Configurations Sub-panels</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => setProfilePage('appearance')} style={styles.settingLinkRow} className="press-interactive">
              <span>Appearance & Color Themes Accent</span>
              <span style={{ color: 'var(--royal-gold)', fontWeight: 800 }}>Select →</span>
            </button>
            
            <button onClick={() => setProfilePage('late_fees')} style={styles.settingLinkRow} className="press-interactive">
              <span>Late Fee Rules Config</span>
              <span style={{ color: 'var(--royal-gold)', fontWeight: 800 }}>Configure →</span>
            </button>

            <button onClick={() => setProfilePage('scholarships')} style={styles.settingLinkRow} className="press-interactive">
              <span>Scholarships & Sibling Discounts</span>
              <span style={{ color: 'var(--royal-gold)', fontWeight: 800 }}>Configure →</span>
            </button>
          </div>
        </section>

        <button onClick={handleLogout} style={styles.logoutBtn} className="press-interactive">
          Terminate Current Session
        </button>
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
  quickGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  moduleCard: {
    padding: '20px',
    borderRadius: '24px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    border: '1.5px solid var(--card-border)',
    boxShadow: 'var(--shadow-sm)',
    backgroundColor: 'var(--card-bg)',
  },
  moduleIconWrapper: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: 'rgba(212,175,55,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(212,175,55,0.2)',
  },
  moduleTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
  },
  moduleDesc: {
    fontSize: '11.5px',
    color: 'var(--muted-gray)',
    lineHeight: '1.4',
  },
  overlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 15, 16, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlaySheet: {
    width: '92%',
    maxWidth: '420px',
    maxHeight: '84vh',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    border: '1.5px solid var(--card-border)',
  },
  overlayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted-gray)',
    cursor: 'pointer',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
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
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px',
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
  chartContainer: {
    padding: '18px',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
    border: '1.5px solid var(--card-border)',
  },
  chartLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    marginBottom: '16px',
  },
  chartBarRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '110px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    paddingBottom: '6px',
  },
  chartBar: {
    width: '24px',
    backgroundColor: 'var(--royal-gold)',
    borderRadius: '6px 6px 0 0',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '4px',
  },
  barVal: {
    fontSize: '9px',
    color: '#fff',
    fontWeight: 800,
  },
  chartAxis: {
    display: 'flex',
    justifyContent: 'space-around',
    fontSize: '9px',
    color: 'var(--muted-gray)',
    marginTop: '6px',
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
  themeToggleBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--dark-charcoal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
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
  settingLinkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    border: '1.5px solid var(--card-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'var(--font-family)',
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    cursor: 'pointer',
  }
};
