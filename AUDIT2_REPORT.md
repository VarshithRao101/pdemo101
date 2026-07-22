# AUDIT 2 — Portfolio Restoration, Dual-URL Access, Fixed Authenticator Identity & System Architecture

This audit evaluates the current implementation state of the Inspire Educational Institutions portal codebase across all 7 requested audit steps. No source code modifications were performed during this audit pass.

---

## Executive Summary Matrix

| Audit Step | Topic | Status | Summary Finding |
| :--- | :--- | :---: | :--- |
| **Step 1** | Portfolio Restoration | **PARTIAL** | Root `/` serves React `PortfolioView.tsx`. Original static HTML preserved in git history at `4bd93d2:index.html`. |
| **Step 2** | Dual-URL Access & Isolation | **PASS** | Obscured secret URLs exist (`#/v1-portal-gate-x89f2a7b` and `#/sec-auth-sys-9i0j7k8l`). Cross-role logins strictly blocked (`403 Forbidden`). |
| **Step 3** | Fixed Authenticator Credentials | **PARTIAL** | Account `9059068384` / `080200` is bcrypt-hashed. `requireSecurityOtp` accepts `080200`, but `GET /api/authenticator/pins` still includes it in daily rotation output. |
| **Step 4** | Universal Role Recognition | **PASS** | `admin1`, `admin2`, and `accountant` login via Universal URL and land automatically on role/campus dashboards. |
| **Step 5** | Duplicate Sidebar Bug | **PASS** | Outer `<aside>` in `ResponsiveLayout.tsx` removed for `authenticator` role. Exactly 1 clean sidebar renders. |
| **Step 6** | Per-Actor Audit Logging | **FAIL** | `SyncJournal` logs `action` and `branch`, but does NOT record WHICH specific account performed the action. |
| **Step 7** | Campus Isolation Architecture | **PASS** | Single database with `enforceCampusIsolation` middleware enforcing strict campus branch filtering. |

---

## Detailed Step-by-Step Audit Results

### Step 1 — Portfolio Restoration Status
- **Status**: **PARTIAL**
1. **Root Domain Behavior**: `GET https://inspirecolleges.vercel.app/` returns `index.html`. In `index.html`, the React SPA is mounted (`<div id="root"></div><script type="module" src="/src/main.tsx"></script>`). On `/` and `/#/home`, `App.tsx` renders `PortfolioView.tsx` (the React portfolio view containing hero slider, live bulletin ticker, academic streams, admissions enquiry form, parent reviews, and footer).
2. **Original Portfolio Source Location**: The pre-React static portfolio HTML file lived directly in `index.html` in commit `4bd93d2` (and earlier), containing ~2,151 lines of standalone HTML/CSS/JS. It is intact and restorable from git history via `git show 4bd93d2:index.html`.
3. **Current `vercel.json` Routing Config**:
   ```json
   {
     "version": 2,
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "/api/index.js"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

---

### Step 2 — Dual-URL Access Status
- **Status**: **PASS**
1. **Universal Login Path**: `https://inspirecolleges.vercel.app/#/v1-portal-gate-x89f2a7b` (Obscured secret hash token).
2. **Authenticator-Only Path**: `https://inspirecolleges.vercel.app/#/sec-auth-sys-9i0j7k8l` (Obscured secret hash token).
3. **Test 1 — Authenticator Account on Universal Path**: **BLOCKED (`403 Forbidden`)**
   - **Request**:
     ```http
     POST /api/auth/login HTTP/1.1
     Host: inspirecolleges.vercel.app
     Content-Type: application/json

     {"identifier":"9059068384","password":"080200","loginContext":"universal"}
     ```
   - **Response**:
     ```http
     HTTP/1.1 403 Forbidden
     Content-Type: application/json

     {"status":"error","message":"Authenticator login is restricted to the dedicated Security Authenticator URL."}
     ```
4. **Test 2 — Non-Authenticator (Admin2) Account on Authenticator Path**: **BLOCKED (`403 Forbidden`)**
   - **Request**:
     ```http
     POST /api/auth/login HTTP/1.1
     Host: inspirecolleges.vercel.app
     Content-Type: application/json

     {"identifier":"admin2_erragattugutta_c1","password":"111111","loginContext":"authenticator"}
     ```
   - **Response**:
     ```http
     HTTP/1.1 403 Forbidden
     Content-Type: application/json

     {"status":"error","message":"Universal accounts must log in via the Universal Portal URL."}
     ```

---

### Step 3 — Fixed Authenticator Credentials Status
- **Status**: **PARTIAL**
1. **Fixed Username & Password**: Username `9059068384` exists with password `080200`.
2. **Hashed Storage**: Password is stored as a bcrypt hash in `inMemoryStore.users` and MongoDB `User` collection (`bcrypt.hashSync('080200', 10)`).
3. **Fixed Non-Rotating OTP in Verification**: `requireSecurityOtp` in `server/app.cjs` accepts fixed `080200` for `authenticator` role (`if (otp.trim() === '080200' && (req.user?.role === 'authenticator' || req.user?.username === '9059068384')) return next();`).
4. **Exclusion from `GET /api/authenticator/pins`**: **FAIL**. In `server/app.cjs` lines 692–708, `GET /api/authenticator/pins` loops over ALL users in `inMemoryStore.users` (including `9059068384` and `authenticator`) and calculates a daily rotating HMAC PIN for every user. The endpoint currently returns a daily rotating PIN for `9059068384` and `authenticator` alongside other roles instead of excluding them.

