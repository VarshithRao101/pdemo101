# ERP Application Code Audit Report

This document provides a comprehensive, read-only audit of the current state of the Residential Junior College ERP App frontend prototype.

---

## 1. Tech Stack & Project Structure

### Tech Stack
- **Framework**: React 19 (`^19.2.7`)
- **Language**: TypeScript (`~6.0.2`)
- **Build Tool**: Vite (`^8.1.1`)
- **Styling System**: Vanilla CSS (modularized in `src/styles/` with index, animations, glass, and theme stylesheets)
- **Routing Library**: None (uses a custom routing mechanism in `src/context/NavigationContext.tsx` listening to hash changes `#/...` and `window.history.pushState` / `popstate` events)
- **State Management**: React Context API (`NavigationContext`) + local component state (`useState`) + in-memory global state stores mounted on the `window` object.

### Project Tree
```
ptype101/
├── .oxlintrc.json                 - Configuration file for the oxlint linter
├── README.md                      - General project description
├── index.html                     - Single page application entry template
├── package.json                   - Project scripts, metadata, and packages
├── tsconfig.json                  - TypeScript configuration entry
├── public/                        - Static assets served directly
└── src/
    ├── App.tsx                    - Main layout selector & auth gate controller
    ├── main.tsx                   - Root DOM renderer
    ├── assets/                    - General media files (e.g., college logo.png)
    ├── components/                - Reusable layout & common components
    │   ├── common/                - Visual elements (GlassCard, InspireLogo, PremiumButton, FeedbackStates)
    │   ├── icons/                 - Shared SVG vector assets
    │   └── layout/                - Shell templates (ResponsiveLayout, FloatingBottomNav)
    ├── context/                   - Global context state managers
    │   └── NavigationContext.tsx  - Handles current active tab, portalRole, theme, and drawer state
    ├── styles/                    - Style declarations
    │   ├── animations.css         - Transition rules & HMR animations
    │   ├── glass.css              - Backdrop filters & glass styling rules
    │   ├── index.css              - Base element settings
    │   └── theme.css              - Color tokens & palette variables
    └── views/                     - Primary user interface views
        ├── SplashView.tsx         - Exiting timed intro screen
        ├── PinView.tsx            - Fake 6-digit numeric keypad lock view
        ├── DashboardView.tsx      - Student portal main cockpit dashboard view
        ├── AcademicsView.tsx      - Student portal grade matrices and attendance timeline
        ├── UpdatesView.tsx        - Student portal notice board alerts list
        ├── ProfileView.tsx        - Student portal identity card and contacts
        ├── LeaveGatePassView.tsx  - Outing pass request and QR code display
        ├── ContactUniversityView.tsx- Office directories and telephone logs
        ├── HostelLifeView.tsx     - Dorm status overview
        ├── ParentPortalViews.tsx  - Parent portal cockpit wrapper
        ├── FacultyPortalViews.tsx - Faculty portal view (Orphaned / Not integrated)
        ├── AccountantPortalViews.tsx- Accountant ledger and collection dashboard
        ├── AdminPortalViews.tsx   - Administrator portal settings and roster lists
        └── AdminAiInsightsView.tsx- Interactive mockup AI dashboard
```

---

## 2. Portals & Screens Inventory

### A. Student & Parent Portal
- **DashboardView**: Features summary cards, announcements marquee, and quick links.
- **AcademicsView**: Consists of sub-tabs:
  - *Attendance*: Displays presence ratio, calendar grid, and subject logs.
  - *Performance Marks*: Displays exam history, subject scores, and test timings.
  - *Tuition Ledger*: Displays installments, invoice sheets, and quick pay options.
  - *Report Card*: Displays terminal GPA and grade matrices.
  - *Honors & Certificates*: Displays verified badges.
- **UpdatesView**: Scrollable list of active bulletins and circulars.
- **ProfileView**: Mock Student ID card, primary contact details, and support tickets.
- **LeaveGatePassView**: Outing request form and mock QR gatepass.
- **HostelLifeView**: Displays room/bed details, block parameters, and rules.
- **ContactUniversityView**: Office directories and direct email buttons.
- **ParentPortalViews**: Parent-specific version of student cockpit.

