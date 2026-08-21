/**
 * accountantService.ts
 * Typed wrappers over apiClient for all Accountant portal endpoints.
 */
import { apiClient } from './apiClient';
import type { StudentProfile, FeePayment } from './studentService';

export interface RoomOccupancy {
  _id: string;
  roomNumber: string;
  block: string;
  capacity: number;
  occupants: StudentProfile[];
  createdAt: string;
  updatedAt: string;
}

export interface HostelBlocksSummary {
  BlockA: { name: string; capacity: number; occupied: number };
  BlockB: { name: string; capacity: number; occupied: number };
  BlockC: { name: string; capacity: number; occupied: number };
}

export interface HostelData {
  blocks: HostelBlocksSummary;
  rooms: RoomOccupancy[];
}

export interface DashboardSummary {
  collectionToday: number;
  pendingCount: number;
  pendingAmount: number;
  absentCount: number;
}

// Service Functions

export const searchStudents = async (search: string, campus?: string): Promise<StudentProfile[]> => {
  const params: string[] = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (campus && campus !== 'All') params.push(`branch=${encodeURIComponent(campus)}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  const res = await apiClient.get<{ status: string; data: StudentProfile[] }>(
    `/accountant/students${query}`
  );
  return res.data;
};

export const getStudentProfile = async (id: string): Promise<StudentProfile> => {
  const res = await apiClient.get<{ status: string; data: StudentProfile }>(`/accountant/students/${id}`);
  return res.data;
};

/**
 * Whether an admission number is still free, asked while the form is being
 * filled in rather than after it has been submitted.
 *
 * The number is unique college-wide, so a conflict at another campus counts —
 * the server reports that case without naming the student, since the caller
 * may not read records outside their own campus.
 */
export const checkAdmissionAvailable = async (
  admissionNumber: string
): Promise<{ available: boolean; message?: string }> => {
  const res = await apiClient.get<{ status: string; data: { available: boolean; message?: string } }>(
    `/students/admission-available?admissionNumber=${encodeURIComponent(admissionNumber)}`
  );
  return res.data;
};

export const createStudent = async (studentData: Partial<StudentProfile>): Promise<StudentProfile> => {
  const res = await apiClient.post<{ status: string; data: StudentProfile }>('/accountant/students', studentData);
  return res.data;
};

export const updateStudent = async (id: string, fields: Partial<StudentProfile>, securityKey?: string): Promise<StudentProfile> => {
  const res = await apiClient.patch<{ status: string; data: StudentProfile }>(
    `/accountant/students/${id}`,
    fields,
    securityKey ? { headers: { 'x-security-pin': securityKey } } : {}
  );
  return res.data;
};

export const deleteStudent = async (id: string, securityKey?: string): Promise<void> => {
  const headers: Record<string, string> = {};
  if (securityKey) {
    headers['x-security-pin'] = securityKey;
    headers['x-security-pin'] = securityKey;
  }
  await apiClient.delete(
    `/accountant/students/${id}`,
    { headers }
  );
};

export const updateStudentBio = async (id: string, fields: Partial<StudentProfile>, securityKey?: string): Promise<StudentProfile> => {
  const res = await apiClient.patch<{ status: string; data: StudentProfile }>(
    `/accountant/students/${id}/bio`, 
    fields,
    securityKey ? { headers: { 'x-security-pin': securityKey } } : {}
  );
  return res.data;
};

/**
 * Records a payment.
 *
 * `idempotencyKey` identifies the SUBMISSION, not the request. Send the same
 * one for every retry of a payment the clerk started once — a PIN prompt, a
 * dropped connection, an impatient second click — and the server records it
 * once and hands back the original receipt. Send a new one for a new payment,
 * even if every other field is identical.
 *
 * Without it the server has to guess from the fields and a short time window,
 * and a guess is wrong in one of two directions: two genuine payments merged,
 * or one payment charged twice.
 */
export const recordPayment = async (
  studentId: string,
  paymentData: {
    amount: number; installment: string; mode: string; category: string;
    date?: string; transactionRef?: string; idempotencyKey?: string;
  },
  securityKey?: string
): Promise<{ payment: FeePayment; student: StudentProfile }> => {
  const res = await apiClient.post<{ status: string; data: { payment: FeePayment; student: StudentProfile } }>(
    `/accountant/students/${studentId}/payments`,
    paymentData,
    securityKey ? { headers: { 'x-security-pin': securityKey } } : {}
  );
  return res.data;
};

/**
 * Undo a payment taken in error.
 *
 * Guarded by the signed-in account's own six-digit PIN — the same one used to
 * sign in — because putting money back is not a routine edit and a terminal
 * left open at a counter is the ordinary case rather than the unlucky one.
 *
 * The payment is reversed, not deleted: the receipt number and the original
 * amount stay on record so the college can see afterwards that it happened.
 */
export const reversePayment = async (
  studentId: string,
  receiptNumber: string,
  reason: string,
  securityKey: string
): Promise<{ payment: FeePayment; student: StudentProfile }> => {
  const res = await apiClient.post<{ status: string; data: { payment: FeePayment; student: StudentProfile } }>(
    `/accountant/students/${studentId}/payments/${encodeURIComponent(receiptNumber)}/reverse`,
    { reason },
    { headers: { 'x-security-pin': securityKey } }
  );
  return res.data;
};

export const getPaymentHistory = async (studentId: string): Promise<FeePayment[]> => {
  const res = await apiClient.get<{ status: string; data: FeePayment[] }>(`/accountant/students/${studentId}/payments`);
  return res.data;
};

// --- Year progression -----------------------------------------------------

export interface UpgradeEligibility {
  eligible: boolean;
  code: 'ELIGIBLE' | 'FEES_PENDING' | 'ALREADY_FINAL' | 'NOT_APPLICABLE';
  reason: string;
  year: string;
  balance: number;
  academicYear: string;
  completedYears: string[];
  currentFees: {
    tuitionFee: number; hostelFee: number; transportFee: number; miscellaneousFee: number;
    customFeeSlots: Array<{ id?: string; name: string; amount: number }>;
    tuitionWaiver: number; hostelWaiver: number; transportWaiver: number; miscWaiver: number;
  };
}

/**
 * Whether this student can move up a year, and the fee structure to prefill
 * the confirmation form with.
 *
 * The server decides. The UI must not compute eligibility from a balance it
 * happens to be holding — that figure can be minutes old, and the rule would
 * then exist in two places and drift.
 */
export const getUpgradeEligibility = async (studentId: string): Promise<UpgradeEligibility> => {
  const res = await apiClient.get<{ status: string; data: UpgradeEligibility }>(
    `/accountant/students/${studentId}/upgrade-eligibility`
  );
  return res.data;
};

export interface UpgradeFees {
  tuitionFee: number; hostelFee: number; transportFee: number; miscellaneousFee: number;
  customFeeSlots: Array<{ name: string; amount: number }>;
  tuitionWaiver: number; hostelWaiver: number; transportWaiver: number; miscWaiver: number;
  academicYear?: string;
}

export const upgradeStudentYear = async (
  studentId: string,
  fees: UpgradeFees
): Promise<StudentProfile> => {
  const res = await apiClient.post<{ status: string; message: string; data: StudentProfile }>(
    `/accountant/students/${studentId}/upgrade`,
    fees
  );
  return res.data;
};

export const getHostelAdmissions = async (): Promise<HostelData> => {
  const res = await apiClient.get<{ status: string; data: HostelData }>('/accountant/hostel');
  return res.data;
};

export const checkoutStudent = async (studentId: string, securityKey?: string): Promise<{ student: StudentProfile }> => {
  const res = await apiClient.patch<{ status: string; data: { student: StudentProfile } }>(
    `/accountant/hostel/checkout/${studentId}`,
    {},
    securityKey ? { headers: { 'x-security-pin': securityKey } } : {}
  );
  return res.data;
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await apiClient.get<{ status: string; data: DashboardSummary }>('/accountant/dashboard-summary');
  return res.data;
};

