// apiClient.ts
// Native fetch client wrapper intercepted to simulate a fully client-side mock backend stored in localStorage.
// All API endpoints are intercepted here and resolved dynamically without calling any real backend server.

export const getApiBaseUrl = (): string => {
  return '/api';
};

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

let activeSecurityKey = '';

export const setGlobalSecurityKey = (key: string) => {
  activeSecurityKey = key;
};

// HELPER: Simulate network delay
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// INITIAL STORAGE SEEDER
const normalizeCampusName = (campusName: string): string => {
  if (!campusName) return 'eragattur1';
  const norm = campusName.toLowerCase().replace(/\s+/g, '');
  if (norm.includes('eragattur1') || norm.includes('erragattuguttac1')) return 'eragattur1';
  if (norm.includes('eragattur2') || norm.includes('erragattuguttac2')) return 'eragattur2';
  if (norm.includes('indbimar1') || norm.includes('beemaramc1')) return 'indbimar1';
  if (norm.includes('bhimaram2') || norm.includes('beemaramc2')) return 'bhimaram2';
  return norm;
};

export const getOrGenerateSecurityKeys = () => {
  const stored = localStorage.getItem('jc_security_keys');
  const now = Date.now();
  const rotationInterval = 12 * 60 * 60 * 1000;
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.generatedAt && (now - parsed.generatedAt < rotationInterval)) {
        return parsed;
      }
    } catch (e) {
      // JSON parse error, regenerate
    }
  }
  
  const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
  
  const keys = {
    generatedAt: now,
    dailyPins: {
      admin1: '882211',
      authenticator: '998811',
      admin2_eragattur1: genOtp(),
      admin2_eragattur2: genOtp(),
      admin2_indbimar1: genOtp(),
      admin2_bhimaram2: genOtp(),
      accountant_eragattur1_1: genOtp(),
      accountant_eragattur1_2: genOtp(),
      accountant_eragattur2_1: genOtp(),
      accountant_eragattur2_2: genOtp(),
      accountant_indbimar1_1: genOtp(),
      accountant_indbimar1_2: genOtp(),
      accountant_bhimaram2_1: genOtp(),
      accountant_bhimaram2_2: genOtp(),
    },
    sectionOtps: {
      admin1: {
        studentRegistry: genOtp(),
        facultyManagement: genOtp(),
        feeStructure: genOtp(),
        expenditure: genOtp()
      },
      admin2: {
        expenditure: genOtp(),
        workerPayments: genOtp()
      },
      accountant: {
        studentDetails: genOtp(),
        fees: genOtp(),
        hostel: genOtp()
      }
    }
  };
  
  localStorage.setItem('jc_security_keys', JSON.stringify(keys));
  return keys;
};

export const logTransactionInJournal = (action: string, branch: string, status: 'success' | 'failed', errorDetails = '') => {
  const list = JSON.parse(localStorage.getItem('jc_sync_journal') || '[]');
  const newLog = {
    _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    transactionId: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    sourceNode: 'Inspire ERP Central Node',
    action,
    branch,
    status,
    errorDetails
  };
  list.unshift(newLog);
  localStorage.setItem('jc_sync_journal', JSON.stringify(list.slice(0, 100)));
};

const seedSyncJournal = () => {
  if (localStorage.getItem('jc_sync_journal')) return;
  const initialLogs = [
    {
      _id: "tx_init_1",
      transactionId: "TX-948271380",
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      sourceNode: "Inspire ERP Central Node",
      action: "POST /accountant/students/stu_101/payments",
      branch: "Eragattur 1",
      status: "success",
      errorDetails: ""
    },
    {
      _id: "tx_init_2",
      transactionId: "TX-948271381",
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      sourceNode: "Inspire ERP Central Node",
      action: "POST /admin2/expenditure",
      branch: "Eragattur 2",
      status: "failed",
      errorDetails: "Verification rejected: Invalid Campus Expenditure OTP. Please check keys in the Authenticator."
    },
    {
      _id: "tx_init_3",
      transactionId: "TX-948271382",
      timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
      sourceNode: "Inspire ERP Central Node",
      action: "POST /admin1/teachers",
      branch: "Indbimar 1",
      status: "success",
      errorDetails: ""
    },
    {
      _id: "tx_init_4",
      transactionId: "TX-948271383",
      timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
      sourceNode: "Inspire ERP Central Node",
      action: "POST /admin2/worker-payment",
      branch: "Bhimaram 2",
      status: "failed",
      errorDetails: "Verification rejected: Invalid Worker Payroll OTP. Please check keys in the Authenticator."
    }
  ];
  localStorage.setItem('jc_sync_journal', JSON.stringify(initialLogs));
};

const getCampusKey = (campus: string, key: string): string => {
  return `jc_${key}_${normalizeCampusName(campus)}`;
};

const getTargetCampus = (queryParams: URLSearchParams, bodyData: any) => {
  const token = sessionStorage.getItem('auth_token') || '';
  const username = token.split('-for-')[1] || '';
  
  if (username === 'admin1' || username === 'authenticator') {
    const branch = queryParams.get('branch') || bodyData?.branch;
    if (branch) return branch;
    return 'Eragattur 1';
  }
  
  const accounts = JSON.parse(localStorage.getItem('jc_accounts') || '[]');
  const matched = accounts.find((a: any) => a.username.toLowerCase() === username.toLowerCase());
  if (matched && matched.campus) {
    return matched.campus;
  }
  
  if (username === 'admin2') return 'Eragattur 1';
  if (username === 'accountant') return 'Eragattur 1';
  
  return 'Eragattur 1';
};

const checkAndRotateAllPins = () => {
  const accountsList = JSON.parse(localStorage.getItem('jc_accounts') || '[]');
  let updated = false;
  const now = Date.now();
  const resetInterval = 12 * 60 * 60 * 1000;
  
  const rotatedAccounts = accountsList.map((a: any) => {
    if ((a.role === 'admin2' || a.role === 'accountant') && (!a.lastPinReset || (now - a.lastPinReset > resetInterval))) {
      a.password = Math.floor(100000 + Math.random() * 900000).toString();
      a.lastPinReset = now;
      updated = true;
    }
    return a;
  });
  
  if (updated) {
    localStorage.setItem('jc_accounts', JSON.stringify(rotatedAccounts));
  }
};

