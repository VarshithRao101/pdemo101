# ERP System — Full Audit Report

## 1. Executive Summary

- **CRITICAL [Security - Credentials Leak]**: Production MongoDB URI (`mongodb+srv://inspirehead:...`) and JWT Secret (`inspire_secure_jwt_secret_9059068384`) are hardcoded and committed directly into the source control file [`vercel.production.env.local`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/vercel.production.env.local#L1-L7).
- **HIGH [Security - Auth & Master Bypass]**: Universal master PINs (`111111`, `222222`) bypass login authentication and security OTP verification across all administrative and accountant action modal gates in [`apiClient.ts`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/services/apiClient.ts#L865).
- **MEDIUM [Architecture - Orphaned Views & Bundle Size]**: Views like [`AdminAiInsightsView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/AdminAiInsightsView.tsx), [`ContactUniversityView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/ContactUniversityView.tsx), and [`HostelLifeView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/HostelLifeView.tsx) are unreferenced in [`App.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/App.tsx). Monolithic client bundle size exceeds 588 kB without dynamic code splitting.
- **LOW [Data Isolation - Client-Side Mock Storage]**: All multi-tenant campus databases run in client browser `localStorage` (`jc_students_*`, `jc_accounts`). Campus branches share the exact same commit state across git remote branches.

---

## 2. Branch Inventory Table

| Branch Name | Last Commit Date | Divergence from `main` | Campus / Customization Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `main` | 2026-07-21 | 0 commits (Head) | Central Hub | Active development branch |
| `Beemaram-campus-1` | 2026-07-21 | 0 commits ahead/behind | Identical to `main` | Tagged campus branch, structurally synchronized |
| `Beemaram-campus-2` | 2026-07-21 | 0 commits ahead/behind | Identical to `main` | Tagged campus branch, structurally synchronized |
| `Erragattugutta-campus-1` | 2026-07-21 | 0 commits ahead/behind | Identical to `main` | Tagged campus branch, structurally synchronized |
| `Erragattugutta-campus-2` | 2026-07-21 | 0 commits ahead/behind | Identical to `main` | Tagged campus branch, structurally synchronized |

> **Repository Status**: All 4 campus branches are identical pointing to commit `64725f8`. Campus multi-tenancy is handled dynamically via login credentials (`admin2_eragattur1`, `accountant_bhimaram2_1`, etc.) and `localStorage` prefix isolation in [`apiClient.ts`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/services/apiClient.ts#L156-L180).

---

## 3. Dead Code & Orphan Detection

### SAFE TO DELETE (Unreferenced Views & Assets)
1. [`src/views/AdminAiInsightsView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/AdminAiInsightsView.tsx): 748-line mock AI view, never imported or rendered in [`App.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/App.tsx).
2. [`src/views/ContactUniversityView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/ContactUniversityView.tsx): Unreferenced in active application layout.
3. [`src/views/HostelLifeView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/HostelLifeView.tsx): Replaced by Accountant Portal hostel management module.
4. `src/assets/abstract-vector-background-design-abstract-vector-waves_1055256-327.avif`: Unresolved static asset reference during Vite build.

### NEEDS HUMAN CONFIRMATION
1. Standalone Multi-Portal Entry HTML Folders:
   - `inspire-acc-finance-sys-7g8h/`
   - `inspire-princ-admin-sys-3c4d/`
   - `inspire-rect-admin-sys-1a2b/`
   - `inspire-secure-auth-sys-9i0j/`
   *Note*: These contain isolated `index.html` and `main.tsx` entrypoints rendering `<App forcedRole="..." />`. Confirm if individual sub-domain builds are required or if single unified routing is preferred.

---

## 4. Security Findings

- **[CRITICAL] Hardcoded Production Database Credentials**:
  - File: [`vercel.production.env.local`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/vercel.production.env.local#L1-L3)
  - Detail: Raw MongoDB connection string containing database username, password, and cluster domain is committed to git.
- **[HIGH] Authentication & Security Gate Hardcoded Bypasses**:
  - File: [`src/services/apiClient.ts`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/services/apiClient.ts#L865)
  - Detail: OTP validation explicitly allows `111111` and `222222` to bypass action authorization checks for fee structure locks, expenditure posts, and payroll approvals.
- **[HIGH] Insecure Token Generation & Session Handling**:
  - File: [`src/context/NavigationContext.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/context/NavigationContext.tsx#L64)
  - Detail: `auth_token` in `sessionStorage` uses un-signed string template (`mock-jwt-token-for-${username}`) without cryptographic signature or server-side expiration checks.
- **[MEDIUM] Rate Limiting & Brute-Force Protection**:
  - File: [`src/views/PinView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/PinView.tsx#L98)
  - Detail: Rate-limiting response standard (HTTP 429) is simulated client-side without persistent rate counters across browser reloads.

---

## 5. Stability & Reliability Audit

- **[MEDIUM] LocalStorage Quota Overflows**:
  - File: [`src/services/apiClient.ts`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/services/apiClient.ts#L106)
  - Detail: Transaction audit log (`jc_sync_journal`) caps at 100 entries, but heavy student mark rosters and payment receipts reside un-indexed in browser `localStorage`.
- **[LOW] Safe Synchronous Handling**:
  - File: [`src/services/apiClient.ts`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/services/apiClient.ts#L798)
  - Detail: Requests utilize structured `try...catch` blocks and mock artificial network latency (`delay(60)`), preventing unhandled promise rejections.

---

## 6. Performance Audit

- **[MEDIUM] Large Monolithic JS Bundle**:
  - Build Warning: Production bundle `dist/assets/App-*.js` is **588.99 kB** (gzip: 139.00 kB).
  - Cause: All 4 portal views ([`AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/AdminPortalViews.tsx), [`AccountantPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/AccountantPortalViews.tsx), [`AuthenticatorPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/AuthenticatorPortalViews.tsx)) are synchronously loaded.
  - Recommendation: Introduce React `React.lazy()` and `import()` dynamic chunking per portal role.

---

## 7. Authenticator / Backup Feature State

- **Current Implementation**: Fully operational inside [`src/views/AuthenticatorPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/AuthenticatorPortalViews.tsx) and [`authenticatorService.ts`](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/services/authenticatorService.ts).
- **Features Available**:
  - Dashboard "Make Backup" trigger invoking `/authenticator/backup` (returns JSON archive metadata).
  - Live daily security PIN key dashboard for Rector, Authenticator, 4 Campus Deans, and 8 Accountants.
  - Backup emergency access code matrix (`REC-BK-*`, `ADM2-BK-*`, `ACT-BK-*`).
  - Real-time transaction sync journal log inspector (`jc_sync_journal`).

---

## 8. Proposed Task Breakdown

1. **Part 1: Purge Hardcoded Secrets & Clean Git History**:
   - Move production MongoDB URI and JWT secrets out of `.env` files into environment management variables.
2. **Part 2: Dead Code & Orphan Removal**:
   - Remove unused views (`AdminAiInsightsView.tsx`, `ContactUniversityView.tsx`, `HostelLifeView.tsx`) and clean broken asset imports.
3. **Part 3: Production Auth & JWT Validation Upgrade**:
   - Replace client-side mock token templates with real cryptographic JWT sign/verify mechanisms.
4. **Part 4: Dynamic Code Splitting & Performance Optimization**:
   - Implement `React.lazy()` route splitting for Admin, Accountant, and Authenticator portals to reduce initial bundle size below 200 kB.
