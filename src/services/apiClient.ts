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

// The security PIN the user last confirmed with, held in memory for the life
// of the page only. Never written to localStorage — it is a live credential.
//
// Call sites used to pass a hardcoded literal ('784920') here, which the server
// accepted because its confirmation middleware was a no-op. The server now
// verifies this value with bcrypt against the signed-in account's stored PIN,
// so only a real PIN works.
// Ceiling on how long any single request may hang before the UI gives up.
// Generous enough for a cold Hostinger start plus an Atlas connect, short
// enough that a stalled request cannot leave a spinner running indefinitely.
const REQUEST_TIMEOUT_MS = 30000;

let activeSecurityKey = '';

export const setGlobalSecurityKey = (key: string) => {
  activeSecurityKey = key;
};

export const clearGlobalSecurityKey = () => {
  activeSecurityKey = '';
};

/**
 * Asks the user for their security PIN.
 *
 * Overridable so the app can supply a proper modal; falls back to a prompt so
 * the flow always works rather than silently failing a destructive action.
 */
let securityPinPrompt: (reason: string) => Promise<string | null> = async (reason) =>
  window.prompt(reason);

export const setSecurityPinPrompt = (fn: (reason: string) => Promise<string | null>) => {
  securityPinPrompt = fn;
};

// NOTE: a client-side PIN generator lived here. It derived every account's
// "security PIN" and per-section OTPs from a hardcoded string baked into the
// public JS bundle, cached them in localStorage, and the Authenticator portal
// displayed them as if they were the real credentials. They were never the
// real credentials — the server checks bcrypt hashes. Anything resembling a
// credential must come from the server, so this has been removed entirely.

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

  async request<T = any>(endpoint: string, options: RequestInit & { __pinRetried?: boolean } = {}): Promise<T> {
    let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Strip duplicate /api prefix if caller passed /api/... to avoid /api/api/... 404 errors
    if (cleanPath.startsWith('/api/')) {
      cleanPath = cleanPath.substring(4);
    }

    const baseUrl = getApiBaseUrl();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}${cleanPath}`;

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
      headers['x-security-pin'] = activeSecurityKey;
    }

    // Abort a request that never resolves.
    //
    // fetch() has no default timeout: if the server accepts the connection and
    // then stalls, the promise simply never settles and whatever spinner the
    // caller showed spins forever with no way back. This bounds every request
    // so a hung backend surfaces as a real, dismissible error instead.
    const controller = new AbortController();
    const timeoutMs = (options as any).timeoutMs ?? REQUEST_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // The server is asking for secondary confirmation on a destructive or
        // financial action. Collect the real PIN and retry once. Handling this
        // centrally means every such route is covered without each call site
        // having to know about it.
        if (response.status === 401 && data?.requiresSecurityPin && !options.__pinRetried) {
          const pin = await securityPinPrompt(
            data.message === 'Incorrect security PIN.'
              ? 'Incorrect PIN. Enter your security PIN to confirm this action:'
              : 'Enter your security PIN to confirm this action:'
          );
          if (pin && pin.trim()) {
            setGlobalSecurityKey(pin.trim());
            return this.request<T>(endpoint, { ...options, __pinRetried: true } as RequestInit);
          }
          const cancelled: ApiError = new Error('Action cancelled: security PIN not provided.');
          cancelled.status = 401;
          throw cancelled;
        }

        // Intercept 401 Access Token Expiration & Silently Refresh Token
        if (response.status === 401 && !cleanPath.startsWith('/auth/')) {
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
                // Refresh tokens are now single-use and rotate. The server
                // revokes the presented token as it validates it, so the
                // replacement must be stored or the next refresh will fail —
                // and reusing a spent token deliberately kills the session.
                if (refreshData.refreshToken) {
                  sessionStorage.setItem('refresh_token', refreshData.refreshToken);
                }
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
      // Tell the two failure modes apart. "The server took too long" and "the
      // server is unreachable" need different things from the user, and a
      // single generic message leaves them with nothing to act on.
      if (err?.name === 'AbortError') {
        const timeoutErr: ApiError = new Error(
          `The server did not respond within ${Math.round(timeoutMs / 1000)} seconds. Your change may not have been saved — check before retrying.`
        );
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      const networkErr: ApiError = new Error(
        err.message || 'Cannot reach the server. Check your internet connection and try again.'
      );
      networkErr.status = 503;
      throw networkErr;
    } finally {
      clearTimeout(timer);
    }
  },

  async verifyCredentials(identifier: string, password: string, loginContext = 'universal'): Promise<{ status: string; message?: string; role?: string; campus?: string }> {
    return this.request<{ status: string; message?: string; role?: string; campus?: string }>('/auth/verify-credentials', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, loginContext })
    });
  }
};


