# Pre-Wipe Audit — Full Feature & Backend Inventory

> **Audit Status**: Complete Read-Only Audit (No backend or frontend code modified in this pass).  
> **Target Action**: Complete wipe of all backend routes, schemas, services, socket code, and legacy infrastructure, followed by a clean rebuild from scratch.  
> **Environment Preservation**: Environment variables (`.env`, Vercel environment variables) remain untouched.

---

## Part A — Approved Feature List & Frontend Verification

The following are the **ONLY** 4 core feature groups approved for the upcoming clean backend rebuild. Each feature below has been inspected in the frontend codebase and verified to exist and render correctly.

| Role / Surface | Approved Feature | Frontend View / Component File | Rendering Status & Line Reference |
| :--- | :--- | :--- | :--- |
| **Admin1** | Student Addition | [`src/views/AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx#L271-L357) | **Verified Functional** — Renders two-stage student creation form with itemized custom fee slot creation and OTP authorization modal. |
| **Admin1** | Fee Waiver Section | [`src/views/AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx#L165-L176) | **Verified Functional** — Renders tuition, hostel, transport, and miscellaneous waiver input fields in student detail/edit overlays. |
| **Admin1** | Multi-Branch Expenditure | [`src/views/AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx#L479-L489) | **Verified Functional** — Renders multi-campus expenditure log, category filter, expense creation modal, and OTP deletion protection. |
| **Admin1** | Faculty Management | [`src/views/AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx#L358-L379) | **Verified Functional** — Renders faculty roster, subject/campus filter, teaching/non-teaching classification, and 12-month salary ledger modal. |
| **Admin2** | Fee Structure | [`src/views/AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx#L426-L437) | **Verified Functional** — Renders campus-wise tuition, hostel, transport, and miscellaneous fee rate config cards with branch selectors. |
| **Admin2** | Multi-Branch Expenditure | [`src/views/AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx#L479-L489) | **Verified Functional** — Renders overheads and campus expense management shared with Admin1 view. |
| **Admin2** | Worker Payments | [`src/views/AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx#L497-L500) | **Verified Functional** — Renders non-teaching support staff monthly salary log and status toggle across branches. |
| **Accountant** | Student Details / Addition | [`src/views/AccountantPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AccountantPortalViews.tsx#L328-L396) | **Verified Functional** — Renders student search, active roster table, detailed bio editor, and student registration modal. |
| **Accountant** | Fee Collection | [`src/views/AccountantPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AccountantPortalViews.tsx#L405-L417) | **Verified Functional** — Renders payment collection modal (amount, mode, installment, category), receipt popup, and breakdown. |
| **Accountant** | Expense Records | [`src/views/AccountantPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AccountantPortalViews.tsx#L479-L489) | **Verified Functional** — Renders accountant expense logging interface and campus overhead views. |
| **Public Portfolio** | Enquiry / Inquiries Form | [`src/views/PortfolioView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/PortfolioView.tsx#L57-L98) | **Verified Functional** — Renders official public admission enquiry form (student name, parent name, mobile, email, stream, campus, grade, notes) and generates reference numbers. |

---

## Part B — Non-Approved & Legacy Features Inventory

The following features were discovered during code scanning. They are **NOT** on the approved list for the future backend. Below is their precise state and safety assessment for wipe/deletion:

| Feature / Subsystem | Current Code Location | Operational State | Safe to Delete / Action |
| :--- | :--- | :--- | :--- |
| **Admin3 Role & References** | `AdminPortalViews.tsx#L247`, `AuthenticatorPortalViews.tsx#L51`, `server/app.cjs#L1140` | **Partially Wired / Dead Branch** — Role type definitions still include `'admin3'`, but no distinct Admin3 view or navigation tab exists in UI. | **Safe to remove** role strings and legacy branches entirely during wipe. |
| **Announcements & Bulletin Editing** | `AdminPortalViews.tsx#L415-L419`, `admin1Service.ts#L93-L122`, `server/models/Bulletin.cjs` | **Functional in Code** — UI renders notice composer and category tabs (`announcement`, `circular`, `holiday`). | **Unapproved Feature** — Safe to wipe backend route & schema; frontend tab can be disabled/removed. |
| **Marks & Grades Entry / Exam Desk** | `AdminPortalViews.tsx#L421-L444`, `admin1Service.ts#L188-L206`, `server/app.cjs#L2367-L2368` | **Partially Wired / Mocked** — Backend endpoints return stubbed JSON `{ status: 'success', data: [] }`. | **Unapproved Feature** — Safe to delete backend routes outright. |
| **Attendance Marking** | `AdminPortalViews.tsx#L457-L462`, `AccountantPortalViews.tsx#L327`, `accountantService.ts#L154-L162`, `server/app.cjs#L3117-L3118` | **Partially Wired / Mocked** — Backend returns stubbed responses; frontend tab exists in Accountant portal. | **Unapproved Feature** — Safe to delete backend routes outright. |
| **Hostel Management & Room Allocation** | `AccountantPortalViews.tsx#L102-L124`, `accountantService.ts#L102-L124`, `server/models/Hostel.cjs` | **Functional in Code** — Renders room allocation & block capacity summaries. | **Unapproved Feature** — Safe to wipe backend route & schema. (Note: `hostelStatus` and `hostelFee` remain on Student record). |
| **Timetables & Manual Scheduling** | `AdminPortalViews.tsx#L452-L467`, `admin1Service.ts#L125-L151`, `server/app.cjs#L2365-L2366` | **Partially Wired / Mocked** — Backend returns empty arrays and mock file upload status. | **Unapproved Feature** — Safe to delete backend routes outright. |
| **Academic Year Settings & Promotion Wizard** | `src/components/AcademicYearManager.tsx`, `src/components/StudentPromotionWizard.tsx`, `server/models/AcademicYearSettings.cjs` | **Functional Components** — Components exist for academic year state & multi-step student promotion. | **Unapproved Feature** — Safe to delete backend routes & schema. |
| **Data Analytics Dashboard** | `src/components/AdminDataAnalytics.tsx`, `server/app.cjs#L2763` | **Functional in Code** — Renders SVG charts and enrollment statistics. | **Unapproved Feature** — Safe to delete backend routes outright. |
| **Audit Logs Viewer** | `src/components/AuditLogsViewer.tsx`, `server/models/AuditLog.cjs`, `server/app.cjs#L2110` | **Functional in Code** — Log viewer component for system actions. | **Unapproved Feature** — Safe to delete backend routes & schema. |
| **Sync Journal / Ledger** | `server/models/SyncJournal.cjs`, `AuthenticatorPortalViews.tsx#L45-L47` | **Functional in Code** — Logs transaction journals for offline/online sync. | **Unapproved Feature** — Safe to wipe schema and backend routes. |

---

## Part C — Complete Backend Inventory (Target for Wipe)

### C.1 Express Routes (Method + Path) Currently Defined in `server/app.cjs`

#### Authentication & Credentials
- `POST /api/auth/verify-credentials`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

#### Authenticator Portal & System Management
- `GET /api/authenticator/credentials`
- `POST /api/authenticator/credentials`
- `PUT /api/authenticator/credentials/:id`
- `DELETE /api/authenticator/credentials/:id`
- `GET /api/authenticator/pins`
- `GET /api/authenticator/accounts`
- `POST /api/authenticator/accounts`
- `PUT /api/authenticator/accounts/:id`
- `DELETE /api/authenticator/accounts/:id`
- `GET /api/authenticator/keys`
- `POST /api/authenticator/regenerate-keys`
- `GET /api/authenticator/backup-codes`
- `POST /api/authenticator/reset-password`
- `GET /api/authenticator/sync-journal`
- `GET /api/authenticator/stats`
- `POST /api/authenticator/reconcile`
- `POST /api/authenticator/backup`
- `POST /api/authenticator/backup-drive`
- `GET /api/authenticator/available-backups`
- `POST /api/authenticator/restore-data`
- `POST /api/authenticator/purge-drive`
- `POST /api/authenticator/wipe-database`
- `DELETE /api/authenticator/purge-student-faculty-data`
- `GET /api/system/verify-drive`
- `GET /api/system/run-backup`
- `POST /api/system/purge-drive`
- `GET /api/health`

#### Admin1 Routes
- `GET /api/admin1/students`
- `POST /api/admin1/students` (aliases: `/api/admin/students`, `/api/accountant/students`)
- `PATCH /api/admin1/students/:id` (aliases: `/api/admin/students/:id`, `/api/accountant/students/:id`)
- `DELETE /api/admin1/students/:id` (aliases: `/api/admin/students/:id`, `/api/accountant/students/:id`)
- `GET /api/admin1/teachers` (alias: `/api/admin/teachers`)
- `POST /api/admin1/teachers` (alias: `/api/admin/teachers`)
- `PATCH /api/admin1/teachers/:id` (alias: `/api/admin/teachers/:id`)
- `DELETE /api/admin1/teachers/:id` (alias: `/api/admin/teachers/:id`)
- `GET /api/admin1/academic-years`
- `POST /api/admin1/academic-years`
- `PATCH /api/admin1/academic-years/:yearId/status`
- `POST /api/students/:id/promote` (aliases: `/api/admin1/students/:id/promote`, `/api/accountant/students/:id/promote`)
- `GET /api/admin/audit-logs`
- `POST /api/teachers/:id/salary-month` (aliases: `/api/admin1/teachers/:id/salary-month`, `/api/admin2/teachers/:id/salary-month`)
- `GET /api/admin1/sections`
- `POST /api/admin1/sections`
- `GET /api/admin1/bulletins`
- `POST /api/admin1/bulletins`
- `POST /api/enquiries`
- `GET /api/enquiries`
- `PATCH /api/enquiries/:id`
- `GET /api/admin1/timetable`
- `POST /api/admin1/timetable/upload`
- `GET /api/admin1/exams`
- `POST /api/admin1/exams/upload`
- `GET /api/admin1/reports`
- `GET /api/admin1/attendance-summary`

#### Admin2 Routes
- `GET /api/admin2/fee-settings`
- `PATCH /api/admin2/fee-settings`
- `PATCH /api/admin2/students/:studentId/fee-override`
- `GET /api/admin2/expenditure` (alias: `/api/admin2/expenditures`)
- `POST /api/admin2/expenditure` (alias: `/api/admin2/expenditures`)
- `PATCH /api/admin2/expenditure/:id` (alias: `/api/admin2/expenditures/:id`)
- `DELETE /api/admin2/expenditure/:id` (alias: `/api/admin2/expenditures/:id`)
- `GET /api/admin2/worker-payments`
- `POST /api/admin2/worker-payments`
- `PATCH /api/admin2/worker-payments/:id`
- `DELETE /api/admin2/worker-payments/:id`
- `GET /api/admin2/staff-salaries`
- `PATCH /api/admin2/staff-salaries/:id`
- `GET /api/admin2/dashboard-summary`
- `GET /api/admin2/student-marks`
- `PATCH /api/admin2/student-marks`
- `GET /api/admin2/enrollment-stats`
- `GET /api/admin2/late-fees-settings` (alias: `/api/accountant/late-fees-settings`)
- `GET /api/admin2/scholarships` (alias: `/api/accountant/scholarships`)
- `GET /api/admin2/students/:id/fee-breakdown`

#### Accountant Routes
- `GET /api/accountant/dashboard-summary`
- `GET /api/accountant/students`
- `GET /api/accountant/students/:id`
- `PATCH /api/accountant/students/:id/bio`
- `POST /api/accountant/students/:id/payments`
- `GET /api/accountant/students/:id/payments`
- `GET /api/accountant/hostel` (alias: `/api/admin2/hostel`)
- `POST /api/accountant/hostel` (alias: `/api/admin2/hostel`)
- `GET /api/accountant/attendance`
- `POST /api/accountant/attendance`

---

### C.2 Mongoose Schemas & Models Currently Defined

1. **`User.cjs`**: `_id`, `username` (unique), `password`, `pin6`, `role` (`admin1`, `admin2`, `accountant`, `authenticator`), `campus`, `name`, `email`, `mobile`, `status`, `lastPinReset`, `activeSessionGuid`.
2. **`Student.cjs`**: `_id`, `studentId`, `admissionNumber`, `name`, `fatherName`, `motherName`, `mobile`, `parentMobile`, `email`, `course`, `section`, `branch`, `rollNumber`, `status`, `hostelStatus`, `transportStatus`, `academicYear`, `dob`.
3. **`Teacher.cjs`**: `_id`, `id`, `name`, `role`, `classification` (`Teaching`, `Non-Teaching`), `subject`, `salary`, `mobile`, `email`, `branch`, `status`, `joiningDate`, `assignedSections`.
4. **`Payment.cjs`**: `_id`, `receiptNumber`, `studentId`, `admissionNumber`, `studentName`, `category`, `amount`, `paymentMode`, `cashier`, `branch`, `academicYear`, `remarks`, `date`.
5. **`Expenditure.cjs`**: `_id`, `id`, `category`, `amount`, `description`, `date`, `branch`.
6. **`WorkerPayment.cjs`**: `_id`, `id`, `workerName`, `role`, `amount`, `monthPeriod`, `paid`, `branch`.
7. **`FeeSettings.cjs`**: `branch` (unique), `tuition`, `hostel`, `transport`, `misc`, `isLocked`, `academicYear`, `installments`, `lateFeeRules`, `scholarshipRules`.
8. **`RefreshToken.cjs`**: `tokenHash` (unique), `userId`, `expiresAt` (TTL index).
9. **`RateLimit.cjs`**: `key` (unique), `count`, `expiresAt` (TTL index).
10. **`Bulletin.cjs`**: `_id`, `id`, `category`, `title`, `content`, `date`, `branch`. (Legacy/Unapproved)
11. **`Hostel.cjs`**: `branch` (unique), `blocks`, `rooms`. (Legacy/Unapproved)
12. **`AcademicYearSettings.cjs`**: `activeYear`, `academicYears`. (Legacy/Unapproved)
13. **`AuditLog.cjs`**: `action`, `user`, `role`, `time`, `campus`, `targetId`, `ip`, `device`, `details`. (Legacy/Unapproved)
14. **`SyncJournal.cjs`**: `_id`, `transactionId`, `timestamp`, `sourceNode`, `action`, `branch`, `status`, `actorUsername`, `actorRole`, `errorDetails`, `createdAt`. (Legacy/Unapproved)

---

### C.3 Middleware Inventory
1. `authenticateToken`: Reads Bearer token from `Authorization` header or `accessToken` cookie, verifies JWT signature against `JWT_SECRET`, attaches `req.user`.
2. `requireRole(...allowedRoles)`: Checks `req.user.role`. Returns 403 if unauthorized.
3. `enforceCampusIsolation`: Scopes database queries to `req.user.campus` unless `campus === 'All'`.
4. `mongoRateLimiter`: Express rate-limiting middleware backed by MongoDB `RateLimit` collection with in-memory fallback.
5. `cors`: Origin restriction middleware validating incoming origins against `ALLOWED_ORIGINS`.
6. `helmet`: Sets HTTP security headers (CSP, HSTS, X-Frame-Options).
7. `requireSecurityOtp`: Enforces secondary OTP header (`X-Security-OTP` / `x-security-key`) for sensitive operations.

---

### C.4 Service Files Inventory
1. **`server/backupService.cjs`**: Exports local backup & restore methods that create/load JSON files in `server/backups/`.
2. **`server/services/googleDriveService.cjs`**: Google Drive API v3 integration using JWT auth service accounts for uploading and retrieving cloud database snapshots.

---

### C.5 Socket.io / WebSocket Code Confirmation
- **Status**: **CONFIRMED STILL PRESENT IN BACKEND & FRONTEND CODEBASE**.
- **Backend Touchpoints**:
  - `server/app.cjs#L144-L210`: Initializes `const { Server } = require('socket.io')` and `const io = new Server(server)`.
- **Frontend Touchpoints**:
  - `src/services/socketClient.ts#L1-L130`: Stubbed BroadcastChannel client attempting socket simulation.
  - Listeners in `AdminPortalViews.tsx`, `AccountantPortalViews.tsx`, `AuthenticatorPortalViews.tsx`.
- **Vercel Incompatibility**: Ephemeral serverless function invocations on Vercel do not support stateful WebSocket connections. WebSocket server initialization will be completely removed during the backend wipe.

---

### C.6 Mock & Fallback Data Paths
- `src/services/apiClient.ts#L120-L450`: Retains extensive hardcoded mock arrays for fallback execution when backend endpoint fails.
- `server/app.cjs`: Contains seed user creation logic on server startup (`admin1`, `admin2`, `accountant`, `authenticator`).

---

### C.7 Session Handling Analysis
- Currently relies on in-memory maps (`activeSessions` in `server/app.cjs`) and MongoDB refresh tokens.
- **Serverless Limitation**: In-memory maps do not persist across ephemeral Vercel serverless function invocations. Will be rebuilt cleanly using stateless JWT verification.

---

## Part D — Frontend/Backend Contract Map for Approved Features

This section defines the exact request/response schemas required by the frontend so that after the backend wipe, the touching of zero frontend code preserves 100% functionality.

### D.1 Public Portfolio: Admission Enquiry Form
- **Endpoint**: `POST /api/enquiries`
- **Frontend Caller**: [`src/views/PortfolioView.tsx#L68`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/PortfolioView.tsx#L68)
- **Request Body**:
  ```json
  {
    "studentName": "Rahul Sharma",
    "parentName": "Suresh Sharma",
    "mobile": "9876543210",
    "email": "rahul@gmail.com",
    "stream": "MPC (IIT-JEE / EAMCET)",
    "preferredCampus": "Erragattugutta Campus 1",
    "currentGrade": "10th Class Passed",
    "notes": "Interested in hostel"
  }
  ```
- **Response Body**:
  ```json
  {
    "status": "success",
    "referenceCode": "INS-2026-849201",
    "message": "Enquiry submitted successfully"
  }
  ```

---

### D.2 Admin1 & Accountant: Student Addition
- **Endpoint**: `POST /api/admin/students` (also `/api/admin1/students`, `/api/accountant/students`)
- **Frontend Callers**: [`src/services/admin1Service.ts#L45`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/admin1Service.ts#L45), [`src/services/accountantService.ts#L55`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/accountantService.ts#L55)
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "admissionNumber": "INS-2026-001",
    "course": "MPC",
    "section": "MPC-A",
    "branch": "Erragattugutta C1",
    "mobile": "9876543210",
    "fatherName": "Father Name",
    "parentMobile": "9876543211",
    "motherName": "Mother Name",
    "dob": "2008-05-15",
    "address": "123 Main St",
    "hostelStatus": "Day Scholar",
    "transportStatus": "Self Transport",
    "tuitionFee": 120000,
    "hostelFee": 0,
    "transportFee": 0,
    "miscellaneousFee": 5000,
    "previousPending": 0,
    "customFeeSlots": [{ "id": "slot_123", "name": "Books Fee", "amount": 3000 }]
  }
  ```
- **Response Body**:
  ```json
  {
    "status": "success",
    "data": {
      "_id": "STU-2026-001",
      "studentId": "STU-2026-001",
      "admissionNumber": "INS-2026-001",
      "name": "John Doe",
      "course": "MPC",
      "section": "MPC-A",
      "branch": "Erragattugutta C1",
      "status": "Active"
    },
    "credential": {
      "username": "INS-2026-001",
      "pin": "123456"
    }
  }
  ```

---

### D.3 Admin1: Fee Waiver Section
- **Endpoint**: `PATCH /api/admin2/students/:studentId/fee-override`
- **Frontend Caller**: [`src/services/admin2Service.ts#L102`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/admin2Service.ts#L102)
- **Request Body**:
  ```json
  {
    "tuitionWaiver": 10000,
    "hostelWaiver": 0,
    "transportWaiver": 0,
    "miscWaiver": 500,
    "branch": "Erragattugutta C1"
  }
  ```
- **Response Body**:
  ```json
  {
    "status": "success",
    "message": "Fee waiver updated successfully",
    "data": {
      "studentId": "STU-2026-001",
      "tuitionWaiver": 10000,
      "hostelWaiver": 0,
      "transportWaiver": 0,
      "miscWaiver": 500
    }
  }
  ```

---

### D.4 Admin1 & Admin2: Multi-Branch Expenditure
- **Endpoints**:
  - `GET /api/admin2/expenditure?branch=Erragattugutta%20C1`
  - `POST /api/admin2/expenditure`
  - `DELETE /api/admin2/expenditure/:id?branch=Erragattugutta%20C1`
- **Frontend Caller**: [`src/services/admin2Service.ts#L115-L136`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/admin2Service.ts#L115-L136)
- **POST Request Body**:
  ```json
  {
    "category": "Utilities",
    "amount": 15000,
    "description": "Electricity bill for July",
    "date": "2026-07-31",
    "branch": "Erragattugutta C1"
  }
  ```
- **GET Response Body**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "_id": "EXP-9812",
        "id": "EXP-9812",
        "category": "Utilities",
        "amount": 15000,
        "description": "Electricity bill for July",
        "date": "2026-07-31",
        "branch": "Erragattugutta C1"
      }
    ]
  }
  ```

---

### D.5 Admin1: Faculty Management
- **Endpoints**:
  - `GET /api/admin1/teachers?branch=Erragattugutta%20C1`
  - `POST /api/admin1/teachers`
  - `PATCH /api/admin1/teachers/:id`
  - `DELETE /api/admin1/teachers/:id`
- **Frontend Caller**: [`src/services/admin1Service.ts#L76-L90`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/admin1Service.ts#L76-L90)
- **POST Request Body**:
  ```json
  {
    "id": "FAC-101",
    "name": "Dr. Smith",
    "subject": "Physics",
    "salary": 65000,
    "mobile": "9876543210",
    "email": "smith@inspire.edu",
    "branch": "Erragattugutta C1",
    "classification": "Teaching",
    "role": "Senior Lecturer"
  }
  ```
- **GET Response Body**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "_id": "FAC-101",
        "id": "FAC-101",
        "name": "Dr. Smith",
        "subject": "Physics",
        "salary": 65000,
        "mobile": "9876543210",
        "branch": "Erragattugutta C1",
        "status": "Active"
      }
    ]
  }
  ```

---

### D.6 Admin2: Fee Structure Settings
- **Endpoints**:
  - `GET /api/admin2/fee-settings?branch=Erragattugutta%20C1`
  - `PATCH /api/admin2/fee-settings`
- **Frontend Caller**: [`src/services/admin2Service.ts#L86-L94`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/admin2Service.ts#L86-L94)
- **PATCH Request Body**:
  ```json
  {
    "branch": "Erragattugutta C1",
    "tuition": 120000,
    "hostel": 85000,
    "transport": 15000,
    "misc": 5000,
    "isLocked": true
  }
  ```
- **Response Body**:
  ```json
  {
    "status": "success",
    "data": {
      "branch": "Erragattugutta C1",
      "tuition": 120000,
      "hostel": 85000,
      "transport": 15000,
      "misc": 5000,
      "isLocked": true
    }
  }
  ```

---

### D.7 Admin2: Worker Payments
- **Endpoints**:
  - `GET /api/admin2/worker-payments?branch=Erragattugutta%20C1`
  - `POST /api/admin2/worker-payments`
  - `PATCH /api/admin2/worker-payments/:id`
  - `DELETE /api/admin2/worker-payments/:id`
- **Frontend Caller**: [`src/services/admin2Service.ts#L140-L158`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/admin2Service.ts#L140-L158)
- **POST Request Body**:
  ```json
  {
    "workerName": "Ramesh Kumar",
    "role": "Security Guard",
    "amount": 12000,
    "monthPeriod": "July 2026",
    "paid": true,
    "branch": "Erragattugutta C1"
  }
  ```
- **GET Response Body**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "_id": "WRK-001",
        "id": "WRK-001",
        "workerName": "Ramesh Kumar",
        "role": "Security Guard",
        "amount": 12000,
        "monthPeriod": "July 2026",
        "paid": true,
        "branch": "Erragattugutta C1"
      }
    ]
  }
  ```

---

### D.8 Accountant: Fee Collection
- **Endpoints**:
  - `POST /api/accountant/students/:studentId/payments`
  - `GET /api/accountant/students/:studentId/payments`
- **Frontend Caller**: [`src/services/accountantService.ts#L84-L100`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/services/accountantService.ts#L84-L100)
- **POST Request Body**:
  ```json
  {
    "amount": 25000,
    "installment": "Installment 1",
    "category": "Tuition Fee",
    "mode": "UPI / NetBanking",
    "date": "2026-07-31",
    "remarks": "First term partial payment"
  }
  ```
