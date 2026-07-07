import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { InspireLogo } from '../components/common/InspireLogo';

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
  course: string;
  section: string;
  branch: string;
  rollNumber: string;
  status: 'Active' | 'Inactive';
  tempPassword?: string;
  documents: string[];
}

interface Teacher {
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
}

interface Bulletin {
  id: string;
  category: 'announcement' | 'gallery' | 'event' | 'circular' | 'notice' | 'holiday';
  title: string;
  date: string;
  content: string;
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
  { id: 'FAC-201', name: 'Mr. Ramesh K', subject: 'Physics', mobile: '9000100021', salary: 75000, assignedClasses: ['Junior MPC', 'Senior MPC'], assignedSections: ['Section A', 'Section B'], assignedSubjects: ['Physics'], status: 'Active' },
  { id: 'FAC-202', name: 'Mrs. Sarada M', subject: 'Chemistry', mobile: '9000100022', salary: 80000, assignedClasses: ['Junior BiPC'], assignedSections: ['Section A'], assignedSubjects: ['Chemistry'], status: 'Active' },
  { id: 'FAC-203', name: 'Mr. Anand S', subject: 'Mathematics', mobile: '9000100023', salary: 85000, assignedClasses: ['Junior MPC'], assignedSections: ['Section A'], assignedSubjects: ['Mathematics'], status: 'Active' }
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

const setAdminStudents = (s: Student[]) => {
  (window as any)._adminStudents = s;
};

const getAdminTeachers = (): Teacher[] => {
  if (!(window as any)._adminTeachers) {
    (window as any)._adminTeachers = INITIAL_TEACHERS_LIST;
  }
  return (window as any)._adminTeachers;
};

const setAdminTeachers = (t: Teacher[]) => {
  (window as any)._adminTeachers = t;
};

const getAdminBulletins = (): Bulletin[] => {
  if (!(window as any)._adminBulletins) {
    (window as any)._adminBulletins = INITIAL_BULLETINS;
  }
  return (window as any)._adminBulletins;
};

const setAdminBulletins = (b: Bulletin[]) => {
  (window as any)._adminBulletins = b;
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

const setMockAcademicFees = (fees: any) => {
  (window as any)._adminAcademicFees = fees;
};

// ─── ADMIN DASHBOARD CONTROLLER ───
export const AdminDashboardView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState<string>('menu');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
  const [exams, setExams] = useState([
    { id: 'EX-1', name: 'Quarterly Physics Term', date: '10 Aug 2026', class: 'Junior MPC', status: 'Scheduled', resultsPublished: false },
    { id: 'EX-2', name: 'Half-Yearly Math Exam', date: '24 Sep 2026', class: 'Junior MPC', status: 'Scheduled', resultsPublished: false }
  ]);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamClass] = useState('Junior MPC');

  // Academic baseline fees state (Locked by default, only once editable)
  const [feeRates, setFeeRates] = useState(getMockAcademicFees);

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

  // Selected files for Timetable & Results
  const [timetableFile, setTimetableFile] = useState<File | null>(null);
  const [resultsFile, setResultsFile] = useState<File | null>(null);

