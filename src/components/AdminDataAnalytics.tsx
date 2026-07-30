import React, { useState, useMemo } from 'react';

export interface Student {
  _id?: string;
  id: string;
  name: string;
  admissionNumber: string;
  registrationNumber?: string;
  studentId?: string;
  course: string;
  year?: string;
  section: string;
  branch: string;
  status: 'Active' | 'Inactive';
  tuitionFee?: number;
  hostelFee?: number;
  transportFee?: number;
  miscellaneousFee?: number;
  tuitionWaiver?: number;
  hostelWaiver?: number;
  transportWaiver?: number;
  miscWaiver?: number;
  totalPaid?: number;
  remainingBalance?: number;
  documents?: string[];
}

export interface Teacher {
  _id?: string;
  id: string;
  name: string;
  role?: string;
  classification?: 'Teaching' | 'Non-Teaching';
  subject: string;
  salary: number;
  status: 'Active' | 'Inactive';
  salaryStatus?: 'paid' | 'pending';
  salaryPaidAmount?: number;
  branch?: string;
  monthlySalaries?: Record<string, {
    month: string;
    status: 'Paid' | 'Unpaid';
    amountPaid: number;
    paymentDate: string;
  }>;
}

export interface ExpenditureItem {
  _id?: string;
  id?: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  branch?: string;
}

interface AdminDataAnalyticsProps {
  students: Student[];
  teachers: Teacher[];
  expenditures: ExpenditureItem[];
  feeSettings?: any;
}

const CAMPUSES = [
  'Overall',
  'Erragattugutta C1',
  'Erragattugutta C2',
  'Beemaram C1',
  'Beemaram C2'
];

