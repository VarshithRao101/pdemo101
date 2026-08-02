import { apiClient } from './apiClient';

export interface FeeSettings {
  _id?: string;
  tuition: number;
  hostel: number;
  transport: number;
  misc: number;
  isLocked: boolean;
  academicYear: string;
  installments: string;
  lateFeeRules?: string;
  scholarshipRules?: string;
  discountRules?: string;
}

export interface ExpenditureItem {
  _id?: string;
  id?: string; // fallback for mock compatibility
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface WorkerItem {
  _id?: string;
  id?: string; // fallback for mock compatibility
  workerName: string;
  name?: string; // alias for mock compatibility
  role: string;
  amount: number;
  salary?: number; // alias for mock compatibility
  monthPeriod: string;
  paid: boolean;
  amountPaid?: number;
}

export interface StaffSalaryItem {
  _id?: string;
  id: string; // FAC-xxx
  name: string;
  subject: string;
  salary: number;
  salaryStatus?: 'paid' | 'pending';
  salaryPaymentDate?: string;
  status: 'Active' | 'Inactive';
}

export interface FeeBreakdown {
  baseFee: number;
  tuitionFee: number;
  hostelFee: number;
  transportFee: number;
  miscFee: number;
  previousPending: number;
  scholarshipCategory: string;
  scholarshipPct: number;
  scholarshipDeduction: number;
  individualOverrideDeduction: number;
  tuitionWaiver: number;
  hostelWaiver: number;
  transportWaiver: number;
  miscWaiver: number;
  totalPaid: number;
  remainingBalance: number;
  feeAdjustments?: FeeAdjustment[];
}

export interface FeeAdjustment {
  _id?: string;
  id?: string;
  type?: string;
  amount: number;
  previousBalance: number;
  updatedBalance: number;
  previousFeeTotal: number;
  updatedFeeTotal: number;
  branch?: string;
  note?: string;
  createdAt?: string;
}

export const admin2Service = {
  async getFeeSettings(branch?: string): Promise<FeeSettings> {
    const url = branch ? `/admin2/fee-settings?branch=${encodeURIComponent(branch)}` : '/admin2/fee-settings';
    const res = await apiClient.get<{ status: string; data: FeeSettings }>(url);
    return res.data;
  },

  async updateFeeSettings(settingsData: Partial<FeeSettings> & { branch?: string }): Promise<FeeSettings> {
    const res = await apiClient.patch<{ status: string; data: FeeSettings }>('/admin2/fee-settings', settingsData);
    return res.data;
  },

  // 2. Student Fee Overrides & Breakdown
  async applyFeeOverride(
    studentId: string,
    waiverData: { tuitionWaiver: number; hostelWaiver: number; transportWaiver: number; miscWaiver: number },
    branch?: string
  ): Promise<any> {
    const res = await apiClient.patch<any>(`/admin2/students/${studentId}/fee-override`, branch ? { ...waiverData, branch } : waiverData);
    return res;
  },

  async getFeeBreakdown(studentId: string, branch?: string): Promise<FeeBreakdown> {
    const url = branch ? `/admin2/students/${studentId}/fee-breakdown?branch=${encodeURIComponent(branch)}` : `/admin2/students/${studentId}/fee-breakdown`;
    const res = await apiClient.get<{ status: string; data: FeeBreakdown }>(url);
    return res.data;
  },

  // 3. Expenditure Tracker CRUD
  async getExpenditures(branch?: string): Promise<ExpenditureItem[]> {
    const url = branch ? `/admin2/expenditure?branch=${encodeURIComponent(branch)}` : '/admin2/expenditure';
    const res = await apiClient.get<{ status: string; data: ExpenditureItem[] }>(url);
    return res.data;
  },

  async createExpenditure(expData: { category: string; amount: number; description: string; date?: string; branch?: string }, branch?: string): Promise<ExpenditureItem> {
    const res = await apiClient.post<{ status: string; data: ExpenditureItem }>('/admin2/expenditure', branch ? { ...expData, branch } : expData);
    return res.data;
  },

  async updateExpenditure(id: string, expData: Partial<ExpenditureItem>, branch?: string): Promise<ExpenditureItem> {
    const url = branch ? `/admin2/expenditure/${id}?branch=${encodeURIComponent(branch)}` : `/admin2/expenditure/${id}`;
    const res = await apiClient.patch<{ status: string; data: ExpenditureItem }>(url, branch ? { ...expData, branch } : expData);
    return res.data;
  },

  async deleteExpenditure(id: string, branch?: string, securityKey?: string): Promise<any> {
    const url = branch ? `/admin2/expenditure/${id}?branch=${encodeURIComponent(branch)}` : `/admin2/expenditure/${id}`;
    const res = await apiClient.request<any>(url, {
      method: 'DELETE',
      ...(securityKey ? { headers: { 'x-security-key': securityKey, 'X-Security-OTP': securityKey } } : {})
    });
    return res;
  },

  // 4. Worker Payments CRUD
  async getWorkerPayments(): Promise<WorkerItem[]> {
    const res = await apiClient.get<{ status: string; data: WorkerItem[] }>('/admin2/worker-payments');
    return res.data;
  },

  async createWorkerPayment(workerData: { workerName: string; role: string; amount: number; monthPeriod: string; paid?: boolean }): Promise<WorkerItem> {
    const res = await apiClient.post<{ status: string; data: WorkerItem }>('/admin2/worker-payments', workerData);
    return res.data;
  },

  async updateWorkerPayment(id: string, workerData: Partial<WorkerItem>): Promise<WorkerItem> {
    const res = await apiClient.patch<{ status: string; data: WorkerItem }>(`/admin2/worker-payments/${id}`, workerData);
    return res.data;
  },

  async deleteWorkerPayment(id: string): Promise<any> {
    const res = await apiClient.request<any>(`/admin2/worker-payments/${id}`, { method: 'DELETE' });
    return res;
  },

  // 5. Staff Salaries status & Employee Management
  async getTeachers(): Promise<any[]> {
    const res = await apiClient.get<{ status: string; data: any[] }>('/admin2/teachers');
    return res.data;
  },

  async createTeacher(teacherData: { id: string; name: string; subject: string; salary: number; mobile?: string; branch?: string }): Promise<any> {
    const res = await apiClient.post<any>('/admin2/teachers', teacherData);
    return res.data;
  },

  async deleteTeacher(id: string, securityKey?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (securityKey) {
      headers['x-security-key'] = securityKey;
      headers['X-Security-OTP'] = securityKey;
    }
    const res = await apiClient.request<any>(`/admin2/teachers/${id}`, { method: 'DELETE', headers });
    return res;
  },

  async payTeacherSalary(id: string, payload: { academicYear: string; month: string; amountPaid?: number; paymentMode?: string; note?: string }, securityKey: string): Promise<any> {
    const headers: Record<string, string> = { 'x-security-key': securityKey, 'X-Security-OTP': securityKey };
    const res = await apiClient.request<any>(`/admin2/teachers/${id}/salary-month`, { method: 'POST', body: JSON.stringify(payload), headers });
    return res;
  },

  async getStaffSalaries(): Promise<StaffSalaryItem[]> {
    const res = await apiClient.get<{ status: string; data: StaffSalaryItem[] }>('/admin2/staff-salaries');
    return res.data;
  },

  async toggleStaffSalary(
    teacherId: string,
    payload?: { salaryStatus?: 'paid' | 'pending'; paidAmount?: number }
  ): Promise<any> {
    const res = await apiClient.patch<any>(`/admin2/staff-salaries/${teacherId}`, payload || {});
    return res;
  },

  // 6. Enrollment Stats
  async getEnrollmentStats(): Promise<any[]> {
    const res = await apiClient.get<{ status: string; data: any[] }>('/admin2/enrollment-stats');
    return res.data;
  },

  // 7. Late Fees & Scholarships (Consolidated Read-Only visibility)
  async getLateFeesSettings(): Promise<{ lateFeeRules: string }> {
    const res = await apiClient.get<{ status: string; data: { lateFeeRules: string } }>('/admin2/late-fees-settings');
    return res.data;
  },

  async getScholarships(): Promise<{ scholarshipRules: string }> {
    const res = await apiClient.get<{ status: string; data: { scholarshipRules: string } }>('/admin2/scholarships');
    return res.data;
  }
};
