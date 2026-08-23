import React, { useState, useEffect } from 'react';
import { LIMITS, validateMobile, digitsOnly } from '../constants/fieldLimits';
import { CAMPUS_LIST } from '../constants/campuses';
import { useNavigation, accountCan, type ClerkPermissionKey } from '../context/NavigationContext';
import { GlassCard } from '../components/common/GlassCard';
import { InspireLogo } from '../components/common/InspireLogo';
import { apiClient, setGlobalSecurityKey } from '../services/apiClient';
import {
  admin1Service, CLERK_PERMISSION_LABELS,
  type AuditLogEntry, type Clerk, type ClerkPermissions, type PortalAccount
} from '../services/admin1Service';
import { admin2Service } from '../services/admin2Service';
import { PortalDataLoader } from '../components/common/PortalDataLoader';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import collegeLogo from '../assets/college logo.webp';
import {
  openPrintDocument, pdfHeader, pdfFooter, pdfSection, pdfTable, pdfTiles,
  pdfDetailCard, money, dateStr, escapeHtml
} from '../utils/pdfDocument';
import { useDataFreshness } from '../hooks/useDataFreshness';
import { FeeSlotEditor, freshRegFeeSlots, feeSlotsToPayload, type FeeSlot } from '../components/common/FeeSlotEditor';
import { AccountSecurityPanel } from '../components/common/AccountSecurityPanel';
import { RecentlyDeletedPanel } from '../components/common/RecentlyDeletedPanel';
import { OutstandingFeesPanel } from '../components/common/OutstandingFeesPanel';
import { downloadCsv } from '../services/accountService';


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

// escapeHtml now comes from utils/pdfDocument. The copy that lived here used
// String(str || ''), which turned 0 and false into an empty string — so a zero
// amount printed as a blank cell rather than as 0.

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
  monthlySalaries?: Record<string, MonthlySalaryRecord>;
  // Per-academic-year ledger: { '2026-2027': { June: {...}, July: {...} } }.
  // The Mongoose model has always stored this; the interface simply never
  // declared it, so every read had to be cast through `any`.
  salaryLedger?: Record<string, Record<string, MonthlySalaryRecord>>;
}

/**
 * The academic years the salary ledger covers, earliest first.
 *
 * Must stay in step with ACADEMIC_YEARS in server/app.cjs, which rejects
 * anything outside this list. The dropdown previously listed three years with
 * a static "(Year Lock Enforced)" caption on two of them — the caption was
 * decoration, showing the same text whether the year was open or not.
 */
export const ACADEMIC_YEARS = ['2026-2027', '2027-2028', '2028-2029', '2029-2030'];

/**
 * The four campuses, in the order they are shown everywhere.
 *
 * Must match VALID_CAMPUSES in server/app.cjs, which rejects anything else.
 * This literal was written out separately in five places in this file; a
 * campus added to one of them and missed in another is the kind of drift that
 * shows as a filter silently returning nothing.
 */
// Imported for use in this file AND re-exported, so existing importers that
// take CAMPUS_LIST from here keep working unchanged. A bare re-export
// would not bring the name into this module's own scope.
export { CAMPUS_LIST };

const LEDGER_MONTHS = [
  'June', 'July', 'August', 'September', 'October', 'November',
  'December', 'January', 'February', 'March', 'April', 'May'
];

/**
 * One month's salary record, read for a specific academic year.
 *
 * Every reader of the ledger must go through this. The server writes each
 * payment to BOTH `salaryLedger[year][month]` and the legacy flat
 * `monthlySalaries[month]` map (server/app.cjs, the salary-month route). That
 * flat map carries no year, so it is overwritten every time the same month is
 * paid in a later year.
 *
 * Falling back to it unconditionally is what made a newly unlocked year look
 * fully paid: 2027-2028 has no ledger entries, so all twelve months fell
 * through to 2026-2027's payments and the grid rendered them as settled.
 *
 * The map is still consulted for the FIRST academic year only, where it is
 * unambiguous — those are records written before the per-year ledger existed.
 * For any later year, an absent entry means unpaid, which is the truth.
 */
export function monthRecordFor(
  teacher: Teacher | null,
  year: string,
  month: string
): MonthlySalaryRecord | null {
  const fromLedger = teacher?.salaryLedger?.[year]?.[month];
  if (fromLedger) return fromLedger;
  if (year === ACADEMIC_YEARS[0]) {
    return teacher?.monthlySalaries?.[month] || null;
  }
  return null;
}

/** Whether a month's record counts as settled. */
export function isMonthPaid(rec: MonthlySalaryRecord | null | undefined): boolean {
  return !!rec && (rec.status === 'Paid' || rec.paid === true);
}

/** How many of the twelve months are settled in one year of a teacher's ledger. */
export function monthsPaidIn(teacher: Teacher | null, year: string): number {
  return LEDGER_MONTHS.filter(m => isMonthPaid(monthRecordFor(teacher, year, m))).length;
}

/**
 * The newest academic year this teacher has opened — the one a summary figure
 * should describe. Used by the faculty list, which has no year selector of its
 * own and previously read the year-less legacy map.
 */
export function currentLedgerYear(teacher: Teacher | null): string {
  let current = ACADEMIC_YEARS[0];
  for (let i = 1; i < ACADEMIC_YEARS.length; i++) {
    if (monthsPaidIn(teacher, ACADEMIC_YEARS[i - 1]) < 12) break;
    current = ACADEMIC_YEARS[i];
  }
  return current;
}

/**
 * Whether a year is open, and what to show next to it.
 *
 * The first year is always open. Every later year needs all twelve months of
 * the one before it. This mirrors the rule the server enforces on the
 * salary-month route — the dropdown only reflects it, so a locked option being
 * disabled is a convenience, not the control.
 */
export function academicYearState(teacher: Teacher | null, index: number): { locked: boolean; label: string } {
  if (index === 0) return { locked: false, label: ' (June to May)' };

  const prevYear = ACADEMIC_YEARS[index - 1];
  const paid = monthsPaidIn(teacher, prevYear);
  if (paid >= 12) return { locked: false, label: ' (unlocked)' };
  return { locked: true, label: ` — locked, ${prevYear} at ${paid}/12` };
}

interface MonthlySalaryRecord {
  month?: string;
  status?: 'Paid' | 'Unpaid';
  paid?: boolean;
  amountPaid?: number;
  paymentDate?: string;
  paymentMode?: string;
  note?: string;
}

const matchesStudentQuery = (student: Student, query: string) => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return true;

  return [
    student.name,
    student.admissionNumber,
    student.registrationNumber,
    student.studentId,
    student.mobile,
    student.parentMobile,
    student.course,
    student.branch
  ].some((field) => String(field || '').toLowerCase().includes(normalizedQuery));
};


const MAX_STUDENT_FEE = 1_000_000; // Rs. 10,00,000

/** A PIN is six digits and nothing else — strip anything that is not one. */
const digitsOnlyPin = (value: string) => String(value).replace(/\D/g, '').slice(0, 6);

