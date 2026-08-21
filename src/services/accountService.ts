/**
 * accountService.ts
 *
 * The signed-in account acting on ITSELF, plus the two reads that are not
 * specific to one portal — the CSV exports and the outstanding-fees list.
 *
 * Everything here is deliberately free of a target parameter. The routes
 * behind these act on `req.user.id` or on the caller's own campus scope, so
 * there is nothing a caller could name to reach somebody else's account. That
 * is why they live apart from admin1Service, which is the administrative
 * surface and behaves differently on purpose.
 */
import { apiClient, asListPage, getApiBaseUrl, type ListPage } from './apiClient';
import { getAccessToken } from './session';

export interface SessionInfo {
  username: string;
  name: string;
  role: string;
  campus: string;
  sessionStartedAt: string | null;
  sessionIp: string;
  previousSessionAt: string | null;
  previousSessionIp: string;
  lastSeenAt: string | null;
  idleTimeoutMinutes: number;
  expiresInSeconds: number | null;
}

export interface OutstandingStudent {
  name: string;
  admissionNumber: string;
  campus: string;
  course: string;
  section: string;
  studentYear: string;
  contact: string;
  totalPayable: number;
  paid: number;
  balance: number;
}

/** Where this session is running, and when the previous one was. */
export const getSessionInfo = async (): Promise<SessionInfo> => {
  const res = await apiClient.get<{ status: string; data: SessionInfo }>('/account/session');
  return res.data;
};

/**
 * Change your own password and/or PIN.
 *
 * Succeeding ENDS the session — every session, including this one — so the
 * caller has to sign in again with what they just chose. The caller is
 * responsible for sending them back to the sign-in screen; this does not do it
 * silently, because a screen that vanishes without explanation reads as a
 * crash rather than as the change having worked.
 */
export const changeOwnPassword = async (payload: {
  currentPassword: string;
  newPassword?: string;
  newPin?: string;
}): Promise<{ message: string }> => {
  return apiClient.post<{ message: string }>('/account/password', payload);
};

/** Students who still owe money, largest balance first. */
export const getOutstandingFees = async (branch?: string): Promise<ListPage<OutstandingStudent>> => {
  const query = branch && branch !== 'All' ? `?branch=${encodeURIComponent(branch)}` : '';
  const res = await apiClient.get<any>(`/fees/outstanding${query}`);
  return asListPage<OutstandingStudent>(res);
};

/**
 * Download one of the CSV exports.
 *
 * Not apiClient.get: that parses every response as JSON, and this one is a
 * file. The request is made with fetch directly so the body can be taken as a
 * blob, and the bearer token is attached by hand because that is the only
 * thing apiClient was doing for us here.
 *
 * A plain <a href> would not work — the route requires an Authorization
 * header, and a link cannot carry one. Putting the token in the query string
 * instead would write a live credential into the server log of every proxy in
 * between, so the blob round-trip is the correct shape rather than a
 * workaround.
 */
export const downloadCsv = async (
  kind: 'students' | 'payments' | 'expenditures',
  params: Record<string, string> = {}
): Promise<void> => {
  const search = new URLSearchParams(params).toString();
  const base = getApiBaseUrl().replace(/\/$/, '');
  const token = getAccessToken();

  const res = await fetch(`${base}/export/${kind}.csv${search ? `?${search}` : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include'
  });

  if (!res.ok) {
    // The error body is JSON even though the success body is not, so the
    // server's own wording reaches the user instead of a bare status code.
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.message || `Export failed (HTTP ${res.status}).`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Released on the next tick: revoking synchronously can cancel the download
  // in some browsers before it has actually started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
