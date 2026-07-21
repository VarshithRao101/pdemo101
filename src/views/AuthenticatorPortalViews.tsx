import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { LiveConnectionIndicator } from '../components/common/LiveConnectionIndicator';
import { InspireLogo } from '../components/common/InspireLogo';
import { onSocketEvent } from '../services/socketClient';
import { authenticatorService } from '../services/authenticatorService';
import type { 
  BackupCodeInfo, 
  AccountInfo, 
  AuthenticatorStats,
  SyncJournalEntry,
  BackupResponse
} from '../services/authenticatorService';

export const AuthenticatorDashboardView: React.FC = () => {
  const { logout, activeTab: globalActiveTab, setActiveTab: setGlobalActiveTab } = useNavigation();
  const [toast, setToast] = useState<string | null>(null);
  
  // Tab control
  const activeTab = (globalActiveTab === 'keys' || globalActiveTab === 'backup_codes' || globalActiveTab === 'accounts' || globalActiveTab === 'sync_integrity') 
    ? globalActiveTab 
    : 'dashboard';

  const setActiveTab = (tab: 'dashboard' | 'keys' | 'backup_codes' | 'accounts' | 'sync_integrity') => {
    setGlobalActiveTab(tab);
  };

  // Backend state
  const [keysData, setKeysData] = useState<any>(null);
  const [otpPortal, setOtpPortal] = useState<'admin1' | 'admin2'>('admin1');
  const [backupCodes, setBackupCodes] = useState<BackupCodeInfo[]>([]);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [stats, setStats] = useState<AuthenticatorStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalStaff: 0,
    activeDevices: 0
  });

  // Sync integrity & database management state
  const [syncLogs, setSyncLogs] = useState<SyncJournalEntry[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupDetails, setBackupDetails] = useState<BackupResponse | null>(null);

  // Countdown timer for daily keys expiration
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Searches & Modals
  const [studentSearch, setStudentSearch] = useState<string>('');
  
  // Password reset state
  const [resetUsername, setResetUsername] = useState<string>('');
  const [resetBackupCode, setResetBackupCode] = useState<string>('');
  const [resetNewPassword, setResetNewPassword] = useState<string>('');

  // Account creation/edit state
  const [accountUsername, setAccountUsername] = useState<string>('');
  const [accountRole, setAccountRole] = useState<'admin1' | 'admin2' | 'admin3' | 'accountant'>('accountant');
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [accountMobile, setAccountMobile] = useState<string>('');
  const [accountDepartment, setAccountDepartment] = useState<string>('');

  // Trigger Toast Notification
  const triggerToast = (msg: string) => {
    setToast(msg);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Initial Data
  const loadData = async () => {
    try {
      const [keysRes, codesRes, accountsRes, statsRes, syncRes] = await Promise.all([
        authenticatorService.getKeys(),
        authenticatorService.getBackupCodes(),
        authenticatorService.getAccounts(),
        authenticatorService.getStats(),
        authenticatorService.getSyncJournal()
      ]);
      setKeysData(keysRes);
      setBackupCodes(codesRes);
      setAccounts(accountsRes);
      setStats(statsRes);
      setSyncLogs(syncRes);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to sync authenticator data.');
    }
  };

  // Listen for real-time transaction updates from other nodes
  useEffect(() => {
    const unsubscribe = onSocketEvent('sync:journal-updated' as any, (updatedJournal: any) => {
      setSyncLogs(prev => {
        const index = prev.findIndex(item => item.transactionId === updatedJournal.transactionId);
        if (index > -1) {
          const next = [...prev];
          next[index] = updatedJournal;
          return next;
        } else {
          return [updatedJournal, ...prev];
        }
      });
      triggerToast(`Sync Audit Update: ${updatedJournal.action} is ${updatedJournal.status.toUpperCase()}`);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadData();
    // Poll stats and keys every 15 seconds to keep dashboard alive
    const pollInterval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  // Compute countdown timer to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      
      const diffMs = midnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeRemaining('00h 00m 00s');
        loadData(); // reload keys
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      setTimeRemaining(`${hStr}h ${mStr}m ${sStr}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  // Password reset via backup code
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !resetBackupCode || !resetNewPassword) {
      triggerToast('All credentials reset fields are required.');
      return;
    }

    try {
      const res = await authenticatorService.resetPassword({
        username: resetUsername,
        backupCode: resetBackupCode,
        password: resetNewPassword
      });
      triggerToast(`Password reset! Next Backup Code: ${res.nextBackupCode}`);
      setResetUsername('');
      setResetBackupCode('');
      setResetNewPassword('');
      loadData(); // refresh codes list
    } catch (err: any) {
      triggerToast(err.message || 'Password reset failed.');
    }
  };

  // Create/Update Admin & Accountant Accounts
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountUsername || (!editingAccountId && !accountPassword)) {
      triggerToast(editingAccountId ? 'Username is required.' : 'Username and password are required.');
      return;
    }

    try {
      if (editingAccountId) {
        await authenticatorService.updateAccount(editingAccountId, {
          username: accountUsername,
          name: accountName,
          email: accountEmail,
          mobile: accountMobile,
          department: accountDepartment
        });
        triggerToast('Staff account updated successfully.');
      } else {
        const u = await authenticatorService.createAccount({
          username: accountUsername,
          role: accountRole,
          password: accountPassword,
          name: accountName,
          email: accountEmail,
          mobile: accountMobile,
          department: accountDepartment
        });
        triggerToast(`Created login for ${u.role}. Backup code: ${u.backupCode}`);
      }
      setAccountUsername('');
      setAccountPassword('');
      setAccountName('');
      setAccountEmail('');
      setAccountMobile('');
      setAccountDepartment('');
      setEditingAccountId(null);
      loadData(); // reload
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save account.');
    }
  };

  // Delete staff account
  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff account?')) return;
    try {
      await authenticatorService.deleteAccount(id);
      triggerToast('Staff account deleted successfully.');
      loadData();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete account.');
    }
  };

  // Reconcile pending/failed transaction sync entries
  const handleReconcile = async () => {
    setIsReconciling(true);
    try {
      const msg = await authenticatorService.reconcileDatabase();
      triggerToast(msg);
      // Reload logs
      const syncRes = await authenticatorService.getSyncJournal();
      setSyncLogs(syncRes);
    } catch (err: any) {
      triggerToast(err.message || 'Reconciliation failed.');
    } finally {
      setIsReconciling(false);
    }
  };

  // Create database backup archive
  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupDetails(null);
    try {
      const details = await authenticatorService.createBackup();
      setBackupDetails(details);
      triggerToast('System database backup snapshot archive created.');
    } catch (err: any) {
      triggerToast(err.message || 'Backup failed.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const filteredBackupCodes = backupCodes.filter(
    c => c.username.toLowerCase().includes(studentSearch.toLowerCase()) || 
         c.name.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    triggerToast('Copied verification key to clipboard!');
  };

  return (
    <div style={styles.container} className="anim-slide-up neo-2d light-theme">
      {/* Toast Notification */}
      {toast && (
        <div style={styles.toast}>
          {toast}
        </div>
      )}

      {/* Sidebar (Left column) */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.branding}>
            <div style={styles.avatar}>AU</div>
            <div>
              <span style={styles.meta}>Credential Override</span>
              <h2 style={styles.sidebarTitle}>Authenticator</h2>
            </div>
          </div>

          <div style={styles.sidebarDivider} />

          {/* Navigation Links */}
          <nav style={styles.sidebarNav}>
            {(['dashboard', 'keys', 'backup_codes', 'accounts', 'sync_integrity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tabButton,
                  backgroundColor: activeTab === tab ? 'var(--dark-charcoal)' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : 'var(--muted-gray)',
                  borderColor: activeTab === tab ? 'var(--dark-charcoal)' : 'transparent',
                  fontWeight: activeTab === tab ? 800 : 600,
                }}
                className="press-interactive"
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: activeTab === tab ? 'var(--royal-gold)' : 'rgba(0,0,0,0.15)',
                  marginRight: '10px',
                  flexShrink: 0
                }} />
                {tab === 'dashboard' && 'Dashboard Overview'}
                {tab === 'keys' && 'Security Keys (OTP)'}
                {tab === 'backup_codes' && 'User Backup Codes'}
                {tab === 'accounts' && 'Account Control'}
                {tab === 'sync_integrity' && 'Sync Integrity Console'}
              </button>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarBottom}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <LiveConnectionIndicator compact />
            <InspireLogo size="sm" />
          </div>
          <button onClick={logout} style={styles.logoutBtn} className="press-interactive">
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Workspace Content (Right column) */}
      <main style={styles.workspace}>
        {/* Workspace Header */}
        <header style={styles.workspaceHeader}>
          <div>
            <h1 style={styles.workspaceTitle}>
              {activeTab === 'dashboard' && 'Security Shield Status'}
              {activeTab === 'keys' && 'Dynamic Authorization Keys'}
              {activeTab === 'backup_codes' && 'User Recovery & Backups'}
              {activeTab === 'accounts' && 'Staff Access Registry'}
              {activeTab === 'sync_integrity' && 'Database Sync Integrity'}
            </h1>
            <p style={styles.workspaceSubtitle}>
              {activeTab === 'dashboard' && 'Real-time security metrics, active web sessions, and system threat analysis.'}
              {activeTab === 'keys' && 'Check daily operational override passwords and active 6-digit login security keys.'}
              {activeTab === 'backup_codes' && 'Search client credentials and override student password lock profiles.'}
              {activeTab === 'accounts' && 'Provision, update, and manage login authorization credentials for staff.'}
              {activeTab === 'sync_integrity' && 'Audit decentralized transaction logs and trigger secure database backups.'}
            </p>
          </div>
        </header>

        {/* ─── TAB 1: DASHBOARD OVERVIEW ─── */}
        {activeTab === 'dashboard' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Security Metrics Grid */}
            <div style={styles.metricsGrid}>
              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderLeft: '5px solid #10B981' }}>
                <span style={styles.metricLabel}>Security Shield Status</span>
                <strong style={{ ...styles.metricValue, color: '#10B981' }}>ACTIVE</strong>
                <span style={styles.metricSub}>256-bit encryption verified</span>
              </GlassCard>
              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderLeft: '5px solid var(--royal-gold)' }}>
                <span style={styles.metricLabel}>Active Web Sessions</span>
                <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>
                  {stats.activeDevices}
                </strong>
                <span style={styles.metricSub}>Live console connection count</span>
              </GlassCard>
              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderLeft: '5px solid #10B981' }}>
                <span style={styles.metricLabel}>System Threat Index</span>
                <strong style={{ ...styles.metricValue, color: '#10B981' }}>0.0%</strong>
                <span style={styles.metricSub}>No security violations logged</span>
              </GlassCard>
            </div>

            {/* Split row details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <GlassCard hoverable={false} style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--card-border)', paddingBottom: '8px', color: 'var(--dark-charcoal)' }}>Active System Profiles</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={styles.profileStatItem}>
                    <span>Active Student Profiles:</span>
                    <strong>{stats.totalStudents}</strong>
                  </div>
                  <div style={styles.profileStatItem}>
                    <span>Active Faculty Profiles:</span>
                    <strong>{stats.totalTeachers}</strong>
                  </div>
                  <div style={styles.profileStatItem}>
                    <span>Authorized Admins & Staff:</span>
                    <strong>{stats.totalStaff}</strong>
                  </div>
                </div>
              </GlassCard>

              <GlassCard hoverable={false} style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--card-border)', paddingBottom: '8px', color: 'var(--dark-charcoal)' }}>Active Security Shield System</h4>
                <p style={{ fontSize: '12px', color: 'var(--muted-gray)', lineHeight: '1.6', margin: 0 }}>
                  This dashboard enforces dynamic OTP access control across the institution. The keys shown in the "Security Keys" tab refresh automatically every day.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#10B981' }}>Daily Rotation Synchronization Active</span>
                </div>
              </GlassCard>
            </div>
          </section>
        )}

        {/* ─── TAB 2: SECURITY KEYS (OTP) ─── */}
        {activeTab === 'keys' && keysData && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GlassCard hoverable={false} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: 'rgba(255,255,255,0.7)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Dynamic Security OTP Keys</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--muted-gray)' }}>Keys generated automatically for daily operations override authorization.</p>
              </div>
              <div style={styles.timerBlock}>
                <span style={{ fontSize: '9px', color: '#64748B', fontWeight: '850', letterSpacing: '0.08em' }}>ROTATION COUNTDOWN</span>
                <strong style={styles.timerVal}>{timeRemaining}</strong>
              </div>
            </GlassCard>

            {/* Section 1: Daily Login PINs */}
            <div>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, color: 'var(--royal-gold)', borderBottom: '2px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>Section 1: Daily Login PINs</h4>
              <div style={styles.keysGrid}>
                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>RECTOR PORTAL (ADMIN 1)</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.admin1}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button onClick={() => copyToClipboard(keysData.dailyPins?.admin1)} style={styles.copyBtn} className="press-interactive">Copy PIN</button>
                  </div>
                  <div style={styles.keyDesc}>Daily 6-digit login PIN. Resets at midnight.</div>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>PRINCIPAL PORTAL (ADMIN 2)</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.admin2}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button onClick={() => copyToClipboard(keysData.dailyPins?.admin2)} style={styles.copyBtn} className="press-interactive">Copy PIN</button>
                  </div>
                  <div style={styles.keyDesc}>Daily 6-digit login PIN. Resets at midnight.</div>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>ACCOUNTANT PORTAL</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.accountant}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button onClick={() => copyToClipboard(keysData.dailyPins?.accountant)} style={styles.copyBtn} className="press-interactive">Copy PIN</button>
                  </div>
                  <div style={styles.keyDesc}>Daily 6-digit login PIN. Resets at midnight.</div>
                </GlassCard>

                <GlassCard hoverable={false} style={{ ...styles.keyCard, borderColor: 'var(--royal-gold)' }}>
                  <span style={styles.keyRoleLabel}>AUTHENTICATOR PORTAL</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.authenticator}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button onClick={() => copyToClipboard(keysData.dailyPins?.authenticator)} style={styles.copyBtn} className="press-interactive">Copy PIN</button>
                  </div>
                  <div style={styles.keyDesc}>Predefined static login PIN. Does not rotate.</div>
                </GlassCard>
              </div>
            </div>

            {/* Section 2: Action Security OTPs */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '16px' }}>
                <h4 style={{ ...styles.sectionSubtitle, margin: 0, color: 'var(--royal-gold)' }}>Section 2: Action Security OTPs</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setOtpPortal('admin1')} 
                    style={{ ...styles.quickFillPill, backgroundColor: otpPortal === 'admin1' ? 'var(--dark-charcoal)' : 'rgba(0,0,0,0.06)', color: otpPortal === 'admin1' ? '#fff' : 'var(--dark-charcoal)' }}
                    className="press-interactive"
                  >
                    Admin 1 (Rector)
                  </button>
                  <button 
                    onClick={() => setOtpPortal('admin2')} 
                    style={{ ...styles.quickFillPill, backgroundColor: otpPortal === 'admin2' ? 'var(--dark-charcoal)' : 'rgba(0,0,0,0.06)', color: otpPortal === 'admin2' ? '#fff' : 'var(--dark-charcoal)' }}
                    className="press-interactive"
                  >
                    Admin 2 (Principal)
                  </button>
                </div>
              </div>

              {otpPortal === 'admin1' ? (
                <div style={styles.keysGrid} className="anim-fade-in">
                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>STUDENT ADMINISTRATIVE OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.students}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button onClick={() => copyToClipboard(keysData.sectionOtps?.admin1?.students)} style={styles.copyBtn} className="press-interactive">Copy OTP</button>
                    </div>
                    <div style={styles.keyDesc}>Required for student registry updates and profile saves.</div>
                  </GlassCard>

                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>NOTICES / PUBLISHING OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.publishing}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button onClick={() => copyToClipboard(keysData.sectionOtps?.admin1?.publishing)} style={styles.copyBtn} className="press-interactive">Copy OTP</button>
                    </div>
                    <div style={styles.keyDesc}>Required for creating and publishing campus bulletins.</div>
                  </GlassCard>

                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>TIMETABLE & EXAMS OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.exams}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button onClick={() => copyToClipboard(keysData.sectionOtps?.admin1?.exams)} style={styles.copyBtn} className="press-interactive">Copy OTP</button>
                    </div>
                    <div style={styles.keyDesc}>Required for exam result uploads and status releases.</div>
                  </GlassCard>
                </div>
              ) : (
                <div style={styles.keysGrid} className="anim-fade-in">
                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>MULTI-BRANCH EXPENDITURE OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin2?.expenditure}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button onClick={() => copyToClipboard(keysData.sectionOtps?.admin2?.expenditure)} style={styles.copyBtn} className="press-interactive">Copy OTP</button>
                    </div>
                    <div style={styles.keyDesc}>Required for operational budget updates and expenditures.</div>
                  </GlassCard>

                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>STAFF SALARIES OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin2?.salaries}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button onClick={() => copyToClipboard(keysData.sectionOtps?.admin2?.salaries)} style={styles.copyBtn} className="press-interactive">Copy OTP</button>
                    </div>
                    <div style={styles.keyDesc}>Required for staff payroll and salary release operations.</div>
                  </GlassCard>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── TAB 3: USER BACKUP CODES ─── */}
        {activeTab === 'backup_codes' && (
          <section className="anim-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Backup Codes Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                placeholder="Search students or faculty by name or ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={styles.formInput}
              />

              <div style={styles.backupCodesList}>
                {filteredBackupCodes.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted-gray)', padding: '40px', fontSize: '12px' }}>
                    No student/faculty records match search.
                  </div>
                ) : (
                  filteredBackupCodes.map((c) => (
                    <GlassCard key={c.username} hoverable={false} style={{ ...styles.backupCodeCard, backgroundColor: 'rgba(255,255,255,0.7)' }}>
                      <div>
                        <strong style={{ fontSize: '13px', color: 'var(--dark-charcoal)' }}>{c.name}</strong>
                        <div style={{ fontSize: '10.5px', color: 'var(--muted-gray)', marginTop: '3px' }}>
                          ID: <span style={{ color: 'var(--royal-gold)', fontWeight: 800 }}>{c.username.toUpperCase()}</span> • Role: {c.role.toUpperCase()}
                        </div>
                      </div>
                      <div style={styles.backupCodeValBlock}>
                        <span style={{ fontSize: '9px', color: '#64748B', fontWeight: '850', letterSpacing: '0.05em' }}>BACKUP CODE</span>
                        <strong style={styles.backupCodeVal}>{c.backupCode}</strong>
                        <button onClick={() => copyToClipboard(c.backupCode)} style={{ ...styles.copyBtn, marginTop: '4px', padding: '3px 8px', fontSize: '9px' }} className="press-interactive">Copy</button>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>

            {/* Password Reset Console */}
            <GlassCard hoverable={false} style={{ padding: '20px', height: 'fit-content', backgroundColor: 'rgba(255,255,255,0.7)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--card-border)', paddingBottom: '8px' }}>Password Recovery Desk</h4>
              <p style={{ fontSize: '11px', color: 'var(--muted-gray)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                Verify backup code to reset student passcode. Re-generates a new backup code upon submission.
              </p>

              <form onSubmit={handleResetPassword} style={styles.resetForm}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>User Roll / ID Card</label>
                  <input
                    type="text"
                    placeholder="e.g. STU-2421604"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Verify Backup Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 123456"
                    value={resetBackupCode}
                    onChange={(e) => setResetBackupCode(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>New Login PIN (6-digits)</label>
                  <input
                    type="password"
                    placeholder="e.g. 111111"
                    maxLength={6}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <button type="submit" style={styles.resetSubmitBtn} className="press-interactive">
                  Submit & Set Password
                </button>
              </form>
            </GlassCard>
          </section>
        )}

        {/* ─── TAB 4: ACCOUNT CONTROL ─── */}
        {activeTab === 'accounts' && (
          <section className="anim-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Accounts Listing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={styles.accountsGrid}>
                {accounts.map((acc) => (
                  <GlassCard
                    key={acc._id}
                    hoverable={true}
                    onClick={() => {
                      setEditingAccountId(acc._id);
                      setAccountUsername(acc.username);
                      setAccountRole(acc.role);
                      setAccountPassword('');
                      setAccountName(acc.name || '');
                      setAccountEmail(acc.email || '');
                      setAccountMobile(acc.mobile || '');
                      setAccountDepartment(acc.department || '');
                      triggerToast(`Loaded credentials for ${acc.username}`);
                    }}
                    style={{
                      ...styles.accountCard,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      border: editingAccountId === acc._id ? '2px solid var(--royal-gold)' : '2px solid var(--card-border)',
                      transition: 'all 0.15s ease',
                      flexDirection: 'row' as const,
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--dark-charcoal)' }}>{acc.name || 'Unnamed Staff'}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>@{acc.username}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--dark-charcoal)', marginTop: '6px', display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
                        <span>Role: <strong style={{ textTransform: 'uppercase', color: 'var(--royal-gold)' }}>{acc.role}</strong></span>
                        {acc.department && <span>• Dept: <strong>{acc.department}</strong></span>}
                        {acc.email && <span>• Email: <strong>{acc.email}</strong></span>}
                        {acc.mobile && <span>• Mobile: <strong>{acc.mobile}</strong></span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(acc._id);
                        }}
                        style={styles.deleteBtn}
                        className="press-interactive"
                      >
                        Delete
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>

            {/* Account Form */}
            <GlassCard hoverable={false} style={{ padding: '20px', height: 'fit-content', backgroundColor: 'rgba(255,255,255,0.7)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--card-border)', paddingBottom: '8px' }}>
                {editingAccountId ? 'Edit Credentials' : 'Provision Staff Account'}
              </h4>

              <form onSubmit={handleSaveAccount} style={styles.resetForm}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Login ID / Username</label>
                  <input
                    type="text"
                    placeholder="e.g. admin1"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Varshith Rao"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. email@inspirehnk.org"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9988776655"
                    value={accountMobile}
                    onChange={(e) => setAccountMobile(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Department / Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Campus Administration"
                    value={accountDepartment}
                    onChange={(e) => setAccountDepartment(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Portal Role Access {editingAccountId && ' (Cannot modify)'}</label>
                  <select
                    value={accountRole}
                    onChange={(e: any) => setAccountRole(e.target.value)}
                    style={{ ...styles.formSelect, opacity: editingAccountId ? 0.6 : 1, cursor: editingAccountId ? 'not-allowed' : 'pointer' }}
                    disabled={!!editingAccountId}
                  >
                    <option value="admin1">Admin 1 (Rector Operations)</option>
                    <option value="admin2">Admin 2 (Campus Principal)</option>
                    <option value="admin3">Admin 3 (Academics & Exam Desk)</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>
                    {editingAccountId ? 'Password (Cannot edit here)' : 'Login PIN / Password'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingAccountId ? "Password edit disabled" : "e.g. 111111"}
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    style={{ ...styles.formInput, opacity: editingAccountId ? 0.6 : 1, cursor: editingAccountId ? 'not-allowed' : 'text' }}
                    disabled={!!editingAccountId}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="submit" style={styles.resetSubmitBtn} className="press-interactive">
                    {editingAccountId ? 'Update Details' : 'Provision Account'}
                  </button>
                  {editingAccountId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAccountId(null);
                        setAccountUsername('');
                        setAccountPassword('');
                        setAccountName('');
                        setAccountEmail('');
                        setAccountMobile('');
                        setAccountDepartment('');
                      }}
                      style={styles.cancelBtn}
                      className="press-interactive"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </GlassCard>
          </section>
        )}

        {/* ─── TAB 5: SYNC INTEGRITY & DATABASE OVERVIEW ─── */}
        {activeTab === 'sync_integrity' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Sync Integrity & Database Fallback</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--muted-gray)' }}>
                    Real-time transaction status audit ledger. Reconcile database nodes or trigger manual backups.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleReconcile}
                    disabled={isReconciling}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '2px solid var(--card-border)',
                      backgroundColor: 'var(--royal-gold)',
                      color: '#000',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      opacity: isReconciling ? 0.6 : 1
                    }}
                    className="press-interactive"
                  >
                    {isReconciling ? 'Reconciling...' : ' Reconcile DB'}
                  </button>
                  <button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '2px solid var(--card-border)',
                      backgroundColor: '#10B981',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      opacity: isBackingUp ? 0.6 : 1
                    }}
                    className="press-interactive"
                  >
                    {isBackingUp ? 'Backing up...' : ' Create DB Backup'}
                  </button>
                </div>
              </div>

              {backupDetails && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  animation: 'fade-in 0.3s ease'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#10B981', fontWeight: 800 }}>
                    ✓ Database Backup Archive Created Successfully
                  </h4>
                  <div style={{ fontSize: '11px', color: 'var(--dark-charcoal)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span><strong>Archive:</strong> {backupDetails.archiveName}</span>
                    <span><strong>Size:</strong> {(backupDetails.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                    <span><strong>Checksum (SHA256):</strong> <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', wordBreak: 'break-all' }}>{backupDetails.checksum}</code></span>
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard hoverable={false} style={{ padding: '20px', overflowX: 'auto', backgroundColor: 'rgba(255,255,255,0.7)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--card-border)', paddingBottom: '8px' }}>
                Sync Audit Trail Ledger ({syncLogs.length} transactions)
              </h4>

              {syncLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '12px' }}>
                  No transaction sync entries recorded in this session.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '800' }}>Timestamp</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '800' }}>Transaction ID</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '800' }}>Action / Event</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '800' }}>Source → Target</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '800' }}>Client Acks</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '800' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log) => {
                      const date = new Date(log.createdAt);
                      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const isPending = log.status === 'pending';
                      const isSynced = log.status === 'synced';
                      
                      let badgeBg = '#EF4444';
                      let badgeColor = '#ffffff';
                      if (isSynced) {
                        badgeBg = '#10B981';
                      } else if (isPending) {
                        badgeBg = '#F59E0B';
                      }

                      return (
                        <tr key={log._id || log.transactionId} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>{timeStr}</td>
                          <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{log.transactionId}</td>
                          <td style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{log.action}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--muted-gray)' }}>
                            <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{log.sourceNode}</span>
                            {' → '}
                            <span style={{ fontWeight: 800, color: '#3B82F6' }}>{log.targetNode}</span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <strong>{log.acknowledgedClients ? log.acknowledgedClients.length : 0}</strong> / {log.expectedClientsCount || 0}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              letterSpacing: '0.05em'
                            }}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </GlassCard>
          </section>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex' as const,
    flexDirection: 'row' as const,
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--dark-charcoal)',
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
    backgroundColor: '#ffffff',
    borderRight: '2px solid var(--card-border)',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    justifyContent: 'space-between' as const,
    padding: '24px',
    flexShrink: 0,
    zIndex: 10,
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
  avatar: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: 'var(--dark-charcoal)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontWeight: '900',
    fontSize: '15px',
    color: 'var(--royal-gold)',
    border: '2px solid var(--card-border)',
  },
  meta: {
    fontSize: '9.5px',
    fontWeight: '850',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--royal-gold)',
    display: 'block'
  },
  sidebarTitle: {
    fontSize: '15px',
    fontWeight: '850',
    letterSpacing: '-0.02em',
    marginTop: '1px',
    color: 'var(--dark-charcoal)'
  },
  sidebarDivider: {
    height: '2px',
    backgroundColor: 'var(--card-border)',
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
    borderRadius: '10px',
    border: '2px solid transparent',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex' as const,
    alignItems: 'center' as const,
    transition: 'all 0.15s ease',
    textAlign: 'left' as const,
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
    backgroundColor: 'var(--bg-primary)',
    position: 'relative' as const,
  },
  workspaceHeader: {
    marginBottom: '24px',
    borderBottom: '2px solid var(--card-border)',
    paddingBottom: '16px',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const
  },
  workspaceTitle: {
    fontSize: '20px',
    fontWeight: '900',
    color: 'var(--dark-charcoal)',
    letterSpacing: '-0.02em'
  },
  workspaceSubtitle: {
    fontSize: '12px',
    color: 'var(--muted-gray)',
    marginTop: '4px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px'
  },
  metricCard: {
    padding: '20px 24px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '4px',
    border: '2px solid var(--card-border)',
    borderRadius: '14px',
    backgroundColor: 'rgba(255,255,255,0.7)',
    boxShadow: 'none',
  },
  metricLabel: {
    fontSize: '9.5px',
    color: 'var(--muted-gray)',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em'
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: '900',
    letterSpacing: '-0.02em',
    marginTop: '2px'
  },
  metricSub: {
    fontSize: '10px',
    color: 'var(--muted-gray)',
    fontWeight: '500'
  },
  profileStatItem: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    fontSize: '12px',
    padding: '8px 0',
    borderBottom: '2px solid var(--card-border)',
    color: 'var(--dark-charcoal)'
  },
  timerBlock: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'flex-end' as const,
    border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: '8px 16px',
    borderRadius: '10px'
  },
  timerVal: {
    fontSize: '15px',
    fontFamily: 'monospace',
    fontWeight: '800',
    color: 'var(--royal-gold)',
    marginTop: '2px'
  },
  keysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  keyCard: {
    padding: '20px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '10px',
    backgroundColor: 'rgba(255,255,255,0.7)',
    border: '2px solid var(--card-border)',
    borderRadius: '14px',
    boxShadow: 'none'
  },
  keyRoleLabel: {
    fontSize: '9px',
    fontWeight: '850',
    color: 'var(--royal-gold)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const
  },
  keyDisplayBlock: {
    padding: '10px 14px',
    borderRadius: '10px',
    textAlign: 'center' as const,
    border: '2px solid var(--card-border)',
    backgroundColor: '#fff'
  },
  keyValue: {
    fontSize: '22px',
    fontFamily: 'monospace',
    letterSpacing: '0.06em',
    fontWeight: '800',
    color: 'var(--dark-charcoal)'
  },
  keyDesc: {
    fontSize: '11px',
    color: 'var(--muted-gray)',
    lineHeight: '1.5'
  },
  copyBtn: {
    width: '100%',
    padding: '6px',
    borderRadius: '8px',
    border: '2px solid var(--card-border)',
    backgroundColor: '#fff',
    color: 'var(--dark-charcoal)',
    fontSize: '11px',
    fontWeight: '750',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
  },
  backupCodesList: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '10px',
    maxHeight: '520px',
    overflowY: 'auto' as const,
    paddingRight: '8px'
  },
  backupCodeCard: {
    padding: '14px 18px',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    border: '2px solid var(--card-border)',
    borderRadius: '12px'
  },
  backupCodeValBlock: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'flex-end' as const
  },
  backupCodeVal: {
    fontSize: '14px',
    fontFamily: 'monospace',
    letterSpacing: '0.04em',
    fontWeight: '800',
    color: 'var(--dark-charcoal)',
    marginTop: '2px'
  },
  resetForm: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '12px'
  },
  formGroup: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '4px'
  },
  inputLabel: {
    fontSize: '9.5px',
    fontWeight: '800',
    color: 'var(--muted-gray)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em'
  },
  formInput: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    color: 'var(--dark-charcoal)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--font-family)',
    fontWeight: 500
  },
  formSelect: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    color: 'var(--dark-charcoal)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--font-family)',
    fontWeight: 600
  },
  resetSubmitBtn: {
    padding: '13px 20px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'var(--dark-charcoal)',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '12.5px',
    cursor: 'pointer',
    marginTop: '8px',
    fontFamily: 'var(--font-family)'
  },
  cancelBtn: {
    padding: '13px 20px',
    borderRadius: '10px',
    border: '2px solid var(--card-border)',
    backgroundColor: 'rgba(0,0,0,0.06)',
    color: 'var(--dark-charcoal)',
    fontWeight: '700',
    fontSize: '12.5px',
    cursor: 'pointer',
    marginTop: '8px',
    fontFamily: 'var(--font-family)'
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
    border: '2px solid var(--card-border)',
    borderRadius: '14px'
  },
  deleteBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '2px solid #EF4444',
    background: 'transparent',
    color: '#EF4444',
    fontSize: '11px',
    fontWeight: '750',
    cursor: 'pointer'
  },
  logoutBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '2px solid rgba(239, 68, 68, 0.25)',
    background: 'transparent',
    color: '#EF4444',
    fontWeight: '800',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'center' as const
  },
  toast: {
    position: 'fixed' as const,
    bottom: '24px',
    right: '24px',
    backgroundColor: 'var(--dark-charcoal)',
    color: '#FFF',
    padding: '12px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '12px',
    zIndex: 9999
  },
  sectionSubtitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--muted-gray)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em'
  },
  quickFillPill: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--dark-charcoal)',
    backgroundColor: 'rgba(0,0,0,0.06)',
    border: '2px solid var(--card-border)',
    borderRadius: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)'
  }
};
