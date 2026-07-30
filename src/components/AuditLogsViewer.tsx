import React, { useState, useEffect } from 'react';
import { GlassCard } from './common/GlassCard';
import { admin1Service } from '../services/admin1Service';

interface AuditLogEntry {
  _id?: string;
  action: string;
  performedBy: string;
  role: string;
  targetId?: string;
  targetName?: string;
  details?: any;
  ipAddress?: string;
  deviceInfo?: string;
  campus?: string;
  timestamp?: string;
}

interface AuditLogsViewerProps {
  onToast: (msg: string) => void;
}

export const AuditLogsViewer: React.FC<AuditLogsViewerProps> = ({ onToast }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await admin1Service.getAuditLogs();
      setLogs(data || []);
    } catch (err: any) {
      onToast(err.message || 'Failed to fetch audit trail logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (filterAction === 'ALL') return true;
    return (l.action || '').toUpperCase().includes(filterAction);
  });

  return (
    <GlassCard style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 12px 36px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#7C3AED', color: '#FFFFFF', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }}>
              SECURITY AUDIT
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
              ERP System Audit Trail
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Immutable security log tracking all student promotions, academic year closures, fee modifications, and salary disbursals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700, outline: 'none' }}
          >
            <option value="ALL">All Actions</option>
            <option value="PROMOTION">Promotions</option>
            <option value="YEAR">Academic Year Changes</option>
            <option value="SALARY">Salary Disbursals</option>
            <option value="DELETE">Deletions</option>
          </select>
          <button
            onClick={fetchLogs}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#334155', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
          >
            🔄 Refresh Trail
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>Loading Security Audit Trail...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>No audit log entries recorded yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Timestamp</th>
                <th style={{ padding: '12px 14px' }}>Action</th>
                <th style={{ padding: '12px 14px' }}>User & Role</th>
                <th style={{ padding: '12px 14px' }}>Target Subject</th>
                <th style={{ padding: '12px 14px' }}>Campus</th>
                <th style={{ padding: '12px 14px' }}>IP / Device</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => {
                const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent';
                return (
                  <tr key={log._id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px', color: '#64748B', fontFamily: 'monospace', fontSize: '11px' }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#0F172A', border: '1px solid #CBD5E1' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>{log.performedBy || 'User'}</div>
                      <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>{log.role || 'Staff'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#334155' }}>
                      {log.targetName || log.targetId || 'System'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>
                      {log.campus || 'Overall'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: '11px' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
};
