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
const initializeMockDB = () => {
  if (!localStorage.getItem('jc_db_initialized')) {
    const defaultStudents = [
      {
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
        address: 'Erragattugutta Campus 1, Warangal',
        residentialAddress: 'Day Scholar',
        hostelStatus: 'Day Scholar',
        transportStatus: 'Self Transport',
        course: 'MPC',
        section: 'Section A',
        branch: 'Erragattugutta C1',
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
      },
      {
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
        address: 'Erragattugutta Campus 2, Warangal',
        residentialAddress: 'Hostel Resident',
        hostelStatus: 'Resident',
        hostelBlock: 'Block A',
        hostelRoom: 'Room 204',
        transportStatus: 'Self Transport',
        course: 'BiPC',
        section: 'Section A',
        branch: 'Erragattugutta C2',
        rollNumber: '24BIPCA102',
        status: 'Active',
        documents: ['10th Marksheet.pdf'],
        tuitionFee: 120000,
        hostelFee: 85000,
        transportFee: 0,
        miscellaneousFee: 5000,
        previousPending: 0,
        totalPaid: 210000,
        remainingBalance: 0
      },
      {
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
        address: 'Beemaram Campus 1, Hanamkonda',
        residentialAddress: 'Day Scholar',
        hostelStatus: 'Day Scholar',
        transportStatus: 'College Bus',
        course: 'CEC',
        section: 'Section B',
        branch: 'Beemaram C1',
        rollNumber: '24CECB103',
        status: 'Active',
        documents: ['10th Marksheet.pdf', 'Aadhaar Card.pdf'],
        tuitionFee: 120000,
        hostelFee: 0,
        transportFee: 15000,
        miscellaneousFee: 5000,
        previousPending: 10000,
        totalPaid: 50000,
        remainingBalance: 100000
      }
    ];

    const defaultTeachers = [
      {
        id: 'FAC-201',
        name: 'Mr. M. Srinivas',
        subject: 'Physics',
        mobile: '9988776655',
        salary: 75000,
        assignedClasses: ['Junior MPC'],
        assignedSections: ['Section A'],
        assignedSubjects: ['Physics'],
        status: 'Active',
        branch: 'Erragattugutta C1'
      },
      {
        id: 'FAC-202',
        name: 'Mrs. K. Shanthi',
        subject: 'Chemistry',
        mobile: '9944332211',
        salary: 65000,
        assignedClasses: ['Senior BiPC'],
        assignedSections: ['Section A', 'Section B'],
        assignedSubjects: ['Chemistry'],
        status: 'Active',
        branch: 'Erragattugutta C2'
      },
      {
        id: 'FAC-203',
        name: 'Mr. P. Raghav',
        subject: 'Mathematics',
        mobile: '9866554433',
        salary: 80000,
        assignedClasses: ['Junior MPC', 'Senior MPC'],
        assignedSections: ['Section A'],
        assignedSubjects: ['Mathematics'],
        status: 'Active',
        branch: 'Beemaram C1'
      }
    ];

    const defaultFeeSettings = {
      'Erragattugutta C1': {
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
        branch: 'Erragattugutta C1'
      },
      'Erragattugutta C2': {
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
        branch: 'Erragattugutta C2'
      },
      'Beemaram C1': {
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
        branch: 'Beemaram C1'
      },
      'Beemaram C2': {
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
        branch: 'Beemaram C2'
      }
    };

    const defaultExpenditures = [
      {
        id: 'EXP-9001',
        category: 'Utilities',
        amount: 15000,
        description: 'Electricity bill June 2026',
        branch: 'Erragattugutta C1',
        date: '2026-07-10'
      },
      {
        id: 'EXP-9002',
        category: 'Maintenance',
        amount: 8000,
        description: 'Lab equipment repair',
        branch: 'Erragattugutta C1',
        date: '2026-07-15'
      },
      {
        id: 'EXP-9003',
        category: 'Mess & Food',
        amount: 45000,
        description: 'Hostel mess supplies',
        branch: 'Erragattugutta C2',
        date: '2026-07-18'
      }
    ];

    const defaultWorkerPayments = [
      {
        id: 'WP-8001',
        name: 'Suresh Kumar',
        role: 'Security Guard',
        salary: 15000,
        paid: false,
        branch: 'Erragattugutta C1',
        period: 'July 2026'
      },
      {
        id: 'WP-8002',
        name: 'Laxmi Bai',
        role: 'Hostel Warden',
        salary: 25000,
        paid: true,
        branch: 'Erragattugutta C1',
        period: 'July 2026'
      },
      {
        id: 'WP-8003',
        name: 'Ramu Yadav',
        role: 'Bus Driver',
        salary: 18000,
        paid: false,
        branch: 'Beemaram C1',
        period: 'July 2026'
      }
    ];

    const defaultBulletins = [
      {
        id: 'BUL-7001',
        category: 'announcement',
        title: 'Welcome to Academic Year 2026-27',
        content: 'Classes commence on July 25th. All students must report to their respective campuses.',
        date: '21 Jul 2026'
      },
      {
        id: 'BUL-7002',
        category: 'holiday',
        title: 'Independence Day Holiday',
        content: 'Campuses will remain closed on August 15th in observance of Independence Day.',
        date: '21 Jul 2026'
      }
    ];

    const defaultStudentMarks = [
      {
        studentId: 'STU-1001',
        name: 'Rahul Sharma',
        marks: [
          { subject: 'Physics', midterm: 82, final: 88 },
          { subject: 'Chemistry', midterm: 85, final: 89 },
          { subject: 'Mathematics', midterm: 95, final: 97 },
          { subject: 'English', midterm: 80, final: 84 }
        ]
      },
      {
        studentId: 'STU-1002',
        name: 'Karan Verma',
        marks: [
          { subject: 'Physics', midterm: 82, final: 85 },
          { subject: 'Chemistry', midterm: 88, final: 90 },
          { subject: 'English', midterm: 78, final: 81 }
        ]
      },
      {
        studentId: 'STU-1003',
        name: 'Sneha Reddy',
        marks: [
          { subject: 'Mathematics', midterm: 78, final: 82 },
          { subject: 'English', midterm: 85, final: 87 }
        ]
      }
    ];

    const defaultPayments = [
      {
        _id: 'PAY-3001',
        studentId: 'STU-1001',
        receiptNumber: 'REC-50011',
        date: new Date().toISOString(),
        category: 'Academic Fee',
        installment: 'Installment 1',
        amount: 65000,
        balance: 60000,
        mode: 'UPI',
        cashier: 'Senior Accountant'
      },
      {
        _id: 'PAY-3002',
        studentId: 'STU-1002',
        receiptNumber: 'REC-50012',
        date: new Date().toISOString(),
        category: 'Academic Fee',
        installment: 'Full Payment',
        amount: 210000,
        balance: 0,
        mode: 'Cash',
        cashier: 'Senior Accountant'
      },
      {
        _id: 'PAY-3003',
        studentId: 'STU-1003',
        receiptNumber: 'REC-50013',
        date: new Date().toISOString(),
        category: 'Academic Fee',
        installment: 'Installment 1',
        amount: 50000,
        balance: 100000,
        mode: 'Bank Transfer',
        cashier: 'Senior Accountant'
      }
    ];

    const defaultHostel = {
      blocks: {
        BlockA: { name: 'Block A (Boys)', capacity: 100, occupied: 1 },
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
          occupants: [
            {
              studentId: 'STU-1002',
              name: 'Karan Verma',
              course: 'BiPC',
              rollNumber: '24BIPCA102'
            }
          ]
        },
        {
          _id: 'room_302',
          roomNumber: '302',
          block: 'BlockB',
          capacity: 2,
          occupants: []
        }
      ]
    };

    localStorage.setItem('jc_students', JSON.stringify(defaultStudents));
    localStorage.setItem('jc_teachers', JSON.stringify(defaultTeachers));
    localStorage.setItem('jc_fee_settings', JSON.stringify(defaultFeeSettings));
    localStorage.setItem('jc_expenditures', JSON.stringify(defaultExpenditures));
    localStorage.setItem('jc_worker_payments', JSON.stringify(defaultWorkerPayments));
    localStorage.setItem('jc_bulletins', JSON.stringify(defaultBulletins));
    localStorage.setItem('jc_student_marks', JSON.stringify(defaultStudentMarks));
    localStorage.setItem('jc_payments', JSON.stringify(defaultPayments));
    localStorage.setItem('jc_hostel', JSON.stringify(defaultHostel));
    localStorage.setItem('jc_db_initialized', 'true');
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

    // --- AUTH ROUTES ---
    if (cleanPath === '/auth/login') {
      const { identifier, password } = bodyData;
      const validRoles = ['admin1', 'admin2', 'accountant', 'authenticator'];
      if (validRoles.includes(identifier) && password === '111111') {
        const mockUser = {
          id: `USR-${identifier.toUpperCase()}`,
          username: identifier,
          role: identifier,
          name: identifier === 'admin1' ? 'Rector' : identifier === 'admin2' ? 'Principal Dean' : identifier === 'accountant' ? 'Bursar Senior' : 'Security Admin'
        };
        return {
          status: 'success',
          token: `mock-jwt-token-for-${identifier}`,
          user: mockUser
        } as any;
      }
      throw new Error('Invalid credentials. Use role name and pin 111111.');
    }

    if (cleanPath === '/auth/me') {
      const token = sessionStorage.getItem('auth_token') || '';
      const matchedRole = token.split('-for-')[1] || 'admin1';
      return {
        status: 'success',
        user: {
          id: `USR-${matchedRole.toUpperCase()}`,
          username: matchedRole,
          role: matchedRole,
          name: matchedRole === 'admin1' ? 'Rector' : matchedRole === 'admin2' ? 'Principal Dean' : matchedRole === 'accountant' ? 'Bursar Senior' : 'Security Admin'
        }
      } as any;
    }

    // --- STUDENT ROUTES ---
    if (cleanPath === '/admin1/students' || cleanPath === '/admin/students') {
      const list = JSON.parse(localStorage.getItem('jc_students') || '[]');
      if (method === 'GET') {
        const search = queryParams.get('search')?.toLowerCase() || '';
        const filtered = list.filter((s: any) => s.name.toLowerCase().includes(search) || s.admissionNumber.toLowerCase().includes(search));
        return { status: 'success', data: filtered } as any;
      }
      if (method === 'POST') {
        // Provision Student
        const newStu = { ...bodyData };
        newStu._id = `stu_${Date.now()}`;
        newStu.tempPassword = '111111'; // Default pin
        list.push(newStu);
        localStorage.setItem('jc_students', JSON.stringify(list));

        // Create empty marks profile
        const marksList = JSON.parse(localStorage.getItem('jc_student_marks') || '[]');
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
        localStorage.setItem('jc_student_marks', JSON.stringify(marksList));

        return { status: 'success', data: newStu, credential: { pin: '111111', username: newStu.rollNumber } } as any;
      }
    }

    if (cleanPath.startsWith('/admin1/students/')) {
      const id = cleanPath.split('/').pop();
      const list = JSON.parse(localStorage.getItem('jc_students') || '[]');
      const idx = list.findIndex((s: any) => s.admissionNumber === id || s.studentId === id || s._id === id);

      if (method === 'PATCH') {
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...bodyData };
          localStorage.setItem('jc_students', JSON.stringify(list));
          return { status: 'success', data: list[idx] } as any;
        }
        throw new Error('Student not found');
      }
      if (method === 'DELETE') {
        if (idx !== -1) {
          list[idx].status = 'Inactive';
          localStorage.setItem('jc_students', JSON.stringify(list));
          return { status: 'success', message: 'Student deactivated.' } as any;
        }
        throw new Error('Student not found');
      }
    }

    // --- TEACHER / STAFF ROUTES ---
    if (cleanPath === '/admin1/teachers') {
      const list = JSON.parse(localStorage.getItem('jc_teachers') || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'POST') {
        const newTeacher = { ...bodyData };
        newTeacher._id = `t_${Date.now()}`;
        newTeacher.status = 'Active';
        list.push(newTeacher);
        localStorage.setItem('jc_teachers', JSON.stringify(list));
        return { status: 'success', data: newTeacher } as any;
      }
    }

    if (cleanPath.startsWith('/admin1/teachers/')) {
      const id = cleanPath.split('/').pop();
      const list = JSON.parse(localStorage.getItem('jc_teachers') || '[]');
      const idx = list.findIndex((t: any) => t.id === id || t._id === id);
      if (method === 'PATCH') {
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...bodyData };
          localStorage.setItem('jc_teachers', JSON.stringify(list));
          return { status: 'success', data: list[idx] } as any;
        }
        throw new Error('Teacher not found');
      }
    }

    if (cleanPath === '/admin1/sections' || cleanPath === '/admin2/staff-salaries') {
      const list = JSON.parse(localStorage.getItem('jc_teachers') || '[]');
      return { status: 'success', data: { sections: ['Section A', 'Section B'], teachers: list } } as any;
    }

    // --- FEE SETTINGS ROUTES ---
    if (cleanPath === '/admin2/fee-settings') {
      const settings = JSON.parse(localStorage.getItem('jc_fee_settings') || '{}');
      if (method === 'GET') {
        const branch = queryParams.get('branch') || 'Erragattugutta C1';
        return { status: 'success', data: settings[branch] || settings['Erragattugutta C1'] } as any;
      }
      if (method === 'PATCH') {
        const branch = bodyData.branch || 'Erragattugutta C1';
        const current = settings[branch] || { branch };
        settings[branch] = { ...current, ...bodyData };
        localStorage.setItem('jc_fee_settings', JSON.stringify(settings));

        // Propagate baseline fees to students in this branch
        const stuList = JSON.parse(localStorage.getItem('jc_students') || '[]');
        const updatedStudents = stuList.map((student: any) => {
          if (student.branch === branch) {
            student.tuitionFee = settings[branch].tuition;
            student.hostelFee = student.hostelStatus === 'Resident' ? settings[branch].hostel : 0;
            student.transportFee = student.transportStatus === 'College Bus' ? settings[branch].transport : 0;
            student.miscellaneousFee = settings[branch].misc;
            student.remainingBalance = (student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending) - student.totalPaid;
            if (student.remainingBalance < 0) student.remainingBalance = 0;
          }
          return student;
        });
        localStorage.setItem('jc_students', JSON.stringify(updatedStudents));

        return { status: 'success', data: settings[branch] } as any;
      }
    }

    // --- EXPENDITURES ROUTES ---
    if (cleanPath === '/admin2/expenditures') {
      const list = JSON.parse(localStorage.getItem('jc_expenditures') || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'POST') {
        const newExp = { ...bodyData };
        newExp.id = `EXP-${Date.now()}`;
        list.push(newExp);
        localStorage.setItem('jc_expenditures', JSON.stringify(list));
        return { status: 'success', data: newExp } as any;
      }
    }

    // --- WORKER PAYMENTS ROUTES ---
    if (cleanPath === '/admin2/worker-payments') {
      const list = JSON.parse(localStorage.getItem('jc_worker_payments') || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'POST') {
        const newWP = { ...bodyData };
        newWP.id = `WP-${Date.now()}`;
        list.push(newWP);
        localStorage.setItem('jc_worker_payments', JSON.stringify(list));
        return { status: 'success', data: newWP } as any;
      }
    }

    // --- MARKS REGISTRY ROUTES (NEW!) ---
    if (cleanPath === '/admin2/student-marks') {
      const list = JSON.parse(localStorage.getItem('jc_student_marks') || '[]');
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
          localStorage.setItem('jc_student_marks', JSON.stringify(list));
          return { status: 'success', data: list[idx] } as any;
        }
        throw new Error('Student marks entry not found');
      }
    }

    // --- BULLETINS ROUTES ---
    if (cleanPath === '/admin1/bulletins') {
      const list = JSON.parse(localStorage.getItem('jc_bulletins') || '[]');
      if (method === 'GET') {
        return { status: 'success', data: list } as any;
      }
      if (method === 'POST') {
        const newBul = { ...bodyData };
        newBul.id = `BUL-${Date.now()}`;
        newBul.date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        list.push(newBul);
        localStorage.setItem('jc_bulletins', JSON.stringify(list));
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
      const studentsList = JSON.parse(localStorage.getItem('jc_students') || '[]');
      const paymentsList = JSON.parse(localStorage.getItem('jc_payments') || '[]');
      
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
      const studentsList = JSON.parse(localStorage.getItem('jc_students') || '[]');
      const paymentsList = JSON.parse(localStorage.getItem('jc_payments') || '[]');
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
      const studentsList = JSON.parse(localStorage.getItem('jc_students') || '[]');
      const paymentsList = JSON.parse(localStorage.getItem('jc_payments') || '[]');

      if (remainingPath.endsWith('/bio')) {
        const studentId = remainingPath.replace('/bio', '');
        const idx = studentsList.findIndex((s: any) => s._id === studentId || s.studentId === studentId || s.admissionNumber === studentId);
        if (idx !== -1) {
          const student = { ...studentsList[idx], ...bodyData };
          
          const settings = JSON.parse(localStorage.getItem('jc_fee_settings') || '{}');
          const branchSettings = settings[student.branch] || { tuition: 120000, hostel: 85000, transport: 15000, misc: 5000 };
          
          student.hostelFee = student.hostelStatus === 'Resident' ? (branchSettings.hostel || 85000) : 0;
          student.transportFee = student.transportStatus === 'College Bus' ? (branchSettings.transport || 15000) : 0;
          student.remainingBalance = (student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending) - student.totalPaid;
          if (student.remainingBalance < 0) student.remainingBalance = 0;

          studentsList[idx] = student;
          localStorage.setItem('jc_students', JSON.stringify(studentsList));
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
            localStorage.setItem('jc_payments', JSON.stringify(paymentsList));
            
            studentsList[idx] = student;
            localStorage.setItem('jc_students', JSON.stringify(studentsList));

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

    if (cleanPath === '/accountant/hostel') {
      const hostelData = JSON.parse(localStorage.getItem('jc_hostel') || '{}');
      return { status: 'success', data: hostelData } as any;
    }

    if (cleanPath.startsWith('/accountant/hostel/')) {
      const roomId = cleanPath.split('/').pop();
      const hostelData = JSON.parse(localStorage.getItem('jc_hostel') || '{}');
      const studentsList = JSON.parse(localStorage.getItem('jc_students') || '[]');
      const targetStudentId = bodyData.studentId;

      const roomIdx = hostelData.rooms.findIndex((r: any) => r._id === roomId || r.roomNumber === roomId);
      const studentIdx = studentsList.findIndex((s: any) => s._id === targetStudentId || s.studentId === targetStudentId);

      if (roomIdx !== -1 && studentIdx !== -1) {
        const student = studentsList[studentIdx];
        const room = hostelData.rooms[roomIdx];

        student.hostelStatus = 'Resident';
        student.hostelBlock = room.block;
        student.hostelRoom = room.roomNumber;
        
        const settings = JSON.parse(localStorage.getItem('jc_fee_settings') || '{}');
        const branchSettings = settings[student.branch] || { tuition: 120000, hostel: 85000, transport: 15000, misc: 5000 };
        student.hostelFee = branchSettings.hostel || 85000;
        student.remainingBalance = (student.tuitionFee + student.hostelFee + student.transportFee + student.miscellaneousFee + student.previousPending) - student.totalPaid;
        if (student.remainingBalance < 0) student.remainingBalance = 0;

        room.occupants.push({
          studentId: student.studentId,
          name: student.name,
          course: student.course,
          rollNumber: student.rollNumber
        });

        hostelData.blocks[room.block].occupied = (hostelData.blocks[room.block].occupied || 0) + 1;
        localStorage.setItem('jc_hostel', JSON.stringify(hostelData));

        studentsList[studentIdx] = student;
        localStorage.setItem('jc_students', JSON.stringify(studentsList));

        return { status: 'success', data: { student, room } } as any;
      }
      throw new Error('Hostel room or student profile not found');
    }

    if (cleanPath === '/accountant/late-fees-settings') {
      const settings = JSON.parse(localStorage.getItem('jc_fee_settings') || '{}');
      const defaultBranch = 'Erragattugutta C1';
      if (method === 'GET') {
        return { status: 'success', data: { lateFeeRules: settings[defaultBranch]?.lateFeeRules || '₹100 per day after due date' } } as any;
      }
      if (method === 'PATCH') {
        if (!settings[defaultBranch]) settings[defaultBranch] = { branch: defaultBranch };
        settings[defaultBranch].lateFeeRules = bodyData.lateFeeRules;
        localStorage.setItem('jc_fee_settings', JSON.stringify(settings));
        return { status: 'success', data: { lateFeeRules: bodyData.lateFeeRules } } as any;
      }
    }

    if (cleanPath === '/accountant/scholarships') {
      const settings = JSON.parse(localStorage.getItem('jc_fee_settings') || '{}');
      const defaultBranch = 'Erragattugutta C1';
      if (method === 'GET') {
        return { status: 'success', data: { scholarshipRules: settings[defaultBranch]?.scholarshipRules || 'Merit: 50% waiver, Sports: 30% waiver' } } as any;
      }
      if (method === 'PATCH') {
        if (!settings[defaultBranch]) settings[defaultBranch] = { branch: defaultBranch };
        settings[defaultBranch].scholarshipRules = bodyData.scholarshipRules;
        localStorage.setItem('jc_fee_settings', JSON.stringify(settings));
        return { status: 'success', data: { scholarshipRules: bodyData.scholarshipRules } } as any;
      }
    }

    if (cleanPath === '/accountant/attendance') {
      const date = queryParams.get('date') || new Date().toISOString().split('T')[0];
      const attendanceDB = JSON.parse(localStorage.getItem('jc_attendance') || '{}');
      const studentsList = JSON.parse(localStorage.getItem('jc_students') || '[]');

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
        localStorage.setItem('jc_attendance', JSON.stringify(attendanceDB));
        return { status: 'success', message: 'Attendance records compiled and saved.' } as any;
      }
    }

    // DEFAULT FALLBACK FOR GENERAL INTERCEPT
    return { status: 'success', data: [] } as any;
  },
};
