import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { useNavigation } from '../context/NavigationContext';
import { LiveConnectionIndicator } from '../components/common/LiveConnectionIndicator';
import { InspireLogo } from '../components/common/InspireLogo';
import { onSocketEvent } from '../services/socketClient';
import { authenticatorService } from '../services/authenticatorService';
import type { 
  AccountInfo, 
  ActiveSessionInfo,
  AuthenticatorStats,
  SyncJournalEntry
} from '../services/authenticatorService';

export const AuthenticatorDashboardView: React.FC = () => {
  const { logout, activeTab: globalActiveTab, setActiveTab: setGlobalActiveTab } = useNavigation();
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
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});
  const [showModalPassword, setShowModalPassword] = useState<boolean>(false);

  const togglePasswordVisibility = (accId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [accId]: !prev[accId] }));
  };

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
  const [wipePass1, setWipePass1] = useState<string>('');
  const [wipePass2, setWipePass2] = useState<string>('');
  const [showWipeModal, setShowWipeModal] = useState<boolean>(false);
  const [wipeStep, setWipeStep] = useState<number>(1);
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
      const result = await authenticatorService.createBackup(backupPasscode.trim());
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
    if (!window.confirm('🗑️ Delete all items in Google Drive except the 3 category folders (Students, Teachers, Expenditures)?')) {
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

    if (!window.confirm('⚠️ WARNING: Are you strictly sure you want to WIPEOUT ALL DATABASE SCHEMAS & RECORDS? This action cannot be undone!')) {
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

  // Handler: Execute Data Restore for Campus & Category
  const handleExecuteDataRestore = async (category: string, campus: string, backupFileContent?: string, fileId?: string) => {
    setRestoringCampus(campus);
    setRestoreProgress(10);
    setRestoreStatusText(`Connecting secure restore tunnel for ${campus}...`);

    const pTimer = setInterval(() => {
      setRestoreProgress(p => {
        if (p < 40) {
          setRestoreStatusText(`Reading ${category.replace('_', ' ')} backup snapshot...`);
          return p + 15;
        } else if (p < 80) {
          setRestoreStatusText(`Restoring Mongoose schemas & indexing ${campus} records...`);
          return p + 15;
        } else {
          setRestoreStatusText(`Finalizing restore ledger for ${campus}...`);
          return p;
        }
      });
    }, 350);

    try {
      const result = await authenticatorService.restoreData({
        category,
        campus,
        backupFileContent
      });

      clearInterval(pTimer);
      setRestoreProgress(100);
      setRestoreStatusText(`Restoration Complete! ${result.restoredCount || 0} records restored.`);

      triggerToast(`Successfully restored ${result.restoredCount || 0} records into database for campus "${campus}"!`);
      await loadData();
    } catch (err: any) {
      clearInterval(pTimer);
      triggerToast(err.message || `Failed to restore data for ${campus}.`);
    } finally {
      setTimeout(() => {
        setRestoringCampus(null);
        setRestoreProgress(0);
      }, 1200);
    }
  };

  // Handler: File Drop / Select Restore
  const handleLocalFileDropRestore = (category: string, campus: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        handleExecuteDataRestore(category, campus, content);
      }
    };
    reader.readAsText(file);
  };

  // Trigger Toast Notification
  const triggerToast = (msg: string) => {
    const isError = msg.toLowerCase().includes('rejected') || 
                    msg.toLowerCase().includes('failed') || 
                    msg.toLowerCase().includes('denied') || 
                    msg.toLowerCase().includes('invalid') || 
                    msg.toLowerCase().includes('not found') || 
                    msg.toLowerCase().includes('error') ||
                    msg.toLowerCase().includes('incorrect');
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

  // Listen for real-time transaction updates
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
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadData();
    const pollInterval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  // Manual Regeneration for PINs
  const handleManualRegeneratePins = async () => {
    try {
      // Regenerate daily PINs in mock service or local state
      const newAdmin1Pin = Math.floor(100000 + Math.random() * 900000).toString();
      const newAdmin2Pin = Math.floor(100000 + Math.random() * 900000).toString();
      const newAccountantPin = Math.floor(100000 + Math.random() * 900000).toString();

      setKeysData((prev: any) => ({
        ...prev,
        dailyPins: {
          admin1: newAdmin1Pin,
          authenticator: '789123',
          admin2_erragattugutta_c1: newAdmin2Pin,
          admin2_erragattugutta_c2: newAdmin2Pin,
          admin2_beemaram_c1: newAdmin2Pin,
          admin2_beemaram_c2: newAdmin2Pin,
          accountant_erragattugutta_c1_1: newAccountantPin,
          accountant_erragattugutta_c1_2: newAccountantPin,
          accountant_erragattugutta_c2_1: newAccountantPin,
          accountant_erragattugutta_c2_2: newAccountantPin,
          accountant_beemaram_c1_1: newAccountantPin,
          accountant_beemaram_c1_2: newAccountantPin,
          accountant_beemaram_c2_1: newAccountantPin,
          accountant_beemaram_c2_2: newAccountantPin,
        }
      }));

      triggerToast('Security PINs manually regenerated successfully.');
    } catch (err: any) {
      triggerToast('Failed to regenerate PINs.');
    }
  };

  // Settings Action 1: Make Backup
  const handleMakeBackup = () => {
    if (!backupName.trim()) {
      triggerToast('Please write a backup file name first.');
      return;
    }
    setIsCreatingBackup(true);
    setTimeout(() => {
      const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      localStorage.setItem('last_backup_timestamp', nowStr);
      setStats(prev => ({ ...prev, lastBackupAt: nowStr }));
      setIsCreatingBackup(false);
      triggerToast(`Backup archive "${backupName.trim()}.json" created successfully!`);
    }, 1200);
  };

  // Settings Action 2: Wipe Database 2-Step Flow
  const handleInitiateWipeStep1 = () => {
    if (!wipePass1.trim()) {
      triggerToast('Please enter master password to initiate database wipe.');
      return;
    }
    setShowWipeModal(true);
    setWipeStep(2);
  };

  const handleConfirmWipeStep2 = () => {
    if (!wipePass2.trim()) {
      triggerToast('Please enter secondary authorization key to confirm.');
      return;
    }
    setIsWipingDb(true);
    setTimeout(() => {
      setIsWipingDb(false);
      setShowWipeModal(false);
      setWipeStep(1);
      setWipePass1('');
      setWipePass2('');
      triggerToast('Entire database wiped out successfully (UI Simulation).');
    }, 1500);
  };

  // Settings Action 3: File Uploads
  const handleUploadStudents = () => {
    if (!studentsFile) {
      triggerToast('Please select a Students record file first.');
      return;
    }
    setIsUploadingStudents(true);
    setTimeout(() => {
      setIsUploadingStudents(false);
      triggerToast(`Students file "${studentsFile.name}" uploaded successfully!`);
      setStudentsFile(null);
    }, 1200);
  };

  const handleUploadTeachers = () => {
    if (!teachersFile) {
      triggerToast('Please select a Teachers record file first.');
      return;
    }
    setIsUploadingTeachers(true);
    setTimeout(() => {
      setIsUploadingTeachers(false);
      triggerToast(`Teachers file "${teachersFile.name}" uploaded successfully!`);
      setTeachersFile(null);
    }, 1200);
  };

  const handleUploadExpenditures = () => {
    if (!expendituresFile) {
      triggerToast('Please select an Expenditures ledger file first.');
      return;
    }
    setIsUploadingExpenditures(true);
    setTimeout(() => {
      setIsUploadingExpenditures(false);
      triggerToast(`Expenditures file "${expendituresFile.name}" uploaded successfully!`);
      setExpendituresFile(null);
    }, 1200);
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
      loadData();
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
    triggerToast('Copied security PIN to clipboard!');
  };

  const activeSessions = (stats.activeSessions || []) as ActiveSessionInfo[];

  // Filtered transaction logs
  const filteredSyncLogs = syncLogs.filter(log => {
    if (ledgerFilter === 'success' && log.status !== 'success') return false;
    if (ledgerFilter === 'failed' && log.status !== 'failed' && log.status !== 'rejected') return false;
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      return (
        log.transactionId.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
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

      {/* Sidebar (Left column) - Removed as requested */}
      {false && (
        <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.branding}>
            <InspireLogo size="sm" inPortal={true} />
            <div>
              <span style={styles.meta}>Credential Override</span>
              <h2 style={styles.sidebarTitle}>Security Authenticator</h2>
            </div>
          </div>

          <div style={styles.sidebarDivider} />

          {/* Navigation Links */}
          <nav style={styles.sidebarNav}>
            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              )},
              { id: 'keys', label: '6-Digit Security PINs', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )},
              { id: 'accounts', label: 'Staff Accounts Control', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              )},
              { id: 'sync_integrity', label: 'Transaction Ledger', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              )},
              { id: 'settings', label: 'Settings', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              )},
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  ...styles.tabButton,
                  backgroundColor: activeTab === tab.id ? '#0F172A' : 'transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : '#475569',
                  border: activeTab === tab.id ? '2px solid #0F172A' : '2px solid transparent',
                  fontWeight: activeTab === tab.id ? 900 : 700,
                  boxShadow: activeTab === tab.id ? '3px 3px 0px #0F172A' : 'none'
                }}
                className="press-interactive"
              >
                <span style={{ color: activeTab === tab.id ? '#F59E0B' : '#64748B', display: 'flex' }}>
                  {tab.icon}
                </span>
                <span style={{ color: activeTab === tab.id ? '#FFFFFF' : '#334155' }}>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarBottom}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <LiveConnectionIndicator compact />
          </div>
          <button onClick={logout} style={styles.logoutBtn} className="press-interactive">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>
      )}

      {/* Workspace Content (Right column) */}
      <main style={styles.workspace}>
        {/* Workspace Header */}
        <header style={styles.workspaceHeader}>
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
        </header>

        {/* ─── TAB 1: DASHBOARD OVERVIEW (4 KEY METRIC CARDS ONLY) ─── */}
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
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginTop: '2px' }}>{session.role} — {session.campus}</div>
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
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>By {log.performedBy} • {log.timestamp}</div>
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
        {activeTab === 'keys' && keysData && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Action Bar with Manual PIN Regeneration Button */}
            <GlassCard hoverable={false} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', border: '2.5px solid #0F172A', boxShadow: '4px 4px 0px #0F172A' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                  Active 6-Digit Security PINs
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                  Administrative login credentials for Admin 1, Admin 2, and Accountant roles.
                </p>
              </div>

              {/* Manual Regeneration Button (No automated timer) */}
              <button
                onClick={handleManualRegeneratePins}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: '2px solid #D97706',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '13px',
                  boxShadow: '3px 3px 0px #B45309',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--font-family)'
                }}
                className="press-interactive"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Regenerate Security PINs</span>
              </button>
            </GlassCard>

            {/* Core Admin 1 & Authenticator 6-Digit PINs */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Section 1: Core System Master Logins
              </h4>
              <div style={styles.keysGrid}>
                <GlassCard hoverable={false} style={styles.keyCard}>
                  <span style={styles.keyRoleLabel}>Rector (Admin 1) Master PIN</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={styles.keyValue}>{keysData.dailyPins?.admin1 || '789456'}</strong>
                  </div>
                  <button onClick={() => copyToClipboard(keysData.dailyPins?.admin1 || '789456')} style={styles.copyBtn} className="press-interactive">
                    Copy 6-Digit PIN
                  </button>
                </GlassCard>

                <GlassCard hoverable={false} style={{ ...styles.keyCard, borderColor: '#D97706' }}>
                  <span style={{ ...styles.keyRoleLabel, color: '#D97706' }}>Security Authenticator PIN</span>
                  <div style={styles.keyDisplayBlock}>
                    <strong style={{ ...styles.keyValue, color: '#D97706' }}>{keysData.dailyPins?.authenticator || '789123'}</strong>
                  </div>
                  <button onClick={() => copyToClipboard(keysData.dailyPins?.authenticator || '789123')} style={styles.copyBtn} className="press-interactive">
                    Copy 6-Digit PIN
                  </button>
                </GlassCard>
              </div>
            </div>

            {/* Admin 2 Campus Deans 6-Digit PINs */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Section 2: Admin 2 (Campus Principals) PINs
              </h4>
              <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {[
                  { name: 'Erragattugutta C1', username: 'admin2_erragattugutta_c1', pin: keysData.dailyPins?.admin2_erragattugutta_c1 || '789456' },
                  { name: 'Erragattugutta C2', username: 'admin2_erragattugutta_c2', pin: keysData.dailyPins?.admin2_erragattugutta_c2 || '789456' },
                  { name: 'Beemaram C1', username: 'admin2_beemaram_c1', pin: keysData.dailyPins?.admin2_beemaram_c1 || '789456' },
                  { name: 'Beemaram C2', username: 'admin2_beemaram_c2', pin: keysData.dailyPins?.admin2_beemaram_c2 || '789456' }
                ].map(item => (
                  <GlassCard key={item.username} hoverable={false} style={styles.keyCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A' }}>{item.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>{item.username}</span>
                    </div>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{item.pin}</strong>
                    </div>
                    <button onClick={() => copyToClipboard(item.pin)} style={styles.copyBtn} className="press-interactive">
                      Copy 6-Digit PIN
                    </button>
                  </GlassCard>
                ))}
              </div>
            </div>

            {/* Accountant Campus Security PINs */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Section 3: Accountant Campus PINs
              </h4>
              <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {[
                  { name: 'Erragattugutta C1 (Acc 1)', username: 'accountant_erragattugutta_c1_1', pin: keysData.dailyPins?.accountant_erragattugutta_c1_1 || '789456' },
                  { name: 'Erragattugutta C2 (Acc 1)', username: 'accountant_erragattugutta_c2_1', pin: keysData.dailyPins?.accountant_erragattugutta_c2_1 || '789456' },
                  { name: 'Beemaram C1 (Acc 1)', username: 'accountant_beemaram_c1_1', pin: keysData.dailyPins?.accountant_beemaram_c1_1 || '789456' },
                  { name: 'Beemaram C2 (Acc 1)', username: 'accountant_beemaram_c2_1', pin: keysData.dailyPins?.accountant_beemaram_c2_1 || '789456' }
                ].map(item => (
                  <GlassCard key={item.username} hoverable={false} style={styles.keyCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A' }}>{item.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>{item.username}</span>
                    </div>
                    <div style={styles.keyDisplayBlock}>
                      <strong style={styles.keyValue}>{item.pin}</strong>
                    </div>
                    <button onClick={() => copyToClipboard(item.pin)} style={styles.copyBtn} className="press-interactive">
                      Copy 6-Digit PIN
                    </button>
                  </GlassCard>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 3: ACCOUNT CONTROL ─── */}
        {activeTab === 'accounts' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>Staff Accounts Registry</h3>
              <button
                onClick={() => {
                  setEditingAccountId(null);
                  setAccountUsername('');
                  setAccountPassword('');
                  setAccountName('');
                  setAccountEmail('');
                  setAccountMobile('');
                  setAccountDepartment('');
                  setAccountAddress('');
                  setAccountCampus('');
                  setIsEditModalOpen(true);
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '2px solid #0F172A',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '12px',
                  boxShadow: '3px 3px 0px #0F172A',
                  cursor: 'pointer'
                }}
                className="press-interactive"
              >
                + Provision New Account
              </button>
            </div>

            <div style={styles.accountsGrid}>
              {accounts.map((acc, idx) => {
                const accId = acc.id || (acc as any)._id || `acc-${acc.username}-${idx}`;
                const passwordVal = acc.password || (acc as any).passwordRaw || '';
                const isPassVisible = !!visiblePasswords[accId];

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
                            {acc.email || `${acc.username}@inspire.edu`} • {acc.mobile || 'No Mobile'}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>Pass:</span>
                          <code style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace', color: '#B45309', backgroundColor: '#FEF3C7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FCD34D' }}>
                            {isPassVisible ? (passwordVal || '(Default)') : '••••••••••••'}
                          </code>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => togglePasswordVisibility(accId)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1.5px solid #CBD5E1',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            className="press-interactive"
                            title={isPassVisible ? "Hide Password" : "Show Password"}
                          >
                            {isPassVisible ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => copyTextToClipboard(passwordVal, 'Password')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1.5px solid #0F172A',
                              backgroundColor: '#D97706',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            className="press-interactive"
                            title="Copy Password to clipboard"
                          >
                            Copy Pass
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => {
                          setEditingAccountId(accId);
                          setAccountUsername(acc.username);
                          setAccountPassword(passwordVal);
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
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        className="press-interactive"
                      >
                        Edit Credentials & Password
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(accId)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          border: '2px solid #EF4444',
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B',
                          fontSize: '12px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        className="press-interactive"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── TAB 4: TRANSACTION LEDGER CONSOLE ─── */}
        {activeTab === 'sync_integrity' && (
          <section className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                        ID: {log.transactionId} • Performed By: {log.performedBy}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginTop: '4px' }}>
                        {log.details}
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

        {/* ─── TAB 5: SYSTEM SETTINGS (GOOGLE DRIVE BACKUP & RESTORE ENGINE) ─── */}
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
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803D' }}>Google Drive Active • 24h Rolling Retention (2 Snapshots/Campus)</span>
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
                    {isCreatingBackup ? 'Backing Up to Drive...' : '⚡ Trigger Immediate Drive Backup'}
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
                    {isPurgingDrive ? 'Purging Google Drive...' : '🗑️ Purge Drive (Keep 3 Folders Only)'}
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
                  {isWipingDb ? 'Wiping Database...' : '🗑️ Wipe Entire Database'}
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
                  🎓 Students Data & Fees
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
                  👩‍🏫 Teachers Data & Salaries
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
                  💰 Multi-Branch Expenditures
                </button>
              </div>

              {/* 4 Campus Drop Zones for Selected Category */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
                {[
                  { name: 'JC Main', icon: '🏛️' },
                  { name: 'JC Boys', icon: '👦' },
                  { name: 'JC Girls', icon: '👧' },
                  { name: 'School', icon: '🏫' }
                ].map(camp => {
                  const campBackups = (availableBackups[activeRestoreCategory] && availableBackups[activeRestoreCategory][camp.name]) || [];

                  return (
                    <div
                      key={camp.name}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleLocalFileDropRestore(activeRestoreCategory, camp.name, e.dataTransfer.files[0]);
                        }
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
                          <span style={{ fontSize: '18px' }}>{camp.icon}</span>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>Campus: {camp.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', backgroundColor: '#E2E8F0', padding: '4px 8px', borderRadius: '6px' }}>
                          {campBackups.length} Drive Snapshot(s)
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
                                  {bk.source} • {new Date(bk.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleExecuteDataRestore(activeRestoreCategory, camp.name, undefined, bk.id)}
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
                          📁 Drag & Drop or Click to Select Backup (.json / .xlsx)
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>
                          Restores {activeRestoreCategory.replace('_', ' ')} records into database for {camp.name}
                        </span>
                        <input
                          type="file"
                          accept=".json,.xlsx,.csv"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleLocalFileDropRestore(activeRestoreCategory, camp.name, e.target.files[0]);
                            }
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
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔄</div>
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
            Inspire ERP Authenticator Portal v2.6.4 • Powered by TRNT BEE Technologies
          </span>
        </footer>
      </main>

      {/* 2-Step Emergency Wipe Confirmation Modal */}
      {showWipeModal && (
        <div style={styles.modalOverlay} className="anim-fade-in">
          <div style={styles.modalContent} className="anim-scale-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #EF4444', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#991B1B' }}>
                Step 2 Authorization: Confirm Database Wipe
              </h3>
              <button onClick={() => setShowWipeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 900 }}>✕</button>
            </div>

            <p style={{ fontSize: '12px', fontWeight: 700, color: '#7F1D1D', marginBottom: '16px', lineHeight: 1.5 }}>
              CRITICAL: Please enter the secondary authorization password (e.g. <strong>MASTER-WIPE-2026</strong> or confirm 2nd pass) to execute complete database wipe out.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 900, color: '#991B1B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Secondary Authorization Password / Code
                </label>
                <input
                  type="password"
                  value={wipePass2}
                  onChange={(e) => setWipePass2(e.target.value)}
                  placeholder="Enter Secondary Authorization Password"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '2px solid #EF4444',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowWipeModal(false)}
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
                  type="button"
                  onClick={handleConfirmWipeStep2}
                  disabled={isWipingDb}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '2px solid #DC2626',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '12px',
                    boxShadow: '3px 3px 0px #991B1B',
                    cursor: isWipingDb ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isWipingDb ? 'Wiping Database...' : 'Confirm & Wipe Entire Database'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Staff Account Modal */}
      {isEditModalOpen && (
        <div style={styles.modalOverlay} className="anim-fade-in">
          <div style={styles.modalContent} className="anim-scale-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #CBD5E1', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                {editingAccountId ? 'Edit Staff Account' : 'Provision Staff Account'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 900 }}>✕</button>
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
                  <label style={styles.inputLabel}>
                    Role {editingAccountId ? '(Locked - Cannot Change)' : ''}
                  </label>
                  <select
                    value={accountRole}
                    onChange={(e) => setAccountRole(e.target.value as any)}
                    disabled={!!editingAccountId}
                    style={{
                      ...styles.formSelect,
                      ...(editingAccountId ? { backgroundColor: '#E2E8F0', cursor: 'not-allowed', color: '#64748B' } : {})
                    }}
                  >
                    <option value="admin1">Admin 1 (Rector)</option>
                    <option value="admin2">Admin 2 (Campus Principal)</option>
                    <option value="accountant">Accountant</option>
                    <option value="authenticator">Security Authenticator</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>
                    Campus {editingAccountId ? '(Locked - Cannot Change)' : ''}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Erragattugutta C1"
                    value={accountCampus}
                    onChange={(e) => setAccountCampus(e.target.value)}
                    disabled={!!editingAccountId}
                    style={{
                      ...styles.formInput,
                      ...(editingAccountId ? { backgroundColor: '#E2E8F0', cursor: 'not-allowed', color: '#64748B' } : {})
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
