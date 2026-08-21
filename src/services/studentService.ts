/**
 * studentService.ts
 * Typed wrappers over apiClient for all Student & Parent portal endpoints.
 * Every function resolves identity from the JWT on the server — no student ID
 * is ever passed as a parameter from the client.
 */

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface StudentProfile {
  _id: string;
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
  status: 'Active' | 'Inactive';
  documents: string[];
  tuitionFee: number;
  hostelFee: number;
  transportFee: number;
  miscellaneousFee: number;
  previousPending: number;
  totalPaid: number;
  remainingBalance: number;
  customFeeSlots?: Array<{ id?: string; name: string; amount: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface FeePayment {
  _id: string;
  receiptNumber: string;
  date: string;
  category: string;
  installment: string;
  amount: number;
  balance: number;
  mode: string;
  cashier: string;
  student: string;
}

export interface FeesData {
  totalFee: number;
  totalPaid: number;
  remainingBalance: number;
  previousPending: number;
  breakdown: {
    tuitionFee: number;
    hostelFee: number;
    transportFee: number;
    miscellaneousFee: number;
  };
  payments: FeePayment[];
}

export interface Bulletin {
  _id: string;
  id?: string;
  category: 'announcement' | 'gallery' | 'event' | 'circular' | 'notice' | 'holiday';
  title: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