// INITIAL STORAGE SEEDER
const initializeMockDB = () => {
  if (!localStorage.getItem('jc_db_initialized_v2')) {
    const campuses = ['Eragattur 1', 'Eragattur 2', 'Indbimar 1', 'Bhimaram 2'];
    
    // 1. Seed Accounts
    const defaultAccounts = [
      // 4 Admin 2 accounts
      {
        _id: 'acc_admin2_eragattur1',
        username: 'admin2_eragattur1',
        password: '111111',
        role: 'admin2',
        campus: 'Eragattur 1',
        name: 'Dean Eragattur 1',
        email: 'dean.e1@inspire.edu',
        mobile: '9988770011',
        department: 'Administration',
        address: 'Eragattur Campus 1, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_admin2_eragattur2',
        username: 'admin2_eragattur2',
        password: '111111',
        role: 'admin2',
        campus: 'Eragattur 2',
        name: 'Dean Eragattur 2',
        email: 'dean.e2@inspire.edu',
        mobile: '9988770022',
        department: 'Administration',
        address: 'Eragattur Campus 2, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_admin2_indbimar1',
        username: 'admin2_indbimar1',
        password: '111111',
        role: 'admin2',
        campus: 'Indbimar 1',
        name: 'Dean Indbimar 1',
        email: 'dean.i1@inspire.edu',
        mobile: '9988770033',
        department: 'Administration',
        address: 'Indbimar Campus 1, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_admin2_bhimaram2',
        username: 'admin2_bhimaram2',
        password: '111111',
        role: 'admin2',
        campus: 'Bhimaram 2',
        name: 'Dean Bhimaram 2',
        email: 'dean.b2@inspire.edu',
        mobile: '9988770044',
        department: 'Administration',
        address: 'Bhimaram Campus 2, Hanamkonda',
        lastPinReset: Date.now()
      },
      
      // 8 Accountant accounts (2 per campus)
      {
        _id: 'acc_accountant_eragattur1_1',
        username: 'accountant_eragattur1_1',
        password: '111111',
        role: 'accountant',
        campus: 'Eragattur 1',
        name: 'Acc 1 Eragattur 1',
        email: 'acc1.e1@inspire.edu',
        mobile: '9988771101',
        department: 'Finance Dept',
        address: 'Eragattur Campus 1, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_accountant_eragattur1_2',
        username: 'accountant_eragattur1_2',
        password: '111111',
        role: 'accountant',
        campus: 'Eragattur 1',
        name: 'Acc 2 Eragattur 1',
        email: 'acc2.e1@inspire.edu',
        mobile: '9988771102',
        department: 'Finance Dept',
        address: 'Eragattur Campus 1, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_accountant_eragattur2_1',
        username: 'accountant_eragattur2_1',
        password: '111111',
        role: 'accountant',
        campus: 'Eragattur 2',
        name: 'Acc 1 Eragattur 2',
        email: 'acc1.e2@inspire.edu',
        mobile: '9988772201',
        department: 'Finance Dept',
        address: 'Eragattur Campus 2, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_accountant_eragattur2_2',
        username: 'accountant_eragattur2_2',
        password: '111111',
        role: 'accountant',
        campus: 'Eragattur 2',
        name: 'Acc 2 Eragattur 2',
        email: 'acc2.e2@inspire.edu',
        mobile: '9988772202',
        department: 'Finance Dept',
        address: 'Eragattur Campus 2, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_accountant_indbimar1_1',
        username: 'accountant_indbimar1_1',
        password: '111111',
        role: 'accountant',
        campus: 'Indbimar 1',
        name: 'Acc 1 Indbimar 1',
        email: 'acc1.i1@inspire.edu',
        mobile: '9988773301',
        department: 'Finance Dept',
        address: 'Indbimar Campus 1, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_accountant_indbimar1_2',
        username: 'accountant_indbimar1_2',
        password: '111111',
        role: 'accountant',
        campus: 'Indbimar 1',
        name: 'Acc 2 Indbimar 1',
        email: 'acc2.i1@inspire.edu',
        mobile: '9988773302',
        department: 'Finance Dept',
        address: 'Indbimar Campus 1, Warangal',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_accountant_bhimaram2_1',
        username: 'accountant_bhimaram2_1',
        password: '111111',
        role: 'accountant',
        campus: 'Bhimaram 2',
        name: 'Acc 1 Bhimaram 2',
        email: 'acc1.b2@inspire.edu',
        mobile: '9988774401',
        department: 'Finance Dept',
        address: 'Bhimaram Campus 2, Hanamkonda',
        lastPinReset: Date.now()
      },
      {
        _id: 'acc_accountant_bhimaram2_2',
        username: 'accountant_bhimaram2_2',
        password: '111111',
        role: 'accountant',
        campus: 'Bhimaram 2',
        name: 'Acc 2 Bhimaram 2',
        email: 'acc2.b2@inspire.edu',
        mobile: '9988774402',
        department: 'Finance Dept',
        address: 'Bhimaram Campus 2, Hanamkonda',
        lastPinReset: Date.now()
      }
    ];
    localStorage.setItem('jc_accounts', JSON.stringify(defaultAccounts));

    // 2. Seed default data for each campus database
    campuses.forEach(campus => {
      const keySuffix = normalizeCampusName(campus);
      
      // Student seed
      let students = [];
      if (keySuffix === 'eragattur1') {
        students = [{
          admissionNumber: 'ADM24001',
          studentId: 'STU-1001',
          qrId: 'QR-8101',
          registrationNumber: 'REG20240101',
          name: 'Rahul Sharma',
          fatherName: 'Mr. Ramesh Sharma',
          motherName: 'Mrs. Devika Sharma',
          mobile: '9876543210',
          parentMobile: '9876543210',
          email: 'rahul.sharma@inspire.edu',
          address: 'Eragattur Campus 1, Warangal',
          residentialAddress: 'Day Scholar',
          hostelStatus: 'Day Scholar',
          transportStatus: 'Self Transport',
          course: 'MPC',
          section: 'Section A',
          branch: 'Eragattur 1',
          rollNumber: '24MPCA101',
          status: 'Active',
          documents: ['10th Marksheet.pdf', 'Aadhaar Card.pdf'],
          tuitionFee: 120000,
          hostelFee: 0,
          transportFee: 0,
          miscellaneousFee: 5000,
          previousPending: 0,
          totalPaid: 65000,
          remainingBalance: 60000
        }];
      } else if (keySuffix === 'eragattur2') {
        students = [{
          admissionNumber: 'ADM24002',
          studentId: 'STU-1002',
          qrId: 'QR-8102',
          registrationNumber: 'REG20240102',
          name: 'Karan Verma',
          fatherName: 'Mr. Sanjay Verma',
          motherName: 'Mrs. Shalini Verma',
          mobile: '9123456789',
          parentMobile: '9123456789',
          email: 'karan.verma@inspire.edu',
          address: 'Eragattur Campus 2, Warangal',
          residentialAddress: 'Hostel Resident',
          hostelStatus: 'Resident',
          hostelBlock: 'Block A',
          hostelRoom: 'Room 204',
          transportStatus: 'Self Transport',
          course: 'BiPC',
          section: 'Section A',
          branch: 'Eragattur 2',
          rollNumber: '24BIPCA102',
          status: 'Active',
          documents: ['10th Marksheet.pdf'],
          tuitionFee: 125000,
          hostelFee: 90000,
          transportFee: 0,
          miscellaneousFee: 5000,
          previousPending: 0,
          totalPaid: 210000,
          remainingBalance: 10000
        }];
      } else if (keySuffix === 'indbimar1') {
        students = [{
          admissionNumber: 'ADM24003',
          studentId: 'STU-1003',
          qrId: 'QR-8103',
          registrationNumber: 'REG20240103',
          name: 'Sneha Reddy',
          fatherName: 'Mr. Mohan Reddy',
          motherName: 'Mrs. Laxmi Reddy',
          mobile: '9345678901',
          parentMobile: '9345678901',
          email: 'sneha.reddy@inspire.edu',
          address: 'Indbimar Campus 1, Warangal',
          residentialAddress: 'Day Scholar',
          hostelStatus: 'Day Scholar',
          transportStatus: 'College Bus',
          course: 'CEC',
          section: 'Section B',
          branch: 'Indbimar 1',
          rollNumber: '24CECB103',
          status: 'Active',
          documents: ['10th Marksheet.pdf', 'Aadhaar Card.pdf'],
          tuitionFee: 110000,
          hostelFee: 0,
          transportFee: 12000,
          miscellaneousFee: 4000,
          previousPending: 10000,
          totalPaid: 50000,
          remainingBalance: 86000
        }];
      } else {
        students = [{
          admissionNumber: 'ADM24004',
          studentId: 'STU-1004',
          qrId: 'QR-8104',
          registrationNumber: 'REG20240104',
          name: 'Ananya Rao',
          fatherName: 'Mr. Varshith Rao',
          motherName: 'Mrs. Srilatha Rao',
          mobile: '9866551122',
          parentMobile: '9866551122',
          email: 'ananya.rao@inspire.edu',
          address: 'Bhimaram Campus 2, Hanamkonda',
          residentialAddress: 'Day Scholar',
          hostelStatus: 'Day Scholar',
          transportStatus: 'Self Transport',
          course: 'MPC',
          section: 'Section A',
          branch: 'Bhimaram 2',
          rollNumber: '24MPCA104',
          status: 'Active',
          documents: ['10th Marksheet.pdf', 'Aadhaar Card.pdf'],
          tuitionFee: 115000,
          hostelFee: 0,
          transportFee: 12000,
          miscellaneousFee: 4000,
          previousPending: 0,
          totalPaid: 40000,
          remainingBalance: 91000
        }];
      }
      localStorage.setItem(`jc_students_${keySuffix}`, JSON.stringify(students));

      // Teachers seed
      let teachers = [];
      if (keySuffix === 'eragattur1') {
        teachers = [{
          id: 'FAC-201',
          name: 'Mr. M. Srinivas',
          subject: 'Physics',
          mobile: '9988776655',
          salary: 75000,
          assignedClasses: ['Junior MPC'],
          assignedSections: ['Section A'],
          assignedSubjects: ['Physics'],
          status: 'Active',
          branch: 'Eragattur 1'
        }];
      } else if (keySuffix === 'eragattur2') {
        teachers = [{
          id: 'FAC-202',
          name: 'Mrs. K. Shanthi',
          subject: 'Chemistry',
          mobile: '9944332211',
          salary: 65000,
          assignedClasses: ['Senior BiPC'],
          assignedSections: ['Section A', 'Section B'],
          assignedSubjects: ['Chemistry'],
          status: 'Active',
          branch: 'Eragattur 2'
        }];
      } else {
        teachers = [{
          id: 'FAC-203',
          name: 'Mr. P. Raghav',
          subject: 'Mathematics',
          mobile: '9866554433',
          salary: 80000,
          assignedClasses: ['Junior MPC', 'Senior MPC'],
          assignedSections: ['Section A'],
          assignedSubjects: ['Mathematics'],
          status: 'Active',
          branch: 'Indbimar 1'
        }];
      }
      localStorage.setItem(`jc_teachers_${keySuffix}`, JSON.stringify(teachers));

      // Fee Settings seed
      let feeSettings = {};
      if (keySuffix === 'eragattur1') {
        feeSettings = {
          tuition: 120000,
          hostel: 85000,
          transport: 15000,
          misc: 5000,
          isLocked: false,
          academicYear: '2026-27',
          installments: '3 Installments',
          lateFeeRules: '₹100 per day after due date',
          scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver',
          discountRules: 'Sibling: 10% waiver',
          branch: 'Eragattur 1'
         };
      } else if (keySuffix === 'eragattur2') {
        feeSettings = {
          tuition: 125000,
          hostel: 90000,
          transport: 15000,
          misc: 5000,
          isLocked: false,
          academicYear: '2026-27',
          installments: '3 Installments',
          lateFeeRules: '₹100 per day after due date',
          scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver',
          discountRules: 'Sibling: 10% waiver',
          branch: 'Eragattur 2'
        };
      } else if (keySuffix === 'indbimar1') {
        feeSettings = {
          tuition: 110000,
          hostel: 80000,
          transport: 12000,
          misc: 4000,
          isLocked: false,
          academicYear: '2026-27',
          installments: '3 Installments',
          lateFeeRules: '₹100 per day after due date',
          scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver',
          discountRules: 'Sibling: 10% waiver',
          branch: 'Indbimar 1'
        };
      } else {
        feeSettings = {
          tuition: 115000,
          hostel: 80000,
          transport: 12000,
          misc: 4000,
          isLocked: false,
          academicYear: '2026-27',
          installments: '3 Installments',
          lateFeeRules: '₹100 per day after due date',
          scholarshipRules: 'Merit: 50% waiver, Sports: 30% waiver',
          discountRules: 'Sibling: 10% waiver',
          branch: 'Bhimaram 2'
        };
      }
      localStorage.setItem(`jc_fee_settings_${keySuffix}`, JSON.stringify(feeSettings));

      // Expenditures seed
      const expenditures = [
        {
          id: `EXP-900${keySuffix === 'eragattur1' ? '1' : keySuffix === 'eragattur2' ? '2' : '3'}`,
          category: 'Utilities',
          amount: 15000,
          description: 'Electricity bill June 2026',
          branch: campus,
          date: '2026-07-10'
        }
      ];
      localStorage.setItem(`jc_expenditures_${keySuffix}`, JSON.stringify(expenditures));

      // Worker Payments seed
      const workerPayments = [
        {
          id: `WP-800${keySuffix === 'eragattur1' ? '1' : keySuffix === 'eragattur2' ? '2' : '3'}`,
          name: 'Suresh Kumar',
          role: 'Security Guard',
          salary: 15000,
          paid: false,
          branch: campus,
          period: 'July 2026'
        }
      ];
      localStorage.setItem(`jc_worker_payments_${keySuffix}`, JSON.stringify(workerPayments));

      // Bulletins seed
      const bulletins = [
        {
          id: 'BUL-7001',
          category: 'announcement',
          title: `Welcome to ${campus}`,
          content: 'Classes commence on July 25th.',
          date: '21 Jul 2026'
        }
      ];
      localStorage.setItem(`jc_bulletins_${keySuffix}`, JSON.stringify(bulletins));

      // Student Marks seed
      const marks = [
        {
          studentId: keySuffix === 'eragattur1' ? 'STU-1001' : keySuffix === 'eragattur2' ? 'STU-1002' : keySuffix === 'indbimar1' ? 'STU-1003' : 'STU-1004',
          name: keySuffix === 'eragattur1' ? 'Rahul Sharma' : keySuffix === 'eragattur2' ? 'Karan Verma' : keySuffix === 'indbimar1' ? 'Sneha Reddy' : 'Ananya Rao',
          marks: [
            { subject: 'Physics', midterm: 82, final: 88 },
            { subject: 'Chemistry', midterm: 85, final: 89 }
          ]
        }
      ];
      localStorage.setItem(`jc_student_marks_${keySuffix}`, JSON.stringify(marks));

      // Payments seed
      const payments = [
        {
          _id: `PAY-300${keySuffix === 'eragattur1' ? '1' : keySuffix === 'eragattur2' ? '2' : '3'}`,
          studentId: keySuffix === 'eragattur1' ? 'STU-1001' : keySuffix === 'eragattur2' ? 'STU-1002' : keySuffix === 'indbimar1' ? 'STU-1003' : 'STU-1004',
          receiptNumber: `REC-5001${keySuffix === 'eragattur1' ? '1' : keySuffix === 'eragattur2' ? '2' : '3'}`,
          date: new Date().toISOString(),
          category: 'Academic Fee',
          installment: 'Installment 1',
          amount: 50000,
          balance: 20000,
          mode: 'UPI',
          cashier: 'Senior Accountant'
        }
      ];
      localStorage.setItem(`jc_payments_${keySuffix}`, JSON.stringify(payments));

      // Hostel seed
      const hostel = {
        blocks: {
          BlockA: { name: 'Block A (Boys)', capacity: 100, occupied: keySuffix === 'eragattur2' ? 1 : 0 },
          BlockB: { name: 'Block B (Girls)', capacity: 100, occupied: 0 },
          BlockC: { name: 'Block C (Staff)', capacity: 50, occupied: 0 }
        },
        rooms: [
          {
            _id: 'room_101',
            roomNumber: '101',
            block: 'BlockA',
            capacity: 4,
            occupants: []
          },
          {
            _id: 'room_204',
            roomNumber: '204',
            block: 'BlockA',
            capacity: 2,
            occupants: keySuffix === 'eragattur2' ? [
              {
                studentId: 'STU-1002',
                name: 'Karan Verma',
                course: 'BiPC',
                rollNumber: '24BIPCA102'
              }
            ] : []
          }
        ]
      };
      localStorage.setItem(`jc_hostel_${keySuffix}`, JSON.stringify(hostel));
    });

    seedSyncJournal();
    localStorage.setItem('jc_db_initialized_v2', 'true');
  }
};

