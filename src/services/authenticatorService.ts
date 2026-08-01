import { apiClient } from './apiClient';

export interface SecurityKeyInfo {
  role: 'accountant' | 'admin2' | 'admin1';
  key: string;
  expiresAt: string;
}

export interface BackupCodeInfo {
  userId: string;
  username: string;
  name: string;
  role: string;
  backupCode: string;
  usedBackupCodes: string[];
}

export interface AccountInfo {
  _id: string;
  id?: string;
  username: string;
  role: 'admin1' | 'admin2' | 'accountant' | 'authenticator';
  backupCode?: string;
  usedBackupCodes?: string[];
  name?: string;
  email?: string;
  mobile?: string;
  department?: string;
  address?: string;
  campus?: string;
  password?: string;
}

export interface ActiveSessionInfo {
  username: string;
  role: string;
  campus: string;
  name: string;
  sessionGuid: string;
  loggedInAt: string;
  lastSeenAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthenticatorStats {
  totalStudents: number;
  totalTeachers: number;
  totalStaff: number;
  activeDevices: number;
  activeSessions?: ActiveSessionInfo[];
  activeSessionCount?: number;
  systemsActive?: number;
  systemsInactive?: number;
  portalSlotTotal?: number;
  lastBackupAt?: string | null;
}

export const authenticatorService = {
  // Get daily keys
  async getKeys(): Promise<any> {
    const res = await apiClient.get<{ status: string; data: any }>('/authenticator/keys');
    return res.data;
  },

  // Regenerate daily 6-digit security PINs
  async regenerateKeys(): Promise<any> {
    const res = await apiClient.post<{ status: string; message: string; data: any }>('/authenticator/regenerate-keys', {});
    return res.data;
  },

  // Get backup codes list
  async getBackupCodes(): Promise<BackupCodeInfo[]> {
    const res = await apiClient.get<{ status: string; data: BackupCodeInfo[] }>('/authenticator/backup-codes');
    return res.data;
  },

  // Reset password with backup code
  async resetPassword(body: { username: string; password: string; backupCode: string }): Promise<{ nextBackupCode: string }> {
    const res = await apiClient.post<{ status: string; nextBackupCode: string }>('/authenticator/reset-password', body);
    return res;
  },

  // List accounts
  async getAccounts(): Promise<AccountInfo[]> {
    const res = await apiClient.get<{ status: string; data: AccountInfo[] }>('/authenticator/accounts');
    return res.data;
  },

  // Create account
  async createAccount(body: Partial<AccountInfo>): Promise<AccountInfo> {
    const res = await apiClient.post<{ status: string; data: AccountInfo }>('/authenticator/accounts', body);
    return res.data;
  },

  // Update account
  async updateAccount(id: string, body: Partial<AccountInfo>): Promise<AccountInfo> {
    const res = await apiClient.put<{ status: string; data: AccountInfo }>(`/authenticator/accounts/${id}`, body);
    return res.data;
  },

  // Delete account
  async deleteAccount(id: string): Promise<void> {
    await apiClient.request(`/authenticator/accounts/${id}`, { method: 'DELETE' });
  },

  // Get dashboard metrics
  async getStats(): Promise<AuthenticatorStats> {
    const res = await apiClient.get<{ status: string; data: AuthenticatorStats }>('/authenticator/stats');
    return res.data;
  },

  // Get transaction sync log
  async getSyncJournal(): Promise<SyncJournalEntry[]> {
    const res = await apiClient.get<any>('/authenticator/sync-journal');
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.logs)) return res.logs;
    return [];
  },

  // Trigger db reconciliation
  async reconcileDatabase(): Promise<string> {
    const res = await apiClient.post<{ status: string; message: string }>('/authenticator/reconcile', {});
    return res.message;
  },

  // Create system database backup (Google Drive 24h rolling)
  async createBackup(securityPin?: string): Promise<any> {
    const res = await apiClient.post<{ status: string; message: string; data: any }>('/authenticator/backup', { securityPin });
    return res.data;
  },

  // Get available backups list across categories and campuses
  async getAvailableBackups(): Promise<any> {
    const res = await apiClient.get<{ status: string; data: any }>('/authenticator/available-backups');
    return res.data;
  },

  // Restore data payload for specific category and campus
  async restoreData(payload: { category: string; campus: string; backupData?: any; backupFileContent?: string }): Promise<any> {
    const res = await apiClient.post<{ status: string; data: any }>('/authenticator/restore-data', payload);
    return res.data;
  },

  // Wipe entire database with Security Passcode (9-0-5-9-0-6-8-3-8-4)
  async wipeEntireDatabase(securityPin: string): Promise<string> {
    const res = await apiClient.post<{ status: string; message: string }>('/authenticator/wipe-database', { securityPin });
    return res.message;
  },

  // Purge all student and faculty data
  async purgeStudentFacultyData(confirmationPass: string): Promise<{ students: number; teachers: number; payments: number }> {
    const res = await apiClient.request<{ status: string; message: string; data: { students: number; teachers: number; payments: number } }>('/authenticator/purge-student-faculty-data', {
      method: 'DELETE',
      body: JSON.stringify({ confirmationPass })
    });
    return res.data;
  }
};

export interface SyncJournalEntry {
  _id: string;
  transactionId: string;
  sourceNode: string;
  targetNode: string;
  action: string;
  payload: any;
  status: 'pending' | 'synced' | 'failed' | 'success' | 'rejected' | string;
  acknowledgedClients: string[];
  expectedClientsCount: number;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
  branch?: string;
  errorDetails?: string;
  performedBy?: string;
  details?: string;
}

export interface BackupResponse {
  archiveName: string;
  sizeBytes: number;
  checksum: string;
  lastBackupAt?: string | null;
}




