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

export const admin1Service = {
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

  async provisionStudent(studentData: any): Promise<{ status: string, data: StudentProfile, credential: { pin: string, username: string } }> {
    // Note: POST /api/admin/students exists from Prompt 7
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
