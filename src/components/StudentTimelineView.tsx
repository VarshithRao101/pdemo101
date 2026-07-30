import React, { useState } from 'react';
import { GlassCard } from './common/GlassCard';

interface StudentTimelineViewProps {
  student: any;
  onOpenPromoteWizard?: () => void;
}

export const StudentTimelineView: React.FC<StudentTimelineViewProps> = ({ student, onOpenPromoteWizard }) => {
  const currentActiveYear = student?.academicYear || '2026-27';
  const historyList = Array.isArray(student?.academicYears) ? student.academicYears : [];

  // Build complete year list including history plus active record
  const allYearsMap: Record<string, any> = {};

  // Default active year record from student top-level
  allYearsMap[currentActiveYear] = {
    academicYear: currentActiveYear,
    courseYear: student?.section || '1st Year',
    status: 'Active',
    tuitionFee: student?.tuitionFee || 120000,
    booksFee: student?.booksFee || 10000,
    uniformFees: student?.uniformFees || 5000,
    hostelFee: student?.hostelFee || 85000,
    transportFee: student?.transportFee || 0,
    miscellaneousFee: student?.miscellaneousFee || 5000,
    previousPending: student?.previousPending || 0,
    totalPaid: student?.totalPaid || 0,
    remainingBalance: student?.remainingBalance || 0,
    tuitionWaiver: student?.tuitionWaiver || 0,
    hostelWaiver: student?.hostelWaiver || 0,
    transportWaiver: student?.transportWaiver || 0,
    miscWaiver: student?.miscWaiver || 0,
    marks: student?.marks || []
  };

  // Populate from history
  historyList.forEach((h: any) => {
    if (h && h.academicYear) {
      allYearsMap[h.academicYear] = {
        ...allYearsMap[h.academicYear],
        ...h
      };
    }
  });

  const yearKeys = Object.keys(allYearsMap).sort().reverse(); // e.g. ['2027-28', '2026-27', '2025-26']
  const [selectedYearKey, setSelectedYearKey] = useState<string>(currentActiveYear);

  const selectedRecord = allYearsMap[selectedYearKey] || allYearsMap[currentActiveYear];
  const isSelectedActive = selectedYearKey === currentActiveYear;

  return (
    <GlassCard style={{ padding: '20px', borderRadius: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Permanent Student Academic Timeline
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0 0' }}>
            Academic History & Multi-Year Ledgers
          </h3>
        </div>

        {onOpenPromoteWizard && (
          <button
            onClick={onOpenPromoteWizard}
            style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 800, fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
          >
            🚀 Promote Student
          </button>
        )}
      </div>

      {/* Timeline Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
        {yearKeys.map((yKey) => {
          const rec = allYearsMap[yKey];
          const isSelected = yKey === selectedYearKey;
          const status = rec?.status || (yKey === currentActiveYear ? 'Active' : 'Completed');

          let badgeBg = '#FEF3C7';
          let badgeColor = '#D97706';
          if (status === 'Active') { badgeBg = '#D1FAE5'; badgeColor = '#059669'; }
          else if (status === 'Completed') { badgeBg = '#E0F2FE'; badgeColor = '#0284C7'; }

          return (
            <button
              key={yKey}
              onClick={() => setSelectedYearKey(yKey)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: isSelected ? '2px solid #0F172A' : '1px solid #E2E8F0',
                backgroundColor: isSelected ? '#0F172A' : '#F8FAFC',
                color: isSelected ? '#FFFFFF' : '#334155',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{yKey}</span>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : badgeBg, color: isSelected ? '#FFFFFF' : badgeColor, fontWeight: 900 }}>
                {status}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Academic Year Inspection Ledger */}
      {selectedRecord && (
        <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: isSelectedActive ? '#F8FAFC' : '#FAF5FF', border: `1.5px solid ${isSelectedActive ? '#E2E8F0' : '#E9D5FF'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: isSelectedActive ? '#059669' : '#7C3AED', textTransform: 'uppercase' }}>
                {isSelectedActive ? '● Active Academic Year Details' : '🔒 Historical Sealed Record (Read-Only)'}
              </span>
              <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0 0' }}>
                {selectedYearKey} ({selectedRecord.courseYear || '1st Year'})
              </h4>
            </div>

            <span style={{ fontSize: '12px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', backgroundColor: isSelectedActive ? '#10B981' : '#8B5CF6', color: '#FFFFFF' }}>
              Status: {selectedRecord.status || (isSelectedActive ? 'Active' : 'Completed')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>PREVIOUS DUE</div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#DC2626' }}>Rs.{(selectedRecord.previousPending || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>TUITION FEE</div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A' }}>Rs.{(selectedRecord.tuitionFee || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>TOTAL PAID</div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#059669' }}>Rs.{(selectedRecord.totalPaid || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>REMAINING DUE</div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: (selectedRecord.remainingBalance || 0) > 0 ? '#DC2626' : '#059669' }}>
                Rs.{(selectedRecord.remainingBalance || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
