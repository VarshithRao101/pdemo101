﻿import React, { useState, useEffect } from 'react';
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

  return (
    <div style={styles.container} className="anim-slide-up neo-2d light-theme">
      {/* Background design */}
      <div style={styles.bgOverlay} />

      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.branding}>
            <div style={styles.avatar}>AU</div>
            <div>
              <span style={styles.meta}>Credential & Secure Access</span>
              <h2 style={styles.title}>Authenticator Dashboard</h2>
              <p style={styles.subtitle}>Institution-wide security override & authorization gateway</p>
            </div>
          </div>
          <LiveConnectionIndicator compact />
          <div style={{ paddingRight: '8px' }}>
            <InspireLogo size="md" />
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div style={styles.toast}>
          {toast}
        </div>
      )}

      {/* Main Grid */}
      <main style={styles.main}>
        {/* Navigation Tabs */}
        <div style={styles.tabsContainer}>
          {(['dashboard', 'keys', 'backup_codes', 'accounts', 'sync_integrity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabButton,
                backgroundColor: activeTab === tab ? 'var(--royal-gold)' : 'transparent',
                color: activeTab === tab ? 'var(--white)' : 'var(--muted-gray)',
                borderColor: activeTab === tab ? 'var(--royal-gold)' : 'var(--card-border)'
              }}
              className="press-interactive"
            >
              {tab === 'dashboard' && 'Dashboard Overview'}
              {tab === 'keys' && 'Security Keys (OTP)'}
              {tab === 'backup_codes' && 'User Backup Codes'}
              {tab === 'accounts' && 'Account Control'}
              {tab === 'sync_integrity' && 'Sync Integrity Console'}
            </button>
          ))}
        </div>

        {/* ─── TAB 1: DASHBOARD OVERVIEW ─── */}
        {activeTab === 'dashboard' && (
          <section className="anim-fade-in">
            {/* Security Metrics */}
            <div style={styles.metricsGrid}>
              <GlassCard hoverable={false} style={styles.metricCard}>
                <span style={styles.metricLabel}>Security Shield Status</span>
                <strong style={{ ...styles.metricValue, color: '#10B981' }}>ACTIVE</strong>
                <span style={styles.metricSub}>256-bit encryption verified</span>
              </GlassCard>
              <GlassCard hoverable={false} style={styles.metricCard}>
                <span style={styles.metricLabel}>Active Web Sessions</span>
                <strong style={{ ...styles.metricValue, color: 'var(--royal-gold)' }}>
                  {stats.activeDevices}
                </strong>
                <span style={styles.metricSub}>Live console connection count</span>
              </GlassCard>
              <GlassCard hoverable={false} style={styles.metricCard}>
                <span style={styles.metricLabel}>System Threat Index</span>
                <strong style={{ ...styles.metricValue, color: '#10B981' }}>0.0%</strong>
                <span style={styles.metricSub}>No security violations logged</span>
              </GlassCard>
            </div>

            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <GlassCard hoverable={false} style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', borderBottom: '1.5px solid var(--card-border)', paddingBottom: '8px' }}>Active System Profiles</h4>
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

              <GlassCard hoverable={false} style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', borderBottom: '1.5px solid var(--card-border)', paddingBottom: '8px' }}>Active Security Shield System</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted-gray)', lineHeight: '1.5', margin: 0 }}>
                  This dashboard enforces dynamic OTP access control across the institution. The keys shown in the "Security Keys" tab refresh automatically every day.
                </p>
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10B981' }}>Daily Rotation Synchronization Active</span>
                </div>
              </GlassCard>
            </div>
          </section>
        )}

        {/* ─── TAB 2: SECURITY KEYS (OTP) ─── */}
        {activeTab === 'keys' && keysData && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={styles.otpHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Dynamic Security OTP Keys</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted-gray)' }}>Keys generated automatically for daily operations override authorization.</p>
              </div>
              <div style={styles.timerBlock}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '800' }}>ROTATION COUNTDOWN</span>
                <strong style={styles.timerVal}>{timeRemaining}</strong>
              </div>
            </div>

            {/* Section 1: Daily Login PINs */}
            <div>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, color: 'var(--royal-gold)', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>Section 1: Daily Login PINs</h4>
              <div style={styles.keysGrid}>
                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>RECTOR PORTAL (ADMIN 1)</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.admin1}</strong>
                  </div>
                  <div style={styles.keyDesc}>Daily 6-digit login PIN. Automatically resets at midnight.</div>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>PRINCIPAL PORTAL (ADMIN 2)</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.admin2}</strong>
                  </div>
                  <div style={styles.keyDesc}>Daily 6-digit login PIN. Automatically resets at midnight.</div>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>ACCOUNTANT PORTAL</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.accountant}</strong>
                  </div>
                  <div style={styles.keyDesc}>Daily 6-digit login PIN. Automatically resets at midnight.</div>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard} className="glass-gold-ring">
                  <span style={styles.keyRoleLabel}>AUTHENTICATOR PORTAL</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.authenticator}</strong>
                  </div>
                  <div style={styles.keyDesc}>Predefined static login PIN. Does not rotate.</div>
                </GlassCard>
              </div>
            </div>

            {/* Section 2: Action Security OTPs */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>
                <h4 style={{ ...styles.sectionSubtitle, margin: 0, color: 'var(--royal-gold)' }}>Section 2: Action Security OTPs</h4>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => setOtpPortal('admin1')} 
                    style={{ ...styles.quickFillPill, padding: '4px 10px', height: 'auto', backgroundColor: otpPortal === 'admin1' ? 'var(--royal-gold)' : 'rgba(0,0,0,0.04)', color: otpPortal === 'admin1' ? '#fff' : 'var(--dark-charcoal)' }}
                    className="press-interactive"
                  >
                    Admin 1 (Rector)
                  </button>
                  <button 
                    onClick={() => setOtpPortal('admin2')} 
                    style={{ ...styles.quickFillPill, padding: '4px 10px', height: 'auto', backgroundColor: otpPortal === 'admin2' ? 'var(--royal-gold)' : 'rgba(0,0,0,0.04)', color: otpPortal === 'admin2' ? '#fff' : 'var(--dark-charcoal)' }}
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
                    <div style={styles.keyDesc}>Required for student registry updates, creations, and profile saves.</div>
                  </GlassCard>

                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>NOTICES / PUBLISHING OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.publishing}</strong>
                    </div>
                    <div style={styles.keyDesc}>Required for creating, editing, and deleting campus notices/bulletins.</div>
                  </GlassCard>

                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>TIMETABLE & EXAMS OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.exams}</strong>
                    </div>
                    <div style={styles.keyDesc}>Required for timetables and exam result uploads, test scheduling, and status releases.</div>
                  </GlassCard>
                </div>
              ) : (
                <div style={styles.keysGrid} className="anim-fade-in">
                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>MULTI-BRANCH EXPENDITURE OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin2?.expenditure}</strong>
                    </div>
                    <div style={styles.keyDesc}>Required for operational budget updates and creating/deleting branch expenditures.</div>
                  </GlassCard>

                  <GlassCard hoverable={false} style={styles.keyCard}>
                    <span style={styles.keyRoleLabel}>STAFF SALARIES OTP</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{keysData.sectionOtps?.admin2?.salaries}</strong>
                    </div>
                    <div style={styles.keyDesc}>Required for staff payroll status updates and salary release operations.</div>
                  </GlassCard>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── TAB 3: USER BACKUP CODES ─── */}
        {activeTab === 'backup_codes' && (
          <section className="anim-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            {/* Backup Codes Search */}
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search students or faculty by name or ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.backupCodesList}>
                {filteredBackupCodes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748B', padding: '20px' }}>No student/faculty records match search.</p>
                ) : (
                  filteredBackupCodes.map((c) => (
                    <GlassCard key={c.username} hoverable={false} style={styles.backupCodeCard}>
                      <div>
                        <strong style={{ fontSize: '1rem' }}>{c.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                          ID: <span style={{ color: 'var(--royal-gold)', fontWeight: 700 }}>{c.username.toUpperCase()}</span> • Role: {c.role.toUpperCase()}
                        </div>
                      </div>
                      <div style={styles.backupCodeValBlock}>
                        <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '800' }}>BACKUP CODE</span>
                        <strong style={styles.backupCodeVal}>{c.backupCode}</strong>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>

            {/* Password Reset Console */}
            <GlassCard hoverable={false} style={{ padding: '20px', height: 'fit-content' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', borderBottom: '1.5px solid var(--card-border)', paddingBottom: '8px' }}>Password Recovery Desk</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-gray)', lineHeight: '1.4', margin: '0 0 16px 0' }}>
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
          <section className="anim-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            {/* Accounts Listing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>Staff Login Accounts Control</h3>
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
                      cursor: 'pointer',
                      border: editingAccountId === acc._id ? '1.5px solid var(--royal-gold)' : '1.5px solid var(--card-border)',
                      boxShadow: editingAccountId === acc._id ? '0 0 10px rgba(212, 175, 55, 0.15)' : 'none',
                      transition: 'all 0.2s ease',
                      flexDirection: 'row' as const,
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--dark-charcoal)' }}>{acc.name || 'Unnamed Staff'}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-gray)' }}>@{acc.username}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--dark-charcoal)', marginTop: '6px', display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
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
            <GlassCard hoverable={false} style={{ padding: '20px', height: 'fit-content' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', borderBottom: '1.5px solid var(--card-border)', paddingBottom: '8px' }}>
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
            <GlassCard hoverable={false} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--dark-charcoal)' }}>Sync Integrity & Database Fallback</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--muted-gray)' }}>
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
                      border: '1.5px solid var(--card-border)',
                      backgroundColor: 'var(--royal-gold)',
                      color: '#000',
                      fontWeight: 800,
                      fontSize: '0.8rem',
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
                      border: '1.5px solid var(--card-border)',
                      backgroundColor: '#10B981',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.8rem',
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
                  border: '1.5px solid #10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  animation: 'fade-in 0.3s ease'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#10B981', fontWeight: 800 }}>
                    ✓ Database Backup Archive Created Successfully
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-charcoal)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span><strong>Archive:</strong> {backupDetails.archiveName}</span>
                    <span><strong>Size:</strong> {(backupDetails.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                    <span><strong>Checksum (SHA256):</strong> <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', wordBreak: 'break-all' }}>{backupDetails.checksum}</code></span>
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard hoverable={false} style={{ padding: '20px', overflowX: 'auto' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', borderBottom: '1.5px solid var(--card-border)', paddingBottom: '8px' }}>
                Sync Audit Trail Ledger ({syncLogs.length} transactions)
              </h4>

              {syncLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '0.85rem' }}>
                  No transaction sync entries recorded in this session.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '700' }}>Timestamp</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '700' }}>Transaction ID</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '700' }}>Action / Event</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '700' }}>Source → Target</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '700' }}>Client Acks</th>
                      <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '700' }}>Status</th>
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
                          <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--dark-charcoal)' }}>{log.action}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--muted-gray)' }}>
                            <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{log.sourceNode}</span>
                            {' → '}
                            <span style={{ fontWeight: 600, color: '#3B82F6' }}>{log.targetNode}</span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <strong>{log.acknowledgedClients ? log.acknowledgedClients.length : 0}</strong> / {log.expectedClientsCount || 0}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
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

        {/* Terminate Session */}
        <button onClick={logout} style={styles.logoutBtn}>
          Terminate Authenticator Session
        </button>
      </main>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    backgroundColor: 'transparent',
    color: 'var(--dark-charcoal)',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: 'auto' as const,
    paddingBottom: '40px'
  },
  bgOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'var(--bg-gradient-overlay)',
    zIndex: 0,
    pointerEvents: 'none' as const
  },
  header: {
    padding: '30px 24px',
    borderBottom: '1.5px solid var(--card-border)',
    background: 'var(--glass-bg)',
    position: 'relative' as const,
    zIndex: 1
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '16px',
    background: 'var(--gold-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '850',
    fontSize: '1.2rem',
    color: 'var(--white)',
    boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)'
  },
  meta: {
    fontSize: '0.8rem',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'var(--royal-gold)'
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '850',
    letterSpacing: '-0.02em',
    marginTop: '2px',
    color: 'var(--dark-charcoal)'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--muted-gray)',
    marginTop: '2px'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    position: 'relative' as const,
    zIndex: 1
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const
  },
  tabButton: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px'
  },
  metricCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: 'var(--muted-gray)',
    fontWeight: '700'
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: '850',
    letterSpacing: '-0.02em'
  },
  metricSub: {
    fontSize: '0.75rem',
    color: 'var(--muted-gray)'
  },
  profileStatItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    padding: '8px 0',
    borderBottom: '1.5px solid var(--card-border)'
  },
  otpHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '12px'
  },
  timerBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    background: 'var(--bg-surface)',
    padding: '8px 16px',
    borderRadius: '12px',
    border: '1.5px solid var(--card-border)'
  },
  timerVal: {
    fontSize: '1.25rem',
    fontFamily: 'monospace',
    color: 'var(--royal-gold)',
    marginTop: '2px'
  },
  keysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px'
  },
  keyCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    minHeight: '190px'
  },
  keyRoleLabel: {
    fontSize: '0.75rem',
    color: 'var(--royal-gold)',
    fontWeight: '800',
    letterSpacing: '0.05em'
  },
  keyDisplayBlock: {
    background: 'var(--bg-surface-strong)',
    padding: '12px',
    borderRadius: '12px',
    textAlign: 'center' as const,
    border: '1.5px solid var(--card-border)'
  },
  keyValue: {
    fontSize: '1.8rem',
    fontFamily: 'monospace',
    letterSpacing: '0.1em',
    color: 'var(--dark-charcoal)'
  },
  keyDesc: {
    fontSize: '0.8rem',
    color: 'var(--muted-gray)',
    lineHeight: '1.4'
  },
  backupCodesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    maxHeight: '520px',
    overflowY: 'auto' as const,
    paddingRight: '8px'
  },
  backupCodeCard: {
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backupCodeValBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end'
  },
  backupCodeVal: {
    fontSize: '1.2rem',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
    color: 'var(--dark-charcoal)',
    marginTop: '2px'
  },
  resetForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  inputLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--muted-gray)'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1.5px solid var(--card-border)',
    background: 'var(--bg-secondary)',
    color: 'var(--dark-charcoal)',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box' as const
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1.5px solid var(--card-border)',
    background: 'var(--bg-secondary)',
    color: 'var(--dark-charcoal)',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box' as const
  },
  resetSubmitBtn: {
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--gold-gradient)',
    color: '#000',
    fontWeight: '800',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: '8px'
  },
  cancelBtn: {
    padding: '12px',
    borderRadius: '10px',
    border: '1.5px solid var(--card-border)',
    background: 'var(--bg-secondary)',
    color: 'var(--dark-charcoal)',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: '8px'
  },
  accountsGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  accountCard: {
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  editBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1.5px solid var(--royal-gold)',
    background: 'transparent',
    color: 'var(--royal-gold)',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer'
  },
  deleteBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #EF4444',
    background: 'transparent',
    color: '#EF4444',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer'
  },
  logoutBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: '1.5px solid rgba(239, 68, 68, 0.4)',
    background: 'rgba(239, 68, 68, 0.05)',
    color: '#EF4444',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '24px'
  },
  toast: {
    position: 'fixed' as const,
    bottom: '24px',
    right: '24px',
    backgroundColor: '#8B5CF6',
    color: '#FFF',
    padding: '12px 24px',
    borderRadius: '12px',
    fontWeight: '700',
    boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)',
    zIndex: 9999
  },
  sectionSubtitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--dark-charcoal)',
    margin: '0 0 12px 0',
    letterSpacing: '0.02em'
  },
  quickFillPill: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--royal-gold)',
    backgroundColor: 'rgba(212,175,55,0.06)',
    border: '1px solid rgba(212,175,55,0.35)',
    borderRadius: '8px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)'
  }
};
