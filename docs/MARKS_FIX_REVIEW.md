# Marks & Roll Number Fix Review

This review document details the technical modifications, schema changes, and verification checks performed to resolve the roll number duplication and align the marking system to the Junior/Intermediate College out-of-300 standard.

---

## 1. Roll Number Duplication Resolution

### Root Cause
During seeding and data reconciliation, "Polsani Manoneeth Rao" (`STU-2421604`) and "Varshith Rao" (`STU-1001`) both resolved to the roll number `"24MPC01"`. This occurred because the database seed script lacked index integrity checks on the Mongoose model, allowing duplicates to be saved silently.

### Modifications Made
- **Student Schema (Mongoose Model)**: Added `unique: true` constraint to the `rollNumber` field in [student.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/models/student.ts#L65).
- **Database Seed (`seed.ts`)**: Assigned Polsani Manoneeth Rao the correct unique roll number `'2421604'` matching their original frontend mock profile parameters.
- **Database Reset**: Ran `npm run reset:demo-data` to purge the collection and verify that the unique index on `rollNumber` prevents duplicate entries.

---

## 2. Marks System Realignment (Out-of-300, No GPA)

### Modifications Made
- **ExamResult Schema (Mongoose Model)**:
  - Changed `score` from `String` to `Number` to store raw numeric marks in [examResult.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/models/examResult.ts#L18).
  - Introduced a required `maxMarks` `Number` field in the schema, defaulting to `300` in [examResult.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/models/examResult.ts#L19).
- **Backend Route (`/api/student/me/academics`)**:
  - Updated the response grouping helper `byTestTitle` to properly copy and return `score` and `maxMarks` as numbers in [student.ts](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/src/routes/student.ts#L79).
- **Seeding (`seed.ts`)**:
  - Modified exam results creation to generate raw numeric marks between `180` and `280` out of `300` (representing realistic Junior College MPC scores) and saved them with `maxMarks: 300`.
- **Frontend Views**:
  - Updated `studentService.ts` TypeScript types for `ExamResult` and `AcademicsData` to reflect numeric `score` and `maxMarks`.
  - **AcademicsView (Report Card Ring)**: Replaced the hardcoded results progress offset animation with a dynamic mathematical calculation: `resultsOffset = 282.7 * (1 - cumulativeTotal / 300)`. Added `academicsData` to the `useEffect` dependencies so it animates automatically when data is fetched.
  - **AcademicsView (Subject Progress Bars)**: Changed the width calculation from a raw percentage assumption to divide by the actual subject maximum marks: `width = (score / max) * 100`. Adjusted subject fallback mock cards to be out of 300.
  - **Dashboard & Parent Cockpits**: Replaced simple marks averages with percentage calculations dividing obtained score by `maxMarks` so values do not overshoot the progress rings (preventing values like `240%` from displaying).

---

## 3. Re-verification Logs

### Compilation Checks
- **Backend**: `npx tsc --noEmit` -> Succeeded with 0 compilation errors.
- **Frontend**: `npx tsc --noEmit` -> Succeeded with 0 compilation errors.

### API & Login Checks
Ran local verification HTTP requests to test authentication and role context resolving:
1. **Student Login (`STU-2421604`)**: Succeeded with PIN `123456`.
2. **Profile context**: Resolved to Polsani Manoneeth Rao with Roll Number `'2421604'`.
3. **Academics Data**: Fetched live results successfully. Physics exam record validated with `Score: 255 (Number)` and `MaxMarks: 300 (Number)`.
4. **Parent Login (`parent`)**: Succeeded with PIN `111111`, resolving correctly to child Polsani Manoneeth Rao and father Mr. Satish Rao.

---

## 4. Questions for the Human Reviewer

Please review the following design questions regarding the marks layout:

1. **Partial / Incomplete Exams**:
   How should the system handle and display exams where a student is absent or does not have scores logged for all core subjects? Should the missing subject show as "N/A", or count as `0` in the overall average score calculation?

2. **Subject-specific Max Marks**:
   Do all subjects (e.g. Physics, Chemistry, Mathematics, English) share the same `maxMarks` of 300 per test, or do some subjects/languages have different max marks (e.g. 100 or 150) in certain tests? (We designed the database to support variable `maxMarks` per exam result, but defaults to 300).

3. **Empty Results / Zero Exams**:
   For a student who has not taken any tests yet, what should the Report Card progress ring and breakdown list display? Should they show a friendly placeholder state or default to `0 / 300`?

4. **Report Card layout vs Marks list layout**:
   Currently, the "Report Card" tab displays the mathematical average marks obtained out of 300 along with subject-specific averages, while the "Marks" tab displays a list of completed test categories. Should the "Report Card" also show raw totals of actual terminal exams (e.g. Quarterly, Half-Yearly) instead of a simple rolling average of all logged results?
