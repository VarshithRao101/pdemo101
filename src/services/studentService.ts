/**
 * studentService.ts
 * Typed wrappers over apiClient for all Student & Parent portal endpoints.
 * Every function resolves identity from the JWT on the server — no student ID
 * is ever passed as a parameter from the client.
 */
import { apiClient } from './apiClient';

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
  rollNumber: string;
  status: 'Active' | 'Inactive';
  documents: string[];
  tuitionFee: number;
  hostelFee: number;
  transportFee: number;
  miscellaneousFee: number;
  previousPending: number;
  totalPaid: number;
  remainingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  _id: string;
  targetId: string;
  targetModel: 'Student' | 'Teacher';
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
}

export interface AttendanceSummary {
  records: AttendanceRecord[];
  total: number;
  present: number;
  attendancePct: number;
}

export interface ExamResult {
  _id: string;
  subject: string;
  testTitle: string;
  date: string;
  score: number;
  maxMarks: number;
  student: string;
}

export interface AcademicsData {
  attendance: AttendanceSummary;
  examResults: ExamResult[];
  byTestTitle: Record<string, { subject: string; score: number; maxMarks: number; date: string }[]>;
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

export interface TimetableEntry {
  _id: string;
  section: string;
  day: string;
  period: string;
  subject: string;
  teacher: {
    _id: string;
    name: string;
    id: string;
  };
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

// ─── Service Functions ────────────────────────────────────────────────────────

export const fetchMyProfile = async (): Promise<StudentProfile> => {
  const res = await apiClient.get<{ status: string; data: StudentProfile }>('/student/me/profile');
  return res.data;
};

export const fetchMyAcademics = async (): Promise<AcademicsData> => {
  const res = await apiClient.get<{ status: string; data: AcademicsData }>('/student/me/academics');
  return res.data;
};

export const fetchMyFees = async (): Promise<FeesData> => {
  const res = await apiClient.get<{ status: string; data: FeesData }>('/student/me/fees');
  return res.data;
};

export const fetchMyTimetable = async (): Promise<TimetableEntry[]> => {
  const res = await apiClient.get<{ status: string; data: TimetableEntry[] }>('/student/me/timetable');
  return res.data;
};

export const fetchBulletins = async (): Promise<Bulletin[]> => {
  const res = await apiClient.get<{ status: string; data: Bulletin[] }>('/bulletins');
  return res.data;
};

// ─── Utility Helpers ─────────────────────────────────────────────────────────

/** Returns initials from a name string e.g. "Polsani Manoneeth Rao" → "PM" */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** Format rupee amount with ₹ prefix and commas */
export const formatRupees = (amount: number): string =>
  '₹' + amount.toLocaleString('en-IN');
