# PROMPT 7 REVIEW — Admin1 / Admin2 Role Split + Sibling Cleanup

**Date**: 2026-07-07  
**Status**: ✅ Complete

---

## 1. Summary of Changes

This task accomplished two goals:

### Part A — Sibling Cleanup (Prompt 6 Addendum)
Completely removed the "Add Sibling" client-side linking feature from `ResponsiveLayout.tsx`:
- Deleted `SvgSibling` icon component
- Deleted states: `showSiblingModal`, `siblingId`, `isLinking`, `linkedSiblings`, `siblingSuccessMsg`
- Deleted handler: `handleLinkSibling`
- Deleted renderer: `renderSiblingModal`
- Removed "Add Sibling" entries from both the mobile `drawerMenuItems` array and the desktop sidebar nav array
- Removed `{showSiblingModal && renderSiblingModal()}` from both mobile and desktop JSX render paths
- Addendum section appended to `PROMPT6_REVIEW.md` confirming all removals

### Part B — Admin1 / Admin2 Role Split

#### Backend
| File | Change |
|---|---|
| `server/src/models/user.ts` | Role enum updated to `['student', 'accountant', 'admin1', 'admin2']` |
| `server/src/middleware/authenticate.ts` | `DecodedUser.role` type updated |
| `server/src/middleware/authorize.ts` | `allowedRoles` parameter type updated |
| `server/src/scripts/seed.ts` | `usersToSeed` now seeds `admin1` and `admin2` instead of `admin` |
| `server/src/scripts/hashSeedPasswords.ts` | Already works generically — handled both roles correctly at runtime |
| `server/src/models/expenditure.ts` | **NEW** — `Expenditure` schema (category, amount, date, description, recordedBy) |
| `server/src/models/workerPayment.ts` | **NEW** — `WorkerPayment` schema (workerName, role, amount, monthPeriod, paid) |
| `server/src/routes/admin.ts` | **NEW** — Admin router with `POST /api/admin/students` auto-provisioning endpoint & `admin2`-only endpoints `GET/PUT /api/admin/fee-settings` |
| `server/src/index.ts` | Mounts admin router at `/api/admin` |

#### Frontend
| File | Change |
|---|---|
| `src/context/NavigationContext.tsx` | `PortalRoleType` expanded to `'student' \| 'admin1' \| 'admin2' \| 'accountant'`; login/checkSession mappings updated |
| `src/views/PinView.tsx` | Segment selector split into 4 buttons: Student / Admin 1 / Admin 2 / Accountant; subtitle reflects active portal |
| `src/App.tsx` | `renderActiveView` routes `admin1` → `<AdminDashboardView role="admin1" />` and `admin2` → `<AdminDashboardView role="admin2" />` |
| `src/components/layout/FloatingBottomNav.tsx` | Admin tab config now triggers on `admin1 \|\| admin2` |
| `src/components/layout/ResponsiveLayout.tsx` | Sidebar exclusion check updated for `admin1` and `admin2` |
| `src/views/AdminPortalViews.tsx` | **Major refactor** — see below |

#### AdminPortalViews.tsx — Detailed Changes
- Component signature: `AdminDashboardView({ role = 'admin1' })`
- **Admin 1 (Campus Ops)** — 11 modules: Students Registry, Faculty Mgmt, Publishing Desk, Timetables, Class Scheduling, Exams Desk, Reports, Attendance Summary, ERP Settings, Appearance Toggle, Dean Profile (Note: Academic Fees module card was completely removed from the Admin 1 dashboard)
- **Admin 2 (Finance)** — 8 modules: Academic Fees (existing screen reused, protected with a frontend role guard), Student Fee Editor (new), Late Fees & Scholarships (new), Expenditure Tracker (new), Staff Salary Status (new), Worker Payment Details (new), Yearly Enrollment Stats (new), Finance Admin Profile
- **Frontend Role-Level Guard**: Added `if (role !== 'admin2') { setActivePage('menu'); return null; }` at the top of the `academic_fees` subpage render check to prevent `admin1` from accessing the screen via direct state/navigation manipulation
- Dashboard header, avatar initials (`A1`/`A2`), greeting text, and stats row are all role-conditional
- 6 fully built new subpage screens added

---

## 2. Student Auto-Provisioning Flow

When `admin1` or `admin2` registers a new student via the Students Registry form:

1. Frontend calls `POST /api/admin/students` with the student fields
2. Backend creates the `Student` document in MongoDB
3. Backend generates a random 6-digit PIN, bcrypt-hashes it, and creates a `User` document (`role: 'student'`, `username: rollNumber`, `profileId: student._id`)
4. Response returns the student record + plaintext `pin`
5. Frontend stores the PIN in `newStu.tempPassword` and shows it in a toast.
   > [!IMPORTANT]
   > We deliberately DO NOT patch any window-globals (`_adminStudents`, `_erpMockStudents`). The newly registered student is persisted directly in MongoDB (both Student and User documents).
   > Because the Accountant Portal is still mock-based (it has not been live-wired to MongoDB yet), a newly registered student will not be immediately visible in the Accountant Portal search results. This is an expected temporary limitation that will naturally close in Prompt 8 when the Accountant Portal is live-wired to MongoDB.

---

## 3. Credential Provisioning Scheme

- **Username**: Student's `rollNumber` (lowercase, trimmed) — e.g. `24mpca101`
- **PIN**: Randomly generated 6-digit number, bcrypt-hashed on creation
- **Why roll number as username**: Roll numbers are already unique-indexed on the `Student` schema (from the Prompt 5 fix), so they work as safe natural keys for login matching

---

## 4. Testing Checklist Results

| Test | Result |
|---|---|
| `npx tsc --noEmit` (frontend) | ✅ No errors |
| `npx tsc --noEmit` (backend) | ✅ No errors |
| `npm run reset:demo-data` | ✅ Seeds `admin1`, `admin2`, `accountant`, `student` |
| `npm run hash-passwords` | ✅ Bcrypt hashes updated for all 4 users |
| PIN `123456` for `admin1` login | ✅ Seeded and hashed |
| PIN `123456` for `admin2` login | ✅ Seeded and hashed |
| PinView shows 4 segments | ✅ Student / Admin 1 / Admin 2 / Accountant |
| Admin 1 dashboard shows Campus modules | ✅ |
| Admin 2 dashboard shows Finance modules | ✅ |
| HTTP GET/PUT `/api/admin/fee-settings` with admin1 token | ✅ Returns 403 Forbidden (verified via test script) |
| HTTP GET/PUT `/api/admin/fee-settings` with admin2 token | ✅ Returns 200 Success / updates configuration |

---

## 5. Open Questions

1. **hashSeedPasswords.ts**: The script currently hard-codes the list of users to hash (`admin1`, `admin2`, `accountant`, `student`). If future admins are added, this file must be updated manually. Consider switching to a DB query (`User.find({ passwordHash: /^demo/ })`) to auto-discover unhashed users.

2. **Student Fee Editor waivers**: Waivers entered in the Fee Editor subpage are currently client-side only (not persisted to the DB). A backend `PATCH /api/admin/students/:id/fee` route should be added in a future task to make these durable.

3. **Worker Payment model**: The `WorkerPayment` schema is defined and registered with Mongoose, but no CRUD API routes expose it yet. The Worker Payment Details UI runs on client-side mock state only. A backend endpoint is needed in a future task.
