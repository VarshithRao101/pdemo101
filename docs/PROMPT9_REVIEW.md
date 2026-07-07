# PROMPT 9 REVIEW — Admin1 Campus Operations: Full Live-Data Wiring

**Date:** 07 July 2026
**Scope:** Admin1 (Campus Operations) portal — real spreadsheet upload parsing, student/faculty CRUD, attendance/reports aggregation, cross-portal synchronization, verification.
**Touch boundary:** Student Portal, Accountant Portal, Admin2 routing were NOT touched.

---

## 1. Summary of Changes

### 1.1 Real Multipart File Upload — Backend (`server/src/routes/admin1.ts`)

**Problem (AUDIT.md §6):** Both `POST /api/admin1/timetable/upload` and `POST /api/admin1/exams/upload` were fake — they read only the filename and never parsed file contents.

**Fix:** Rewrote both routes using:
- **`multer`** (memory storage) for multipart file ingestion
- **`xlsx` (SheetJS v0.18.5)** for spreadsheet parsing (`XLSX.read(buffer)` + `sheet_to_json`)

#### Timetable Upload — `POST /api/admin1/timetable/upload`

| Field (multipart) | Required | Notes |
|---|---|---|
| `file` | YES | .csv, .xlsx, .xls |
| `section` | YES | e.g. Section A |

**Spreadsheet columns:** `day`, `period`, `subject`, `teacherId` (or `teacherName`)

**Per-row validation:**
1. Missing `day` → skip row, add error
2. Missing `period` → skip row, add error
3. Missing `subject` → skip row, add error
4. Missing `teacherId` → skip row, add error
5. Teacher reference not found (FAC-xxx ID or fuzzy name match) → skip, add error
6. On success: deletes all existing TimetableEntry docs for that section, then insertMany valid rows atomically

#### Exam Results Upload — `POST /api/admin1/exams/upload`

| Field (multipart) | Required | Notes |
|---|---|---|
| `file` | YES | .csv, .xlsx, .xls |
| `testTitle` | optional | falls back to filename |
| `date` | optional | falls back to today |

**Spreadsheet columns:** `rollNumber`, `subject`, `score`, `maxMarks` (optional — defaults to 100), `testTitle`, `date`

**Per-row validation:**
1. Missing `rollNumber` → skip
2. Roll number not in Student collection → skip + report
3. Missing `subject` → skip
4. Missing or empty `score` → skip
5. Non-numeric or negative `score` → skip
6. `maxMarks` absent → **defaults to 100** (Marks-Fix standard, each subject out of 100)
7. `score > maxMarks` → skip

**Upsert key:** `{ student, subject, testTitle }` — re-uploading same test title overwrites marks, no duplicates.

---

### 1.2 Library Choice: SheetJS (`xlsx` v0.18.5)

- Handles both `.xlsx` and `.csv` via a single `XLSX.read(buffer)` call
- Memory-efficient: works directly on multer memoryStorage buffer, no disk I/O
- `sheet_to_json` returns plain row objects — column-by-column validation is straightforward
- Alternative (`csv-parse`) would only handle CSV, not Excel — `xlsx` covers both

---

### 1.3 Frontend Upload Integration (`src/views/AdminPortalViews.tsx`)

Added four state variables:
```ts
const [timetableUploading, setTimetableUploading] = useState(false);
const [timetableUploadStatus, setTimetableUploadStatus] = useState<any>(null);
const [examUploading, setExamUploading] = useState(false);
const [examUploadStatus, setExamUploadStatus] = useState<any>(null);
```

Both submit handlers now:
1. Build a `FormData` with the raw `File` reference
2. Call `admin1Service.uploadTimetable(file, section)` / `admin1Service.uploadExamResults(file, testTitle, date)`
3. Show a loading spinner during the upload
4. Display a rich post-upload summary: total / succeeded / failed counts + per-row error list with row number and human-readable reason

---

### 1.4 API Client FormData Fix (`src/services/apiClient.ts`)

Added `instanceof FormData` detection in `apiClient.post` / `apiClient.request`:
- `FormData` body → passed directly, no `Content-Type` override (browser sets the multipart boundary)
- JSON body → `JSON.stringify` as before

---

### 1.5 Student Registry CRUD (`server/src/routes/admin1.ts`)

- `GET /api/admin1/students` — list with optional `?search=` (regex on name, rollNumber, admissionNumber, section)
- `PATCH /api/admin1/students/:id` — update non-financial fields

**Financial field guard:** The following fields are deleted from `req.body` before update (Admin2-only):
```
tuitionFee, hostelFee, transportFee, miscellaneousFee,
previousPending, totalPaid, remainingBalance, receipts
```
Confirmed in Test 3: sending `tuitionFee: 9999999` had zero effect on the stored value.

---

### 1.6 Faculty Management (`server/src/routes/admin1.ts`)

Faculty are reference-only (no login). Admin1 can view and update reference fields:
- `GET /api/admin1/teachers` — full roster
- `PATCH /api/admin1/teachers/:id` — update name, subject, contact, qualification

`findTeacherByIdentifier` helper resolves either MongoDB `_id` or custom `FAC-xxx` ID without CastError.

---

### 1.7 Attendance Summary (`GET /api/admin1/attendance-summary`)

Reads from the **shared `AttendanceRecord` collection** — the same one the Accountant Portal writes to. No parallel collection.

Aggregation:
1. Finds all student `AttendanceRecord` docs (optional `?startDate=&endDate=` filter)
2. Joins each record to its student's section via the Student model
3. Groups by section → `{ total, present, absent, ratio }`
4. Separately counts faculty attendance (Teacher targetModel records)
5. Returns `{ sections[], totals: { studentsPresent, studentsAbsent, facultyPresent, facultyAbsent } }`

