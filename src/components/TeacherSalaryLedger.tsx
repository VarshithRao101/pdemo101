import React, { useState } from 'react';
import { GlassCard } from './common/GlassCard';
import { admin1Service } from '../services/admin1Service';

interface TeacherSalaryLedgerProps {
  teachers: any[];
  onToast: (msg: string) => void;
  onRefreshTeachers?: () => void;
}

const MONTHS = [
  { key: '06', name: 'June' },
  { key: '07', name: 'July' },
  { key: '08', name: 'August' },
  { key: '09', name: 'September' },
  { key: '10', name: 'October' },
  { key: '11', name: 'November' },
  { key: '12', name: 'December' },
  { key: '01', name: 'January' },
  { key: '02', name: 'February' },
  { key: '03', name: 'March' },
  { key: '04', name: 'April' },
  { key: '05', name: 'May' }
];

export const TeacherSalaryLedger: React.FC<TeacherSalaryLedgerProps> = ({
  teachers = [],
  onToast,
  onRefreshTeachers
}) => {
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2026-27');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(teachers[0] || null);

  // Disbursal Modal State
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);
  const [expectedSalary, setExpectedSalary] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isHolidayLeave, setIsHolidayLeave] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const startYear = selectedAcademicYear.split('-')[0] || '2026';

  const openDisbursalModal = (teacher: any, monthObj: { key: string; name: string }) => {
    setSelectedTeacher(teacher);
    // Determine year part: June-Dec uses startYear, Jan-May uses startYear+1
    const yr = ['01', '02', '03', '04', '05'].includes(monthObj.key) ? (Number(startYear) + 1).toString() : startYear;
    const fullMonthKey = `${yr}-${monthObj.key}`;
    setActiveMonthKey(fullMonthKey);

    const existing = teacher?.monthlySalaries?.[fullMonthKey];
    setExpectedSalary(existing?.expectedSalary || teacher?.salary || 45000);
    setPaidAmount(existing?.amountPaid || teacher?.salary || 45000);
    setPaymentMode(existing?.paymentMode || 'Bank Transfer');
    setReferenceNumber(existing?.referenceNumber || `TXN${Date.now().toString().slice(-6)}`);
    setNotes(existing?.notes || '');
    setIsHolidayLeave(existing?.isHoliday || false);
  };

  const handleSaveDisbursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !activeMonthKey) return;

    if (isHolidayLeave && !notes.trim()) {
      onToast('Mandatory: Please enter notes explaining Leave / Vacation (e.g., Summer Vacation / Maternity Leave).');
      return;
    }

    setIsSubmitting(true);
    try {
      await admin1Service.updateTeacherMonthlySalary(selectedTeacher._id || selectedTeacher.id, {
        academicYear: selectedAcademicYear,
        monthKey: activeMonthKey,
        expectedSalary: isHolidayLeave ? 0 : expectedSalary,
        paidAmount: isHolidayLeave ? 0 : paidAmount,
        paymentMode,
        referenceNumber,
        notes,
        isHoliday: isHolidayLeave,
        approvedBy: 'ERP Accountant'
      });

      onToast(`Salary disbursal for ${selectedTeacher.name} (${activeMonthKey}) updated successfully.`);
      setActiveMonthKey(null);
      if (onRefreshTeachers) onRefreshTeachers();
    } catch (err: any) {
      onToast(err.message || 'Failed to record salary disbursal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 12px 36px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Faculty & Staff Payroll Engine
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0 0' }}>
            Academic Year Salary Ledger
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
            Year-wise salary records. Multi-year profiles preserve historical payroll data without overwriting.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>Academic Year:</label>
          <select
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '13px', fontWeight: 800, backgroundColor: '#F8FAFC', color: '#0F172A', outline: 'none' }}
          >
            <option value="2026-27">2026-27 (Active Session)</option>
            <option value="2025-26">2025-26 (Past Session)</option>
            <option value="2027-28">2027-28 (Upcoming Session)</option>
          </select>
        </div>
      </div>

      {/* Faculty Payroll Matrix Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 14px', minWidth: '160px' }}>Faculty Profile</th>
              <th style={{ padding: '12px 10px' }}>Monthly Base</th>
              {MONTHS.map(m => (
                <th key={m.key} style={{ padding: '12px 8px', textAlign: 'center' }}>{m.name.slice(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => {
              return (
                <tr key={t._id || t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{t.subject || 'Faculty'} • {t.branch || 'Campus'}</div>
                  </td>
                  <td style={{ padding: '12px 10px', fontWeight: 800, color: '#059669' }}>
                    Rs.{(t.salary || 45000).toLocaleString('en-IN')}
                  </td>
                  {MONTHS.map(m => {
                    const yr = ['01', '02', '03', '04', '05'].includes(m.key) ? (Number(startYear) + 1).toString() : startYear;
                    const fullKey = `${yr}-${m.key}`;
                    const rec = t.monthlySalaries?.[fullKey];

                    let badgeColor = '#94A3B8';
                    let badgeBg = '#F1F5F9';
                    let label = 'Unpaid';

                    if (rec) {
                      if (rec.isHoliday) {
                        badgeColor = '#64748B'; badgeBg = '#E2E8F0'; label = 'Vacation';
                      } else if (rec.status === 'Paid') {
                        badgeColor = '#059669'; badgeBg = '#D1FAE5'; label = 'Paid';
                      } else if (rec.amountPaid > 0) {
                        badgeColor = '#D97706'; badgeBg = '#FEF3C7'; label = 'Partial';
                      }
                    }

                    return (
                      <td key={m.key} style={{ padding: '8px 4px', textAlign: 'center' }}>
                        <button
                          onClick={() => openDisbursalModal(t, m)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            fontWeight: 800,
                            fontSize: '10px',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          {label}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Disbursal Modal */}
      {activeMonthKey && selectedTeacher && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', width: '100%', maxWidth: '480px', borderRadius: '20px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', border: '1px solid #CBD5E1' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', marginTop: 0, marginBottom: '4px' }}>
              Salary Disbursal: {selectedTeacher.name}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '18px' }}>
              Academic Session: <strong>{selectedAcademicYear}</strong> | Month: <strong>{activeMonthKey}</strong>
            </p>

            <form onSubmit={handleSaveDisbursal}>
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <input
                  type="checkbox"
                  id="holidayChk"
                  checked={isHolidayLeave}
                  onChange={(e) => setIsHolidayLeave(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="holidayChk" style={{ fontSize: '12px', fontWeight: 800, color: '#334155', cursor: 'pointer' }}>
                  Mark as Unpaid Leave / Vacation (0 Salary)
                </label>
              </div>

              {!isHolidayLeave && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>Expected Salary (Rs.)</label>
                      <input
                        type="number"
                        value={expectedSalary}
                        onChange={(e) => setExpectedSalary(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>Amount Paid (Rs.)</label>
                      <input
                        type="number"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>Payment Mode</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                      >
                        <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                        <option value="UPI">UPI Payment</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>Transaction Ref No.</label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                  {isHolidayLeave ? 'Mandatory Leave Notes *' : 'Remarks / Notes'}
                </label>
                <input
                  type="text"
                  placeholder={isHolidayLeave ? 'Specify reason e.g. Summer Vacation / Maternity Leave' : 'Optional comments...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActiveMonthKey(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0F172A', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Saving...' : 'Record Disbursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
