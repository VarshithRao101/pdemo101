# Database Connection & Isolation Report

This document records the configuration, isolation logic, safety measures, and data migrations established to isolate the Junior College ERP backend from other databases on the MongoDB cluster.

---

## 1. Database Configuration Details

- **Target Database Name**: `jc_erp_demo`
- **Connection Library**: Mongoose
- **Configured Connection Options**:
  ```typescript
  { dbName: "jc_erp_demo" }
  ```
  This guarantees that all schemas, models, and actions automatically lock onto the `jc_erp_demo` database context only.

---

## 2. Safety & Isolation Verification Checklist

- [x] **Single-Database Target**: Mongoose connection is explicitly configured with `dbName: 'jc_erp_demo'`.
- [x] **Zero-Touch Clause**: No queries, inserts, deletes, or drops will be issued to any other databases (such as `unigames` or others) on this shared MongoDB cluster.
- [x] **Clean-State Boot Guard**: On boot, the server queries the list of collections in `jc_erp_demo`. If any collections exist, the server warns and halts execution immediately.
  > [!NOTE]
  > To bypass this empty guard on subsequent runs (when the database has already been seeded), set the environment variable `BYPASS_DB_EMPTY_CHECK=true` in `/server/.env`.
- [x] **Seed Safety Check**: The seed script checks each model's collection count before writing. If any collection has documents, it prints a list of non-empty collections and aborts execution to protect existing data.

---

## 3. Created Collections List
The following collections were created under the `jc_erp_demo` database:
1. `students`: Merged profiles containing student info, roll numbers, sections, files, and billing balances.
2. `teachers`: Faculty records containing assigned classes, sections, subjects, and salaries.
3. `bulletins`: Notice board broadcasts, events, and circulars.
4. `attendancerecords`: Daily attendance entries for both students and teachers (dynamic reference mapping).
5. `feepayments`: Payment transactions (UPI, cash, credit cards) created by accountants.
6. `academicfeesettings`: Singleton configuration for lockable fee rates and billing rules.
7. `examresults`: Academic scores linked to students.
8. `timetableentries`: Weekly schedules mapped to teacher references.
9. `users`: Credentials containing logins for student, parent, accountant, faculty, and admin roles.

---

## 4. Student Data Reconciliation Summary
During the seeding process, the mock data arrays from the Admin and Accountant views were reconciled as follows:
- **Overlapping Profiles (STU-1001, STU-1002)**: Successfully merged. Profile metadata (documents, branch, sections, course, roll numbers) from the Admin views were combined with the billing/transaction logs from the Accountant views.
- **Accountant-Only Profiles (STU-1003, STU-1004)**: Created with full billing structures. Assigned fallback academic fields (MPC course, Section A, Madhapur branch) and incremental roll numbers (`24MPC03` and `24MPC04` respectively).
- **Roster-Only Attendees (STU-1005 to STU-1009)**: Seeding automatically created Student records for Pooja Hegde, Prabhas Kumar, Allu Arjun, NTR Rama Rao, and Vijay Deverakonda with respective courses and sections matching their attendance list details to maintain referential integrity.
- **Student Dashboard Mock (STU-2421604)**: Created a profile for `Polsani Manoneeth Rao` matching the exact roll number and hostel details displayed in the student view files, linking initial payments (`REC-2026-007` and `REC-2026-008`).

---

## 5. Seed & Reset Command Reference

Manage your demo data using these scripts run from the `/server` directory:

### Run Seeding (Safely populates if database is empty)
```bash
npm run seed
```

### Run Full Reset (Wipes all collections in `jc_erp_demo` and reseeds)
```bash
npm run reset:demo-data
```

---

## 6. How to Cleanly Delete the Demo Database

When testing is complete and you want to clean up the demo database from your MongoDB cluster, use either of these methods:

### Option A: Via Mongo Shell (`mongosh`)
Run the following commands in your terminal:

```bash
# 1. Connect to your cluster (substitute your real password)
mongosh "mongodb+srv://beesociety101_db_user:<password>@unigames.nsd3xeu.mongodb.net/"

# 2. Switch to the target database
use jc_erp_demo

# 3. Drop the database
db.dropDatabase()
```

### Option B: Via MongoDB Compass
1. Connect MongoDB Compass to your cluster.
2. In the left navigation panel or the main **Databases** list, find `jc_erp_demo`.
3. Click the **Trash/Delete** icon next to the database name.
4. Enter the database name `jc_erp_demo` when prompted to confirm, and click **Drop Database**.