  const handleUploadTimetable = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimetableFile(file);
      triggerToast(`Selected Timetable: ${file.name}`);
    }
  };

  const submitTimetable = () => {
    if (!timetableFile) {
      triggerToast('Please select a timetable file first.');
      return;
    }
    triggerToast(`Timetable file '${timetableFile.name}' uploaded and parsed successfully!`);
    setTimetableFile(null);
  };

  const handleUploadResults = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResultsFile(file);
      triggerToast(`Selected Results: ${file.name}`);
    }
  };

  const submitResults = () => {
    if (!resultsFile) {
      triggerToast('Please select a CSV or Excel results sheet first.');
      return;
    }
    const mockExamName = resultsFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    const newExam = {
      id: `EX-${exams.length + 1}`,
      name: mockExamName || 'Imported Excel Results',
      date: 'Today',
      class: 'Junior MPC',
      status: 'Results Published',
      resultsPublished: true
    };
    setExams([newExam, ...exams]);
    triggerToast(`Successfully parsed and split '${resultsFile.name}'. Imported student rows & published grades!`);
    setResultsFile(null);
  };

  const { theme, setThemeMode } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Sync state variables
  useEffect(() => {
    setStudents(getAdminStudents());
    setTeachers(getAdminTeachers());
    setBulletins(getAdminBulletins());
    setFeeRates(getMockAcademicFees());
  }, [activePage]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStudentQuickFill = (admNo: string) => {
    setSearchAdm(admNo);
    const match = students.find(s => s.admissionNumber === admNo) || null;
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
      setSelectedStudent(match);
      setEditStudent({ ...match });
      triggerToast('Student loaded.');
    } else {
      triggerToast('Student record not found.');
    }
  };

  const handleStudentSave = (updated: Student) => {
    const next = students.map(s => s.admissionNumber === updated.admissionNumber ? updated : s);
    setStudents(next);
    setAdminStudents(next);
    setSelectedStudent(updated);
    setEditStudent({ ...updated });
    triggerToast('Student profile details submitted and saved.');
  };

  const handleTeacherSave = (updated: Teacher) => {
    const next = teachers.map(t => t.id === updated.id ? updated : t);
    setTeachers(next);
    setAdminTeachers(next);
    setSelectedTeacher(updated);
    setEditTeacher({ ...updated });
    triggerToast('Teacher credentials submitted and saved.');
  };

  const handleRegisterStudent = () => {
    if (!newStuName || !newStuFather || !newStuMobile) {
      triggerToast('Please complete all basic fields.');
      return;
    }
    const newAdm = `ADM2400${students.length + 1}`;
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
      email: `${newStuName.toLowerCase().replace(' ', '')}@inspire.edu`,
      address: 'Madhapur Campus, Hyderabad',
      residentialAddress: 'Day Scholar',
      hostelStatus: 'Day Scholar',
      transportStatus: 'Self Transport',
      course: newStuCourse,
      section: newStuSec,
      branch: 'Madhapur',
      rollNumber: `24${newStuCourse}0${students.length + 1}`,
      status: 'Active',
      documents: ['10th Marksheet.pdf', 'Aadhaar Card.pdf']
    };

    const next = [...students, newStu];
    setStudents(next);
    setAdminStudents(next);
    setNewStuName('');
    setNewStuFather('');
    setNewStuMobile('');
    triggerToast(`Student ${newStuName} registration changes submitted: ${newAdm}`);
  };

  const handleDeactivateStudent = () => {
    if (!selectedStudent || !editStudent) return;
    const newStatus = selectedStudent.status === 'Active' ? 'Inactive' : 'Active';
    const updated = { ...editStudent, status: newStatus as any };
    handleStudentSave(updated);
    triggerToast(`Account status updated to ${newStatus}.`);
  };

  const handleResetPassword = () => {
    if (!selectedStudent || !editStudent) return;
    const updated = { ...editStudent, tempPassword: `TEMP_${Math.floor(Math.random() * 9000 + 1000)}` };
    handleStudentSave(updated);
    triggerToast(`Password reset successfully.`);
  };

  const handleAddTeacher = () => {
    if (!newFacName || !newFacSal) {
      triggerToast('Please enter faculty details.');
      return;
    }
    const newId = `FAC-20${teachers.length + 1}`;
    const newT: Teacher = {
      id: newId,
      name: newFacName,
      subject: newFacSub,
      mobile: '9000000000',
      salary: parseFloat(newFacSal),
      assignedClasses: ['Junior MPC'],
      assignedSections: ['Section A'],
      assignedSubjects: [newFacSub],
      status: 'Active'
    };

    const next = [...teachers, newT];
    setTeachers(next);
    setAdminTeachers(next);
    setNewFacName('');
    setNewFacSal('');
    triggerToast(`Teacher ${newFacName} registration changes submitted!`);
  };

  const handleAssignTeacherDuty = () => {
    if (!selectedTeacher || !editTeacher) return;
    const updated: Teacher = {
      ...editTeacher,
      assignedClasses: Array.from(new Set([...editTeacher.assignedClasses, assignClass])),
      assignedSections: Array.from(new Set([...editTeacher.assignedSections, assignSec])),
      assignedSubjects: Array.from(new Set([...editTeacher.assignedSubjects, assignSub]))
    };
    const next = teachers.map(t => t.id === selectedTeacher.id ? updated : t);
    setTeachers(next);
    setAdminTeachers(next);
    setSelectedTeacher(updated);
    setEditTeacher(updated);
    triggerToast('Duty allocation changes submitted.');
  };

  const handlePublishBulletin = () => {
    if (!newPubTitle || !newPubContent) {
      triggerToast('Bulletin must contain Title and Body.');
      return;
    }

    if (editingPubId) {
      const next = bulletins.map(b => b.id === editingPubId ? { ...b, title: newPubTitle, content: newPubContent } : b);
      setBulletins(next);
      setAdminBulletins(next);
      setEditingPubId(null);
      triggerToast('Notice edits submitted and published.');
    } else {
      const newB: Bulletin = {
        id: `BUL-0${bulletins.length + 1}`,
        category: pubCat,
        title: newPubTitle,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        content: newPubContent
      };
      const next = [...bulletins, newB];
      setBulletins(next);
      setAdminBulletins(next);
      triggerToast('Broadcast notice changes submitted!');
    }
    setNewPubTitle('');
    setNewPubContent('');
  };

  const handleDeleteBulletin = (id: string) => {
    const next = bulletins.filter(b => b.id !== id);
    setBulletins(next);
    setAdminBulletins(next);
    triggerToast('Notice deleted.');
  };

  const handleScheduleExam = () => {
    if (!newExamName || !newExamDate) {
      triggerToast('Exam scheduling fields must be completed.');
      return;
    }
    const newEx = {
      id: `EX-${exams.length + 1}`,
      name: newExamName,
      date: newExamDate,
      class: newExamClass,
      status: 'Scheduled',
      resultsPublished: false
    };
    setExams([...exams, newEx]);
    setNewExamName('');
    setNewExamDate('');
    triggerToast(`Exam ${newExamName} scheduling changes submitted.`);
  };

  const handlePublishResults = (id: string) => {
    setExams(exams.map(e => e.id === id ? { ...e, resultsPublished: true, status: 'Results Published' } : e));
    triggerToast('Exam results published and broadcasted to Parent apps!');
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

  const handleSaveAcademicFees = () => {
    const next = { ...feeRates, isLocked: true };
    setFeeRates(next);
    setMockAcademicFees(next);
    triggerToast('Academic baseline fees finalized and LOCKED successfully.');
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
          <div style={{ width: 140, height: 20, borderRadius: 4 }} className="shimmer-item" />
        </div>
        <div style={styles.content}>
          <div style={{ height: 180, borderRadius: '24px' }} className="shimmer-item" />
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
                {students.map(s => (
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
    const list = teachers.filter(t => t.name.toLowerCase().includes(searchFac.toLowerCase()) || t.subject.toLowerCase().includes(searchFac.toLowerCase()));

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
                    <strong>{t.name} ({t.subject})</strong>
                    <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>Salary: ₹{t.salary.toLocaleString('en-IN')} • Code: {t.id}</div>
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
                <div style={styles.metaRow}><span>Subject Head</span><strong>{selectedTeacher.subject}</strong></div>
                <div style={styles.metaRow}><span>Mobile Contact</span><strong>{selectedTeacher.mobile}</strong></div>
                <div style={styles.metaRow}><span>Monthly Salary</span><strong>₹{selectedTeacher.salary.toLocaleString('en-IN')}</strong></div>
                <div style={styles.metaRow}><span>Teacher Login Code</span><strong>{selectedTeacher.id}</strong></div>
                <div style={styles.metaRow}><span>Account Status</span><strong style={{ color: selectedTeacher.status === 'Active' ? '#10B981' : '#EF4444' }}>{selectedTeacher.status}</strong></div>
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
                    <input type="number" placeholder="e.g. 75000" value={newFacSal} onChange={(e) => setNewFacSal(e.target.value)} style={styles.textInputBox} />
                  </div>
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
                      setEditingPubId(b.id);
                    }}
                    style={styles.actionItemBtn}
                    className="press-interactive"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDeleteBulletin(b.id)} style={{ ...styles.actionItemBtn, color: '#D32F2F' }} className="press-interactive">Delete</button>
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
              accept=".csv, .xlsx, .xls, .pdf"
              style={{ display: 'none' }}
              onChange={handleUploadTimetable}
            />
            {/* GOLD PLUS ICON */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5" style={{ margin: 'auto' }}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h4 style={{ ...styles.sectionSubtitle, margin: '8px 0 4px 0' }}>Upload Timetable File</h4>
            <p style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>
              {timetableFile ? `📄 Selected: ${timetableFile.name}` : 'Click here or drag & drop Excel/PDF sheets to upload weekly classes timetables.'}
            </p>
            {timetableFile && (
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
            {resultsFile && (
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
              <div key={e.id} style={styles.receiptRowItem}>
                <div>
                  <strong>{e.name}</strong>
                  <div style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>{e.class} • {e.date} • {e.status}</div>
                </div>
                {!e.resultsPublished && (
                  <button onClick={() => handlePublishResults(e.id)} style={styles.actionItemBtn} className="press-interactive">Submit & Publish Results</button>
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

  // ─── SUBPAGE 7: ACADEMIC FEES (New module replacing Hostel) ───
  if (activePage === 'academic_fees') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('orange')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Academic Fees per Year</h1>
          <p style={styles.subtitle}>Configure base fees parameters. Locked by default once submitted.</p>
        </header>

        <main style={styles.content}>
          <div style={{ ...styles.readOnlyBlock, zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Term Fees structure</h4>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                color: feeRates.isLocked ? '#EF4444' : 'var(--royal-gold)',
                backgroundColor: feeRates.isLocked ? 'rgba(239,68,68,0.06)' : 'rgba(212,175,55,0.06)',
                border: `1.5px solid ${feeRates.isLocked ? '#EF4444' : 'var(--royal-gold)'}`,
                padding: '4px 8px',
                borderRadius: '8px'
              }}>
                {feeRates.isLocked ? '🔒 Locked - Fee rates finalized' : '⚠️ Only once editable'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Tuition Fee (₹)</label>
                <input
                  type="number"
                  disabled={feeRates.isLocked}
                  value={feeRates.tuition}
                  onChange={(e) => setFeeRates({ ...feeRates, tuition: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.textInputBox, opacity: feeRates.isLocked ? 0.6 : 1 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Hostel Admission Fee (₹)</label>
                <input
                  type="number"
                  disabled={feeRates.isLocked}
                  value={feeRates.hostel}
                  onChange={(e) => setFeeRates({ ...feeRates, hostel: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.textInputBox, opacity: feeRates.isLocked ? 0.6 : 1 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Transport Fee (₹)</label>
                <input
                  type="number"
                  disabled={feeRates.isLocked}
                  value={feeRates.transport}
                  onChange={(e) => setFeeRates({ ...feeRates, transport: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.textInputBox, opacity: feeRates.isLocked ? 0.6 : 1 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={styles.formLabel}>Miscellaneous Fee (₹)</label>
                <input
                  type="number"
                  disabled={feeRates.isLocked}
                  value={feeRates.misc}
                  onChange={(e) => setFeeRates({ ...feeRates, misc: parseFloat(e.target.value) || 0 })}
                  style={{ ...styles.textInputBox, opacity: feeRates.isLocked ? 0.6 : 1 }}
                />
              </div>
            </div>

            {!feeRates.isLocked && (
              <button 
                onClick={handleSaveAcademicFees} 
                style={{ ...styles.saveSubmitBtn, marginTop: '16px' }} 
                className="press-interactive"
              >
                Lock & Save Academic Fees Rates
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── SUBPAGE 8: REPORTS COMPILER ───
  if (activePage === 'reports') {
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
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

  // ─── SUBPAGE 9: ATTENDANCE DASHBOARD ───
  if (activePage === 'attendance') {
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
              <strong style={{ ...styles.metricValue, color: '#10B981' }}>2,735</strong>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Students Absent</span>
              <strong style={{ ...styles.metricValue, color: '#EF4444' }}>111</strong>
            </div>
          </div>
          <div style={{ ...styles.metricsGrid, zIndex: 1 }}>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Faculty Present</span>
              <strong style={styles.metricValue}>180</strong>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Faculty on Leave</span>
              <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>6</strong>
            </div>
          </div>

          <h4 style={styles.sectionSubtitle}>Section-wise Attendance Summary</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            <div style={styles.receiptRowItem}><span>MPC - Section A</span><strong>96.2% Present</strong></div>
            <div style={styles.receiptRowItem}><span>MPC - Section B</span><strong>92.4% Present</strong></div>
            <div style={styles.receiptRowItem}><span>BiPC - Section A</span><strong>94.8% Present</strong></div>
            <div style={styles.receiptRowItem}><span>CEC - Section A</span><strong>98.0% Present</strong></div>
          </div>
        </main>
      </div>
    );
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

  // ─── SUBPAGE 11: ADMIN PROFILE BIO ───
  if (activePage === 'profile') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('navy')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            ← Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Dean Profile Console</h1>
          <p style={styles.subtitle}>Consolidated credentials and administrator clearances</p>
        </header>

        <main style={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
            <GlassCard hoverable={false} style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.45)' }}>
              <div style={styles.heroAvatar}>AD</div>
              <h3 style={{ ...styles.studentName, marginTop: '12px' }}>Dean Administration</h3>
              <span style={styles.studentID}>General Coordinator & Director</span>
              <div style={styles.heroLineDivider} />
              <div style={styles.heroMetaGrid}>
                <div style={styles.metaRow}><span>Active ERP Registry</span><strong>Inspire Campus Cockpit</strong></div>
                <div style={styles.metaRow}><span>Clearance Level</span><strong>Tier-1 Principal Dean</strong></div>
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
            <div style={styles.avatarMini}>AD</div>
            <div>
              <span style={styles.greetingText}>Inspire ERP Control,</span>
              <h2 style={styles.parentWelcomeTitle}>Dean Consolidated Cockpit</h2>
              <p style={styles.childMetaText}>Principal General Administrator</p>
            </div>
          </div>
          {/* VERY VISIBLE LOGO BRANDING */}
          <div style={{ paddingRight: '8px' }}>
            <InspireLogo size="md" />
          </div>
        </div>
      </header>

      <main style={{ ...styles.content, zIndex: 1 }}>
        {/* SUMMARY STATS ROW 1 & 2 */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Row 1: Students */}
          <div style={styles.metricsGrid}>
            <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
              <span style={styles.metricLabel}>Total Students Present Today</span>
              <strong style={{ ...styles.metricValue, color: '#10B981' }}>2,735</strong>
              <span style={styles.metricSub}>96.1% Attendance Rate</span>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
              <span style={styles.metricLabel}>Total Students Absent Today</span>
              <strong style={{ ...styles.metricValue, color: '#EF4444' }}>111</strong>
              <span style={styles.metricSub}>3.9% Absent</span>
            </GlassCard>
          </div>

          {/* Row 2: Faculty */}
          <div style={styles.metricsGrid}>
            <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
              <span style={styles.metricLabel}>Total Faculty Present Today</span>
              <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>180</strong>
              <span style={styles.metricSub}>96.8% Present</span>
            </GlassCard>
            <GlassCard hoverable={false} style={styles.metricCard} className="glass-gold-ring">
              <span style={styles.metricLabel}>Total Faculty on Leave Today</span>
              <strong style={styles.metricValue}>6</strong>
              <span style={styles.metricSub}>3.2% Leave Rate</span>
            </GlassCard>
          </div>

        </section>

        {/* 12 Mosaic Grid of Cards with Unique Glowing Colors Backgrounds */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Administrative Modules</h3>
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
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Students Registry</h4>
              <p style={styles.moduleDesc}>Register admissions, edit details, reset logs.</p>
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
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Faculty Mgmt</h4>
              <p style={styles.moduleDesc}>Search lecturers, allocate subject slots, check salaries.</p>
            </div>

            {/* 3. Publishing Center */}
            <div
              onClick={() => setActivePage('publishing')}
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
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Publishing Desk</h4>
              <p style={styles.moduleDesc}>Compose bulletins alerts, events calendar to student app.</p>
            </div>

            {/* 4. Academic Calendar */}
            <div
              onClick={() => setActivePage('calendar')}
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
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Timetables</h4>
              <p style={styles.moduleDesc}>Configure academic timelines and upload sheets.</p>
            </div>

            {/* 5. Class Scheduling */}
            <div
              onClick={() => setActivePage('classes')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.09) 0%, rgba(20, 184, 166, 0.02) 100%)',
                border: '1.5px solid rgba(20, 184, 166, 0.3)',
                boxShadow: '0 4px 14px rgba(20, 184, 166, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20B2AA" strokeWidth="2.5">
                  <path d="M22 10v6M2 10v6M12 2l10 5-10 5L2 7l10-5z" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Class Scheduling</h4>
              <p style={styles.moduleDesc}>Map sections, allocate students and lecturers.</p>
            </div>

            {/* 6. Examination */}
            <div
              onClick={() => setActivePage('exams')}
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Exams Desk</h4>
              <p style={styles.moduleDesc}>Schedule tests term, publish grades lists.</p>
            </div>

            {/* 7. Academic Fees (New module!) */}
            <div
              onClick={() => setActivePage('academic_fees')}
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
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Academic Fees</h4>
              <p style={styles.moduleDesc}>Configure term baseline fees per academic year.</p>
            </div>

            {/* 8. Reports */}
            <div
              onClick={() => setActivePage('reports')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.09) 0%, rgba(6, 182, 212, 0.02) 100%)',
                border: '1.5px solid rgba(6, 182, 212, 0.3)',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.08)'
              }}
              className="press-interactive"
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

            {/* 9. Attendance Dashboard */}
            <div
              onClick={() => setActivePage('attendance')}
              style={{
                ...styles.moduleCardNew,
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.09) 0%, rgba(99, 102, 241, 0.02) 100%)',
                border: '1.5px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.08)'
              }}
              className="press-interactive"
            >
              <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>Attendance Summary</h4>
              <p style={styles.moduleDesc}>Examine section-wise availability stats (Read-only).</p>
            </div>

            {/* 10. ERP Settings */}
            <div
              onClick={() => setActivePage('settings')}
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
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h4 style={styles.moduleTitle}>ERP Settings</h4>
              <p style={styles.moduleDesc}>Configure academic years calendar parameters directories.</p>
            </div>

            {/* 11. Appearance Accent Mode Theme Toggle */}
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

            {/* 12. Dean Profile */}
            <div
              onClick={() => setActivePage('profile')}
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
              <h4 style={styles.moduleTitle}>Dean Profile</h4>
              <p style={styles.moduleDesc}>Review registered director bio credentials clearance.</p>
            </div>

          </div>
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
  }
};
