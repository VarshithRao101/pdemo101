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
      headers['X-Security-OTP'] = otpKey;
      headers['x-security-key'] = otpKey;
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
    if (otpKey) headers['X-Security-OTP'] = otpKey;
    const res = await apiClient.request<{ status: string; message: string }>(`/admin1/teachers/${id}`, { method: 'DELETE', headers });
    return res;
  },

  async payTeacherSalary(id: string, payload: { academicYear: string; month: string; amountPaid?: number; paymentMode?: string; note?: string }, otpKey: string): Promise<any> {
    const headers: Record<string, string> = { 'X-Security-OTP': otpKey };
    const res = await apiClient.request<any>(`/admin1/teachers/${id}/salary-month`, { method: 'POST', body: JSON.stringify(payload), headers });
    return res;
  },

  // Bulletins Desk
  async getBulletins(): Promise<Bulletin[]> {
    const res = await apiClient.get<{ status: string; data: Bulletin[] }>('/admin1/bulletins');
    return res.data;
  },

  // Admission Enquiries
  async getEnquiries(): Promise<any[]> {
    const res = await apiClient.get<{ status: string; data: any[] }>('/enquiries');
    return res.data;
  },

  async updateEnquiryStatus(id: string, status: string, notes?: string): Promise<any> {
    const res = await apiClient.patch<any>(`/enquiries/${id}`, { status, notes });
    return res.data;
  },

  async createBulletin(data: Omit<Bulletin, '_id' | 'id'>): Promise<Bulletin> {
    const res = await apiClient.post<{ status: string; data: Bulletin }>('/admin1/bulletins', data);
    return res.data;
  },

  async updateBulletin(id: string, data: Partial<Bulletin>): Promise<Bulletin> {
    const res = await apiClient.patch<{ status: string; data: Bulletin }>(`/admin1/bulletins/${id}`, data);
    return res.data;
  },

  async deleteBulletin(id: string): Promise<{ status: string; message: string }> {
    const res = await apiClient.request<{ status: string; message: string }>(`/admin1/bulletins/${id}`, { method: 'DELETE' });
    return res;
  },

  // Timetables
  async getTimetable(section: string): Promise<TimetableEntry[]> {
    const res = await apiClient.get<{ status: string; data: TimetableEntry[] }>(`/admin1/timetable?section=${encodeURIComponent(section)}`);
    return res.data;
  },

  async createTimetableEntry(data: { section: string; day: string; period: string; subject: string; teacherId: string }): Promise<TimetableEntry> {
    const res = await apiClient.post<{ status: string; data: TimetableEntry }>('/admin1/timetable', data);
    return res.data;
  },

  async updateTimetableEntry(id: string, data: any): Promise<TimetableEntry> {
    const res = await apiClient.patch<{ status: string; data: TimetableEntry }>(`/admin1/timetable/${id}`, data);
    return res.data;
  },

  async deleteTimetableEntry(id: string): Promise<{ status: string; message: string }> {
    const res = await apiClient.request<{ status: string; message: string }>(`/admin1/timetable/${id}`, { method: 'DELETE' });
    return res;
  },

  async uploadTimetable(section: string, file: File): Promise<{ status: string; message: string; data?: any }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('section', section);
    const res = await apiClient.post<{ status: string; message: string; data?: any }>('/admin1/timetable/upload', formData);
    return res;
  },

  // Sections & Allocations
  async getSections(): Promise<{ sections: string[]; teachers: any[] }> {
    const res = await apiClient.get<{ status: string; data: { sections: string[]; teachers: any[] } }>('/admin1/sections');
    return res.data;
  },

  async allocateStudentsSection(studentIds: string[], section: string): Promise<{ status: string; message: string }> {
    const res = await apiClient.post<{ status: string; message: string }>('/admin1/sections', { type: 'student', studentIds, section });
    return res;
  },

  async allocateTeacherDuty(teacherId: string, assignedSections: string[], assignedSubjects: string[]): Promise<{ status: string; message: string }> {
    const res = await apiClient.post<{ status: string; message: string }>('/admin1/sections', { type: 'teacher', teacherId, assignedSections, assignedSubjects });
    return res;
  },

  // Attendance Summary
  async getAttendanceSummary(section?: string, startDate?: string, endDate?: string): Promise<any[]> {
    let query = '';
    const params: string[] = [];
    if (section) params.push(`section=${encodeURIComponent(section)}`);
    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    if (params.length > 0) query = `?${params.join('&')}`;

    const res = await apiClient.get<{ status: string; data: any[] }>(`/admin1/attendance-summary${query}`);
    return res.data;
  },

  // Reports
  async getReports(): Promise<any> {
    const res = await apiClient.get<{ status: string; data: any }>('/admin1/reports');
    return res.data;
  },

  // Exams Desk
  async getExams(): Promise<ExamInfo[]> {
    const res = await apiClient.get<{ status: string; data: ExamInfo[] }>('/admin1/exams');
    return res.data;
  },

  async scheduleExam(name: string, date: string): Promise<ExamInfo> {
    const res = await apiClient.post<{ status: string; data: ExamInfo }>('/admin1/exams', { name, date });
    return res.data;
  },

  async uploadExamResults(file: File, testTitle?: string, date?: string): Promise<{ status: string; message: string; data?: any }> {
    const formData = new FormData();
    formData.append('file', file);
    if (testTitle) formData.append('testTitle', testTitle);
    if (date) formData.append('date', date);
    const res = await apiClient.post<{ status: string; message: string; data?: any }>('/admin1/exams/upload', formData);
    return res;
  },

  // Academic Year Management
  async getAcademicYears(): Promise<{ activeYear: string; academicYears: any[] }> {
    const res = await apiClient.get<{ status: string; data: { activeYear: string; academicYears: any[] } }>('/admin1/academic-years');
    return res.data;
  },

  async createAcademicYear(payload: { yearId: string; label: string; startDate?: string; endDate?: string; status?: string }): Promise<any> {
    const res = await apiClient.post<any>('/admin1/academic-years', payload);
    return res.data;
  },

  async updateAcademicYearStatus(yearId: string, status: string): Promise<any> {
    const res = await apiClient.patch<any>(`/admin1/academic-years/${yearId}/status`, { status });
    return res.data;
  },

  // Student Promotion
  async promoteStudent(id: string, payload: {
    securityPassword?: string;
    otpInput?: string;
    nextAcademicYear?: string;
    nextCourseYear?: string;
    hostelStatus?: string;
    transportStatus?: string;
    newFeeStructure?: any;
    waivers?: any;
  }): Promise<any> {
    const res = await apiClient.post<any>(`/students/${id}/promote`, payload);
    return res;
  },

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
