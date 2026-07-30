# FULL FRESH AUDIT REPORT — Complete A-to-Z System & Security Review

> **Deployment Target Constraint**: **Vercel Serverless Platform** (`api/index.js` + `vercel.json`).
> **Audit Status**: Complete Audit Only (No code modified in this pass).
> **Timestamp**: 2026-07-30

---

## Section 1 — Deployment & Architecture Reality Check

### 1.1 Live Production Target & Environment Verification
- **Configuration**: The project is configured for Vercel deployment via [`vercel.json`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/vercel.json#L1-L22) and [`api/index.js`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/api/index.js#L1-L24).
- **Handler Structure**: `api/index.js` exports a serverless function handler wrapping [`server/app.cjs`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L1-L3238) via `handler(req, res)`.
- **Finding**: While `vercel.json` rewrites `/api/(.*)` to `/api/index.js`, [`server/app.cjs`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L146) contains standalone server setup (`http.createServer` and `server.listen(3000)` on lines [L146](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L146) and [L3224](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L3224)) intended for long-running Node/Cloud Run containers.
- **Severity**: **MEDIUM**

### 1.2 WebSocket / Socket.io Code Audit (Vercel Incompatibility)
- **Status**: **CRITICAL**
- **Evidence**: Stateful WebSocket engines cannot function on Vercel Serverless functions because invocations are ephemeral and stateless.
- **Touched Files**:
  1. [`server/app.cjs#L144-L210`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L144-L210): Initializes `const { Server } = require('socket.io')`, `const io = new Server(server)`, `app.set('io', io)`, `io.use(...)`, `io.on('connection', ...)`, and `emitToCampus(...)`.
  2. [`src/services/socketClient.ts#L1-L130`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/socketClient.ts#L1-L130): Implements a local stubbed socket client using `BroadcastChannel('inspire_erp_realtime_sync')`.
  3. [`src/views/AdminPortalViews.tsx#L10,L1350-L1359`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx#L10): Imports `onSocketEvent` and registers listeners (`student:created`, `fee:updated`, `attendance:updated`, `expenditure:updated`, `workerPayment:updated`, `hostel:updated`).
  4. [`src/views/AccountantPortalViews.tsx#L10,L619-L627`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AccountantPortalViews.tsx#L10): Imports `onSocketEvent` and registers listeners (`student:created`, `fee:updated`, etc.).
  5. [`src/views/AuthenticatorPortalViews.tsx#L6,L314`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AuthenticatorPortalViews.tsx#L6): Imports `onSocketEvent` and listens to `sync:journal-updated`.
  6. [`src/services/apiClient.ts#L5,L14-L43`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/apiClient.ts#L5): Imports `emitLocalSocketEvent` and calls it inside `triggerMutationEvents`.
  7. [`src/context/NavigationContext.tsx#L3`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/context/NavigationContext.tsx#L3): Imports `connectSocket`, `disconnectSocket`.
  8. [`src/components/common/LiveConnectionIndicator.tsx#L2`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/components/common/LiveConnectionIndicator.tsx#L2): Uses `useSocketConnectionState`.
  9. [`package.json#L29-L30`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/package.json#L29-L30): Retains unused `"socket.io": "^4.8.3"` and `"socket.io-client": "^4.8.3"`.

### 1.3 Data Change Reflection Mechanism
- **Current State**: Cross-tab synchronization uses `BroadcastChannel` in [`src/services/socketClient.ts#L27`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/socketClient.ts#L27).
- **Limitation**: `BroadcastChannel` only works locally across open tabs within the *same browser on the same device*. It does **NOT** propagate data updates across different devices or different users.
- **Result**: Data mutations on one machine are invisible to other users/machines until they manually refresh or trigger an action.

---

## Section 2 — Authentication & Authorization

### 2.1 Hardcoded Security Keys & Bypass Values
- **Severity**: **CRITICAL**
- **Evidence (Grep Output)**:
  - [`src/services/socketClient.ts#L111`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/socketClient.ts#L111): `authenticator: '789456'`
  - [`src/services/apiClient.ts#L111`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/apiClient.ts#L111): `authenticator: '789456'`
  - [`server/app.cjs#L370-L371`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L370-L371): `passwordRaw: '00112233', pin6: '789456'`
  - [`server/app.cjs#L560`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L560): `authenticator: '789456'`
  - [`server/app.cjs#L817`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L817): `password: u.passwordRaw || defaultPassMap[u.username] || 'Password#2026'`
  - [`src/views/PinView.tsx#L47-L51`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/PinView.tsx#L47-L51):
    ```ts
    if (norm === 'admin1' || norm === 'rector' || norm === 'superadmin') return 'RectorPass#2026';
    if (norm === 'admin2' || norm.includes('admin2') || norm === 'principal') return 'DeanE1#8492';
    if (norm === 'accountant' || norm.includes('accountant') || norm === 'acc') return 'AccE1#4102';
    ```

### 2.2 JWT Token Signing & Refresh Token Flow
- **Verification**:
  - Access Token: [`server/app.cjs#L1153`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L1153) signs JWT with `JWT_SECRET` expiring in `1h`.
  - Refresh Token: [`server/app.cjs#L1154-L1173`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L1154-L1173) signs refresh token with `JWT_REFRESH_SECRET` expiring in `7d`, stored in `httpOnly` cookie at `/api/auth` path.
  - Revocation & Renewal: `/api/auth/refresh` validates token hash against `RefreshTokenModel` / `inMemoryStore.refreshTokens`.
- **Severity**: **LOW** (Flow operates correctly, but uses fallback secrets if environment variables are not populated).

### 2.3 Route Authorization (`requireRole`) & Campus Isolation Map
- **Listing of Sensitive Routes**:
  | Route Endpoint | HTTP Method | `authenticateToken` | `requireRole` | `enforceCampusIsolation` | Status |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `/api/authenticator/credentials` | GET/POST/PUT/DELETE | Yes | `authenticator` | No (Global) | Protected |
  | `/api/authenticator/pins` | GET | Yes | `authenticator` | No (Global) | Protected |
  | `/api/authenticator/wipe-database` | POST | Yes | `authenticator`, `admin1` | No | Protected (bcrypt password check) |
  | `/api/system/run-backup` | GET | Yes | `authenticator`, `admin1` | No | Protected |
  | `/api/system/purge-drive` | POST | Yes | `authenticator`, `admin1` | No | Protected |
  | `/api/admin1/students` | GET/POST/PATCH/DELETE | Yes | **MISSING** | Yes | **HIGH**: Lacks explicit `requireRole('admin1')` |
  | `/api/admin1/teachers` | GET/POST/PATCH/DELETE | Yes | **MISSING** | Yes | **HIGH**: Lacks explicit `requireRole('admin1')` |
  | `/api/admin2/fee-settings` | GET/PATCH | Yes | **MISSING** | Yes | **HIGH**: Lacks `requireRole('admin2')` |
  | `/api/admin2/expenditure` | GET/POST/PATCH/DELETE | Yes | **MISSING** | Yes | **HIGH**: Lacks `requireRole('admin2')` |
  | `/api/admin2/worker-payments` | GET/POST/PATCH/DELETE | Yes | **MISSING** | Yes | **HIGH**: Lacks `requireRole('admin2')` |
  | `/api/accountant/students/:id/payments` | POST | Yes | **MISSING** | Yes | **HIGH**: Lacks `requireRole('accountant')` |

### 2.4 Rate Limiting Analysis
- **Location**: [`server/app.cjs#L625-L685`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L625-L685) (`mongoRateLimiter`).
- **Fail-Closed Behavior**:
  ```js
  if (!isMongoConnected || !mongoose.connection || mongoose.connection.readyState !== 1) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        status: 'error',
        message: 'Database service unavailable for security rate-limiting verification.'
      });
    }
    return enforceInMemoryRateLimit();
  }
  ```
- **Finding**: Fails closed with `HTTP 503` in production mode. In non-production mode (`development`), falls back to in-memory window checking.

### 2.5 CORS Policy Analysis
- **Location**: [`server/app.cjs#L124-L140, L213-L232`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L124-L140).
- **Finding**:
  ```js
  function isOriginAllowed(origin) {
    if (!origin) return true;
    return (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.run.app') ||
      origin.endsWith('.googleusercontent.com') ||
      origin.endsWith('.ai.studio') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    );
  }
  ```
- **Severity**: **MEDIUM**: Matching any `*.vercel.app` allows requests from *any* Vercel deployment. In production, this should be restricted to the exact deployment domain.

### 2.6 Client-Side Exposed Credentials & Auto-fill
- **Severity**: **HIGH**
- **Evidence**:
  1. [`src/views/PinView.tsx#L45-L67`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/PinView.tsx#L45-L67): `getDefaultPasswordForUser()` returns hardcoded default passwords for `admin1`, `admin2`, `accountant` and populates input fields upon role card selection.
  2. [`src/views/AuthenticatorPortalViews.tsx#L850`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AuthenticatorPortalViews.tsx#L850): Authenticator dashboard exposes staff account passwords in plain text via `acc.password || acc.passwordRaw`.

---

## Section 3 — Core CRUD Reliability

| Entity Module | Create Persists? | Update Persists? | Delete Removes? | Swallowed Error Paths? | Duplicate Prevention? | Campus Scope Enforced? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Students** | Yes (DB + Memory) | Yes | Yes (Permanent) | **YES** (`catch { /* fallback */ }`) | **YES** (Admission No check) | Yes (`req.targetCampus`) |
| **Faculty / Teachers** | Yes (DB + Memory) | Yes | Yes (Permanent) | **YES** (`catch { /* fallback */ }`) | No | Yes (`req.targetCampus`) |
| **Fee Structure** | Yes | Yes | N/A | **YES** (`catch { /* fallback */ }`) | N/A | Yes |
| **Fee Payments** | Yes | Yes | N/A | **YES** (`catch { /* fallback */ }`) | **NO** (No double-submit lock) | Yes |
| **Expenditure** | Yes | Yes | Yes | **YES** (`catch { /* fallback */ }`) | No | Yes |
| **Worker Payments** | Yes | Yes | Yes | **YES** (`catch { /* fallback */ }`) | No | Yes |
| **Hostel Allocation** | **NO** (Static JSON) | **NO** | **NO** | **N/A** | **N/A** | **NO** |

### Swallowed-Error Write Path Evidence
In [`server/app.cjs#L1658-L1660`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L1658-L1660):
```js
if (isMongoConnected) {
  try { await Student.create(newStu); } catch { /* fallback */ }
}
```
If MongoDB write fails (e.g., schema validation failure or timeout), the error is silently caught without logging or returning an HTTP error. The record is inserted into `inMemoryStore` and `HTTP 200 OK` is returned. On Vercel serverless container recycle, this data vanishes.

---

## Section 4 — Frontend/Backend Contract Integrity

### 4.1 Payload Mismatches
- **Hostel Allocation**:
  - Frontend view expects mutable room/bed allocations.
  - Backend route [`GET /api/accountant/hostel`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L3123-L3135) returns static JSON and lacks `POST/PATCH/DELETE` handlers.

### 4.2 Dead / Orphaned Frontend Calls
- None detected. Main routes align with backend endpoints.

### 4.3 Fallback Data Path Risks
- If MongoDBAtlas connection times out during serverless startup, `app.use('/api')` falls back to `inMemoryStore` for that lambda instance. Subsequent requests routed to a different lambda instance will see disparate in-memory states.

---

## Section 5 — Real-Time UX Strategy Without WebSockets

### Proposed Polling / Refetch-on-Action Strategy
Since stateful WebSockets do not operate on Vercel Serverless:
1. **Refetch-on-Focus & Action**:
   - Re-fetch active view data whenever the window regains focus (`window.addEventListener('focus', refetch)`).
   - Re-fetch immediately following any local mutation (`post`, `patch`, `delete`).
2. **Lightweight Smart Polling**:
   - Implement an interval timer (e.g., every 30 seconds) while the browser tab is active/visible (`document.visibilityState === 'visible'`).
   - Use HTTP `If-Modified-Since` or ETag headers / lightweight `/api/system/last-mutation` epoch timestamp to avoid fetching full data payloads if no changes occurred.

---

## Section 6 — Session Handling

### 6.1 Multi-Device Concurrent Login Behavior
- **Mechanics**: [`server/app.cjs#L1141`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L1141) sets `activeSessionGuidMap[username] = sessionGuid`.
- **Vercel Serverless Limitation**: `activeSessionGuidMap` is stored in process memory. On Vercel, requests are distributed across multiple serverless instances. Instance B does not share instance A's in-memory `activeSessionGuidMap`.
- **Result**: Single-session enforcement does **NOT** work across Vercel serverless instances.

### 6.2 Session Conflict Flow Status
- **Status**: **Open / Not Implemented**.
- **Behavior**: Logging in from a new tab overwrites the active session GUID in memory without prompting the user.

---

## Section 7 — Backup System

### 7.1 Google Drive Backup Credentials
- **Status**: Credentials defined in [`.env`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/.env#L1-L5) (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_DRIVE_PARENT_FOLDER_ID`).
- **Production Requirement**: Environment variables must be added to Vercel Project Settings for production cron execution (`vercel.json` cron job `/api/system/run-backup` at `0 0 * * *`).

### 7.2 Retention & Cleanup Verification
- **Verification**: [`server/backupService.cjs#L164-L169`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/backupService.cjs#L164-L169) and [`server/services/googleDriveService.cjs#L107-L125`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/services/googleDriveService.cjs#L107-L125) enforce rolling 2-snapshot retention per campus/category folder.

### 7.3 Database Wipe Authentication Gating
- **Location**: [`server/app.cjs#L1474-L1498`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L1474-L1498).
- **Verification**: Gated by `authenticateToken`, `requireRole('authenticator', 'admin1')`, and `verifyMasterSecurityPinAsync(pin)` which compares provided input against the bcrypt hash of the authenticator password (`bcrypt.compareSync(cleanInput, authUser.password)`).

---

## Section 8 — Dead Code, Stability & Performance

### 8.1 Dead Code & Serverless Bloat
1. Socket.io engine setup in [`server/app.cjs#L144-L210`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L144-L210) (unusable on Vercel).
2. Unused `socket.io` and `socket.io-client` packages in [`package.json`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/package.json#L29-L30).
3. Standalone `server.listen()` code block in [`server/app.cjs#L3224`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs#L3224).

### 8.2 Crash Risks
1. Silent `catch { /* fallback */ }` blocks masking database connection/write errors.
2. In-memory session tracking loss on Vercel lambda container recycling.

### 8.3 Bundle Size & Performance Snapshot
- **Build Output**:
  - Total bundle size: `819.23 kB` (`178.53 kB` gzipped).
  - Exceeds Vite warning threshold of `500 kB`.
  - Cause: Monolithic chunking (all portal views imported synchronously).

---

## Proposed Fix Breakdown (Smallest Safe Units)

### Part 1: Clean Up Dead Socket.io Engine & Vercel Compatibility
- **Action**: Remove `socket.io` server setup from `server/app.cjs` and client dependencies.
- **Proof Requirement**: Clean `npm run build` and zero WebSocket connection error logs in console.

### Part 2: Remove Hardcoded Credentials & Client-Side Autofill
- **Action**: Remove hardcoded PINs/passwords from `PinView.tsx`, `socketClient.ts`, `apiClient.ts`, and `server/app.cjs`. Remove plaintext password endpoint mapping in `server/app.cjs`.
- **Proof Requirement**: Grep verification returning 0 matches for default passwords and PIN strings.

### Part 3: Explicit `requireRole` Enforcement Across All API Routes
- **Action**: Add explicit `requireRole(...)` middleware to all Student, Teacher, Fee, Expenditure, and Payment routes in `server/app.cjs`.
- **Proof Requirement**: Automated HTTP test confirming `HTTP 403 Forbidden` when accessing endpoints with unprivileged role tokens.

### Part 4: Database Write Error Handling (Eliminate Silent Swallowing)
- **Action**: Replace `catch { /* fallback */ }` on database write operations with explicit error propagation and `HTTP 500` / `HTTP 400` responses.
- **Proof Requirement**: Simulated database error returns valid JSON error response to client.

### Part 5: Real-Time UX via Refetch-on-Focus & Smart Polling
- **Action**: Implement window focus refetching and active tab polling in navigation/view context.
- **Proof Requirement**: Multi-tab data updates reflect within polling interval.

### Part 6: Persistent Session Tracking in MongoDB
- **Action**: Store active session GUIDs in `User` model / `Session` collection instead of in-memory object to function across Vercel serverless instances.
- **Proof Requirement**: Single-session termination works across separate HTTP requests/containers.

### Part 7: Code-Splitting & Vite Bundle Optimization
- **Action**: Convert view imports in `App.tsx` to `React.lazy()` with `Suspense`.
- **Proof Requirement**: `dist/assets/main-*.js` chunk size drops below `500 kB`.
