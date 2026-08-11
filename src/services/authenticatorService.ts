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
  // Write-only. Set when submitting a new password; the server never returns
  // one, so reading this from a fetched account will always be undefined.
  password?: string;
  // Whether a credential exists. These are the only credential facts the
  // server discloses — derived from the stored bcrypt hashes, never the values.
  passwordSet?: boolean;
  pinSet?: boolean;
  credentialsUpdatedAt?: string | null;
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

  // Issue fresh 6-digit security PINs. The server returns each new PIN exactly
  // once, in this response — they are stored only as bcrypt hashes and cannot
  // be read back afterwards. Requires the caller's own PIN as confirmation.
  async regenerateKeys(securityPin: string): Promise<any> {
    const res = await apiClient.post<{ status: string; message: string; data: any }>(
      '/authenticator/regenerate-keys',
      { securityPin }
    );
    return res.data;
  },

  // Get backup codes list
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
  // Create system database backup (Google Drive 24h rolling)
  async createBackup(securityPin?: string): Promise<any> {
    const res = await apiClient.post<{ status: string; message: string; data: any }>('/authenticator/backup', { securityPin });
    return res.data;
  },

  // Get available backups list across categories and campuses
  // --- Campus-scoped backup (Backup/<Type>/<Campus>/) -------------------
  //
  // The UI groups by category then campus, which is the same shape the server
  // returns; only the key names differ, so they are mapped here rather than
  // teaching the panel a second vocabulary.

  async getBackupTree(): Promise<{ tree: any; scope: string }> {
    const res = await apiClient.get<{ status: string; data: { tree: any; scope: string } }>('/backup/tree');
    return res.data;
  },

  /**
   * The tree in the shape the restore panel already renders:
   *   { Students_Data: { 'Beemaram C1': [ { id, fileName, createdAt, size } ] } }
   */
  async getBackupsByCategory(): Promise<Record<string, Record<string, any[]>>> {
    const { tree } = await this.getBackupTree();
    const map: Record<string, string> = {
      student: 'Students_Data', teacher: 'Teachers_Data', expenditure: 'Expenditures_Data'
    };
    const out: Record<string, Record<string, any[]>> = {
      Students_Data: {}, Teachers_Data: {}, Expenditures_Data: {}
    };
    for (const [type, byCampus] of Object.entries(tree || {})) {
      const category = map[type];
      if (!category) continue;
      for (const [campus, files] of Object.entries(byCampus as Record<string, any>)) {
        // A leaf carries { error } instead of an array when Drive refused it.
        out[category][campus] = Array.isArray(files)
          ? files.map((f: any) => ({
              id: f.id, fileName: f.name, createdAt: f.createdTime, size: f.size, path: f.path
            }))
          : [];
      }
    }
    return out;
  },

  categoryToBackupType(category: string): 'student' | 'teacher' | 'expenditure' {
    if (category === 'Teachers_Data') return 'teacher';
    if (category === 'Expenditures_Data') return 'expenditure';
    return 'student';
  },

  async runCampusBackup(backupType: string, campus: string): Promise<any> {
    const res = await apiClient.post<{ status: string; data: any }>('/backup/run', { backupType, campus });
    return res.data;
  },

  /** Validates and reports what a restore would change. Writes nothing. */
  async previewRestore(fileId: string, backupType: string, campus: string): Promise<any> {
    const res = await apiClient.post<{ status: string; data: any }>('/backup/restore/preview', { fileId, backupType, campus });
    return res.data;
  },

  /** Applies a restore. Requires the account password on top of the PIN. */
  async applyRestore(fileId: string, backupType: string, campus: string, password: string): Promise<any> {
    const res = await apiClient.post<{ status: string; message: string; data: any }>('/backup/restore', {
      fileId, backupType, campus, password
    });
    return res.data;
  },

  // NOTE: `restoreBackup` (whole-database restore) and `getAvailableBackups`
  // (flat backup listing) lived here. Both are gone along with the server route
  // behind the first one — it restored every campus at once on a password
  // alone, with no security PIN, no envelope validation and no campus check.
  // Restores now go through previewRestore/applyRestore above, one campus and
  // one data type at a time.

  // Wipe entire database with Security Passcode
  async wipeEntireDatabase(securityPin: string): Promise<string> {
    const res = await apiClient.post<{ status: string; message: string }>('/authenticator/wipe-database', { password: securityPin, securityPin });
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




