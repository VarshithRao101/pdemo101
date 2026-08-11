/**
 * Single source of truth for the browser's session tokens.
 *
 * Why this exists — two bugs that together logged users out mid-work:
 *
 *  1. Login wrote the access token to BOTH localStorage and sessionStorage,
 *     reads preferred localStorage, but the refresh path wrote the new token
 *     to sessionStorage only. So the moment the first token expired, the
 *     stale localStorage copy kept winning: every later request 401'd and
 *     triggered another refresh.
 *
 *  2. Refresh tokens are single-use and rotate server-side. A dashboard fires
 *     many requests at once, so several would 401 together and each start its
 *     own refresh. The second one presented an already-spent token, the server
 *     correctly read that as a replay, and revoked every session for the
 *     account — dumping the user out to the public site roughly an hour into
 *     their shift.
 *
 * The rule now: exactly one storage location, written and read through here,
 * and at most one refresh in flight at a time.
 */

const ACCESS = 'auth_token';
const REFRESH = 'refresh_token';

// localStorage, deliberately: the session must survive a page refresh and a
// second tab, which is what people actually expect from an ERP. Idle timeout
// is what ends it, not closing a tab.
const store = (): Storage => window.localStorage;

export const getAccessToken = (): string | null => {
  try { return store().getItem(ACCESS); } catch { return null; }
};

export const getRefreshToken = (): string | null => {
  try { return store().getItem(REFRESH); } catch { return null; }
};

export const setTokens = (accessToken?: string | null, refreshToken?: string | null): void => {
  try {
    if (accessToken) store().setItem(ACCESS, accessToken);
    if (refreshToken) store().setItem(REFRESH, refreshToken);
    // Clear the legacy sessionStorage copies so a stale value can never be
    // picked up by any code path that has not been migrated yet.
    window.sessionStorage.removeItem(ACCESS);
    window.sessionStorage.removeItem(REFRESH);
  } catch { /* storage unavailable (private mode) — requests just go unauthenticated */ }
};

export const clearTokens = (): void => {
  try {
    store().removeItem(ACCESS);
    store().removeItem(REFRESH);
    window.sessionStorage.removeItem(ACCESS);
    window.sessionStorage.removeItem(REFRESH);
  } catch { /* ignore */ }
};

/**
 * Coordinated refresh.
 *
 * Concurrent callers share one in-flight request. Without this, rotation
 * guarantees that the second concurrent refresh replays a spent token and the
 * server kills the whole session — the exact failure this was written to stop.
 */
let inFlight: Promise<string | null> | null = null;

export const refreshAccessToken = async (apiBase: string): Promise<string | null> => {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<string | null> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.token) return null;
      setTokens(body.token, body.refreshToken);
      return body.token as string;
    } catch {
      return null;
    } finally {
      // Release on the next tick so callers that queued during this refresh
      // still observe the same promise rather than starting a second one.
      setTimeout(() => { inFlight = null; }, 0);
    }
  })();

  return inFlight;
};

/** How long a session may sit idle before it is ended. */
export const SESSION_IDLE_TIMEOUT_MS = Number(
  (import.meta as any).env?.VITE_SESSION_IDLE_TIMEOUT_MS
) || 3 * 60 * 60 * 1000; // 3 hours

export const IDLE_MESSAGE = 'Your session expired due to inactivity. Please log in again.';
