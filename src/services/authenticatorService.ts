import { apiClient } from './apiClient';

export interface SecurityKeyInfo {
  role: 'accountant' | 'admin2' | 'admin1' | 'admin3';
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
  username: string;
  role: 'admin1' | 'admin2' | 'admin3' | 'accountant';
  backupCode?: string;
  usedBackupCodes?: string[];
  name?: string;
  email?: string;
  mobile?: string;
  department?: string;
}

export interface AuthenticatorStats {
  totalStudents: number;
  totalTeachers: number;
  totalStaff: number;
  activeDevices: number;
}

export const authenticatorService = {
  // Get daily keys
  async getKeys(): Promise<any> {
    const res = await apiClient.get<{ status: string; data: any }>('/authenticator/keys');
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
  async createAccount(body: { username: string; role: string; password: string; name?: string; email?: string; mobile?: string; department?: string }): Promise<AccountInfo> {
    const res = await apiClient.post<{ status: string; data: AccountInfo }>('/authenticator/accounts', body);
    return res.data;
  },

  // Update account
  async updateAccount(id: string, body: { username?: string; name?: string; email?: string; mobile?: string; department?: string }): Promise<AccountInfo> {
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
    const res = await apiClient.get<{ status: string; data: SyncJournalEntry[] }>('/authenticator/sync-journal');
    return res.data;
  },

  // Trigger db reconciliation
  async reconcileDatabase(): Promise<string> {
    const res = await apiClient.post<{ status: string; message: string }>('/authenticator/reconcile', {});
    return res.message;
  },

  // Create system database backup
  async createBackup(): Promise<BackupResponse> {
    const res = await apiClient.post<{ status: string; message: string; data: BackupResponse }>('/authenticator/backup', {});
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
  status: 'pending' | 'synced' | 'failed';
  acknowledgedClients: string[];
  expectedClientsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackupResponse {
  archiveName: string;
  sizeBytes: number;
  checksum: string;
}
