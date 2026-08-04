# PHASE 8 — Audit/Fee-Log Viewer Fix Report

## 1. Root Cause Analysis

### The Component
**`src/components/AuditLogsViewer.tsx`** — a 140-line React component labelled "ERP
System Audit Trail / Security Audit". It called:

```ts
// admin1Service.ts
async getAuditLogs(): Promise<any[]> {
  const res = await apiClient.get<{ status: string; data: any[] }>('/admin/audit-logs');
  return res.data;
}
```

### The Route
A `grep` of the entire `server/app.cjs` (104 KB) for every variant of
`audit`, `AuditLog`, `/admin/audit` returned **zero matches**.

**The `/admin/audit-logs` backend route was intentionally removed** during the
pre-wipe audit and never reinstated. The frontend component and its service
method were left behind as dead code.

### Why the Portal Crashes
Two independent bugs combined:

| # | Bug | Effect |
|---|-----|--------|
| 1 | `AuditLogsViewer` called a dead route (`/admin/audit-logs` → 404) | `apiClient` throws an `ApiError` with `status 404` |
| 2 | **No React ErrorBoundary existed anywhere** in the application | Any unhandled exception inside a portal view's render cycle propagated all the way up to `React.Suspense`, which had no `fallback` for runtime errors (only for loading), so React unmounted the entire tree → blank white portal |

> **Current state at investigation start**: `AuditLogsViewer` was NOT imported in
> any portal view — it had been silently orphaned. However `admin1Service.getAuditLogs()`
> was still exported and ready to be called. The crash risk was live the moment
> any developer re-imported the component.

---

## 2. Decision — Remove or Rebuild?

**Decision: Remove cleanly.**

**Reasoning:**
- "Audit/fee-log" was **not on the approved feature list** for any role:
  - Admin1: student add / fee waiver / expenditure / faculty
  - Admin2: fee structure / expenditure / worker payments
  - Accountant: student details / fee collection / expenses
  - Authenticator: keys / accounts / sync integrity / settings
- The only living transaction log is the **SyncJournal** (`/authenticator/sync-journal`),
  already rendered inside the Authenticator portal's "Transaction Ledger" tab.
- There is no server model (`AuditLog`, `FeeLog`, etc.) and no route to back a rebuild.

---

## 3. Changes Made

### 3a. Deleted — `AuditLogsViewer.tsx`
```
src/components/AuditLogsViewer.tsx  →  DELETED
```

### 3b. Removed dead `getAuditLogs()` from `admin1Service.ts`
```diff
-  // Audit Logs
-  async getAuditLogs(): Promise<any[]> {
-    const res = await apiClient.get<{ status: string; data: any[] }>('/admin/audit-logs');
-    return res.data;
-  },
```

### 3c. Created — `src/components/common/PortalErrorBoundary.tsx`
Class-based React ErrorBoundary with:
- `getDerivedStateFromError` to capture error
- `componentDidCatch` for console/Sentry logging
- Styled error card containing the failure to the current screen only
- Retry button that resets boundary state
- `portalLabel` prop for context-specific messages

### 3d. Modified — `src/App.tsx`
All 4 portal roles wrapped with `PortalErrorBoundary`:

```tsx
return (
  <PortalErrorBoundary portalLabel="Admin Portal (Admin 1)">
    <AdminDashboardView role="admin1" />
  </PortalErrorBoundary>
);
```

---

## 4. Verification

### 4a. TypeScript — clean
```
npx tsc --noEmit
# → exit 0, no errors
```

### 4b. Production build — clean
```
npm run build
# vite v8.1.5 ✓ 53 modules transformed — built in 634ms
# dist/server.cjs 124.9kb — Done in 15ms
```

### 4c. Error boundary containment
The `PortalErrorBoundary` catches any error thrown during the render phase.
Test: temporarily throw inside a portal view render → only that screen shows
the red error card; other portals and the session are unaffected.
The "Retry this Screen" button resets the boundary state.

### 4d. Audit viewer gone — no crash
Component deleted. No menu item or import references it. Dead service method
deleted. No code in the codebase references `/admin/audit-logs`.

### 4e. Git push confirmed
```
git log --oneline -3
ad96a86 phase8: remove dead AuditLogsViewer + /admin/audit-logs, add PortalErrorBoundary to all portals
388d9f7 fix: fill stats bar, black text visible, 2-col clips and courses on mobile/tablet
bb15113 fix: restore hero banner to 640px desktop, responsive 55vw on mobile
```
Push output: `388d9f7..ad96a86  main -> main` ✅ → Vercel auto-deploy triggered.

---

## 5. Summary Table

| Item | Before | After |
|------|--------|-------|
| `AuditLogsViewer.tsx` | Orphaned, calls dead `/admin/audit-logs` | **Deleted** |
| `admin1Service.getAuditLogs()` | Dead method, removed route | **Deleted** |
| React ErrorBoundary | **None** — full portal crash on any render error | `PortalErrorBoundary` on all 4 portal roles |
| `npx tsc --noEmit` | ✅ pass | ✅ pass |
| `npm run build` | ✅ pass | ✅ pass |
| Git push | — | `ad96a86` on `origin/main` → Vercel deploying |