- **POST Response Body**:
  ```json
  {
    "status": "success",
    "data": {
      "payment": {
        "_id": "PAY-2026-091",
        "receiptNumber": "REC-2026-091",
        "studentId": "STU-2026-001",
        "amount": 25000,
        "category": "Tuition Fee",
        "paymentMode": "UPI / NetBanking",
        "cashier": "Accountant",
        "date": "2026-07-31T14:47:00.000Z"
      },
      "student": {
        "studentId": "STU-2026-001",
        "remainingBalance": 95000
      }
    }
  }
  ```

---

## Part E — Database State Confirmation

- **MongoDB Admin Collection**: **CONFIRMED** — The `admin` collection stores the active system user credentials and passcodes.
- **MongoDB ERP Collection / Database**: **CONFIRMED** — Currently empty/structureless as specified, ready for clean schema creation upon rebuild.
- **Legacy Collections Verification**: **CONFIRMED** — No legacy data collections remain from prior iterations.

---

## Audit Conclusion & Next Step

This audit completes the complete pre-wipe mapping of the application.  
All approved frontend features have been mapped directly to their API contract specifications.  
The upcoming step is the **Single Wipe-and-Rebuild Prompt**, which will perform the full backend wipe and construct the clean, serverless-ready modular backend architecture from these exact findings.
