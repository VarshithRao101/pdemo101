import { apiClient } from './apiClient';
import type { StudentProfile } from './studentService';

export interface Bulletin {
  _id?: string;
  id?: string;
  category: 'announcement' | 'gallery' | 'event' | 'circular' | 'notice' | 'holiday';
  title: string;
  content: string;
  date?: string;
}

export interface TimetableEntry {
  _id?: string;
  section: string;
  day: string;
  period: string;
  subject: string;
  teacher: any;
}

export interface ExamInfo {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  class: string;
  status: 'Scheduled' | 'Results Published';
  resultsPublished: boolean;
}

export interface AuditLogEntry {
  _id: string;
  actorUsername: string;
  actorRole: string;
  actorName: string;
  actorCampus: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  amount: number | null;
  campus: string;
  outcome: 'success' | 'denied' | 'failed';
  details: Record<string, any>;
  createdAt: string;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  totalAmount: number;
}

export interface AuditLogFilters {
  campus?: string;
  actor?: string;
  action?: string;
  entityType?: string;
  outcome?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export type ClerkPermissionName =
  | 'addStudent' | 'editStudent' | 'editFees' | 'collectFees' | 'logExpenditures';

export type ClerkPermissions = Record<ClerkPermissionName, boolean>;

export interface ClerkSlot {
  slotIndex: number;
  /** False for a slot nobody has provisioned yet — still shown, still empty. */
  exists: boolean;
  username: string;
  name: string;
  status: 'active' | 'inactive';
  permissions: ClerkPermissions;
  /** Whether a credential exists. Never the credential. */
  passwordSet?: boolean;
  lastSeenAt?: string | null;
}

export interface ClerkSaveResult {
  campus: string;
  /** The campus re-read after the write, so the screen shows what was stored. */
  slots: ClerkSlot[];
  changes: Array<{ slotIndex: number; username: string; action: string }>;
  /**
   * Populated only for slots activated in THIS save.
   *
   * The server keeps a bcrypt hash and nothing else, so this response is the
   * only time these values exist in readable form. A caller that discards
   * them cannot ask for them again.
   */
  createdCredentials: Array<{ slotIndex: number; username: string; password: string; pin: string }>;
}

/** Labels for the five toggles, in the order the Rector sees them. */
export const CLERK_PERMISSION_LABELS: Array<{ name: ClerkPermissionName; label: string; help: string }> = [
  { name: 'addStudent', label: 'Add students', help: 'Register new admissions at this campus' },
  { name: 'editStudent', label: 'Edit student details', help: 'Change names, contacts and profile fields' },
  { name: 'editFees', label: 'Edit fees', help: 'Change a student’s fee structure' },
  { name: 'collectFees', label: 'Collect fees', help: 'Take payments and raise receipts' },
  { name: 'logExpenditures', label: 'Log expenditures', help: 'Record campus spending' }
];

export interface PortalAccount {
  id: string;
  username: string;
  role: string;
  campus: string;
  name: string;
  slotIndex: number | null;
  status: string;
  /** Null when the account still holds a pre-change bcrypt hash. */
  password: string | null;
  pin: string | null;
  passwordReadable: boolean;
  pinReadable: boolean;
  credentialsUpdatedAt: string | null;
}

export const admin1Service = {
  // --- Credentials ------------------------------------------------------
  /**
   * Every account with its credentials.
   *
   * A POST rather than a GET on purpose: it carries the Rector's PIN, and the
   * response is the most sensitive body this API produces — a GET would sit
   * in browser history and in any intermediary that caches by URL.
   */
  async getCredentials(pin: string): Promise<{ accounts: PortalAccount[]; legacyHashedCount: number }> {
    const res = await apiClient.request<{ status: string; data: { accounts: PortalAccount[]; legacyHashedCount: number } }>(
      '/admin1/credentials',
      { method: 'POST', headers: { 'x-security-pin': pin }, body: JSON.stringify({}) }
    );
    return res.data;
  },

  async setCredentials(
    id: string,
    changes: { username?: string; password?: string; pin?: string },
    rectorPin: string
  ): Promise<{ message: string; username: string; password: string | null; pin: string | null }> {
    const res = await apiClient.request<{ status: string; message: string; data: any }>(
      `/admin1/credentials/${encodeURIComponent(id)}`,
      { method: 'PUT', headers: { 'x-security-pin': rectorPin }, body: JSON.stringify(changes) }
    );
    return { message: res.message, ...res.data };
  },

  // --- Clerk slots ------------------------------------------------------
  async getClerks(campus: string): Promise<{ campus: string; slotsPerCampus: number; slots: ClerkSlot[] }> {
    const res = await apiClient.get<{ status: string; data: { campus: string; slotsPerCampus: number; slots: ClerkSlot[] } }>(
      `/admin1/clerks?campus=${encodeURIComponent(campus)}`
    );
    return res.data;
  },

  /**
   * Save one campus's clerk configuration.
   *
   * `pin` is the Rector's own six-digit PIN and is sent as a header rather
   * than in the body, so it never lands in a request log that records bodies.
   */
  async saveClerks(
    campus: string,
    slots: Array<{ slotIndex: number; active: boolean; permissions: ClerkPermissions }>,
    pin: string
  ): Promise<ClerkSaveResult> {
    const res = await apiClient.request<{ status: string; message: string; data: ClerkSaveResult }>(
      '/admin1/clerks',
      {
        method: 'POST',
        body: JSON.stringify({ campus, slots }),
        headers: { 'x-security-pin': pin }
      }
    );
    return res.data;
  },

  // --- Audit trail ------------------------------------------------------
  async getLogs(filters: AuditLogFilters = {}): Promise<AuditLogPage> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '' && value !== 'All') {
        params.set(key, String(value));
      }
    });
    const query = params.toString();
    const res = await apiClient.get<{ status: string; data: AuditLogPage }>(
      `/admin1/logs${query ? `?${query}` : ''}`
    );
    return res.data;
  },

  async getLogFilters(): Promise<{ actors: string[]; actions: string[]; campuses: string[] }> {
    const res = await apiClient.get<{ status: string; data: { actors: string[]; actions: string[]; campuses: string[] } }>(
      '/admin1/logs/filters'
    );
    return res.data;
  },

  // Students Registry
  async getStudents(search = '', branch = ''): Promise<StudentProfile[]> {
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (branch && branch !== 'All') params.push(`branch=${encodeURIComponent(branch)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    const res = await apiClient.get<{ status: string; data: StudentProfile[] }>(`/admin1/students${query}`);
    // Guard: if backend returns unexpected shape, return empty array rather than crashing with TypeError
    if (!res || !Array.isArray(res.data)) return [];
    return res.data;
  },

  // The create route used to also return a `credential` with a generated
  // six-digit PIN. Nothing created a student login to match it and nothing
  // displayed it, so it has been removed rather than left as a password that
  // opens nothing.
  async provisionStudent(studentData: any): Promise<{ status: string, data: StudentProfile }> {
    const res = await apiClient.post<any>('/admin/students', studentData);
    return res;
  },

  async updateStudent(id: string, updateData: any): Promise<StudentProfile> {
    const res = await apiClient.patch<{ status: string; data: StudentProfile }>(`/admin1/students/${id}`, updateData);
    return res.data;
  },

  async deleteStudent(id: string, otpKey?: string): Promise<{ status: string, message: string }> {
    const headers: Record<string, string> = {};
    const body: Record<string, string> = {};
    if (otpKey) {
      headers['x-security-pin'] = otpKey;
      headers['x-security-pin'] = otpKey;
      body.otp = otpKey;
    }
    const res = await apiClient.request<{ status: string; message: string }>(`/admin1/students/${id}`, {
      method: 'DELETE',
      headers,
      ...(otpKey ? { body: JSON.stringify(body) } : {})
    });
    return res;
  },

  async deactivateStudent(id: string, otpKey?: string): Promise<{ status: string, message: string }> {
    return this.deleteStudent(id, otpKey);
  },

  // Faculty Management
  async getTeachers(branch?: string): Promise<any[]> {
    const url = branch ? `/admin1/teachers?branch=${encodeURIComponent(branch)}` : '/admin1/teachers';
    const res = await apiClient.get<{ status: string; data: any[] }>(url);
    return res.data;
  },

  async createTeacher(teacherData: { id: string; name: string; subject: string; salary: number; mobile?: string; branch?: string }): Promise<any> {
    const res = await apiClient.post<any>('/admin1/teachers', teacherData);
    return res.data;
  },

  async updateTeacher(id: string, updateData: any): Promise<any> {
    const res = await apiClient.patch<any>(`/admin1/teachers/${id}`, updateData);
    return res.data;
  },

  async deleteTeacher(id: string, otpKey?: string): Promise<{ status: string; message: string }> {
    const headers: Record<string, string> = {};
    if (otpKey) headers['x-security-pin'] = otpKey;
    const res = await apiClient.request<{ status: string; message: string }>(`/admin1/teachers/${id}`, { method: 'DELETE', headers });
    return res;
  },

  async payTeacherSalary(id: string, payload: { academicYear: string; month: string; amountPaid?: number; paymentMode?: string; note?: string }, otpKey?: string): Promise<any> {
    const headers: Record<string, string> = otpKey ? { 'x-security-pin': otpKey } : {};
    const res = await apiClient.request<any>(`/admin1/teachers/${id}/salary-month`, { method: 'POST', body: JSON.stringify(payload), headers });
    return res;
  },

  // Bulletins Desk
  // Admission Enquiries
  async getEnquiries(): Promise<any[]> {
    const res = await apiClient.get<{ status: string; data: any[] }>('/enquiries');
    return res.data;
  },

  async updateEnquiryStatus(id: string, status: string, notes?: string): Promise<any> {
    const res = await apiClient.patch<any>(`/enquiries/${id}`, { status, notes });
    return res.data;
  },

  // Timetables
  // Sections & Allocations
  async getSections(): Promise<{ sections: string[]; teachers: any[] }> {
    const res = await apiClient.get<{ status: string; data: { sections: string[]; teachers: any[] } }>('/admin1/sections');
    return res.data;
  },

  // Attendance Summary
  // Reports
  async getReports(): Promise<any> {
    const res = await apiClient.get<{ status: string; data: any }>('/admin1/reports');
    return res.data;
  },

  // Exams Desk
  // Academic Year Management
  // Student Promotion
  // Teacher Monthly Salary
  async updateTeacherMonthlySalary(id: string, payload: {
    academicYear?: string;
    monthKey?: string;
    expectedSalary?: number;
    paidAmount?: number;
    paymentDate?: string;
    paymentMode?: string;
    referenceNumber?: string;
    notes?: string;
    approvedBy?: string;
    isHoliday?: boolean;
  }): Promise<any> {
    const res = await apiClient.post<any>(`/teachers/${id}/salary-month`, payload);
    return res;
  }
};
