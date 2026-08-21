// apiClient.ts
// Real Production HTTP Client connecting to Express/MongoDB backend API
// Manages real JWT auth tokens, refreshToken auto-renewal, headers, rate limit handling, and campus isolation errors.

/**
 * Where the API lives.
 *
 * Same origin by default. A previous version hardcoded
 * `http://127.0.0.1:3000/api` whenever the page was served from any localhost
 * port other than 3000 — so running the built app on any other port silently
 * pointed every request at a server that wasn't there, and the Content
 * Security Policy (correctly) blocked the cross-origin call on top of that.
 *
 * If you genuinely need a split origin — a separate dev server on another
 * port — set VITE_API_BASE_URL explicitly and add that origin to both
 * ALLOWED_ORIGINS and the CSP's connect-src. Guessing a port is not a
 * substitute for configuring one.
 */
import { getAccessToken, setTokens, refreshAccessToken } from './session';

export const getApiBaseUrl = (): string => {
  if (import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '/api';
};

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

/**
 * What a bounded list route returns alongside its rows.
 *
 * List routes used to hand back an entire collection, and several screens
 * reduce over what they are given to show a money total. Now that those
 * responses are capped, a total derived from the array would be wrong by
 * whatever fell off the end — and would look completely plausible, which is
 * the dangerous part. So the server computes the totals over the whole filter
 * and sends them here, and the screens read them from here rather than
 * summing a page.
 */
export interface ListMeta {
  page: number;
  limit: number;
  /** Rows matching the WHOLE filter, not the length of this page. */
  total: number;
  /** Present only on routes that feed a money total. */
  totalAmount?: number;
  paidAmount?: number;
  /** Per-campus money totals, for a screen that narrows by branch itself. */
  byBranch?: Record<string, number>;
  hasMore: boolean;
}

export interface ListPage<T> {
  items: T[];
  meta: ListMeta;
}

/**
 * Normalise a list response, tolerating a route that sends no `meta` at all.
 *
 * The fallbacks matter: an older route, or one still to be converted, returns
 * a bare array. Treating that as a complete single page keeps every caller
 * correct instead of making them each check.
 */
export const asListPage = <T>(res: any): ListPage<T> => {
  const items: T[] = Array.isArray(res?.data) ? res.data : [];
  const raw = (res && typeof res.meta === 'object' && res.meta) || {};
  const num = (v: any): number | undefined =>
    Number.isFinite(Number(v)) ? Number(v) : undefined;

  return {
    items,
    meta: {
      // Spread FIRST so a route-specific field survives — `withoutContact` on
      // the outstanding-fees list, `windowDays` on the recycle bin. Listing
      // only the known keys here silently dropped them, and the screens read
      // them as zero, which looks like data rather than like a missing field.
      ...raw,
      page: num(raw.page) ?? 1,
      limit: num(raw.limit) ?? items.length,
      total: num(raw.total) ?? items.length,
      totalAmount: num(raw.totalAmount),
      paidAmount: num(raw.paidAmount),
      byBranch: (raw.byBranch && typeof raw.byBranch === 'object') ? raw.byBranch : undefined,
      hasMore: Boolean(raw.hasMore)
    }
  };
};

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

// REMOVED: `securityPinPrompt` / `setSecurityPinPrompt`, the overridable
// PIN-asking hook used by the mid-request interceptor below. Its default was
// `window.prompt`, so an unconfigured screen interrupted a financial action
// with a raw browser dialog. Nothing asks for a PIN mid-request any more —
// the one screen that needs one collects it up front.

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

  async request<T = any>(endpoint: string, options: RequestInit & { __pinRetried?: boolean; __refreshRetried?: boolean } = {}): Promise<T> {
    let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Strip duplicate /api prefix if caller passed /api/... to avoid /api/api/... 404 errors
    if (cleanPath.startsWith('/api/')) {
      cleanPath = cleanPath.substring(4);
    }

    const baseUrl = getApiBaseUrl();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}${cleanPath}`;

    const token = getAccessToken();
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
        // REMOVED: an interceptor that caught `requiresSecurityPin`, popped a
        // PIN prompt mid-request and replayed the call.
        //
        // It was the main source of the "clumsy" feel — an ordinary action
        // would stop halfway and demand a six-digit PIN, and cancelling threw
        // a confusing "Action cancelled" from deep inside the request layer.
        // It also swallowed the server's real message: a screen that collected
        // the PIN itself and sent it explicitly got its 403 hijacked and
        // re-prompted instead of being told the PIN was wrong.
        //
        // Exactly one route now requires a PIN — saving clerk permissions —
        // and that screen collects it in its own dialog and passes it as a
        // header. Every other action confirms with a plain yes/no. So a 403
        // now falls through to the normal error path below and reaches the
        // caller with the server's own wording.

        // An expired access token: refresh once, through the shared
        // coordinator so simultaneous 401s cannot each rotate the refresh
        // token and trip the server's replay protection.
        if (response.status === 401 && !cleanPath.startsWith('/auth/') && !options.__refreshRetried) {
          const fresh = await refreshAccessToken(cleanBaseUrl);
          if (fresh) {
            return this.request<T>(endpoint, { ...options, __refreshRetried: true } as RequestInit);
          }

          // Refresh genuinely failed — the session is over. End it deliberately
          // rather than leaving the user clicking against a dead token.
          //
          // This used to fire for ANY 401 from ANY endpoint and send the user
          // to the public marketing site with no explanation, which is what
          // made the app feel like it "randomly redirects". It now only runs
          // when refresh has actually failed, and it hands over a reason.
          (window as any).endSession?.('Your session has ended. Please log in again.');
        }

        const errorMsg = data?.message || data?.error || `HTTP ${response.status}: Request failed`;
        const err: ApiError = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      // Persist whatever the server just issued through the single store, so
      // access and refresh tokens can never drift between two locations.
      if (data?.token || data?.refreshToken) {
        setTokens(data.token, data.refreshToken);
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

  /**
   * `campus` replaces `identifier` for a clerk.
   *
   * A clerk picks their campus and types their own password; the server works
   * out which of that campus's clerks they are. Passing both would be
   * contradictory, so a campus sign-in sends an empty identifier and the
   * server keys its lockout on the campus instead.
   */
  async verifyCredentials(
    identifier: string,
    password: string,
    loginContext = 'universal',
    campus?: string
  ): Promise<{ status: string; message?: string; role?: string; campus?: string }> {
    return this.request<{ status: string; message?: string; role?: string; campus?: string }>('/auth/verify-credentials', {
      method: 'POST',
      body: JSON.stringify(campus ? { password, loginContext, campus } : { identifier, password, loginContext })
    });
  }
};


