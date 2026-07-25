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

// ─── Service Functions ────────────────────────────────────────────────────────

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

export const createStudent = async (studentData: Partial<StudentProfile>): Promise<StudentProfile> => {
  const res = await apiClient.post<{ status: string; data: StudentProfile }>('/accountant/students', studentData);
  return res.data;
};

export const updateStudent = async (id: string, fields: Partial<StudentProfile>, securityKey?: string): Promise<StudentProfile> => {
  const res = await apiClient.patch<{ status: string; data: StudentProfile }>(
    `/accountant/students/${id}`,
    fields,
    securityKey ? { headers: { 'x-security-key': securityKey } } : {}
  );
  return res.data;
};

export const deleteStudent = async (id: string, securityKey?: string): Promise<void> => {
  await apiClient.delete(
    `/accountant/students/${id}`,
    securityKey ? { headers: { 'x-security-key': securityKey } } : {}
  );
};

export const updateStudentBio = async (id: string, fields: Partial<StudentProfile>, securityKey?: string): Promise<StudentProfile> => {
  const res = await apiClient.patch<{ status: string; data: StudentProfile }>(
    `/accountant/students/${id}/bio`, 
    fields,
    securityKey ? { headers: { 'x-security-key': securityKey } } : {}
  );
  return res.data;
};

export const recordPayment = async (
  studentId: string,
  paymentData: { amount: number; installment: string; mode: string; category: string; date?: string },
  securityKey?: string
): Promise<{ payment: FeePayment; student: StudentProfile }> => {
  const res = await apiClient.post<{ status: string; data: { payment: FeePayment; student: StudentProfile } }>(
    `/accountant/students/${studentId}/payments`,
    paymentData,
    securityKey ? { headers: { 'x-security-key': securityKey } } : {}
  );
  return res.data;
};

export const getPaymentHistory = async (studentId: string): Promise<FeePayment[]> => {
  const res = await apiClient.get<{ status: string; data: FeePayment[] }>(`/accountant/students/${studentId}/payments`);
  return res.data;
};

export const getHostelAdmissions = async (): Promise<HostelData> => {
  const res = await apiClient.get<{ status: string; data: HostelData }>('/accountant/hostel');
  return res.data;
};

export const allocateRoom = async (roomId: string, studentId: string, securityKey?: string): Promise<{ student: StudentProfile; room: RoomOccupancy }> => {
  const res = await apiClient.patch<{ status: string; data: { student: StudentProfile; room: RoomOccupancy } }>(
    `/accountant/hostel/${roomId}`,
    { studentId },
    securityKey ? { headers: { 'x-security-key': securityKey } } : {}
  );
  return res.data;
};

export const checkoutStudent = async (studentId: string, securityKey?: string): Promise<{ student: StudentProfile }> => {
  const res = await apiClient.patch<{ status: string; data: { student: StudentProfile } }>(
    `/accountant/hostel/checkout/${studentId}`,
    {},
    securityKey ? { headers: { 'x-security-key': securityKey } } : {}
  );
  return res.data;
};

export const getLateFees = async (): Promise<{ lateFeeRules: string }> => {
  const res = await apiClient.get<{ status: string; data: { lateFeeRules: string } }>('/accountant/late-fees-settings');
  return res.data;
};

export const updateLateFees = async (lateFeeRules: string): Promise<{ lateFeeRules: string }> => {
  const res = await apiClient.patch<{ status: string; data: { lateFeeRules: string } }>('/accountant/late-fees-settings', {
    lateFeeRules
  });
  return res.data;
};

export const getScholarships = async (): Promise<{ scholarshipRules: string }> => {
  const res = await apiClient.get<{ status: string; data: { scholarshipRules: string } }>('/accountant/scholarships');
  return res.data;
};

export const updateScholarships = async (scholarshipRules: string): Promise<{ scholarshipRules: string }> => {
  const res = await apiClient.patch<{ status: string; data: { scholarshipRules: string } }>('/accountant/scholarships', {
    scholarshipRules
  });
  return res.data;
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await apiClient.get<{ status: string; data: DashboardSummary }>('/accountant/dashboard-summary');
  return res.data;
};

export const getAttendance = async (date: string): Promise<any[]> => {
  const res = await apiClient.get<{ status: string; data: any[] }>(`/accountant/attendance?date=${encodeURIComponent(date)}`);
  return res.data;
};

export const saveAttendance = async (date: string, records: { id: string; type: string; status: string }[]): Promise<{ status: string; message: string }> => {
  const res = await apiClient.post<{ status: string; message: string }>('/accountant/attendance', { date, records });
  return res;
};