#### Data Entities
- Student Profile (Polsani Manoneeth Rao, ID: 2421604)
- Academic Ledger (Tuition Fee, Installment receipts)
- Attendance records (Monthly presence calendar matrix)
- Timetable details (MPC weekly calendar schedule)
- Notice logs (Campus events & broadcasts)

### B. Accountant Portal (Bursar Ledger)
- **AccountantDashboardView**: The central cockpit which routes to:
  - *Student Search Console*: Search student profile database and edit bio fields.
  - *Fee Collection Desk*: Inspect dues, make partial/full payments, and choose payment mode.
  - *Attendance Mark Console*: Roster sections for students and lecturer attendance logs.
  - *Auditing Reports*: Transaction streams, targeted vs. realized collections, and ledgers.
  - *Hostel Room Admissions*: Room check-ins and block capacity updates.
  - *Late Fee Settings*: Overdue configurations.
  - *Scholarships Settings*: Discount waivers.
  - *Accountant Profile details*: Cashier bio credentials.

#### Data Entities
- Student database profiles (Varshith Rao, Aaditya Varma, Rahul Khanna, Sneha Reddy)
- Fee collection payments ledger (Receipt items, category totals)
- Hostel block allocations (Dorm capacities, assigned blocks/rooms)
- Attendance marking rosters (Present, absent, late status)

### C. Faculty Portal (Teacher Desk)
- **FacultyDashboardView**: Orphaned sub-views for taking attendance, uploading grades, viewing student lists, and composing broadcaster announcements.

#### Data Entities
- Student class list (MPC Section A)
- Test scores checklist (Unit Test 2, score values)
- Leave request list (Home leave requests)
- Circular announcer (Compose bulletin cards)

### D. Admin Portal (Dean Cockpit)
- **AdminDashboardView**: Central portal that routes to:
  - *Students Management*: Search students, edit profiles, register new profiles.
  - *Faculty Management*: Search faculty, edit profiles, register new profiles.
  - *Academic Fees*: Lock baseline tuition/hostel/transport/miscellaneous rates.
  - *Timetables & Calendar*: Upload schedule documents, register campus events.
  - *Examination Desk*: Schedule test parameters, upload CSV results spreadsheets, view merit lists.
  - *Class Sections*: Assign students to sections and assign faculty to classes.
  - *Late Fees, Scholarships, Bulletins*: Overdue fines and announcement composers.
  - *Dean Profile*: Principal bio coordinates.

#### Data Entities
- Student master list (Varshith Rao, Aaditya Varma, Rahul Khanna, Sneha Reddy)
- Teacher master list ( Roster of 4 lecturers)
- Academic baseline fee structures (Lockable amounts)
- Exam schedules & Merit list (Test titles, dates, ranks)

---

## 3. Mock Data Inventory

All mock data is hardcoded inside components. The application relies on the global `window` object to simulate state persistence across portals.

### Mock Data Files & Structures

#### 1. `src/views/AdminPortalViews.tsx`
- **`INITIAL_STUDENTS_LIST`**: Array of 4 student profiles. Contains tuition/hostel rates, email, contact, parent bio, section, roll, and receipt logs.
- **`INITIAL_TEACHERS_LIST`**: Array of 4 teacher profiles. Contains teacher IDs, assigned subjects, sections, and contact numbers.
- **`INITIAL_BULLETINS`**: Array of 4 campus announcements.
- **Persistence**: Read/written through `window._adminStudents`, `window._adminTeachers`, `window._adminBulletins`, and `window._adminAcademicFees`.
- **Consumer**: Directly consumed by local components in `AdminPortalViews.tsx`.

#### 2. `src/views/AccountantPortalViews.tsx`
- **`INITIAL_STUDENTS`**: Array of 4 student profiles. Contains tuition/hostel rates, correspondence/residential addresses, and receipt logs.
- **`INITIAL_ATTENDANCE_ROSTER`**: Array of 13 attendee profiles. Includes student sections and faculty leave status.
- **`INITIAL_SETTINGS`**: Settings object storing active academic year parameters.
- **Persistence**: Read/written through `window._erpMockStudents`, `window._erpMockAttendance`, and `window._erpMockSettings`.
- **Consumer**: Directly consumed by local components in `AccountantPortalViews.tsx`.

