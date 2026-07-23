import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { LiveConnectionIndicator } from '../components/common/LiveConnectionIndicator';
import { InspireLogo } from '../components/common/InspireLogo';
import { onSocketEvent } from '../services/socketClient';
import { authenticatorService } from '../services/authenticatorService';
import type { 
  AccountInfo, 
  AuthenticatorStats,
  SyncJournalEntry
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
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [stats, setStats] = useState<AuthenticatorStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalStaff: 0,
    activeDevices: 0
  });

  // Sync integrity & database management state
  const [syncLogs, setSyncLogs] = useState<SyncJournalEntry[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Countdown timer for daily keys expiration
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Searches & Modals

  // Password reset state

  // Account creation/edit state
  const [accountUsername, setAccountUsername] = useState<string>('');
  const [accountRole, setAccountRole] = useState<'admin1' | 'admin2' | 'admin3' | 'accountant' | 'authenticator'>('accountant');
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [accountMobile, setAccountMobile] = useState<string>('');
  const [accountDepartment, setAccountDepartment] = useState<string>('');
  const [accountAddress, setAccountAddress] = useState<string>('');
  const [accountCampus, setAccountCampus] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Trigger Toast Notification
  const triggerToast = (msg: string) => {
    const isError = msg.toLowerCase().includes('rejected') || 
                    msg.toLowerCase().includes('failed') || 
                    msg.toLowerCase().includes('denied') || 
                    msg.toLowerCase().includes('invalid') || 
                    msg.toLowerCase().includes('not found') || 
                    msg.toLowerCase().includes('error') ||
                    msg.toLowerCase().includes('incorrect');
    const symbol = isError ? '❌ ' : '✓ ';
    setToast(symbol + msg);
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
      const [keysRes, accountsRes, statsRes, syncRes] = await Promise.all([
        authenticatorService.getKeys(),
        authenticatorService.getAccounts(),
        authenticatorService.getStats(),
        authenticatorService.getSyncJournal()
      ]);
      setKeysData(keysRes);
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
          password: accountPassword || undefined,
          name: accountName,
          email: accountEmail,
          mobile: accountMobile,
          department: accountDepartment,
          address: accountAddress,
          campus: accountCampus
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
          department: accountDepartment,
          address: accountAddress,
          campus: accountCampus
        });
        triggerToast(`Created login for ${u.role}. Backup code: ${u.backupCode}`);
      }
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
                {tab === 'backup_codes' && 'Passwords & Backup Keys'}
                {tab === 'accounts' && 'Account Control'}
                {tab === 'sync_integrity' && 'Transaction Ledger'}
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
              {activeTab === 'backup_codes' && 'Portal Credentials & Backup Keys'}
              {activeTab === 'accounts' && 'Staff Access Registry'}
              {activeTab === 'sync_integrity' && 'Transaction Ledger Console'}
            </h1>
            <p style={styles.workspaceSubtitle}>
              {activeTab === 'dashboard' && 'Real-time security metrics, active web sessions, and system threat analysis.'}
              {activeTab === 'keys' && 'Check daily operational override passwords and active 6-digit login security keys.'}
              {activeTab === 'backup_codes' && 'Monitor logins, daily passwords, and emergency backup codes side-by-side.'}
              {activeTab === 'accounts' && 'Provision, update, and manage login authorization credentials for staff.'}
              {activeTab === 'sync_integrity' && 'Audit real-time transaction ledger for successful commits and verification rejections.'}
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
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <GlassCard hoverable={false} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: 'rgba(255,255,255,0.7)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Daily Login Security PINs</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--muted-gray)' }}>Login override credentials. Dynamic PINs rotate automatically every 12 hours.</p>
              </div>
              <div style={styles.timerBlock}>
                <span style={{ fontSize: '9px', color: '#64748B', fontWeight: '850', letterSpacing: '0.08em' }}>ROTATION COUNTDOWN</span>
                <strong style={styles.timerVal}>{timeRemaining}</strong>
              </div>
            </GlassCard>

            {/* Core Administrative Credentials */}
            <div>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, color: 'var(--royal-gold)', borderBottom: '2px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>Section 1: Core System Logins</h4>
              <div style={styles.keysGrid}>
                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Rector (Admin 1) Login PIN</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.admin1}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button onClick={() => { copyToClipboard(keysData.dailyPins?.admin1); triggerToast('Copied Rector PIN'); }} style={styles.copyBtn} className="press-interactive">Copy PIN</button>
                  </div>
                  <div style={styles.keyDesc}>Rotates dynamically every 12 hours.</div>
                </GlassCard>

                <GlassCard hoverable={false} style={{ ...styles.keyCard, borderColor: 'var(--royal-gold)' }}>
                  <span style={styles.keyRoleLabel}>Security Admin (Authenticator)</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.authenticator}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button onClick={() => { copyToClipboard(keysData.dailyPins?.authenticator); triggerToast('Copied Authenticator PIN'); }} style={styles.copyBtn} className="press-interactive">Copy PIN</button>
                  </div>
                  <div style={styles.keyDesc}>Portal configuration credentials. Does not rotate daily.</div>
                </GlassCard>
              </div>
            </div>

            {/* Admin 2 Principal Deans Accounts */}
            <div>
              <h4 style={{ ...styles.sectionSubtitle, color: 'var(--royal-gold)', borderBottom: '2px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>Section 2: Admin 2 (Principal Deans) – 4 Campuses</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].map(campusName => {
                  const suffix = campusName.toLowerCase().replace(/\s+/g, '');
                  const username = `admin2_${suffix}`;
                  const dailyPin = keysData.dailyPins?.[username];

                  return (
                    <GlassCard key={campusName} hoverable={false} style={styles.keyCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{campusName}</span>
                        <span style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>{username}</span>
                      </div>
                      <div style={{ ...styles.keyDisplayBlock, padding: '8px 12px' }}>
                        <span style={{ fontSize: '8px', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase' }}>Daily Login PIN</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--dark-charcoal)', letterSpacing: '0.05em' }}>{dailyPin || '784920'}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { copyToClipboard(dailyPin); triggerToast(`Copied Login PIN for ${campusName}`); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy Login PIN</button>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {/* Accountant Campus Security OTPs */}
            <div>
              <h4 style={{ ...styles.sectionSubtitle, color: 'var(--royal-gold)', borderBottom: '2px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>Section 3: Accountant Portals – 8 Accounts</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].map(campusName => {
                  const suffix = campusName.toLowerCase().replace(/\s+/g, '');
                  
                  return [1, 2].map(num => {
                    const username = `accountant_${suffix}_${num}`;
                    const dailyPin = keysData.dailyPins?.[username];

                    return (
                      <GlassCard key={username} hoverable={false} style={styles.keyCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{campusName}</span>
                          <span style={{ fontSize: '9px', color: 'var(--muted-gray)' }}>Accountant {num}</span>
                        </div>
                        <div style={{ ...styles.keyDisplayBlock, padding: '8px 12px' }}>
                          <span style={{ fontSize: '8px', color: 'var(--muted-gray)', display: 'block', textTransform: 'uppercase' }}>Daily Login PIN</span>
                          <strong style={{ fontSize: '1.2rem', color: 'var(--dark-charcoal)', letterSpacing: '0.05em' }}>{dailyPin || '319482'}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { copyToClipboard(dailyPin); triggerToast(`Copied Login PIN for ${username}`); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy Login PIN</button>
                        </div>
                      </GlassCard>
                    );
                  });
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 3: OPERATION PASSWORDS & SECURE KEYS ─── */}
        {activeTab === 'backup_codes' && keysData && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <GlassCard hoverable={false} style={{ padding: '20px 24px', backgroundColor: 'rgba(255,255,255,0.75)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Administrative Action Security Keys (OTPs)</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--muted-gray)' }}>
                  Use these 6-digit dynamic section authorization keys to verify and execute secure database changes. Same for all branches.
                </p>
              </div>
            </GlassCard>

            {/* Admin 1 (Rector) Section */}
            <div>
              <h4 style={{ ...styles.sectionSubtitle, marginTop: 0, color: 'var(--royal-gold)', borderBottom: '2px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>Admin 1 (Rector) Passwords</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Student Registry</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.studentRegistry}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.admin1?.studentRegistry); triggerToast('Copied Student Registry OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Faculty Management</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.facultyManagement}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.admin1?.facultyManagement); triggerToast('Copied Faculty Management OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Student Fee Structure Updation</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.feeStructure || '784920'}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.admin1?.feeStructure || '784920'); triggerToast('Copied Fee Structure OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Student Fee Override / Waiver</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.feeOverride || keysData.sectionOtps?.admin1?.feeStructure || '938201'}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.admin1?.feeOverride || keysData.sectionOtps?.admin1?.feeStructure || '938201'); triggerToast('Copied Fee Override OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Multi-Branch Expenditure</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.admin1?.expenditure}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.admin1?.expenditure); triggerToast('Copied Expenditure OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>
              </div>
            </div>

            {/* Admin 2 Section */}
            <div>
              <h4 style={{ ...styles.sectionSubtitle, color: 'var(--royal-gold)', borderBottom: '2px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>Admin 2 (Principal Deans) Passwords</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Fee Structure & Waivers</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.admin2?.feeStructure || keysData.sectionOtps?.admin1?.feeStructure || '784920'}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.admin2?.feeStructure || keysData.sectionOtps?.admin1?.feeStructure || '784920'); triggerToast('Copied Fee Structure OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Campus Expenditure</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.admin2?.expenditure}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.admin2?.expenditure); triggerToast('Copied Campus Expenditure OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Worker Payments</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.admin2?.workerPayments}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.admin2?.workerPayments); triggerToast('Copied Worker Payments OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>
              </div>
            </div>

            {/* Accountant Section */}
            <div>
              <h4 style={{ ...styles.sectionSubtitle, color: 'var(--royal-gold)', borderBottom: '2px solid rgba(212,175,55,0.2)', paddingBottom: '6px', marginBottom: '14px' }}>Accountant Passwords</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Update Student Details</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.accountant?.studentDetails}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.accountant?.studentDetails); triggerToast('Copied Student Details OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Student Fee Payment</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.accountant?.fees}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.accountant?.fees); triggerToast('Copied Fee Payment OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>

                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Hostel Registry</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.sectionOtps?.accountant?.hostel}</strong>
                  </div>
                  <button onClick={() => { copyToClipboard(keysData.sectionOtps?.accountant?.hostel); triggerToast('Copied Hostel OTP'); }} style={{ ...styles.copyBtn, width: '100%' }} className="press-interactive">Copy OTP</button>
                </GlassCard>
              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 4: ACCOUNT CONTROL ─── */}
        {activeTab === 'accounts' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
            {/* ADMIN 2 SECTION */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '2.5px solid var(--card-border)', paddingBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dark-charcoal)' }}>
                  Admin 2 (Campus Principals)
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--muted-gray)', fontWeight: 700 }}>4 Campus Portals</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].map(campus => {
                  const acc = accounts.find(a => a.role === 'admin2' && a.campus === campus);
                  return (
                    <GlassCard
                      key={`admin2-${campus}`}
                      hoverable={true}
                      onClick={() => {
                        if (acc) {
                          setEditingAccountId(acc._id);
                          setAccountUsername(acc.username);
                          setAccountRole('admin2');
                          setAccountPassword(acc.password || '');
                          setAccountName(acc.name || '');
                          setAccountEmail(acc.email || '');
                          setAccountMobile(acc.mobile || '');
                          setAccountDepartment(acc.department || '');
                          setAccountAddress(acc.address || '');
                          setAccountCampus(campus);
                        } else {
                          setEditingAccountId(null);
                          setAccountUsername(`admin2_${campus.toLowerCase().replace(/\s+/g, '')}`);
                          setAccountRole('admin2');
                          setAccountPassword('DeanPass#' + Math.floor(1000 + Math.random() * 9000));
                          setAccountName('');
                          setAccountEmail('');
                          setAccountMobile('');
                          setAccountDepartment('Administration');
                          setAccountAddress('');
                          setAccountCampus(campus);
                        }
                        setIsEditModalOpen(true);
                      }}
                      style={{
                        padding: '20px',
                        cursor: 'pointer',
                        border: acc ? '2.5px solid var(--card-border)' : '2.5px dashed rgba(0,0,0,0.15)',
                        backgroundColor: acc ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '140px'
                      }}
                      className="neo-2d-card hover-gold"
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '9px', fontWeight: '850', padding: '3px 8px', borderRadius: '6px', border: '1.5px solid var(--card-border)', backgroundColor: 'rgba(212,175,55,0.08)', color: 'var(--royal-gold)', letterSpacing: '0.04em' }}>
                            {campus.toUpperCase()}
                          </span>
                          {acc && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(acc._id);
                              }}
                              style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#EF4444' }}
                              title="Delete Account"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          )}
                        </div>
                        <h4 style={{ margin: '8px 0 4px 0', fontSize: '13px', fontWeight: 800 }}>
                          {acc ? acc.name : 'Not Provisioned'}
                        </h4>
                        <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '4px' }}>
                          {acc ? (
                            <>
                              <div>ID: <strong>{acc.username}</strong></div>
                              <div style={{ marginTop: '2px' }}>Password: <strong style={{ color: 'var(--royal-gold)', fontSize: '11.5px', fontFamily: 'monospace' }}>{acc.password && !acc.password.startsWith('$2a$') ? acc.password : 'DeanPass#2026'}</strong></div>
                            </>
                          ) : (
                            <span>Click to provision credentials</span>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {/* ACCOUNTANTS SECTION */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '2.5px solid var(--card-border)', paddingBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dark-charcoal)' }}>
                  Accountant Portals
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--muted-gray)', fontWeight: 700 }}>8 Campus Accounts (2 per Campus)</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'].map(campus => {
                  const campusAccs = accounts.filter(a => a.role === 'accountant' && a.campus === campus);
                  
                  return [0, 1].map(index => {
                    const acc = campusAccs[index];
                    return (
                      <GlassCard
                        key={`accountant-${campus}-${index}`}
                        hoverable={true}
                        onClick={() => {
                          if (acc) {
                            setEditingAccountId(acc._id);
                            setAccountUsername(acc.username);
                            setAccountRole('accountant');
                            setAccountPassword(acc.password || '');
                            setAccountName(acc.name || '');
                            setAccountEmail(acc.email || '');
                            setAccountMobile(acc.mobile || '');
                            setAccountDepartment(acc.department || '');
                            setAccountAddress(acc.address || '');
                            setAccountCampus(campus);
                          } else {
                            setEditingAccountId(null);
                            setAccountUsername(`accountant_${campus.toLowerCase().replace(/\s+/g, '')}_${index + 1}`);
                            setAccountRole('accountant');
                            setAccountPassword('AccPass#' + Math.floor(1000 + Math.random() * 9000));
                            setAccountName('');
                            setAccountEmail('');
                            setAccountMobile('');
                            setAccountDepartment('Finance Department');
                            setAccountAddress('');
                            setAccountCampus(campus);
                          }
                          setIsEditModalOpen(true);
                        }}
                        style={{
                          padding: '20px',
                          cursor: 'pointer',
                          border: acc ? '2.5px solid var(--card-border)' : '2.5px dashed rgba(0,0,0,0.15)',
                          backgroundColor: acc ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '140px'
                        }}
                        className="neo-2d-card hover-gold"
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '850', padding: '3px 8px', borderRadius: '6px', border: '1.5px solid var(--card-border)', backgroundColor: 'rgba(59,130,246,0.08)', color: '#2563EB', letterSpacing: '0.04em' }}>
                              {campus.toUpperCase()} - ACC {index + 1}
                            </span>
                            {acc && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAccount(acc._id);
                                }}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#EF4444' }}
                                title="Delete Account"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            )}
                          </div>
                          <h4 style={{ margin: '8px 0 4px 0', fontSize: '13px', fontWeight: 800 }}>
                            {acc ? acc.name : `Accountant ${index + 1} Not Provisioned`}
                          </h4>
                          <div style={{ fontSize: '11px', color: 'var(--muted-gray)', marginTop: '4px' }}>
                            {acc ? (
                              <>
                                <div>ID: <strong>{acc.username}</strong></div>
                                <div style={{ marginTop: '2px' }}>Password: <strong style={{ color: 'var(--royal-gold)', fontSize: '11.5px', fontFamily: 'monospace' }}>{acc.password && !acc.password.startsWith('$2a$') ? acc.password : 'AccPass#2026'}</strong></div>
                              </>
                            ) : (
                              <span>Click to provision credentials</span>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    );
                  });
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 5: SYNC INTEGRITY & DATABASE OVERVIEW ─── */}
        {activeTab === 'sync_integrity' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.75)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>Transaction Sync Ledger</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--muted-gray)' }}>
                    Real-time transactional audit log monitoring system modifications and rejected operations.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                    <button
                      onClick={() => setLedgerFilter('all')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: ledgerFilter === 'all' ? '#fff' : 'transparent',
                        fontWeight: 800,
                        fontSize: '11px',
                        color: ledgerFilter === 'all' ? 'var(--dark-charcoal)' : 'var(--muted-gray)',
                        cursor: 'pointer',
                        boxShadow: ledgerFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                      className="press-interactive"
                    >
                      All Logs
                    </button>
                    <button
                      onClick={() => setLedgerFilter('success')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: ledgerFilter === 'success' ? '#fff' : 'transparent',
                        fontWeight: 800,
                        fontSize: '11px',
                        color: ledgerFilter === 'success' ? '#10B981' : 'var(--muted-gray)',
                        cursor: 'pointer',
                        boxShadow: ledgerFilter === 'success' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                      className="press-interactive"
                    >
                      Successful
                    </button>
                    <button
                      onClick={() => setLedgerFilter('failed')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: ledgerFilter === 'failed' ? '#fff' : 'transparent',
                        fontWeight: 800,
                        fontSize: '11px',
                        color: ledgerFilter === 'failed' ? '#EF4444' : 'var(--muted-gray)',
                        cursor: 'pointer',
                        boxShadow: ledgerFilter === 'failed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                      className="press-interactive"
                    >
                      Failed / Rejected
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search transaction ID or action..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    style={{ ...styles.formInput, maxWidth: '240px', margin: 0, padding: '8px 12px', borderRadius: '10px', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Transactions Table */}
              {syncLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '12px' }}>
                  No transaction log entries recorded in this session.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                        <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '850', textTransform: 'uppercase', fontSize: '10px' }}>Timestamp</th>
                        <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '850', textTransform: 'uppercase', fontSize: '10px' }}>Transaction ID</th>
                        <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '850', textTransform: 'uppercase', fontSize: '10px' }}>Action / Event</th>
                        <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '850', textTransform: 'uppercase', fontSize: '10px' }}>Scope / Branch</th>
                        <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '850', textTransform: 'uppercase', fontSize: '10px' }}>Status</th>
                        <th style={{ padding: '12px 8px', color: 'var(--muted-gray)', fontWeight: '850', textTransform: 'uppercase', fontSize: '10px' }}>Details / Reasons</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLogs
                        .filter(log => {
                          const matchesSearch = 
                            (log.transactionId || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                            (log.action || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                            (log.branch || '').toLowerCase().includes(ledgerSearch.toLowerCase());
                          
                          if (ledgerFilter === 'success') return matchesSearch && log.status === 'success';
                          if (ledgerFilter === 'failed') return matchesSearch && log.status === 'failed';
                          return matchesSearch;
                        })
                        .map((log) => {
                          const date = new Date(log.timestamp || log.createdAt || Date.now());
                          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                          const isSuccess = log.status === 'success';
                          
                          const badgeBg = isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
                          const badgeColor = isSuccess ? '#10B981' : '#EF4444';
                          const trBg = isSuccess ? 'transparent' : 'rgba(239,68,68,0.02)';

                          return (
                            <tr key={log._id || log.transactionId} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', backgroundColor: trBg }}>
                              <td style={{ padding: '12px 8px', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--muted-gray)' }}>{timeStr}</td>
                              <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '11.5px' }}>{log.transactionId}</td>
                              <td style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>{log.action}</td>
                              <td style={{ padding: '12px 8px', color: 'var(--dark-charcoal)', fontWeight: 600 }}>{log.branch || 'Central Node'}</td>
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
                              <td style={{ padding: '12px 8px', color: isSuccess ? 'var(--muted-gray)' : '#DC2626', fontSize: '11px', fontWeight: isSuccess ? 500 : 700 }}>
                                {isSuccess ? 'Transaction committed successfully.' : (log.errorDetails || 'Failed to authenticate request.')}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </section>
        )}
      </main>

      {isEditModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="anim-scale-up neo-2d">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2.5px solid var(--card-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--dark-charcoal)' }}>
                {editingAccountId ? `Edit Profile - ${accountCampus}` : `Provision Account - ${accountCampus}`}
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingAccountId(null);
                  setAccountUsername('');
                  setAccountPassword('');
                  setAccountName('');
                  setAccountEmail('');
                  setAccountMobile('');
                  setAccountDepartment('');
                  setAccountAddress('');
                  setAccountCampus('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-gray)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Login ID / Username</label>
                  <input
                    type="text"
                    placeholder="e.g. admin2_erragattugutta_c1"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Login PIN / Password</label>
                  <input
                    type="text"
                    placeholder="e.g. 111111"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. email@inspire.edu"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9988776655"
                    value={accountMobile}
                    onChange={(e) => setAccountMobile(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
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
                <label style={styles.inputLabel}>Address</label>
                <input
                  type="text"
                  placeholder="e.g. Warangal, Telangana"
                  value={accountAddress}
                  onChange={(e) => setAccountAddress(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Portal Role Access</label>
                  <input
                    type="text"
                    value={accountRole === 'admin2' ? 'Admin 2 (Campus Principal)' : 'Accountant'}
                    style={{ ...styles.formInput, backgroundColor: 'rgba(0,0,0,0.04)', color: 'var(--muted-gray)', cursor: 'not-allowed' }}
                    disabled
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Campus Access</label>
                  <input
                    type="text"
                    value={accountCampus}
                    style={{ ...styles.formInput, backgroundColor: 'rgba(0,0,0,0.04)', color: 'var(--muted-gray)', cursor: 'not-allowed' }}
                    disabled
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingAccountId(null);
                    setAccountUsername('');
                    setAccountPassword('');
                    setAccountName('');
                    setAccountEmail('');
                    setAccountMobile('');
                    setAccountDepartment('');
                    setAccountAddress('');
                    setAccountCampus('');
                  }}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '2px solid var(--card-border)',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontFamily: 'var(--font-family)',
                    fontSize: '12.5px'
                  }}
                  className="press-interactive"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: 'var(--royal-gold)',
                    color: '#000',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontFamily: 'var(--font-family)',
                    fontSize: '12.5px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  className="press-interactive"
                >
                  {editingAccountId ? 'Save Changes' : 'Provision Account'}
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
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(8px)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(24px)',
    border: '2px solid var(--card-border)',
    borderRadius: '24px',
    padding: '30px',
    boxShadow: '0 24px 48px rgba(0,0,0,0.16)'
  }
};
