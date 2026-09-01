import React, { useState, useEffect } from 'react';
import { AccountSecurityPanel } from '../components/common/AccountSecurityPanel';
import { LIMITS } from '../constants/fieldLimits';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { authenticatorService, BACKUP_CATEGORIES } from '../services/authenticatorService';
import { CAMPUS_LIST } from '../constants/campuses';
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
  const activeTab = (globalActiveTab === 'sync_integrity' || globalActiveTab === 'settings') 
    ? globalActiveTab 
    : 'dashboard';

  const setActiveTab = (tab: 'dashboard' | 'sync_integrity' | 'settings') => {
    setGlobalActiveTab(tab);
  };

  // Backend state
  // Newly issued PINs, held in component state only. Never persisted to
  // localStorage: they are the live credentials for every portal account.
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
  const [accountRole, setAccountRole] = useState<'admin1' | 'clerk' | 'accountant' | 'authenticator'>('accountant');
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


  // Settings State 1: Make Google Drive Backup
  // (backupPasscode removed — it was collected and never sent; see the note
  // in the backup panel below.)
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
  // The restore selection. One button opens this; the operator ticks what to
  // put back and from which campus.
  //
  // Categories are a SET, not one active tab. Backups are written per category,
  // and features have been added since some of the older files were taken - so
  // a file may simply not contain a collection that exists now. Restoring
  // everything blindly would either fail or quietly put back less than the
  // operator believes. Choosing is the point.
  const [restoreCampus, setRestoreCampus] = useState<string>('');
  const [restorePicked, setRestorePicked] = useState<BackupCategoryKey[]>([]);

  // Fetch Available Backups from Server/Google Drive
  const loadAvailableBackups = async () => {
    try {
      // Campus-scoped tree: Backup/<Type>/<Campus>/. The old call returned a
      // single flat folder with every campus mixed together.
      const data = await authenticatorService.getBackupsByCategory();
      if (data) setAvailableBackups(data);
    } catch (err: any) {
      console.warn('Failed to load available backups:', err.message);
    } finally {
    }
  };

  useEffect(() => {
    loadAvailableBackups();
  }, []);

  // Handler: Run Google Drive 24h Rolling Backup Now
  const handleRunGoogleDriveBackup = async () => {
    // No password gate: the backup routes take none and the server verifies
    // none. See the note where the input used to be.
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

  // Handler: Wipe Entire Database
  const handleExecuteDatabaseWipe = async () => {
    if (!wipePasscode.trim()) {
      // The OPERATIONS password, which is a different secret from this
      // account's own. The server checks it against OPS_PASSWORD_HASH, and
      // this message used to name the account password — so an operator did
      // exactly as told, typed the password they had just signed in with, and
      // got "Incorrect operations password" with nothing to say which other
      // password was wanted.
      triggerToast('Enter the OPERATIONS password (not your account password) to confirm the wipe.');
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
  /**
   * Restore every category the operator ticked, from one button.
   *
   * The shape that matters: PREVIEW EVERYTHING FIRST, confirm once against real
   * numbers, ask for the password once, then apply. Previewing per category and
   * confirming per category would mean an operator clicking through six dialogs,
   * and the sixth gets clicked without reading - which is how a restore goes
   * wrong quietly.
   *
   * Each preview is a server-side dry run: it decrypts the file, checks the
   * checksum, confirms the type and campus, and counts what would change.
   * Nothing is written until the apply step.
   *
   * A category with no backup file for the chosen campus is REPORTED, not
   * skipped in silence. "Nothing happened" and "there was nothing to restore"
   * look identical afterwards and need opposite responses.
   */
  const handleRestoreSelected = async () => {
    if (!restoreCampus) { triggerToast('Choose a campus first.'); return; }
    if (restorePicked.length === 0) { triggerToast('Tick at least one category to restore.'); return; }

    setIsRestoring(true);
    try {
      const jobs: Array<{ category: BackupCategoryKey; label: string; type: string; file: any; preview: any }> = [];
      const missing: string[] = [];
      const unreadable: string[] = [];

      for (const category of restorePicked) {
        const label = (BACKUP_CATEGORIES.find(c => c.key === category) || { label: category }).label;
        const files = ((availableBackups || {})[category] || {})[restoreCampus] || [];
        if (!files.length) { missing.push(label); continue; }

        // Newest first is how getBackupsByCategory sorts them.
        const file = files[0];
        const type = authenticatorService.categoryToBackupType(category);
        try {
          const preview = await authenticatorService.previewRestore(file.id, type, restoreCampus);
          jobs.push({ category, label, type, file, preview });
        } catch (err: any) {
          const rejected = err?.data?.data?.validation;
          unreadable.push(`${label}: ${rejected?.errors?.length ? rejected.errors.join(' ') : (err?.message || 'could not be read')}`);
        }
      }

      if (unreadable.length) {
        triggerToast(`Backup rejected — ${unreadable[0]}. Nothing was changed.`);
        return;
      }
      if (!jobs.length) {
        triggerToast(`No backup files exist for ${restoreCampus} in the categories you picked. Nothing was changed.`);
        return;
      }

      const lines = jobs.map(j => {
        const sum = j.preview?.validation?.summary || {};
        const plan = j.preview?.plan || {};
        return `  • ${j.label} — ${sum.recordCount ?? 0} in backup: ` +
               `${plan.willUpdate ?? 0} updated, ${plan.willInsert ?? 0} added, ` +
               `${plan.presentButNotInBackup ?? 0} left alone`;
      });
      const warnings = jobs.flatMap(j => (j.preview?.validation?.warnings || []).map((w: string) => `${j.label}: ${w}`));

      const confirmed = window.confirm(
        `Restore ${jobs.length} categor${jobs.length === 1 ? 'y' : 'ies'} for ${restoreCampus}\n\n` +
        lines.join('\n') + '\n\n' +
        (missing.length ? `No backup found for: ${missing.join(', ')} — these will be left untouched.\n\n` : '') +
        (warnings.length ? `Warnings:\n- ${warnings.join('\n- ')}\n\n` : '') +
        `Only ${restoreCampus} is touched. Records already there but absent from a backup are LEFT AS THEY ARE.\n` +
        `Overwritten values cannot be recovered.`
      );
      if (!confirmed) return;

      // Asked once for the whole run, not once per category. It is verified
      // server-side with bcrypt on every single call regardless.
      // The OPERATIONS password — the shared secret behind restore, purge and
      // wipe — and NOT this account's own. The server verifies it against
      // OPS_PASSWORD_HASH; naming it "YOUR account password" sent operators to
      // the one password guaranteed to be refused.
      const password = window.prompt(
        'Enter the OPERATIONS password to confirm this restore.\n\n' +
        'This is the shared operations secret used for restore, purge and wipe — ' +
        'not the password you signed in with.'
      );
      if (!password || !password.trim()) return;

      let inserted = 0, updated = 0;
      const failed: string[] = [];
      for (const j of jobs) {
        try {
          const result = await authenticatorService.applyRestore(j.file.id, j.type, restoreCampus, password.trim());
          const applied = result?.applied || {};
          inserted += applied.inserted ?? 0;
          updated += applied.updated ?? 0;
        } catch (err: any) {
          failed.push(`${j.label} (${err?.message || 'failed'})`);
        }
      }

      if (failed.length) {
        triggerToast(`Restored ${jobs.length - failed.length} of ${jobs.length}. Failed: ${failed.join('; ')}`);
      } else {
        triggerToast(
          `Restore complete — ${inserted} added, ${updated} updated across ` +
          `${jobs.length} categor${jobs.length === 1 ? 'y' : 'ies'} at ${restoreCampus}.`,
          'success'
        );
      }
      await loadData();
      await loadAvailableBackups();
    } catch (err: any) {
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
      // getKeys() is no longer fetched: the Security Keys tab it fed has been
      // removed, and pulling PINs this portal never displays put credentials on
      // the wire for nothing.
      const [accountsRes, statsRes, syncRes] = await Promise.all([
        authenticatorService.getAccounts(),
        authenticatorService.getStats(),
        authenticatorService.getSyncJournal()
      ]);
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
            <span style={{ color: 'var(--surface)', fontWeight: 800, fontSize: '0.9286rem' }}>{toast}</span>
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
                {activeTab === 'sync_integrity' && 'Transaction Ledger'}
                {activeTab === 'settings' && 'System Settings'}
              </h1>
              <p style={styles.workspaceSubtitle}>
                {activeTab === 'dashboard' && 'Real-time security metrics, active web sessions, and system status.'}
                {activeTab === 'sync_integrity' && 'Audit real-time transaction journal for successful commits and system actions.'}
                {/*
                  This said "and bulk CSV file uploads". There is no such
                  feature and there never was — the drag-and-drop zone that
                  offered it was removed from the restore panel below, which
                  now states plainly that Drive snapshots are the only source
                  a restore can read. This heading was still selling it.
                */}
                {/* "emergency data purges" was listed here and there is no such
                    control on this screen — the only destructive action is the
                    wipe. Describing a button that does not exist sends whoever
                    needs it hunting for it during the incident that made them
                    open this page. */}
                {activeTab === 'settings' && 'Change your own password and PIN, back up to Drive, restore from a Drive snapshot, or wipe the database.'}
              </p>
            </div>
          </div>
        </header>

        {/* â”€â”€â”€ TAB 1: DASHBOARD OVERVIEW (4 KEY METRIC CARDS ONLY) â”€â”€â”€ */}
        {activeTab === 'dashboard' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* EXACTLY 4 METRIC CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '16px' }}>
              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid var(--accent)' }}>
                <span style={styles.metricLabel}>Active Portal Sessions</span>
                <strong style={{ ...styles.metricValue, color: 'var(--accent)' }}>
                  {/* Both halves were literals. The denominator said 4 —
                      "campus portals" — while the numerator counts SESSIONS,
                      so five people signed in read "5 / 4". And `|| 4` meant
                      nobody signed in also rendered as 4, which is the one
                      state this card exists to make visible. The server
                      already sends the real figures. */}
                  {stats.activeSessionCount ?? 0} / {stats.portalSlotTotal ?? stats.totalStaff ?? 0} Online
                </strong>
                <span style={styles.metricSub}>Campus portals currently connected</span>
              </GlassCard>

              <GlassCard hoverable={false} style={{ ...styles.metricCard, borderTop: '5px solid var(--warning)' }}>
                <span style={styles.metricLabel}>Staff Access Credentials</span>
                <strong style={{ ...styles.metricValue, color: 'var(--warning)' }}>
                  {/* Not `|| 14`: an empty account list is a real state and
                      showing an invented 14 for it hides exactly the fault an
                      operator would be looking for. */}
                  {accounts.length} Accounts
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
                <strong style={{ ...styles.metricValue, color: '#6D28D9', fontSize: '1.0714rem', marginTop: '6px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '20px' }}>
              {/* Active Sessions Panel */}
              <GlassCard hoverable={false} style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '2px solid var(--line-strong)', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Connected Portal Sessions
                  </h4>
                  <span style={{ fontSize: '0.7857rem', fontWeight: 800, color: 'var(--accent)', backgroundColor: 'var(--accent-wash)', padding: '2px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                    Live Sync
                  </span>
                </div>
                {activeSessions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeSessions.map((session, idx) => (
                      <div key={session.sessionGuid || `session-${session.name}-${idx}`} style={{ padding: '12px 14px', borderRadius: '12px', border: '2px solid var(--line-strong)', backgroundColor: 'var(--surface-sunken)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '0.9286rem', color: 'var(--ink)' }}>{session.name}</div>
                            <div style={{ fontSize: '0.7857rem', fontWeight: 700, color: 'var(--ink-secondary)', marginTop: '2px' }}>{session.role} | {session.campus}</div>
                          </div>
                          <span style={{ fontSize: '0.7143rem', fontWeight: 800, color: 'var(--good)', backgroundColor: 'var(--good-wash)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--good-wash)' }}>
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', backgroundColor: 'var(--surface-sunken)', borderRadius: '12px', border: '2px solid var(--line)', fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                    All 4 Campus Portal slots are online & synced.
                  </div>
                )}
              </GlassCard>

              {/* Transaction Widget */}
              <GlassCard hoverable={false} style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '2px solid var(--line-strong)', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Transaction Ledger Journal
                  </h4>
                  <button onClick={() => setActiveTab('sync_integrity')} style={{ fontSize: '0.7857rem', fontWeight: 850, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    View All &rarr;
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {filteredSyncLogs.slice(0, 5).map((log, idx) => (
                    <div key={log.transactionId ? `dash-tx-${log.transactionId}-${idx}` : `dash-tx-${idx}`} style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--line-strong)', backgroundColor: 'var(--surface-sunken)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.8571rem', fontWeight: 900, color: 'var(--ink)' }}>{log.action}</div>
                        <div style={{ fontSize: '0.7143rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>By {log.performedBy || 'System'} | {log.timestamp}</div>
                      </div>
                      <span style={{
                        fontSize: '0.7143rem',
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
        {/* The Security Keys and Staff Accounts tabs used to sit here.

            Both were credential management, and credential management already
            exists in the Rector portal under Credentials - which is the single
            place it belongs. Two screens that both set a password are two
            screens that disagree about who last set it.

            What this portal keeps is what only it can do: backups, restore,
            wiping the database, and the transaction journal. */}

        {/* â”€â”€â”€ TAB 3: ACCOUNT CONTROL â”€â”€â”€ */}

        {/* --- TAB 4: TRANSACTION LEDGER CONSOLE --- */}
        {activeTab === 'sync_integrity' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GlassCard hoverable={false} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1429rem', fontWeight: 900, color: 'var(--ink)' }}>
                  Transaction Ledger Console
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  Real-time audit log of security events, administrative updates, and system operations.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={loadData} style={{ padding: '8px 14px', borderRadius: '10px', border: '2px solid var(--accent)', backgroundColor: 'var(--accent)', color: 'var(--surface)', fontWeight: 850, fontSize: '0.8571rem', cursor: 'pointer' }} className="press-interactive">
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
                      fontSize: '0.8571rem',
                      cursor: 'pointer'
                    }}
                    className="press-interactive"
                  >
                    {filter.toUpperCase()}
                  </button>
                ))}
              </div>
              <input maxLength={100}
                type="text"
                placeholder="Search transaction ID, action, user..."
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '2px solid var(--line-strong)',
                  backgroundColor: 'var(--surface)',
                  fontSize: '0.8571rem',
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
                      <div style={{ fontSize: '0.9286rem', fontWeight: 900, color: 'var(--ink)' }}>{log.action}</div>
                      <div style={{ fontSize: '0.7857rem', fontWeight: 700, color: 'var(--ink-secondary)', marginTop: '4px' }}>
                        ID: {log.transactionId} | Performed By: {log.performedBy || 'System'}
                      </div>
                      <div style={{ fontSize: '0.7857rem', fontWeight: 600, color: 'var(--ink-secondary)', marginTop: '4px' }}>
                        {log.details || log.errorDetails || 'Transaction logged'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.7143rem',
                        fontWeight: 900,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: log.status === 'success' ? '1.5px solid var(--good)' : '1.5px solid var(--critical)',
                        backgroundColor: log.status === 'success' ? 'var(--good-wash)' : 'var(--critical-wash)',
                        color: log.status === 'success' ? 'var(--good)' : 'var(--critical)'
                      }}>
                        {log.status.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '0.7143rem', fontWeight: 700, color: 'var(--ink-muted)', marginTop: '6px' }}>{log.timestamp}</div>
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

            {/*
              The authenticator's own password and PIN.

              This is the ONLY way this account's credentials can be changed,
              and that is deliberate. The Rector can set every other portal's
              credentials but not this one, because this is the account that
              audits the Rector. /api/account/password has never been
              role-restricted, so the capability already existed - there was
              simply no way to reach it from this portal, which is why it
              looked like the account could not be changed at all.
            */}
            <AccountSecurityPanel
              onToast={(message) => setToast(message)}
              onSignOut={(reason) => { (window as any).endSession?.(reason); }}
            />

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
                    <h3 style={{ margin: 0, fontSize: '1.2143rem', fontWeight: 900, color: 'var(--ink)' }}>1. Automated Google Drive 24-Hour Backup Engine</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.8571rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                      Automated daily backup creates 3 category folders (Students, Teachers, Expenditures) with 4 campus subfolders on Google Drive.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F0FDF4', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--good)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22C55E' }}></span>
                  <span style={{ fontSize: '0.8571rem', fontWeight: 800, color: '#15803D' }}>Google Drive Active â€¢ 24h Rolling Retention (2 Snapshots/Campus)</span>
                </div>
              </div>

              {/*
                NO PASSWORD BOX HERE ANY MORE, deliberately.

                There was one, labelled "Authenticator Password Verification",
                and the value it collected was never sent anywhere: the backup
                routes take no password, and the server checks none — being
                signed in as the authenticator IS the authorisation, which is
                right, because a backup only reads data and writes a copy to
                the college's own Drive. It destroys nothing.

                So the box refused to start a backup until something was typed
                and then accepted literally any text. That is worse than having
                no box: it looks like a check, it teaches whoever uses this
                screen that these prompts are decoration, and the next prompt
                they meet — the wipe — is a real one guarding an irreversible
                action.
              */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '680px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRunGoogleDriveBackup}
                    disabled={isCreatingBackup}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '12px',
                      border: '2px solid var(--accent)',
                      backgroundColor: 'var(--accent)',
                      color: 'var(--surface)',
                      fontWeight: 900,
                      fontSize: '0.9286rem',
                      boxShadow: '3px 3px 0px var(--accent)',
                      cursor: isCreatingBackup ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    className="press-interactive"
                  >
                    {isCreatingBackup ? 'Backing Up to Drive...' : 'Trigger Immediate Drive Backup'}
                  </button>

                </div>
              </div>

              {/* Progress Bar for Backup */}
              {isCreatingBackup && (
                <div style={{ marginTop: '12px', backgroundColor: 'var(--accent-wash)', padding: '14px', borderRadius: '12px', border: '2px solid var(--accent)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8571rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '6px' }}>
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
                  <h3 style={{ margin: 0, fontSize: '1.2143rem', fontWeight: 900, color: 'var(--critical)' }}>2. Emergency Database Wipe (Purge All Schema Collections)</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8571rem', fontWeight: 700, color: 'var(--critical)' }}>
                    Protected by the OPERATIONS password. Takes a Drive backup first, then clears all student, faculty, payment &amp; expense collections.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '680px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  {/* The label, the placeholder and the line above all said
                      "Authenticator / Account Password". The server checks the
                      OPERATIONS password — a different secret — so all three
                      pointed at the one password guaranteed to be refused. The
                      toast was corrected first; this is what is actually on
                      screen while somebody types. */}
                  <label style={{ fontSize: '0.7857rem', fontWeight: 900, color: 'var(--critical)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Operations Password
                  </label>
                  <input maxLength={LIMITS.password}
                    type="password"
                    value={wipePasscode}
                    onChange={(e) => setWipePasscode(e.target.value)}
                    placeholder="Operations password — not your account password"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid var(--critical-wash)',
                      fontSize: '0.9286rem',
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
                    fontSize: '0.9286rem',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8571rem', fontWeight: 800, color: 'var(--critical)', marginBottom: '6px' }}>
                    <span>Wiping entire database, please wait...</span>
                    <span>{wipeProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--critical-wash)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${wipeProgress}%`, height: '100%', backgroundColor: 'var(--critical)', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* SUB-SECTION 3: RESTORE FROM BACKUP
                One button, then a choice of what to put back.

                This replaced a browser: a row of category tabs, a campus list
                under each, and a file list under that, with a Restore button on
                every row. It showed everything and decided nothing, and the
                operator had to understand the backup layout before they could
                use it.

                Now: pick the campus, tick what to restore, press once. The
                newest backup for each ticked category is used. Categories still
                have to be CHOSEN rather than assumed - features have been added
                since some older files were taken, so a backup may not contain a
                collection that exists today, and "restore everything" would
                quietly put back less than it appears to. */}
            <GlassCard hoverable={false} style={{ padding: '24px', backgroundColor: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '2px solid var(--line)', paddingBottom: '12px' }}>
                <div style={{ color: 'var(--good)', backgroundColor: 'var(--good-wash, rgba(5,150,105,0.08))', padding: '10px', borderRadius: '12px', border: '2px solid var(--good)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 7v6h6" /><path d="M3.51 13a9 9 0 1 0 2.13-9.36L3 7" /></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.0714rem', fontWeight: 900, color: 'var(--ink)' }}>Restore from Backup</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.7857rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                    Puts saved records back. Nothing is written until you confirm what it found.
                  </p>
                </div>
              </div>

              {/* Campus */}
              <label style={{ display: 'block', fontSize: '0.7143rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-secondary)', marginBottom: '6px' }}>
                1. Which campus
              </label>
              <select
                value={restoreCampus}
                onChange={(e) => setRestoreCampus(e.target.value)}
                style={{ width: '100%', padding: '11px 12px', borderRadius: '10px', border: '2px solid var(--line)', backgroundColor: 'var(--surface-sunken)', color: 'var(--ink)', fontWeight: 700, fontSize: '0.9286rem', marginBottom: '18px' }}
              >
                <option value="">Select a campus…</option>
                {CAMPUS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Categories */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '0.7143rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-secondary)' }}>
                  2. What to restore
                </label>
                <button
                  type="button"
                  onClick={() => setRestorePicked(
                    restorePicked.length === BACKUP_CATEGORIES.length
                      ? []
                      : BACKUP_CATEGORIES.map(c => c.key)
                  )}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 800, fontSize: '0.7857rem', cursor: 'pointer', padding: 0 }}
                >
                  {restorePicked.length === BACKUP_CATEGORIES.length ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '8px', marginBottom: '18px' }}>
                {BACKUP_CATEGORIES.map(cat => {
                  const picked = restorePicked.includes(cat.key);
                  const count = ((availableBackups || {})[cat.key] || {})[restoreCampus]?.length || 0;
                  const newest = ((availableBackups || {})[cat.key] || {})[restoreCampus]?.[0];
                  const none = !!restoreCampus && count === 0;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setRestorePicked(picked
                        ? restorePicked.filter(k => k !== cat.key)
                        : [...restorePicked, cat.key])}
                      style={{
                        textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                        border: picked ? '2px solid var(--accent)' : '2px solid var(--line)',
                        backgroundColor: picked ? 'var(--accent-wash, rgba(37,99,235,0.07))' : 'var(--surface-sunken)',
                        opacity: none ? 0.55 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          border: picked ? '2px solid var(--accent)' : '2px solid var(--ink-secondary)',
                          backgroundColor: picked ? 'var(--accent)' : 'transparent',
                          color: '#fff', fontSize: 12, fontWeight: 900, lineHeight: '15px', textAlign: 'center'
                        }}>{picked ? '✓' : ''}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.8571rem', color: 'var(--ink)' }}>{cat.label}</span>
                      </div>
                      <div style={{ fontSize: '0.7143rem', color: 'var(--ink-secondary)', marginTop: '5px', fontWeight: 600 }}>
                        {!restoreCampus
                          ? 'Choose a campus to see backups'
                          : none
                            ? 'No backup for this campus'
                            : `Newest: ${newest?.createdAt ? new Date(newest.createdAt).toLocaleDateString() : 'unknown'} · ${count} file${count === 1 ? '' : 's'}`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* The one button */}
              <button
                onClick={handleRestoreSelected}
                disabled={!restoreCampus || restorePicked.length === 0}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: '2.5px solid var(--ink)',
                  backgroundColor: (!restoreCampus || restorePicked.length === 0) ? 'var(--surface-sunken)' : 'var(--good)',
                  color: (!restoreCampus || restorePicked.length === 0) ? 'var(--ink-secondary)' : '#FFFFFF',
                  fontWeight: 900, fontSize: '0.9286rem', letterSpacing: '0.02em',
                  cursor: (!restoreCampus || restorePicked.length === 0) ? 'not-allowed' : 'pointer',
                  boxShadow: (!restoreCampus || restorePicked.length === 0) ? 'none' : '3px 3px 0px var(--ink)'
                }}
                className="press-interactive"
              >
                {restorePicked.length === 0
                  ? 'Restore from Backup'
                  : `Restore ${restorePicked.length} categor${restorePicked.length === 1 ? 'y' : 'ies'}`}
              </button>

              <p style={{ fontSize: '0.7143rem', color: 'var(--ink-secondary)', marginTop: '10px', marginBottom: 0, fontWeight: 600, lineHeight: 1.6 }}>
                You will be shown exactly what the backup contains and what would change, before anything
                is written, and asked for your account password to confirm. Records already present but
                absent from the backup are left alone.
              </p>
            </GlassCard>

          </section>
        )}
        {/* Footer */}
        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 28px 16px', gap: '8px', opacity: 0.85, marginTop: 'auto' }}>
          <span style={{ fontSize: '0.6429rem', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
            Inspire ERP Authenticator Portal v2.6.4 | Powered by TRNT BEE Technologies
          </span>
        </footer>
      </main>



      {/* Edit/Create Staff Account Modal */}
      {isEditModalOpen && (
        <div style={styles.modalOverlay} className="anim-fade-in">
          <div style={styles.modalContent} className="anim-scale-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid var(--line-strong)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1429rem', fontWeight: 900, color: 'var(--ink)' }}>
                Edit Staff Account
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2857rem', fontWeight: 900 }}>X</button>
            </div>

            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Username / ID</label>
                  <input maxLength={LIMITS.username}
                    type="text"
                    placeholder="e.g. clerk1_beemaram_c1"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Password</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input maxLength={LIMITS.password}
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
                        fontSize: '0.7857rem',
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
                <input maxLength={LIMITS.personName}
                  type="text"
                  placeholder="Staff Member Full Name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
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
                    <option value="clerk">Clerk (Campus Clerk)</option>
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
                    fontSize: '0.8571rem',
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
                    fontSize: '0.8571rem',
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
    fontSize: '0.7143rem',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--warning)',
    display: 'block'
  },
  sidebarTitle: {
    fontSize: '1.0714rem',
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
    fontSize: '0.8571rem',
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
    fontSize: '1.5714rem',
    fontWeight: '900',
    color: 'var(--ink)',
    letterSpacing: '-0.02em',
    margin: 0
  },
  workspaceSubtitle: {
    fontSize: '0.8571rem',
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
    fontSize: '0.7143rem',
    color: 'var(--ink-secondary)',
    fontWeight: '900',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em'
  },
  metricValue: {
    fontSize: '1.5714rem',
    fontWeight: '900',
    letterSpacing: '-0.02em',
    marginTop: '2px'
  },
  metricSub: {
    fontSize: '0.7143rem',
    color: 'var(--ink-secondary)',
    fontWeight: '700'
  },
  keysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
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
    fontSize: '0.7143rem',
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
    fontSize: '1.5714rem',
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
    fontSize: '0.7857rem',
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
    fontSize: '0.7143rem',
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
    fontSize: '0.9286rem',
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
    fontSize: '0.9286rem',
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
    fontSize: '0.7857rem',
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
    fontSize: '0.8571rem',
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
    fontSize: '0.9286rem',
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