---

### 1.8 Reports Dashboard (`GET /api/admin1/reports`)

Three live aggregations — no static mock data:
1. **Enrollment by Section** — `Student.aggregate($group by section)`
2. **Enrollment by Course** — `Student.aggregate($group by course)`
3. **Attendance Trends (last 7 days)** — `AttendanceRecord.aggregate($group by date)`, returns `{ date, ratio }[]`

---

### 1.9 Seed Fix (`server/src/scripts/seed.ts`)

Seeded ExamResult documents previously had `maxMarks: 300` (wrong — each subject is out of 100). Fixed:
```diff
- const score = Math.floor(180 + Math.random() * 100); // 180-280
- maxMarks: 300,
+ const score = Math.floor(55 + Math.random() * 40); // 55-95 (per subject out of 100)
+ maxMarks: 100, // 3 subjects x 100 = combined 300
```

---

### 1.10 tsconfig.json Fix (`server/tsconfig.json`)

Added `resolveJsonModule: true`, `sourceMap: true`, and an explicit `exclude` block for `node_modules` and `dist`. Kept `ignoreDeprecations: "6.0"` which is required to silence the `moduleResolution=node10` deprecation in TypeScript 6.x.

---

## 2. Verification Test Results

Automated integration test: `node verify_admin1.js` (from `server/` directory). **All 9 tests passed.**

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | `POST /auth/login` as admin1 | JWT token returned | PASS |
| 2 | `GET /admin1/students` | 10 students, STU-2421604 present | PASS |
| 3 | `PATCH /admin1/students/:id` | Name/mobile updated, tuitionFee NOT mutated | PASS |
| 4 | Admin1 on Admin2 route `/admin/fee-settings` | 403 Forbidden | PASS |
| 5 | Exam upload (5 rows: 1 valid, 4 invalid) | total=5, succeeded=1, failed=4 | PASS |
| 6 | Timetable upload (3 rows: 1 valid, 2 invalid) | total=3, succeeded=1, failed=2 | PASS |
| 7 | `GET /admin1/attendance-summary` | Section A + B breakdown | PASS |
| 8 | `GET /admin1/reports` | Enrollment + trends | PASS |
| 9 | Student Portal Academics shows Physics 85/100 | Cross-portal sync confirmed | PASS |

### Error messages (Tests 5 & 6)

**Exam upload errors:**
```
Row 3: Student with roll number "BAD_ROLL_999" not found
Row 4: Score (150) exceeds maximum marks (100)
Row 5: Invalid score "-5". Must be a non-negative number
Row 6: Invalid score "abc". Must be a non-negative number
```

**Timetable upload errors:**
```
Row 3: Teacher reference "BAD_FAC" not found in database
Row 4: Missing day column or value
```

---

## 3. Cross-Portal Consistency Checks

| Check | Result |
|---|---|
| Admin1 uploads exam result → Student Portal Academics shows it | CONFIRMED (Physics 85/100 visible immediately) |
| Accountant writes AttendanceRecord → Admin1 Attendance Summary reflects it | CONFIRMED (Section A: 4/6 present, Section B: 3/3 present) |
| Admin1 patches student section → Accountant Portal student search returns updated section | CONFIRMED (same MongoDB collection, no cache) |

---

## 4. Complete Admin1 Route Table

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin1/students` | List/search students |
| PATCH | `/api/admin1/students/:id` | Update non-financial fields |
| DELETE | `/api/admin1/students/:id` | Soft-deactivate student |
| GET | `/api/admin1/teachers` | List all faculty |
| PATCH | `/api/admin1/teachers/:id` | Update faculty reference fields |
| GET | `/api/admin1/bulletins` | List bulletins |
| POST | `/api/admin1/bulletins` | Create bulletin |
| PATCH | `/api/admin1/bulletins/:id` | Edit bulletin |
| DELETE | `/api/admin1/bulletins/:id` | Delete bulletin |
| GET | `/api/admin1/timetable?section=` | Get timetable for section |
| POST | `/api/admin1/timetable` | Add single entry |
| PATCH | `/api/admin1/timetable/:id` | Edit entry |
| DELETE | `/api/admin1/timetable/:id` | Remove entry |
| POST | `/api/admin1/timetable/upload` | Bulk upload via CSV/XLSX |
| GET | `/api/admin1/sections` | List all distinct sections |
| POST | `/api/admin1/sections/allocate` | Assign student/teacher to section |
| GET | `/api/admin1/exams` | List scheduled exams |
| POST | `/api/admin1/exams` | Schedule new exam |
| PATCH | `/api/admin1/exams/:id` | Update exam status/publish |
| POST | `/api/admin1/exams/upload` | Bulk upload exam grades via CSV/XLSX |
| GET | `/api/admin1/attendance-summary` | Aggregated attendance stats |
| GET | `/api/admin1/reports` | Enrollment + attendance trends |

All routes protected by `authenticateJWT` + `authorizeRoles('admin1')`.

---

## 5. Open Questions

| # | Item | Notes |
|---|---|---|
| 1 | Re-seed for maxMarks fix | seed.ts now generates correct per-subject scores. Existing DB data needs a re-seed or one-time migration script to fix maxMarks: 300 records already in the database. |
| 2 | Faculty login | Teachers have no User doc. Faculty login was permanently removed as a final decision. If this decision is ever reversed, a User-Teacher link would need to be added. |
| 3 | Exam results grouping UI | Student Portal Academics shows flat exam results. Future enhancement: group by testTitle and show a combined row (sum of 3 subjects = out of 300). |
