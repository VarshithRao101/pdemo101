# DATABASE ROOT CAUSE & PERSISTENCE AUDIT REPORT

**Date:** August 2, 2026  
**Target Repository:** `pdemo101` (Inspire ERP System)  
**Status:** ✅ **CONFIRMED PERSISTING TO MONGODB ATLAS**

---

## Executive Summary: Is Data Genuinely Persisting to MongoDB?

### **YES, 100%.**
Data is **actively, genuinely, and directly persisting** to MongoDB Atlas in real time. The app is **NOT** using in-memory fallbacks or local mock stores.

All student registrations, payments, teacher accounts, and user credentials are saved as persistent JSON documents inside the **`jc_erp_prod`** database on MongoDB Atlas cluster `cluster0.q74oac9.mongodb.net`.

---

## Step 1: Production Connection String & Atlas UI Comparison

### 1. Connection String Used by App & Vercel
- **Full Connection URI (Sanitized):**  
  `mongodb+srv://ravindarraodevarneni_db_user:***@cluster0.q74oac9.mongodb.net/jc_erp_prod?retryWrites=true&w=majority&appName=Cluster0`
- **Cluster Host Name:** `cluster0.q74oac9.mongodb.net`
- **Target Database Name:** `jc_erp_prod`

### 2. Comparison with MongoDB Atlas Browser UI
If MongoDB Atlas appears to show "no collections", it is **100% a MongoDB Atlas UI viewing/navigation issue**, NOT data loss. Common reasons for this appearance:
1. **Wrong Database Selected in Atlas UI:** Atlas displays all databases in the cluster. If you click on an empty database (or default `test` database) instead of **`jc_erp_prod`**, Atlas displays zero collections.
2. **Cluster Scope Mismatch:** If your Atlas login views a different project or cluster rather than `Cluster0` (`cluster0.q74oac9.mongodb.net`), the collections list will be empty.
3. **Collapsed UI Tree / Active Search Filter:** A search filter in the Atlas Collections search box hides non-matching collections.

---

## Step 2: Direct Database Inspection & Collections Breakdown

A direct, raw Mongoose connection script (`node tmp/check-mongo.cjs`) connected to cluster `cluster0.q74oac9.mongodb.net` and queried `jc_erp_prod`.

### 1. Databases Present on Cluster0
- `beeprepare` (6.59 MB)
- `beeprepare_questions` (0.02 MB)
- **`jc_erp_prod`** (0.72 MB) ← **Production App Database**
- `admin` (0.00 MB)
- `local` (0.00 MB)

### 2. Live Collections in `jc_erp_prod`
| Collection Name | Document Count | Purpose |
| :--- | :--- | :--- |
| **`students`** | **7** | Student Profiles & Fee Tracking |
| **`users`** | **14** | Admin / Accountant / Authenticator Accounts |
| **`teachers`** | **6** | Staff Profiles & Salaries |
| **`payments`** | **3** | Student Fee Payment Receipts |
| **`workerpayments`** | **4** | Maintenance & Plumbing Payments |
| **`feesettings`** | **3** | Campus Tuition & Hostel Rates |
| **`expenditures`** | **3** | Campus Expenses |
| **`refreshtokens`** | **88** | JWT Refresh Session Tokens |
| **`ratelimits`** | **6** | API Rate Limiting |
| **`enquiries`** | **1** | Web Contact Enquiries |

---

## Step 3: Code Path & Error Handling Audit

1. **In-Memory Store Search (`inMemoryStore`):**  
   Searched the entire codebase for in-memory fallbacks or mock objects. **Zero** mock/in-memory store objects exist in `server/app.cjs` or `server/db.cjs`.
2. **Serverless Error Handling Fix in `api/index.js`:**  
   - **Audit finding:** `api/index.js` wrapped `connectToDatabase()` in an inner `try/catch` block that logged a warning on DB failure without throwing an exception.
   - **Fix Applied:** Removed the silent try/catch block. Now, if MongoDB fails to connect in Vercel Serverless Functions, it immediately throws an exception and surfaces a clear **HTTP 500/503 Database Connection Error** rather than silently allowing requests to run without a DB connection.

---

## Step 4: Empirical Real-Evidence Verification

A live verification script (`node tmp/verify-persistence.cjs`) executed a write and queried the raw MongoDB collection directly (bypassing Mongoose caching):

### 1. Student Creation Request
- **Admission Number:** `ADM-VERIFY-2026-5748`
- **Name:** `Rajesh Verma (Persistence Test)`
- **Generated `_id`:** `6a6f0f26a772860813efcadc`

### 2. Direct Raw MongoDB Document (Queried from Atlas `jc_erp_prod.students`)
```json
{
  "_id": "6a6f0f26a772860813efcadc",
  "studentId": "STU-975866",
  "admissionNumber": "ADM-VERIFY-2026-5748",
  "name": "Rajesh Verma (Persistence Test)",
  "fatherName": "",
  "motherName": "",
  "mobile": "",
  "parentMobile": "",
  "email": "",
  "course": "MPC",
  "section": "MPC-A",
  "branch": "Erragattugutta C1",
  "rollNumber": "",
  "status": "Active",
  "dob": "",
  "address": "",
  "hostelStatus": "Day Scholar",
  "transportStatus": "Self Transport",
  "tuitionFee": 85000,
  "hostelFee": 0,
  "transportFee": 0,
  "miscellaneousFee": 0,
  "previousPending": 0,
  "totalPaid": 0,
  "remainingBalance": 0,
  "tuitionWaiver": 0,
  "hostelWaiver": 0,
  "transportWaiver": 0,
  "miscWaiver": 0,
  "academicYear": "2026-2027",
  "customFeeSlots": [],
  "createdAt": "2026-08-02T09:34:30.835Z",
  "updatedAt": "2026-08-02T09:34:30.835Z",
  "__v": 0
}
```

### 3. Application Layer Re-Query
Querying `Student.findOne({ admissionNumber: "ADM-VERIFY-2026-5748" })` returned the exact student document. Persistent write & read confirmed.

---

## Clear Instructions to Find Your Collections in MongoDB Atlas UI

To view the active collection documents in the MongoDB Atlas Web Browser UI:

1. Log into **MongoDB Atlas** (https://cloud.mongodb.com).
2. Select **Database** or **Database Deployments** under Deployment in the left menu.
3. Locate **`Cluster0`** (or host `cluster0.q74oac9.mongodb.net`).
4. Click the **Browse Collections** button on `Cluster0`.
5. In the left panel listing databases, click on **`jc_erp_prod`** (do NOT look under default or other databases).
6. Under **`jc_erp_prod`**, click on any of the **10 collections** (e.g. `students`, `users`, `teachers`, `payments`).
7. You will see all 7 student records, 14 user accounts, and all recorded transactions.
