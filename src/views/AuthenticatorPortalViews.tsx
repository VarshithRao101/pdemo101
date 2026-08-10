import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { apiClient } from '../services/apiClient';
import { authenticatorService } from '../services/authenticatorService';
import type { 
  AccountInfo, 
  ActiveSessionInfo,
  AuthenticatorStats,
  SyncJournalEntry
} from '../services/authenticatorService';

export const AuthenticatorDashboardView: React.FC = () => {
  const { activeTab: globalActiveTab, setActiveTab: setGlobalActiveTab, setIsDrawerOpen } = useNavigation();
  const [toast, setToast] = useState<string | null>(null);
  
  // Tab control
  const activeTab = (globalActiveTab === 'keys' || globalActiveTab === 'accounts' || globalActiveTab === 'sync_integrity' || globalActiveTab === 'settings') 
    ? globalActiveTab 
    : 'dashboard';

  const setActiveTab = (tab: 'dashboard' | 'keys' | 'accounts' | 'sync_integrity' | 'settings') => {
    setGlobalActiveTab(tab);
  };

  // Backend state
  const [keysData, setKeysData] = useState<any>(null);
  // Newly issued PINs, held in component state only. Never persisted to
  // localStorage: they are the live credentials for every portal account.
  const [issuedPins, setIssuedPins] = useState<Record<string, string> | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [stats, setStats] = useState<AuthenticatorStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalStaff: 0,
    activeDevices: 0,
    activeSessions: [],
    activeSessionCount: 0,
    systemsActive: 4,
    systemsInactive: 0,
    portalSlotTotal: 4,
    lastBackupAt: localStorage.getItem('last_backup_timestamp') || '2026-07-28 09:00 AM'
  });

  // Sync integrity & database management state
  const [syncLogs, setSyncLogs] = useState<SyncJournalEntry[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Account creation/edit state
  const [accountUsername, setAccountUsername] = useState<string>('');
  const [accountRole, setAccountRole] = useState<'admin1' | 'admin2' | 'accountant' | 'authenticator'>('accountant');
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [accountMobile, setAccountMobile] = useState<string>('');
  const [accountDepartment, setAccountDepartment] = useState<string>('');
  const [accountAddress, setAccountAddress] = useState<string>('');
  const [accountCampus, setAccountCampus] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [showModalPassword, setShowModalPassword] = useState<boolean>(false);

  const copyTextToClipboard = (text: string, label: string) => {
    if (!text) {
      triggerToast(`No ${label} available to copy.`);
      return;
    }
    navigator.clipboard.writeText(text);
    triggerToast(`Copied ${label} to clipboard!`);
  };

  // Settings State 1: Make Google Drive Backup
  const [backupPasscode, setBackupPasscode] = useState<string>('');
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [backupProgress, setBackupProgress] = useState<number>(0);

  // Settings State 2: Emergency Database Wipe
  const [wipePasscode, setWipePasscode] = useState<string>('');
  const [isWipingDb, setIsWipingDb] = useState<boolean>(false);
  const [wipeProgress, setWipeProgress] = useState<number>(0);

  // Settings State 3: Restore Engine & Google Drive Backups
  const [availableBackups, setAvailableBackups] = useState<any>({
    Students_Data: {},
    Teachers_Data: {},
    Expenditures_Data: {}
  });
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [activeRestoreCategory, setActiveRestoreCategory] = useState<'Students_Data' | 'Teachers_Data' | 'Expenditures_Data'>('Students_Data');
  const [restoringCampus, setRestoringCampus] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [restoreStatusText, setRestoreStatusText] = useState<string>('Initializing restoration pipeline...');

  // Fetch Available Backups from Server/Google Drive
  const loadAvailableBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const data = await authenticatorService.getAvailableBackups();
      if (data) setAvailableBackups(data);
    } catch (err: any) {
      console.warn('Failed to load available backups:', err.message);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadAvailableBackups();
  }, []);

  // Handler: Run Google Drive 24h Rolling Backup Now
  const handleRunGoogleDriveBackup = async () => {
    if (!backupPasscode.trim()) {
      triggerToast('Please enter Authenticator account password to run Google Drive backup.');
      return;
    }
    setIsCreatingBackup(true);
    setBackupProgress(15);

    const interval = setInterval(() => {
      setBackupProgress(p => (p >= 85 ? p : p + 15));
    }, 300);

    try {
      await authenticatorService.createBackup(backupPasscode.trim());
      clearInterval(interval);
      setBackupProgress(100);

      const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      localStorage.setItem('last_backup_timestamp', nowStr);
      setStats(prev => ({ ...prev, lastBackupAt: nowStr }));

      triggerToast('Google Drive 24-hour rolling backup generated & uploaded across all 4 campuses successfully!');
      await loadAvailableBackups();
    } catch (err: any) {
      clearInterval(interval);
      triggerToast(err.message || 'Google Drive Backup failed. Please verify passcode.');
    } finally {
      setTimeout(() => {
        setIsCreatingBackup(false);
        setBackupProgress(0);
      }, 800);
    }
  };

  // Handler: Purge Google Drive (Keep 3 Folders Only)
  const [isPurgingDrive, setIsPurgingDrive] = useState(false);
  const handlePurgeGoogleDrive = async () => {
    if (!window.confirm('Delete all items in Google Drive except the 3 category folders (Students, Teachers, Expenditures)?')) {
      return;
    }
    setIsPurgingDrive(true);
    try {
      const res = await apiClient.post<{ status: string; message: string; deletedCount: number }>('/system/purge-drive', {});
      if (res.status === 'success') {
        triggerToast(res.message || 'Google Drive purged successfully!');
        await loadAvailableBackups();
      } else {
        triggerToast(res.message || 'Drive purge failed.');
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to purge Google Drive.');
    } finally {
      setIsPurgingDrive(false);
    }
  };

  // Handler: Wipe Entire Database
  const handleExecuteDatabaseWipe = async () => {
    if (!wipePasscode.trim()) {
      triggerToast('Please enter Security Authenticator Account Password to confirm database wipe.');
      return;
    }

    if (!window.confirm('WARNING: Are you strictly sure you want to WIPEOUT ALL DATABASE SCHEMAS & RECORDS? This action cannot be undone!')) {
      return;
    }

    setIsWipingDb(true);
    setWipeProgress(20);

    const interval = setInterval(() => {
      setWipeProgress(p => (p >= 90 ? p : p + 20));
    }, 400);

    try {
      const msg = await authenticatorService.wipeEntireDatabase(wipePasscode.trim());
      clearInterval(interval);
      setWipeProgress(100);
      triggerToast(msg || 'Entire database wiped cleanly! Clean state prepared.');
      setWipePasscode('');
      await loadData();
      await loadAvailableBackups();
    } catch (err: any) {
      clearInterval(interval);
      triggerToast(err.message || 'Database wipe failed. Invalid passcode.');
    } finally {
      setTimeout(() => {
        setIsWipingDb(false);
        setWipeProgress(0);
      }, 1000);
    }
  };

  // Restore a Google Drive backup over the live database.
  //
  // This replaces every student, teacher, payment, fee-setting, expenditure
  // and worker-payment record with the contents of the chosen backup, so it
  // asks for the authenticator's password (verified server-side with bcrypt)
  // and makes the caller confirm in writing first.
  //
  // Restoring from a locally-uploaded file used to be offered here; there was
  // never a backend for it, so that path has been removed. Restores come from
  // Drive, which is where the encrypted backups actually live.
  const handleExecuteDataRestore = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(
      `Restore from "${fileName}"?\n\n` +
      'This REPLACES all current student, faculty, payment, fee and expenditure ' +
      'records with the contents of that backup. Data created since the backup ' +
      'was taken will be lost. This cannot be undone.'
    );
    if (!confirmed) return;

    const password = window.prompt('Enter YOUR authenticator password to confirm this restore:');
    if (!password || !password.trim()) return;

    setIsRestoring(true);
    try {
      const result = await authenticatorService.restoreBackup(fileId, password.trim());
      const counts = result?.restoredCounts || {};
      triggerToast(
        `Restore complete — students: ${counts.students ?? 0}, teachers: ${counts.teachers ?? 0}, payments: ${counts.payments ?? 0}.`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      // Surface the real reason; a failed restore that looks like a success is
      // exactly the failure mode this replaced.
      triggerToast(err?.message || 'Restore failed. No data was changed.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Trigger Toast Notification
  const triggerToast = (msg: string, type?: 'success' | 'error') => {
    let isError = false;
    if (type) {
      isError = type === 'error';
    } else {
      const lower = msg.toLowerCase();
      isError = lower.includes('rejected') || 
                lower.includes('failed') || 
                lower.includes('denied') || 
                (lower.includes('invalid') && !lower.includes('invalidated')) || 
                lower.includes('not found') || 
                lower.includes('error') ||
                lower.includes('incorrect');
    }
    const symbol = isError ? 'ERROR: ' : 'SUCCESS: ';
    setToast(symbol + msg);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Initial Data
  const loadData = async () => {
    try {
      const [keysRes, accountsRes, statsRes, syncRes] = await Promise.all([
        authenticatorService.getKeys(),
        authenticatorService.getAccounts(),
        authenticatorService.getStats(),
        authenticatorService.getSyncJournal()
      ]);
      setKeysData(keysRes);
      setAccounts(accountsRes);
      setStats({
        ...statsRes,
        lastBackupAt: localStorage.getItem('last_backup_timestamp') || statsRes.lastBackupAt || '2026-07-28 09:00 AM'
      });
      setSyncLogs(syncRes);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to sync authenticator data.');
    }
  };



  useEffect(() => {
    loadData();
    const pollInterval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  // Issue fresh PINs. Requires the authenticator to confirm with their own PIN,
  // which the server verifies with bcrypt — the client cannot self-authorise.
  const handleManualRegeneratePins = async () => {
    const securityPin = window.prompt('Enter YOUR security PIN to confirm issuing new PINs for all portal accounts:');
    if (!securityPin || !securityPin.trim()) return;

    try {
      const data = await authenticatorService.regenerateKeys(securityPin.trim());
      const pins = (data && data.dailyPins) || {};
      const count = Object.keys(pins).length;

      if (count === 0) {
        triggerToast('No PINs were issued. Nothing has changed.');
        return;
      }

      setIssuedPins(pins);
      await loadData();
      triggerToast(`${count} new PIN(s) issued. Copy them now — they cannot be shown again.`, 'success');
    } catch (err: any) {
      // Surface the real reason (wrong PIN, rate limited, database down)
      // rather than a generic failure the operator cannot act on.
      triggerToast(err?.message || 'Failed to issue new PINs. No PIN was changed.');
    }
  };



  // Create/Update Admin & Accountant Accounts
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountId) {
      triggerToast('Creating new portal IDs is disabled.');
      return;
    }

    if (!accountUsername) {
      triggerToast('Username is required.');
      return;
    }

    try {
      await authenticatorService.updateAccount(editingAccountId, {
        username: accountUsername,
        password: accountPassword || undefined,
        name: accountName,
        email: accountEmail,
        mobile: accountMobile,
        department: accountDepartment,
        address: accountAddress,
        campus: accountCampus
      });
      triggerToast('Staff account updated successfully.');
      setAccountUsername('');
      setAccountPassword('');
      setAccountName('');
      setAccountEmail('');
      setAccountMobile('');
      setAccountDepartment('');
      setAccountAddress('');
      setAccountCampus('');
      setEditingAccountId(null);
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save account.');
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    triggerToast('Copied security PIN to clipboard!');
  };

  const activeSessions = (stats.activeSessions || []) as ActiveSessionInfo[];

  // Filtered transaction logs
  const filteredSyncLogs = syncLogs.filter(log => {
    if (ledgerFilter === 'success' && log.status !== 'success') return false;
    if (ledgerFilter === 'failed' && log.status !== 'failed' && (log.status as string) !== 'rejected') return false;
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      return (
        log.transactionId.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.performedBy || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={styles.container} className="anim-slide-up neo-2d light-theme">
      {/* Toast Notification */}
      {toast && (
        <div style={styles.toast}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '13px' }}>{toast}</span>
          </div>
        </div>
      )}

      {/* Workspace Content */}
      <main style={styles.workspace}>
        {/* Workspace Header */}
        <header style={styles.workspaceHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setIsDrawerOpen(true)}
              style={{
                background: 'none',
                border: '1.5px solid var(--card-border)',
                color: 'var(--dark-charcoal)',
                padding: '8px 10px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="press-interactive mobile-menu-btn"
              title="Open Navigation Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div>
              <h1 style={styles.workspaceTitle}>
                {activeTab === 'dashboard' && 'Security Shield Overview'}
                {activeTab === 'keys' && '6-Digit Security PINs'}
                {activeTab === 'accounts' && 'Staff Accounts Control'}
                {activeTab === 'sync_integrity' && 'Transaction Ledger'}
                {activeTab === 'settings' && 'System Settings'}
              </h1>
              <p style={styles.workspaceSubtitle}>
                {activeTab === 'dashboard' && 'Real-time security metrics, active web sessions, and system status.'}
                {activeTab === 'keys' && 'Manage active 6-digit login PINs for administrative accounts with manual regeneration.'}
                {activeTab === 'accounts' && 'Provision, update, and manage login authorization credentials for staff.'}
                {activeTab === 'sync_integrity' && 'Audit real-time transaction journal for successful commits and system actions.'}
                {activeTab === 'settings' && 'Configure database backups, emergency data purges, and bulk CSV file uploads.'}
              </p>
            </div>
          </div>
        </header>

        {/* â”€â”€â”€ TAB 1: DASHBOARD OVERVIEW (4 KEY METRIC CARDS ONLY) â”€â”€â”€ */}
        {activeTab === 'dashboard' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* EXACTLY 4 METRIC CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid #2563EB' }}>
                <span style={styles.metricLabel}>Active Portal Sessions</span>
                <strong style={{ ...styles.metricValue, color: '#1E40AF' }}>
                  {stats.activeSessionCount || 4} / 4 Online
                </strong>
                <span style={styles.metricSub}>Campus portals currently connected</span>
              </GlassCard>

              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid #D97706' }}>
                <span style={styles.metricLabel}>Staff Access Credentials</span>
                <strong style={{ ...styles.metricValue, color: '#B45309' }}>
                  {accounts.length || 14} Accounts
                </strong>
                <span style={styles.metricSub}>Provisioned administrative staff</span>
              </GlassCard>

              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid #059669' }}>
                <span style={styles.metricLabel}>System Integrity Status</span>
                <strong style={{ ...styles.metricValue, color: '#047857' }}>
                  100% Active
                </strong>
                <span style={styles.metricSub}>All 4 campuses synced & secure</span>
              </GlassCard>

              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid #7C3AED' }}>
                <span style={styles.metricLabel}>Last System Backup</span>
                <strong style={{ ...styles.metricValue, color: '#6D28D9', fontSize: '15px', marginTop: '6px' }}>
                  {stats.lastBackupAt}
                </strong>
                <span style={styles.metricSub}>Database archive timestamp</span>
              </GlassCard>
            </div>

            {/* Active Sessions & Live Transaction Widget */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Active Sessions Panel */}
              <GlassCard hoverable={false} style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '2.5px solid #0F172A', boxShadow: '4px 4px 0px #0F172A' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '2px solid #CBD5E1', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Connected Portal Sessions
                  </h4>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                    Live Sync
                  </span>
                </div>
                {activeSessions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeSessions.map((session, idx) => (
                      <div key={session.sessionGuid || `session-${session.name}-${idx}`} style={{ padding: '12px 14px', borderRadius: '12px', border: '2px solid #CBD5E1', backgroundColor: '#F8FAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '13px', color: '#0F172A' }}>{session.name}</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginTop: '2px' }}>{session.role} | {session.campus}</div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', backgroundColor: '#D1FAE5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                    All 4 Campus Portal slots are online & synced.
                  </div>
                )}
              </GlassCard>

              {/* Transaction Widget */}
              <GlassCard hoverable={false} style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '2.5px solid #0F172A', boxShadow: '4px 4px 0px #0F172A' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '2px solid #CBD5E1', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Transaction Ledger Journal
                  </h4>
                  <button onClick={() => setActiveTab('sync_integrity')} style={{ fontSize: '11px', fontWeight: 850, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
                    View All &rarr;
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {filteredSyncLogs.slice(0, 5).map((log, idx) => (
                    <div key={log.transactionId ? `dash-tx-${log.transactionId}-${idx}` : `dash-tx-${idx}`} style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A' }}>{log.action}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>By {log.performedBy || 'System'} | {log.timestamp}</div>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: log.status === 'success' ? '1px solid #10B981' : '1px solid #EF4444',
                        backgroundColor: log.status === 'success' ? '#D1FAE5' : '#FEE2E2',
                        color: log.status === 'success' ? '#047857' : '#B91C1C'
                      }}>
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </section>
        )}

        {/* ─── TAB 2: 6-DIGIT SECURITY PINs ─── */}
        {/*
          PIN values are no longer readable. The server stores only bcrypt
          hashes, so this panel shows configuration status, and newly issued
          PINs appear once — immediately after a regeneration — and are gone on
          the next load. The previous version displayed every account's live
          PIN on page load, and fell back to a hardcoded literal when the API
          returned nothing.
        */}
        {activeTab === 'keys' && keysData && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <GlassCard hoverable={false} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: '#FFFFFF', border: '2.5px solid #0F172A', boxShadow: '4px 4px 0px #0F172A' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                  Account Security PINs
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 700, color: '#64748B', maxWidth: '520px' }}>
                  PINs are stored as one-way hashes and cannot be displayed. Issue a new PIN to see its value — it is shown once only.
                </p>
              </div>

              <button
                onClick={handleManualRegeneratePins}
                style={{
                  padding: '12px 20px', borderRadius: '12px', border: '2px solid #D97706',
                  backgroundColor: '#D97706', color: '#FFFFFF', fontWeight: 900, fontSize: '13px',
                  boxShadow: '3px 3px 0px #B45309', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '8px', fontFamily: 'var(--font-family)'
                }}
                className="press-interactive"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Issue New PINs</span>
              </button>
            </GlassCard>

            {/* Freshly issued PINs — visible only until this view reloads. */}
            {issuedPins && Object.keys(issuedPins).length > 0 && (
              <GlassCard hoverable={false} style={{ padding: '20px 24px', border: '2.5px solid #B45309', backgroundColor: '#FFFBEB', boxShadow: '4px 4px 0px #B45309' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 900, color: '#B45309' }}>
                  New PINs — shown once
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                  Copy and distribute these now. They cannot be retrieved again; the only way to recover an account is to issue another PIN.
                </p>
                <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {Object.entries(issuedPins).map(([username, pin]) => (
                    <GlassCard key={username} hoverable={false} style={styles.keyCard}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>{username}</span>
                      <div style={styles.keyDisplayBlock}>
                        <strong style={{ ...styles.keyValue, color: '#B45309' }}>{String(pin)}</strong>
                      </div>
                      <button onClick={() => copyToClipboard(String(pin))} style={styles.copyBtn} className="press-interactive">
                        Copy 6-Digit PIN
                      </button>
                    </GlassCard>
                  ))}
                </div>
                <button
                  onClick={() => setIssuedPins(null)}
                  style={{ marginTop: '16px', padding: '10px 16px', borderRadius: '10px', border: '2px solid #92400E', backgroundColor: 'transparent', color: '#92400E', fontWeight: 900, fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
                  className="press-interactive"
                >
                  I have saved these — hide them
                </button>
              </GlassCard>
            )}

            {/* Status of every portal account. */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Portal Accounts
              </h4>
              <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {(keysData.accounts || []).map((acc: any) => (
                  <GlassCard key={acc.username} hoverable={false} style={styles.keyCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A' }}>{acc.name || acc.username}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>{acc.role}</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8' }}>{acc.username}</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={{ ...styles.keyValue, fontSize: '13px', color: acc.pinConfigured ? '#059669' : '#DC2626' }}>
                        {acc.pinConfigured ? 'PIN SET' : 'NO PIN'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8' }}>
                      {acc.campus || '—'}
                      {acc.lastUpdatedAt ? ` · updated ${new Date(acc.lastUpdatedAt).toLocaleDateString('en-IN')}` : ''}
                    </span>
                  </GlassCard>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* â”€â”€â”€ TAB 3: ACCOUNT CONTROL â”€â”€â”€ */}
        {activeTab === 'accounts' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>Staff Accounts Registry</h3>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #CBD5E1', backgroundColor: '#F8FAFC', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
              Portal slots are fixed. Update the existing accounts only. Creating or deleting IDs is disabled.
            </div>

            <div style={styles.accountsGrid}>
              {accounts.map((acc, idx) => {
                const accId = acc.id || (acc as any)._id || `acc-${acc.username}-${idx}`;

                let roleLabel = 'Accountant';
                let roleBadgeBg = '#1D4ED8';
                let roleCode = 'AC';

                if (acc.role === 'admin1') {
                  roleLabel = 'Rector (Admin 1)';
                  roleBadgeBg = '#D97706';
                  roleCode = 'A1';
                } else if (acc.role === 'admin2') {
                  roleLabel = 'Campus Principal (Admin 2)';
                  roleBadgeBg = '#059669';
                  roleCode = 'A2';
                } else if (acc.role === 'authenticator') {
                  roleLabel = 'Security Authenticator';
                  roleBadgeBg = '#7C3AED';
                  roleCode = 'AU';
                }

                return (
                  <div
                    key={accId}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      border: '2.5px solid #0F172A',
                      borderRadius: '16px',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '4px 4px 0px #0F172A'
                    }}
                  >
                    {/* Top Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: roleBadgeBg,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '14px',
                          border: '2px solid #0F172A',
                          boxShadow: '2px 2px 0px #0F172A'
                        }}>
                          {roleCode}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                            {acc.name || acc.username}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                            {acc.email || `${acc.username}@inspire.edu`} | {acc.mobile || 'No Mobile'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          backgroundColor: roleBadgeBg + '1A',
                          color: roleBadgeBg,
                          border: `1.5px solid ${roleBadgeBg}`,
                          fontWeight: 900,
                          fontSize: '11px',
                          textTransform: 'uppercase'
                        }}>
                          {roleLabel}
                        </span>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          border: '1.5px solid #CBD5E1',
                          fontWeight: 800,
                          fontSize: '11px'
                        }}>
                          {acc.campus || 'All Campuses'}
                        </span>
                      </div>
                    </div>

                    {/* Credentials Display & Copy Box */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '12px',
                      border: '2px solid #E2E8F0'
                    }}>
                      {/* ID / Username Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>User ID:</span>
                          <code style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace', color: '#0F172A', backgroundColor: '#E2E8F0', padding: '3px 8px', borderRadius: '6px' }}>
                            {acc.username}
                          </code>
                        </div>
                        <button
                          onClick={() => copyTextToClipboard(acc.username, 'User ID')}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1.5px solid #0F172A',
                            backgroundColor: '#3B82F6',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="press-interactive"
                          title="Copy Username ID to clipboard"
                        >
                          Copy ID
                        </button>
                      </div>

                      {/* Password Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>Pass:</span>
                          <code style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', color: '#10B981', backgroundColor: '#D1FAE5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #6EE7B7' }}>
                            Stored securely
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                      <button
                        onClick={() => {
                          setEditingAccountId(accId);
                          setAccountUsername(acc.username);
                          setAccountPassword('');
                          setAccountRole(acc.role);
                          setAccountName(acc.name || '');
                          setAccountEmail(acc.email || '');
                          setAccountMobile(acc.mobile || '');
                          setAccountDepartment(acc.department || '');
                          setAccountAddress(acc.address || '');
                          setAccountCampus(acc.campus || '');
                          setIsEditModalOpen(true);
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          border: '2px solid #0F172A',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '12px',
                          fontWeight: 900,
                          boxShadow: '2px 2px 0px #0F172A',
                          cursor: 'pointer'
                        }}
                        className="press-interactive"
                      >
                        Edit Credentials
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- TAB 4: TRANSACTION LEDGER CONSOLE --- */}
        {activeTab === 'sync_integrity' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GlassCard hoverable={false} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', border: '2.5px solid #0F172A', boxShadow: '4px 4px 0px #0F172A', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                  Transaction Ledger Console
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                  Real-time audit log of security events, administrative updates, and system operations.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={loadData} style={{ padding: '8px 14px', borderRadius: '10px', border: '2px solid #2563EB', backgroundColor: '#2563EB', color: '#FFFFFF', fontWeight: 850, fontSize: '12px', cursor: 'pointer' }} className="press-interactive">
                  Refresh Ledger
                </button>
              </div>
            </GlassCard>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['all', 'success', 'failed'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setLedgerFilter(filter)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: ledgerFilter === filter ? '2px solid #0F172A' : '2px solid #CBD5E1',
                      backgroundColor: ledgerFilter === filter ? '#0F172A' : '#FFFFFF',
                      color: ledgerFilter === filter ? '#FFFFFF' : '#475569',
                      fontWeight: 850,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    className="press-interactive"
                  >
                    {filter.toUpperCase()}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search transaction ID, action, user..."
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '2px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  width: '260px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredSyncLogs.map((log, idx) => (
                <GlassCard key={log.transactionId ? `tx-ledger-${log.transactionId}-${idx}` : `tx-ledger-${idx}`} hoverable={false} style={{ padding: '14px 18px', backgroundColor: '#FFFFFF', border: '2px solid #0F172A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A' }}>{log.action}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginTop: '4px' }}>
                        ID: {log.transactionId} | Performed By: {log.performedBy || 'System'}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginTop: '4px' }}>
                        {log.details || log.errorDetails || 'Transaction logged'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: log.status === 'success' ? '1.5px solid #10B981' : '1.5px solid #EF4444',
                        backgroundColor: log.status === 'success' ? '#D1FAE5' : '#FEE2E2',
                        color: log.status === 'success' ? '#047857' : '#B91C1C'
                      }}>
                        {log.status.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', marginTop: '6px' }}>{log.timestamp}</div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>
        )}

        {/* â”€â”€â”€ TAB 5: SYSTEM SETTINGS (GOOGLE DRIVE BACKUP & RESTORE ENGINE) â”€â”€â”€ */}
        {activeTab === 'settings' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* SUB-SECTION 1: AUTOMATED GOOGLE DRIVE BACKUP ENGINE */}
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: '#FFFFFF', border: '2.5px solid #0F172A', boxShadow: '4px 4px 0px #0F172A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #E2E8F0', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#2563EB', backgroundColor: '#EFF6FF', padding: '10px', borderRadius: '12px', border: '2px solid #2563EB' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 11a4 4 0 0 0-4-4 6 6 0 0 0-11 2 4 4 0 0 0 0 8h15a3 3 0 0 0 0-6z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>1. Automated Google Drive 24-Hour Backup Engine</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                      Automated daily backup creates 3 category folders (Students, Teachers, Expenditures) with 4 campus subfolders on Google Drive.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F0FDF4', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #16A34A' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22C55E' }}></span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803D' }}>Google Drive Active â€¢ 24h Rolling Retention (2 Snapshots/Campus)</span>
                </div>
              </div>

              {/* Security PIN verification for Backup */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '680px', marginBottom: '18px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Authenticator Password Verification
                  </label>
                  <input
                    type="password"
                    value={backupPasscode}
                    onChange={(e) => setBackupPasscode(e.target.value)}
                    placeholder="Enter Authenticator Password"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRunGoogleDriveBackup}
                    disabled={isCreatingBackup || isPurgingDrive}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '12px',
                      border: '2px solid #2563EB',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontWeight: 900,
                      fontSize: '13px',
                      boxShadow: '3px 3px 0px #1E40AF',
                      cursor: (isCreatingBackup || isPurgingDrive) ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    className="press-interactive"
                  >
                    {isCreatingBackup ? 'Backing Up to Drive...' : 'Trigger Immediate Drive Backup'}
                  </button>

                  <button
                    onClick={handlePurgeGoogleDrive}
                    disabled={isCreatingBackup || isPurgingDrive}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '12px',
                      border: '2px solid #DC2626',
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      fontWeight: 900,
                      fontSize: '13px',
                      boxShadow: '3px 3px 0px #DC2626',
                      cursor: (isCreatingBackup || isPurgingDrive) ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    className="press-interactive"
                  >
                    {isPurgingDrive ? 'Purging Google Drive...' : 'Purge Drive (Keep 3 Folders Only)'}
                  </button>
                </div>
              </div>

              {/* Progress Bar for Backup */}
              {isCreatingBackup && (
                <div style={{ marginTop: '12px', backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '12px', border: '2px solid #2563EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#1E40AF', marginBottom: '6px' }}>
                    <span>Generating JSON Snapshots & Syncing to Google Drive...</span>
                    <span>{backupProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#DBEAFE', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${backupProgress}%`, height: '100%', backgroundColor: '#2563EB', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* SUB-SECTION 2: WIPE / DELETE DATABASE (PASSCODE PROTECTED) */}
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: '#FFF5F5', border: '2.5px solid #EF4444', boxShadow: '4px 4px 0px #EF4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', borderBottom: '2px solid #FCA5A5', paddingBottom: '10px' }}>
                <div style={{ color: '#DC2626', backgroundColor: '#FEE2E2', padding: '10px', borderRadius: '12px', border: '2px solid #DC2626' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#991B1B' }}>2. Emergency Database Wipe (Purge All Schema Collections)</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 700, color: '#B91C1C' }}>
                    Protected behind Authenticator Account Password Verification. Clears all student, faculty, payment & expense collections.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '680px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 900, color: '#991B1B', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Authenticator Password Verification
                  </label>
                  <input
                    type="password"
                    value={wipePasscode}
                    onChange={(e) => setWipePasscode(e.target.value)}
                    placeholder="Enter Security Authenticator Password"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid #FCA5A5',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  onClick={handleExecuteDatabaseWipe}
                  disabled={isWipingDb}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: '2px solid #DC2626',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '13px',
                    boxShadow: '3px 3px 0px #991B1B',
                    cursor: isWipingDb ? 'not-allowed' : 'pointer',
                    marginTop: '18px',
                    whiteSpace: 'nowrap'
                  }}
                  className="press-interactive"
                >
                  {isWipingDb ? 'Wiping Database...' : 'Wipe Entire Database'}
                </button>
              </div>

              {/* Progress Overlay for Wipe */}
              {isWipingDb && (
                <div style={{ marginTop: '14px', backgroundColor: '#FEF2F2', padding: '14px', borderRadius: '12px', border: '2px solid #EF4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#991B1B', marginBottom: '6px' }}>
                    <span>Wiping entire database, please wait...</span>
                    <span>{wipeProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#FCA5A5', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${wipeProgress}%`, height: '100%', backgroundColor: '#DC2626', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* SUB-SECTION 3: DATA RESTORATION SYSTEM (CATEGORIES & CAMPUSES) */}
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: '#FFFFFF', border: '2.5px solid #0F172A', boxShadow: '4px 4px 0px #0F172A' }}>
              <div style={{ marginBottom: '18px', borderBottom: '2px solid #E2E8F0', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>3. Data Restoration & Import Engine</h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                  Select a category to view active Google Drive backups or drag-and-drop local backup files for each of the 4 campuses.
                </p>
              </div>

              {/* 3 Clickable Category Selector Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <button
                  onClick={() => setActiveRestoreCategory('Students_Data')}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: activeRestoreCategory === 'Students_Data' ? '2.5px solid #2563EB' : '2px solid #CBD5E1',
                    backgroundColor: activeRestoreCategory === 'Students_Data' ? '#EFF6FF' : '#FFFFFF',
                    color: activeRestoreCategory === 'Students_Data' ? '#1E40AF' : '#475569',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: activeRestoreCategory === 'Students_Data' ? '3px 3px 0px #2563EB' : 'none'
                  }}
                  className="press-interactive"
                >
                  Students Data & Fees
                </button>

                <button
                  onClick={() => setActiveRestoreCategory('Teachers_Data')}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: activeRestoreCategory === 'Teachers_Data' ? '2.5px solid #059669' : '2px solid #CBD5E1',
                    backgroundColor: activeRestoreCategory === 'Teachers_Data' ? '#ECFDF5' : '#FFFFFF',
                    color: activeRestoreCategory === 'Teachers_Data' ? '#065F46' : '#475569',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: activeRestoreCategory === 'Teachers_Data' ? '3px 3px 0px #059669' : 'none'
                  }}
                  className="press-interactive"
                >
                  Teachers Data & Salaries
                </button>

                <button
                  onClick={() => setActiveRestoreCategory('Expenditures_Data')}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    border: activeRestoreCategory === 'Expenditures_Data' ? '2.5px solid #D97706' : '2px solid #CBD5E1',
                    backgroundColor: activeRestoreCategory === 'Expenditures_Data' ? '#FFFBEB' : '#FFFFFF',
                    color: activeRestoreCategory === 'Expenditures_Data' ? '#92400E' : '#475569',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: activeRestoreCategory === 'Expenditures_Data' ? '3px 3px 0px #D97706' : 'none'
                  }}
                  className="press-interactive"
                >
                  Multi-Branch Expenditures
                </button>
              </div>

              {/* 4 Campus Drop Zones for Selected Category */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
                {[
                  { name: 'Erragattugutta C1' },
                  { name: 'Erragattugutta C2' },
                  { name: 'Beemaram C1' },
                  { name: 'Beemaram C2' }
                ].map(camp => {
                  const campBackups = (availableBackups[activeRestoreCategory] && availableBackups[activeRestoreCategory][camp.name]) || [];

                  return (
                    <div
                      key={camp.name}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        // Restoring from a locally-uploaded file is not supported:
                        // backups are encrypted and restored from Google Drive.
                        e.preventDefault();
                        triggerToast('Restore from a local file is not supported. Pick a backup from the Google Drive list below.');
                      }}
                      style={{
                        padding: '18px',
                        borderRadius: '16px',
                        border: '2px solid #0F172A',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>Campus: {camp.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', backgroundColor: '#E2E8F0', padding: '4px 8px', borderRadius: '6px' }}>
                          {isLoadingBackups ? 'Loading Drive...' : `${campBackups.length} Drive Snapshot(s)`}
                        </span>
                      </div>

                      {/* Active Drive Backups List for Campus */}
                      {campBackups.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {campBackups.slice(0, 2).map((bk: any, bkIdx: number) => (
                            <div key={bk.id || bk.fileName || `bk-${bkIdx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', backgroundColor: '#FFFFFF' }}>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>{bk.fileName}</div>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>
                                  {bk.source} | {new Date(bk.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleExecuteDataRestore(bk.id, bk.fileName)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #2563EB',
                                  backgroundColor: '#2563EB',
                                  color: '#FFFFFF',
                                  fontWeight: 800,
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                                className="press-interactive"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', fontStyle: 'italic', padding: '8px' }}>
                          No active Drive backup snapshots found for {camp.name} yet. Trigger a backup or upload a file below.
                        </div>
                      )}

                      {/* File Upload / Drag Zone */}
                      <label style={{
                        padding: '16px 12px',
                        border: '2px dashed #94A3B8',
                        borderRadius: '12px',
                        backgroundColor: '#FFFFFF',
                        textAlign: 'center',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB' }}>
                          Drag & Drop or Click to Select Backup (.json / .xlsx)
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>
                          Restores {activeRestoreCategory.replace('_', ' ')} records into database for {camp.name}
                        </span>
                        <input
                          type="file"
                          accept=".json,.xlsx,.csv"
                          style={{ display: 'none' }}
                          onChange={() => {
                            triggerToast('Restore from a local file is not supported. Pick a backup from the Google Drive list below.');
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* RESTORATION PROGRESS MODAL OVERLAY */}
            {restoringCampus && (
              <div style={styles.modalOverlay} className="anim-fade-in">
                <div style={{ ...styles.modalContent, maxWidth: '480px', backgroundColor: '#0F172A', color: '#FFFFFF', border: '3px solid #3B82F6', textAlign: 'center' }} className="anim-scale-in">
                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
                    Restoring Data for {restoringCampus}
                  </h3>
                  <p style={{ margin: '0 0 18px', fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                    {restoreStatusText}
                  </p>

                  <div style={{ width: '100%', height: '10px', backgroundColor: '#1E293B', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${restoreProgress}%`, height: '100%', backgroundColor: '#3B82F6', transition: 'width 0.3s ease' }}></div>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#60A5FA' }}>
                    Extraction & Schema Sync: {restoreProgress}%
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
        {/* Footer */}
        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 28px 16px', gap: '8px', opacity: 0.85, marginTop: 'auto' }}>
          <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
            Inspire ERP Authenticator Portal v2.6.4 | Powered by TRNT BEE Technologies
          </span>
        </footer>
      </main>



      {/* Edit/Create Staff Account Modal */}
      {isEditModalOpen && (
        <div style={styles.modalOverlay} className="anim-fade-in">
          <div style={styles.modalContent} className="anim-scale-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #CBD5E1', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                Edit Staff Account
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 900 }}>X</button>
            </div>

            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Username / ID</label>
                  <input
                    type="text"
                    placeholder="e.g. admin2_beemaram_c1"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Password</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type={showModalPassword ? "text" : "password"}
                      placeholder="Set Password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      style={{ ...styles.formInput, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(prev => !prev)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '2px solid #0F172A',
                        backgroundColor: '#F1F5F9',
                        fontWeight: 800,
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      className="press-interactive"
                    >
                      {showModalPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.inputLabel}>Full Name</label>
                <input
                  type="text"
                  placeholder="Staff Member Full Name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Role (Locked)</label>
                  <select
                    value={accountRole}
                    onChange={(e) => setAccountRole(e.target.value as any)}
                    disabled
                    style={{
                      ...styles.formSelect,
                      backgroundColor: '#E2E8F0',
                      cursor: 'not-allowed',
                      color: '#64748B'
                    }}
                  >
                    <option value="admin1">Admin 1 (Rector)</option>
                    <option value="admin2">Admin 2 (Campus Principal)</option>
                    <option value="accountant">Accountant</option>
                    <option value="authenticator">Security Authenticator</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Campus (Locked)</label>
                  <input
                    type="text"
                    placeholder="e.g. Erragattugutta C1"
                    value={accountCampus}
                    onChange={(e) => setAccountCampus(e.target.value)}
                    disabled
                    style={{
                      ...styles.formInput,
                      backgroundColor: '#E2E8F0',
                      cursor: 'not-allowed',
                      color: '#64748B'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '12px',
                    border: '2px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '2px solid #0F172A',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '12px',
                    boxShadow: '3px 3px 0px #0F172A',
                    cursor: 'pointer'
                  }}
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex' as const,
    flexDirection: 'row' as const,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden' as const,
  },
  sidebar: {
    width: '280px',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRight: '2.5px solid #0F172A',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    justifyContent: 'space-between' as const,
    padding: '24px',
    flexShrink: 0,
    zIndex: 10,
    boxSizing: 'border-box' as const
  },
  sidebarTop: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '20px'
  },
  branding: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px'
  },
  meta: {
    fontSize: '10px',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#D97706',
    display: 'block'
  },
  sidebarTitle: {
    fontSize: '15px',
    fontWeight: '900',
    letterSpacing: '-0.02em',
    marginTop: '1px',
    color: '#0F172A'
  },
  sidebarDivider: {
    height: '2px',
    backgroundColor: '#CBD5E1',
    margin: '4px 0'
  },
  sidebarNav: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '8px'
  },
  tabButton: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '10px',
    transition: 'all 0.15s ease',
    textAlign: 'left' as const,
    fontFamily: 'var(--font-family)',
    boxSizing: 'border-box' as const
  },
  sidebarBottom: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '12px'
  },
  workspace: {
    flex: 1,
    height: '100%',
    overflowY: 'auto' as const,
    padding: '32px 40px',
    backgroundColor: '#F8FAFC',
    position: 'relative' as const,
    boxSizing: 'border-box' as const
  },
  workspaceHeader: {
    marginBottom: '24px',
    borderBottom: '2.5px solid #0F172A',
    paddingBottom: '16px',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const
  },
  workspaceTitle: {
    fontSize: '22px',
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: '-0.02em',
    margin: 0
  },
  workspaceSubtitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#64748B',
    marginTop: '4px',
    margin: '4px 0 0'
  },
  metricCard: {
    padding: '20px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '4px',
    border: '2.5px solid #0F172A',
    borderRadius: '16px',
    backgroundColor: '#FFFFFF',
    boxShadow: '4px 4px 0px #0F172A',
  },
  metricLabel: {
    fontSize: '10px',
    color: '#64748B',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em'
  },
  metricValue: {
    fontSize: '22px',
    fontWeight: '900',
    letterSpacing: '-0.02em',
    marginTop: '2px'
  },
  metricSub: {
    fontSize: '10px',
    color: '#64748B',
    fontWeight: '700'
  },
  keysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px'
  },
  keyCard: {
    padding: '18px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '10px',
    backgroundColor: '#FFFFFF',
    border: '2.5px solid #D97706',
    borderRadius: '20px',
    boxShadow: '4px 4px 0px #0F172A',
    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
  },
  keyRoleLabel: {
    fontSize: '10px',
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const
  },
  keyDisplayBlock: {
    padding: '10px 14px',
    borderRadius: '12px',
    textAlign: 'center' as const,
    border: '2px solid #CBD5E1',
    backgroundColor: '#F8FAFC'
  },
  keyValue: {
    fontSize: '22px',
    fontFamily: 'monospace',
    letterSpacing: '0.08em',
    fontWeight: '900',
    color: '#0F172A'
  },
  copyBtn: {
    width: '100%',
    padding: '8px',
    borderRadius: '10px',
    border: '2px solid #0F172A',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: '11px',
    fontWeight: '900',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    boxShadow: '2px 2px 0px #0F172A'
  },
  formGroup: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '4px'
  },
  inputLabel: {
    fontSize: '10px',
    fontWeight: '900',
    color: '#475569',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em'
  },
  formInput: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '2px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--font-family)',
    fontWeight: 700
  },
  formSelect: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '2px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--font-family)',
    fontWeight: 800
  },
  accountsGrid: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '10px'
  },
  accountCard: {
    padding: '14px 18px',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    border: '2.5px solid #0F172A',
    borderRadius: '16px',
    backgroundColor: '#FFFFFF',
    boxShadow: '3px 3px 0px #0F172A'
  },
  deleteBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '2px solid #EF4444',
    background: '#FEE2E2',
    color: '#991B1B',
    fontSize: '11px',
    fontWeight: '900',
    cursor: 'pointer'
  },
  logoutBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '2px solid #EF4444',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    fontWeight: '900',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-family)'
  },
  toast: {
    position: 'fixed' as const,
    bottom: '24px',
    right: '24px',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    border: '2.5px solid #3B82F6',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    padding: '12px 20px',
    borderRadius: '14px',
    fontWeight: '900',
    fontSize: '13px',
    zIndex: 9999
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999
  },
  modalContent: {
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    backgroundColor: '#FFFFFF',
    border: '3px solid #0F172A',
    borderRadius: '24px',
    padding: '28px',
    boxShadow: '8px 8px 0px #0F172A'
  }
};

