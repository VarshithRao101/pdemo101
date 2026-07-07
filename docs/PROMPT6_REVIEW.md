# Prompt 6 Review — Portal Removal (Parent & Faculty)

This document outlines the modifications, dependency-check decisions, verification results, and open questions regarding the permanent removal of the Parent Portal and Faculty/Teacher Portal.

---

## 1. File Modifications & Deletions Registry

### Deleted Files
- **[DELETE] [ParentPortalViews.tsx](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/ParentPortalViews.tsx)**: Completely deleted the frontend views and controllers supporting the Parent Portal.
- **[DELETE] [FacultyPortalViews.tsx](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/FacultyPortalViews.tsx)**: Completely deleted the orphaned/unlinked frontend views and controllers supporting the Faculty Portal.

### Modified Files
- **[MODIFY] [App.tsx](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/App.tsx)**: Removed imports of Parent views, removed parent routing, and updated `window.logoutUser` to resolve the logout recursion loop via a React watcher.
- **[MODIFY] [NavigationContext.tsx](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/context/NavigationContext.tsx)**: Restricted `PortalRoleType` to `'student' | 'admin' | 'accountant'`, removed role mappings for `parent`/`faculty` during login/session recovery, and removed the cyclic `logoutUser()` call.
- **[MODIFY] [PinView.tsx](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/views/PinView.tsx)**: Removed PIN overrides for parent (PIN `111111`) and faculty (PIN `201201`), and updated "Admin & Teacher" labels to "Admin".
- **[MODIFY] [ResponsiveLayout.tsx](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/components/layout/ResponsiveLayout.tsx)**: Removed `FloatingBottomNav` import and its conditional mobile rendering block (which was only active for the `parent` role).
- **[MODIFY] [user.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/models/user.ts)**: Restricted the `role` enum in the User model to `['student', 'accountant', 'admin']` and restricted `profileModel` to `['Student']`.
- **[MODIFY] [authenticate.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/middleware/authenticate.ts)**: Restricted DecodedUser type definition `role` and `profileModel` to reflect parent/faculty removals.
- **[MODIFY] [authorize.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/middleware/authorize.ts)**: Updated middleware role restriction types to support only student, accountant, and admin.
- **[MODIFY] [auth.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/routes/auth.ts)**: Removed the login fallback search by Teacher staff ID, preventing login for Teacher IDs, and removed the unused `Teacher` model import.
- **[MODIFY] [student.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/routes/student.ts)**: Updated the `studentGuard` authorization roles array to `['student']` only and removed parent/faculty-related comments.
- **[MODIFY] [seed.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/scripts/seed.ts)**: Removed `parent` and `faculty` login credentials from `usersToSeed` database generation.
- **[MODIFY] [hashSeedPasswords.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/scripts/hashSeedPasswords.ts)**: Removed custom password hashing exceptions for parent and faculty accounts.

---

## 2. Dependency Check Outcome

During our inspection of database models, we found structural dependencies on the `Teacher` collection:
1. **TimetableEntry references Teacher by ID**: Each slot in a class section's hourly schedule references a `Teacher` document: `teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true }`.
2. **AttendanceRecord references Teacher dynamically**: The system allows logging attendance rosters for faculty members via the Accountant and Admin dashboards: `targetModel: 'Teacher'`.

### Decision
We have **KEPT** the `Teacher` schema and collection as a lightweight reference-only database table. 
- Teachers do not have any `User` credentials linked to them and cannot log into the system.
- The `Teacher` collection retains fields (`mobile`, `salary`, `assignedSubjects`, etc.) to support section schedules and rosters on the kept Accountant and Admin portal dashboards, ensuring zero data display regression.

---

## 3. Verification & Search Confirmation

- **Typescript Compilation Check**:
  - Frontend: `npx tsc --noEmit` -> Compiled successfully with **0 errors**.
  - Backend: `npx tsc --noEmit` -> Compiled successfully with **0 errors**.
- **Database Reset & Re-seeding**:
  - `npm run reset:demo-data` -> Clear-down succeeded and seeded exactly 3 users: `admin`, `accountant`, `student`.
  - `npm run hash-passwords` -> Hashed credentials for `admin`, `accountant`, and `student` with PIN `123456`.
- **Grep Search Results**:
  - A case-sensitive search for `'parent'` in the `/server/src` directory returned **0 results**.
  - A case-sensitive search for `'parent'` in the `/src` directory returned **0 results**.
  - A case-sensitive search for `'faculty'` in both `/src` and `/server/src` directories returned **0 results** representing login user configurations or roles (only references to mock roster types in seed data and Accountant view grids remain).

---

## 4. Open Questions

1. **Static Parent Contact Info**: The `Student` document contains parent fields like `fatherName`, `motherName`, and `parentMobile`. We have retained these fields as static administrative coordinates displayed in student profile screens and administrative search console listings. Should we keep them as-is?
2. **Teacher Fields Retained**: The reference-only `Teacher` documents continue to store assigned subjects, classes, section logs, mobile numbers, and salary parameters to keep the Admin/Accountant management rosters visually and functionally consistent. Confirm whether any of these fields should be pruned or altered.

---

## 5. Addendum: Sibling Cleanup (Prompt 7 Request)
- **Removal Action**: Completely removed the "Add Sibling" modal variables, functions (`handleLinkSibling`, `renderSiblingModal`), state buffers (`linkedSiblings`, `siblingId`), and navigation menu slots inside the side drawer and desktop sidebar in [ResponsiveLayout.tsx](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/src/components/layout/ResponsiveLayout.tsx) to align with Parent Portal deletion.

