# PHASE 10 — Input Validation: Mobile Number & Fee Cap

## Summary

Two hard limits are now enforced at every relevant write path, both frontend and backend:

| Rule | Detail |
|---|---|
| Mobile number | Exactly 10 digits. Spaces and dashes are stripped before checking, so `98765 43210` is accepted; letters, extra digits, or short numbers are rejected. Empty is allowed (field is optional). |
| Student fee cap | Combined total (tuitionFee + hostelFee + transportFee + miscellaneousFee + previousPending + sum of all customFeeSlots) must not exceed **Rs. 10,00,000**. Rejection message shows the actual attempted total and the cap. |

---

## STEP 1 — Mobile Number Validation

### Design decision: strip spaces/dashes, reject everything else
Spaces and dashes are stripped before the digit check (`98765-43210` → `9876543210` passes). Any non-digit character other than space/dash (e.g. `+91...`, letters, parentheses) causes rejection. This matches what real users type while still being strict about the underlying 10 digits.

### Backend (`server/app.cjs`)

**New helpers added at the top:**
```js
function isValidMobile(val) {
  if (!val && val !== 0) return false;
  const digits = String(val).replace(/[\s\-]/g, '');
  return /^\d{10}$/.test(digits);
}
const MAX_STUDENT_FEE = 1000000; // Rs. 10,00,000
function calcStudentGrossFees(tuitionFee, hostelFee, transportFee, miscellaneousFee, previousPending, customFeeSlots) { ... }
```

**Validation applied at:**

| Route | Fields Validated |
|---|---|
| `POST /api/admin1/students` (createStudentHandler) | `mobile`, `parentMobile` |
| `PATCH /api/admin1/students/:id` (student edit) | `mobile`, `parentMobile` if present in body |
| `POST /api/admin1/teachers` (teacher create) | `mobile` if provided |
| `PATCH /api/admin1/teachers/:id` (teacher edit) | `mobile` if present in body |
| `POST /api/enquiries` (public enquiry) | `mobile` |

**Response on failure (HTTP 400):**
```json
{ "status": "error", "message": "Mobile number must be exactly 10 digits." }
{ "status": "error", "message": "Parent mobile number must be exactly 10 digits." }
```

### Frontend (`src/views/AdminPortalViews.tsx`)

**Module-level helper:**
```ts
const validateMobile = (val: string): string | null => {
  if (!val || val.trim() === '') return null; // optional field — empty is OK
  const digits = val.replace(/[\s\-]/g, '');
  if (!/^\d{10}$/.test(digits)) return 'Mobile number must be exactly 10 digits.';
  return null;
};
```

**Applied in:**
- `handleRegisterStudent` — validates `newStuMobile` (required) and `newStuParentMobile` (optional)
- `handleStudentSave` — validates `editStudent.mobile` and `editStudent.parentMobile` before PATCH
- `handleAddTeacher` — validates `newFacMobile` before OTP modal opens
- `submitFacOtp` (teacher edit path) — validates `editTeacher.mobile` before API call

### Frontend (`src/views/PortfolioView.tsx`)

**Applied in `handleEnquirySubmit`:**
```ts
const mobileDigits = stuMobile.replace(/[\s\-]/g, '');
if (!/^\d{10}$/.test(mobileDigits)) {
  setEnquiryError('Mobile number must be exactly 10 digits.');
  return;
}
```
Error shown inline in the enquiry form (not a toast) so it stays visible to the user.

---

## STEP 2 — Per-Student Fee Cap (Rs. 10,00,000)

### What counts toward the cap
`tuitionFee + hostelFee + transportFee + miscellaneousFee + previousPending + sum(customFeeSlots[].amount)`

No individual field is capped — only the **combined total**.

### Backend enforcement

| Route | Enforcement point |
|---|---|
| `POST /api/admin1/students` | After custom slots are cleaned, before DB write |
| `PATCH /api/admin1/students/:id` | Calculates merged total (new body + existing fields), before `Object.assign` |
| `PATCH /api/admin2/students/:id/fee-override` | After waivers applied, before DB save |

**Response on failure (HTTP 400):**
```json
{
  "status": "error",
  "message": "Total fees (Rs. 11,50,000) exceed the maximum allowed per student (Rs. 10,00,000)."
}
```

### Frontend enforcement

| Handler | Enforcement |
|---|---|
| `handleRegisterStudent` | `grossFeeTotal` from active fee slots vs `MAX_STUDENT_FEE` |
| `handleStudentSave` | Recalculates gross from `editStudent` fields before PATCH |

Error shown via `triggerToast()` — same UX as all other validation errors in the admin portal.

---

## STEP 3 — Verification Plan

> **Note per user instruction:** This is the development-only phase. Tests will be run separately. The report section below describes the exact tests to execute when Step 3 is performed.

### Mobile number tests (backend — bypass frontend with raw curl/postman)

| Test | Input | Expected |
|---|---|---|
| 9-digit mobile on student create | `"mobile": "987654321"` | `400` — "Mobile number must be exactly 10 digits." |
| 11-digit mobile on student create | `"mobile": "98765432100"` | `400` — "Mobile number must be exactly 10 digits." |
| Letters in mobile | `"mobile": "9876abc210"` | `400` — "Mobile number must be exactly 10 digits." |
| Valid 10-digit mobile | `"mobile": "9876543210"` | `201` — student created |
| 9-digit parent mobile | `"parentMobile": "987654321"` | `400` — "Parent mobile number must be exactly 10 digits." |
| Valid 10-digit mobile on teacher create | `"mobile": "9876543210"` | `201` — teacher created |
| 9-digit mobile on enquiry | `"mobile": "987654321"` | `400` — "Mobile number must be exactly 10 digits." |
| Valid mobile on enquiry | `"mobile": "9876543210"` | `201` — enquiry created |

### Fee cap tests (backend — raw request)

| Test | Input | Expected |
|---|---|---|
| Fees total 11,50,000 on create | `tuitionFee: 1150000` | `400` — "Total fees (Rs. 11,50,000) exceed..." |
| Fees total exactly 10,00,000 on create | `tuitionFee: 1000000` | `201` — accepted |
| Fees total 9,99,999 on create | `tuitionFee: 999999` | `201` — accepted |
| Edit pushing total over cap | PATCH with new `tuitionFee: 950000` when hostelFee+rest already = 100001 | `400` — cap exceeded |
| Waiver change when gross already over cap | fee-override PATCH when grossFees > 10L | `400` — cap exceeded |

---

## Build & TypeScript Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **PASSED** (0 errors) |
| `npm run build` | **PASSED** — 53 modules, `dist/server.cjs` 129.2 kB |
| Git commit | `355a7e9` pushed to `origin/main` |

---

## Files Modified

| File | Change |
|---|---|
| [`server/app.cjs`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/server/app.cjs) | `isValidMobile()`, `MAX_STUDENT_FEE`, `calcStudentGrossFees()` + validation in 5 route handlers |
| [`src/views/AdminPortalViews.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/AdminPortalViews.tsx) | `validateMobile()`, `MAX_STUDENT_FEE` + validation in 4 submit handlers |
| [`src/views/PortfolioView.tsx`](file:///d:/TRNT%20BEE/TRNT%20BEE/pdemo101/src/views/PortfolioView.tsx) | Mobile validation in public enquiry form submit |
