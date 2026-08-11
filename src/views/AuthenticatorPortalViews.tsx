import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { apiClient } from '../services/apiClient';
import { authenticatorService, BACKUP_CATEGORIES } from '../services/authenticatorService';
import type {
  AccountInfo,
  ActiveSessionInfo,
  AuthenticatorStats,
  SyncJournalEntry,
  BackupCategoryKey
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
  const [, setIsRestoring] = useState(false);
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
    portalSlotTotal: 0,
    // No invented default. This used to fall back to a literal date, so before
    // the first load the panel confidently displayed a backup time that had
    // never happened.
    lastBackupAt: null
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
  const [availableBackups, setAvailableBackups] = useState<any>(
    Object.fromEntries(BACKUP_CATEGORIES.map(c => [c.key, {}]))
  );
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [activeRestoreCategory, setActiveRestoreCategory] = useState<BackupCategoryKey>('Students_Data');
  const [restoringCampus] = useState<string | null>(null);
  const [restoreProgress] = useState<number>(0);
  const [restoreStatusText] = useState<string>('Initializing restoration pipeline...');

  // Fetch Available Backups from Server/Google Drive
  const loadAvailableBackups = async () => {
    setIsLoadingBackups(true);
    try {
      // Campus-scoped tree: Backup/<Type>/<Campus>/. The old call returned a
      // single flat folder with every campus mixed together.
      const data = await authenticatorService.getBackupsByCategory();
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
      // One file per campus per type, so a later restore can target exactly
      // one of them. The security PIN is collected by apiClient on demand.
      const campuses = ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'];
      const types = BACKUP_CATEGORIES.map(c => c.type);
      const failures: string[] = [];
      let written = 0;
      for (const type of types) {
        for (const campus of campuses) {
          try {
            await authenticatorService.runCampusBackup(type, campus);
            written++;
          } catch (e: any) {
            failures.push(`${type}/${campus}: ${e?.message || 'failed'}`);
          }
        }
      }
      clearInterval(interval);
      setBackupProgress(100);
      if (failures.length) {
        // A partial run is a failure. Reporting success with a shorter list is
        // how an incomplete backup goes unnoticed.
        throw new Error(`${written} of ${types.length * campuses.length} backups written. Failed: ${failures.slice(0, 3).join('; ')}`);
      }

      triggerToast(`Backup complete — ${written} files written to Backup/<Type>/<Campus>/ on Google Drive.`);

      // Re-read from the server rather than stamping the local clock. The
      // displayed time should be the timestamp Drive actually recorded on the
      // files, so what the panel shows is what a restore would find.
      await Promise.all([loadAvailableBackups(), loadData()]);
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
  const handleExecuteDataRestore = async (
    fileId: string,
    fileName: string,
    category: BackupCategoryKey,
    campus: string
  ) => {
    const backupType = authenticatorService.categoryToBackupType(category);

    setIsRestoring(true);
    try {
      // Step 1 — dry run. The server decrypts the file, checks the checksum,
      // confirms the type and campus match what was asked for, and counts what
      // would change. Nothing is written. An operator should never be asked to
      // confirm a restore whose contents nobody has looked at.
      let preview: any;
      try {
        preview = await authenticatorService.previewRestore(fileId, backupType, campus);
      } catch (err: any) {
        const rejected = err?.data?.data?.validation;
        triggerToast(
          rejected?.errors?.length
            ? `Backup rejected: ${rejected.errors.join(' ')}`
            : (err?.message || 'Could not read that backup. Nothing was changed.')
        );
        return;
      }

      const summary = preview?.validation?.summary || {};
      const plan = preview?.plan || {};
      const warnings: string[] = preview?.validation?.warnings || [];

      // Step 2 — show what was actually found in the file, not a generic
      // warning. The counts below come from the server's read of the real
      // backup against the real database.
      const confirmed = window.confirm(
        `Restore ${summary.backupType || backupType} records for ${summary.campus || campus}\n\n` +
        `File: ${fileName}\n` +
        `Taken: ${summary.createdAt ? new Date(summary.createdAt).toLocaleString() : 'unknown'}\n` +
        `Records in backup: ${summary.recordCount ?? 0}\n\n` +
        `This will UPDATE ${plan.willUpdate ?? 0} existing record(s) and ADD ${plan.willInsert ?? 0} new one(s).\n` +
        `${plan.presentButNotInBackup ?? 0} record(s) currently in ${campus} are not in this backup and will be LEFT AS THEY ARE.\n\n` +
        (warnings.length ? `Warnings:\n- ${warnings.join('\n- ')}\n\n` : '') +
        `Only ${campus} is touched. Overwritten values cannot be recovered.`
      );
      if (!confirmed) return;

      // Step 3 — apply. Password on top of the security PIN: two different
      // secrets, both verified server-side with bcrypt.
      const password = window.prompt('Enter YOUR account password to confirm this restore:');
      if (!password || !password.trim()) return;

      const result = await authenticatorService.applyRestore(fileId, backupType, campus, password.trim());
      const applied = result?.applied || {};
      triggerToast(
        `Restore complete — ${applied.inserted ?? 0} added, ${applied.updated ?? 0} updated. ` +
        `${applied.campus || campus} now holds ${applied.campusTotalAfter ?? 0} ${applied.backupType || backupType} record(s).`,
        'success'
      );
      await loadData();
      await loadAvailableBackups();
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
      // The server reads the real newest file out of Google Drive. A value
      // cached in this browser's localStorage used to take priority over it,
      // so one machine that had once run a backup would keep showing that
      // time forever — including after backups started failing.
      setStats(statsRes);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--surface)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span style={{ color: 'var(--surface)', fontWeight: 800, fontSize: '13px' }}>{toast}</span>
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
              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid var(--accent)' }}>
                <span style={styles.metricLabel}>Active Portal Sessions</span>
                <strong style={{ ...styles.metricValue, color: 'var(--accent)' }}>
                  {stats.activeSessionCount || 4} / 4 Online
                </strong>
                <span style={styles.metricSub}>Campus portals currently connected</span>
              </GlassCard>

              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid var(--warning)' }}>
                <span style={styles.metricLabel}>Staff Access Credentials</span>
                <strong style={{ ...styles.metricValue, color: 'var(--warning)' }}>
                  {accounts.length || 14} Accounts
                </strong>
                <span style={styles.metricSub}>Provisioned administrative staff</span>
              </GlassCard>

              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid var(--good)' }}>
                <span style={styles.metricLabel}>System Integrity Status</span>
                <strong style={{ ...styles.metricValue, color: 'var(--good)' }}>
                  100% Active
                </strong>
                <span style={styles.metricSub}>All 4 campuses synced & secure</span>
              </GlassCard>

              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid #7C3AED' }}>
                <span style={styles.metricLabel}>Last System Backup</span>
                <strong style={{ ...styles.metricValue, color: '#6D28D9', fontSize: '15px', marginTop: '6px' }}>
                  {stats.lastBackupAt
                    ? new Date(stats.lastBackupAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'No backup found'}
                </strong>
                <span style={styles.metricSub}>
                  {stats.lastBackupAt ? 'Newest file in Google Drive' : 'Nothing in Google Drive to restore from'}
                </span>
              </GlassCard>
            </div>

            {/* Active Sessions & Live Transaction Widget */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Active Sessions Panel */}
              <GlassCard hoverable={false} style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '2px solid var(--line-strong)', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Connected Portal Sessions
                  </h4>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', backgroundColor: 'var(--accent-wash)', padding: '2px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                    Live Sync
                  </span>
                </div>
                {activeSessions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeSessions.map((session, idx) => (
                      <div key={session.sessionGuid || `session-${session.name}-${idx}`} style={{ padding: '12px 14px', borderRadius: '12px', border: '2px solid var(--line-strong)', backgroundColor: 'var(--surface-sunken)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '13px', color: 'var(--ink)' }}>{session.name}</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-secondary)', marginTop: '2px' }}>{session.role} | {session.campus}</div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--good)', backgroundColor: 'var(--good-wash)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--good-wash)' }}>
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', backgroundColor: 'var(--surface-sunken)', borderRadius: '12px', border: '2px solid var(--line)', fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                    All 4 Campus Portal slots are online & synced.
                  </div>
                )}
              </GlassCard>

              {/* Transaction Widget */}
              <GlassCard hoverable={false} style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '2px solid var(--line-strong)', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Transaction Ledger Journal
                  </h4>
                  <button onClick={() => setActiveTab('sync_integrity')} style={{ fontSize: '11px', fontWeight: 850, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    View All &rarr;
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {filteredSyncLogs.slice(0, 5).map((log, idx) => (
                    <div key={log.transactionId ? `dash-tx-${log.transactionId}-${idx}` : `dash-tx-${idx}`} style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--line-strong)', backgroundColor: 'var(--surface-sunken)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--ink)' }}>{log.action}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-secondary)' }}>By {log.performedBy || 'System'} | {log.timestamp}</div>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: log.status === 'success' ? '1px solid var(--good)' : '1px solid var(--critical)',
                        backgroundColor: log.status === 'success' ? 'var(--good-wash)' : 'var(--critical-wash)',
                        color: log.status === 'success' ? 'var(--good)' : 'var(--critical)'
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
            <GlassCard hoverable={false} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'var(--ink)' }}>
                  Account Security PINs
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)', maxWidth: '520px' }}>
                  PINs are stored as one-way hashes and cannot be displayed. Issue a new PIN to see its value — it is shown once only.
                </p>
              </div>

              <button
                onClick={handleManualRegeneratePins}
                style={{
                  padding: '12px 20px', borderRadius: '12px', border: '2px solid var(--warning)',
                  backgroundColor: 'var(--warning)', color: 'var(--surface)', fontWeight: 900, fontSize: '13px',
                  boxShadow: '3px 3px 0px var(--warning)', cursor: 'pointer', display: 'flex',
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
              <GlassCard hoverable={false} style={{ padding: '20px 24px', border: '2.5px solid var(--warning)', backgroundColor: 'var(--warning-wash)', boxShadow: '4px 4px 0px var(--warning)' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 900, color: 'var(--warning)' }}>
                  New PINs — shown once
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: 700, color: 'var(--warning)' }}>
                  Copy and distribute these now. They cannot be retrieved again; the only way to recover an account is to issue another PIN.
                </p>
                <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {Object.entries(issuedPins).map(([username, pin]) => (
                    <GlassCard key={username} hoverable={false} style={styles.keyCard}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-secondary)' }}>{username}</span>
                      <div style={styles.keyDisplayBlock}>
                        <strong style={{ ...styles.keyValue, color: 'var(--warning)' }}>{String(pin)}</strong>
                      </div>
                      <button onClick={() => copyToClipboard(String(pin))} style={styles.copyBtn} className="press-interactive">
                        Copy 6-Digit PIN
                      </button>
                    </GlassCard>
                  ))}
                </div>
                <button
                  onClick={() => setIssuedPins(null)}
                  style={{ marginTop: '16px', padding: '10px 16px', borderRadius: '10px', border: '2px solid var(--warning)', backgroundColor: 'transparent', color: 'var(--warning)', fontWeight: 900, fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
                  className="press-interactive"
                >
                  I have saved these — hide them
                </button>
              </GlassCard>
            )}

            {/* Status of every portal account. */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 900, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Portal Accounts
              </h4>
              <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {(keysData.accounts || []).map((acc: any) => (
                  <GlassCard key={acc.username} hoverable={false} style={styles.keyCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--ink)' }}>{acc.name || acc.username}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-secondary)' }}>{acc.role}</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)' }}>{acc.username}</span>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={{ ...styles.keyValue, fontSize: '13px', color: acc.pinConfigured ? 'var(--good)' : 'var(--critical)' }}>
                        {acc.pinConfigured ? 'PIN SET' : 'NO PIN'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)' }}>
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
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'var(--ink)' }}>Staff Accounts Registry</h3>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '14px', border: '1.5px solid var(--line-strong)', backgroundColor: 'var(--surface-sunken)', fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
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
                  roleBadgeBg = 'var(--warning)';
                  roleCode = 'A1';
                } else if (acc.role === 'admin2') {
                  roleLabel = 'Campus Principal (Admin 2)';
                  roleBadgeBg = 'var(--good)';
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
                      border: '2.5px solid var(--ink)',
                      borderRadius: '16px',
                      backgroundColor: 'var(--surface)',
                      boxShadow: '4px 4px 0px var(--ink)'
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
                          color: 'var(--surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '14px',
                          border: '2px solid var(--ink)',
                          boxShadow: '2px 2px 0px var(--ink)'
                        }}>
                          {roleCode}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--ink)' }}>
                            {acc.name || acc.username}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
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
                          backgroundColor: 'var(--surface-sunken)',
                          color: 'var(--ink-secondary)',
                          border: '1.5px solid var(--line-strong)',
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
                      backgroundColor: 'var(--surface-sunken)',
                      borderRadius: '12px',
                      border: '2px solid var(--line)'
                    }}>
                      {/* ID / Username Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: 'var(--surface)', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--line-strong)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>User ID:</span>
                          <code style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--ink)', backgroundColor: 'var(--line)', padding: '3px 8px', borderRadius: '6px' }}>
                            {acc.username}
                          </code>
                        </div>
                        <button
                          onClick={() => copyTextToClipboard(acc.username, 'User ID')}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1.5px solid var(--ink)',
                            backgroundColor: 'var(--accent)',
                            color: 'var(--surface)',
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

                      {/* Credential Row.
                          Shows whether a credential exists, never its value —
                          the server only ever sends these two booleans. The
                          caption used to be hardcoded, so an account with no
                          usable password was indistinguishable from a healthy
                          one. */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: 'var(--surface)', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--line-strong)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Password</span>
                            {acc.passwordSet !== false ? (
                              <code title="A password is set. Its value cannot be displayed — only a bcrypt hash is stored."
                                    style={{ fontSize: '13px', letterSpacing: '2px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--ink)', backgroundColor: 'var(--surface-sunken)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                                ••••••••
                              </code>
                            ) : (
                              <code title="No usable password hash is stored for this account."
                                    style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--critical)', backgroundColor: 'var(--critical-wash)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--critical)' }}>
                                NOT SET
                              </code>
                            )}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>PIN</span>
                            {acc.pinSet !== false ? (
                              <code style={{ fontSize: '13px', letterSpacing: '2px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--ink)', backgroundColor: 'var(--surface-sunken)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                                ••••••
                              </code>
                            ) : (
                              <code style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--critical)', backgroundColor: 'var(--critical-wash)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--critical)' }}>
                                NOT SET
                              </code>
                            )}
                          </span>
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
                          border: '2px solid var(--ink)',
                          backgroundColor: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: '12px',
                          fontWeight: 900,
                          boxShadow: '2px 2px 0px var(--ink)',
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
            <GlassCard hoverable={false} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'var(--ink)' }}>
                  Transaction Ledger Console
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  Real-time audit log of security events, administrative updates, and system operations.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={loadData} style={{ padding: '8px 14px', borderRadius: '10px', border: '2px solid var(--accent)', backgroundColor: 'var(--accent)', color: 'var(--surface)', fontWeight: 850, fontSize: '12px', cursor: 'pointer' }} className="press-interactive">
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
                      border: ledgerFilter === filter ? '2px solid var(--ink)' : '2px solid var(--line-strong)',
                      backgroundColor: ledgerFilter === filter ? 'var(--ink)' : 'var(--surface)',
                      color: ledgerFilter === filter ? 'var(--surface)' : 'var(--ink-secondary)',
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
                  border: '2px solid var(--line-strong)',
                  backgroundColor: 'var(--surface)',
                  fontSize: '12px',
                  fontWeight: 700,
                  width: '260px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredSyncLogs.map((log, idx) => (
                <GlassCard key={log.transactionId ? `tx-ledger-${log.transactionId}-${idx}` : `tx-ledger-${idx}`} hoverable={false} style={{ padding: '14px 18px', backgroundColor: 'var(--surface)', border: '2px solid var(--ink)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--ink)' }}>{log.action}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-secondary)', marginTop: '4px' }}>
                        ID: {log.transactionId} | Performed By: {log.performedBy || 'System'}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', marginTop: '4px' }}>
                        {log.details || log.errorDetails || 'Transaction logged'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: log.status === 'success' ? '1.5px solid var(--good)' : '1.5px solid var(--critical)',
                        backgroundColor: log.status === 'success' ? 'var(--good-wash)' : 'var(--critical-wash)',
                        color: log.status === 'success' ? 'var(--good)' : 'var(--critical)'
                      }}>
                        {log.status.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)', marginTop: '6px' }}>{log.timestamp}</div>
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
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid var(--line)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-wash)', padding: '10px', borderRadius: '12px', border: '2px solid var(--accent)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 11a4 4 0 0 0-4-4 6 6 0 0 0-11 2 4 4 0 0 0 0 8h15a3 3 0 0 0 0-6z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: 'var(--ink)' }}>1. Automated Google Drive 24-Hour Backup Engine</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                      Automated daily backup creates 3 category folders (Students, Teachers, Expenditures) with 4 campus subfolders on Google Drive.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F0FDF4', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--good)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22C55E' }}></span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803D' }}>Google Drive Active â€¢ 24h Rolling Retention (2 Snapshots/Campus)</span>
                </div>
              </div>

              {/* Security PIN verification for Backup */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '680px', marginBottom: '18px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ink-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
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
                      border: '2px solid var(--line-strong)',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: 'var(--ink)',
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
                      border: '2px solid var(--accent)',
                      backgroundColor: 'var(--accent)',
                      color: 'var(--surface)',
                      fontWeight: 900,
                      fontSize: '13px',
                      boxShadow: '3px 3px 0px var(--accent)',
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
                      border: '2px solid var(--critical)',
                      backgroundColor: 'var(--critical-wash)',
                      color: 'var(--critical)',
                      fontWeight: 900,
                      fontSize: '13px',
                      boxShadow: '3px 3px 0px var(--critical)',
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
                <div style={{ marginTop: '12px', backgroundColor: 'var(--accent-wash)', padding: '14px', borderRadius: '12px', border: '2px solid var(--accent)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: 'var(--accent)', marginBottom: '6px' }}>
                    <span>Generating JSON Snapshots & Syncing to Google Drive...</span>
                    <span>{backupProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#DBEAFE', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${backupProgress}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* SUB-SECTION 2: WIPE / DELETE DATABASE (PASSCODE PROTECTED) */}
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: '#FFF5F5', border: '2.5px solid var(--critical)', boxShadow: '4px 4px 0px var(--critical)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', borderBottom: '2px solid var(--critical-wash)', paddingBottom: '10px' }}>
                <div style={{ color: 'var(--critical)', backgroundColor: 'var(--critical-wash)', padding: '10px', borderRadius: '12px', border: '2px solid var(--critical)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: 'var(--critical)' }}>2. Emergency Database Wipe (Purge All Schema Collections)</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--critical)' }}>
                    Protected behind Authenticator Account Password Verification. Clears all student, faculty, payment & expense collections.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '680px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 900, color: 'var(--critical)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
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
                      border: '2px solid var(--critical-wash)',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: 'var(--ink)',
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
                    border: '2px solid var(--critical)',
                    backgroundColor: 'var(--critical)',
                    color: 'var(--surface)',
                    fontWeight: 900,
                    fontSize: '13px',
                    boxShadow: '3px 3px 0px var(--critical)',
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
                <div style={{ marginTop: '14px', backgroundColor: 'var(--critical-wash)', padding: '14px', borderRadius: '12px', border: '2px solid var(--critical)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: 'var(--critical)', marginBottom: '6px' }}>
                    <span>Wiping entire database, please wait...</span>
                    <span>{wipeProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--critical-wash)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${wipeProgress}%`, height: '100%', backgroundColor: 'var(--critical)', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* SUB-SECTION 3: DATA RESTORATION SYSTEM (CATEGORIES & CAMPUSES) */}
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}>
              <div style={{ marginBottom: '18px', borderBottom: '2px solid var(--line)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: 'var(--ink)' }}>3. Data Restoration & Import Engine</h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  Select a category to view active Google Drive backups or drag-and-drop local backup files for each of the 4 campuses.
                </p>
              </div>

              {/* Category selector tabs, one per backup type.
                  Driven by BACKUP_CATEGORIES so a new data type appears here
                  automatically instead of needing a fourth copy of this block. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {BACKUP_CATEGORIES.map(cat => {
                  const active = activeRestoreCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveRestoreCategory(cat.key)}
                      style={{
                        padding: '14px',
                        borderRadius: '14px',
                        border: active ? `2.5px solid var(--${cat.tone})` : '2px solid var(--line-strong)',
                        backgroundColor: active ? `var(--${cat.tone}-wash)` : 'var(--surface)',
                        color: active ? `var(--${cat.tone})` : 'var(--ink-secondary)',
                        fontWeight: 900,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: active ? `3px 3px 0px var(--${cat.tone})` : 'none'
                      }}
                      className="press-interactive"
                    >
                      {cat.label}
                    </button>
                  );
                })}
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
                        border: '2px solid var(--ink)',
                        backgroundColor: 'var(--surface-sunken)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--ink)' }}>Campus: {camp.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-secondary)', backgroundColor: 'var(--line)', padding: '4px 8px', borderRadius: '6px' }}>
                          {isLoadingBackups ? 'Loading Drive...' : `${campBackups.length} Drive Snapshot(s)`}
                        </span>
                      </div>

                      {/* Active Drive Backups List for Campus */}
                      {campBackups.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {campBackups.slice(0, 2).map((bk: any, bkIdx: number) => (
                            <div key={bk.id || bk.fileName || `bk-${bkIdx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--line-strong)', backgroundColor: 'var(--surface)' }}>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>{bk.fileName}</div>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                                  Google Drive | {bk.createdAt ? new Date(bk.createdAt).toLocaleString() : 'date unknown'}
                                  {bk.size ? ` | ${Math.max(1, Math.round(Number(bk.size) / 1024))} KB` : ''}
                                </div>
                              </div>
                              <button
                                onClick={() => handleExecuteDataRestore(bk.id, bk.fileName, activeRestoreCategory, camp.name)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  border: '1.5px solid var(--accent)',
                                  backgroundColor: 'var(--accent)',
                                  color: 'var(--surface)',
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
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', fontStyle: 'italic', padding: '8px' }}>
                          No active Drive backup snapshots found for {camp.name} yet. Trigger a backup or upload a file below.
                        </div>
                      )}

                      {/* File Upload / Drag Zone */}
                      <label style={{
                        padding: '16px 12px',
                        border: '2px dashed var(--ink-muted)',
                        borderRadius: '12px',
                        backgroundColor: 'var(--surface)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)' }}>
                          Drag & Drop or Click to Select Backup (.json / .xlsx)
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                          Restores {(BACKUP_CATEGORIES.find(c => c.key === activeRestoreCategory)?.label || activeRestoreCategory)} records for {camp.name} only
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
                <div style={{ ...styles.modalContent, maxWidth: '480px', backgroundColor: 'var(--ink)', color: 'var(--surface)', border: '3px solid var(--accent)', textAlign: 'center' }} className="anim-scale-in">
                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 900, color: 'var(--surface)' }}>
                    Restoring Data for {restoringCampus}
                  </h3>
                  <p style={{ margin: '0 0 18px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>
                    {restoreStatusText}
                  </p>

                  <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--ink)', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${restoreProgress}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.3s ease' }}></div>
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
          <span style={{ fontSize: '9px', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
            Inspire ERP Authenticator Portal v2.6.4 | Powered by TRNT BEE Technologies
          </span>
        </footer>
      </main>



      {/* Edit/Create Staff Account Modal */}
      {isEditModalOpen && (
        <div style={styles.modalOverlay} className="anim-fade-in">
          <div style={styles.modalContent} className="anim-scale-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid var(--line-strong)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'var(--ink)' }}>
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
                        border: '2px solid var(--ink)',
                        backgroundColor: 'var(--surface-sunken)',
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
                      backgroundColor: 'var(--line)',
                      cursor: 'not-allowed',
                      color: 'var(--ink-secondary)'
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
                      backgroundColor: 'var(--line)',
                      cursor: 'not-allowed',
                      color: 'var(--ink-secondary)'
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
                    border: '2px solid var(--line-strong)',
                    backgroundColor: 'var(--surface)',
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
                    border: '2px solid var(--ink)',
                    backgroundColor: 'var(--ink)',
                    color: 'var(--surface)',
                    fontWeight: 900,
                    fontSize: '12px',
                    boxShadow: '3px 3px 0px var(--ink)',
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
    backgroundColor: 'var(--surface-sunken)',
    color: 'var(--ink)',
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
    backgroundColor: 'var(--surface)',
    borderRight: '2.5px solid var(--ink)',
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
    color: 'var(--warning)',
    display: 'block'
  },
  sidebarTitle: {
    fontSize: '15px',
    fontWeight: '900',
    letterSpacing: '-0.02em',
    marginTop: '1px',
    color: 'var(--ink)'
  },
  sidebarDivider: {
    height: '2px',
    backgroundColor: 'var(--line-strong)',
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
    backgroundColor: 'var(--surface-sunken)',
    position: 'relative' as const,
    boxSizing: 'border-box' as const
  },
  workspaceHeader: {
    marginBottom: '24px',
    borderBottom: '2.5px solid var(--ink)',
    paddingBottom: '16px',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const
  },
  workspaceTitle: {
    fontSize: '22px',
    fontWeight: '900',
    color: 'var(--ink)',
    letterSpacing: '-0.02em',
    margin: 0
  },
  workspaceSubtitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--ink-secondary)',
    marginTop: '4px',
    margin: '4px 0 0'
  },
  metricCard: {
    padding: '20px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '4px',
    border: '2.5px solid var(--ink)',
    borderRadius: '16px',
    backgroundColor: 'var(--surface)',
    boxShadow: '4px 4px 0px var(--ink)',
  },
  metricLabel: {
    fontSize: '10px',
    color: 'var(--ink-secondary)',
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
    color: 'var(--ink-secondary)',
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
    backgroundColor: 'var(--surface)',
    border: '2.5px solid var(--warning)',
    borderRadius: '20px',
    boxShadow: '4px 4px 0px var(--ink)',
    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
  },
  keyRoleLabel: {
    fontSize: '10px',
    fontWeight: '900',
    color: 'var(--accent)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const
  },
  keyDisplayBlock: {
    padding: '10px 14px',
    borderRadius: '12px',
    textAlign: 'center' as const,
    border: '2px solid var(--line-strong)',
    backgroundColor: 'var(--surface-sunken)'
  },
  keyValue: {
    fontSize: '22px',
    fontFamily: 'monospace',
    letterSpacing: '0.08em',
    fontWeight: '900',
    color: 'var(--ink)'
  },
  copyBtn: {
    width: '100%',
    padding: '8px',
    borderRadius: '10px',
    border: '2px solid var(--ink)',
    backgroundColor: 'var(--surface)',
    color: 'var(--ink)',
    fontSize: '11px',
    fontWeight: '900',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
    boxShadow: '2px 2px 0px var(--ink)'
  },
  formGroup: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '4px'
  },
  inputLabel: {
    fontSize: '10px',
    fontWeight: '900',
    color: 'var(--ink-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em'
  },
  formInput: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '2px solid var(--line-strong)',
    backgroundColor: 'var(--surface)',
    color: 'var(--ink)',
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
    border: '2px solid var(--line-strong)',
    backgroundColor: 'var(--surface)',
    color: 'var(--ink)',
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
    border: '2.5px solid var(--ink)',
    borderRadius: '16px',
    backgroundColor: 'var(--surface)',
    boxShadow: '3px 3px 0px var(--ink)'
  },
  deleteBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '2px solid var(--critical)',
    background: 'var(--critical-wash)',
    color: 'var(--critical)',
    fontSize: '11px',
    fontWeight: '900',
    cursor: 'pointer'
  },
  logoutBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '2px solid var(--critical)',
    backgroundColor: 'var(--critical-wash)',
    color: 'var(--critical)',
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
    backgroundColor: 'var(--ink)',
    color: 'var(--surface)',
    border: '2.5px solid var(--accent)',
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
    backgroundColor: 'var(--surface)',
    border: '3px solid var(--ink)',
    borderRadius: '24px',
    padding: '28px',
    boxShadow: '8px 8px 0px var(--ink)'
  }
};

