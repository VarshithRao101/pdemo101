/**
 * useDataFreshness - Lightweight background polling hook
 *
 * Strategy:
 * 1. Every 25 seconds while the tab is VISIBLE, poll /api/system/last-changed
 * 2. Compare server timestamp against lastSeenAt ref - only call onRefetch() if changed
 * 3. Pause all polling when the tab is hidden (visibilityState === 'hidden')
 * 4. Immediately refetch on visibilitychange (tab becomes visible again) and window.focus
 * 5. Expose triggerRefetch() for post-mutation use (caller calls this after create/update/delete)
 *
 * Campus isolation: The endpoint enforces it server-side; we pass the branch as a query param.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '../services/session';
import { getApiBaseUrl } from '../services/apiClient';

const POLL_INTERVAL_MS = 25000; // 25 seconds

export function useDataFreshness(branch: string | undefined, onRefetch: () => Promise<void> | void) {
  // Stores the last timestamp we saw from the server
  const lastSeenTimestamp = useRef<string | null>(null);
  // Avoids concurrent overlapping polls
  const isFetching = useRef(false);
  // Keep stable refs to the callback and branch so intervals do not need to re-register
  const onRefetchRef = useRef(onRefetch);
  const branchRef = useRef(branch);

  useEffect(() => { onRefetchRef.current = onRefetch; }, [onRefetch]);
  useEffect(() => { branchRef.current = branch; }, [branch]);

  const checkTimestamp = useCallback(async (): Promise<boolean> => {
    const currentBranch = branchRef.current;
    if (!currentBranch || currentBranch.toLowerCase() === 'all') return false;

    const token = getAccessToken();
    if (!token) return false;

    try {
      const base = getApiBaseUrl();
      const url = `${base}/system/last-changed?branch=${encodeURIComponent(currentBranch)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      if (!res.ok) return false;

      const data = await res.json().catch(() => null);
      if (!data || data.status !== 'success' || !data.lastChanged) return false;

      const serverTs = data.lastChanged as string;

      if (lastSeenTimestamp.current === null) {
        // First poll - record baseline, do not refetch (we just loaded fresh data)
        lastSeenTimestamp.current = serverTs;
        return false;
      }

      if (serverTs !== lastSeenTimestamp.current) {
        lastSeenTimestamp.current = serverTs;
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * triggerRefetch: called by the component after a successful mutation.
   * Fires the onRefetch callback and then re-baselines the timestamp so the
   * next poll cycle does not double-trigger.
   */
  const triggerRefetch = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      await onRefetchRef.current();
      const currentBranch = branchRef.current;
      const token = getAccessToken();
      if (currentBranch && token) {
        try {
          const base = getApiBaseUrl();
          const url = `${base}/system/last-changed?branch=${encodeURIComponent(currentBranch)}`;
          const res = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            credentials: 'include'
          });
          const data = await res.json().catch(() => null);
          if (data?.lastChanged) {
            lastSeenTimestamp.current = data.lastChanged;
          }
        } catch { /* silent */ }
      }
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const runPollCycle = async () => {
      if (isFetching.current) return;
      if (document.visibilityState !== 'visible') return;
      isFetching.current = true;
      try {
        const hasChanged = await checkTimestamp();
        if (hasChanged) {
          await onRefetchRef.current();
        }
      } finally {
        isFetching.current = false;
      }
    };

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(runPollCycle, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        startPolling();
        await runPollCycle();
      } else {
        stopPolling();
      }
    };

    const handleFocus = async () => {
      if (document.visibilityState === 'visible') {
        await runPollCycle();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkTimestamp]);

  return { triggerRefetch };
}