export const AdminDashboardView: React.FC<{ role?: 'admin1' | 'clerk' }> = ({ role = 'admin1' }) => {
  const { user, activeTab: globalActiveTab, setActiveTab } = useNavigation();
  const loggedInCampus = user?.campus && user.campus !== 'All' ? user.campus : 'Erragattugutta C1';

  /**
   * Whether this account may do something.
   *
   * Only ever restricts a clerk — accountHas returns true for the Rector,
   * who is the account that grants these in the first place. Used to decide
   * what to render; the server re-checks every one of them, so a module that
   * slipped through would refuse rather than act.
   */
  const clerkCan = (permission: ClerkPermissionKey) => accountCan(user, permission);

  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [activePage, setActivePage] = useState<string>('menu');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, setLivePulseKey] = useState<'students' | 'attendance' | 'bulletins' | 'fees' | 'finance' | null>(null);
  const [securityKey, setSecurityKey] = useState('');
  const [admin1Tab, setAdmin1Tab] = useState<'dashboard' | 'overview'>('dashboard');

  // States
  const [students, setStudents] = useState<Student[]>([]);
  /**
   * Totals and counts computed by the server over the WHOLE filter.
   *
   * List responses are capped now, so anything derived by reducing over one
   * of these arrays would be wrong by whatever fell off the end — and would
   * look entirely plausible on a fee screen. These hold the authoritative
   * figures that come back in `meta`.
   */
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentsTruncated, setStudentsTruncated] = useState(false);
  /**
   * The last registry page fetched from the server, and whether another is on
   * its way.
   *
   * The registry list is capped server-side. Everything on this screen — the
   * pager, the search box, the duplicate check on the admission form, the fee
   * editor's list — reads the `students` array, so the cap was not just a
   * shorter list: it was the boundary past which those features silently
   * stopped seeing students at all. Appending further pages onto the same
   * array widens that boundary without changing what any of them assume they
   * are looking at.
   */
  const [studentsLoadedPage, setStudentsLoadedPage] = useState(1);
  const [loadingMoreStudents, setLoadingMoreStudents] = useState(false);
  const [expenditureByBranch, setExpenditureByBranch] = useState<Record<string, number> | null>(null);
  const [workerTotalAmount, setWorkerTotalAmount] = useState<number | null>(null);
  const [workerPaidAmount, setWorkerPaidAmount] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Edit Buffer States (prevents keypress auto-save)
  const [searchAdm, setSearchAdm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [registryPage, setRegistryPage] = useState(1);

  // Students Registry States (3-Screen Reduced Field List)
  const [isStudentHoverModalOpen, setIsStudentHoverModalOpen] = useState(false);
  const [newStuFormPage, setNewStuFormPage] = useState<1 | 2 | 3>(1);
  // Set when screen 1 is left with an admission number or mobile that already
  // belongs to somebody. Holds the students it collides with so the dialog can
  // name them rather than just saying "duplicate".
  const [duplicateStudentConflict, setDuplicateStudentConflict] = useState<
    { admissionMatch?: Student; mobileMatch?: Student } | null
  >(null);
  const [newStuName, setNewStuName] = useState('');
  const [newStuAdmissionNumber, setNewStuAdmissionNumber] = useState('');
  const [newStuBranch, setNewStuBranch] = useState(loggedInCampus);
  const [newStuMobile, setNewStuMobile] = useState('');
  const [newStuCourse, setNewStuCourse] = useState('MPC');
  // Which year of the PROGRAMME the student is joining, not the academic
  // year — newStuYear above is 2026-2027 and means something else. This is
  // what the upgrade flow reads to decide who may be moved up.
  const [newStuProgrammeYear, setNewStuProgrammeYear] = useState('First Year');
  const [newStuSection, setNewStuSection] = useState('MPC-A');
  const [newStuYear, setNewStuYear] = useState('1st Year');

  // Screen 2: Personal & Family Information
  const [newStuFatherName, setNewStuFatherName] = useState('');
  const [newStuMotherName, setNewStuMotherName] = useState('');
  const [newStuDob, setNewStuDob] = useState('');
  const [newStuParentMobile, setNewStuParentMobile] = useState('');
  const [newStuPreviousSchool, setNewStuPreviousSchool] = useState('');
  const [newStuPreviousBoard, setNewStuPreviousBoard] = useState('State Board');
  const [newStuAddress, setNewStuAddress] = useState('');

  // Itemized Fee Breakdown & Slots for New Student Registration

  const [newStuFeeSlots, setNewStuFeeSlots] = useState<FeeSlot[]>(freshRegFeeSlots);

  const [isRegStuOtpModalOpen, setIsRegStuOtpModalOpen] = useState(false);
  const [, setRegStuOtpInput] = useState('');
  const [regStuError, setRegStuError] = useState('');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Sync globalActiveTab from sidebar/navigation drawer into local activePage
  useEffect(() => {
    if (globalActiveTab) {
      if (globalActiveTab === 'dashboard' || globalActiveTab === 'home') {
        setActivePage('menu');
      } else if (globalActiveTab === 'add_student') {
        setActivePage('students');
        setNewStuFormPage(1);
        setIsStudentHoverModalOpen(true);
      } else {
        setActivePage(globalActiveTab);
      }
    }
  }, [globalActiveTab]);



  // Faculty Management & 12-Month Ledger States
  const [searchFac, setSearchFac] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [facultyPage, setFacultyPage] = useState(1);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const [employeeTab, setEmployeeTab] = useState<'employees' | 'history'>('employees');

  // Selecting a different teacher can leave the dropdown pointing at a year
  // that is locked for THIS one — their ledgers are independent. Fall back to
  // the newest year they have actually unlocked, so the grid never shows
  // months against a year the server would refuse to write to.
  useEffect(() => {
    if (!editTeacher) return;
    const idx = ACADEMIC_YEARS.indexOf(selectedAcademicYear);
    if (idx >= 0 && !academicYearState(editTeacher, idx).locked) return;

    let fallback = ACADEMIC_YEARS[0];
    for (let i = 0; i < ACADEMIC_YEARS.length; i++) {
      if (academicYearState(editTeacher, i).locked) break;
      fallback = ACADEMIC_YEARS[i];
    }
    setSelectedAcademicYear(fallback);
  }, [editTeacher, selectedAcademicYear]);
  // --- Clerk manager (Rector only) --------------------------------------
  //
  // Clerks are created freely now, up to fifteen a campus — not seven fixed
  // slots. `clerkList` is whatever the server last returned for the selected
  // campus; every write returns the refreshed campus, so there is no local
  // draft to reconcile and nothing to lose by navigating away.
  const [clerkCampus, setClerkCampus] = useState<string>(CAMPUS_LIST[0]);
  const [clerkList, setClerkList] = useState<Clerk[]>([]);
  const [clerkMax, setClerkMax] = useState(15);
  const [clerkRemaining, setClerkRemaining] = useState(15);
  const [clerkOpenId, setClerkOpenId] = useState<string | null>(null);
  const [clerkBusy, setClerkBusy] = useState(false);

  // The PIN is asked ONCE on entering the screen and held for the visit, so
  // nothing inside prompts again — every action here is a plain confirmation.
  const [clerkUnlocked, setClerkUnlocked] = useState(false);
  const [clerkRectorPin, setClerkRectorPin] = useState('');
  const [clerkPinInput, setClerkPinInput] = useState('');
  const [clerkPinError, setClerkPinError] = useState('');

  // Adding a clerk is two steps: details, then access. Kept as one draft so
  // stepping back does not lose what was already typed.
  const [clerkAddStep, setClerkAddStep] = useState<0 | 1 | 2>(0);
  const emptyClerkDraft = {
    name: '', username: '', password: '', pin: '', mobile: '', email: '',
    permissions: { addStudent: false, editStudent: false, editFees: false, collectFees: false, logExpenditures: false, manageStaff: false, manageEnquiries: false } as ClerkPermissions
  };
  const [clerkAddDraft, setClerkAddDraft] = useState(emptyClerkDraft);
  const [clerkAddError, setClerkAddError] = useState('');


  // --- Audit trail (Rector only) ----------------------------------------
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalAmount, setAuditTotalAmount] = useState(0);
  const [auditOptions, setAuditOptions] = useState<{ actors: string[]; actions: string[]; campuses: string[] }>({ actors: [], actions: [], campuses: [] });
  const [auditFilterCampus, setAuditFilterCampus] = useState('All');
  const [auditFilterActor, setAuditFilterActor] = useState('All');
  const [auditFilterAction, setAuditFilterAction] = useState('All');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditExpandedId, setAuditExpandedId] = useState<string | null>(null);

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
  const [, setFacOtpInput] = useState('');
  const [facActionType, setFacActionType] = useState<'add' | 'edit' | 'delete' | 'salary_payment'>('edit');
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Admission Enquiries States
  const [enquiriesList, setEnquiriesList] = useState<any[]>([]);
  const [searchEnquiry, setSearchEnquiry] = useState('');
  const [filterEnquiryCampus, setFilterEnquiryCampus] = useState('All');
  const [filterEnquiryStatus, setFilterEnquiryStatus] = useState('All');
  const [, setIsLoadingEnquiries] = useState(false);

  // --- Credentials screen (Rector only) ---------------------------------
  // Nothing is fetched until the Rector supplies their PIN: the response is
  // every live credential in the system, so it is not loaded just because
  // someone navigated here.
  const [credAccounts, setCredAccounts] = useState<PortalAccount[]>([]);
  const [credUnlocked, setCredUnlocked] = useState(false);
  const [credPinInput, setCredPinInput] = useState('');
  const [credPinError, setCredPinError] = useState('');
  const [credRectorPin, setCredRectorPin] = useState('');
  // Derived, never stored. Held as its own state it went stale the moment a
  // credential was set — the banner kept claiming two accounts were
  // unreadable after one of them had just been made readable.
  const credLegacyCount = credAccounts.filter(a => !a.passwordReadable || !a.pinReadable).length;
  const [credRevealed, setCredRevealed] = useState<Record<string, boolean>>({});
  const [credEditing, setCredEditing] = useState<string | null>(null);
  const [credDraft, setCredDraft] = useState<{ username: string; password: string; pin: string }>({ username: '', password: '', pin: '' });
  const [credSaving, setCredSaving] = useState(false);

  const unlockCredentials = async () => {
    const pin = credPinInput.trim();
    if (pin.length !== 6) { setCredPinError('Enter your six-digit PIN.'); return; }
    try {
      const result = await admin1Service.getCredentials(pin);
      setCredAccounts(result.accounts);
      // Held for the duration of the screen so each save does not re-prompt.
      // Cleared on leaving, below.
      setCredRectorPin(pin);
      setCredUnlocked(true);
      setCredPinInput('');
      setCredPinError('');
    } catch (err: any) {
      setCredPinError(err?.message || 'Could not open the credentials screen.');
      setCredPinInput('');
    }
  };

  /** Wipe every credential out of component state when leaving the screen. */
  const lockCredentials = () => {
    setCredAccounts([]);
    setCredUnlocked(false);
    setCredRectorPin('');
    setCredRevealed({});
    setCredEditing(null);
    setCredDraft({ username: '', password: '', pin: '' });
    setCredPinInput('');
    setCredPinError('');
  };

  const saveCredential = async (account: PortalAccount) => {
    const changes: { username?: string; password?: string; pin?: string } = {};
    if (credDraft.username.trim() && credDraft.username.trim() !== account.username) changes.username = credDraft.username.trim();
    if (credDraft.password.trim()) changes.password = credDraft.password.trim();
    if (credDraft.pin.trim()) changes.pin = credDraft.pin.trim();

    if (Object.keys(changes).length === 0) {
      triggerToast('Nothing to change for this account.', 'error');
      return;
    }

    setCredSaving(true);
    try {
      const result = await admin1Service.setCredentials(account.id, changes, credRectorPin);
      setCredAccounts(prev => prev.map(a => a.id === account.id ? {
        ...a,
        username: result.username,
        password: result.password,
        pin: result.pin,
        passwordReadable: result.password !== null,
        pinReadable: result.pin !== null
      } : a));
      setCredEditing(null);
      setCredDraft({ username: '', password: '', pin: '' });
      triggerToast(result.message, 'success');
    } catch (err: any) {
      triggerToast(err?.message || 'Could not update those credentials.', 'error');
    } finally {
      setCredSaving(false);
    }
  };

  /** Load one campus's clerks. Every write returns the same shape. */
  const applyCampusClerks = (result: { campus: string; clerks: Clerk[]; maxPerCampus: number; remaining: number }) => {
    setClerkList(result.clerks);
    setClerkMax(result.maxPerCampus);
    setClerkRemaining(result.remaining);
  };

  const fetchClerks = async (campus = clerkCampus, pin = clerkRectorPin) => {
    if (!pin) return;
    try {
      applyCampusClerks(await admin1Service.getClerks(campus, pin));
    } catch (err: any) {
      triggerToast(err?.message || 'Could not load the clerks for this campus.', 'error');
    }
  };

  /**
   * Unlock the screen. Asked once, on entry.
   *
   * The PIN is verified by actually fetching — there is no separate "check my
   * PIN" call to get out of step with the routes that use it.
   */
  const unlockClerks = async () => {
    const pin = clerkPinInput.trim();
    if (pin.length !== 6) { setClerkPinError('Enter your six-digit PIN.'); return; }
    try {
      applyCampusClerks(await admin1Service.getClerks(clerkCampus, pin));
      setClerkRectorPin(pin);
      setClerkUnlocked(true);
      setClerkPinInput('');
      setClerkPinError('');
    } catch (err: any) {
      setClerkPinError(err?.message || 'Could not open the clerk manager.');
      setClerkPinInput('');
    }
  };

  /** Wipe every credential out of component state when leaving. */
  const lockClerks = () => {
    setClerkUnlocked(false);
    setClerkRectorPin('');
    setClerkList([]);
    setClerkOpenId(null);
    setClerkAddStep(0);
    setClerkAddDraft(emptyClerkDraft);
    setClerkPinInput('');
    setClerkPinError('');
  };

  const switchClerkCampus = (campus: string) => {
    setClerkCampus(campus);
    setClerkOpenId(null);
    setClerkAddStep(0);
    setClerkAddDraft(emptyClerkDraft);
    fetchClerks(campus);
  };

  /** Step one: the details. Validated here so step two is never reached with
   *  something the server will reject at the end. */
  const clerkDetailsProblem = (): string => {
    const d = clerkAddDraft;
    if (!d.name.trim()) return 'Enter the clerk’s name.';
    if (!d.username.trim()) return 'Enter a portal ID for them to sign in with.';
    if (d.password.trim().length < 8) return 'The password must be at least 8 characters.';
    if (!/^\d{6}$/.test(d.pin.trim())) return 'The PIN must be exactly 6 digits.';
    const mobileError = validateMobile(d.mobile, 'Mobile number');
    if (mobileError) return mobileError;
    return '';
  };

  const createClerk = async () => {
    const problem = clerkDetailsProblem();
    if (problem) { setClerkAddError(problem); setClerkAddStep(1); return; }

    setClerkBusy(true);
    try {
      const result = await admin1Service.createClerk({
        campus: clerkCampus,
        name: clerkAddDraft.name.trim(),
        username: clerkAddDraft.username.trim(),
        password: clerkAddDraft.password.trim(),
        pin: clerkAddDraft.pin.trim(),
        mobile: clerkAddDraft.mobile.trim(),
        email: clerkAddDraft.email.trim(),
        permissions: clerkAddDraft.permissions,
        active: true
      }, clerkRectorPin);
      applyCampusClerks(result);
      setClerkAddStep(0);
      setClerkAddDraft(emptyClerkDraft);
      setClerkAddError('');
      triggerToast(result.message, 'success');
    } catch (err: any) {
      setClerkAddError(err?.message || 'Could not create the clerk.');
    } finally {
      setClerkBusy(false);
    }
  };

  /** Any change to an existing clerk. Confirmed with yes/no, never a PIN. */
  const changeClerk = async (
    clerk: Clerk,
    changes: Record<string, any>,
    confirmMessage?: string
  ) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setClerkBusy(true);
    try {
      const result = await admin1Service.updateClerk(clerk.id, changes, clerkRectorPin);
      applyCampusClerks(result);
      triggerToast(result.message, 'success');
    } catch (err: any) {
      triggerToast(err?.message || 'Could not update that clerk.', 'error');
    } finally {
      setClerkBusy(false);
    }
  };

  const removeClerk = async (clerk: Clerk) => {
    if (!window.confirm(
      `Remove ${clerk.name} from ${clerk.campus}?\n\n` +
      'They are signed out immediately and the place is freed for another clerk. ' +
      'Everything they recorded — students, receipts, expenditures — is kept.'
    )) return;
    setClerkBusy(true);
    try {
      const result = await admin1Service.deleteClerk(clerk.id, clerkRectorPin);
      applyCampusClerks(result);
      setClerkOpenId(null);
      triggerToast(result.message, 'success');
    } catch (err: any) {
      triggerToast(err?.message || 'Could not remove that clerk.', 'error');
    } finally {
      setClerkBusy(false);
    }
  };

  /**
   * Load one page of the audit trail.
   *
   * The filters are applied on the SERVER, not by narrowing an already-loaded
   * array. The trail is the fastest-growing collection here, so a client-side
   * filter would mean pulling the whole thing down to show twenty rows.
   */
  const fetchAuditLogs = async (page = auditPage) => {
    try {
      const result = await admin1Service.getLogs({
        campus: auditFilterCampus,
        actor: auditFilterActor,
        action: auditFilterAction,
        search: auditSearch,
        from: auditFrom,
        to: auditTo,
        page,
        limit: 50
      });
      setAuditLogs(result.entries || []);
      setAuditPage(result.page || 1);
      setAuditTotalPages(result.totalPages || 1);
      setAuditTotal(result.total || 0);
      setAuditTotalAmount(result.totalAmount || 0);
    } catch (err: any) {
      console.warn('Failed to fetch audit logs:', err);
      triggerToast(err?.message || 'Could not load the activity log.', 'error');
    }
  };

  const fetchAuditFilterOptions = async () => {
    try {
      setAuditOptions(await admin1Service.getLogFilters());
    } catch (err) {
      // The dropdowns fall back to "All" only; the log itself still loads.
      console.warn('Failed to fetch audit filter options:', err);
    }
  };

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

  // Exam list States

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
  const [, setOtpInput] = useState('');


  // Calendars logs


  // Timetables and sections states
  const [timetableSection] = useState('Section A');
  const [_reportsData, setReportsData] = useState<any>(null); // kept for fetchReports compat

  // Attendance marking states (moved from accountant portal)
  const [attendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Manual timetable scheduling states

  // Selected files for Timetable & Results


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
  const [, setExpDeleteOtpInput] = useState('');

  const [editTuitionRate, setEditTuitionRate] = useState('120000');
  const [editHostelRate, setEditHostelRate] = useState('85000');
  const [editMiscRate, setEditMiscRate] = useState('5000');

  const [isDeleteStuOtpOpen, setIsDeleteStuOtpOpen] = useState(false);
  const [, setDeleteStuOtpInput] = useState('');

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

  /**
   * Finds an existing student holding the admission number or mobile being
   * typed into the new-admission form.
   *
   * The server already refuses a duplicate admission number, but only when the
   * profile is finally submitted — three screens after the operator typed it,
   * with all the family and fee detail already keyed in. Checking on the way
   * out of screen 1 puts the error next to the field that caused it.
   *
   * Compared normalised: admission numbers case-insensitively and trimmed,
   * mobiles on digits only, so "98765 43210" and "9876543210" are recognised
   * as the same number rather than slipping through as different strings.
   */
  const findStudentDuplicates = (admissionNumber: string, mobile: string) => {
    const adm = admissionNumber.trim().toLowerCase();
    const mob = mobile.replace(/\D/g, '');
    return {
      admissionMatch: adm
        ? students.find(s => String(s.admissionNumber || '').trim().toLowerCase() === adm)
        : undefined,
      mobileMatch: mob
        ? students.find(s => String(s.mobile || '').replace(/\D/g, '') === mob)
        : undefined
    };
  };

  // Admin Custom Fee Slot Management

  const getAdminActiveFeeSlots = (stu: any, breakdown?: any) => {
    if (!stu && !breakdown) return [];
    const baseSlots: Array<{ id: string; name: string; amount: number; isDefault?: boolean }> = [];

    const tuition = breakdown ? breakdown.tuitionFee : (stu?.tuitionFee || 0);
    const hostel = breakdown ? breakdown.hostelFee : (stu?.hostelFee || 0);
    const misc = breakdown ? breakdown.miscFee : (stu?.miscellaneousFee || 0);
    const prevPending = breakdown ? breakdown.previousPending : (stu?.previousPending || 0);

    // Academic Tuition Fee always present
    baseSlots.push({ id: 'tuitionFee', name: 'Tuition Fee (Academic)', amount: Number(tuition) || 0, isDefault: true });
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

    if (stu?.customFeeSlots && Array.isArray(stu.customFeeSlots)) {
      const standardNames = ['tuition fee', 'tuition fee (academic)', 'hostel fee', 'miscellaneous fee', 'previous pending', 'books fee', 'uniform fees', 'hnd fees', 'internal exam', 'annual exam', 'party fees', 'bus fees', 'lab fees', 'hand loan'];
      stu.customFeeSlots.forEach((c: any, idx: number) => {
        if (c && c.name && !standardNames.includes(String(c.name).toLowerCase().trim())) {
          baseSlots.push({
            id: c.id ? `${c.id}_${idx}` : `custom_${c.name}_${idx}`,
            name: c.name,
            amount: Number(c.amount) || 0,
            isDefault: false
          });
        }
      });
    }

    return baseSlots;
  };

  // OTP modal state for each guarded action
  const [isFeeOtpOpen, setIsFeeOtpOpen] = useState(false);
  const [, setFeeOtpInput] = useState('');
  const [isAcadFeeOtpOpen, setIsAcadFeeOtpOpen] = useState(false);
  const [, setAcadFeeOtpInput] = useState('');
  const [isUnlockFeeOtpOpen, setIsUnlockFeeOtpOpen] = useState(false);
  const [, setUnlockFeeOtpInput] = useState('');
  const [isExpOtpOpen, setIsExpOtpOpen] = useState(false);
  const [, setExpOtpInput] = useState('');
  const [isWorkerOtpOpen, setIsWorkerOtpOpen] = useState(false);
  const [, setWorkerOtpInput] = useState('');
  const [workerPendingAction, setWorkerPendingAction] = useState<any>(null);

  const [, setOtpCountdown] = useState('');
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

  const [workerSearch, setWorkerSearch] = useState('');
  const [workerPage, setWorkerPage] = useState(1);
  const [selectedWorkerForPayment, setSelectedWorkerForPayment] = useState<any>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [isPaymentAmountModalOpen, setIsPaymentAmountModalOpen] = useState(false);


  //  Worker PDF Generator Helpers
  const handleDownloadWorkerBill = (w: any) => {
    const workerName = w.workerName || w.name || 'Worker';
    const wage = Number(w.amount || w.salary || 0);
    const paidAmt = Number(w.amountPaid !== undefined ? w.amountPaid : (w.paid ? wage : 0));
    const balance = Math.max(0, wage - paidAmt);

    const body = [
      pdfHeader({
        logoSrc: collegeLogo,
        title: 'Worker Payslip',
        subtitle: `Period: ${w.monthPeriod || 'Current month'}`,
        campus: loggedInCampus
      }),
      pdfDetailCard([
        ['Worker Name', workerName],
        ['Role / Designation', w.role || 'Staff'],
        ['Payroll Period', w.monthPeriod || 'Current month'],
        ['Campus', loggedInCampus],
        ['Payment Status', w.paid ? 'PAID' : 'UNPAID'],
        ['Reference Voucher', w._id || w.id || 'WRK-REC']
      ]),
      pdfTiles([
        { label: 'Monthly Wage', value: money(wage) },
        { label: 'Amount Disbursed', value: money(paidAmt), tone: 'good' },
        { label: 'Remaining Due', value: money(balance), tone: balance > 0 ? 'due' : 'good' }
      ]),
      pdfFooter({ note: 'Computer-generated payroll record, verified against the Inspire ERP payroll ledger.' })
    ].join('');

    const opened = openPrintDocument({
      title: `Worker Payslip - ${workerName}`,
      body,
      buttonLabel: 'Print / Save Payslip as PDF',
      framed: true,
      onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the payslip.')
    });
    if (opened) triggerToast('Worker payslip opened for ' + workerName);
  };

  const handleDownloadAllWorkerRecords = (workerList: any[]) => {
    // A payroll ledger has to foot to the real wage bill, so the totals come
    // from the server's sums over every row rather than from the page being
    // rendered. Falling back to the reduce keeps the document correct when no
    // totals came back — which is exactly the case where the page IS the whole
    // list.
    const totalSalary = workerTotalAmount
      ?? workerList.reduce((sum, w) => sum + Number(w.amount || w.salary || 0), 0);
    const totalPaid = workerPaidAmount
      ?? workerList.reduce(
        (sum, w) => sum + Number(w.amountPaid !== undefined ? w.amountPaid : (w.paid ? (w.amount || w.salary || 0) : 0)), 0);
    const totalPending = Math.max(0, totalSalary - totalPaid);

    const body = [
      pdfHeader({
        logoSrc: collegeLogo,
        title: 'Worker Payroll Ledger',
        subtitle: `${workerList.length} record(s)`,
        campus: loggedInCampus
      }),
      pdfTiles([
        { label: 'Total Workers', value: String(workerList.length) },
        { label: 'Total Payroll', value: money(totalSalary) },
        { label: 'Disbursed', value: money(totalPaid), tone: 'good' },
        { label: 'Pending', value: money(totalPending), tone: totalPending > 0 ? 'due' : 'good' }
      ]),
      pdfSection('Worker Payment Records'),
      pdfTable({
        headers: ['#', 'Worker', 'Role', 'Period', 'Wage', 'Paid', 'Balance', 'Status'],
        numeric: [4, 5, 6],
        rows: workerList.map((w, idx) => {
          const wSal = Number(w.amount || w.salary || 0);
          const wPaid = Number(w.amountPaid !== undefined ? w.amountPaid : (w.paid ? wSal : 0));
          const wBal = Math.max(0, wSal - wPaid);
          return [
            String(idx + 1),
            `<strong>${escapeHtml(w.workerName || w.name || 'Worker')}</strong>`,
            escapeHtml(w.role || 'Staff'),
            escapeHtml(w.monthPeriod || 'Current month'),
            money(wSal),
            `<span class="pdf-strong">${money(wPaid)}</span>`,
            money(wBal),
            `<span class="pdf-badge ${w.paid ? 'paid' : 'due'}">${w.paid ? 'Paid' : 'Unpaid'}</span>`
          ];
        }),
        footer: ['', 'Total', '', '', money(totalSalary), money(totalPaid), money(totalPending), ''],
        emptyMessage: 'No worker payment records for this campus.'
      }),
      pdfFooter({ note: 'Computer-generated payroll ledger, verified against the Inspire ERP records.' })
    ].join('');

    const opened = openPrintDocument({
      title: 'Worker Payroll Ledger',
      body,
      buttonLabel: 'Print / Save Payroll Ledger as PDF',
      onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the report.')
    });
    if (opened) triggerToast('Worker payroll ledger opened for printing.');
  };

  const handleDownloadDisbursementLogPDF = () => {
    const totalAmount = workerTotalAmount
      ?? workerPaymentsHistory.reduce(
        (sum: number, item: any) => sum + Number(item.amount || 0), 0);

    const body = [
      pdfHeader({
        logoSrc: collegeLogo,
        title: 'Disbursement Log',
        subtitle: `${workerPaymentsHistory.length} disbursement(s)`,
        campus: loggedInCampus
      }),
      pdfTiles([
        { label: 'Disbursements', value: String(workerPaymentsHistory.length) },
        { label: 'Total Disbursed', value: money(totalAmount), tone: 'good' }
      ]),
      pdfSection('Payment History'),
      pdfTable({
        headers: ['Date', 'Staff Member', 'Role', 'Amount', 'Period', 'Campus', 'Status'],
        numeric: [3],
        rows: workerPaymentsHistory.map((item: any) => [
          dateStr(item.createdAt),
          `<strong>${escapeHtml(item.workerName || item.name || 'Staff Member')}</strong>`,
          escapeHtml(item.role || 'Staff'),
          `<span class="pdf-strong">${money(item.amount)}</span>`,
          escapeHtml(item.monthPeriod || '—'),
          escapeHtml(item.branch || loggedInCampus),
          '<span class="pdf-badge paid">Disbursed</span>'
        ]),
        footer: ['', 'Total', '', money(totalAmount), '', '', ''],
        emptyMessage: 'No disbursements recorded.'
      }),
      pdfFooter({ note: 'Computer-generated disbursement log, verified against the Inspire ERP payroll records.' })
    ].join('');

    const opened = openPrintDocument({
      title: 'Disbursement Log',
      body,
      buttonLabel: 'Print / Save Disbursement Log as PDF',
      onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the log.')
    });
    if (opened) triggerToast('Disbursement log opened for printing.');
  };

  const handleDownloadStudentHistoryPDF = (student: any) => {
    if (!student) return;

    const customSlots: Array<[string, number]> = (student.customFeeSlots || [])
      .map((s: any) => [s.name, Number(s.amount || 0)] as [string, number]);

    const feeRows: Array<[string, number]> = ([
      ['Tuition Fee', Number(student.tuitionFee || 0)],
      ['Hostel Fee', Number(student.hostelFee || 0)],
      ['Transport Fee', Number(student.transportFee || 0)],
      ['Miscellaneous Fee', Number(student.miscellaneousFee || 0)],
      ['Previous Pending', Number(student.previousPending || 0)],
      ['Books Fee', Number(student.booksFee || 0)],
      ['Uniform Fee', Number(student.uniformFees || 0)],
      ['Internal Exam Fee', Number(student.internalExamFees || 0)],
      ['Annual Exam Fee', Number(student.annualExamFees || 0)],
      ['Lab Fee', Number(student.labFees || 0)],
      ['Bus Fee', Number(student.busFees || 0)],
      ...customSlots
    ] as Array<[string, number]>).filter(([, a]) => a > 0);

    const tuitionWaiver = Number(student.tuitionWaiver || 0);
    const hostelWaiver = Number(student.hostelWaiver || 0);
    const miscWaiver = Number(student.miscWaiver || 0);
    const override = Number(student.individualOverrideDeduction || student.scholarshipDeduction || 0);

    const waiverRows: Array<[string, number]> = ([
      ['Tuition Waiver', tuitionWaiver],
      ['Hostel Waiver', hostelWaiver],
      ['Transport Waiver', Number(student.transportWaiver || 0)],
      ['Miscellaneous Waiver', miscWaiver],
      ...(override > 0 && tuitionWaiver === 0 && hostelWaiver === 0 && miscWaiver === 0
        ? [['Special Scholarship Waiver', override] as [string, number]] : [])
    ] as Array<[string, number]>).filter(([, a]) => a > 0);

    const totalWaiver = waiverRows.reduce((s2, [, a]) => s2 + a, 0);
    const totalBaseFee = feeRows.reduce((s2, [, a]) => s2 + a, 0)
      || Number(student.totalBaseFee || student.calculatedFee || student.tuitionFee || 0);
    const totalPaid = Number(student.totalPaid || student.paidFee || 0);
    const remaining = Number(student.remainingBalance ?? Math.max(0, totalBaseFee - totalWaiver - totalPaid));

    const receipts = [...(student.receipts || [])]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const history = student.yearHistory || [];

    const body = [
      pdfHeader({
        logoSrc: collegeLogo,
        title: 'Student Fee History',
        subtitle: student.studentYear || undefined,
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
          ...feeRows.map(([l, a]) => [escapeHtml(l), money(a)]),
          ...waiverRows.map(([l, a]) => [
            `<span class="pdf-strong">${escapeHtml(l)}</span>`,
            `<span class="pdf-strong">- ${money(a)}</span>`
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
        rows: receipts.map((r: any) => [
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
        rows: history.map((h: any) => [
          escapeHtml(h.studentYear || '—'),
          escapeHtml(h.academicYear || '—'),
          money(h.totalPayable),
          `<span class="pdf-strong">${money(h.totalPaid)}</span>`,
          dateStr(h.closedAt),
          escapeHtml(h.closedBy || '—')
        ])
      }) : '',
      pdfFooter({ note: 'Computer-generated fee history, verified against the Inspire College ERP records.' })
    ].join('');

    const opened = openPrintDocument({
      title: `Student Fee History - ${student.admissionNumber || student.name}`,
      body,
      buttonLabel: 'Print / Save Fee History as PDF',
      onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the history.')
    });
    if (opened) triggerToast('Student fee history opened for printing.');
  };

  const handleDownloadStaffPayslip = (t: Teacher, monthName: string) => {
    // Read for the selected year only. monthRecordFor consults the legacy flat
    // map for the first academic year alone — printing a payslip for a later
    // year previously reproduced the earlier year's payment.
    const rec: any = monthRecordFor(t, selectedAcademicYear, monthName) || {};

    const baseSal = Number(t.salary || 0);
    const isPaid = isMonthPaid(rec);
    const paidAmt = Number(rec.amountPaid || (isPaid ? baseSal : 0));
    const dueAmt = Math.max(0, baseSal - paidAmt);

    // The old template read
    //   rec.paymentDate || rec.paidAt ? new Date(rec.paidAt)... : 'N/A'
    // which parses as (a || b) ? c : d — so a record WITH a paymentDate but no
    // paidAt formatted `new Date(undefined)` and printed "Invalid Date" on the
    // payslip. Take the first value that exists, then format it.
    const paidOn = rec.paidAt || rec.paymentDate || rec.date;

    const body = [
      pdfHeader({
        logoSrc: collegeLogo,
        title: 'Salary Payslip',
        subtitle: `${monthName} · ${selectedAcademicYear}`,
        campus: t.branch || loggedInCampus
      }),
      pdfDetailCard([
        ['Employee Name', t.name],
        ['Designation', t.role || t.subject || 'Staff Member'],
        ['Classification', t.classification || 'Teaching'],
        ['Employee ID', t.id || t._id],
        ['Mobile', t.mobile],
        ['Campus', t.branch || loggedInCampus],
        ['Payment Mode', rec.paymentMode],
        ['Payment Date', paidOn ? dateStr(paidOn) : undefined],
        ['Remarks', rec.note]
      ]),
      pdfTiles([
        { label: 'Base Monthly Salary', value: money(baseSal) },
        { label: 'Amount Disbursed', value: money(paidAmt), tone: 'good' },
        {
          label: isPaid ? 'Status' : 'Balance Due',
          value: isPaid ? 'PAID' : money(dueAmt),
          tone: isPaid ? 'good' : 'due'
        }
      ]),
      pdfFooter({ note: 'Computer-generated staff salary statement, verified against the Inspire ERP payroll ledger.' })
    ].join('');

    const opened = openPrintDocument({
      title: `Salary Payslip - ${t.name} (${monthName})`,
      body,
      buttonLabel: 'Print / Save Payslip as PDF',
      framed: true,
      onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the payslip.')
    });
    if (opened) triggerToast(`Payslip opened for ${t.name} (${monthName}).`);
  };

  const handleDownloadStaffAnnualStatement = (t: Teacher) => {
    // The academic year runs June to May, and the figures live in
    // salaryLedger[year]. The old statement listed January to December and
    // read the legacy monthlySalaries map instead, so it showed the wrong
    // twelve months against the wrong source and hardcoded "2026" in its
    // title regardless of which year was selected.
    const months = [
      'June', 'July', 'August', 'September', 'October', 'November',
      'December', 'January', 'February', 'March', 'April', 'May'
    ];
    const baseSal = Number(t.salary || 0);

    let totalDisbursed = 0;
    let settledCount = 0;
    const rows = months.map(m => {
      const rec: any = monthRecordFor(t, selectedAcademicYear, m) || {};
      const isPaid = isMonthPaid(rec);
      if (isPaid) settledCount++;
      const amt = Number(rec.amountPaid || (isPaid ? baseSal : 0));
      totalDisbursed += amt;
      return [
        `<strong>${escapeHtml(m)}</strong>`,
        `<span class="pdf-badge ${isPaid ? 'paid' : 'due'}">${isPaid ? 'Paid' : 'Unpaid'}</span>`,
        isPaid ? `<span class="pdf-strong">${money(amt)}</span>` : money(0),
        dateStr(rec.paidAt || rec.paymentDate || rec.date),
        escapeHtml(rec.paymentMode || '—'),
        // The remark typed when the month was settled. It was stored by the
        // salary screen and shown on the monthly payslip, but the annual
        // ledger never carried a column for it — so the one document that
        // shows the whole year was the one place the note could not be read.
        escapeHtml(rec.note || '—')
      ];
    });

    const expected = baseSal * 12;
    const outstanding = Math.max(0, expected - totalDisbursed);
    // Counted from the ledger while building the rows, not by searching the
    // rendered badge markup afterwards. The old line was
    //   rows.filter(r => r[1].includes('paid'))
    // and the unpaid badge reads "Unpaid", which CONTAINS "paid" — so every
    // month matched and every payslip claimed 12 of 12 settled, including for
    // a teacher paid once. The figure sat directly above the outstanding
    // balance that contradicted it.
    const paidMonths = settledCount;

    const body = [
      pdfHeader({
        logoSrc: collegeLogo,
        title: 'Annual Salary Ledger',
        subtitle: `Academic year ${selectedAcademicYear} (June to May)`,
        campus: t.branch || loggedInCampus
      }),
      pdfDetailCard([
        ['Employee Name', t.name],
        ['Role', t.role || t.subject],
        ['Classification', t.classification || 'Teaching'],
        ['Employee ID', t.id || t._id],
        ['Campus', t.branch || loggedInCampus],
        ['Academic Year', selectedAcademicYear]
      ]),
      pdfTiles([
        { label: 'Months Settled', value: `${paidMonths} of 12`, tone: paidMonths === 12 ? 'good' : 'warn' },
        { label: 'Annual Expected', value: money(expected) },
        { label: 'Total Disbursed', value: money(totalDisbursed), tone: 'good' },
        { label: 'Outstanding', value: money(outstanding), tone: outstanding > 0 ? 'due' : 'good' }
      ]),
      pdfSection(`Monthly Disbursements — ${selectedAcademicYear}`),
      pdfTable({
        headers: ['Month', 'Status', 'Amount Paid', 'Payment Date', 'Mode', 'Remarks'],
        numeric: [2],
        rows,
        footer: ['Total', '', money(totalDisbursed), '', '', '']
      }),
      pdfFooter({ note: 'Computer-generated annual salary ledger, verified against the Inspire ERP payroll records.' })
    ].join('');

    const opened = openPrintDocument({
      title: `Annual Salary Ledger - ${t.name} (${selectedAcademicYear})`,
      body,
      buttonLabel: 'Print / Save Annual Ledger as PDF',
      onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the ledger.')
    });
    if (opened) triggerToast(`Annual ledger opened for ${t.name}.`);
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
      const { items, meta } = await admin2Service.getExpenditures();
      setExpenditures(items);
      setExpenditureByBranch(meta.byBranch ?? null);
    } catch (err: any) { triggerToast(err.message || 'Failed to load expenditures.'); }
  };

  const fetchWorkerPayments = async () => {
    try {
      const { items, meta } = await admin2Service.getWorkerPayments();
      const mapped = items.map((w: any) => ({
        ...w,
        name: w.workerName || w.name,
        salary: w.amount || w.salary,
        id: w._id || w.id,
      }));
      setWorkers(mapped);
      setWorkerTotalAmount(meta.totalAmount ?? null);
      setWorkerPaidAmount(meta.paidAmount ?? null);
    } catch (err: any) { triggerToast(err.message || 'Failed to load worker payments.'); }
  };

  const fetchStaffSalaries = async () => {
    try {
      const data = await admin2Service.getStaffSalaries();
      setTeachers(data as any);
    } catch (err: any) { triggerToast(err.message || 'Failed to load staff salaries.'); }
  };






  const fetchStudents = async (query = '', suppressToast = false) => {
    try {
      // No campus filter. Students are ONE registry across all four campuses
      // for every staffed role, so a clerk's registry here matches what they
      // see on the fee-collection screen. The same person getting two
      // different answers from two screens is worse than either answer.
      //
      // Teachers, fee settings and worker payments elsewhere in this file are
      // deliberately still campus-scoped: those are per-campus books.
      const { items, meta } = await admin1Service.getStudents(query, '');
      setStudents(items);
      setStudentTotal(meta.total);
      setStudentsTruncated(meta.hasMore);
      setStudentsLoadedPage(1);
    } catch (err: any) {
      // On 404/503 (Vercel cold-start or transient error), retry once silently after a short delay
      if (err?.status === 404 || err?.status === 503) {
        try {
          await new Promise(r => setTimeout(r, 1500));
          const { items, meta } = await admin1Service.getStudents(query, '');
          setStudents(items);
          setStudentTotal(meta.total);
          setStudentsTruncated(meta.hasMore);
          setStudentsLoadedPage(1);
          return;
        } catch { /* fall through to toast below */ }
      }
      if (!suppressToast) {
        triggerToast(err.message || 'Failed to load students.');
      }
    }
  };

  /**
   * The COMPLETE record for a student, given a row from the registry list.
   *
   * List responses no longer carry `receipts` or `yearHistory`. Those two
   * fields were a quarter of the payload and are read by exactly one kind of
   * screen — the one showing a single student — so every list paid for them
   * on every row and used them on none. The detail route still returns the
   * whole document, so a screen that needs the receipt history asks for it
   * when a student is actually opened.
   *
   * Falls back to the row it was given. A failed lookup should cost the
   * receipt list on a panel, not the ability to open the student at all.
   */
  const hydrateStudent = async (row: any) => {
    const key = row && (row._id || row.studentId || row.admissionNumber);
    if (!key) return row;
    try {
      const full = await admin1Service.findStudent(String(key));
      return full ? { ...row, ...(full as any) } : row;
    } catch {
      return row;
    }
  };

  /**
   * Pull the next server page of the registry and append it.
   *
   * Appends rather than replaces, because the array is the whole registry as
   * far as every other part of this screen is concerned. Replacing it would
   * page the list and simultaneously narrow the fee editor and the admission
   * form's duplicate check to whichever page happened to be on screen, which
   * is a worse bug than the one being fixed.
   *
   * De-duplicated on the way in. A student added by someone else between two
   * fetches shifts the ordering, and the same record can arrive on two
   * consecutive pages; without this it appears twice in the list and twice in
   * anything counting it.
   */
  const loadMoreStudents = async (query = '') => {
    if (loadingMoreStudents) return;
    setLoadingMoreStudents(true);
    try {
      const nextPage = studentsLoadedPage + 1;
      const { items, meta } = await admin1Service.getStudents(query, '', nextPage);
      setStudents(prev => {
        const seen = new Set(prev.map(s => String(s._id || s.admissionNumber || s.studentId)));
        const fresh = items.filter(s => !seen.has(String(s._id || s.admissionNumber || s.studentId)));
        return [...prev, ...(fresh as unknown as Student[])];
      });
      setStudentTotal(meta.total);
      setStudentsTruncated(meta.hasMore);
      setStudentsLoadedPage(nextPage);
    } catch (err: any) {
      triggerToast(err.message || 'Could not load more students.');
    } finally {
      setLoadingMoreStudents(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const branchParam = role === 'clerk' ? loggedInCampus : undefined;
      const data = await admin1Service.getTeachers(branchParam);
      if (Array.isArray(data)) {
        const uniqueMap = new Map();
        data.forEach((t: any) => {
          const key = String(t._id || t.id);
          uniqueMap.set(key, t);
        });
        const list = Array.from(uniqueMap.values());
        setTeachers(list);

        if (editTeacher) {
          const fresh = list.find((t: any) => String(t._id || t.id) === String(editTeacher._id || editTeacher.id));
          if (fresh) {
            setSelectedTeacher(fresh);
            setEditTeacher(fresh);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load teachers from backend:', err);
    }
  };

  const fetchWorkerPaymentsHistory = async () => {
    try {
      const { items } = await admin2Service.getWorkerPayments();
      const filtered = items.filter((item: any) => role === 'clerk' ? item.branch === loggedInCampus : true);
      setWorkerPaymentsHistory(filtered);
    } catch (err: any) {
      console.error('Failed to load worker payments history:', err);
    }
  };

  const fetchSections = fetchTeachers;

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
      } else if (activePage === 'reports') {
        await fetchReports();
      } else if (activePage === 'academic_fees') {
        await fetchFeeSettings();
            } else if (activePage === 'expenditure') {
        await fetchExpenditures();
      } else if (activePage === 'salary_status') {
        await fetchStaffSalaries();
      } else if (activePage === 'worker_payments') {
        await fetchWorkerPayments();
      } else if (pulseKey === 'finance' || pulseKey === 'fees') {
        await Promise.all([fetchFeeSettings(), fetchStudents()]);
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
        const branchParam = role === 'clerk' ? loggedInCampus : undefined;
        const tasks: Promise<any>[] = [
          fetchStudents('', true), // suppressToast=true: cold-start 404s silently retry
          fetchFeeSettings(branchParam, true),
          fetchExpenditures()
        ];
        if (role === 'clerk') {
          tasks.push(fetchWorkerPayments(), fetchStaffSalaries());
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
        if (activePage === 'students' || activePage === 'add_student' || activePage === 'teachers') {
          await Promise.all([fetchStudents(''), fetchSections()]);
          if (activePage === 'add_student') {
            if (!newStuAdmissionNumber.trim()) setNewStuAdmissionNumber(`ADM2400${studentTotal + 1}`);
            setNewStuFormPage(1);
            setIsStudentHoverModalOpen(true);
          }
        } else if (activePage === 'sections') {
          await Promise.all([fetchSections(), fetchStudents('')]);
        } else if (activePage === 'reports') {
          await fetchReports();
        } else if (activePage === 'academic_fees') {
          await fetchFeeSettings();
        } else if (activePage === 'fee_editor') {
          await fetchStudents('');
                } else if (activePage === 'expenditure') {
          await fetchExpenditures();
        } else if (activePage === 'salary_status') {
          await fetchStaffSalaries();
        } else if (activePage === 'worker_payments') {
          await fetchWorkerPayments();
        } else if (activePage === 'enquiries') {
          await fetchEnquiries();
        } else if (activePage === 'logs') {
          await Promise.all([fetchAuditLogs(1), fetchAuditFilterOptions()]);
        } else if (activePage === 'clerks') {
          await fetchClerks(clerkCampus);
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

  /**
   * Download a CSV of everything in scope — not just the rows on screen.
   *
   * An export that stopped at the current page would still add up, just to
   * the wrong number, which is the failure mode worth designing against on a
   * fee register.
   */
  const CsvExportButton: React.FC<{ kind: 'students' | 'payments' | 'expenditures'; label: string }> =
    ({ kind, label }) => {
      const [downloading, setDownloading] = useState(false);
      return (
        <button
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadCsv(kind);
              triggerToast(`${label} downloaded.`);
            } catch (err: any) {
              triggerToast(err?.message || 'Could not download that export.');
            } finally {
              setDownloading(false);
            }
          }}
          disabled={downloading}
          style={{
            padding: '7px 13px', borderRadius: 8,
            border: '1.5px solid var(--card-border)', background: 'transparent',
            color: downloading ? 'var(--muted-gray)' : 'var(--ink)',
            fontWeight: 800, fontSize: '0.75rem',
            cursor: downloading ? 'default' : 'pointer', whiteSpace: 'nowrap'
          }}
          className="press-interactive"
        >
          {downloading ? 'Preparing…' : `⤓ ${label}`}
        </button>
      );
    };




  /**
   * Find one student by what a person typed, and open them.
   *
   * Looks in the loaded registry first because that answers instantly for the
   * common case, then ASKS THE DATABASE before giving up. The second half is
   * the point: the registry response is capped, so this used to search only
   * the rows that happened to have come back and told the Rector "Student
   * record not found" for students who were plainly there — the further down
   * the register a student sat, the more certainly they were unreachable. On
   * a college of a few hundred that never showed; past the cap it is every
   * student beyond it, and the message actively misinforms, because a search
   * that says "not found" is normally taken to mean the record does not exist.
   */
  const handleSearchStudent = async () => {
    if (!searchAdm || !searchAdm.trim()) {
      triggerToast('Please type an Admission or Registration number.');
      return;
    }
    const q = searchAdm.toUpperCase().trim();
    const open = (match: Student) => {
      setSelectedStudent(match);
      setEditStudent({ ...match });
      triggerToast(`Loaded student ${match.name} (Adm No: ${match.admissionNumber || match.studentId}).`);
    };

    const local = students.find(s =>
      (s.admissionNumber || '').toUpperCase().trim() === q ||
      (s.registrationNumber || '').toUpperCase().trim() === q ||
      (s.studentId || '').toUpperCase().trim() === q ||
      (s.name || '').toUpperCase().trim().includes(q)
    );
    if (local) {
      open(local);
      return;
    }

    // Exact identifier lookup, then a search over every student in the
    // database rather than every student on this page.
    try {
      const exact = await admin1Service.findStudent(searchAdm.trim());
      if (exact) {
        open(exact as unknown as Student);
        return;
      }
      const { items } = await admin1Service.getStudents(searchAdm.trim(), '');
      if (items.length > 0) {
        open(items[0] as unknown as Student);
        return;
      }
    } catch {
      // Fall through to the not-found message; a failed lookup and a genuine
      // miss read the same to the person at the counter.
    }
    triggerToast('Student record not found for: ' + searchAdm);
  };

  const handleStudentSave = async (updated: Student, keyToUse?: string) => {
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
      if (keyToUse) setGlobalSecurityKey(keyToUse.trim());
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

  const handlePermanentDeleteStudent = async () => {
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

    try {
      /* security PIN is collected by apiClient on demand */
      await admin1Service.deleteStudent(targetId, undefined);
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
      triggerToast(err.message || 'Failed to delete student record.');
    }
  };

  const handleTeacherSave = async (updated: Teacher) => {
    setEditTeacher({ ...updated });
    setFacActionType('edit');
    setFacOtpInput('');
    setIsFacOtpModalOpen(true);
  };

  const submitStudentRegistrationWithOtp = async () => {
    setIsSubmittingStudent(true);
    try {
      /* security PIN is collected by apiClient on demand */
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

    // Shared with the accountant's admission form, so both produce the same
    // shape of fee record. See feeSlotsToPayload.
    const { grossTotal: grossFeeTotal, ...feeFields } = feeSlotsToPayload(newStuFeeSlots);

    // Fee cap validation
    if (grossFeeTotal > MAX_STUDENT_FEE) {
      triggerToast(`Total fees (Rs. ${grossFeeTotal.toLocaleString('en-IN')}) exceed the maximum allowed per student (Rs. ${MAX_STUDENT_FEE.toLocaleString('en-IN')}).`);
      return;
    }

    const newStu: any = {
      admissionNumber: newAdm,
      studentId: newAdm,
      name: newStuName.trim(),
      branch: newStuBranch,
      mobile: newStuMobile.trim(),
      course: newStuCourse.trim(),
      studentYear: newStuProgrammeYear,
      section: newStuSection.trim(),
      fatherName: newStuFatherName.trim(),
      motherName: newStuMotherName.trim(),
      dob: newStuDob,
      parentMobile: newStuParentMobile.trim(),
      previousSchool: newStuPreviousSchool.trim(),
      previousBoard: newStuPreviousBoard.trim(),
      address: newStuAddress.trim(),
      status: 'Active',
      ...feeFields,
      totalPaid: 0,
      remainingBalance: grossFeeTotal
    };

    try {
      const response = await apiClient.post('/admin1/students', newStu);
      if (response && (response.status === 'success' || response.data)) {
        // Take the SERVER's record, not the object we just built. The saved
        // document is the one that carries _id and the normalised fields, and
        // every later action on this student is keyed on them. Adding the
        // local copy instead left a row on screen with no _id that no
        // subsequent edit, payment or delete could find.
        const saved = response.data || newStu;
        setStudents(prev => [...prev, saved]);
        setSelectedStudent(saved);
        setEditStudent({ ...saved });
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
        triggerToast(`Student ${saved.name} registered successfully! ID: ${saved.studentId || newAdm}`);
        await triggerFreshnessRefetch();
      } else {
        triggerToast(response?.message || 'Failed to register student.');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error creating student.');
    }
  };

  const submitFacOtp = async () => {
    setIsProcessingUpload(true);
    try {
      /* security PIN is collected by apiClient on demand */
      if (facActionType === 'add') {
        const newId = `FAC-20${Math.floor(1000 + Math.random() * 9000)}`;
        const teacherPayload = {
          id: newId,
          name: newFacName,
          subject: newFacSub || 'Faculty',
          email: newFacEmail,
          salary: parseFloat(newFacSal) || 50000,
          mobile: newFacMobile,
          branch: role === 'clerk' ? loggedInCampus : newFacBranch
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
        await admin1Service.deleteTeacher(pendingDeleteTeacherId, undefined);
        setSelectedTeacher(null);
        setEditTeacher(null);
        setPendingDeleteTeacherId(null);
        setIsFacOtpModalOpen(false);
        setFacOtpInput('');
        triggerToast('Faculty record permanently deleted.');
        await fetchTeachers();
      } else if (facActionType === 'salary_payment' && selectedStaffMonthForEdit) {
        // Narrow once, here, rather than relying on a truthiness check in the
        // branch condition — TypeScript cannot carry that guard across the
        // separate assignment below, which is why every use of targetObj was
        // flagged as possibly null.
        const targetObj = editTeacher || selectedTeacher;
        if (!targetObj) {
          triggerToast('No faculty member is selected.');
          return;
        }
        const targetId = targetObj._id || targetObj.id || '';
        const res = await admin1Service.payTeacherSalary(targetId, {
          academicYear: selectedAcademicYear,
          month: selectedStaffMonthForEdit,
          amountPaid: Number(staffMonthAmount || targetObj.salary || 0),
          paymentMode: staffMonthMode || 'Bank Transfer',
          note: staffMonthNote || ''
        }, undefined);

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
      triggerToast(err.message || 'Operation failed.');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    await handlePermanentDeleteStudent();
  };

  const handleSaveAcademicFees = async (otpToUse?: string) => {
    if (!otpToUse || !otpToUse.trim()) {
      triggerToast('Please enter a valid 6-digit Security Authorization Key / OTP.');
      return;
    }
    try {
      if (otpToUse) setGlobalSecurityKey(otpToUse.trim());
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

  const handleConfirmUnlockFees = async (otpToUse?: string) => {
    if (!otpToUse || !otpToUse.trim()) {
      triggerToast('Please enter a valid 6-digit Security Authorization Key / OTP.');
      return;
    }
    try {
      if (otpToUse) setGlobalSecurityKey(otpToUse.trim());
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
    // Reachable by a clerk granted either student power — the registry is
    // both where a record is edited and where a new one is registered from.
    if (!clerkCan('editStudent') && !clerkCan('addStudent')) { setActivePage('menu'); return null; }

    const filteredRegistryStudents = students.filter((student) => matchesStudentQuery(student, searchAdm));
    const registryPageSize = 20;
    const registryTotalPages = Math.max(1, Math.ceil(filteredRegistryStudents.length / registryPageSize));
    const registryCurrentPage = Math.min(registryPage, registryTotalPages);
    const registryPageStudents = filteredRegistryStudents.slice((registryCurrentPage - 1) * registryPageSize, registryCurrentPage * registryPageSize);

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('emerald')}
        <header style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px', zIndex: 1 }}>
            <div>
              <button onClick={() => { setActivePage('menu'); setSelectedStudent(null); setEditStudent(null); }} style={styles.backArrowBtn} className="press-interactive">
                Back to Cockpit
              </button>
              <h1 style={{ ...styles.title, marginTop: '8px' }}>Student Registry</h1>
              <p style={styles.subtitle}>Configure permissions, reset credentials, register new admissions, and view documents</p>
            </div>
            <button
              onClick={() => {
                if (!newStuAdmissionNumber.trim()) {
                  setNewStuAdmissionNumber(`ADM2400${studentTotal + 1}`);
                }
                setNewStuFormPage(1);
                setIsStudentHoverModalOpen(true);
              }}
              style={{
                backgroundColor: 'var(--good)',
                color: 'var(--surface)',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: 850,
                fontSize: '0.9643rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
                transition: 'all 0.2s ease'
              }}
              className="press-interactive"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              + Add New Student Admission
            </button>
          </div>
        </header>

        <main style={styles.content}>
          {/* Surface Bar: Single Quick Entry Horizontal Bar */}
          <div style={{ ...styles.readOnlyBlock, zIndex: 1, marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <h4 style={{ ...styles.sectionSubtitle, margin: 0, fontSize: '1.0714rem', fontWeight: 900, color: 'var(--ink)' }}>
                  Register New Student Admission
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.8214rem', color: 'var(--ink-secondary)' }}>
                  Quick single-bar surface entry. Fill basic info and click submit to open detailed hover modal.
                </p>
              </div>
            </div>

            {/* Single Horizontal Surface Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Admission Number *</label>
                <input maxLength={LIMITS.admissionNumber}
                  type="text"
                  placeholder={`ADM2400${studentTotal + 1}`}
                  value={newStuAdmissionNumber}
                  onChange={(e) => { setNewStuAdmissionNumber(e.target.value); setRegStuError(''); }}
                  style={{ ...styles.textInputBox, fontSize: '0.8929rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Student Name *</label>
                <input maxLength={LIMITS.personName}
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newStuName}
                  onChange={(e) => setNewStuName(e.target.value)}
                  style={{ ...styles.textInputBox, fontSize: '0.8929rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Mobile Number *</label>
                <input maxLength={LIMITS.mobile}
                  type="text"
                  placeholder="e.g. 9900000000"
                  value={newStuMobile}
                  onChange={(e) => setNewStuMobile(e.target.value)}
                  style={{ ...styles.textInputBox, fontSize: '0.8929rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Campus / Branch *</label>
                <select
                  value={newStuBranch}
                  onChange={(e) => setNewStuBranch(e.target.value)}
                  style={{ ...styles.selectInput, fontSize: '0.8929rem' }}
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
                  style={{ ...styles.selectInput, fontSize: '0.8929rem' }}
                >
                  <option value="MPC">MPC</option>
                  <option value="BiPC">BiPC</option>
                  <option value="CEC">CEC</option>
                  <option value="MEC">MEC</option>
                  <option value="HEC">HEC</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Year *</label>
                <select
                  value={newStuProgrammeYear}
                  onChange={(e) => setNewStuProgrammeYear(e.target.value)}
                  style={{ ...styles.selectInput, fontSize: '0.8929rem' }}
                >
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Short Term">Short Term</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.formLabel}>Academic Year *</label>
                <select
                  value={newStuYear}
                  onChange={(e) => setNewStuYear(e.target.value as any)}
                  style={{ ...styles.selectInput, fontSize: '0.8929rem' }}
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
                    if (!newStuAdmissionNumber.trim()) {
                      setNewStuAdmissionNumber(`ADM2400${studentTotal + 1}`);
                    }
                    setNewStuFormPage(1);
                    setIsStudentHoverModalOpen(true);
                  }}
                  style={{
                    ...styles.saveSubmitBtn,
                    marginTop: 0,
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'var(--good)',
                    color: 'var(--surface)',
                    fontSize: '0.8929rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  className="press-interactive"
                >
                  Register & Open Full Form →
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
                backgroundColor: 'var(--surface)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '920px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1.5px solid var(--line-strong)',
                display: 'flex',
                flexDirection: 'column'
              }} className="anim-scale-up">
                {/* Modal Header */}
                <div style={{
                  padding: '16px 24px',
                  borderBottom: '1.5px solid var(--line)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--surface-sunken)',
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  <div>
                    <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      INSPIRE JUNIOR COLLEGE • STUDENT ADMISSION REGISTRATION
                    </span>
                    <h3 style={{ margin: '2px 0 0', fontSize: '1.2143rem', fontWeight: 900, color: 'var(--ink)' }}>
                      {newStuFormPage === 1 ? 'Screen 1 of 3: Basic Academic Information' : newStuFormPage === 2 ? 'Screen 2 of 3: Personal & Family Information' : 'Screen 3 of 3: Fee Structure & Bill Format'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.7857rem',
                        fontWeight: 800,
                        backgroundColor: newStuFormPage === 1 ? 'var(--ink)' : 'var(--line)',
                        color: newStuFormPage === 1 ? 'var(--surface)' : 'var(--ink-secondary)'
                      }}>
                        1. Basic Info
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.7857rem',
                        fontWeight: 800,
                        backgroundColor: newStuFormPage === 2 ? 'var(--ink)' : 'var(--line)',
                        color: newStuFormPage === 2 ? 'var(--surface)' : 'var(--ink-secondary)'
                      }}>
                        2. Personal & Family
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.7857rem',
                        fontWeight: 800,
                        backgroundColor: newStuFormPage === 3 ? 'var(--ink)' : 'var(--line)',
                        color: newStuFormPage === 3 ? 'var(--surface)' : 'var(--ink-secondary)'
                      }}>
                        3. Fee Structure
                      </span>
                    </div>
                    <button
                      onClick={() => setIsStudentHoverModalOpen(false)}
                      style={{
                        background: 'var(--line)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 900,
                        color: 'var(--ink-secondary)'
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
                        <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)', paddingBottom: '4px', marginBottom: '12px' }}>
                          1. Basic Academic Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
                          <div>
                            <label style={styles.formLabel}>Admission Number *</label>
                            <input maxLength={LIMITS.admissionNumber} type="text" placeholder="e.g. 2400101" value={newStuAdmissionNumber} onChange={(e) => setNewStuAdmissionNumber(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Student Full Name *</label>
                            <input maxLength={LIMITS.personName} type="text" placeholder="e.g. Rahul Sharma" value={newStuName} onChange={(e) => setNewStuName(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Student Mobile Number *</label>
                            <input maxLength={LIMITS.mobile} type="text" placeholder="10-digit mobile" value={newStuMobile} onChange={(e) => setNewStuMobile(e.target.value)} style={styles.textInputBox} />
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
                            <label style={styles.formLabel}>Year *</label>
                            <select value={newStuProgrammeYear} onChange={(e) => setNewStuProgrammeYear(e.target.value)} style={styles.selectInput}>
                              <option value="First Year">First Year</option>
                              <option value="Second Year">Second Year</option>
                              <option value="Short Term">Short Term</option>
                            </select>
                          </div>
                          <div>
                            <label style={styles.formLabel}>Section *</label>
                            <input maxLength={LIMITS.section} type="text" placeholder="e.g. MPC-A" value={newStuSection} onChange={(e) => setNewStuSection(e.target.value)} style={styles.textInputBox} />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setIsStudentHoverModalOpen(false)}
                          style={{ ...styles.actionItemBtn, backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', padding: '10px 20px', border: 'none' }}
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
                            const dup = findStudentDuplicates(newStuAdmissionNumber, newStuMobile);
                            if (dup.admissionMatch || dup.mobileMatch) {
                              setDuplicateStudentConflict(dup);
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
                        <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)', paddingBottom: '4px', marginBottom: '12px' }}>
                          2. Personal & Family Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
                          <div>
                            <label style={styles.formLabel}>Father's Name</label>
                            <input maxLength={LIMITS.personName} type="text" placeholder="e.g. Ramesh Sharma" value={newStuFatherName} onChange={(e) => setNewStuFatherName(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Mother's Name</label>
                            <input maxLength={LIMITS.personName} type="text" placeholder="e.g. Sunitha Sharma" value={newStuMotherName} onChange={(e) => setNewStuMotherName(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Date of Birth</label>
                            <input type="date" value={newStuDob} onChange={(e) => setNewStuDob(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Parent Contact Mobile</label>
                            <input maxLength={LIMITS.mobile} type="text" placeholder="e.g. 9876543210" value={newStuParentMobile} onChange={(e) => setNewStuParentMobile(e.target.value)} style={styles.textInputBox} />
                          </div>
                          <div>
                            <label style={styles.formLabel}>Previous School</label>
                            <input maxLength={LIMITS.previousSchool} type="text" placeholder="e.g. ZPHS / St. Johns High School" value={newStuPreviousSchool} onChange={(e) => setNewStuPreviousSchool(e.target.value)} style={styles.textInputBox} />
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
                            <input maxLength={LIMITS.address} type="text" placeholder="H.No., Street, Village/Mandal, District" value={newStuAddress} onChange={(e) => setNewStuAddress(e.target.value)} style={styles.textInputBox} />
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
                      {/* Screen 3: Fee Structure.
                          The table itself is FeeSlotEditor, which the
                          accountant's admission form and year-upgrade sheet
                          also render. It used to be written out here and
                          nowhere else, which is why each of those screens
                          grew its own smaller, different version. */}
                      <FeeSlotEditor
                        slots={newStuFeeSlots}
                        onChange={setNewStuFeeSlots}
                        inputStyle={styles.textInputBox}
                        buttonStyle={styles.actionItemBtn}
                        onNotify={triggerToast}
                      />

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
                          onClick={handleRegisterStudent}
                          style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '10px 28px', backgroundColor: 'var(--good)', color: 'var(--surface)', fontWeight: 900 }}
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

          {/* Duplicate admission guard.

              Sits above the admission form (zIndex 99999) because it is raised
              from inside it. An admission-number clash cannot be overridden —
              the number is the student's identity and the server refuses it
              anyway, so offering a way past would only move the failure later.
              A mobile-only clash CAN be overridden: siblings routinely share a
              guardian's number, and blocking that outright would stop a
              legitimate admission at the counter with no way forward. */}
          {duplicateStudentConflict && (
            <div style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
              zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}>
              <div style={{
                backgroundColor: 'var(--surface)', borderRadius: '18px', width: '100%', maxWidth: '520px',
                padding: '26px', border: '1.5px solid var(--line-strong)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)'
              }} className="anim-scale-up">
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: 'var(--critical)' }}>
                  This student is already registered
                </h3>
                <p style={{ margin: '8px 0 16px', fontSize: '0.8571rem', color: 'var(--muted-gray)', lineHeight: 1.55 }}>
                  {duplicateStudentConflict.admissionMatch
                    ? 'The admission number entered belongs to an existing record. Admission numbers identify a student and cannot be reused.'
                    : 'The mobile number entered is already on an existing record.'}
                </p>

                {duplicateStudentConflict.admissionMatch && (
                  <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--line)', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Admission number {newStuAdmissionNumber.trim()} — already used by
                    </div>
                    <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)', marginTop: '4px' }}>
                      {duplicateStudentConflict.admissionMatch.name}
                    </div>
                    <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                      {duplicateStudentConflict.admissionMatch.course} · {duplicateStudentConflict.admissionMatch.branch}
                    </div>
                  </div>
                )}

                {duplicateStudentConflict.mobileMatch && (
                  <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--line)', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Mobile {newStuMobile.trim()} — already on record for
                    </div>
                    <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)', marginTop: '4px' }}>
                      {duplicateStudentConflict.mobileMatch.name}
                    </div>
                    <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                      Adm: {duplicateStudentConflict.mobileMatch.admissionNumber} · {duplicateStudentConflict.mobileMatch.branch}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button
                    type="button"
                    onClick={() => setDuplicateStudentConflict(null)}
                    style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'var(--ink)', color: 'var(--surface)', fontWeight: 900 }}
                    className="press-interactive"
                  >
                    Go back and correct it
                  </button>
                  {!duplicateStudentConflict.admissionMatch && duplicateStudentConflict.mobileMatch && (
                    <button
                      type="button"
                      onClick={() => { setDuplicateStudentConflict(null); setNewStuFormPage(2); }}
                      style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'var(--line)', color: 'var(--ink)', fontWeight: 800 }}
                      className="press-interactive"
                    >
                      Same family — continue
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input maxLength={100}
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
              <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--muted-gray)' }}>
                Showing <strong>{registryPageStudents.length}</strong> of <strong>{filteredRegistryStudents.length}</strong>
                {studentsTruncated && <> &middot; {studentTotal} in total</>}
              </span>
              <CsvExportButton kind="students" label="Export CSV" />
              {/* payments.csv had a route, a role gate and a rate limiter, and
                  no button anywhere in the app - so the one export that
                  reconciles against a bank statement could not be reached. */}
              <CsvExportButton kind="payments" label="Payments CSV" />
            </div>

            {/*
              A capped list must never look like a complete one. The registry
              response is bounded, so when more students exist than came back,
              the screen says so and points at the search — which is answered
              by the database now, so it reaches the students that are not on
              this page.
            */}
            {studentsTruncated && (
              <div style={{
                fontSize: '0.7857rem', fontWeight: 700, color: 'var(--ink-secondary)',
                background: 'var(--surface)', border: '1px solid var(--muted-gray)',
                borderRadius: '8px', padding: '8px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '12px', flexWrap: 'wrap'
              }}>
                <span>
                  Showing the first {students.length} of {studentTotal} students. Search reaches
                  every student, not only the ones listed here.
                </span>
                {/*
                  The message on its own used to be the whole feature: it named
                  a number the screen could not reach and left it at that, so a
                  registry larger than one response had students no screen in
                  the application could open. This loads the next page onto the
                  end of the list.
                */}
                {/*
                  Deliberately requests the NEXT PAGE OF THE SAME QUERY the
                  loaded rows came from, which is the unfiltered registry —
                  fetchStudents is called with no search term, and the box
                  above narrows those rows in the browser. Passing the search
                  term here instead would page a different result set onto the
                  end of this one: page 1 of every student followed by page 2
                  of the matches, which is neither list and skips students in
                  between.
                */}
                <button
                  onClick={() => loadMoreStudents()}
                  disabled={loadingMoreStudents}
                  className="press-interactive"
                  style={{
                    padding: '6px 14px', borderRadius: '6px', fontWeight: 800,
                    fontSize: '0.7857rem', whiteSpace: 'nowrap',
                    border: '1px solid var(--muted-gray)',
                    background: loadingMoreStudents ? 'var(--muted-gray)' : 'var(--ink-primary)',
                    color: loadingMoreStudents ? 'var(--ink-secondary)' : 'var(--surface)',
                    cursor: loadingMoreStudents ? 'wait' : 'pointer'
                  }}
                >
                  {loadingMoreStudents ? 'Loading…' : `Load next ${Math.min(500, studentTotal - students.length)}`}
                </button>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: '12px'
            }}>
              {registryPageStudents.map((student) => (
                <GlassCard
                  key={student._id || student.admissionNumber || student.studentId}
                  hoverable={true}
                  onClick={async () => {
                    // Shown immediately from the row, then filled in with the
                    // receipt history once the detail arrives. Opening the
                    // panel should not wait on a round trip; everything above
                    // the receipts is already here.
                    setSelectedStudent(student);
                    setEditStudent({ ...student });
                    const full = await hydrateStudent(student);
                    setSelectedStudent(full);
                    setEditStudent({ ...full });
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
                        color: 'var(--good)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.0714rem',
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {(student.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--dark-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.name}
                        </strong>
                        <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                          Adm: {student.admissionNumber}  |  Reg: {student.registrationNumber || student.studentId}
                        </div>
                        <div style={{ fontSize: '0.7857rem', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                          {student.branch} ({student.course})
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: student.status === 'Active' ? 'var(--good)' : 'var(--critical)' }}>
                      {student.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSelectedStudent(student);
                        setEditStudent({ ...student });
                        const full = await hydrateStudent(student);
                        setSelectedStudent(full);
                        setEditStudent({ ...full });
                      }}
                      style={{
                        padding: '8px 12px',
                        border: '1.5px solid var(--royal-gold)',
                        // Was var(--warning) — #FAB219 amber on the #F5F5F4 sunken
                        // surface, a contrast ratio of 1.68. The same invisible-label
                        // fault as the dark-on-dark buttons, just the light-on-light
                        // direction of it. Matches the border instead.
                        color: 'var(--royal-gold)',
                        backgroundColor: 'var(--surface-sunken)',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.7857rem',
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
              <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--muted-gray)' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={styles.modalTitle}>Student Master Profile & Details Editor</h3>
                    <p style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', margin: 0 }}>
                      Modify student profile, family information, and campus itemized fee structure details below.
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelectedStudent(null); setEditStudent(null); }}
                    style={{ background: 'none', border: 'none', fontSize: '1.7143rem', fontWeight: 900, cursor: 'pointer', color: 'var(--muted-gray)' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Top Student Banner */}
                  <div style={{ ...styles.readOnlyBlock, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-sunken)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--good)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4286rem', fontWeight: 900 }}>
                        {(editStudent.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: '1.1429rem', color: 'var(--dark-charcoal)', display: 'block' }}>{editStudent.name || 'Student Name'}</strong>
                        <span style={{ fontSize: '0.8571rem', color: 'var(--muted-gray)', fontWeight: 600 }}>Admission No: {editStudent.admissionNumber || editStudent.studentId}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7857rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', backgroundColor: '#E0E7FF', color: 'var(--accent)' }}>
                        {editStudent.branch || 'Campus'}
                      </span>
                      <span style={{ fontSize: '0.7857rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--good-wash)', color: 'var(--good)' }}>
                        {editStudent.course || 'Course'}
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Basic & Academic Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase' }}>
                      1. Basic & Academic Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Full Student Name</label>
                        <input maxLength={LIMITS.personName} type="text" value={editStudent.name || ''} onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Admission Number</label>
                        <input maxLength={LIMITS.admissionNumber} type="text" value={editStudent.admissionNumber || ''} onChange={(e) => setEditStudent({ ...editStudent, admissionNumber: e.target.value })} style={styles.textInputBox} />
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
                        <input maxLength={LIMITS.mobile} type="text" value={editStudent.mobile || ''} onChange={(e) => setEditStudent({ ...editStudent, mobile: e.target.value })} style={styles.textInputBox} />
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
                        <input maxLength={LIMITS.section} type="text" placeholder="e.g. Section A" value={editStudent.section || ''} onChange={(e) => setEditStudent({ ...editStudent, section: e.target.value })} style={styles.textInputBox} />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Personal & Family Profile */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase' }}>
                      2. Personal & Family Profile
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Father Name</label>
                        <input maxLength={LIMITS.personName} type="text" value={editStudent.fatherName || ''} onChange={(e) => setEditStudent({ ...editStudent, fatherName: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Mother Name</label>
                        <input maxLength={LIMITS.personName} type="text" value={editStudent.motherName || ''} onChange={(e) => setEditStudent({ ...editStudent, motherName: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Date of Birth</label>
                        <input type="date" value={editStudent.dob || ''} onChange={(e) => setEditStudent({ ...editStudent, dob: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Parent Mobile Contact</label>
                        <input maxLength={LIMITS.mobile} type="text" value={editStudent.parentMobile || ''} onChange={(e) => setEditStudent({ ...editStudent, parentMobile: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Past School</label>
                        <input type="text" maxLength={LIMITS.previousSchool} value={editStudent.pastSchool || ''} onChange={(e) => setEditStudent({ ...editStudent, pastSchool: e.target.value })} style={styles.textInputBox} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={styles.formLabel}>Previous School / Board</label>
                        <input maxLength={LIMITS.previousSchool} type="text" value={editStudent.previousSchool || ''} onChange={(e) => setEditStudent({ ...editStudent, previousSchool: e.target.value })} style={styles.textInputBox} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Permanent Address</label>
                      <input maxLength={LIMITS.address} type="text" value={editStudent.address || ''} onChange={(e) => setEditStudent({ ...editStudent, address: e.target.value })} style={styles.textInputBox} />
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                    <button
                      onClick={() => handleStudentSave(editStudent, undefined)}
                      style={{ ...styles.saveSubmitBtn, flex: 2, marginTop: 0 }}
                      className="press-interactive"
                    >
                      Submit & Save Complete Profile
                    </button>
                    {(role === 'admin1' || role === 'clerk' || role === 'accountant') && (
                      <button
                        onClick={() => { setDeleteStuOtpInput(''); setIsDeleteStuOtpOpen(true); }}
                        style={{ ...styles.saveSubmitBtn, flex: 1, marginTop: 0, backgroundColor: 'var(--critical)', color: '#fff', border: 'none' }}
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

          {/* STUDENT REGISTRATION CONFIRMATION MODAL */}
          {isRegStuOtpModalOpen && (
            <div style={styles.overlayOverlay}>
              <div style={{ ...styles.overlaySheet, maxWidth: '440px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ ...styles.modalTitle, color: 'var(--royal-gold)', margin: 0 }}>Confirm Student Registration</h3>
                  <button onClick={() => !isSubmittingStudent && setIsRegStuOtpModalOpen(false)} disabled={isSubmittingStudent} style={{ background: 'none', border: 'none', fontSize: '1.4286rem', cursor: isSubmittingStudent ? 'not-allowed' : 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}>×</button>
                </div>
                <p style={{ fontSize: '0.9286rem', color: 'var(--dark-charcoal)', marginBottom: '16px', lineHeight: 1.5, fontWeight: 600 }}>
                  Are you sure you want to finalize student registration for <strong>{newStuName}</strong> (Adm No: <strong>{newStuAdmissionNumber || `ADM2400${studentTotal + 1}`}</strong>)?
                </p>
                {regStuError && <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--critical-wash)', border: '1px solid var(--critical-wash)', color: 'var(--critical)', fontSize: '0.8571rem', fontWeight: 700 }}>{regStuError}</div>}

                {isSubmittingStudent ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
                    <div style={{ width: '36px', height: '36px', border: '4px solid rgba(0,0,0,.1)', borderLeftColor: 'transparent', borderRadius: '50%', animation: 'spin89345 1s linear infinite' }} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setIsRegStuOtpModalOpen(false)} style={{ ...styles.actionItemBtn, flex: 1 }} className="press-interactive">Cancel</button>
                    <button onClick={submitStudentRegistrationWithOtp} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 800 }} className="press-interactive">
                      Yes, Create Student
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DELETE STUDENT CONFIRMATION MODAL */}
          {isDeleteStuOtpOpen && editStudent && (
            <div style={styles.modalOverlay} className="anim-fade-in">
              <GlassCard hoverable={false} style={styles.modalContentCard} className="anim-scale-in glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ ...styles.modalIconBadge, backgroundColor: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.4)' }}>
                    <span style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--critical)' }}>DELETE</span>
                  </div>
                  <h3 style={{ ...styles.modalHeading, color: 'var(--critical)' }}>Confirm Student Deletion</h3>
                  <p style={styles.modalSubText}>
                    Are you sure you want to permanently delete student <strong>{editStudent.name}</strong> ({editStudent.admissionNumber || editStudent.studentId}) from the system?
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setIsDeleteStuOtpOpen(false); setDeleteStuOtpInput(''); }} style={styles.modalCancelBtn} className="press-interactive">Cancel</button>
                  <button
                    onClick={() => handleConfirmDeleteStudent()}
                    style={{ ...styles.modalConfirmBtn, backgroundColor: 'var(--critical)', color: '#FFF', opacity: 1 }}
                    className="press-interactive"
                  >
                    Yes, Purge Student
                  </button>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
    );
  }

  // SUBPAGE 2: STAFF & FACULTY REGISTRY (WITH 12-MONTH SALARY LEDGER)
  if (activePage === 'teachers' || activePage === 'salary_status' || activePage === 'worker_payments') {
    // Staff, salaries and worker payments belong to `manageStaff`, which the
    // Clerks screen offers and the server already enforces on every one of
    // these routes. This used to read `role !== 'admin1'`, which locked the
    // page to the Rector — so granting a clerk "Manage staff" changed nothing
    // they could reach, and the switch appeared to do nothing.
    //
    // The list itself is campus-scoped for a clerk in fetchTeachers, and the
    // server scopes it again, so a clerk with this power sees their own campus
    // and no other.
    if (role !== 'admin1' && !clerkCan('manageStaff')) { setActivePage('menu'); return null; }

    const monthsList = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    const currentMonth = "July";

    const filteredStaff = teachers.filter(t => {
      // A clerk sees their own campus and nothing else.
      //
      // fetchTeachers already asks only for their campus and the server scopes
      // it again, so this is the third of three. It is here anyway because it
      // is the cheap one: if either of the other two is ever loosened, a clerk
      // silently gains sight of every campus's staff and salaries, and nothing
      // on screen would look wrong.
      if (role !== 'admin1' && t.branch !== loggedInCampus) return false;
      if (filterFacCampus !== 'All' && t.branch !== filterFacCampus) return false;
      if (filterStaffClassification !== 'All' && (t.classification || 'Teaching') !== filterStaffClassification) return false;
      if (filterFacSubject !== 'All') {
        const roleOrSub = `${t.role || ''} ${t.subject || ''}`.toLowerCase();
        const fLow = filterFacSubject.toLowerCase();
        if (fLow.includes('teacher') || fLow.includes('lecturer')) {
          if (!roleOrSub.includes('teacher') && !roleOrSub.includes('lecturer') && !roleOrSub.includes('professor') && (t.classification || 'Teaching') !== 'Teaching') return false;
        } else if (!roleOrSub.includes(fLow)) {
          return false;
        }
      }

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

    // Both figures previously came from the year-less monthlySalaries map, so
    // "this month" could report a payment made in a different academic year,
    // and "overall" could never exceed twelve months no matter how many years
    // had been disbursed. Read the ledger by year instead.
    filteredStaff.forEach(t => {
      const baseSal = Number(t.salary || 0);
      const amountOf = (rec: MonthlySalaryRecord | null) =>
        Number(rec?.amountPaid || (isMonthPaid(rec) ? baseSal : 0));

      // Current month, in the year this teacher is actually working through.
      thisMonthTotalPaid += amountOf(monthRecordFor(t, currentLedgerYear(t), currentMonth));

      // Everything disbursed, across every year of the ledger.
      ACADEMIC_YEARS.forEach(yr => {
        monthsList.forEach(m => {
          overallTotalPaid += amountOf(monthRecordFor(t, yr, m));
        });
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

      const validCampusesList = CAMPUS_LIST;
      let targetBranch = newFacBranch || CAMPUS_LIST[0];
      if (!validCampusesList.includes(targetBranch)) {
        targetBranch = 'Erragattugutta C1';
      }

      const newStaffPayload = {
        id: empId,
        name: newFacName.trim(),
        role: finalRole,
        subject: finalRole,
        classification: newStaffClassification,
        salary: salaryVal,
        mobile: newFacMobile.trim(),
        email: newFacEmail.trim(),
        branch: targetBranch,
        status: 'Active',
        joiningDate: new Date().toISOString().split('T')[0]
      };

      setIsProcessingUpload(true);
      try {
        await admin1Service.createTeacher(newStaffPayload);
        triggerToast(`New staff member ${newFacName} registered under ${newStaffPayload.branch}.`);
        setIsAddTeacherModalOpen(false);
        setNewFacName('');
        setNewFacSal('');
        setNewFacMobile('');
        setNewFacEmail('');
        setNewStaffCustomRole('');
        await fetchTeachers();
        await fetchStaffSalaries();
      } catch (err: any) {
        triggerToast(err.message || 'Failed to register staff member.');
      } finally {
        setIsProcessingUpload(false);
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
                  fontSize: '0.8571rem',
                  backgroundColor: employeeTab === 'employees' ? 'var(--ink)' : 'transparent',
                  color: employeeTab === 'employees' ? 'var(--surface)' : 'var(--ink-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="press-interactive"
              >
                Active Employees Roster & Management
              </button>
              <button
                onClick={() => { setEmployeeTab('history'); fetchWorkerPaymentsHistory(); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '0.8571rem',
                  backgroundColor: employeeTab === 'history' ? 'var(--ink)' : 'transparent',
                  color: employeeTab === 'history' ? 'var(--surface)' : 'var(--ink-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="press-interactive"
              >
                Disbursement Payment History Log (All Campuses)
              </button>
            </div>

            {employeeTab === 'history' ? (
              <GlassCard style={{ padding: '20px', borderRadius: '16px', border: '1.5px solid var(--card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '1.0714rem', fontWeight: 900, color: 'var(--dark-charcoal)' }}>
                      Staff & Worker Payment History Log (All Campuses)
                    </div>
                    <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                      Read-only audit log of salary payments disbursed to employees
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={fetchWorkerPaymentsHistory} style={{ ...styles.actionItemBtn, padding: '6px 14px', fontSize: '0.7857rem', backgroundColor: 'var(--ink)', color: '#fff' }} className="press-interactive">
                      Refresh Log
                    </button>
                    <button onClick={handleDownloadDisbursementLogPDF} style={{ ...styles.actionItemBtn, padding: '6px 14px', fontSize: '0.7857rem', backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }} className="press-interactive">
                      Download Record
                    </button>
                  </div>
                </div>

                {workerPaymentsHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px', color: 'var(--muted-gray)', fontSize: '0.9286rem', fontWeight: 700 }}>
                    No payment history records found for selected campus.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8571rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--surface-sunken)', borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
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
                          <tr key={item._id || item.id || idx} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ padding: '10px', fontWeight: 700 }}>{new Date(item.createdAt || Date.now()).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '10px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{item.workerName || item.name}</td>
                            <td style={{ padding: '10px' }}>{item.role}</td>
                            <td style={{ padding: '10px', fontWeight: 900, color: 'var(--good)' }}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '10px' }}>{item.monthPeriod}</td>
                            <td style={{ padding: '10px' }}>{item.branch}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ backgroundColor: 'var(--good-wash)', color: 'var(--good)', padding: '3px 8px', borderRadius: '6px', fontWeight: 900, fontSize: '0.7143rem' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
                  <GlassCard style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid var(--card-border)' }}>
                    <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Filtered Staff Members</div>
                    <div style={{ fontSize: '1.5714rem', fontWeight: 900, color: 'var(--dark-charcoal)', marginTop: '4px' }}>{filteredStaff.length} Employees</div>
                    <div style={{ fontSize: '0.7143rem', color: 'var(--royal-gold)', fontWeight: 700, marginTop: '2px' }}>Active Staff & Faculty Roster</div>
                  </GlassCard>

                  <GlassCard style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid var(--good)', backgroundColor: 'rgba(236, 253, 245, 0.6)' }}>
                    <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--good)', textTransform: 'uppercase' }}>Salary Given This Month ({currentMonth})</div>
                    <div style={{ fontSize: '1.5714rem', fontWeight: 900, color: 'var(--good)', marginTop: '4px' }}>₹{thisMonthTotalPaid.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '0.7143rem', color: 'var(--good)', fontWeight: 700, marginTop: '2px' }}>Disbursed in Current Month</div>
                  </GlassCard>

                  <GlassCard style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid var(--accent)', backgroundColor: 'rgba(255, 253, 244, 0.7)' }}>
                    <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase' }}>Total Salary Given (All 12 Months)</div>
                    <div style={{ fontSize: '1.5714rem', fontWeight: 900, color: '#855E00', marginTop: '4px' }}>₹{overallTotalPaid.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '0.7143rem', color: 'var(--warning)', fontWeight: 700, marginTop: '2px' }}>Cumulative Annual Disbursement</div>
                  </GlassCard>
                </div>

                {/* Admin 1 Campus Selector Bar */}
                {(
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', padding: '10px 14px', borderRadius: '16px', border: '1.5px solid var(--card-border)' }}>
                    <span style={{ fontSize: '0.7857rem', fontWeight: 900, color: 'var(--dark-charcoal)', marginRight: '6px' }}>Campus:</span>
                    {['All', ...CAMPUS_LIST].map(cName => (
                      <button
                        key={cName}
                        onClick={() => { setFilterFacCampus(cName); setFacultyPage(1); }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '999px',
                          fontSize: '0.7857rem',
                          fontWeight: 800,
                          border: filterFacCampus === cName ? '1.5px solid var(--ink)' : '1px solid rgba(0,0,0,0.1)',
                          backgroundColor: filterFacCampus === cName ? 'var(--ink)' : '#fff',
                          color: filterFacCampus === cName ? 'var(--surface)' : 'var(--dark-charcoal)',
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
                  <input maxLength={100}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px', marginTop: '4px' }}>
                  {facultyPageItems.map(t => {
                    const baseSal = Number(t.salary || 0);
                    const isCurPaid = isMonthPaid(monthRecordFor(t, currentLedgerYear(t), currentMonth));

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
                            <div style={{ fontSize: '1.0714rem', fontWeight: 900, color: 'var(--dark-charcoal)' }}>{t.name}</div>
                            <div style={{ fontSize: '0.7857rem', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                              {t.role || t.subject || 'Staff Member'}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.6429rem',
                            fontWeight: 900,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor: (t.classification || 'Teaching') === 'Teaching' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                            color: (t.classification || 'Teaching') === 'Teaching' ? 'var(--accent)' : '#7C3AED',
                            border: '1px solid rgba(0,0,0,0.05)'
                          }}>
                            {t.classification || 'Teaching'}
                          </span>
                        </div>

                        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'var(--surface-sunken)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7857rem' }}>
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
                            <span style={{ fontWeight: 900, color: 'var(--good)' }}>₹{baseSal.toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Mobile:</span>
                            <span style={{ fontWeight: 800 }}>{t.mobile || '—'}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)' }}>{currentMonth}:</span>
                            <span style={{
                              fontSize: '0.7143rem',
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: isCurPaid ? 'var(--good-wash)' : 'var(--critical-wash)',
                              color: isCurPaid ? 'var(--good)' : 'var(--critical)'
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
                            style={{ ...styles.actionItemBtn, padding: '5px 12px', fontSize: '0.7143rem', backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }}
                            className="press-interactive"
                          >
                            Open 12-Month Ledger
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredStaff.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: 'var(--muted-gray)', fontSize: '0.9286rem' }}>
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
                  <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--muted-gray)' }}>
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
                    <p style={{ margin: '2px 0 0', fontSize: '0.7857rem', color: 'var(--muted-gray)' }}>{editTeacher.name} ({editTeacher.id || editTeacher._id}) &middot; {editTeacher.branch || loggedInCampus}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedTeacher(null); setEditTeacher(null); setSelectedStaffMonthForEdit(null); }}
                    style={{ background: 'none', border: 'none', fontSize: '1.5714rem', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}
                  >
                    ×
                  </button>
                </div>

                {/* Top Details Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--surface-sunken)', padding: '16px', borderRadius: '14px', border: '1.5px solid var(--line)', marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.8571rem', fontWeight: 900, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>Employee Profile & Salary Info</div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '10px' }}>
                    <div>
                      <label style={styles.formLabel}>Employee Name</label>
                      <input maxLength={LIMITS.personName}
                        type="text"
                        value={editTeacher.name || ''}
                        readOnly={!canEditFaculty}
                        onChange={(e) => canEditFaculty && setEditTeacher({ ...editTeacher, name: e.target.value })}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div>
                      <label style={styles.formLabel}>Role / Designation</label>
                      <input maxLength={LIMITS.subject}
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
                      <input min={0} max={999999999}
                        type="number"
                        value={editTeacher.salary || 0}
                        readOnly={!canEditFaculty}
                        onChange={(e) => canEditFaculty && setEditTeacher({ ...editTeacher, salary: parseFloat(e.target.value) || 0 })}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div>
                      <label style={styles.formLabel}>Mobile Number</label>
                      <input maxLength={LIMITS.mobile}
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
                        style={{ ...styles.saveSubmitBtn, marginTop: 0, width: 'auto', padding: '8px 18px', fontSize: '0.7857rem' }}
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
                    <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>
                      12-Month Academic Year Salary Disbursement Ledger
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Academic Year:</span>
                      <select
                        value={selectedAcademicYear}
                        onChange={(e) => setSelectedAcademicYear(e.target.value)}
                        style={{ ...styles.selectInput, width: 'auto', padding: '4px 10px', fontSize: '0.7857rem', fontWeight: 800 }}
                      >
                        {ACADEMIC_YEARS.map((yr, i) => {
                          const state = academicYearState(editTeacher, i);
                          return (
                            <option key={yr} value={yr} disabled={state.locked}>
                              {yr}{state.label}
                            </option>
                          );
                        })}
                      </select>

                      {/* Progress toward unlocking the next year. Without it
                          the next option is simply disabled with no indication
                          of what would open it. */}
                      {(() => {
                        const paid = monthsPaidIn(editTeacher, selectedAcademicYear);
                        const idx = ACADEMIC_YEARS.indexOf(selectedAcademicYear);
                        const isLast = idx === ACADEMIC_YEARS.length - 1;
                        const done = paid >= 12;
                        return (
                          <span style={{
                            fontSize: '0.7143rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px',
                            border: `1.5px solid ${done ? 'var(--good)' : 'var(--warning)'}`,
                            backgroundColor: done ? '#ECFDF5' : '#FFF8DB',
                            color: done ? 'var(--good)' : 'var(--warning)',
                            whiteSpace: 'nowrap'
                          }}>
                            {paid}/12 paid
                            {done && !isLast ? ' — next year unlocked' : ''}
                            {done && isLast ? ' — ledger complete' : ''}
                          </span>
                        );
                      })()}
                    </div>

                    <div style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', fontWeight: 700 }}>Click any month to view/update payment details</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '10px' }}>
                    {monthsList.map(mName => {
                      const mRec: MonthlySalaryRecord = monthRecordFor(editTeacher, selectedAcademicYear, mName)
                        || { status: 'Unpaid', amountPaid: 0, paymentDate: '—', paymentMode: '—' };
                      const isPaid = isMonthPaid(mRec);
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
                            border: isSelectedForEdit ? '2px solid var(--royal-gold)' : '1.5px solid var(--line)',
                            backgroundColor: isSelectedForEdit ? 'var(--surface-sunken)' : isPaid ? '#F0FDF4' : 'var(--critical-wash)',
                            cursor: canEditFaculty ? 'pointer' : 'default',
                            transition: 'all 0.15s ease'
                          }}
                          className="press-interactive"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7857rem', fontWeight: 900, color: 'var(--dark-charcoal)', textTransform: 'uppercase' }}>{mName}</span>
                            <span style={{
                              fontSize: '0.6429rem',
                              fontWeight: 900,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isPaid ? 'var(--good)' : 'var(--critical)',
                              color: '#fff'
                            }}>
                              {isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                          </div>

                          <div style={{ fontSize: '1rem', fontWeight: 900, color: isPaid ? 'var(--good)' : 'var(--critical)', marginTop: '6px' }}>
                            ₹{amtPaid.toLocaleString('en-IN')}
                          </div>

                          <div style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>Date: {mRec.paymentDate || '—'}</span>
                            <span>Mode: {mRec.paymentMode || '—'}</span>
                          </div>

                          {canEditFaculty && (
                            <div style={{ marginTop: '8px', fontSize: '0.6786rem', color: 'var(--royal-gold)', fontWeight: 800, textAlign: 'right' }}>
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
                  <div style={{ backgroundColor: 'var(--surface-sunken)', border: '2px solid var(--royal-gold)', borderRadius: '14px', padding: '16px', marginBottom: '18px' }} className="anim-slide-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: '#855E00' }}>
                        Edit Salary Disbursement for {selectedStaffMonthForEdit} 2026
                      </div>
                      <button onClick={() => setSelectedStaffMonthForEdit(null)} style={{ background: 'none', border: 'none', fontSize: '1.1429rem', cursor: 'pointer', fontWeight: 900 }}>×</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '10px' }}>
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
                        <input min={0} max={999999999}
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
                      <input maxLength={LIMITS.notes}
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
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid var(--line)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleDownloadStaffPayslip(editTeacher, currentMonth)}
                      style={{ ...styles.actionItemBtn, padding: '10px 16px', fontSize: '0.7857rem', fontWeight: 900, backgroundColor: 'var(--ink)', color: '#fff' }}
                      className="press-interactive"
                    >
                      Download Payslip ({currentMonth})
                    </button>

                    <button
                      onClick={() => handleDownloadStaffAnnualStatement(editTeacher)}
                      style={{ ...styles.actionItemBtn, padding: '10px 16px', fontSize: '0.7857rem', fontWeight: 900, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF' }}
                      className="press-interactive"
                    >
                      Download 12-Month Annual Statement
                    </button>
                  </div>

                  {(role === 'admin1' || role === 'clerk') && (
                    <button
                      onClick={() => {
                        setFacActionType('delete' as any);
                        setPendingDeleteTeacherId(editTeacher._id || editTeacher.id || null);
                        setFacOtpInput('');
                        setIsFacOtpModalOpen(true);
                      }}
                      style={{ ...styles.actionItemBtn, padding: '10px 16px', fontSize: '0.7857rem', fontWeight: 900, backgroundColor: 'var(--critical)', color: '#fff' }}
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
                    style={{ background: 'none', border: 'none', fontSize: '1.4286rem', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}
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
                        disabled={(role as string) === 'clerk'}
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
                        <input maxLength={LIMITS.department}
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
                      <input maxLength={LIMITS.personName}
                        type="text"
                        placeholder="e.g. Mr. K. Sammaiah"
                        value={newFacName}
                        onChange={(e) => setNewFacName(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Contact Mobile</label>
                      <input maxLength={LIMITS.mobile}
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
                      <input min={0} max={999999999}
                        type="number"
                        placeholder="e.g. 45000"
                        value={newFacSal}
                        onChange={(e) => setNewFacSal(e.target.value)}
                        style={styles.textInputBox}
                      />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Email (Optional)</label>
                      <input maxLength={LIMITS.email}
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

          {/* FACULTY/STAFF CONFIRMATION OVERLAY */}
          {isFacOtpModalOpen && (
            <div style={{ ...styles.overlayOverlay, zIndex: 1100 }}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '400px', padding: '28px', borderRadius: '16px', border: '1px solid var(--card-border)' }} className="anim-slide-up glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                  <h3 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.0714rem', color: 'var(--dark-charcoal)' }}>Confirm Faculty Action</h3>
                  <p style={{ margin: 0, fontSize: '0.8571rem', color: 'var(--muted-gray)', lineHeight: 1.5, fontWeight: 600 }}>
                    {facActionType === 'add' ? `Are you sure you want to register faculty member "${newFacName}"?` :
                     facActionType === 'edit' ? `Are you sure you want to save credentials for faculty member "${editTeacher?.name}"?` :
                     facActionType === 'delete' ? `Are you sure you want to delete faculty record for "${editTeacher?.name || selectedTeacher?.name}"?` :
                     `Are you sure you want to record salary payment of Rs. ${(staffMonthAmount || editTeacher?.salary || selectedTeacher?.salary || 0).toLocaleString('en-IN')} for ${selectedStaffMonthForEdit} (${selectedAcademicYear})?`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button onClick={() => { setIsFacOtpModalOpen(false); setFacOtpInput(''); }} style={{ ...styles.modalCancelBtn, flex: 1 }} className="press-interactive">Cancel</button>
                  <button onClick={() => submitFacOtp()} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1.3, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }} className="press-interactive">Yes, Proceed</button>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
    );
  }

  //  SUBPAGE 3: PUBLISHING CENTER

  //  SUBPAGE 4: TIMETABLES & CALENDAR

  //  SUBPAGE 5: CLASS SCHEDULING

  //  SUBPAGE 6: EXAMINATION DESK

  //  SUBPAGE 7: ACADEMIC FEES
  if (activePage === 'academic_fees') {
    if (role !== 'admin1' && role !== 'clerk') { setActivePage('menu'); return null; }

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px', zIndex: 1 }}>
              {CAMPUS_LIST.map(b => {
                const isActive = selectedFeeBranch === b;
                return (
                  <div
                    key={b}
                    onClick={() => { setSelectedFeeBranch(b as any); setIsEditingFees(false); fetchFeeSettings(b, true); }}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '10px',
                      border: isActive ? '2px solid var(--ink)' : '1px solid var(--card-border)',
                      background: isActive ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.7143rem',
                      color: isActive ? 'var(--surface)' : 'var(--dark-charcoal)'
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
              <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: locked ? 'var(--critical)' : 'var(--royal-gold)', backgroundColor: locked ? 'rgba(239,68,68,0.06)' : 'rgba(212,175,55,0.06)', border: `1.5px solid ${locked ? 'var(--critical)' : 'var(--royal-gold)'}`, padding: '4px 8px', borderRadius: '8px' }}>
                {locked ? 'Locked  Rates Finalized' : 'Edit Mode Active'}
              </span>
            </div>

            {/* Horizontal fee bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {feeBarItems.map((fee, idx) => (
                <div key={fee.key} style={{ display: 'flex', alignItems: 'center', padding: '14px 4px', borderBottom: idx < feeBarItems.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', gap: '12px' }}>
                  <span style={{ fontSize: '1.4286rem', width: '32px', textAlign: 'center', flexShrink: 0 }}>{fee.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9286rem', color: 'var(--dark-charcoal)' }}>{fee.label}</span>
                  </div>
                  <div style={{ width: '140px', flexShrink: 0 }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '10px', fontSize: '0.9286rem', fontWeight: 900, color: locked ? 'var(--muted-gray)' : 'var(--royal-gold)' }}>Rs.</span>
                      <input max={999999999}
                        type="number"
                        min="0"
                        disabled={locked}
                        value={fee.value === undefined || isNaN(fee.value) ? '' : fee.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          fee.setter(val === '' ? '' as any : parseFloat(val));
                        }}
                        style={{ ...styles.textInputBox, width: '100%', paddingLeft: '24px', textAlign: 'right', fontWeight: 800, fontSize: '1rem', opacity: locked ? 0.65 : 1, borderColor: locked ? 'rgba(0,0,0,0.1)' : 'rgba(212,175,55,0.4)' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div style={{ borderTop: '2px solid var(--royal-gold)', marginTop: '10px', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 900, fontSize: '1.0714rem', color: 'var(--dark-charcoal)' }}>Total Annual Fee</span>
              <strong style={{ fontSize: '1.4286rem', fontWeight: 900, color: 'var(--royal-gold)' }}>Rs.{grandTotal.toLocaleString('en-IN')}</strong>
            </div>

            {/* Action buttons */}
            <div style={{ marginTop: '20px' }}>
              {locked ? (
                <button onClick={handleUnlockFees} style={{ ...styles.saveSubmitBtn, marginTop: 0, width: '100%', backgroundColor: 'var(--royal-gold)', color: '#FFFFFF' }} className="press-interactive">
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
          {/* Unlock Academic Fee Editor Confirmation Modal */}
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
                    Are you sure you want to unlock baseline fee editing for <strong>{selectedFeeBranch}</strong>?
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setIsUnlockFeeOtpOpen(false); setUnlockFeeOtpInput(''); }} style={styles.modalCancelBtn} className="press-interactive">Cancel</button>
                  <button onClick={() => handleConfirmUnlockFees(undefined)} style={{ ...styles.modalConfirmBtn, opacity: 1, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }} className="press-interactive">
                    Yes, Unlock Editor
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Academic Fee Save Confirmation Modal */}
          {isAcadFeeOtpOpen && (
            <div style={styles.modalOverlay} className="anim-fade-in">
              <GlassCard hoverable={false} style={styles.modalContentCard} className="anim-scale-in glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={styles.modalIconBadge}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </div>
                  <h3 style={styles.modalHeading}>Confirm Fee Structure Save</h3>
                  <p style={styles.modalSubText}>
                    Are you sure you want to finalize & propagate the new baseline fee rates for <strong>{selectedFeeBranch}</strong>?
                  </p>
                  <div style={styles.otpTipBanner}>
                    <strong>Note:</strong> Saving will update fee rates for non-customized student profiles in this campus.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setIsAcadFeeOtpOpen(false); setAcadFeeOtpInput(''); }} style={styles.modalCancelBtn} className="press-interactive">Cancel</button>
                  <button onClick={() => handleSaveAcademicFees(undefined)} style={{ ...styles.modalConfirmBtn, opacity: 1, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }} className="press-interactive">
                    Yes, Save Rates
                  </button>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
    );
  }

  // SUBPAGE: CLERK MANAGER (Rector only)
  //
  // Four campus boxes at the top, the clerks at the chosen campus
  // beneath — slot on the left, its switches on the right — and one Save at
  // the bottom behind the Rector's PIN.
  // SUBPAGE: CREDENTIALS (Rector only)
  //
  // Shows every account's live portal ID, password and PIN, and lets the
  // Rector change any of them. Locked behind the Rector's own PIN even though
  // they are already signed in: this one screen is worth more than the rest of
  // the portal combined, and a session left open on a desk should not expose
  // it.
  if (activePage === 'credentials') {
    if (role !== 'admin1') { setActivePage('menu'); return null; }

    const roleLabel = (r: string) =>
      r === 'admin1' ? 'Rector'
        : r === 'authenticator' ? 'Authenticator'
        : r === 'clerk' ? 'Clerk'
        : r === 'accountant' ? 'Accountant'
        : r;

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('ruby')}
        <header style={styles.header}>
          <button
            onClick={() => { lockCredentials(); setActivePage('menu'); }}
            style={styles.backArrowBtn}
            className="press-interactive"
          >
            Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Credentials</h1>
          <p style={styles.subtitle}>
            Portal IDs, passwords and PINs for every account. Changing one signs that account out.
          </p>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          {!credUnlocked ? (
            <GlassCard hoverable={false} style={{ padding: '28px', maxWidth: '460px', zIndex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--ink)', marginBottom: '6px' }}>
                Confirm it is you
              </h3>
              <p style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                This screen shows every live password and PIN in the system.
                Enter your own six-digit PIN to open it.
              </p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="Your 6-digit PIN"
                value={credPinInput}
                onChange={(e) => { setCredPinInput(digitsOnlyPin(e.target.value)); setCredPinError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') unlockCredentials(); }}
                style={{ ...styles.textInputBox, borderColor: credPinError ? 'var(--critical)' : undefined, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.1rem' }}
              />
              {credPinError && (
                <div style={{ color: 'var(--critical)', fontSize: '0.7857rem', fontWeight: 700, marginTop: '8px' }}>
                  {credPinError}
                </div>
              )}
              <button
                onClick={unlockCredentials}
                style={{ ...styles.saveSubmitBtn, marginTop: '14px', width: '100%', backgroundColor: 'var(--ink)', color: 'var(--surface)', fontWeight: 900 }}
                className="press-interactive"
              >
                Open credentials
              </button>
            </GlassCard>
          ) : (
            <>
              {credLegacyCount > 0 && (
                <GlassCard hoverable={false} style={{ padding: '14px 16px', borderLeft: '4px solid var(--warning)', zIndex: 1 }}>
                  <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--ink)' }}>
                    {credLegacyCount} account{credLegacyCount === 1 ? '' : 's'} cannot be read yet
                  </div>
                  <div style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                    Their credentials were stored in the old one-way form, which cannot be reversed.
                    They still work for signing in — set a new password or PIN below and it becomes readable from then on.
                  </div>
                </GlassCard>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
                {/*
                  The fixed portals only - the four campus accountants, the
                  Rector accounts and the authenticator. Clerks are excluded by
                  the server query, not hidden here, and are managed on the
                  Clerks screen where they can also be added and removed.

                  The authenticator is listed but NOT editable here. It sets its
                  own password and PIN from its own portal, under Settings. That
                  keeps the account which audits the Rector outside the Rector's
                  control, while still leaving someone able to rotate it.
                */}
                {credAccounts.map(account => {
                  const editing = credEditing === account.id;
                  const revealed = credRevealed[account.id];

                  return (
                    <GlassCard key={account.id} hoverable={false} style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div style={{ flex: '1 1 240px', minWidth: '210px' }}>
                          <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)', wordBreak: 'break-all' }}>
                            {account.username}
                          </div>
                          <div style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
                            {roleLabel(account.role)}
                            {account.slotIndex ? ` · slot ${account.slotIndex}` : ''}
                            {account.campus && account.campus !== 'All' ? ` · ${account.campus}` : ''}
                            {account.status === 'disabled' ? ' · inactive' : ''}
                          </div>
                        </div>

                        <div style={{ flex: '2 1 340px', minWidth: '270px' }}>
                          {!editing ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Password</div>
                                <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: account.passwordReadable ? 'var(--ink)' : 'var(--muted-gray)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                  {!account.passwordReadable ? 'Not readable' : revealed ? account.password : '••••••••'}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>PIN</div>
                                <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: account.pinReadable ? 'var(--ink)' : 'var(--muted-gray)', fontFamily: 'monospace' }}>
                                  {!account.pinReadable ? 'Not readable' : revealed ? account.pin : '••••••'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '10px' }}>
                              <div>
                                <label style={styles.formLabel}>Portal ID</label>
                                <input maxLength={LIMITS.username} type="text" value={credDraft.username}
                                  onChange={(e) => setCredDraft({ ...credDraft, username: e.target.value })}
                                  style={styles.textInputBox} />
                              </div>
                              <div>
                                <label style={styles.formLabel}>New password</label>
                                <input maxLength={LIMITS.password} type="text" placeholder="leave blank to keep"
                                  value={credDraft.password}
                                  onChange={(e) => setCredDraft({ ...credDraft, password: e.target.value })}
                                  style={styles.textInputBox} />
                              </div>
                              <div>
                                <label style={styles.formLabel}>New PIN</label>
                                <input maxLength={6} inputMode="numeric" type="text" placeholder="6 digits"
                                  value={credDraft.pin}
                                  onChange={(e) => setCredDraft({ ...credDraft, pin: digitsOnlyPin(e.target.value) })}
                                  style={styles.textInputBox} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {!editing ? (
                            <>
                              {(account.passwordReadable || account.pinReadable) && (
                                <button
                                  onClick={() => setCredRevealed(prev => ({ ...prev, [account.id]: !prev[account.id] }))}
                                  style={{ ...styles.actionItemBtn, padding: '8px 14px', backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', border: 'none' }}
                                  className="press-interactive"
                                >
                                  {revealed ? 'Hide' : 'Show'}
                                </button>
                              )}
                              {account.role !== 'authenticator' && (
                                <button
                                  onClick={() => {
                                    setCredEditing(account.id);
                                    setCredDraft({ username: account.username, password: '', pin: '' });
                                  }}
                                  style={{ ...styles.actionItemBtn, padding: '8px 14px', backgroundColor: 'var(--ink)', color: 'var(--surface)', border: 'none', fontWeight: 800 }}
                                  className="press-interactive"
                                >
                                  Change
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setCredEditing(null); setCredDraft({ username: '', password: '', pin: '' }); }}
                                style={{ ...styles.actionItemBtn, padding: '8px 14px', backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', border: 'none' }}
                                className="press-interactive"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={credSaving}
                                onClick={() => saveCredential(account)}
                                style={{ ...styles.actionItemBtn, padding: '8px 14px', backgroundColor: 'var(--good)', color: '#FFFFFF', border: 'none', fontWeight: 900, opacity: credSaving ? 0.6 : 1 }}
                                className="press-interactive"
                              >
                                {credSaving ? 'Saving…' : 'Save'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>


                      {account.role === 'authenticator' && (
                        <div style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)', marginTop: '8px', fontWeight: 700 }}>
                          The security authenticator changes its own password and PIN from its own portal, under Settings.
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // SUBPAGE: CLERKS (Rector only)
  //
  // Four campus cards, then the clerks that exist at the chosen campus and a
  // control to add another. There are no empty placeholder rows any more —
  // clerks are created as needed up to fifteen a campus, so a blank slot is
  // not a thing that exists.
  //
  // The PIN is asked once, on entry. Everything inside is a plain yes/no
  // confirmation.
  // --- My password & sign-ins (every role) ---
  if (activePage === 'security') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('sapphire')}
        <header style={styles.pageHeader}>
          <button onClick={() => setActivePage('menu')} style={styles.backButton} className="press-interactive">
            ← Back
          </button>
          <h2 style={styles.pageTitle}>My Password & Sign-ins</h2>
        </header>
        <AccountSecurityPanel
          onToast={triggerToast}
          onSignOut={(reason) => {
            // Routed through the app's own session ending, so the sign-in
            // screen explains why rather than the user simply finding
            // themselves logged out.
            (window as any).endSession?.(reason);
          }}
        />
      </div>
    );
  }

  // --- Recently deleted (Rector only) ---
  if (activePage === 'recently_deleted') {
    if (role !== 'admin1') { setActivePage('menu'); return null; }
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('gold')}
        <header style={styles.pageHeader}>
          <button onClick={() => setActivePage('menu')} style={styles.backButton} className="press-interactive">
            ← Back
          </button>
          <h2 style={styles.pageTitle}>Recently Deleted</h2>
        </header>
        <RecentlyDeletedPanel
          onToast={triggerToast}
          onRestored={() => { fetchStudents('', true); fetchExpenditures(); }}
        />
      </div>
    );
  }

  // --- Outstanding fees ---
  if (activePage === 'outstanding_fees') {
    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('ruby')}
        <header style={styles.pageHeader}>
          <button onClick={() => setActivePage('menu')} style={styles.backButton} className="press-interactive">
            ← Back
          </button>
          <h2 style={styles.pageTitle}>Outstanding Fees</h2>
        </header>
        <OutstandingFeesPanel
          campuses={CAMPUS_LIST}
          fixedCampus={role === 'clerk' ? loggedInCampus : 'All'}
          onToast={triggerToast}
        />
      </div>
    );
  }

  if (activePage === 'clerks') {
    if (role !== 'admin1') { setActivePage('menu'); return null; }

    const openClerk = clerkList.find(c => c.id === clerkOpenId) || null;

    /** One on/off control. Deliberately a plain labelled button. */
    const AccessToggle: React.FC<{ on: boolean; onClick: () => void; label: string; disabled?: boolean }> =
      ({ on, onClick, label, disabled }) => (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={on}
          style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '0.7857rem', fontWeight: 900,
            border: `1.5px solid ${on ? 'var(--good)' : 'var(--line-strong)'}`,
            backgroundColor: on ? 'var(--good)' : 'var(--surface)',
            color: on ? '#FFFFFF' : 'var(--ink-secondary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            minWidth: '92px'
          }}
          className="press-interactive"
        >
          {on ? 'Allowed' : 'Blocked'}{label ? '' : ''}
        </button>
      );

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('teal')}
        <header style={styles.header}>
          <button
            onClick={() => { lockClerks(); setActivePage('menu'); }}
            style={styles.backArrowBtn}
            className="press-interactive"
          >
            Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Clerks</h1>
          <p style={styles.subtitle}>
            Create clerk accounts and choose what each one can do. Up to {clerkMax} per campus.
          </p>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          {!clerkUnlocked ? (
            <GlassCard hoverable={false} style={{ padding: '28px', maxWidth: '460px', zIndex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--ink)', marginBottom: '6px' }}>
                Confirm it is you
              </h3>
              <p style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                This screen creates accounts and shows their passwords. Enter your own
                six-digit PIN once — nothing inside will ask again.
              </p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="Your 6-digit PIN"
                value={clerkPinInput}
                onChange={(e) => { setClerkPinInput(digitsOnlyPin(e.target.value)); setClerkPinError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') unlockClerks(); }}
                style={{ ...styles.textInputBox, borderColor: clerkPinError ? 'var(--critical)' : undefined, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.1rem' }}
              />
              {clerkPinError && (
                <div style={{ color: 'var(--critical)', fontSize: '0.7857rem', fontWeight: 700, marginTop: '8px' }}>
                  {clerkPinError}
                </div>
              )}
              <button
                onClick={unlockClerks}
                style={{ ...styles.saveSubmitBtn, marginTop: '14px', width: '100%', backgroundColor: 'var(--ink)', color: 'var(--surface)', fontWeight: 900 }}
                className="press-interactive"
              >
                Open clerk manager
              </button>
            </GlassCard>
          ) : (
            <>
              {/* Four campus cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px', zIndex: 1 }}>
                {CAMPUS_LIST.map(campus => {
                  const selected = campus === clerkCampus;
                  return (
                    <div
                      key={campus}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchClerkCampus(campus); } }}
                      onClick={() => switchClerkCampus(campus)}
                      className="press-interactive"
                      style={{
                        padding: '14px', borderRadius: '12px', cursor: 'pointer',
                        border: `2px solid ${selected ? 'var(--good)' : 'var(--line)'}`,
                        backgroundColor: selected ? 'var(--good-wash)' : 'var(--surface)'
                      }}
                    >
                      <div style={{ fontSize: '0.6429rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: selected ? 'var(--good)' : 'var(--muted-gray)' }}>
                        {selected ? 'Selected campus' : 'Campus'}
                      </div>
                      <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)', marginTop: '2px' }}>
                        {campus}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Count + add */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', zIndex: 1 }}>
                <span style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--ink-secondary)' }}>
                  {clerkList.length} of {clerkMax} clerks at {clerkCampus}
                  {clerkRemaining > 0 ? ` · ${clerkRemaining} place${clerkRemaining === 1 ? '' : 's'} left` : ' · full'}
                </span>
                <button
                  disabled={clerkRemaining <= 0 || clerkAddStep !== 0}
                  onClick={() => { setClerkAddDraft(emptyClerkDraft); setClerkAddError(''); setClerkAddStep(1); setClerkOpenId(null); }}
                  style={{
                    ...styles.actionItemBtn, padding: '9px 18px', fontWeight: 900, border: 'none',
                    backgroundColor: clerkRemaining > 0 ? 'var(--good)' : 'var(--line)',
                    color: clerkRemaining > 0 ? '#FFFFFF' : 'var(--muted-gray)',
                    cursor: clerkRemaining > 0 ? 'pointer' : 'not-allowed'
                  }}
                  className="press-interactive"
                >
                  + Add clerk
                </button>
              </div>

              {/* --- ADD CLERK: step 1, the details --- */}
              {clerkAddStep === 1 && (
                <GlassCard hoverable={false} style={{ padding: '18px', zIndex: 1, borderLeft: '4px solid var(--good)' }}>
                  <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)', marginBottom: '2px' }}>
                    New clerk at {clerkCampus} — step 1 of 2
                  </div>
                  <div style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', marginBottom: '14px' }}>
                    Their details and how they sign in.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '12px' }}>
                    <div>
                      <label style={styles.formLabel}>Clerk name *</label>
                      <input maxLength={LIMITS.personName} type="text" placeholder="e.g. Ramesh Kumar"
                        value={clerkAddDraft.name}
                        onChange={(e) => { setClerkAddDraft({ ...clerkAddDraft, name: e.target.value }); setClerkAddError(''); }}
                        style={styles.textInputBox} />
                    </div>
                    <div>
                      <label style={styles.formLabel}>Portal ID *</label>
                      <input maxLength={LIMITS.username} type="text" placeholder="what they type to sign in"
                        value={clerkAddDraft.username}
                        onChange={(e) => { setClerkAddDraft({ ...clerkAddDraft, username: e.target.value.toLowerCase() }); setClerkAddError(''); }}
                        style={styles.textInputBox} />
                    </div>
                    <div>
                      <label style={styles.formLabel}>Password * (8 or more)</label>
                      <input maxLength={LIMITS.password} type="text" placeholder="they can be told this"
                        value={clerkAddDraft.password}
                        onChange={(e) => { setClerkAddDraft({ ...clerkAddDraft, password: e.target.value }); setClerkAddError(''); }}
                        style={styles.textInputBox} />
                    </div>
                    <div>
                      <label style={styles.formLabel}>6-digit PIN *</label>
                      <input maxLength={6} inputMode="numeric" type="text" placeholder="6 digits"
                        value={clerkAddDraft.pin}
                        onChange={(e) => { setClerkAddDraft({ ...clerkAddDraft, pin: digitsOnlyPin(e.target.value) }); setClerkAddError(''); }}
                        style={styles.textInputBox} />
                    </div>
                    <div>
                      <label style={styles.formLabel}>Mobile number</label>
                      <input maxLength={LIMITS.mobile} inputMode="numeric" type="text" placeholder="10 digits"
                        value={clerkAddDraft.mobile}
                        onChange={(e) => { setClerkAddDraft({ ...clerkAddDraft, mobile: digitsOnly(e.target.value) }); setClerkAddError(''); }}
                        style={styles.textInputBox} />
                    </div>
                    <div>
                      <label style={styles.formLabel}>Email</label>
                      <input maxLength={LIMITS.email} type="text" placeholder="name@example.com"
                        value={clerkAddDraft.email}
                        onChange={(e) => { setClerkAddDraft({ ...clerkAddDraft, email: e.target.value }); setClerkAddError(''); }}
                        style={styles.textInputBox} />
                    </div>
                    <div>
                      <label style={styles.formLabel}>Campus</label>
                      <input type="text" value={clerkCampus} disabled
                        style={{ ...styles.textInputBox, backgroundColor: 'var(--surface-sunken)', color: 'var(--ink-secondary)', fontWeight: 800, cursor: 'not-allowed' }} />
                    </div>
                  </div>

                  {clerkAddError && (
                    <div style={{ color: 'var(--critical)', fontSize: '0.7857rem', fontWeight: 700, marginTop: '10px' }}>
                      {clerkAddError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => { setClerkAddStep(0); setClerkAddDraft(emptyClerkDraft); setClerkAddError(''); }}
                      style={{ ...styles.actionItemBtn, padding: '9px 18px', backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', border: 'none' }}
                      className="press-interactive"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const problem = clerkDetailsProblem();
                        if (problem) { setClerkAddError(problem); return; }
                        setClerkAddError('');
                        setClerkAddStep(2);
                      }}
                      style={{ ...styles.actionItemBtn, padding: '9px 22px', backgroundColor: 'var(--ink)', color: 'var(--surface)', border: 'none', fontWeight: 900 }}
                      className="press-interactive"
                    >
                      Next: what they can do →
                    </button>
                  </div>
                </GlassCard>
              )}

              {/* --- ADD CLERK: step 2, the access --- */}
              {clerkAddStep === 2 && (
                <GlassCard hoverable={false} style={{ padding: '18px', zIndex: 1, borderLeft: '4px solid var(--good)' }}>
                  <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)', marginBottom: '2px' }}>
                    {clerkAddDraft.name || 'New clerk'} — step 2 of 2
                  </div>
                  <div style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', marginBottom: '14px' }}>
                    What this clerk is allowed to do. Everything starts blocked.
                  </div>

                  {CLERK_PERMISSION_LABELS.map(perm => (
                    <div key={perm.name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--line)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--ink)' }}>{perm.label}</div>
                        <div style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)' }}>{perm.help}</div>
                      </div>
                      <AccessToggle
                        on={clerkAddDraft.permissions[perm.name]}
                        label=""
                        onClick={() => setClerkAddDraft({
                          ...clerkAddDraft,
                          permissions: { ...clerkAddDraft.permissions, [perm.name]: !clerkAddDraft.permissions[perm.name] }
                        })}
                      />
                    </div>
                  ))}

                  {clerkAddError && (
                    <div style={{ color: 'var(--critical)', fontSize: '0.7857rem', fontWeight: 700, marginTop: '10px' }}>
                      {clerkAddError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => { setClerkAddStep(1); setClerkAddError(''); }}
                      style={{ ...styles.actionItemBtn, padding: '9px 18px', backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', border: 'none' }}
                      className="press-interactive"
                    >
                      ← Back
                    </button>
                    <button
                      disabled={clerkBusy}
                      onClick={createClerk}
                      style={{ ...styles.actionItemBtn, padding: '9px 22px', backgroundColor: 'var(--good)', color: '#FFFFFF', border: 'none', fontWeight: 900, opacity: clerkBusy ? 0.6 : 1 }}
                      className="press-interactive"
                    >
                      {clerkBusy ? 'Creating…' : 'Create clerk'}
                    </button>
                  </div>
                </GlassCard>
              )}

              {/* --- THE CLERKS --- */}
              {clerkList.length === 0 && clerkAddStep === 0 && (
                <GlassCard hoverable={false} style={{ padding: '28px', textAlign: 'center', zIndex: 1 }}>
                  <div style={{ fontSize: '0.9286rem', fontWeight: 800, color: 'var(--ink-secondary)' }}>
                    No clerks at {clerkCampus} yet
                  </div>
                  <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '6px' }}>
                    Use “Add clerk” above to create one. They can sign in as soon as you do.
                  </div>
                </GlassCard>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '12px', zIndex: 1 }}>
                {clerkList.map(clerk => {
                  const active = clerk.status === 'active';
                  const granted = CLERK_PERMISSION_LABELS.filter(p => clerk.permissions[p.name]);
                  return (
                    <div
                      key={clerk.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setClerkOpenId(clerkOpenId === clerk.id ? null : clerk.id); } }}
                      onClick={() => setClerkOpenId(clerkOpenId === clerk.id ? null : clerk.id)}
                      className="press-interactive"
                      style={{
                        padding: '14px', borderRadius: '12px', cursor: 'pointer',
                        border: `2px solid ${clerkOpenId === clerk.id ? 'var(--good)' : 'var(--line)'}`,
                        backgroundColor: 'var(--surface)',
                        opacity: active ? 1 : 0.7
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)', wordBreak: 'break-word' }}>
                          {clerk.name}
                        </div>
                        <span style={{
                          fontSize: '0.6429rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px',
                          backgroundColor: active ? 'var(--good-wash)' : 'var(--surface-sunken)',
                          color: active ? 'var(--good)' : 'var(--muted-gray)',
                          border: `1px solid ${active ? 'var(--good)' : 'var(--line-strong)'}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {active ? 'ACTIVE' : 'BLOCKED'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.6429rem', fontWeight: 700, color: 'var(--muted-gray)', marginTop: '2px', wordBreak: 'break-all' }}>
                        {clerk.username}
                      </div>
                      <div style={{ fontSize: '0.7143rem', color: 'var(--ink-secondary)', marginTop: '8px' }}>
                        {granted.length ? `${granted.length} of ${CLERK_PERMISSION_LABELS.length} powers` : 'No powers granted'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/*
                  ONE CLERK, OPENED — a centred overlay, not a panel appended
                  to the page.

                  It used to render at the BOTTOM: clicking a clerk near the
                  top of a long campus put their details below the fold, so to
                  the person clicking, nothing appeared to happen. An overlay
                  puts the record where the eye already is and dims what it is
                  not about.

                  Clicking the backdrop closes it; the sheet stops the click,
                  so editing a field cannot dismiss the thing being edited.
              */}
              {openClerk && (
                <div
                  style={styles.overlayOverlay}
                  onClick={() => setClerkOpenId(null)}
                  className="anim-fade-in"
                >
                  <div
                    style={{ ...styles.overlaySheet, maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', borderTop: '4px solid var(--accent)' }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Clerk ${openClerk.name}`}
                  >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--ink)' }}>{openClerk.name}</div>
                      <div style={{ fontSize: '0.7143rem', color: 'var(--muted-gray)', fontWeight: 700 }}>
                        {openClerk.username} · {openClerk.campus}
                      </div>
                    </div>
                    <button
                      onClick={() => setClerkOpenId(null)}
                      style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted-gray)' }}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>

                  {/*
                    Clear a lockout WITHOUT changing the credential.

                    Five wrong guesses locks the account for fifteen minutes,
                    which is correct and stays. What was missing was any way
                    back before the clock ran out: the only remedy was to
                    change the clerk's password, which fixes the lockout by
                    handing them a credential they do not know yet.
                  */}
                  <button
                    onClick={async () => {
                      const pin = clerkPinInput.trim();
                      if (!/^\d{6}$/.test(pin)) {
                        triggerToast('Enter your 6-digit PIN above first, then clear the lockout.');
                        return;
                      }
                      if (!window.confirm(
                        `Clear the sign-in lockout for ${openClerk.name}?

`
                        + 'Their password and PIN stay exactly as they are — this only resets the '
                        + 'count of failed attempts so they can try again now.'
                      )) return;
                      try {
                        const res = await admin1Service.unlockAccount(openClerk.id, pin);
                        triggerToast(res.message || 'Lockout cleared.');
                      } catch (err: any) {
                        triggerToast(err?.message || 'Could not clear the lockout.');
                      }
                    }}
                    style={{
                      marginTop: '14px', padding: '9px 14px', borderRadius: '9px',
                      border: '1.5px solid var(--royal-gold)', background: 'transparent',
                      color: 'var(--royal-gold)', fontWeight: 850, fontSize: '0.7857rem',
                      cursor: 'pointer', alignSelf: 'flex-start'
                    }}
                    className="press-interactive"
                  >
                    Clear sign-in lockout
                  </button>

                  {/* Sign-in details, editable in place */}
                  <div style={{ marginTop: '14px', fontSize: '0.7143rem', fontWeight: 900, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Sign-in details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px', marginTop: '8px' }}>
                    {([
                      ['name', 'Name', openClerk.name, LIMITS.personName],
                      ['username', 'Portal ID', openClerk.username, LIMITS.username],
                      ['password', 'Password', openClerk.password ?? '', LIMITS.password],
                      ['pin', 'PIN', openClerk.pin ?? '', 6],
                      ['mobile', 'Mobile', openClerk.mobile, LIMITS.mobile],
                      ['email', 'Email', openClerk.email, LIMITS.email]
                    ] as Array<[string, string, string, number]>).map(([field, label, value, max]) => (
                      <div key={field}>
                        <label style={styles.formLabel}>{label}</label>
                        <input
                          maxLength={max}
                          type="text"
                          defaultValue={value}
                          placeholder={value ? '' : 'not readable'}
                          onBlur={(e) => {
                            const next = field === 'pin' ? digitsOnlyPin(e.target.value)
                              : field === 'mobile' ? digitsOnly(e.target.value)
                              : e.target.value.trim();
                            if (next === value || (!next && !value)) return;
                            changeClerk(openClerk, { [field]: next },
                              `Change ${label.toLowerCase()} for ${openClerk.name}?` +
                              (field === 'password' || field === 'pin' || field === 'username'
                                ? '\n\nThey will be signed out and must use the new details.' : ''));
                          }}
                          style={styles.textInputBox}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)', marginTop: '6px' }}>
                    Changes save when you click away from a field.
                  </div>

                  {/* Access */}
                  <div style={{ marginTop: '18px', fontSize: '0.7143rem', fontWeight: 900, color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    What they can do
                  </div>
                  {CLERK_PERMISSION_LABELS.map(perm => (
                    <div key={perm.name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--line)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--ink)' }}>{perm.label}</div>
                        <div style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)' }}>{perm.help}</div>
                      </div>
                      <AccessToggle
                        on={openClerk.permissions[perm.name]}
                        label=""
                        disabled={clerkBusy}
                        onClick={() => changeClerk(openClerk, {
                          permissions: { ...openClerk.permissions, [perm.name]: !openClerk.permissions[perm.name] }
                        })}
                      />
                    </div>
                  ))}

                  {/* Whole-account actions */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                    <button
                      disabled={clerkBusy}
                      onClick={() => changeClerk(
                        openClerk,
                        { active: openClerk.status !== 'active' },
                        openClerk.status === 'active'
                          ? `Terminate access for ${openClerk.name}?\n\nThey are signed out immediately. Nothing they recorded is deleted, and you can restore access later.`
                          : `Restore access for ${openClerk.name}?`
                      )}
                      style={{
                        ...styles.actionItemBtn, padding: '9px 18px', border: 'none', fontWeight: 900,
                        backgroundColor: openClerk.status === 'active' ? 'var(--warning)' : 'var(--good)',
                        color: '#FFFFFF'
                      }}
                      className="press-interactive"
                    >
                      {openClerk.status === 'active' ? 'Terminate access' : 'Give access'}
                    </button>
                    <button
                      disabled={clerkBusy}
                      onClick={() => removeClerk(openClerk)}
                      style={{ ...styles.actionItemBtn, padding: '9px 18px', border: '1.5px solid var(--critical)', color: 'var(--critical)', background: 'transparent', fontWeight: 900 }}
                      className="press-interactive"
                    >
                      Remove clerk
                    </button>
                  </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
  }
  // SUBPAGE: ACTIVITY LOG (Rector only)
  //
  // Answers "which account made this transaction". Every row is one entry
  // from the server-side audit trail; nothing here is derived or inferred, so
  // what is shown is exactly what was recorded at the time of the action.
  if (activePage === 'logs') {
    // Colour by what the entry DID, not by which module it came from — a
    // refusal and a deletion should read differently at a glance even though
    // both concern the same record.
    const toneFor = (entry: AuditLogEntry) => {
      if (entry.outcome === 'denied') return { bg: 'var(--critical-wash)', text: 'var(--critical)', border: 'var(--critical)' };
      if (entry.outcome === 'failed') return { bg: 'var(--warning-wash)', text: 'var(--warning)', border: 'var(--warning)' };
      if (entry.action.endsWith('.delete')) return { bg: 'var(--critical-wash)', text: 'var(--critical)', border: 'var(--critical)' };
      if (entry.action.startsWith('payment.') || entry.action.startsWith('salary.') || entry.action.startsWith('worker_payment.')) {
        return { bg: 'var(--good-wash)', text: 'var(--good)', border: 'var(--good)' };
      }
      if (entry.action.startsWith('account.') || entry.action.startsWith('credential.')) {
        return { bg: 'var(--accent-wash)', text: 'var(--accent)', border: 'var(--accent)' };
      }
      return { bg: 'var(--surface-sunken)', text: 'var(--ink-secondary)', border: 'var(--line)' };
    };

    const prettyAction = (action: string) =>
      action.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const applyFilters = () => { setAuditPage(1); fetchAuditLogs(1); };

    return (
      <div style={styles.container} className="anim-slide-up">
        {renderBackgroundDesign('navy')}
        <header style={styles.header}>
          <button onClick={() => setActivePage('menu')} style={styles.backArrowBtn} className="press-interactive">
            Back to Cockpit
          </button>
          <h1 style={{ ...styles.title, marginTop: '8px' }}>Activity Log</h1>
          <p style={styles.subtitle}>
            Every transaction and record change across all 4 campuses, and the account that made it.
          </p>
        </header>

        <main style={{ ...styles.content, gap: '16px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', zIndex: 1 }}>
            <input maxLength={100}
              type="text"
              placeholder="Search student, receipt, staff name..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              style={{ ...styles.textInputBox, flex: 2, minWidth: '220px' }}
            />

            <select value={auditFilterCampus} onChange={(e) => setAuditFilterCampus(e.target.value)}
              style={{ ...styles.selectInput, flex: 1, minWidth: '170px' }}>
              <option value="All">All Campuses</option>
              {auditOptions.campuses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={auditFilterActor} onChange={(e) => setAuditFilterActor(e.target.value)}
              style={{ ...styles.selectInput, flex: 1, minWidth: '170px' }}>
              <option value="All">All Accounts</option>
              {auditOptions.actors.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <select value={auditFilterAction} onChange={(e) => setAuditFilterAction(e.target.value)}
              style={{ ...styles.selectInput, flex: 1, minWidth: '170px' }}>
              <option value="All">All Activity</option>
              {auditOptions.actions.map(a => <option key={a} value={a}>{prettyAction(a)}</option>)}
            </select>

            <input type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)}
              style={{ ...styles.textInputBox, flex: 1, minWidth: '140px' }} title="From date" />
            <input type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)}
              style={{ ...styles.textInputBox, flex: 1, minWidth: '140px' }} title="To date" />

            <button onClick={applyFilters}
              style={{ ...styles.actionItemBtn, padding: '10px 18px', backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }}
              className="press-interactive">
              Apply
            </button>
            <button
              onClick={() => {
                setAuditFilterCampus('All'); setAuditFilterActor('All'); setAuditFilterAction('All');
                setAuditSearch(''); setAuditFrom(''); setAuditTo('');
                setAuditPage(1);
                // Read the cleared values directly rather than from state,
                // which has not re-rendered yet at this point.
                admin1Service.getLogs({ page: 1, limit: 50 }).then(r => {
                  setAuditLogs(r.entries || []); setAuditPage(r.page || 1);
                  setAuditTotalPages(r.totalPages || 1); setAuditTotal(r.total || 0);
                  setAuditTotalAmount(r.totalAmount || 0);
                }).catch(() => triggerToast('Could not reload the activity log.', 'error'));
              }}
              style={{ ...styles.actionItemBtn, padding: '10px 18px', backgroundColor: 'var(--line)', color: 'var(--ink-secondary)', border: 'none' }}
              className="press-interactive">
              Clear
            </button>
          </div>

          {/* Summary of the FILTERED set, so a narrowed view totals itself. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px', zIndex: 1 }}>
            <GlassCard style={{ padding: '14px' }}>
              <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Entries</div>
              <div style={{ fontSize: '1.2857rem', fontWeight: 900, color: 'var(--ink)' }}>{auditTotal.toLocaleString('en-IN')}</div>
            </GlassCard>
            <GlassCard style={{ padding: '14px' }}>
              <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Value Moved</div>
              <div style={{ fontSize: '1.2857rem', fontWeight: 900, color: 'var(--good)' }}>Rs. {auditTotalAmount.toLocaleString('en-IN')}</div>
            </GlassCard>
            <GlassCard style={{ padding: '14px' }}>
              <div style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Page</div>
              <div style={{ fontSize: '1.2857rem', fontWeight: 900, color: 'var(--ink)' }}>{auditPage} of {auditTotalPages}</div>
            </GlassCard>
          </div>

          {/* Trail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
            {auditLogs.length === 0 && (
              <GlassCard style={{ padding: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9286rem', fontWeight: 800, color: 'var(--ink-secondary)' }}>
                  No activity recorded for these filters.
                </div>
                <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '6px' }}>
                  The log records actions from the moment it was switched on — it cannot show anything that happened before that.
                </div>
              </GlassCard>
            )}

            {auditLogs.map(entry => {
              const tone = toneFor(entry);
              const isOpen = auditExpandedId === entry._id;
              const when = new Date(entry.createdAt);
              return (
                <GlassCard
                  key={entry._id}
                  style={{ padding: '12px 14px', borderLeft: `4px solid ${tone.border}`, cursor: 'pointer' }}
                  onClick={() => setAuditExpandedId(isOpen ? null : entry._id)}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '20px', fontSize: '0.6429rem', fontWeight: 900,
                          backgroundColor: tone.bg, color: tone.text, border: `1px solid ${tone.border}`,
                          textTransform: 'uppercase', letterSpacing: '0.04em'
                        }}>
                          {prettyAction(entry.action)}
                        </span>
                        {entry.outcome !== 'success' && (
                          <span style={{ fontSize: '0.6429rem', fontWeight: 900, color: 'var(--critical)', textTransform: 'uppercase' }}>
                            {entry.outcome}
                          </span>
                        )}
                        {entry.campus && (
                          <span style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--muted-gray)' }}>{entry.campus}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.45 }}>
                        {entry.summary}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                      <div style={{ fontSize: '0.7857rem', fontWeight: 900, color: 'var(--ink)' }}>
                        {entry.actorUsername}
                      </div>
                      <div style={{ fontSize: '0.6429rem', fontWeight: 700, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>
                        {entry.actorRole}
                      </div>
                      <div style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                        {when.toLocaleDateString('en-IN')} · {when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{
                      marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--line)',
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '8px'
                    }}>
                      {entry.entityLabel && (
                        <div>
                          <div style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Record</div>
                          <div style={{ fontSize: '0.7857rem', fontWeight: 700, color: 'var(--ink)' }}>{entry.entityLabel}</div>
                        </div>
                      )}
                      {entry.entityId && (
                        <div>
                          <div style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Reference</div>
                          <div style={{ fontSize: '0.7857rem', fontWeight: 700, color: 'var(--ink)' }}>{entry.entityId}</div>
                        </div>
                      )}
                      {entry.amount !== null && entry.amount !== undefined && (
                        <div>
                          <div style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>Amount</div>
                          <div style={{ fontSize: '0.7857rem', fontWeight: 900, color: 'var(--good)' }}>Rs. {Number(entry.amount).toLocaleString('en-IN')}</div>
                        </div>
                      )}
                      {Object.entries(entry.details || {}).map(([key, value]) => (
                        <div key={key}>
                          <div style={{ fontSize: '0.6429rem', fontWeight: 800, color: 'var(--muted-gray)', textTransform: 'uppercase' }}>
                            {key.replace(/([A-Z])/g, ' $1')}
                          </div>
                          <div style={{ fontSize: '0.7857rem', fontWeight: 700, color: 'var(--ink)', wordBreak: 'break-word' }}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>

          {/* Pagination */}
          {auditTotalPages > 1 && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', zIndex: 1, paddingBottom: '10px' }}>
              <button
                disabled={auditPage <= 1}
                onClick={() => fetchAuditLogs(auditPage - 1)}
                style={{
                  ...styles.actionItemBtn, padding: '8px 16px',
                  backgroundColor: auditPage <= 1 ? 'var(--line)' : 'var(--ink)',
                  color: auditPage <= 1 ? 'var(--muted-gray)' : 'var(--surface)',
                  border: 'none', cursor: auditPage <= 1 ? 'not-allowed' : 'pointer'
                }}
                className="press-interactive">
                ← Newer
              </button>
              <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--ink-secondary)' }}>
                Page {auditPage} of {auditTotalPages}
              </span>
              <button
                disabled={auditPage >= auditTotalPages}
                onClick={() => fetchAuditLogs(auditPage + 1)}
                style={{
                  ...styles.actionItemBtn, padding: '8px 16px',
                  backgroundColor: auditPage >= auditTotalPages ? 'var(--line)' : 'var(--ink)',
                  color: auditPage >= auditTotalPages ? 'var(--muted-gray)' : 'var(--surface)',
                  border: 'none', cursor: auditPage >= auditTotalPages ? 'not-allowed' : 'pointer'
                }}
                className="press-interactive">
                Older →
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // SUBPAGE: ADMISSION ENQUIRIES DESK
  if (activePage === 'enquiries') {
    // Admission enquiries are now a granted clerk power, not the Rector's
    // alone. The server scopes a clerk to their own campus on both the list
    // and the update, so this guard is about whether the Rector granted it -
    // not about what the clerk would be able to see if they got in.
    if (role !== 'admin1' && !clerkCan('manageEnquiries')) { setActivePage('menu'); return null; }

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
            <input maxLength={100}
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
              style={{ ...styles.actionItemBtn, padding: '10px 18px', backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }}
              className="press-interactive"
            >
              Refresh Enquiries
            </button>
          </div>

          {/* Enquiries Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '14px', zIndex: 1 }}>
            {filteredEnquiries.map(enq => {
              const statusColorMap: Record<string, { bg: string; text: string; border: string }> = {
                Pending: { bg: 'var(--warning-wash)', text: 'var(--warning)', border: 'var(--warning)' },
                New: { bg: 'var(--warning-wash)', text: 'var(--warning)', border: 'var(--warning)' },
                Contacted: { bg: 'var(--accent-wash)', text: 'var(--accent)', border: 'var(--accent)' },
                Enrolled: { bg: 'var(--good-wash)', text: 'var(--good)', border: 'var(--good)' },
                Closed: { bg: 'var(--surface-sunken)', text: 'var(--ink-secondary)', border: 'var(--ink-muted)' },
                Archived: { bg: 'var(--surface-sunken)', text: 'var(--ink-secondary)', border: 'var(--ink-muted)' }
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
                      <span style={{ fontSize: '0.7143rem', fontWeight: 900, color: 'var(--royal-gold)', letterSpacing: '0.05em' }}>
                        REF: {enq.referenceCode}
                      </span>
                      <h3 style={{ fontSize: '1.1429rem', fontWeight: 900, color: 'var(--dark-charcoal)', margin: '2px 0 0' }}>
                        {enq.studentName}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.7857rem', color: 'var(--muted-gray)', fontWeight: 700 }}>
                        Parent: {enq.parentName || 'N/A'}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '0.7143rem',
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

                  <div style={{ padding: '10px', backgroundColor: 'var(--surface-sunken)', borderRadius: '10px', fontSize: '0.7857rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Preferred Campus:</span>
                      <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{enq.preferredCampus}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Stream Choice:</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{enq.stream}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Current Grade:</span>
                      <span style={{ fontWeight: 800 }}>{enq.currentGrade}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Mobile Number:</span>
                      <a href={`tel:${enq.mobile}`} style={{ fontWeight: 900, color: 'var(--good)', textDecoration: 'none' }}>{enq.mobile}</a>
                    </div>
                    {enq.email && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted-gray)', fontWeight: 700 }}>Email Address:</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink-secondary)' }}>{enq.email}</span>
                      </div>
                    )}
                  </div>

                  {enq.notes && (
                    <div style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', fontStyle: 'italic', backgroundColor: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: '8px', border: '1px solid #FEF08A' }}>
                      "{enq.notes}"
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.6786rem', color: 'var(--muted-gray)', fontWeight: 700 }}>
                      Received: {new Date(enq.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--muted-gray)' }}>Status:</span>
                      <select
                        value={enq.status}
                        onChange={(e) => handleUpdateStatus(enq._id || enq.id || enq.referenceCode, e.target.value)}
                        style={{ ...styles.selectInput, padding: '3px 8px', fontSize: '0.7143rem', width: 'auto' }}
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
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--muted-gray)', fontSize: '0.9286rem' }}>
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



  //  SUBPAGE 12: STUDENT FEE EDITOR (Admin 2)
  if (activePage === 'fee_editor') {
    // Waivers are the Rector's alone. A clerk reaching this page by URL or by
    // a stale hash gets sent back rather than shown a screen whose every
    // action the server would refuse.
    if (role !== 'admin1') { setActivePage('menu'); return null; }

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
        // The complete record, because "Download Complete Statement" on this
        // screen prints the receipt history, and list rows no longer carry it.
        hydrateStudent(student).then(full => setSelectedFeeStudent(full));
        const targetBranch = student.branch || loggedInCampus;
        const studentKey = student._id || student.studentId || student.admissionNumber;
        const breakdown = await admin2Service.getFeeBreakdown(studentKey, targetBranch);
        setFeeBreakdownData(breakdown);
        setEditTuitionWaiver(String(breakdown.tuitionWaiver || 0));
        setEditHostelWaiver(String(breakdown.hostelWaiver || 0));
        setEditMiscWaiver(String(breakdown.miscWaiver || 0));
        setEditSlotWaivers({
          tuitionFee: breakdown.tuitionWaiver || 0,
          hostelFee: breakdown.hostelWaiver || 0,
          transportFee: breakdown.transportWaiver || 0,
          miscFee: breakdown.miscWaiver || 0
        });
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

    const handleApplyWaivers = async (keyToUse?: string) => {
      if (!selectedFeeStudent) return;
      try {
        if (keyToUse) setGlobalSecurityKey(keyToUse);
        const targetBranch = selectedFeeStudent.branch || loggedInCampus;
        const studentKey = selectedFeeStudent._id || selectedFeeStudent.studentId || selectedFeeStudent.admissionNumber;

        const tuitionWaiver = Number(editSlotWaivers['tuitionFee'] ?? editSlotWaivers['tuition'] ?? editTuitionWaiver ?? 0);
        const hostelWaiver = Number(editSlotWaivers['hostelFee'] ?? editSlotWaivers['hostel'] ?? editHostelWaiver ?? 0);
        const transportWaiver = Number(editSlotWaivers['transportFee'] ?? editSlotWaivers['transport'] ?? 0);
        const miscWaiver = Number(editSlotWaivers['miscFee'] ?? editSlotWaivers['miscellaneousFee'] ?? editSlotWaivers['misc'] ?? editMiscWaiver ?? 0);

        let updatedCustomSlots: any[] = [];

        if (selectedFeeStudent.customFeeSlots && Array.isArray(selectedFeeStudent.customFeeSlots) && selectedFeeStudent.customFeeSlots.length > 0) {
          updatedCustomSlots = selectedFeeStudent.customFeeSlots.map((slot: any) => {
            const slotKey = slot.id || slot.name;
            const waiver = Number(editSlotWaivers[slotKey]) || 0;
            const newAmt = Math.max(0, Number(slot.amount) - waiver);
            return { ...slot, amount: newAmt };
          });
        }

        const totalWaivers = tuitionWaiver + hostelWaiver + transportWaiver + miscWaiver;

        const res = await admin2Service.applyFeeOverride(studentKey, {
          tuitionWaiver,
          hostelWaiver,
          transportWaiver,
          miscWaiver,
          customFeeSlots: updatedCustomSlots,
          totalWaiver: totalWaivers
        } as any, targetBranch);

        if (res.status === 'success') {
          const breakdown = await admin2Service.getFeeBreakdown(studentKey, targetBranch);
          setFeeBreakdownData(breakdown);
          const freshStudentDoc = res.data?.student || {
            ...selectedFeeStudent,
            tuitionWaiver,
            hostelWaiver,
            transportWaiver,
            miscWaiver,
            customFeeSlots: updatedCustomSlots,
            remainingBalance: breakdown.remainingBalance
          };
          setSelectedFeeStudent(freshStudentDoc as any);
          await fetchStudents('');

          triggerToast(`Fee overrides updated for ${selectedFeeStudent.name}.`);
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
              <input maxLength={100} type="text" placeholder="Search student by Name or Admission Number..." value={feeEditSearch} onChange={(e) => { setFeeEditSearch(e.target.value); setFeeEditorPage(1); }} style={{ ...styles.textInputBox, flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && handleFeeSearch()} />
              <button onClick={handleFeeSearch} style={{ ...styles.saveSubmitBtn, marginTop: 0, padding: '12px 24px' }} className="press-interactive">Load</button>
            </div>
          </GlassCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1, marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>Student Grid</h4>
              <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--muted-gray)' }}>
                Showing <strong>{feeEditorPageStudents.length}</strong> of <strong>{filteredFeeStudents.length}</strong>
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
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
                        color: 'var(--warning)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.0714rem',
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {(student.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--dark-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.name}
                        </strong>
                        <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                          Adm: {student.admissionNumber}
                        </div>
                        <div style={{ fontSize: '0.7857rem', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '2px' }}>
                          {student.branch} ({student.course})
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: Number(student.remainingBalance || 0) > 0 ? 'var(--critical)' : 'var(--good)', whiteSpace: 'nowrap' }}>
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
                        // Was var(--warning) — #FAB219 amber on the #F5F5F4 sunken
                        // surface, a contrast ratio of 1.68. The same invisible-label
                        // fault as the dark-on-dark buttons, just the light-on-light
                        // direction of it. Matches the border instead.
                        color: 'var(--royal-gold)',
                        backgroundColor: 'var(--surface-sunken)',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.7857rem',
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
              <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--muted-gray)' }}>
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
                  style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', fontSize: '1.4286rem', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}
                >
                  ×
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'rgba(212,175,55,0.1)', border: '2px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4286rem', fontWeight: 900, color: 'var(--royal-gold)' }}>
                    {selectedFeeStudent.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--dark-charcoal)' }}>{selectedFeeStudent.name}</div>
                    <div style={{ fontSize: '0.8571rem', color: 'var(--muted-gray)', marginTop: '2px' }}>
                      <strong>ID:</strong> {selectedFeeStudent.admissionNumber} &nbsp;|&nbsp; <strong>Course:</strong> {selectedFeeStudent.course} &nbsp;|&nbsp; <strong>Branch:</strong> {selectedFeeStudent.branch}
                    </div>
                  </div>
                </div>

                {feeBreakdownData ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '14px' }}>
                    {/* Bill Format Statement Card */}
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
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1.5px solid var(--line)',
                        paddingBottom: '10px'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.6786rem', fontWeight: 800, color: 'var(--royal-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            INSPIRE JUNIOR COLLEGE
                          </span>
                          <h4 style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 900, color: 'var(--ink)' }}>
                            Fee Structure & Bill Format
                          </h4>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '20px',
                          backgroundColor: (feeBreakdownData.remainingBalance || 0) > 0 ? 'var(--critical-wash)' : 'var(--good-wash)',
                          color: (feeBreakdownData.remainingBalance || 0) > 0 ? 'var(--critical)' : 'var(--good)',
                          border: (feeBreakdownData.remainingBalance || 0) > 0 ? '1px solid var(--critical-wash)' : '1px solid var(--good-wash)'
                        }}>
                          {(feeBreakdownData.remainingBalance || 0) > 0 ? 'BALANCE DUE' : 'FULLY SETTLED'}
                        </span>
                      </div>

                      {/* Left: Description, Right: Amount Slots */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--surface-sunken)', paddingBottom: '4px' }}>
                          <span>Fee Section Description</span>
                          <span>Amount (Rs)</span>
                        </div>

                        {getAdminActiveFeeSlots(selectedFeeStudent, feeBreakdownData).map((slot: any) => {
                          const slotKey = slot.id || slot.name;
                          const waiverAmt = Number(editSlotWaivers[slotKey]) || 0;
                          const netSlotAmt = Math.max(0, slot.amount - waiverAmt);
                          return (
                            <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8929rem', padding: '4px 0', borderBottom: '1px dashed var(--surface-sunken)' }}>
                              <span style={{ color: 'var(--ink-secondary)', fontWeight: 600 }}>
                                {slot.name}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <strong style={{ color: 'var(--ink)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                  Rs.{netSlotAmt.toLocaleString('en-IN')}
                                </strong>
                                {waiverAmt > 0 && (
                                  <span style={{ fontSize: '0.6786rem', color: 'var(--good)', fontWeight: 700 }}>
                                    (Waiver: -Rs.{waiverAmt.toLocaleString('en-IN')})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Horizontal Dashed Separator */}
                      <div style={{ borderTop: '1.5px dashed var(--line-strong)', margin: '4px 0' }} />

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
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8571rem' }}>
                              <span style={{ color: 'var(--ink-secondary)', fontWeight: 700 }}>Total Base Fee</span>
                              <strong style={{ color: 'var(--ink)', fontWeight: 800 }}>
                                Rs.{baseFee.toLocaleString('en-IN')}
                              </strong>
                            </div>

                            {totalDeduction > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8571rem', color: 'var(--good)' }}>
                                <span>Fee Waivers / Deductions</span>
                                <strong style={{ fontWeight: 800 }}>- Rs.{totalDeduction.toLocaleString('en-IN')}</strong>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8571rem', color: 'var(--good)' }}>
                              <span>Total Paid by Student</span>
                              <strong style={{ fontWeight: 800 }}>- Rs.{paid.toLocaleString('en-IN')}</strong>
                            </div>

                            {/* Horizontal Double Line */}
                            <div style={{ borderTop: '2px solid var(--ink)', margin: '4px 0 2px' }} />

                            {/* Net Remaining Balance Banner */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              backgroundColor: netRemaining > 0 ? 'var(--warning-wash)' : 'var(--good-wash)',
                              border: netRemaining > 0 ? '1.5px solid #FCD34D' : '1.5px solid var(--good-wash)'
                            }}>
                              <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: netRemaining > 0 ? 'var(--warning)' : 'var(--good)', textTransform: 'uppercase' }}>
                                Remaining Balance
                              </span>
                              <strong style={{ fontSize: '1.1429rem', fontWeight: 900, color: netRemaining > 0 ? 'var(--warning)' : 'var(--good)' }}>
                                Rs.{netRemaining.toLocaleString('en-IN')}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={styles.readOnlyBlock}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px', marginBottom: '14px' }}>
                        <div>
                          <h4 style={{ ...styles.sectionSubtitle, margin: 0, borderBottom: 'none', paddingBottom: 0 }}>Modify Fee Waivers & Custom Overrides</h4>
                          <p style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '2px', marginBottom: 0 }}>
                            Enter waiver/deduction amount for each finalized fee slot below.
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownloadStudentHistoryPDF(selectedFeeStudent)}
                          style={{ ...styles.actionItemBtn, padding: '8px 16px', fontSize: '0.7857rem', fontWeight: 900, backgroundColor: 'var(--ink)', color: '#FFF' }}
                          className="press-interactive"
                        >
                          Download History
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
                        {getAdminActiveFeeSlots(selectedFeeStudent, feeBreakdownData).map((slot: any) => {
                          const slotKey = slot.id || slot.name;
                          return (
                            <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ ...styles.formLabel, fontWeight: 700, color: 'var(--ink)' }}>
                                {slot.name} Waiver (Rs)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={slot.amount}
                                value={editSlotWaivers[slotKey] !== undefined ? editSlotWaivers[slotKey] : ''}
                                placeholder="0"
                                onChange={(e) => {
                                  // `max` on a number input is advisory — it styles the field
                                  // invalid but does not stop typing, so the old handler took
                                  // any number of digits and the waiver was only refused by
                                  // the server on submit. Clamp to the slot's own base here so
                                  // the ceiling is the one printed under the field.
                                  const raw = parseFloat(e.target.value) || 0;
                                  const slotBase = Number(slot.amount) || 0;
                                  const val = Math.min(Math.max(0, raw), slotBase);
                                  setEditSlotWaivers(prev => ({ ...prev, [slotKey]: val }));
                                }}
                                style={styles.textInputBox}
                              />
                              <div style={{ fontSize: '0.7143rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                                Slot Base: Rs.{slot.amount.toLocaleString('en-IN')}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button onClick={() => { setFeeOtpInput(''); setIsFeeOtpOpen(true); }} style={{ ...styles.saveSubmitBtn, marginTop: '16px' }} className="press-interactive">
                        Submit Fee Override Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '0.8571rem' }}>Loading fee breakdown</div>
                )}
              </div>
            </div>
          )}

          {/* Fee override confirmation modal */}
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
                  <h3 style={styles.modalHeading}>Confirm Fee Waivers</h3>
                  <p style={styles.modalSubText}>
                    Are you sure you want to apply the modified fee waiver overrides for <strong>{selectedFeeStudent.name}</strong>?
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => { setIsFeeOtpOpen(false); setFeeOtpInput(''); }} style={styles.modalCancelBtn} className="press-interactive">Cancel</button>
                  <button onClick={() => handleApplyWaivers(undefined)} style={{ ...styles.modalConfirmBtn, opacity: 1, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }} className="press-interactive">
                    Yes, Apply Waivers
                  </button>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
    );
  }

  //  SUBPAGE: EXPENDITURE TRACKER
  if (activePage === 'expenditure') {
    if (!clerkCan('logExpenditures')) { setActivePage('menu'); return null; }

    const handleLogExpenditure = async (keyToUse?: string) => {
      if (!newExpAmt || !newExpDesc) { triggerToast('Please fill all fields.'); return; }
      const finalCategory = newExpCat === 'Others' ? (customExpCat.trim() || 'Others') : newExpCat;
      try {
        if (keyToUse) setGlobalSecurityKey(keyToUse);
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

    const handleDeleteExpenditure = async (exp: ExpenditureItem, otpKey?: string) => {
      const id = exp._id || exp.id;
      if (!id) return;
      try {
        if (otpKey) setGlobalSecurityKey(otpKey.trim());
        await admin2Service.deleteExpenditure(id, exp.branch || (role === 'admin1' ? selectedExpBranch : loggedInCampus), otpKey?.trim());
        triggerToast('Expenditure entry deleted.');
        setPendingExpDelete(null);
        setIsExpDeleteOtpOpen(false);
        setExpDeleteOtpInput('');
        fetchExpenditures();
      } catch (err: any) { triggerToast(err.message || 'Failed to delete expenditure.'); }
    };

    const handleDownloadExpenditureReport = () => {
      const campus = role === 'admin1' ? selectedExpBranch : loggedInCampus;
      const list = expenditures.filter(e => e.branch === campus);

      const catTotals: Record<string, number> = {};
      let total = 0;
      for (const e of list) {
        catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount || 0);
        total += Number(e.amount || 0);
      }
      const categories = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

      // A proportion bar per category, drawn with plain divs and literal
      // colours. The old version drew an SVG chart whose bars were filled with
      // var(--line-strong) and whose labels used var(--ink-secondary), so in a
      // print window the bars had no background and the labels no colour.
      const breakdown = categories.map(cat => {
        const amt = catTotals[cat];
        const pct = total > 0 ? (amt / total) * 100 : 0;
        return `
          <div style="margin-bottom:7px">
            <div class="pdf-callout-row">
              <span>${escapeHtml(cat)}</span>
              <span>${money(amt)} &middot; ${pct.toFixed(1)}%</span>
            </div>
            <div class="pdf-bar">
              <div style="width:${pct.toFixed(2)}%"></div>
            </div>
          </div>`;
      }).join('');

      const body = [
        pdfHeader({
          logoSrc: collegeLogo,
          title: 'Expenditure Report',
          subtitle: `${list.length} entr${list.length === 1 ? 'y' : 'ies'}`,
          campus
        }),
        pdfTiles([
          { label: 'Total Spend', value: money(total), tone: 'warn' },
          { label: 'Entries', value: String(list.length) },
          { label: 'Categories', value: String(categories.length) },
          { label: 'Largest Category', value: categories[0] ? `${categories[0]}` : '—' }
        ]),
        categories.length ? pdfSection('Spend by Category') : '',
        categories.length ? breakdown : '',
        pdfSection('Expenditure Entries'),
        pdfTable({
          headers: ['Date', 'Category', 'Description', 'Paid To', 'Amount'],
          numeric: [4],
          rows: list
            .slice()
            .sort((a: any, b: any) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime())
            .map((e: any) => [
              dateStr(e.date),
              `<strong>${escapeHtml(e.category)}</strong>`,
              escapeHtml(e.description || e.note || '—'),
              escapeHtml(e.paidTo || e.vendor || '—'),
              money(e.amount)
            ]),
          footer: ['', '', '', 'Total', money(total)],
          emptyMessage: 'No expenditure recorded for this campus.'
        }),
        pdfFooter({ note: 'Computer-generated expenditure report, verified against the Inspire ERP records.' })
      ].join('');

      const opened = openPrintDocument({
        title: `Expenditure Report - ${campus}`,
        body,
        buttonLabel: 'Print / Save Expenditure Report as PDF',
        onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the report.')
      });
      if (opened) triggerToast('Expenditure report opened for printing.');
    };

    const handleDownloadBill = (exp: ExpenditureItem) => {
      const body = [
        pdfHeader({
          logoSrc: collegeLogo,
          title: 'Expenditure Bill',
          subtitle: escapeHtml(String(exp.category || '')),
          campus: (exp as any).branch || loggedInCampus
        }),
        pdfDetailCard([
          ['Category', exp.category],
          ['Date', dateStr(exp.date as any)],
          ['Paid To', (exp as any).paidTo || (exp as any).vendor],
          ['Payment Mode', (exp as any).paymentMode],
          ['Reference', (exp as any).id || (exp as any)._id],
          ['Campus', (exp as any).branch || loggedInCampus]
        ]),
        pdfSection('Description'),
        `<div class="pdf-callout">
           ${escapeHtml((exp as any).description || (exp as any).note || 'No description recorded.')}
         </div>`,
        pdfTiles([
          { label: 'Amount', value: money(exp.amount), tone: 'warn' }
        ]),
        pdfFooter({ note: 'Computer-generated expenditure voucher, verified against the Inspire ERP records.' })
      ].join('');

      const opened = openPrintDocument({
        title: `Expenditure Bill - ${exp.category}`,
        body,
        buttonLabel: 'Print / Save Bill as PDF',
        framed: true,
        onBlocked: () => triggerToast('Popup blocked by the browser. Allow popups for this site to download the bill.')
      });
      if (opened) triggerToast('Expenditure bill opened for printing.');
    };

    const normalizeBranch = (b?: string) => {
      if (!b) return '';
      const lower = b.toLowerCase().trim();
      if (lower.includes('erragattugutta') && (lower.includes('1') || lower.includes('c1'))) return 'Erragattugutta C1';
      if (lower.includes('erragattugutta') && (lower.includes('2') || lower.includes('c2'))) return 'Erragattugutta C2';
      if ((lower.includes('beemaram') || lower.includes('bheemaram')) && (lower.includes('1') || lower.includes('c1'))) return 'Beemaram C1';
      if ((lower.includes('beemaram') || lower.includes('bheemaram')) && (lower.includes('2') || lower.includes('c2'))) return 'Beemaram C2';
      return b.trim();
    };

    // Filter recent entries based on role
    const filteredExpenditures = role === 'admin1'
      ? expenditures.filter(e => normalizeBranch(e.branch) === normalizeBranch(selectedExpBranch))
      : expenditures.filter(e => normalizeBranch(e.branch) === normalizeBranch(loggedInCampus));

    /**
     * Campus totals come from the server, not from the rows on screen.
     *
     * `expenditures` is one capped page. Reducing over it produced the right
     * figure only while every entry happened to fit in one response — and the
     * day it stopped fitting, the total would have quietly dropped by
     * whatever fell off the end with nothing to indicate it.
     *
     * The server sends a per-campus breakdown computed over the whole filter.
     * The reduce is kept only as the fallback for a response that carried no
     * breakdown, where the page IS everything there is.
     */
    const getBranchTotal = (b: string) => {
      if (expenditureByBranch) {
        const key = Object.keys(expenditureByBranch)
          .find(k => normalizeBranch(k) === normalizeBranch(b));
        return key ? expenditureByBranch[key] : 0;
      }
      return expenditures
        .filter(e => normalizeBranch(e.branch) === normalizeBranch(b))
        .reduce((s, e) => s + e.amount, 0);
    };

    const totalFiltered = getBranchTotal(role === 'admin1' ? selectedExpBranch : loggedInCampus);

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px', marginBottom: '16px', zIndex: 1 }}>
              {CAMPUS_LIST.map(b => {
                const total = getBranchTotal(b);
                const isActive = selectedExpBranch === b;
                return (
                  <div key={b} onClick={() => setSelectedExpBranch(b as any)} style={{ padding: '12px 10px', borderRadius: '12px', border: isActive ? '2px solid var(--ink)' : '1px solid rgba(255,255,255,0.1)', background: isActive ? 'var(--ink)' : 'rgba(255,255,255,0.03)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} className="press-interactive">
                    <div style={{ fontSize: '0.7143rem', color: isActive ? 'var(--surface)' : 'var(--muted-gray)', fontWeight: 800 }}>{b}</div>
                    <strong style={{ fontSize: '1rem', color: isActive ? '#38BDF8' : 'var(--critical)', display: 'block', marginTop: '4px' }}>Rs.{total.toLocaleString('en-IN')}</strong>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '10px', marginTop: '10px' }}>
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
                  <input maxLength={LIMITS.category} type="text" placeholder="e.g. Office Equipment" value={customExpCat} onChange={(e) => setCustomExpCat(e.target.value)} style={styles.textInputBox} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Amount (Rs.)</label>
                  <input max={999999999} type="number" min="0" value={newExpAmt} onChange={(e) => setNewExpAmt(e.target.value)} style={styles.textInputBox} placeholder="e.g. 12000" />
                </div>
              )}
              {newExpCat === 'Others' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Amount (Rs.)</label>
                  <input max={999999999} type="number" min="0" value={newExpAmt} onChange={(e) => setNewExpAmt(e.target.value)} style={styles.textInputBox} placeholder="e.g. 12000" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                <label style={styles.formLabel}>Description</label>
                <input maxLength={LIMITS.remarks} type="text" value={newExpDesc} onChange={(e) => setNewExpDesc(e.target.value)} style={styles.textInputBox} placeholder="Brief description of the expense" />
              </div>
            </div>
            <button onClick={() => { if (!newExpAmt || !newExpDesc) { triggerToast('Please fill all fields.'); return; } handleLogExpenditure(undefined); }} style={{ ...styles.saveSubmitBtn, marginTop: '14px' }} className="press-interactive">
              Log Expenditure
            </button>
          </GlassCard>

          {/* Recent entries */}
          <GlassCard hoverable={false} style={{ padding: '20px', marginTop: '14px', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <h4 style={{ ...styles.sectionSubtitle, margin: 0 }}>
                Recent Entries {role === 'admin1' ? `(${selectedExpBranch})` : `(${loggedInCampus})`}  Total: Rs.{totalFiltered.toLocaleString('en-IN')}
              </h4>
              {/* CSV alongside the PDF: one is for filing, the other is what
                  gets reconciled against a bank statement. */}
              <CsvExportButton kind="expenditures" label="Export CSV" />
              <button
                onClick={handleDownloadExpenditureReport}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(13,148,136,0.3)',
                  backgroundColor: 'rgba(13,148,136,0.08)',
                  color: '#0D9488',
                  fontWeight: 800,
                  fontSize: '0.7857rem',
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
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '0.8571rem' }}>No expenditure entries logged for this branch.</div>
              ) : (
                filteredExpenditures.map((exp, i) => (
                  <div key={exp._id || i} style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--card-border)', backgroundColor: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8929rem', fontWeight: 800, color: 'var(--dark-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.category}  {exp.description}</div>
                      <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '2px' }}>{typeof exp.date === 'string' ? exp.date.split('T')[0] : exp.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--critical)' }}>Rs.{exp.amount.toLocaleString('en-IN')}</strong>
                      <button onClick={() => handleDownloadBill(exp)} style={{ fontSize: '0.7143rem', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(212,175,55,0.4)', backgroundColor: 'rgba(212,175,55,0.06)', color: 'var(--royal-gold)', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }} title="Download Bill">Bill</button>
                      <button onClick={() => { setPendingExpDelete(exp); setIsExpDeleteOtpOpen(true); }} style={{ fontSize: '0.7143rem', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: 'var(--critical)', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 700 }}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Expenditure Delete Confirmation modal */}
          {isExpDeleteOtpOpen && pendingExpDelete && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '400px', padding: '28px', borderRadius: '20px', margin: '0 16px' }} className="anim-slide-up glass-gold-ring">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--critical)' }}>Confirm Expenditure Deletion</h3>
                    <p style={{ margin: '6px 0 0', fontSize: '0.8571rem', color: 'var(--muted-gray)' }}>Are you sure you want to delete this expenditure record?</p>
                  </div>
                  <button onClick={() => { setIsExpDeleteOtpOpen(false); setPendingExpDelete(null); setExpDeleteOtpInput(''); }} style={{ background: 'none', border: 'none', fontSize: '1.4286rem', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}>×</button>
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.6)', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.8571rem', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{pendingExpDelete.category}</div>
                  <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)', marginTop: '3px' }}>{pendingExpDelete.description}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--critical)', marginTop: '4px' }}>Rs.{pendingExpDelete.amount.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setIsExpDeleteOtpOpen(false); setPendingExpDelete(null); setExpDeleteOtpInput(''); }}
                    style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--dark-charcoal)' }}
                    className="press-interactive"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteExpenditure(pendingExpDelete, undefined)}
                    style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1, backgroundColor: 'var(--critical)', color: '#fff', opacity: 1 }}
                    className="press-interactive"
                  >
                    Yes, Delete Entry
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Expenditure Confirmation modal */}
          {isExpOtpOpen && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '20px', margin: '0 16px' }} className="anim-slide-up glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '1.15rem', color: 'var(--dark-charcoal)' }}>Confirm Expenditure Entry</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted-gray)', lineHeight: 1.5 }}>Are you sure you want to log this expenditure entry?</p>
                  <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: '10px', fontSize: '0.8571rem', textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>{newExpCat} • {newExpDesc}</div>
                    <div style={{ color: 'var(--critical)', fontWeight: 900, fontSize: '1.1429rem', marginTop: '4px' }}>Rs.{Number(newExpAmt).toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setIsExpOtpOpen(false); setExpOtpInput(''); }} style={{ ...styles.modalCancelBtn, flex: 1 }} className="press-interactive">Cancel</button>
                  <button onClick={() => handleLogExpenditure(undefined)} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1.3, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }} className="press-interactive">Yes, Log Entry</button>
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
    const teacherList: any[] = teachers.filter(t => role === 'clerk' ? t.branch === loggedInCampus : true);
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
        if (securityKey) setGlobalSecurityKey(securityKey);
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
              <strong style={{ ...styles.metricValue, color: 'var(--good)', fontSize: '1.5714rem' }}>₹{totalPaidAmount.toLocaleString('en-IN')}</strong>
            </GlassCard>
            <GlassCard hoverable={false} style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.18)' }}>
              <div style={styles.metricLabel}>Total Unpaid Amount</div>
              <strong style={{ ...styles.metricValue, color: 'var(--critical)', fontSize: '1.5714rem' }}>₹{totalUnpaidAmount.toLocaleString('en-IN')}</strong>
            </GlassCard>
          </div>

          <div style={{ ...styles.readOnlyBlock, border: '1.5px solid var(--royal-gold)', zIndex: 1, marginBottom: '12px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...styles.formLabel, color: 'var(--royal-gold)', fontWeight: 800 }}>Enter Authenticator Security Key</label>
              <input maxLength={LIMITS.backupCode}
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
              <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--good)', backgroundColor: 'rgba(16,185,129,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                Total: ₹{teacherList.reduce((s, t) => s + (t.salary || 0), 0).toLocaleString('en-IN')} / mo
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
              {salaryPageItems.map((t, i) => (
                <div key={t.id || i} style={{ padding: '14px', borderRadius: '16px', border: `1.5px solid ${t.salaryStatus === 'paid' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, backgroundColor: t.salaryStatus === 'paid' ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--dark-charcoal)', lineHeight: 1.25 }}>{t.name}</div>
                      <div style={{ fontSize: '0.7857rem', color: 'var(--royal-gold)', fontWeight: 800, marginTop: '4px' }}>{t.subject || 'Role'}</div>
                    </div>
                    <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: t.salaryStatus === 'paid' ? 'var(--good)' : 'var(--critical)', backgroundColor: 'rgba(255,255,255,0.75)', padding: '4px 8px', borderRadius: '999px' }}>
                      {t.salaryStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', fontSize: '0.7857rem', color: 'var(--muted-gray)', lineHeight: 1.5 }}>
                    <span>Campus: {t.branch || loggedInCampus}</span>
                    <span>Salary: ₹{Number(t.salary || 0).toLocaleString('en-IN')}</span>
                    <span>Paid: ₹{Number(t.salaryPaidAmount || 0).toLocaleString('en-IN')}</span>
                    <span>Balance: ₹{Math.max(0, Number(t.salary || 0) - Number(t.salaryPaidAmount || 0)).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => openSalaryAction(t, 'paid')}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 800, fontSize: '0.7857rem', cursor: 'pointer' }}
                      className="press-interactive"
                    >
                      Mark Given
                    </button>
                    <button
                      onClick={() => openSalaryAction(t, 'pending')}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: 'var(--critical)', fontWeight: 800, fontSize: '0.7857rem', cursor: 'pointer' }}
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
              <div style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--muted-gray)' }}>
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
                    <p style={{ margin: '6px 0 0', fontSize: '0.8571rem', color: 'var(--muted-gray)' }}>
                      {selectedSalaryTeacher.name} • {selectedSalaryTeacher.subject || 'Role'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setIsSalaryActionOpen(false); setSelectedSalaryTeacher(null); setSalaryAmountInput(''); }}
                    style={{ background: 'none', border: 'none', fontSize: '1.4286rem', cursor: 'pointer', color: 'var(--muted-gray)', fontWeight: 900 }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.6)' }}>
                    <div style={{ fontSize: '0.7857rem', color: 'var(--muted-gray)' }}>Salary Due</div>
                    <div style={{ fontSize: '1.1429rem', fontWeight: 900, color: 'var(--dark-charcoal)' }}>₹{Number(selectedSalaryTeacher.salary || 0).toLocaleString('en-IN')}</div>
                  </div>
                  {salaryActionType === 'paid' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={styles.formLabel}>Exact Amount Paid</label>
                      <input max={999999999}
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

    const confirmWorkerAction = async () => {
      if (!workerPendingAction) return;
      const { actionType, data } = workerPendingAction;
      try {
        /* security PIN is collected by apiClient on demand */
        if (actionType === 'toggle') {
          const payload = {
            workerName: data.workerName || data.name,
            role: data.role || 'Staff Worker',
            amount: Number(data.amountPaid || data.amount || data.salary || 0),
            monthPeriod: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
            paid: true,
            branch: role === 'clerk' ? loggedInCampus : (data.branch || loggedInCampus)
          };
          await admin2Service.createWorkerPayment(payload as any);
          triggerToast(`Worker payment for ${payload.workerName} recorded successfully!`);
          await fetchWorkerPaymentsHistory();
        }
        setIsWorkerOtpOpen(false);
        setWorkerPendingAction(null);
        setSelectedWorkerForPayment(null);
      } catch (err: any) {
        triggerToast(err.message || 'Failed to record worker payment.');
      }
    };

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
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.8571rem',
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
              <input maxLength={100}
                type="text"
                placeholder="Search Worker by Name, Role, Month Period, ID..."
                value={workerSearch}
                onChange={(e) => { setWorkerSearch(e.target.value); setWorkerPage(1); }}
                style={{ ...styles.textInputBox, fontSize: '0.9286rem', padding: '12px 14px' }}
              />
            </div>
            {workerSearch && (
              <button
                onClick={() => { setWorkerSearch(''); setWorkerPage(1); }}
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--critical)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.7857rem', fontWeight: 800, textTransform: 'uppercase' }}
              >
                Clear Search
              </button>
            )}
            <div style={{ fontSize: '0.8571rem', color: 'var(--muted-gray)', fontWeight: 700, padding: '0 8px' }}>
              Showing <strong>{filteredWorkers.length}</strong> Workers
            </div>
          </div>

          {/* Top Pagination Controls */}
          {workerTotalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
              <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                Showing {((workerCurrentPage - 1) * WORKER_PER_PAGE) + 1}-{Math.min(workerCurrentPage * WORKER_PER_PAGE, filteredWorkers.length)} of {filteredWorkers.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setWorkerPage(p => Math.max(1, p - 1))} disabled={workerCurrentPage === 1}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: workerCurrentPage === 1 ? 'var(--surface-sunken)' : '#fff', color: workerCurrentPage === 1 ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: workerCurrentPage === 1 ? 'default' : 'pointer' }}>
                  â† Prev
                </button>
                <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center' }}>Page {workerCurrentPage} / {workerTotalPages}</span>
                <button onClick={() => setWorkerPage(p => Math.min(workerTotalPages, p + 1))} disabled={workerCurrentPage === workerTotalPages}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--line)', background: workerCurrentPage === workerTotalPages ? 'var(--surface-sunken)' : '#fff', color: workerCurrentPage === workerTotalPages ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: workerCurrentPage === workerTotalPages ? 'default' : 'pointer' }}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* WORKERS GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
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
                      color: w.paid ? 'var(--good)' : 'var(--critical)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.0714rem',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      {wName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '1.0714rem', color: 'var(--dark-charcoal)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {wName}
                        </strong>
                        <span style={{
                          fontSize: '0.7143rem',
                          fontWeight: 900,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: w.paid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: w.paid ? 'var(--good)' : 'var(--critical)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}>
                          {w.paid ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7857rem', color: 'var(--ink-secondary)', marginTop: '2px', fontWeight: 600 }}>
                        Role: <span style={{ color: 'var(--ink)', fontWeight: 800 }}>{w.role || 'Staff'}</span> Â· Period: <span style={{ color: 'var(--ink)', fontWeight: 800 }}>{w.monthPeriod || 'July 2026'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--surface-sunken)', padding: '10px 12px', borderRadius: '10px', fontSize: '0.8214rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-secondary)' }}>
                      <span>Monthly Wage:</span>
                      <strong>Rs.{wWage.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--good)' }}>
                      <span>Amount Paid:</span>
                      <strong>Rs.{wPaid.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: wDue > 0 ? 'var(--critical)' : 'var(--good)' }}>
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
                          color: '#FFFFFF',
                          backgroundColor: 'var(--royal-gold)',
                          borderRadius: '8px',
                          fontWeight: 900,
                          fontSize: '0.8214rem',
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
                          color: 'var(--critical)',
                          backgroundColor: 'rgba(254, 242, 242, 0.8)',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.8214rem',
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
                        border: '1.5px solid var(--line-strong)',
                        color: 'var(--ink-secondary)',
                        backgroundColor: 'var(--surface-sunken)',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.7857rem',
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
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--muted-gray)', fontSize: '0.9286rem', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '16px' }}>
                No worker payroll records found matching your search.
              </div>
            )}
          </div>

          {/* Bottom Pagination Controls */}
          {workerTotalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '8px' }}>
              <button onClick={() => setWorkerPage(p => Math.max(1, p - 1))} disabled={workerCurrentPage === 1}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid var(--line)', background: workerCurrentPage === 1 ? 'var(--surface-sunken)' : '#fff', color: workerCurrentPage === 1 ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: workerCurrentPage === 1 ? 'default' : 'pointer' }}>
                â† Previous
              </button>
              <span style={{ fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>Page {workerCurrentPage} of {workerTotalPages}</span>
              <button onClick={() => setWorkerPage(p => Math.min(workerTotalPages, p + 1))} disabled={workerCurrentPage === workerTotalPages}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1.5px solid var(--line)', background: workerCurrentPage === workerTotalPages ? 'var(--surface-sunken)' : '#fff', color: workerCurrentPage === workerTotalPages ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: 800, fontSize: '0.8571rem', cursor: workerCurrentPage === workerTotalPages ? 'default' : 'pointer' }}>
                Next
              </button>
            </div>
          )}

          {/* ENTER PAYMENT AMOUNT MODAL */}
          {isPaymentAmountModalOpen && selectedWorkerForPayment && (
            <div style={{ ...styles.overlayOverlay, zIndex: 1300 }} className="anim-fade-in">
              <div style={{ ...styles.overlaySheet, maxWidth: '420px', borderTop: '4px solid var(--royal-gold)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ ...styles.modalTitle, color: 'var(--warning)' }}>Record Worker Payment</h3>
                  <button onClick={() => { setIsPaymentAmountModalOpen(false); setSelectedWorkerForPayment(null); }} style={{ background: 'none', border: 'none', fontSize: '1.2857rem', cursor: 'pointer', color: 'var(--muted-gray)' }}>×</button>
                </div>
                <p style={{ fontSize: '0.8571rem', color: 'var(--muted-gray)', lineHeight: 1.5, marginBottom: '14px' }}>
                  Worker: <strong>{selectedWorkerForPayment.workerName || selectedWorkerForPayment.name}</strong> ({selectedWorkerForPayment.role})<br />
                  Monthly Wage: <strong>Rs.{(selectedWorkerForPayment.amount || selectedWorkerForPayment.salary || 0).toLocaleString('en-IN')}</strong>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  <label style={styles.formLabel}>Amount Paid (Rs.) *</label>
                  <input max={999999999}
                    type="number"
                    min="0"
                    placeholder="Enter paid amount"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    style={{ ...styles.textInputBox, fontSize: '1.1429rem', fontWeight: 800, color: 'var(--good)' }}
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
                    style={{ ...styles.saveSubmitBtn, flex: 1.5, marginTop: 0, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }}
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

          {/* Worker payment confirmation modal overlay */}
          {isWorkerOtpOpen && (
            <div style={{ ...styles.overlayOverlay, zIndex: 1400 }} className="anim-fade-in">
              <GlassCard hoverable={false} style={{ width: '100%', maxWidth: '400px', padding: '28px', borderRadius: '16px', border: '1px solid var(--card-border)' }} className="anim-slide-up glass-gold-ring">
                <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                  <h3 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.0714rem', color: 'var(--dark-charcoal)' }}>Confirm Worker Payment</h3>
                  <p style={{ margin: 0, fontSize: '0.8929rem', color: 'var(--muted-gray)', lineHeight: 1.5, fontWeight: 600 }}>
                    Are you sure you want to record worker payment of <strong>Rs. {(Number(workerPendingAction?.data?.amountPaid || workerPendingAction?.data?.amount || 0)).toLocaleString('en-IN')}</strong> for <strong>{workerPendingAction?.data?.workerName || workerPendingAction?.data?.name}</strong>?
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button onClick={() => { setIsWorkerOtpOpen(false); setWorkerPendingAction(null); setWorkerOtpInput(''); }} style={{ ...styles.modalCancelBtn, flex: 1 }} className="press-interactive">Cancel</button>
                  <button onClick={confirmWorkerAction} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1.3, backgroundColor: 'var(--royal-gold)', color: '#FFFFFF', fontWeight: 900 }} className="press-interactive">Yes, Record Payment</button>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
    );
  }

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
      } else if (role === 'clerk') {
        return {
          initials: 'CL',
          // Falls back to the role, not to an invented person. The old
          // fallback was a hardcoded name that appeared on any clerk account
          // whose own name had not been set.
          name: user?.name || `Clerk — ${loggedInCampus}`,
          title: `${loggedInCampus} Campus Clerk`,
          clearance: `Campus Clerk Access (${loggedInCampus})`,
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
      <PortalDataLoader visible={isPageLoading} colorAccent={role === 'clerk' ? 'var(--accent)' : 'var(--warning)'} />
      {renderBackgroundDesign('gold')}

      {/* Top Welcome Title Bar */}
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 1 }}>
          <div style={styles.parentWelcomeRow}>
            <div style={styles.avatarMini}>{role === 'admin1' ? 'RC' : role === 'clerk' ? 'CL' : 'AR'}</div>
            <div>
              <span style={styles.greetingText}>
                {role === 'admin1'
                  ? 'General Principal Rector,'
                  : role === 'clerk'
                    ? 'Campus Clerk,'
                    : 'Academic Registrar,'}
              </span>
              <h2 style={styles.parentWelcomeTitle}>
                {role === 'admin1'
                  ? 'Rector General Cockpit'
                  : role === 'clerk'
                    ? 'Campus Operations Cockpit'
                    : 'Academic & Publishing Cockpit'}
              </h2>
              <p style={styles.childMetaText}>
                {role === 'admin1'
                  ? 'Superintendent Coordinator (All 4 Campuses)'
                  : role === 'clerk'
                    ? `Campus Clerk (${loggedInCampus})`
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
            backgroundColor: 'var(--ink)',
            borderRadius: '16px',
            border: '1px solid var(--ink-secondary)'
          }}>
            <button
              onClick={() => setAdmin1Tab('dashboard')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '1rem',
                border: 'none',
                backgroundColor: admin1Tab === 'dashboard' ? 'var(--accent)' : 'var(--ink)',
                color: 'var(--surface)',
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span style={{ color: 'var(--surface)' }}>Dashboard (Operations Modules)</span>
            </button>

            <button
              onClick={() => setAdmin1Tab('overview')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '1rem',
                border: 'none',
                backgroundColor: admin1Tab === 'overview' ? 'var(--accent)' : 'var(--ink)',
                color: 'var(--surface)',
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="2.5"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
              <span style={{ color: 'var(--surface)' }}>Overview (Data Science Analytics)</span>
            </button>
          </div>
        )}

        {/* SUMMARY STATS / OVERVIEW - role-conditional */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {role === 'admin1' ? (
            admin1Tab === 'overview' ? (
              // Server-computed. The previous component re-derived every total
              // in the browser from whatever happened to be loaded into
              // `students`/`expenditures` — so a filtered or partially-loaded
              // list silently produced different figures from the ledger.
              <AnalyticsDashboard />
            ) : null
          ) : role === 'clerk' ? (
            // Deliberately nothing. A dean's job here is faculty and the
            // expenditure ledger; the analytics dashboard was noise on top of
            // those two and is now Rector-only. The endpoint still scopes by
            // campus server-side, so this is a presentation decision, not a
            // permission one — removing the panel takes nothing away that an
            // a clerk is entitled to see elsewhere.
            null
          ) : null}
          {/*
            REMOVED: two unreachable arms of this chain.

            AdminDashboardView is typed `role?: 'admin1' | 'clerk'` and App.tsx
            mounts it only ever as one of those two, so neither arm could run.

            The first was already labelled __unreachable_legacy_admin2__ and
            re-derived campus totals in the browser. The second was the final
            `else`, and it rendered four hardcoded figures as though they were
            live data — "Exams Scheduled 2", "Published Results 24",
            "Bulletins & Notice Broadcasts 12", "Active Class Schedules 8".
            Every one of those features was removed from this application; the
            numbers were invented and fixed in the source.

            Nothing displayed them, but they shipped in the bundle, and an
            arm like that is one role check away from becoming visible.
          */}
        </section>

        {/* Module Grid */}
        {(role !== 'admin1' || admin1Tab === 'dashboard') && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>
              {role === 'admin1' ? 'Operations Modules' : role === 'clerk' ? 'Finance & Staff Modules' : 'Academic Modules'}
            </h3>

            {role === 'admin1' ? (
              <div className="grid-container">
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('students'); } }} onClick={() => setActivePage('students')} style={styles.moduleCardNew} className="module-card press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2"><circle cx="12" cy="7" r="4" /><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Students Registry</h4>
                  <p style={styles.moduleDesc}>Register admissions, view records across all 4 campuses.</p>
                </div>

                <div onClick={() => { setActivePage('students'); if (!newStuAdmissionNumber.trim()) setNewStuAdmissionNumber(`ADM2400${studentTotal + 1}`); setNewStuFormPage(1); setIsStudentHoverModalOpen(true); }} style={styles.moduleCardNew} className="module-card press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>+ Add Student Admission</h4>
                  <p style={styles.moduleDesc}>Register new student profile, campus allocation, and fee structure.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('teachers'); } }} onClick={() => setActivePage('teachers')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Faculty Management</h4>
                  <p style={styles.moduleDesc}>Configure lecturers, allocate subjects, check base salaries.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('fee_editor'); } }} onClick={() => setActivePage('fee_editor')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Student Fee & Waivers</h4>
                  <p style={styles.moduleDesc}>Configure individual scholarship category fee waivers.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('expenditure'); } }} onClick={() => setActivePage('expenditure')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Multi-Branch Expenditure</h4>
                  <p style={styles.moduleDesc}>Compare totals and log expenses across all 4 campuses.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('enquiries'); } }} onClick={() => setActivePage('enquiries')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.22)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Admission Enquiries</h4>
                  <p style={styles.moduleDesc}>View and manage prospective student enquiries from portfolio.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('clerks'); } }} onClick={() => setActivePage('clerks')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Clerks</h4>
                  <p style={styles.moduleDesc}>Switch clerk accounts on or off and choose what each one can do.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('outstanding_fees'); } }} onClick={() => setActivePage('outstanding_fees')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--critical)" strokeWidth="2"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Outstanding Fees</h4>
                  <p style={styles.moduleDesc}>Every student with a balance, largest first, with a one-tap reminder.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('recently_deleted'); } }} onClick={() => setActivePage('recently_deleted')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--royal-gold)" strokeWidth="2"><path d="M3 7v6h6" /><path d="M3.51 13a9 9 0 1 0 2.13-9.36L3 7" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Recently Deleted</h4>
                  <p style={styles.moduleDesc}>Put back a student, staff member or entry deleted by mistake.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('security'); } }} onClick={() => setActivePage('security')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>My Password & Sign-ins</h4>
                  <p style={styles.moduleDesc}>Change your own password or PIN, and check where you are signed in.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('fee_collection'); } }} onClick={() => setActiveTab('fee_collection')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Collect Fees</h4>
                  <p style={styles.moduleDesc}>Search any student across all four campuses and take payments.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('logs'); } }} onClick={() => setActivePage('logs')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(30,58,138,0.07)', border: '1px solid rgba(30,58,138,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Activity Log</h4>
                  <p style={styles.moduleDesc}>See which account made every transaction and record change.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('credentials'); } }} onClick={() => setActivePage('credentials')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--critical)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Credentials</h4>
                  <p style={styles.moduleDesc}>View and change the portal ID, password and PIN of every account.</p>
                </div>

                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('profile'); } }} onClick={() => setActivePage('profile')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.12)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Rector Profile</h4>
                  <p style={styles.moduleDesc}>Review registered principal rector credentials.</p>
                </div>
              </div>

            ) : role === 'clerk' ? (
              /* A clerk sees ONLY what the Rector has granted. The five
                 permissions map onto these modules; a clerk with nothing
                 granted gets an explanatory card rather than an empty screen
                 that reads as broken. Faculty ledger and Admission Enquiries
                 used to sit here and are not among the five, so they are now
                 the Rector's alone. */
              <div className="grid-container">
                {clerkCan('addStudent') && (
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('students'); setNewStuFormPage(1); setIsStudentHoverModalOpen(true); } }} onClick={() => { setActivePage('students'); setNewStuFormPage(1); setIsStudentHoverModalOpen(true); }} style={styles.moduleCardNew} className="module-card press-interactive">
                    <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </div>
                    <h4 style={styles.moduleTitle}>+ Add Student Admission</h4>
                    <p style={styles.moduleDesc}>Register a new student at {loggedInCampus}.</p>
                  </div>
                )}

                {clerkCan('editStudent') && (
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('students'); } }} onClick={() => setActivePage('students')} style={styles.moduleCardNew} className="module-card press-interactive">
                    <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2"><circle cx="12" cy="7" r="4" /><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>
                    </div>
                    <h4 style={styles.moduleTitle}>Students Registry</h4>
                    <p style={styles.moduleDesc}>View and edit student records for {loggedInCampus}.</p>
                  </div>
                )}

                {clerkCan('collectFees') && (
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('fee_collection'); } }} onClick={() => setActiveTab('fee_collection')} style={styles.moduleCardNew} className="module-card press-interactive">
                    <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                    </div>
                    <h4 style={styles.moduleTitle}>Collect Student Fees</h4>
                    <p style={styles.moduleDesc}>Take payments and raise receipts for {loggedInCampus}.</p>
                  </div>
                )}

                {clerkCan('logExpenditures') && (
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('expenditure'); } }} onClick={() => setActivePage('expenditure')} style={styles.moduleCardNew} className="module-card press-interactive">
                    <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </div>
                    <h4 style={styles.moduleTitle}>Campus Expenditures</h4>
                    <p style={styles.moduleDesc}>Log and track local expenditures of {loggedInCampus}.</p>
                  </div>
                )}

                {/* Faculty, for a clerk who has been given `manageStaff`.
                    The permission has always existed — it is offered on the
                    Clerks screen and the server honours it on every teacher,
                    salary and worker-payment route — but this grid never
                    offered a way in, so granting it did nothing a clerk could
                    see. The page itself scopes to the clerk's own campus. */}
                {clerkCan('manageStaff') && (
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('teachers'); } }} onClick={() => setActivePage('teachers')} style={styles.moduleCardNew} className="module-card press-interactive">
                    <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                    </div>
                    <h4 style={styles.moduleTitle}>Faculty Management</h4>
                    <p style={styles.moduleDesc}>Lecturers, subjects and salaries for {loggedInCampus}.</p>
                  </div>
                )}

                {!clerkCan('addStudent') && !clerkCan('editStudent') && !clerkCan('collectFees') && !clerkCan('logExpenditures') && !clerkCan('manageStaff') && !clerkCan('manageEnquiries') && (
                  <GlassCard hoverable={false} style={{ padding: '24px', gridColumn: '1 / -1' }}>
                    <h4 style={{ ...styles.moduleTitle, marginBottom: '6px' }}>No permissions yet</h4>
                    <p style={styles.moduleDesc}>
                      Your clerk account is active but has not been given any powers.
                      Ask the Rector to enable what you need from the Clerks screen.
                    </p>
                  </GlassCard>
                )}

                {/* Fee reminders, the same panel the Rector uses.
                    /api/fees/outstanding already serves admin1, clerk and accountant,
                    and the panel pins itself to the clerk's own campus, so this needed
                    no new route and no new permission - only a way in.

                    Deliberately NOT behind a clerk permission: chasing an unpaid fee
                    is the job, not a privilege, and a clerk who cannot see who owes
                    money cannot do the collecting they are there to do.

                    The 'My Password & Sign-ins' tile that stood here was removed on
                    request. A clerk's credentials are set by the Rector on the Clerks
                    screen, which is the single place they are managed. */}
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('outstanding_fees'); } }} onClick={() => setActivePage('outstanding_fees')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--critical)" strokeWidth="2"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Outstanding Fees</h4>
                  <p style={styles.moduleDesc}>Students at {loggedInCampus} with a balance, largest first, with a one-tap WhatsApp reminder.</p>
                </div>

                {/* Admission enquiries, behind the Rector's grant. The routes are
                    campus-scoped server-side for a clerk, so a granted clerk sees
                    only their own campus's enquiries and can only update those. */}
                {clerkCan('manageEnquiries') && (
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('enquiries'); } }} onClick={() => setActivePage('enquiries')} style={styles.moduleCardNew} className="press-interactive">
                    <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2"><path d="M4 4h16v12H5.17L4 17.17V4z" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="12" x2="13" y2="12" /></svg>
                    </div>
                    <h4 style={styles.moduleTitle}>Admission Enquiries</h4>
                    <p style={styles.moduleDesc}>Enquiries for {loggedInCampus}, with status and notes.</p>
                  </div>
                )}


                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('profile'); } }} onClick={() => setActivePage('profile')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.12)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <h4 style={styles.moduleTitle}>Clerk Profile</h4>
                  <p style={styles.moduleDesc}>Review your {loggedInCampus} clerk account details.</p>
                </div>
              </div>

            ) : (
              <div className="grid-container">
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('profile'); } }} onClick={() => setActivePage('profile')} style={styles.moduleCardNew} className="press-interactive">
                  <div style={{ ...styles.moduleIconWrapper, backgroundColor: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.12)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
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
          Sign Out
        </button>

        {/* Footer */}
        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px 12px', gap: '8px', opacity: 0.85 }}>
          <InspireLogo size="sm" inPortal={true} />
          <span style={{ fontSize: '0.6429rem', color: 'var(--muted-gray)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
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

      {/* Student Edit Secondary Confirmation Modal */}
      {isOtpModalOpen && editStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: '360px', padding: '28px', borderRadius: '16px', margin: '0 16px', backgroundColor: 'rgba(255,255,255,0.96)', border: '1px solid var(--card-border)', boxShadow: '0 20px 50px rgba(15,23,42,0.15)' }} className="anim-slide-up">
            <h3 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.0714rem', color: 'var(--dark-charcoal)', letterSpacing: '-0.015em' }}>Confirm Profile & Fee Changes</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8929rem', color: 'var(--muted-gray)', lineHeight: 1.5, fontWeight: 600 }}>Are you sure you want to save updated profile details and fee structure for <strong>{editStudent.name}</strong>?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setIsOtpModalOpen(false); setOtpInput(''); }} style={{ ...styles.modalCancelBtn, flex: 1 }} className="press-interactive">Cancel</button>
              <button onClick={() => handleStudentSave(editStudent, undefined)} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1.3 }} className="press-interactive">Yes, Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Student Delete Confirmation Modal */}
      {isDeleteStuOtpOpen && selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '20px', margin: '0 16px', backgroundColor: 'rgba(255,255,255,0.98)', border: '2px solid var(--critical)', boxShadow: '0 25px 60px rgba(239,68,68,0.25)' }} className="anim-slide-up">
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--critical)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '1.4286rem', fontWeight: 900 }}>!</div>
              <h3 style={{ margin: '0 0 6px', fontWeight: 900, fontSize: '1.1429rem', color: 'var(--critical)' }}>Confirm Permanent Student Deletion</h3>
              <p style={{ margin: 0, fontSize: '0.8929rem', color: 'var(--dark-charcoal)', lineHeight: 1.5, fontWeight: 600 }}>
                Are you sure you want to <strong>PERMANENTLY DELETE</strong> student record for <strong style={{ color: 'var(--critical)' }}>{selectedStudent.name}</strong> ({selectedStudent.admissionNumber}) from MongoDB and all portal databases?
              </p>
              <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--critical)', fontWeight: 700 }}>
                THIS ACTION CANNOT BE UNDONE.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setIsDeleteStuOtpOpen(false); setDeleteStuOtpInput(''); }} style={{ ...styles.modalCancelBtn, flex: 1 }} className="press-interactive">Cancel</button>
              <button onClick={() => handlePermanentDeleteStudent()} style={{ ...styles.saveSubmitBtn, marginTop: 0, flex: 1.2, backgroundColor: 'var(--critical)', color: '#FFF', fontWeight: 900 }} className="press-interactive">Yes, Purge Student</button>
            </div>
          </div>
        </div>
      )}
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
    fontSize: '1.2857rem',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.025em',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '0.8214rem',
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
    fontSize: '0.9286rem',
    fontWeight: 900,
    color: 'var(--royal-gold)',
    border: '1px solid rgba(212,175,55,0.25)',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  parentWelcomeTitle: {
    fontSize: '1.1429rem',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em',
  },
  greetingText: {
    fontSize: '0.7143rem',
    color: 'var(--muted-gray)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '3px',
  },
  childMetaText: {
    fontSize: '0.7857rem',
    color: 'var(--muted-gray)',
    fontWeight: 500,
    marginTop: '1px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
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
    fontSize: '0.6786rem',
    fontWeight: 700,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  metricValue: {
    fontSize: '1.5714rem',
    fontWeight: 900,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.03em',
    lineHeight: 1,
    marginTop: '4px',
  },
  metricSub: {
    fontSize: '0.6786rem',
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
    fontSize: '0.7857rem',
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
    fontSize: '0.9286rem',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.01em',
  },
  moduleDesc: {
    fontSize: '0.7857rem',
    color: 'var(--muted-gray)',
    lineHeight: 1.5,
    fontWeight: 400,
  },
  textInputBox: {
    flex: 1,
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid var(--card-border)',
    fontSize: '0.9286rem',
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
    color: 'var(--surface)',
    fontFamily: 'var(--font-family)',
    fontSize: '0.8929rem',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    marginTop: '8px',
    letterSpacing: '0.01em',
  },
  sectionSubtitle: {
    fontSize: '0.7857rem',
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
    fontSize: '0.8929rem',
    padding: '5px 0',
  },
  formLabel: {
    fontSize: '0.6786rem',
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
    fontSize: '0.9286rem',
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
    fontSize: '0.7857rem',
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
    fontSize: '0.8571rem',
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
    fontSize: '0.6786rem',
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
    fontSize: '0.8571rem',
    fontWeight: 700,
    color: 'var(--surface)',
  },
  heroAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: 'var(--dark-charcoal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1429rem',
    fontWeight: 900,
    color: 'var(--royal-gold)',
    border: '1px solid rgba(212,175,55,0.2)',
    letterSpacing: '0.04em',
  },
  studentName: {
    fontSize: '1.1429rem',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.015em',
  },
  studentID: {
    fontSize: '0.8214rem',
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
    fontSize: '0.9286rem',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    letterSpacing: '0.01em',
  },
  quickFillContainer: {
    padding: '4px 0',
  },
  quickFillPill: {
    fontSize: '0.7143rem',
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
    fontSize: '0.8571rem',
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
    fontSize: '0.7857rem',
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
    fontSize: '0.9286rem',
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
    fontSize: '0.9286rem',
    cursor: 'pointer'
  }
};



