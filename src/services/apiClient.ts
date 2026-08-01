// apiClient.ts
// Real Production HTTP Client connecting to Express/MongoDB backend API
// Manages real JWT auth tokens, refreshToken auto-renewal, headers, rate limit handling, and campus isolation errors.

export const getApiBaseUrl = (): string => {
  if (import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocalhost && window.location.port && window.location.port !== '3000') {
      return 'http://127.0.0.1:3000/api';
    }
  }
  return '/api';
};

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

let activeSecurityKey = '';

export const setGlobalSecurityKey = (key: string) => {
  activeSecurityKey = key;
};

// Helper to get local date seed YYYY-MM-DD in IST (UTC+5:30)
export const getLocalDateSeed = (): string => {
  const d = new Date();
  // Adjust to IST timezone (UTC+5:30 => 330 minutes offset)
  const istOffsetMs = (330 + d.getTimezoneOffset()) * 60000;
  const istDate = new Date(d.getTime() + istOffsetMs);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Deterministic 6-digit number generator seeded by identifier + dateSeed (24-hour static key)
export const generate24HourDeterministicCode = (identifier: string, dateSeed = getLocalDateSeed()): string => {
  let hash = 0;
  const str = `${identifier}:${dateSeed}:inspire_2026_static_secret_key`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const numericVal = Math.abs(hash);
  return (100000 + (numericVal % 900000)).toString();
};

// Generate security keys for Authenticator display & key verification
export const getOrGenerateSecurityKeys = (forceRegenerate = false) => {
  const dateSeed = getLocalDateSeed();
  const genOtp = (slot: string) => generate24HourDeterministicCode(`otp_${slot}`, dateSeed);

  if (!forceRegenerate) {
    try {
      const stored = localStorage.getItem('jc_security_keys');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.dailyPins && parsed.dateSeed === dateSeed) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
  }

  const genPin = (uname: string) => {
    if (forceRegenerate) {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
    return generate24HourDeterministicCode(`pin_${uname}`, dateSeed);
  };

  const d = new Date();
  d.setHours(0, 0, 0, 0);

  const pins = {
    admin1: genPin('admin1'),
    authenticator: genPin('authenticator'),
    admin2_erragattugutta_c1: genPin('admin2_erragattugutta_c1'),
    admin2_erragattugutta_c2: genPin('admin2_erragattugutta_c2'),
    admin2_beemaram_c1: genPin('admin2_beemaram_c1'),
    admin2_beemaram_c2: genPin('admin2_beemaram_c2'),
    accountant_erragattugutta_c1_1: genPin('accountant_erragattugutta_c1_1'),
    accountant_erragattugutta_c2_1: genPin('accountant_erragattugutta_c2_1'),
    accountant_beemaram_c1_1: genPin('accountant_beemaram_c1_1'),
    accountant_beemaram_c2_1: genPin('accountant_beemaram_c2_1'),
  };

  const keys = {
    generatedAt: d.getTime(),
    dateSeed,
    dailyPins: {
      ...pins,
      admin2_erragattuguttac1: pins.admin2_erragattugutta_c1,
      admin2_erragattuguttac2: pins.admin2_erragattugutta_c2,
      admin2_beemaramc1: pins.admin2_beemaram_c1,
      admin2_beemaramc2: pins.admin2_beemaram_c2,
      accountant_erragattugutta_c1_2: pins.accountant_erragattugutta_c1_1,
      accountant_erragattuguttac1_1: pins.accountant_erragattugutta_c1_1,
      accountant_erragattuguttac1_2: pins.accountant_erragattugutta_c1_1,
      accountant_erragattugutta_c2_2: pins.accountant_erragattugutta_c2_1,
      accountant_erragattuguttac2_1: pins.accountant_erragattugutta_c2_1,
      accountant_erragattuguttac2_2: pins.accountant_erragattugutta_c2_1,
      accountant_beemaram_c1_2: pins.accountant_beemaram_c1_1,
      accountant_beemaramc1_1: pins.accountant_beemaram_c1_1,
      accountant_beemaramc1_2: pins.accountant_beemaram_c1_1,
      accountant_beemaram_c2_2: pins.accountant_beemaram_c2_1,
      accountant_beemaramc2_1: pins.accountant_beemaram_c2_1,
      accountant_beemaramc2_2: pins.accountant_beemaram_c2_1,
    },
    sectionOtps: {
      admin1: {
        studentRegistry: genOtp('admin1_studentRegistry'),
        facultyManagement: genOtp('admin1_management'),
        management: genOtp('admin1_management'),
        feeStructure: genOtp('admin1_feeStructure'),
        feeOverride: genOtp('admin1_feeOverride'),
        expenditure: genOtp('admin1_expenditure')
      },
      admin2: {
        feeStructure: genOtp('admin2_feeStructure'),
        feeOverride: genOtp('admin2_feeOverride'),
        expenditure: genOtp('admin2_expenditure'),
        workerPayments: genOtp('admin2_workerPayments')
      },
      accountant: {
        studentDetails: genOtp('accountant_studentDetails'),
        fees: genOtp('accountant_fees'),
        hostel: genOtp('accountant_hostel')
      }
    }
  };

  localStorage.setItem('jc_security_keys', JSON.stringify(keys));
  return keys;
};

export const logTransactionInJournal = (action: string, branch: string, status: 'success' | 'failed', errorDetails = '') => {
  const list = JSON.parse(localStorage.getItem('jc_sync_journal') || '[]');
  const newLog = {
    _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    transactionId: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    sourceNode: 'Inspire ERP Central Node',
    action,
    branch,
    status,
    errorDetails
  };
  list.unshift(newLog);
  localStorage.setItem('jc_sync_journal', JSON.stringify(list.slice(0, 100)));
};

// --- REAL HTTP REST API CLIENT ---
export const apiClient = {
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  async patch<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  async put<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${cleanPath}`;

    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (activeSecurityKey) {
      headers['x-security-key'] = activeSecurityKey;
      headers['x-security-otp'] = activeSecurityKey;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Intercept 401 Access Token Expiration & Silently Refresh Token
        if (response.status === 401 && !cleanPath.includes('/auth/login') && !cleanPath.includes('/auth/refresh')) {
          const refreshToken = sessionStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
                credentials: 'include'
              });
              const refreshData = await refreshRes.json().catch(() => null);
              if (refreshRes.ok && refreshData?.token) {
                sessionStorage.setItem('auth_token', refreshData.token);
                headers['Authorization'] = `Bearer ${refreshData.token}`;
                // Retry original request with fresh access token
                const retryRes = await fetch(url, { ...options, headers, credentials: 'include' });
                const retryData = await retryRes.json().catch(() => null);
                if (retryRes.ok && retryData) return retryData as T;
              }
            } catch {
              // Refresh failed
            }
          }
          (window as any).logoutUser?.();
        }

        const errorMsg = data?.message || data?.error || `HTTP ${response.status}: Request failed`;
        const err: ApiError = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      // If login returned refreshToken, store it
      if (data?.refreshToken) {
        sessionStorage.setItem('refresh_token', data.refreshToken);
      }

      return data as T;
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
      const networkErr: ApiError = new Error(err.message || 'Network error: Backend server unreachable');
      networkErr.status = 503;
      throw networkErr;
    }
  },

  async verifyCredentials(identifier: string, password: string, loginContext = 'universal'): Promise<{ status: string; message?: string; role?: string; campus?: string }> {
    return this.request<{ status: string; message?: string; role?: string; campus?: string }>('/auth/verify-credentials', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, loginContext })
    });
  }
};