initializeMockDB();

// MOCK REST ROUTER INTERCEPTOR
export const apiClient = {
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  async patch<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  async put<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await delay(60); // Fast mock delay for realistic loading states
    initializeMockDB();
    if (activeSecurityKey) {
      console.log('Mock request key auth:', activeSecurityKey);
    }

    const cleanPath = endpoint.split('?')[0].replace(/\/$/, '');
    const method = options.method?.toUpperCase() || 'GET';

    // Parse Query Params
    const queryParams = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');

    // Get Body Data
    let bodyData: any = null;
    if (options.body && typeof options.body === 'string') {
      try { bodyData = JSON.parse(options.body); } catch (e) { /* ignore */ }
    } else if (options.body instanceof FormData) {
      bodyData = {};
      options.body.forEach((value, key) => {
        bodyData[key] = value;
      });
    }

    // Validate request security keys / OTPs
    const validateRequestOtp = (path: string, methodStr: string, currentCampus: string) => {
      if (methodStr === 'GET' || path.startsWith('/auth') || path.startsWith('/authenticator')) {
        return;
      }
      
      const keys = getOrGenerateSecurityKeys();
      
      let expectedOtp = '';
      let actionLabel = '';
      
      if (path === '/admin1/teachers') {
        expectedOtp = keys.sectionOtps.admin1.facultyManagement;
        actionLabel = 'Faculty Management OTP';
      } else if (path === '/admin1/students' || path === '/admin1/student') {
        expectedOtp = keys.sectionOtps.admin1.studentRegistry;
        actionLabel = 'Student Registry OTP';
      } else if (path === '/admin2/fee-settings') {
        expectedOtp = keys.sectionOtps.admin1.feeStructure;
        actionLabel = 'Academic Fee Structure OTP';
      } else if (path === '/admin2/expenditures' || path === '/admin2/expenditure') {
        const activeUser = JSON.parse(localStorage.getItem('jc_active_user') || '{}');
        if (activeUser.role === 'admin1') {
          expectedOtp = keys.sectionOtps.admin1.expenditure;
          actionLabel = 'Multi-Branch Expenditure OTP';
        } else {
          expectedOtp = keys.sectionOtps.admin2.expenditure;
          actionLabel = 'Campus Expenditure OTP';
        }
      } else if (path === '/admin2/worker-payments' || path === '/admin2/worker-payment') {
        expectedOtp = keys.sectionOtps.admin2.workerPayments;
        actionLabel = 'Worker Payments OTP';
      } else if (path.startsWith('/accountant/students/') && path.endsWith('/bio')) {
        expectedOtp = keys.sectionOtps.accountant.studentDetails;
        actionLabel = 'Student Details Update OTP';
      } else if (path.startsWith('/accountant/students/') && path.endsWith('/payments')) {
        expectedOtp = keys.sectionOtps.accountant.fees;
        actionLabel = 'Fee Collection OTP';
      } else if (path.startsWith('/accountant/hostel')) {
        expectedOtp = keys.sectionOtps.accountant.hostel;
        actionLabel = 'Hostel Registry OTP';
      }

      if (expectedOtp && activeSecurityKey !== expectedOtp) {
        throw new Error(`Verification rejected: Invalid ${actionLabel}. Please check keys in the Authenticator.`);
      }
    };

    const targetCampusName = getTargetCampus(queryParams, bodyData);
    try {
      validateRequestOtp(cleanPath, method, targetCampusName);
    } catch (err: any) {
      if (!err.message.includes('Verification rejected')) {
        logTransactionInJournal(`${method} ${cleanPath}`, targetCampusName, 'failed', err.message);
      }
      throw err;
    }

    // --- AUTH ROUTES ---
    if (cleanPath === '/auth/login') {
      const { identifier, password } = bodyData;
      initializeMockDB();
      const accountsList = JSON.parse(localStorage.getItem('jc_accounts') || '[]');
      
      let matchedAccount = accountsList.find((a: any) => a.username.toLowerCase() === identifier.toLowerCase());
      
      if (!matchedAccount) {
        if (identifier === 'admin1' && password === '111111') {
          matchedAccount = { _id: 'acc_admin1', username: 'admin1', password: '111111', role: 'admin1', campus: 'All', name: 'Rector' };
        } else if (identifier === 'authenticator' && password === '111111') {
          matchedAccount = { _id: 'acc_authenticator', username: 'authenticator', password: '111111', role: 'authenticator', campus: 'All', name: 'Security Admin' };
        }
      }
      
      if (matchedAccount) {
        // Rotate 12 hours check (only for admin2 and accountant profiles)
        const now = Date.now();
        const resetInterval = 12 * 60 * 60 * 1000;
        if ((matchedAccount.role === 'admin2' || matchedAccount.role === 'accountant') && 
            (!matchedAccount.lastPinReset || (now - matchedAccount.lastPinReset > resetInterval))) {
          matchedAccount.password = Math.floor(100000 + Math.random() * 900000).toString();
          matchedAccount.lastPinReset = now;
          const idx = accountsList.findIndex((a: any) => a._id === matchedAccount._id);
          if (idx !== -1) {
            accountsList[idx] = matchedAccount;
            localStorage.setItem('jc_accounts', JSON.stringify(accountsList));
          }
        }
        
        if (password === matchedAccount.password) {
          const mockUser = {
            id: matchedAccount._id,
            username: matchedAccount.username,
            role: matchedAccount.role,
            campus: matchedAccount.campus,
            name: matchedAccount.name || (matchedAccount.role === 'admin2' ? 'Principal Dean' : 'Accountant')
          };
          return {
            status: 'success',
            token: `mock-jwt-token-for-${matchedAccount.username}`,
            user: mockUser
          } as any;
        }
      }
      
      throw new Error('Invalid credentials. Use your account ID and PIN.');
    }

    if (cleanPath === '/auth/me') {
      const token = sessionStorage.getItem('auth_token') || '';
      const matchedUsername = token.split('-for-')[1] || 'admin1';
      
      const accountsList = JSON.parse(localStorage.getItem('jc_accounts') || '[]');
      let matchedAccount = accountsList.find((a: any) => a.username.toLowerCase() === matchedUsername.toLowerCase());
      
      if (!matchedAccount) {
        if (matchedUsername === 'admin1') {
          matchedAccount = { _id: 'acc_admin1', username: 'admin1', role: 'admin1', campus: 'All', name: 'Rector' };
        } else if (matchedUsername === 'authenticator') {
          matchedAccount = { _id: 'acc_authenticator', username: 'authenticator', role: 'authenticator', campus: 'All', name: 'Security Admin' };
        }
      }
      
      if (matchedAccount) {
        return {
          status: 'success',
          user: {
            id: matchedAccount._id,
            username: matchedAccount.username,
            role: matchedAccount.role,
            campus: matchedAccount.campus,
            name: matchedAccount.name || (matchedAccount.role === 'admin2' ? 'Principal Dean' : 'Accountant')
          }
        } as any;
      }
      throw new Error('User not found.');
    }

    // --- AUTHENTICATOR ACCOUNTS CONTROL ---
    if (cleanPath === '/authenticator/accounts') {
      checkAndRotateAllPins();
      const accountsList = JSON.parse(localStorage.getItem('jc_accounts') || '[]');
      if (method === 'GET') {
        return { status: 'success', data: accountsList } as any;
      }
      if (method === 'POST') {
        const newAcc = { ...bodyData };
        newAcc._id = `acc_${Date.now()}`;
        newAcc.lastPinReset = Date.now();
        accountsList.push(newAcc);
        localStorage.setItem('jc_accounts', JSON.stringify(accountsList));
        return { status: 'success', data: newAcc } as any;
      }
    }

    if (cleanPath.startsWith('/authenticator/accounts/')) {
      const id = cleanPath.split('/').pop();
      const accountsList = JSON.parse(localStorage.getItem('jc_accounts') || '[]');
      const idx = accountsList.findIndex((a: any) => a._id === id);
      
      if (method === 'PUT') {
        if (idx !== -1) {
          accountsList[idx] = { ...accountsList[idx], ...bodyData };
          if (bodyData.password) {
            accountsList[idx].lastPinReset = Date.now();
          }
          localStorage.setItem('jc_accounts', JSON.stringify(accountsList));
          return { status: 'success', data: accountsList[idx] } as any;
        }
        throw new Error('Account not found');
      }
      
      if (method === 'DELETE') {
        if (idx !== -1) {
          accountsList.splice(idx, 1);
          localStorage.setItem('jc_accounts', JSON.stringify(accountsList));
          return { status: 'success', message: 'Account deleted.' } as any;
        }
        throw new Error('Account not found');
      }
    }

    if (cleanPath === '/authenticator/keys') {
      const keys = getOrGenerateSecurityKeys();
      const accountsList = JSON.parse(localStorage.getItem('jc_accounts') || '[]');
      
      const dailyPins: any = {
        admin1: '882211',
        authenticator: '998811'
      };
      
      accountsList.forEach((a: any) => {
        if (a.role === 'admin2') {
          dailyPins[`admin2_${normalizeCampusName(a.campus)}`] = a.password;
        } else if (a.role === 'accountant') {
          dailyPins[a.username] = a.password;
        }
      });

      return {
        status: 'success',
        data: {
          dailyPins,
          sectionOtps: keys.sectionOtps
        }
      } as any;
    }

    if (cleanPath === '/authenticator/backup-codes') {
      const accountsList = JSON.parse(localStorage.getItem('jc_accounts') || '[]');
      const keys = getOrGenerateSecurityKeys();
      
      const codes = [
        {
          name: 'Rector (Admin 1)',
          username: 'admin1',
          role: 'admin1',
          password: keys.dailyPins.admin1,
          backupCode: 'REC-BK-991',
          campus: 'All'
        },
        {
          name: 'Security Admin (Authenticator)',
          username: 'authenticator',
          role: 'authenticator',
          password: keys.dailyPins.authenticator,
          backupCode: 'SEC-BK-882',
          campus: 'All'
        }
      ];

      accountsList.forEach((a: any) => {
        let backup = '';
        if (a.role === 'admin2') {
          const suffix = normalizeCampusName(a.campus).toUpperCase();
          backup = `ADM2-BK-${suffix}`;
        } else if (a.role === 'accountant') {
          const parts = a.username.split('_');
          const suffix = parts[1]?.toUpperCase() || 'CAMP';
          const num = parts[2] || '1';
          backup = `ACT-BK-${suffix}-${num}`;
        }

        codes.push({
          name: a.name || (a.role === 'admin2' ? 'Principal Dean' : 'Accountant'),
          username: a.username,
          role: a.role,
          password: a.password,
          backupCode: backup || `BK-${a.username.toUpperCase()}`,
          campus: a.campus
        });
      });

      return {
        status: 'success',
        data: codes
      } as any;
    }

    if (cleanPath === '/authenticator/sync-journal') {
      const list = JSON.parse(localStorage.getItem('jc_sync_journal') || '[]');
      return { status: 'success', data: list } as any;
    }

    if (cleanPath === '/authenticator/stats') {
      let totalStudents = 0;
      let totalTeachers = 0;
      let totalStaff = 8;
      
      ['eragattur1', 'eragattur2', 'indbimar1', 'bhimaram2'].forEach(c => {
        const studentsList = JSON.parse(localStorage.getItem(`jc_students_${c}`) || '[]');
        const teachersList = JSON.parse(localStorage.getItem(`jc_teachers_${c}`) || '[]');
        const workersList = JSON.parse(localStorage.getItem(`jc_worker_payments_${c}`) || '[]');
        totalStudents += studentsList.length;
        totalTeachers += teachersList.length;
        totalStaff += workersList.length;
      });

      return {
        status: 'success',
        data: {
          totalStudents,
          totalTeachers,
          totalStaff,
          activeDevices: 12
        }
      } as any;
    }

    // Resolve current campus context
    const branch = getTargetCampus(queryParams, bodyData);
    const studentsKey = getCampusKey(branch, 'students');
    const teachersKey = getCampusKey(branch, 'teachers');
    const feeSettingsKey = getCampusKey(branch, 'fee_settings');
    const expendituresKey = getCampusKey(branch, 'expenditures');
    const workerPaymentsKey = getCampusKey(branch, 'worker_payments');
    const studentMarksKey = getCampusKey(branch, 'student_marks');
    const bulletinsKey = getCampusKey(branch, 'bulletins');
    const paymentsKey = getCampusKey(branch, 'payments');
    const hostelKey = getCampusKey(branch, 'hostel');
    const attendanceKey = getCampusKey(branch, 'attendance');

    // --- STUDENT ROUTES ---
    if (cleanPath === '/admin1/students' || cleanPath === '/admin/students') {
      const list = JSON.parse(localStorage.getItem(studentsKey) || '[]');
      if (method === 'GET') {
        const search = queryParams.get('search')?.toLowerCase() || '';
        const filtered = list.filter((s: any) => s.name.toLowerCase().includes(search) || s.admissionNumber.toLowerCase().includes(search));
        return { status: 'success', data: filtered } as any;
      }
      if (method === 'POST') {
        const newStu = { ...bodyData };
        newStu._id = `stu_${Date.now()}`;
        newStu.tempPassword = '111111'; // Default pin
        list.push(newStu);
        localStorage.setItem(studentsKey, JSON.stringify(list));

        // Create empty marks profile
        const marksList = JSON.parse(localStorage.getItem(studentMarksKey) || '[]');
        marksList.push({
          studentId: newStu.studentId,
          name: newStu.name,
          marks: [
            { subject: 'English', midterm: 0, final: 0 },
            { subject: 'Physics', midterm: 0, final: 0 },
            { subject: 'Chemistry', midterm: 0, final: 0 },
            { subject: 'Mathematics', midterm: 0, final: 0 }
          ]
        });
        localStorage.setItem(studentMarksKey, JSON.stringify(marksList));
        logTransactionInJournal('POST /admin1/students', branch, 'success');
        return { status: 'success', data: newStu, credential: { pin: '111111', username: newStu.rollNumber } } as any;
      }
    }

    if (cleanPath.startsWith('/admin1/students/')) {
      const id = cleanPath.split('/').pop();
      const list = JSON.parse(localStorage.getItem(studentsKey) || '[]');
      const idx = list.findIndex((s: any) => s.admissionNumber === id || s.studentId === id || s._id === id);

      if (method === 'PATCH') {
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...bodyData };
          localStorage.setItem(studentsKey, JSON.stringify(list));
          logTransactionInJournal(`PATCH /admin1/students/${id}`, branch, 'success');
          return { status: 'success', data: list[idx] } as any;
        }
        throw new Error('Student not found');
      }
      if (method === 'DELETE') {
        if (idx !== -1) {
          list[idx].status = 'Inactive';
          localStorage.setItem(studentsKey, JSON.stringify(list));
          logTransactionInJournal(`DELETE /admin1/students/${id}`, branch, 'success');
          return { status: 'success', message: 'Student deactivated.' } as any;
        }
        throw new Error('Student not found');
      }
    }

    // --- TEACHER / STAFF ROUTES ---
    if (cleanPath === '/admin1/teachers') {
      const list = JSON.parse(localStorage.getItem(teachersKey) || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'POST') {
        const newTeacher = { ...bodyData };
        newTeacher._id = `t_${Date.now()}`;
        newTeacher.status = 'Active';
        list.push(newTeacher);
        localStorage.setItem(teachersKey, JSON.stringify(list));
        logTransactionInJournal('POST /admin1/teachers', branch, 'success');
        return { status: 'success', data: newTeacher } as any;
      }
    }

    if (cleanPath.startsWith('/admin1/teachers/')) {
      const id = cleanPath.split('/').pop();
      const list = JSON.parse(localStorage.getItem(teachersKey) || '[]');
      const idx = list.findIndex((t: any) => t.id === id || t._id === id);
      if (method === 'PATCH') {
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...bodyData };
          localStorage.setItem(teachersKey, JSON.stringify(list));
          logTransactionInJournal(`PATCH /admin1/teachers/${id}`, branch, 'success');
          return { status: 'success', data: list[idx] } as any;
        }
        throw new Error('Teacher not found');
      }
    }

    if (cleanPath === '/admin1/sections' || cleanPath === '/admin2/staff-salaries') {
      const list = JSON.parse(localStorage.getItem(teachersKey) || '[]');
      return { status: 'success', data: { sections: ['Section A', 'Section B'], teachers: list } } as any;
    }

    // --- FEE SETTINGS ROUTES ---
    if (cleanPath === '/admin2/fee-settings') {
      const settings = JSON.parse(localStorage.getItem(feeSettingsKey) || '{}');
      if (method === 'GET') {
        return { status: 'success', data: settings } as any;
      }
      if (method === 'PATCH') {
        const current = settings || { branch };
        const merged = { ...current, ...bodyData };
        localStorage.setItem(feeSettingsKey, JSON.stringify(merged));

        // Propagate baseline fees to students in this branch
        const stuList = JSON.parse(localStorage.getItem(studentsKey) || '[]');
        const updatedStudents = stuList.map((student: any) => {
          student.tuitionFee = merged.tuition;
          student.hostelFee = student.hostelStatus === 'Resident' ? merged.hostel : 0;
          student.transportFee = student.transportStatus === 'College Bus' ? merged.transport : 0;
          student.miscellaneousFee = merged.misc;
          student.remainingBalance = (student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending) - student.totalPaid;
          if (student.remainingBalance < 0) student.remainingBalance = 0;
          return student;
        });
        localStorage.setItem(studentsKey, JSON.stringify(updatedStudents));
        logTransactionInJournal('PATCH /admin2/fee-settings', branch, 'success');
        return { status: 'success', data: merged } as any;
      }
    }

    // --- EXPENDITURES ROUTES ---
    if (cleanPath === '/admin2/expenditures' || cleanPath === '/admin2/expenditure') {
      const list = JSON.parse(localStorage.getItem(expendituresKey) || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'POST') {
        const newExp = { ...bodyData };
        newExp.id = `EXP-${Date.now()}`;
        list.push(newExp);
        localStorage.setItem(expendituresKey, JSON.stringify(list));
        logTransactionInJournal('POST /admin2/expenditure', branch, 'success');
        return { status: 'success', data: newExp } as any;
      }
    }

    if (cleanPath.startsWith('/admin2/expenditures/') || cleanPath.startsWith('/admin2/expenditure/')) {
      const id = cleanPath.split('/').pop();
      const list = JSON.parse(localStorage.getItem(expendituresKey) || '[]');
      const idx = list.findIndex((e: any) => e.id === id || e._id === id);
      if (method === 'PATCH') {
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...bodyData };
          localStorage.setItem(expendituresKey, JSON.stringify(list));
          logTransactionInJournal(`PATCH /admin2/expenditure/${id}`, branch, 'success');
          return { status: 'success', data: list[idx] } as any;
        }
        throw new Error('Expenditure not found');
      }
      if (method === 'DELETE') {
        if (idx !== -1) {
          list.splice(idx, 1);
          localStorage.setItem(expendituresKey, JSON.stringify(list));
          logTransactionInJournal(`DELETE /admin2/expenditure/${id}`, branch, 'success');
          return { status: 'success', message: 'Expenditure deleted.' } as any;
        }
        throw new Error('Expenditure not found');
      }
    }

    // --- WORKER PAYMENTS ROUTES ---
    if (cleanPath === '/admin2/worker-payments') {
      const list = JSON.parse(localStorage.getItem(workerPaymentsKey) || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'POST') {
        const newWP = { ...bodyData };
        newWP.id = `WP-${Date.now()}`;
        list.push(newWP);
        localStorage.setItem(workerPaymentsKey, JSON.stringify(list));
        logTransactionInJournal('POST /admin2/worker-payment', branch, 'success');
        return { status: 'success', data: newWP } as any;
      }
    }

    if (cleanPath.startsWith('/admin2/worker-payments/')) {
      const id = cleanPath.split('/').pop();
      const list = JSON.parse(localStorage.getItem(workerPaymentsKey) || '[]');
      const idx = list.findIndex((w: any) => w.id === id || w._id === id);
      if (method === 'PATCH') {
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...bodyData };
          localStorage.setItem(workerPaymentsKey, JSON.stringify(list));
          logTransactionInJournal(`PATCH /admin2/worker-payments/${id}`, branch, 'success');
          return { status: 'success', data: list[idx] } as any;
        }
        throw new Error('Worker payment not found');
      }
      if (method === 'DELETE') {
        if (idx !== -1) {
          list.splice(idx, 1);
          localStorage.setItem(workerPaymentsKey, JSON.stringify(list));
          logTransactionInJournal(`DELETE /admin2/worker-payments/${id}`, branch, 'success');
          return { status: 'success', message: 'Worker payment deleted.' } as any;
        }
        throw new Error('Worker payment not found');
      }
    }

    // --- MARKS REGISTRY ROUTES ---
    if (cleanPath === '/admin2/student-marks') {
      const list = JSON.parse(localStorage.getItem(studentMarksKey) || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'PATCH') {
        const { studentId, subject, midterm, final } = bodyData;
        const idx = list.findIndex((m: any) => m.studentId === studentId);
        if (idx !== -1) {
          const sMarks = list[idx].marks;
          const subIdx = sMarks.findIndex((s: any) => s.subject === subject);
          if (subIdx !== -1) {
            sMarks[subIdx].midterm = Number(midterm);
            sMarks[subIdx].final = Number(final);
          } else {
            sMarks.push({ subject, midterm: Number(midterm), final: Number(final) });
          }
          localStorage.setItem(studentMarksKey, JSON.stringify(list));
          logTransactionInJournal('PATCH /admin2/student-marks', branch, 'success');
          return { status: 'success', data: list[idx] } as any;
        }
        throw new Error('Student marks entry not found');
      }
    }

    // --- BULLETINS ROUTES ---
    if (cleanPath === '/admin1/bulletins') {
      const list = JSON.parse(localStorage.getItem(bulletinsKey) || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'POST') {
        const newBul = { ...bodyData };
        newBul.id = `BUL-${Date.now()}`;
        newBul.date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        list.push(newBul);
        localStorage.setItem(bulletinsKey, JSON.stringify(list));
        logTransactionInJournal('POST /admin1/bulletins', branch, 'success');
        return { status: 'success', data: newBul } as any;
      }
    }

    // --- EXAMS ROUTES ---
    if (cleanPath === '/admin1/exams') {
      return { status: 'success', data: [] } as any;
    }

    // --- TIMETABLE ROUTES ---
    if (cleanPath === '/admin1/timetable') {
      return { status: 'success', data: [] } as any;
    }

    // --- ACCOUNTANT PORTAL ROUTES ---
    if (cleanPath === '/accountant/dashboard-summary') {
      const studentsList = JSON.parse(localStorage.getItem(studentsKey) || '[]');
      const paymentsList = JSON.parse(localStorage.getItem(paymentsKey) || '[]');
      
      const pendingCount = studentsList.filter((s: any) => (s.remainingBalance || 0) > 0).length;
      const pendingAmount = studentsList.reduce((sum: number, s: any) => sum + (s.remainingBalance || 0), 0);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const collectionToday = paymentsList
        .filter((p: any) => p.date && p.date.startsWith(todayStr))
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      return {
        status: 'success',
        data: {
          collectionToday,
          pendingCount,
          pendingAmount,
          absentCount: 0
        }
      } as any;
    }

    if (cleanPath === '/accountant/students') {
      const studentsList = JSON.parse(localStorage.getItem(studentsKey) || '[]');
      const paymentsList = JSON.parse(localStorage.getItem(paymentsKey) || '[]');
      const search = queryParams.get('search')?.toLowerCase() || '';

      const filtered = studentsList.filter((s: any) => 
        s.name.toLowerCase().includes(search) || 
        s.admissionNumber.toLowerCase().includes(search) ||
        s.studentId.toLowerCase().includes(search)
      );

      const populated = filtered.map((student: any) => {
        const studentReceipts = paymentsList.filter((p: any) => p.studentId === student.studentId || p.student === student._id).map((p: any) => ({
          receiptNumber: p.receiptNumber || p._id || p.id,
          date: p.date,
          category: p.category,
          installment: p.installment,
          amount: p.amount,
          balance: p.balance,
          mode: p.mode,
          cashier: p.cashier || 'Senior Accountant'
        }));
        return { ...student, receipts: studentReceipts };
      });

      return { status: 'success', data: populated } as any;
    }

    if (cleanPath.startsWith('/accountant/students/')) {
      const remainingPath = cleanPath.replace('/accountant/students/', '');
      const studentsList = JSON.parse(localStorage.getItem(studentsKey) || '[]');
      const paymentsList = JSON.parse(localStorage.getItem(paymentsKey) || '[]');

      if (remainingPath.endsWith('/bio')) {
        const studentId = remainingPath.replace('/bio', '');
        const idx = studentsList.findIndex((s: any) => s._id === studentId || s.studentId === studentId || s.admissionNumber === studentId);
        if (idx !== -1) {
          const student = { ...studentsList[idx], ...bodyData };
          
          const settings = JSON.parse(localStorage.getItem(feeSettingsKey) || '{}');
          const branchSettings = settings || { tuition: 120000, hostel: 85000, transport: 15000, misc: 5000 };
          
          student.hostelFee = student.hostelStatus === 'Resident' ? (branchSettings.hostel || 85000) : 0;
          student.transportFee = student.transportStatus === 'College Bus' ? (branchSettings.transport || 15000) : 0;
          student.remainingBalance = (student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending) - student.totalPaid;
          if (student.remainingBalance < 0) student.remainingBalance = 0;

          studentsList[idx] = student;
          localStorage.setItem(studentsKey, JSON.stringify(studentsList));
          logTransactionInJournal(`PATCH /accountant/students/${studentId}/bio`, branch, 'success');
          return { status: 'success', data: student } as any;
        }
        throw new Error('Student profile not found');
      }

      if (remainingPath.endsWith('/payments')) {
        const studentId = remainingPath.replace('/payments', '');
        const idx = studentsList.findIndex((s: any) => s._id === studentId || s.studentId === studentId || s.admissionNumber === studentId);
        if (idx !== -1) {
          const student = studentsList[idx];
          if (method === 'GET') {
            const studentReceipts = paymentsList.filter((p: any) => p.studentId === student.studentId || p.student === student._id).map((p: any) => ({
              receiptNumber: p.receiptNumber || p._id || p.id,
              date: p.date,
              category: p.category,
              installment: p.installment,
              amount: p.amount,
              balance: p.balance,
              mode: p.mode,
              cashier: p.cashier || 'Senior Accountant'
            }));
            return { status: 'success', data: studentReceipts } as any;
          }
          if (method === 'POST') {
            const amountPaid = Number(bodyData.amount);
            student.totalPaid = (student.totalPaid || 0) + amountPaid;
            const settings = JSON.parse(localStorage.getItem(feeSettingsKey) || '{}');
            student.hostelFee = student.hostelStatus === 'Resident' ? (settings.hostel || 85000) : 0;
            student.transportFee = student.transportStatus === 'College Bus' ? (settings.transport || 15000) : 0;
            student.remainingBalance = (student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending) - student.totalPaid;
            if (student.remainingBalance < 0) student.remainingBalance = 0;

            const receiptNo = `REC-5${Math.floor(Math.random() * 90000 + 10000)}`;
            const newPayment = {
              _id: `PAY-${Date.now()}`,
              receiptNumber: receiptNo,
              studentId: student.studentId,
              student: student._id,
              date: bodyData.date || new Date().toISOString(),
              category: bodyData.category || 'Academic Fee',
              installment: bodyData.installment || 'Installment',
              amount: amountPaid,
              balance: student.remainingBalance,
              mode: bodyData.mode || 'Cash',
              cashier: 'Senior Accountant'
            };

            paymentsList.push(newPayment);
            localStorage.setItem(paymentsKey, JSON.stringify(paymentsList));
            
            studentsList[idx] = student;
            localStorage.setItem(studentsKey, JSON.stringify(studentsList));
            logTransactionInJournal(`POST /accountant/students/${studentId}/payments`, branch, 'success');
            return { status: 'success', data: { payment: newPayment, student: student } } as any;
          }
        }
        throw new Error('Student profile not found');
      }

      const studentId = remainingPath;
      const idx = studentsList.findIndex((s: any) => s._id === studentId || s.studentId === studentId || s.admissionNumber === studentId);
      if (idx !== -1) {
        const student = studentsList[idx];
        const studentReceipts = paymentsList.filter((p: any) => p.studentId === student.studentId || p.student === student._id).map((p: any) => ({
          receiptNumber: p.receiptNumber || p._id || p.id,
          date: p.date,
          category: p.category,
          installment: p.installment,
          amount: p.amount,
          balance: p.balance,
          mode: p.mode,
          cashier: p.cashier || 'Senior Accountant'
        }));
        return { status: 'success', data: { ...student, receipts: studentReceipts } } as any;
      }
      throw new Error('Student profile not found');
    }

    if (cleanPath.startsWith('/accountant/hostel/checkout/')) {
      const studentId = cleanPath.split('/').pop();
      const hostelData = JSON.parse(localStorage.getItem(hostelKey) || '{}');
      const studentsList = JSON.parse(localStorage.getItem(studentsKey) || '[]');
      
      const studentIdx = studentsList.findIndex((s: any) => s._id === studentId || s.studentId === studentId);
      
      if (studentIdx !== -1) {
        const student = studentsList[studentIdx];
        
        let roomBlock = student.hostelBlock;
        student.hostelStatus = 'Day Scholar';
        student.hostelBlock = '';
        student.hostelRoom = '';
        student.hostelFee = 0;
        
        student.remainingBalance = (student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending) - student.totalPaid;
        if (student.remainingBalance < 0) student.remainingBalance = 0;
        
        if (hostelData.rooms) {
          hostelData.rooms.forEach((r: any) => {
            if (r.occupants) {
              const occIdx = r.occupants.findIndex((o: any) => o.studentId === student.studentId);
              if (occIdx !== -1) {
                r.occupants.splice(occIdx, 1);
                roomBlock = r.block;
              }
            }
          });
        }
        
        if (roomBlock && hostelData.blocks && hostelData.blocks[roomBlock]) {
          hostelData.blocks[roomBlock].occupied = Math.max(0, (hostelData.blocks[roomBlock].occupied || 1) - 1);
        }
        
        localStorage.setItem(hostelKey, JSON.stringify(hostelData));
        studentsList[studentIdx] = student;
        localStorage.setItem(studentsKey, JSON.stringify(studentsList));
        
        logTransactionInJournal(`DELETE /accountant/hostel/checkout/${studentId}`, branch, 'success');
        return { status: 'success', data: { student } } as any;
      }
      throw new Error('Student profile not found');
    }

    if (cleanPath === '/accountant/hostel') {
      const hostelData = JSON.parse(localStorage.getItem(hostelKey) || '{}');
      return { status: 'success', data: hostelData } as any;
    }

    if (cleanPath.startsWith('/accountant/hostel/')) {
      const roomId = cleanPath.split('/').pop();
      const hostelData = JSON.parse(localStorage.getItem(hostelKey) || '{}');
      const studentsList = JSON.parse(localStorage.getItem(studentsKey) || '[]');
      const targetStudentId = bodyData.studentId;

      const roomIdx = hostelData.rooms.findIndex((r: any) => r._id === roomId || r.roomNumber === roomId);
      const studentIdx = studentsList.findIndex((s: any) => s._id === targetStudentId || s.studentId === targetStudentId);

      if (roomIdx !== -1 && studentIdx !== -1) {
        const student = studentsList[studentIdx];
        const room = hostelData.rooms[roomIdx];

        student.hostelStatus = 'Resident';
        student.hostelBlock = room.block;
        student.hostelRoom = room.roomNumber;
        
        const settings = JSON.parse(localStorage.getItem(feeSettingsKey) || '{}');
        student.hostelFee = settings.hostel || 85000;
        student.remainingBalance = (student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending) - student.totalPaid;
        if (student.remainingBalance < 0) student.remainingBalance = 0;

        room.occupants.push({
          studentId: student.studentId,
          name: student.name,
          course: student.course,
          rollNumber: student.rollNumber
        });

        hostelData.blocks[room.block].occupied = (hostelData.blocks[room.block].occupied || 0) + 1;
        localStorage.setItem(hostelKey, JSON.stringify(hostelData));

        studentsList[studentIdx] = student;
        localStorage.setItem(studentsKey, JSON.stringify(studentsList));

        logTransactionInJournal(`POST /accountant/hostel/allocate/${roomId}`, branch, 'success');
        return { status: 'success', data: { student, room } } as any;
      }
      throw new Error('Hostel room or student profile not found');
    }

    if (cleanPath === '/accountant/late-fees-settings') {
      const settings = JSON.parse(localStorage.getItem(feeSettingsKey) || '{}');
      if (method === 'GET') {
        return { status: 'success', data: { lateFeeRules: settings?.lateFeeRules || '₹100 per day after due date' } } as any;
      }
      if (method === 'PATCH') {
        settings.lateFeeRules = bodyData.lateFeeRules;
        localStorage.setItem(feeSettingsKey, JSON.stringify(settings));
        return { status: 'success', data: { lateFeeRules: bodyData.lateFeeRules } } as any;
      }
    }

    if (cleanPath === '/accountant/scholarships') {
      const settings = JSON.parse(localStorage.getItem(feeSettingsKey) || '{}');
      if (method === 'GET') {
        return { status: 'success', data: { scholarshipRules: settings?.scholarshipRules || 'Merit: 50% waiver, Sports: 30% waiver' } } as any;
      }
      if (method === 'PATCH') {
        settings.scholarshipRules = bodyData.scholarshipRules;
        localStorage.setItem(feeSettingsKey, JSON.stringify(settings));
        return { status: 'success', data: { scholarshipRules: bodyData.scholarshipRules } } as any;
      }
    }

    if (cleanPath === '/accountant/attendance') {
      const date = queryParams.get('date') || new Date().toISOString().split('T')[0];
      const attendanceDB = JSON.parse(localStorage.getItem(attendanceKey) || '{}');
      const studentsList = JSON.parse(localStorage.getItem(studentsKey) || '[]');

      if (method === 'GET') {
        const savedRecords = attendanceDB[date] || [];
        const roster = studentsList.map((s: any) => {
          const match = savedRecords.find((r: any) => r.id === s.studentId);
          return {
            id: s.studentId,
            name: s.name,
            type: 'student',
            section: s.section,
            status: match ? match.status : 'present'
          };
        });
        return { status: 'success', data: roster } as any;
      }

      if (method === 'POST') {
        attendanceDB[date] = bodyData.records;
        localStorage.setItem(attendanceKey, JSON.stringify(attendanceDB));
        return { status: 'success', message: 'Attendance records compiled and saved.' } as any;
      }
    }

    // DEFAULT FALLBACK FOR GENERAL INTERCEPT
    return { status: 'success', data: [] } as any;
  },
};
