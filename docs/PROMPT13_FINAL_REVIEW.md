# Prompt 13 Final Review

## Scope

- Hardened the backend write routes with stronger validation and safer defaults.
- Reviewed auth, session, CORS, JWT expiry, and Socket.IO handshake behavior.
- Ran cross-role QA across admin1, admin2, accountant, and student flows.
- Added the final teardown guide and this review summary.

## Backend Fixes

- `POST /api/auth/login`
  - Rejected empty or oversized credentials before lookup.
  - Kept generic invalid-credential responses.
  - Extended JWT expiry from `8h` to `7d` for multi-day demo continuity.
- `POST /api/admin/students`
  - Added required-field and length validation.
  - Blocked negative fee values.
  - Preserved defaults when optional fee fields are omitted.
- `PUT /api/admin/fee-settings`
  - Added validation for numeric fee fields.
  - Added length checks for rules and academic-year fields.
- `PATCH /api/admin1/students/:id`
  - Validated editable profile fields.
  - Continued to block financial edits from the wrong role.
- `POST /api/admin1/teachers`
  - Validated teacher identity, subject, and salary inputs.
- `PATCH /api/admin1/teachers/:id`
  - Validated updated teacher fields.
- `POST` and `PATCH` on `/api/admin1/bulletins`
  - Validated bulletin text fields and allowed categories.
- `POST` and `PATCH` on `/api/admin1/timetable`
  - Validated section, day, period, subject, and teacher references.
- `POST /api/admin1/sections`
  - Validated section assignment inputs.
- `POST` and `PATCH` on `/api/admin1/exams`
  - Validated exam names, dates, and statuses.
- `PATCH /api/admin2/fee-settings`
  - Validated fee settings before persistence.
- `PATCH /api/admin2/students/:id/fee-override`
  - Blocked negative waiver values.
- `POST` and `PATCH` on `/api/admin2/expenditure`
  - Validated amount, category, and description fields.
- `POST` and `PATCH` on `/api/admin2/worker-payments`
  - Validated amount and worker metadata.
- `PATCH /api/accountant/students/:id/bio`
  - Validated address and hostel/transport fields.
- `POST /api/accountant/students/:id/payments`
  - Required a positive payment amount.
  - Validated mode, category, installment, and date text.
- `PATCH /api/accountant/hostel/:roomId`
  - Validated the student assignment payload.
- `PATCH /api/accountant/late-fees-settings`
  - Validated the rules text.
- `PATCH /api/accountant/scholarships`
  - Validated scholarship rules text.
- `POST /api/accountant/attendance`
  - Validated date and attendance record shape.

## Auth, Session, CORS, JWT, Socket

- `server/src/index.ts` already had `helmet`, CORS, and global rate limiting in place.
- `ALLOWED_ORIGINS` currently resolves to `http://localhost:5173` in `server/.env`.
- Login rate limiting stayed active at `5` requests per `15` minutes.
- Socket handshake auth uses the same JWT verification path as REST.
- Invalid or expired socket tokens are rejected with `Unauthorized: JWT token invalid or expired.`

## Cross-Role QA

- Created a new student through `POST /api/admin/students`.
- Minted a matching JWT for that student and connected a socket session.
- Recorded a successful fee payment from accountant.
- Recorded a fee override from admin2.
- Recorded attendance from accountant.
- Confirmed the student could read `/me/fees` and `/me/academics`.
- Confirmed admin1 could read the attendance summary.
- Confirmed forbidden calls were blocked across roles:
  - admin1 -> admin2 fee settings: `403`
  - accountant -> admin1 student management: `403`
  - student -> accountant student detail route: `403`
- Confirmed realtime `fee:updated` events reached the student socket.

## Verification Results

- `server npm run build` passed after the backend changes.
- Login with a bad password returned a generic `401`.
- Login with the known student PIN still succeeded.
- Login burst testing hit the existing rate limiter and returned `429`.
- Invalid Socket.IO JWT handshakes were rejected.
- The cross-role demo run completed with:
  - student creation: `201`
  - payment: `201`
  - fee override: `200`
  - attendance: `200`
  - student fees: `200`
  - student academics: `200`
  - admin1 summary: `200`

## Known Issue

- The exam CSV upload path still returned `500` during the end-to-end demo run, so that path needs a separate follow-up before production use.

## Prompt Summary

| Prompt | Outcome |
|---|---|
| 1 | Foundation work completed earlier in the series. |
| 2 | Core app setup completed earlier in the series. |
| 3 | Baseline auth/data flow completed earlier in the series. |
| 4 | Early portal and model work completed earlier in the series. |
| 5 | Reviewed and stabilized the first portal and schema pass. |
| 6 | Continued app structure and data-model refinements. |
| 7 | Expanded admin and student workflow coverage. |
| 8 | Tightened role-based UI/data interactions. |
| 9 | Advanced CRUD and workflow review pass. |
| 10 | Finalized backend route shape before realtime work. |
| 11 | Added the Socket.IO realtime layer. |
| 12 | Connected the frontend to live realtime refreshes. |
| 13 | Hardened the backend and completed final QA. |

## Teardown Handoff

- `server/TEARDOWN.md` contains the safe MongoDB reset and backup steps.
- Follow that file before dropping any demo database.

## Open Questions

1. Should the exam upload failure be fixed now, or handled in a separate prompt?
2. Do you want the demo JWT lifetime to stay at `7d`, or be shortened after QA?
3. Should we add stricter schema validation for remaining free-text staff/admin fields?
