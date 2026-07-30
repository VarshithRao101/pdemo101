import React, { useState, useEffect } from 'react';
import { GlassCard } from './common/GlassCard';
import { admin1Service } from '../services/admin1Service';

interface AcademicYearItem {
  yearId: string;
  label: string;
  status: 'Active' | 'Closed' | 'Archived' | 'Upcoming';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  createdBy?: string;
}

interface AcademicYearManagerProps {
  onToast: (msg: string) => void;
  onRefreshAll?: () => void;
}

export const AcademicYearManager: React.FC<AcademicYearManagerProps> = ({ onToast, onRefreshAll }) => {
  const [activeYear, setActiveYear] = useState<string>('2026-27');
  const [yearsList, setYearsList] = useState<AcademicYearItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Year Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newYearId, setNewYearId] = useState<string>('');
  const [newLabel, setNewLabel] = useState<string>('');
  const [newStartDate, setNewStartDate] = useState<string>('2027-06-01');
  const [newEndDate, setNewEndDate] = useState<string>('2028-04-30');
  const [newStatus, setNewStatus] = useState<'Upcoming' | 'Active'>('Upcoming');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Confirmation modal state
  const [statusModalYear, setStatusModalYear] = useState<AcademicYearItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<'Active' | 'Closed' | 'Archived'>('Active');

  const fetchYears = async () => {
    setIsLoading(true);
    try {
      const data = await admin1Service.getAcademicYears();
      if (data) {
        setActiveYear(data.activeYear || '2026-27');
        setYearsList(data.academicYears || []);
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to load Academic Year settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearId.trim() || !newLabel.trim()) {
      onToast('Please provide Year ID (e.g. 2027-28) and Display Label.');
      return;
    }
    setIsSubmitting(true);
    try {
      await admin1Service.createAcademicYear({
        yearId: newYearId.trim(),
        label: newLabel.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
        status: newStatus
      });
      onToast(`Academic Year ${newYearId.trim()} created successfully.`);
      setIsCreateModalOpen(false);
      setNewYearId('');
      setNewLabel('');
      await fetchYears();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      onToast(err.message || 'Failed to create Academic Year.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModalYear) return;
    setIsSubmitting(true);
    try {
      await admin1Service.updateAcademicYearStatus(statusModalYear.yearId, targetStatus);
      onToast(`Academic Year ${statusModalYear.yearId} status updated to ${targetStatus}.`);
      setStatusModalYear(null);
      await fetchYears();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      onToast(err.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#FFFFFF', boxShadow: '0 12px 36px rgba(15,23,42,0.08)', border: '1px solid #E2E8F0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 10px rgba(16,185,129,0.5)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Academic Year Manager</h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Central ERP Academic Year Engine. Manage, promote, and archive institutional academic sessions without overwriting historical data.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchYears()}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#334155', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{ padding: '9px 18px', borderRadius: '12px', border: 'none', backgroundColor: '#0F172A', color: '#FFFFFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(15,23,42,0.2)' }}
          >
            + New Academic Year
          </button>
        </div>
      </div>

      {/* Active Year Highlight Banner */}
      <div style={{ padding: '16px 20px', borderRadius: '16px', backgroundColor: 'rgba(16,185,129,0.06)', border: '1.5px solid rgba(16,185,129,0.25)', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.05em' }}>
            {activeYear}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Currently Active Session</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              All current fee collections, student enrollments, and attendance default to {activeYear}.
            </div>
          </div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', backgroundColor: '#FFFFFF', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.3)' }}>
          🔒 Single-Active Policy Enforced
        </span>
      </div>

      {/* Academic Years Table */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>Loading Academic Years...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Year ID</th>
                <th style={{ padding: '12px 16px' }}>Display Label</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Duration</th>
                <th style={{ padding: '12px 16px' }}>Created By</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {yearsList.map((y) => {
                const isActive = y.yearId === activeYear || y.status === 'Active';
                const isClosed = y.status === 'Closed';
                const isArchived = y.status === 'Archived';

                let badgeColor = '#D97706';
                let badgeBg = '#FEF3C7';
                if (isActive) { badgeColor = '#059669'; badgeBg = '#D1FAE5'; }
                else if (isClosed) { badgeColor = '#475569'; badgeBg = '#F1F5F9'; }
                else if (isArchived) { badgeColor = '#DC2626'; badgeBg = '#FEE2E2'; }

                return (
                  <tr key={y.yearId} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isActive ? 'rgba(16,185,129,0.02)' : 'transparent' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', fontSize: '14px' }}>
                      {y.yearId}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#334155' }}>
                      {y.label}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, color: badgeColor, backgroundColor: badgeBg }}>
                        {isActive ? '● Active' : y.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      {y.startDate || '2026-06-01'} to {y.endDate || '2027-04-30'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      {y.createdBy || 'Admin One'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {!isActive && (
                          <button
                            onClick={() => { setStatusModalYear(y); setTargetStatus('Active'); }}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #10B981', backgroundColor: '#ECFDF5', color: '#047857', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                          >
                            Set Active
                          </button>
                        )}
                        {isActive && (
                          <button
                            onClick={() => { setStatusModalYear(y); setTargetStatus('Closed'); }}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                          >
                            Close Year
                          </button>
                        )}
                        {!isArchived && !isActive && (
                          <button
                            onClick={() => { setStatusModalYear(y); setTargetStatus('Archived'); }}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create New Academic Year Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', width: '100%', maxWidth: '520px', borderRadius: '24px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', border: '1px solid #CBD5E1' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginTop: 0, marginBottom: '6px' }}>
              Create Academic Year
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Add a new academic year entry for promotion planning and fee ledger setup.
            </p>

            <form onSubmit={handleCreateYear}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Academic Year Identifier (e.g., 2027-28) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2027-28"
                  value={newYearId}
                  onChange={(e) => setNewYearId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Display Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Academic Year 2027-2028"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e: any) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                >
                  <option value="Upcoming">Upcoming (Planning Phase)</option>
                  <option value="Active">Active (Immediately Switch Active Year)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', backgroundColor: '#0F172A', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Academic Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {statusModalYear && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', width: '100%', maxWidth: '440px', borderRadius: '20px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', border: '1px solid #CBD5E1' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', marginTop: 0, marginBottom: '8px' }}>
              Confirm Academic Year Status Change
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to set Academic Year <strong>{statusModalYear.yearId}</strong> status to <strong style={{ color: targetStatus === 'Active' ? '#059669' : '#DC2626' }}>{targetStatus}</strong>?
            </p>

            {targetStatus === 'Active' && (
              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', fontSize: '12px', color: '#92400E', marginBottom: '16px' }}>
                ⚠️ Activating <strong>{statusModalYear.yearId}</strong> will automatically mark previous active year as <strong>Closed</strong>.
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setStatusModalYear(null)}
                style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isSubmitting}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: targetStatus === 'Active' ? '#10B981' : '#0F172A', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
              >
                {isSubmitting ? 'Updating...' : `Confirm Set ${targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