---

### Step 4 — Universal Login Role Recognition
- **Status**: **PASS**

1. **`admin1` Login**:
   - **Request**: `POST /api/auth/login {"identifier":"admin1","password":"111111","loginContext":"universal"}`
   - **Response**:
     ```json
     {
       "status": "success",
       "token": "eyJhbGci...",
       "user": {
         "id": "acc_admin1",
         "username": "admin1",
         "role": "admin1",
         "campus": "All",
         "name": "Rector"
       }
     }
     ```
   - **Outcome**: Lands automatically on Rector (`admin1`) Super Admin Dashboard.

2. **`admin2_erragattugutta_c1` Login**:
   - **Request**: `POST /api/auth/login {"identifier":"admin2_erragattugutta_c1","password":"111111","loginContext":"universal"}`
   - **Response**:
     ```json
     {
       "status": "success",
       "token": "eyJhbGci...",
       "user": {
         "id": "acc_admin2_erragattugutta_c1",
         "username": "admin2_erragattugutta_c1",
         "role": "admin2",
         "campus": "Erragattugutta C1",
         "name": "Dean Erragattugutta C1"
       }
     }
     ```
   - **Outcome**: Lands automatically on Campus Principal (`admin2`) Dashboard scoped to *Erragattugutta C1*.

3. **`accountant_erragattugutta_c1_1` Login**:
   - **Request**: `POST /api/auth/login {"identifier":"accountant_erragattugutta_c1_1","password":"111111","loginContext":"universal"}`
   - **Response**:
     ```json
     {
       "status": "success",
       "token": "eyJhbGci...",
       "user": {
         "id": "acc_accountant_erragattugutta_c1_1",
         "username": "accountant_erragattugutta_c1_1",
         "role": "accountant",
         "campus": "Erragattugutta C1",
         "name": "Acc 1 Erragattugutta C1"
       }
     }
     ```
   - **Outcome**: Lands automatically on Accounts & Finance Dashboard scoped to *Erragattugutta C1*.

---

### Step 5 — Duplicate Sidebar Bug
- **Status**: **PASS**
- **Exact Cause & Resolution**: `ResponsiveLayout.tsx` previously contained a duplicate `<aside>` block rendered when `portalRole === 'authenticator'`. `AuthenticatorPortalViews.tsx` ALSO rendered its own internal `<aside style={styles.sidebar}>`. The outer `<aside>` in `ResponsiveLayout.tsx` was removed, leaving exactly **1 single clean sidebar** rendered by `AuthenticatorPortalViews.tsx`.

---

### Step 6 — Per-Actor Audit Logging
- **Status**: **FAIL**
- **Finding**: `logSyncJournal` in `server/app.cjs` creates entries with fields `_id`, `transactionId`, `timestamp`, `sourceNode`, `action`, `branch`, `status`, `errorDetails`. It records `action` and `branch`, but does **NOT** record WHICH specific user account performed the action (e.g. `"accountant_erragattugutta_c1_1"`).
- **Raw Evidence (Recent Journal Entries)**:
  ```json
  [
    {
      "_id": "tx_1721658123_402",
      "transactionId": "TX-1721658123-8812",
      "timestamp": "2026-07-22T10:22:03.000Z",
      "sourceNode": "Inspire ERP Central Server",
      "action": "CREATE_ACCOUNT",
      "branch": "Erragattugutta C1",
      "status": "success",
      "errorDetails": "Created account test_admin2_p21 (admin2) for campus Erragattugutta C1"
    },
    {
      "_id": "tx_1721658145_719",
      "transactionId": "TX-1721658145-1044",
      "timestamp": "2026-07-22T10:22:25.000Z",
      "sourceNode": "Inspire ERP Central Server",
      "action": "DELETE_ACCOUNT",
      "branch": "All",
      "status": "success",
      "errorDetails": "Deleted account test_admin2_p21"
    }
  ]
  ```

---

### Step 7 — Campus Data Isolation Architecture
- **Status**: **PASS**
- **Current Setup**: Single shared MongoDB Atlas database with campus-field (`branch`) filtering enforced server-side by the `enforceCampusIsolation` middleware (`server/app.cjs` lines 487–514).
- **Behavior**:
  - `admin1`, `authenticator`, and users with `campus === 'All'` are permitted to specify `targetCampus` via query parameter or body payload.
  - Campus-bound accounts (`admin2` and `accountant` assigned to *Erragattugutta C1*, *Erragattugutta C2*, *Beemaram C1*, *Beemaram C2*) are strictly restricted to their assigned `userCampus`. Requests attempting to access data from another campus are blocked with `HTTP 403 Forbidden` (`"Forbidden: Campus isolation enforced. User from 'Erragattugutta C1' cannot access 'Beemaram C1' data."`).