#### 3. `src/views/FacultyPortalViews.tsx`
- **Local Hardcoded Arrays**: State variables (`students`, `marksList`, `leaves`, `searchQuery`) are initialized to hardcoded lists.
- **Consumer**: Directly consumed by local components in `FacultyPortalViews.tsx` (unused in main app routing).

---

## 4. State Management & Data Flow

- **State Sync**: React `useState` hooks manage local UI fields. Updates to these state buffers are written back to global variables on the `window` object to simulate database writes.
- **No Service Abstractions**: The app does not contain an API service layer or standard mock directories. Components manipulate raw array elements in-memory.
- **Error/Loading States**: Implements a simple delayed `setTimeout` inside `useEffect` hooks to simulate server loading states (e.g., timed `isChecking` and `isLoading` screens). There is no network error handling.

---

## 5. Authentication & Roles

- **Fake PIN Pad**: The `PinView` does not compare the entered digits against a database hash. Entering any 6-digit numeric combination triggers a success callback.
- **Role Control**: The segment selector in `PinView` sets `portalRole` to `'student'`, `'admin'`, or `'accountant'`.
- **Persistence**: Roles are managed via the React NavigationContext and reset when the user logs out. The theme preference is saved to `localStorage` under `portal_theme_mode`.

---

## 6. File Upload & Parsing Features

- **Upload Action**: Uses hidden `<input type="file" />` elements wrapped in custom dashed labels in both the **Examination Desk** and **Timetables & Calendar** screens.
- **File Parsing**: No file parser libraries are present. Selecting a file triggers a change handler that extracts the file name and displays it.
- **Simulation**: Clicking "Parse & Upload Results" reads the file name, strips extensions, and appends a mock exam entry directly to the `exams` state list. The actual file contents are not read or processed.

---

## 7. PDF Generation

- **Receipt Print**: The "Download PDF / Print" button triggers `window.print()` inside a new browser tab.
- **Data Pull**: The handler dynamically writes an HTML document containing details of the selected transaction (receipt ID, amount paid, remaining balance, cashier name). No external PDF generator library is used.

---

## 8. Cross-Portal Data Dependencies

- **Data Isolation**: Although the Admin and Accountant portals perform actions that should logically affect each other (e.g., Admin locks fee rates, Accountant collects payments), they read from **separate** properties on the `window` object:
  - Admin Portal reads and writes to `window._adminStudents`.
  - Accountant Portal reads and writes to `window._erpMockStudents`.
- **Real-Time Simulation Gaps**: Any updates made in one portal are completely invisible to the other. The student portal relies on a separate set of hardcoded variables, meaning fee payments made by the Accountant do not reflect on the student's dashboard.

---

## 9. Environment & Config

- **Environment Variables**: No `.env` or configurations pointing to external API endpoints exist.
- **Package Scripts**:
  - `dev`: Runs Vite development server.
  - `build`: Compiles TypeScript files and bundles assets using Vite.
  - `lint`: Lints source files using oxlint.
  - `preview`: Serves compiled production build locally.
- **Node Environment**: Configured as an npm project (uses `package-lock.json`).

---

## 10. Security Gaps

- **Lack of Authorization**: The app lacks authentication guards. Any user can access administrative and financial screens by entering any 6 digits.
- **Exposed Global Variables**: Sensitive student records, parent contacts, and fee details are stored as unencrypted variables on the global `window` object.
- **Missing Input Validation**: Input fields (such as fee collections, class assignments, and student bio updates) accept empty, negative, or poorly formatted values.
- **In-Memory Data Loss**: All modifications (including fee collections, attendance rosters, and student record updates) are stored in-memory and are lost when the page is refreshed.

---

## 11. Known Inconsistencies or Incomplete Areas

- **Orphaned Faculty Portal**: The screens defined in `FacultyPortalViews.tsx` are not imported or linked in `App.tsx` or `ResponsiveLayout.tsx`.
- **Inconsistent Student Names**: The Student Portal displays information for **Polsani Manoneeth Rao**, while the Admin and Accountant portals display profiles for **Varshith Rao**, **Aaditya Varma**, **Rahul Khanna**, and **Sneha Reddy**.
- **No Real PDF Library**: PDF receipt generation relies entirely on browser print templates rather than generated document files.