export const AdminDataAnalytics: React.FC<AdminDataAnalyticsProps> = ({
  students = [],
  teachers = [],
  expenditures = []
}) => {
  const [selectedCampus, setSelectedCampus] = useState<string>('Overall');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('All Years');
  const [activeSlot, setActiveSlot] = useState<'all' | 'students' | 'fees' | 'faculty' | 'expenditure'>('all');

  // Chart View Modes
  const [studentChartView, setStudentChartView] = useState<'bar' | 'donut' | 'year'>('bar');
  const [feeChartView, setFeeChartView] = useState<'comparison' | 'meter' | 'allocation'>('comparison');
  const [expenditureChartView, setExpenditureChartView] = useState<'donut' | 'bars'>('donut');

  // Tooltip hover states
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // --- FILTERED DATASETS ---
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedCampus !== 'Overall') {
      list = list.filter(s => s.branch === selectedCampus);
    }
    if (selectedAcademicYear !== 'All Years') {
      list = list.filter(s => (s as any).academicYear === selectedAcademicYear || (s as any).academicYears?.some((h: any) => h.academicYear === selectedAcademicYear));
    }
    return list;
  }, [students, selectedCampus, selectedAcademicYear]);

  const filteredTeachers = useMemo(() => {
    if (selectedCampus === 'Overall') return teachers;
    return teachers.filter(t => t.branch === selectedCampus);
  }, [teachers, selectedCampus]);

  const filteredExpenditures = useMemo(() => {
    if (selectedCampus === 'Overall') return expenditures;
    return expenditures.filter(e => e.branch === selectedCampus);
  }, [expenditures, selectedCampus]);

  // --- 1. STUDENTS ANALYTICS ---
  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter(s => s.status === 'Active').length;

  const courseCounts = useMemo(() => {
    const counts: Record<string, number> = { MPC: 0, BiPC: 0, CEC: 0, MEC: 0, HEC: 0, Other: 0 };
    filteredStudents.forEach(s => {
      const c = (s.course || '').trim().toUpperCase();
      if (counts[c] !== undefined) counts[c]++;
      else counts.Other++;
    });
    return counts;
  }, [filteredStudents]);

  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = { '1st Year': 0, '2nd Year': 0, 'Short Term': 0 };
    filteredStudents.forEach(s => {
      const y = s.year || '1st Year';
      if (counts[y] !== undefined) counts[y]++;
      else counts['1st Year']++;
    });
    return counts;
  }, [filteredStudents]);

  const hostelStudentsCount = useMemo(() => {
    return filteredStudents.filter(s => (s.hostelFee || 0) > 0 || (s.documents || []).includes('Hostel')).length;
  }, [filteredStudents]);

  const transportStudentsCount = useMemo(() => {
    return filteredStudents.filter(s => (s.transportFee || 0) > 0 || (s.documents || []).includes('Transport')).length;
  }, [filteredStudents]);

  // --- 2. FEES ANALYTICS ---
  const feeMetrics = useMemo(() => {
    let grossAssigned = 0;
    let totalWaivers = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let tuitionTotal = 0;
    let hostelTotal = 0;
    let transportTotal = 0;
    let miscTotal = 0;

    filteredStudents.forEach(s => {
      const tFee = Number(s.tuitionFee ?? 120000);
      const hFee = Number(s.hostelFee ?? 85000);
      const trFee = Number(s.transportFee ?? 0);
      const mFee = Number(s.miscellaneousFee ?? 5000);

      const tWaiver = Number(s.tuitionWaiver ?? 0);
      const hWaiver = Number(s.hostelWaiver ?? 0);
      const trWaiver = Number(s.transportWaiver ?? 0);
      const mWaiver = Number(s.miscWaiver ?? 0);

      const sGross = tFee + hFee + trFee + mFee;
      const sWaiver = tWaiver + hWaiver + trWaiver + mWaiver;
      const sPaid = Number(s.totalPaid ?? 0);
      const sRem = Number(s.remainingBalance ?? Math.max(0, sGross - sWaiver - sPaid));

      grossAssigned += sGross;
      totalWaivers += sWaiver;
      totalPaid += sPaid;
      totalDue += sRem;

      tuitionTotal += Math.max(0, tFee - tWaiver);
      hostelTotal += Math.max(0, hFee - hWaiver);
      transportTotal += Math.max(0, trFee - trWaiver);
      miscTotal += Math.max(0, mFee - mWaiver);
    });

    const netFee = Math.max(1, grossAssigned - totalWaivers);
    const collectionEfficiency = Math.round((totalPaid / netFee) * 100);

    return {
      grossAssigned,
      totalWaivers,
      netFee,
      totalPaid,
      totalDue,
      collectionEfficiency,
      tuitionTotal,
      hostelTotal,
      transportTotal,
      miscTotal
    };
  }, [filteredStudents]);

  // Branch-wise Fee comparison
  const campusFeeComparison = useMemo(() => {
    const list = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];
    return list.map(cName => {
      const cStus = students.filter(s => s.branch === cName);
      const cPaid = cStus.reduce((sum, s) => sum + Number(s.totalPaid || 0), 0);
      const cDue = cStus.reduce((sum, s) => sum + Number(s.remainingBalance || 0), 0);
      return { campus: cName, paid: cPaid, due: cDue, count: cStus.length };
    });
  }, [students]);

  // --- 3. FACULTY & STAFF ANALYTICS ---
  const facultyMetrics = useMemo(() => {
    const totalStaff = filteredTeachers.length;
    let teachingCount = 0;
    let nonTeachingCount = 0;
    let totalMonthlySalary = 0;

    filteredTeachers.forEach(t => {
      const cls = (t.classification || '').toLowerCase();
      const role = (t.role || '').toLowerCase();
      const isTeaching = cls === 'teaching' || role.includes('professor') || role.includes('lecturer') || role.includes('teacher');
      if (isTeaching) teachingCount++;
      else nonTeachingCount++;

      totalMonthlySalary += Number(t.salary || 0);
    });

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthlyLedger = months.map(m => {
      let mPaid = 0;
      let mUnpaid = 0;
      filteredTeachers.forEach(t => {
        const mObj = t.monthlySalaries?.[m];
        if (mObj && mObj.status === 'Paid') {
          mPaid += Number(mObj.amountPaid || t.salary || 0);
        } else {
          mUnpaid += Number(t.salary || 0);
        }
      });
      return { month: m, paid: mPaid, unpaid: mUnpaid };
    });

    return {
      totalStaff,
      teachingCount,
      nonTeachingCount,
      totalMonthlySalary,
      monthlyLedger
    };
  }, [filteredTeachers]);

  // --- 4. EXPENDITURE ANALYTICS ---
  const expenditureMetrics = useMemo(() => {
    const totalExp = filteredExpenditures.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const sectors: Record<string, number> = {
      'Utilities & Electricity': 0,
      'Maintenance & Repairs': 0,
      'Lab & Science Equipment': 0,
      'Fleet & Vehicle Maintenance': 0,
      'Mess, Catering & Supplies': 0,
      'Events & Publications': 0,
      'Miscellaneous': 0
    };

    filteredExpenditures.forEach(e => {
      const desc = (e.description || e.category || '').toLowerCase();
      const amt = Number(e.amount || 0);
      if (desc.includes('electr') || desc.includes('power') || desc.includes('water')) sectors['Utilities & Electricity'] += amt;
      else if (desc.includes('maint') || desc.includes('plumb') || desc.includes('repair')) sectors['Maintenance & Repairs'] += amt;
      else if (desc.includes('lab') || desc.includes('chem') || desc.includes('equip')) sectors['Lab & Science Equipment'] += amt;
      else if (desc.includes('bus') || desc.includes('fleet') || desc.includes('vehicle') || desc.includes('fuel')) sectors['Fleet & Vehicle Maintenance'] += amt;
      else if (desc.includes('mess') || desc.includes('food') || desc.includes('cater')) sectors['Mess, Catering & Supplies'] += amt;
      else if (desc.includes('event') || desc.includes('sport') || desc.includes('print')) sectors['Events & Publications'] += amt;
      else sectors['Miscellaneous'] += amt;
    });

    const campusExp = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].map(cName => {
      const cExpList = expenditures.filter(e => e.branch === cName);
      const amt = cExpList.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { campus: cName, amount: amt, count: cExpList.length };
    });

    return {
      totalExp,
      sectors,
      campusExp
    };
  }, [filteredExpenditures, expenditures]);

  // Color constants
  const STREAM_COLORS: Record<string, string> = {
    MPC: '#2563EB',
    BiPC: '#059669',
    CEC: '#D97706',
    MEC: '#7C3AED',
    HEC: '#DB2777',
    Other: '#475569'
  };

  const SECTOR_COLORS: string[] = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="anim-slide-up">
      {/* OVERVIEW FILTER HEADER */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '18px 22px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              DATA SCIENCE & ERP ANALYTICS ENGINE
            </span>
            <span style={{
              backgroundColor: 'rgba(16,185,129,0.12)',
              color: '#10B981',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              Live Database Connected
            </span>
          </div>
          <h2 style={{ margin: '6px 0 0', fontSize: '20px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {selectedCampus === 'Overall' ? 'Institutional Overview (All Campuses)' : `${selectedCampus} Campus Analytics`}
          </h2>
        </div>

        {/* CAMPUS & ACADEMIC YEAR SELECTOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Academic Year:</span>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 800,
                backgroundColor: '#F8FAFC',
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All Years">All Academic Years</option>
              <option value="2026-27">2026-27 (Active Session)</option>
              <option value="2025-26">2025-26 (Past Session)</option>
              <option value="2027-28">2027-28 (Upcoming Session)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Campus:</span>
            {CAMPUSES.map(c => {
              const isSel = selectedCampus === c;
              return (
                <button
                  key={c}
                  onClick={() => setSelectedCampus(c)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: isSel ? '1.5px solid #0F172A' : '1px solid #CBD5E1',
                    backgroundColor: isSel ? '#0F172A' : '#F8FAFC',
                    color: isSel ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSel ? '0 4px 12px rgba(15,23,42,0.18)' : 'none'
                  }}
                  className="press-interactive"
                >
                  {c === 'Overall' ? 'Overall' : c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4 CORE SLOTS NAVIGATION BAR */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <button
          onClick={() => setActiveSlot(prev => prev === 'students' ? 'all' : 'students')}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: activeSlot === 'students' ? '2px solid #0F172A' : '1px solid #E2E8F0',
            backgroundColor: activeSlot === 'students' ? '#0F172A' : '#FFFFFF',
            color: activeSlot === 'students' ? '#FFFFFF' : '#475569',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeSlot === 'students' ? '0 4px 12px rgba(15,23,42,0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
          className="press-interactive"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          <span style={{ color: activeSlot === 'students' ? '#FFFFFF' : '#475569' }}>1. Students ({totalStudents})</span>
        </button>

        <button
          onClick={() => setActiveSlot(prev => prev === 'fees' ? 'all' : 'fees')}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: activeSlot === 'fees' ? '2px solid #0F172A' : '1px solid #E2E8F0',
            backgroundColor: activeSlot === 'fees' ? '#0F172A' : '#FFFFFF',
            color: activeSlot === 'fees' ? '#FFFFFF' : '#475569',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeSlot === 'fees' ? '0 4px 12px rgba(15,23,42,0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
          className="press-interactive"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span style={{ color: activeSlot === 'fees' ? '#FFFFFF' : '#475569' }}>2. Fees (₹{(feeMetrics.totalPaid / 100000).toFixed(1)}L)</span>
        </button>

        <button
          onClick={() => setActiveSlot(prev => prev === 'faculty' ? 'all' : 'faculty')}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: activeSlot === 'faculty' ? '2px solid #0F172A' : '1px solid #E2E8F0',
            backgroundColor: activeSlot === 'faculty' ? '#0F172A' : '#FFFFFF',
            color: activeSlot === 'faculty' ? '#FFFFFF' : '#475569',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeSlot === 'faculty' ? '0 4px 12px rgba(15,23,42,0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
          className="press-interactive"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span style={{ color: activeSlot === 'faculty' ? '#FFFFFF' : '#475569' }}>3. Faculty ({facultyMetrics.totalStaff})</span>
        </button>

        <button
          onClick={() => setActiveSlot(prev => prev === 'expenditure' ? 'all' : 'expenditure')}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: activeSlot === 'expenditure' ? '2px solid #0F172A' : '1px solid #E2E8F0',
            backgroundColor: activeSlot === 'expenditure' ? '#0F172A' : '#FFFFFF',
            color: activeSlot === 'expenditure' ? '#FFFFFF' : '#475569',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeSlot === 'expenditure' ? '0 4px 12px rgba(15,23,42,0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
          className="press-interactive"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <span style={{ color: activeSlot === 'expenditure' ? '#FFFFFF' : '#475569' }}>4. Expenditure (₹{(expenditureMetrics.totalExp / 100000).toFixed(1)}L)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SLOT 1: STUDENTS VISUALIZER ENGINE */}
      {/* ========================================================================= */}
      {(activeSlot === 'all' || activeSlot === 'students') && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Header & Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>SLOT 1: Student Demographics & Stream Visualizer</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Interactive SVG stream distributions, enrolment cohorts, and academic year charts</p>
              </div>
            </div>

            {/* Visualizer Mode Toggle Buttons */}
            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setStudentChartView('bar')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: studentChartView === 'bar' ? '#0F172A' : 'transparent',
                  color: studentChartView === 'bar' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Stream Bar Visualizer
              </button>
              <button
                onClick={() => setStudentChartView('donut')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: studentChartView === 'donut' ? '#0F172A' : 'transparent',
                  color: studentChartView === 'donut' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Proportion Donut
              </button>
              <button
                onClick={() => setStudentChartView('year')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: studentChartView === 'year' ? '#0F172A' : 'transparent',
                  color: studentChartView === 'year' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Year Cohorts
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Active Enrolments</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>{activeStudents}</div>
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>{totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}% Active Status</span>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Science Stream (MPC+BiPC)</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>{courseCounts.MPC + courseCounts.BiPC}</div>
              <span style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 700 }}>MPC: {courseCounts.MPC} | BiPC: {courseCounts.BiPC}</span>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Hostels & Transportation</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#7C3AED', marginTop: '4px' }}>{hostelStudentsCount}</div>
              <span style={{ fontSize: '11px', color: '#6D28D9', fontWeight: 700 }}>Hostelites ({transportStudentsCount} Bus commuters)</span>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Senior 2nd Years</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#D97706', marginTop: '4px' }}>{yearCounts['2nd Year']}</div>
              <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 700 }}>1st Year: {yearCounts['1st Year']}</span>
            </div>
          </div>

          {/* DYNAMIC INTERACTIVE GRAPH CONTAINER */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            {studentChartView === 'bar' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                    Interactive Stream Distribution (MPC, BiPC, CEC, MEC, HEC, Other)
                  </h4>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Total Students: {totalStudents}</span>
                </div>

                {/* SVG BAR GRAPH */}
                <div style={{ width: '100%', height: '220px', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '16px', borderBottom: '2px solid #CBD5E1', paddingBottom: '8px', paddingTop: '20px' }}>
                  {Object.entries(courseCounts).map(([cName, count]) => {
                    const maxVal = Math.max(1, ...Object.values(courseCounts));
                    const heightPct = Math.max(8, Math.round((count / maxVal) * 100));
                    const barColor = STREAM_COLORS[cName] || '#475569';
                    const isHovered = hoveredBar === cName;

                    return (
                      <div
                        key={cName}
                        onMouseEnter={() => setHoveredBar(cName)}
                        onMouseLeave={() => setHoveredBar(null)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        {/* Tooltip on hover */}
                        {isHovered && (
                          <div style={{
                            position: 'absolute',
                            top: '-32px',
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                            zIndex: 10
                          }}>
                            {cName}: {count} students ({totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0}%)
                          </div>
                        )}

                        <span style={{ fontSize: '12px', fontWeight: 900, color: barColor, marginBottom: '6px' }}>{count}</span>
                        
                        {/* Animated Bar Column */}
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '48px',
                            height: `${heightPct}%`,
                            backgroundColor: barColor,
                            borderRadius: '8px 8px 0 0',
                            transition: 'all 0.3s ease',
                            opacity: isHovered ? 1 : 0.85,
                            transform: isHovered ? 'scaleY(1.05)' : 'none',
                            transformOrigin: 'bottom',
                            boxShadow: isHovered ? `0 6px 16px ${barColor}40` : 'none'
                          }}
                        />

                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', marginTop: '8px' }}>{cName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {studentChartView === 'donut' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
                {/* SVG DONUT CHART */}
                <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                  <svg width="180" height="180" viewBox="0 0 100 100">
                    {(() => {
                      let cumulativePct = 0;
                      return Object.entries(courseCounts).map(([cName, count], idx) => {
                        const pct = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
                        if (pct <= 0) return null;
                        
                        const strokeDasharray = `${pct} ${100 - pct}`;
                        const strokeDashoffset = -cumulativePct;
                        cumulativePct += pct;
                        const color = STREAM_COLORS[cName] || SECTOR_COLORS[idx % SECTOR_COLORS.length];

                        return (
                          <circle
                            key={cName}
                            cx="50"
                            cy="50"
                            r="35"
                            fill="transparent"
                            stroke={color}
                            strokeWidth="18"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 50 50)"
                            pathLength="100"
                            style={{ transition: 'all 0.5s ease' }}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>{totalStudents}</div>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>Total Students</div>
                  </div>
                </div>

                {/* LEGEND BADGES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1, minWidth: '220px' }}>
                  {Object.entries(courseCounts).map(([cName, count]) => {
                    const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                    return (
                      <div key={cName} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: STREAM_COLORS[cName] || '#475569' }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>{cName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{count} ({pct}%)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {studentChartView === 'year' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Academic Year Split Visualizer
                </h4>
                {Object.entries(yearCounts).map(([yName, count]) => {
                  const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                  const barColor = yName.includes('1st') ? '#10B981' : yName.includes('2nd') ? '#2563EB' : '#F59E0B';
                  return (
                    <div key={yName}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                        <span>{yName}</span>
                        <span>{count} Students ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '18px', backgroundColor: '#E2E8F0', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: '10px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLOT 2: FEES VISUALIZER ENGINE */}
      {/* ========================================================================= */}
      {(activeSlot === 'all' || activeSlot === 'fees') && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Header & Mode Switcher */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>SLOT 2: Fees & Revenue Collections Engine</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Live collection vs. outstanding due visualizer across all 4 campuses</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setFeeChartView('comparison')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: feeChartView === 'comparison' ? '#0F172A' : 'transparent',
                  color: feeChartView === 'comparison' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Multi-Campus Visualizer
              </button>
              <button
                onClick={() => setFeeChartView('meter')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: feeChartView === 'meter' ? '#0F172A' : 'transparent',
                  color: feeChartView === 'meter' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Efficiency Gauge
              </button>
              <button
                onClick={() => setFeeChartView('allocation')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: feeChartView === 'allocation' ? '#0F172A' : 'transparent',
                  color: feeChartView === 'allocation' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Allocation Breakdown
              </button>
            </div>
          </div>

          {/* Core Metric Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '14px', border: '1px solid #BBF7D0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Collected Revenue</span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>₹{feeMetrics.totalPaid.toLocaleString('en-IN')}</div>
              <span style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>Logged by Accountants</span>
            </div>

            <div style={{ backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '14px', border: '1px solid #FECACA' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>Outstanding Due</span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#DC2626', marginTop: '4px' }}>₹{feeMetrics.totalDue.toLocaleString('en-IN')}</div>
              <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 700 }}>Pending Student Balances</span>
            </div>

            <div style={{ backgroundColor: '#FFFBEB', padding: '16px', borderRadius: '14px', border: '1px solid #FDE68A' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>Scholarship Concessions</span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#D97706', marginTop: '4px' }}>₹{feeMetrics.totalWaivers.toLocaleString('en-IN')}</div>
              <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 700 }}>Granted Fee Waivers</span>
            </div>

            <div style={{ backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '14px', border: '1px solid #BFDBFE' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>Collection Rate</span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>{feeMetrics.collectionEfficiency}%</div>
              <span style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 700 }}>Efficiency Meter</span>
            </div>
          </div>

          {/* DYNAMIC VISUALIZERS */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            {feeChartView === 'comparison' && (
              <div>
                <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Multi-Branch Stacked Fee Visualizer (Collected vs Pending Due)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  {campusFeeComparison.map(c => {
                    const total = Math.max(1, c.paid + c.due);
                    const paidPct = Math.round((c.paid / total) * 100);
                    const duePct = 100 - paidPct;

                    return (
                      <div key={c.campus} style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>{c.campus}</div>
                        
                        {/* Dual Bar Visualizer */}
                        <div style={{ width: '100%', height: '16px', backgroundColor: '#FEE2E2', borderRadius: '8px', overflow: 'hidden', display: 'flex', margin: '8px 0' }}>
                          <div style={{ width: `${paidPct}%`, height: '100%', backgroundColor: '#10B981', transition: 'width 0.5s' }} title={`Collected: ${paidPct}%`} />
                          <div style={{ width: `${duePct}%`, height: '100%', backgroundColor: '#EF4444', transition: 'width 0.5s' }} title={`Due: ${duePct}%`} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800 }}>
                          <span style={{ color: '#059669' }}>Paid: ₹{(c.paid / 100000).toFixed(2)}L</span>
                          <span style={{ color: '#DC2626' }}>Due: ₹{(c.due / 100000).toFixed(2)}L</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {feeChartView === 'meter' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Institutional Revenue Collection Efficiency Meter
                </h4>

                {/* CIRCULAR SVG GAUGE VISUALIZER */}
                <div style={{ position: 'relative', width: '200px', height: '120px' }}>
                  <svg width="200" height="120" viewBox="0 0 100 60">
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray="126"
                      strokeDashoffset={126 - (126 * Math.min(100, feeMetrics.collectionEfficiency)) / 100}
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A' }}>{feeMetrics.collectionEfficiency}%</div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669' }}>Collection Efficiency</div>
                  </div>
                </div>
              </div>
            )}

            {feeChartView === 'allocation' && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Category Fee Allocation Breakdown
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Tuition Fees</span>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>₹{feeMetrics.tuitionTotal.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Hostel Fees</span>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>₹{feeMetrics.hostelTotal.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Transport Fees</span>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>₹{feeMetrics.transportTotal.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Misc Fees</span>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>₹{feeMetrics.miscTotal.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLOT 3: FACULTY VISUALIZER ENGINE */}
      {/* ========================================================================= */}
      {(activeSlot === 'all' || activeSlot === 'faculty') && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>SLOT 3: Faculty & Staff Disbursal Visualizer</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Headcount categorizations and 12-month salary ledger tracking</p>
              </div>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>{facultyMetrics.totalStaff} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Total Staff</span></span>
          </div>

          {/* Metric Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Teaching Faculty</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#7C3AED', marginTop: '4px' }}>{facultyMetrics.teachingCount} Staff</div>
              <span style={{ fontSize: '11px', color: '#6D28D9', fontWeight: 700 }}>Professors & Lecturers</span>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Non-Teaching Staff</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>{facultyMetrics.nonTeachingCount} Staff</div>
              <span style={{ fontSize: '11px', color: '#0369A1', fontWeight: 700 }}>Maintenance, IT, Fleet, Admin</span>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Monthly Payroll Obligation</span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#D97706', marginTop: '4px' }}>₹{facultyMetrics.totalMonthlySalary.toLocaleString('en-IN')}</div>
              <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 700 }}>Monthly Base Budget</span>
            </div>
          </div>

          {/* 12-MONTH SALARY DISBURSAL HEATMAP */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              12-Month Staff Salary Disbursal Heatmap (Jan – Dec Status)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px' }}>
              {facultyMetrics.monthlyLedger.map(mItem => {
                const hasPaid = mItem.paid > 0;
                return (
                  <div key={mItem.month} style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    backgroundColor: hasPaid ? '#F0FDF4' : '#FEF2F2',
                    border: `1.5px solid ${hasPaid ? '#BBF7D0' : '#FECACA'}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>{mItem.month.slice(0, 3)}</div>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: hasPaid ? '#15803D' : '#DC2626', marginTop: '4px' }}>
                      {hasPaid ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLOT 4: EXPENDITURE VISUALIZER ENGINE */}
      {/* ========================================================================= */}
      {(activeSlot === 'all' || activeSlot === 'expenditure') && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>SLOT 4: Multi-Branch Expenditure Visualizer</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Institutional spending breakdown across categories and campuses</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setExpenditureChartView('donut')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: expenditureChartView === 'donut' ? '#0F172A' : 'transparent',
                  color: expenditureChartView === 'donut' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Sector Donut
              </button>
              <button
                onClick={() => setExpenditureChartView('bars')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  backgroundColor: expenditureChartView === 'bars' ? '#0F172A' : 'transparent',
                  color: expenditureChartView === 'bars' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Sector Bars
              </button>
            </div>
          </div>

          {/* Total Spending Banner */}
          <div style={{ backgroundColor: '#FEF2F2', padding: '16px 20px', borderRadius: '14px', border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>Total Logged Expenditures</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#DC2626', marginTop: '2px' }}>₹{expenditureMetrics.totalExp.toLocaleString('en-IN')}</div>
            </div>
            <span style={{ padding: '6px 12px', backgroundColor: '#DC2626', color: '#FFFFFF', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
              {filteredExpenditures.length} Logged Entries
            </span>
          </div>

          {/* DYNAMIC VISUALIZER */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            {expenditureChartView === 'donut' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
                {/* SVG EXPENDITURE DONUT */}
                <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                  <svg width="180" height="180" viewBox="0 0 100 100">
                    {(() => {
                      let cumulativePct = 0;
                      return Object.entries(expenditureMetrics.sectors).map(([sName, amt], idx) => {
                        const pct = expenditureMetrics.totalExp > 0 ? (amt / expenditureMetrics.totalExp) * 100 : 0;
                        if (pct <= 0) return null;

                        const strokeDasharray = `${pct} ${100 - pct}`;
                        const strokeDashoffset = -cumulativePct;
                        cumulativePct += pct;
                        const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];

                        return (
                          <circle
                            key={sName}
                            cx="50"
                            cy="50"
                            r="35"
                            fill="transparent"
                            stroke={color}
                            strokeWidth="18"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 50 50)"
                            pathLength="100"
                            style={{ transition: 'all 0.5s ease' }}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>₹{(expenditureMetrics.totalExp / 100000).toFixed(1)}L</div>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>Total Expenses</div>
                  </div>
                </div>

                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '220px' }}>
                  {Object.entries(expenditureMetrics.sectors).map(([sName, amt], idx) => {
                    const pct = expenditureMetrics.totalExp > 0 ? Math.round((amt / expenditureMetrics.totalExp) * 100) : 0;
                    return (
                      <div key={sName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>{sName}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A' }}>₹{amt.toLocaleString('en-IN')} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(expenditureMetrics.sectors).map(([sName, amt], idx) => {
                  const pct = expenditureMetrics.totalExp > 0 ? Math.round((amt / expenditureMetrics.totalExp) * 100) : 0;
                  const barColor = SECTOR_COLORS[idx % SECTOR_COLORS.length];
                  return (
                    <div key={sName}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                        <span>{sName}</span>
                        <span>₹{amt.toLocaleString('en-IN')} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '12px', backgroundColor: '#E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: '6px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
