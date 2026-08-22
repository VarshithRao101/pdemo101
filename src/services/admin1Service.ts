import { apiClient, asListPage, type ListPage } from './apiClient';

/** One row in the Rector's Recently Deleted screen. */
export interface DeletedEntry {
  type: 'student' | 'expenditure' | 'worker_payment' | 'teacher';
  collection: string;
  id: string;
  reference: string;
  label: string;
  campus: string;
  amount: number | null;
  deletedAt: string;
  deletedBy: string;
  deletedReason: string;
  /** Receipts that would come back with a student. Null for anything else. */
  attachedPayments: number | null;
}
import type { StudentProfile } from './studentService';

export interface Bulletin {
  _id?: string;
  id?: string;
  category: 'announcement' | 'gallery' | 'event' | 'circular' | 'notice' | 'holiday';
  title: string;
  content: string;
  date?: string;
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
  | 'addStudent' | 'editStudent' | 'editFees' | 'collectFees' | 'logExpenditures' | 'manageStaff'
  | 'manageEnquiries';

export type ClerkPermissions = Record<ClerkPermissionName, boolean>;

export interface Clerk {
  id: string;
  username: string;
  name: string;
  campus: string;
  status: 'active' | 'inactive';
  mobile: string;
  email: string;
  /** Readable, because credentials are stored readable. Null only for an
   *  account still holding a credential from before that change. */
  password: string | null;
  pin: string | null;
  permissions: ClerkPermissions;
  slotIndex: number | null;
  createdAt?: string | null;
  lastSeenAt?: string | null;
}

export interface CampusClerks {
  campus: string;
  clerks: Clerk[];
  maxPerCampus: number;
  remaining: number;
}

/** The details the Rector fills in on step one of adding a clerk. */
export interface NewClerk {
  campus: string;
  name: string;
  username: string;
  password: string;
  pin: string;
  mobile?: string;
  email?: string;
  permissions: ClerkPermissions;
  active?: boolean;
}

/** Labels for the toggles, in the order the Rector sees them. */
export const CLERK_PERMISSION_LABELS: Array<{ name: ClerkPermissionName; label: string; help: string }> = [
  { name: 'addStudent', label: 'Add students', help: 'Register new admissions at this campus' },
  { name: 'editStudent', label: 'Edit student details', help: 'Change names, contacts and profile fields' },
  { name: 'editFees', label: 'Edit fees', help: 'Change a student’s fee structure' },
  { name: 'collectFees', label: 'Collect fees', help: 'Take payments and raise receipts' },
  { name: 'logExpenditures', label: 'Log expenditures', help: 'Record campus spending' },
  { name: 'manageStaff', label: 'Manage staff', help: 'Teachers, staff salaries and worker payments' },
  { name: 'manageEnquiries', label: 'Admission enquiries', help: 'Read and update enquiries for this campus' }
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

  // --- Clerks -----------------------------------------------------------
  //
  // Every one of these carries the Rector's own PIN. The screen collects it
  // once on entry and passes it down, so nothing inside prompts again.

  async getClerks(campus: string, pin: string): Promise<CampusClerks> {
    const res = await apiClient.request<{ status: string; data: CampusClerks }>(
      `/admin1/clerks?campus=${encodeURIComponent(campus)}`,
      { method: 'GET', headers: { 'x-security-pin': pin } }
    );
    return res.data;
  },

  async createClerk(clerk: NewClerk, pin: string): Promise<CampusClerks & { message: string }> {
    const res = await apiClient.request<{ status: string; message: string; data: CampusClerks }>(
      '/admin1/clerks',
      { method: 'POST', headers: { 'x-security-pin': pin }, body: JSON.stringify(clerk) }
    );
    return { ...res.data, message: res.message };
  },

  async updateClerk(
    id: string,
    changes: Partial<Omit<NewClerk, 'campus'>> & { active?: boolean },
    pin: string
  ): Promise<CampusClerks & { message: string }> {
    const res = await apiClient.request<{ status: string; message: string; data: CampusClerks }>(
      `/admin1/clerks/${encodeURIComponent(id)}`,
      { method: 'PATCH', headers: { 'x-security-pin': pin }, body: JSON.stringify(changes) }
    );
    return { ...res.data, message: res.message };
  },

  async deleteClerk(id: string, pin: string): Promise<CampusClerks & { message: string }> {
    const res = await apiClient.request<{ status: string; message: string; data: CampusClerks }>(
      `/admin1/clerks/${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: { 'x-security-pin': pin } }
    );
    return { ...res.data, message: res.message };
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
  // `search` is applied by the SERVER now. It was always sent and never read,
  // so every screen downloaded the whole registry and filtered it in the
  // browser; the response is bounded, so that no longer works.
  //
  // asListPage absorbs a malformed or empty response into an empty page, so
  // the old "return [] rather than crash with a TypeError" guard is kept
  // without every caller having to repeat it.
  async getStudents(search = '', branch = ''): Promise<ListPage<StudentProfile>> {
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (branch && branch !== 'All') params.push(`branch=${encodeURIComponent(branch)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    const res = await apiClient.get<any>(`/admin1/students${query}`);
    return asListPage<StudentProfile>(res);
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

  // Sections & Allocations
  async getSections(): Promise<{ sections: string[]; teachers: any[] }> {
    const res = await apiClient.get<{ status: string; data: { sections: string[]; teachers: any[] } }>('/admin1/sections');
    return res.data;
  },

  // Reports
  async getReports(): Promise<any> {
    const res = await apiClient.get<{ status: string; data: any }>('/admin1/reports');
    return res.data;
  },

  // --- Recently Deleted (undo window) ---
  async getRecentlyDeleted(): Promise<ListPage<DeletedEntry>> {
    const res = await apiClient.get<any>('/admin1/recently-deleted');
    return asListPage<DeletedEntry>(res);
  },

  // The PIN travels as a header on this one call rather than through the
  // global key, because restoring writes records back into the live books.
  async restoreDeleted(type: string, id: string, securityPin: string): Promise<{ message: string }> {
    return apiClient.request<any>(`/admin1/recently-deleted/${type}/${id}/restore`, {
      method: 'POST',
      headers: { 'x-security-pin': securityPin }
    });
  },

  // --- Lockout recovery ---
  async unlockAccount(id: string, securityPin: string): Promise<{ message: string }> {
    return apiClient.request<any>(`/admin1/accounts/${id}/unlock`, {
      method: 'POST',
      headers: { 'x-security-pin': securityPin }
    });
  },

  // updateTeacherMonthlySalary was removed with the route it called: it
  // posted to /teachers/:id/salary-month, which discarded every write. Use
  // payTeacherSalary above, which is what the portal uses.
};
