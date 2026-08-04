# URGENT AUTH AUDIT REPORT

**Timestamp**: 2026-08-04T14:30:00+05:30  
**Target Application**: Inspire ERP (`inspirecolleges.vercel.app`)  
**Audit Trigger**: Urgent — Login fails at credential step with "Incorrect User ID or Account Password".

---

## STEP 1 — Git Diff Audit & Unreviewed Changes Analysis

Below is the chronological log of all commits made since the last known-good verified state (`e3f95d3` / `5ffeca7`), along with analysis of changes affecting authentication and serverless startup.

### Commit History (Recent to Oldest)

1. `4b389ec` — **Harden Vercel API app loading**
   - **Modified**: `api/index.js`
   - **Diff**:
```diff
diff --git a/api/index.js b/api/index.js
index 38db50a..dff8bf9 100644
--- a/api/index.js
+++ b/api/index.js
@@ -1,6 +1,8 @@
 // api/index.js
-// Vercel Serverless Function Handler wrapping Express app with cached Mongo connection
+// Vercel Serverless Function Handler wrapping the Express app with a safe
+// lazy loader so production can prefer the bundled dist build when available.
 import { createRequire } from 'module';
+import fs from 'fs';
 import path from 'path';
 import { fileURLToPath } from 'url';
 
@@ -8,16 +10,25 @@ const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const require = createRequire(import.meta.url);
 
-const appPath = path.resolve(__dirname, '../server/app.cjs');
+const distAppPath = path.resolve(__dirname, '../dist/server.cjs');
+const sourceAppPath = path.resolve(__dirname, '../server/app.cjs');
 
-const expressApp = require(appPath);
+function loadExpressApp() {
+  if (fs.existsSync(distAppPath)) {
+    return require(distAppPath);
+  }
+
+  return require(sourceAppPath);
+}
 
 export default async function handler(req, res) {
   try {
+    const expressApp = loadExpressApp();
     const app = typeof expressApp === 'function' ? expressApp : (expressApp && expressApp.default) || expressApp;
     if (typeof app !== 'function') {
       throw new Error('Express app module failed to export a valid function handler.');
     }
+
     return app(req, res);
   } catch (err) {
     console.error('Vercel Serverless Function Error:', err.stack || err.message || err);
```
   - **Impact**: 🚨 **CRITICAL REGRESSION**. Loaded stale `dist/server.cjs` bundle instead of live `server/app.cjs`, completely bypassing all fixes made in `server/app.cjs`!

2. `3c2cc38` — **Accept legacy plaintext auth secrets**
   - **Modified**: `server/app.cjs`
   - **Impact**: Introduced `safeSecretMatch` fallback comparing plaintext fields.

3. `3d45559` — **Remove hardcoded MongoDB fallback**
   - **Modified**: `server/app.cjs`
   - **Impact**: 🚨 **CRITICAL REGRESSION**. Removed `await connectToDatabase()` from `/api/auth/verify-credentials` and `/api/auth/login` hot paths.

4. `ce55a4c` — **Remove auth DB waits from hot path**
   - **Modified**: `server/app.cjs`
   - **Impact**: DB connection was skipped entirely on serverless function invocations.

5. `fa57a45` — **Allow Vercel API auth fallback on DB failure**
   - **Modified**: `server/app.cjs`

---

## STEP 2 — Real Root-Cause Determination

### 1. Live Site Raw Response Capture
When attempting login on `https://inspirecolleges.vercel.app` with real credentials (`admin1` / `RectorPass#2026`):

- **`/api/auth/verify-credentials` POST response**:
  - **Status Code**: `500 Internal Server Error`
  - **Raw Response Body**:
    ```json
    {
      "status": "error",
      "message": "ENOENT: no such file or directory, mkdir '/var/task/backups'"
    }
    ```

- **`/api/auth/login` POST response**:
  - **Status Code**: `500 Internal Server Error`
  - **Raw Response Body**:
    ```json
    {
      "status": "error",
      "message": "Cannot overwrite `Enquiry` model once compiled."
    }
    ```

### 2. MongoDB Direct Database Inspection
Direct query executed against production MongoDB Atlas instance via node script:
- **`admin1` Record**:
  - **`username`**: `admin1`
  - **`password`**: `$2b$10$LQppbiaDGiA0dJSmws7MWOyhoR2vpAoMfCzsGGk76y1SeqkW5.Jiu`
  - **`bcrypt.compareSync('RectorPass#2026', hash)`**: `true` ✅
  - **`pin`**: `$2b$10$8Ss5aS5VtCJnNMzCn/ETJO8VYAL6tSyrh.bxSRh79wp579Uqns0FW`
  - **`bcrypt.compareSync('346398', pinHash)`**: `true` ✅
- **`9059068384` Record**:
  - **`username`**: `9059068384`
  - **`password`**: `$2b$10$okvn2NRn0jpSBKiZetX.g.kVTM43vtr3L5fBLGKqLaXIihk/WBhgy`
  - **`bcrypt.compareSync('00112233', hash)`**: `true` ✅
  - **`pin`**: `$2b$10$pn6C0q5uL2czFFwlz/EPS.S7G0UtkM1oACzD/eNyEMWGwk6DDNlBW`
  - **`bcrypt.compareSync('789456', pinHash)`**: `true` ✅

**Conclusion**: Database credentials are NOT corrupted or missing. Passwords and PINs in MongoDB are 100% intact and valid.

### 3. Execution Code Path Failure Breakdown
The login failure was caused by 4 compounding bugs introduced in unreviewed sessions:

1. **`api/index.js` Stale Bundle Execution**: `api/index.js` served `dist/server.cjs` (an old static build) whenever `dist/` existed, ignoring `server/app.cjs`.
2. **`backupService.cjs` Read-Only Crash**: Top-level code executed `fs.mkdirSync('/var/task/backups')`. In Vercel serverless environment, `/var/task` is read-only, throwing `ENOENT` on every cold start.
3. **`Enquiry.cjs` Mongoose Overwrite Error**: `Enquiry.cjs` used `module.exports = mongoose.model('Enquiry', enquirySchema)` without checking `mongoose.models.Enquiry`, throwing `Cannot overwrite Enquiry model once compiled`.
4. **Missing Database Connections**: `connectToDatabase()` was removed from `/api/auth/verify-credentials` and `/api/auth/login`.

---

## STEP 3 & STEP 4 & STEP 5 — Implementation & Verification Summary

*(Pending execution after plan approval)*
