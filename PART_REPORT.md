# Part 4 — Fix Per-Actor Audit Logging & Authenticator PIN Display

## Step 1 & 2 Summary

1. **Per-Actor Audit Logging**:
   - Updated `syncJournalSchema` in `server/app.cjs` to include `actorUsername` and `actorRole` fields.
   - Updated `logSyncJournal(action, branch, status, errorDetails = '', reqUser = null)` function to automatically extract `actorUsername` and `actorRole` from `req.user`.
   - Updated all mutating endpoints (`POST /api/accountant/students/:id/payments`, `POST /api/admin2/expenditure`, `PATCH /api/admin2/fee-settings`, `CREATE_ACCOUNT`, `EDIT_CREDENTIALS`, `DELETE_ACCOUNT`, etc.) to pass `req.user` to `logSyncJournal`.

2. **Fixed Authenticator PIN Display**:
   - Updated `GET /api/authenticator/pins` to identify the fixed security authenticator account (`9059068384` / `authenticator`).
   - Rather than returning a misleading daily rotating PIN value, it returns `{ "fixed": true, "note": "Static credential, not rotating", "pin": "080200" }`.
   - Confirmed `requireSecurityOtp` continues to enforce and accept `080200` for authenticator operations.

---

## Step 3 — Verification Evidence

### 1. Per-Actor Attributed Audit Log Evidence (From Live Deployment)

#### Action A: Fee Payment by Campus Accountant (`accountant_erragattugutta_c1_1`)
```json
{
  "_id": "tx_1784731639120_461",
  "transactionId": "TX-1784731639120-8414",
  "timestamp": "2026-07-22T14:47:19.120Z",
  "sourceNode": "Inspire ERP Central Server",
  "action": "POST /api/accountant/students/stu_101/payments",
  "branch": "Erragattugutta C1",
  "status": "success",
  "actorUsername": "accountant_erragattugutta_c1_1",
  "actorRole": "accountant",
  "errorDetails": "",
  "createdAt": "2026-07-22T14:47:19.121Z",
  "updatedAt": "2026-07-22T14:47:19.121Z",
  "__v": 0
}
```

#### Action B: Expenditure Post by Campus Principal (`admin2_erragattugutta_c1`)
```json
{
  "_id": "tx_1784731641125_136",
  "transactionId": "TX-1784731641125-2503",
  "timestamp": "2026-07-22T14:47:21.125Z",
  "sourceNode": "Inspire ERP Central Server",
  "action": "POST /api/admin2/expenditure",
  "branch": "Erragattugutta C1",
  "status": "success",
  "actorUsername": "admin2_erragattugutta_c1",
  "actorRole": "admin2",
  "errorDetails": "",
  "createdAt": "2026-07-22T14:47:21.125Z",
  "updatedAt": "2026-07-22T14:47:21.125Z",
  "__v": 0
}
```

---

### 2. Corrected Authenticator PIN Display Response (`GET /api/authenticator/pins`)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "rotationSchedule": "Daily at 00:00 UTC (Midnight)",
  "currentDate": "2026-07-22",
  "dailyPins": {
    "admin1": "419669",
    "admin2": "693644",
    "admin2_erragattugutta_c1": "662762",
    "admin2_erragattugutta_c2": "561307",
    "admin2_beemaram_c1": "971415",
    "admin2_beemaram_c2": "681142",
    "accountant": "380075",
    "accountant_erragattugutta_c1_1": "595545",
    "accountant_erragattugutta_c1_2": "887993",
    "accountant_erragattugutta_c2_1": "802528",
    "accountant_beemaram_c1_1": "515963",
    "accountant_beemaram_c2_1": "638577",
    "9059068384": {
      "fixed": true,
      "note": "Static credential, not rotating",
      "pin": "080200"
    },
    "authenticator": {
      "fixed": true,
      "note": "Static credential, not rotating",
      "pin": "080200"
    }
  }
}
```
