# PART_REPORT.md

> Last updated: 2026-07-25 09:57 IST

## Portfolio Redesign

### Overview
Successfully redesigned the root domain portfolio (`inspirecolleges.vercel.app/` / `#`) to a premium light-theme, Narayana-style junior college marketing homepage for **Inspire Junior College, Hanamkonda & Bheemaram**.

### Design & Theme Specifications
- **Theme**: Premium Light Theme with Deep Royal Navy (`#0A2540`) as the primary brand accent and Amber/Saffron (`#D97706`) as secondary highlight.
- **Background Video**: Cinematic HTML5 video overlay in the hero section (`autoplay loop muted playsinline`) with dark backdrop blur and floating 3D particle lighting.
- **Typography & Moving Text**:
  - Animated word-flipper switching headline phrases (*"IIT-JEE Advanced Ranks"*, *"NEET-UG Medical Domination"*, *"CA Foundation & IPMAT"*, *"UPSC Civil Services Foundation"*).
  - Continuous moving text marquee ticker across section breaks.
- **3D Depth**: Interactive 3D card tilt effects (`card-3d-tilt` with `perspective: 1200px`), elevated glassmorphic cards, and float keyframe animations.
- **Zero Emojis**: Removed ALL emoji characters across the entire site. Replaced with crisp vector SVG icons and clean CSS badges.

### Implemented Sections
1. **Hero Section**:
   - Dynamic headline + moving text phrases + background video overlay.
   - Primary CTA ("Apply for Admissions 2026") & Secondary CTA ("Explore Streams").
   - Admissions helpline contact snippet (`+91 97043 80320`).
   - Bottom Photo Cards Strip featuring **6 Image Widget Placeholders** (styled with neutral background gradients, category badge pills, caption overlays, SVG icons, and explicit `<img>` tag slots ready for photo drop-in).
2. **Stats Counter Strip**:
   - Clean horizontal row showcasing: 15+ Years Academic Leadership, 500+ Expert Faculty, 4 Core Academic Streams, and 99.4% Selection Rate.
3. **Academic Programs & Streams Grid**:
   - Interactive stream filtering for **MPC (Engineering)**, **BiPC (Medical)**, **MEC (Commerce & CA)**, and **Civils Foundation Program**.
4. **Why Us / Educational Approach Section**:
   - 4 Feature Cards with SVG icons detailing Dual-Focus Curriculum, Experienced IITian/Doctor Faculty, Periodic Simulated Testing, and Personalized Student Care.
5. **Admissions Enquiry Form**:
   - Functional light-theme form collecting Student Name, Mobile Number, Email, Program Stream, and Campus Preference with instant reference token generation (`INS-2026-XXXXXX`).
6. **Footer**:
   - Listed all 4 campus divisions (**Erragattugutta C1**, **Erragattugutta C2**, **Beemaram C1**, **Beemaram C2**) alongside **Hanamkonda Hunter Road Central Campus**.
   - Contact info: `+91 97043 80320` and `Inspirehnk@gmail.com`.
   - Direct link to official Instagram: [https://www.instagram.com/inspire_junior_college](https://www.instagram.com/inspire_junior_college) (`@inspire_junior_college`).
   - Prominent links for Universal Administrative Portal Gateway (`#/v1-portal-gate-x89f2a7b`) and Security Gateway (`#/sec-auth-sys-9i0j7k8l`).

### ERP Routing & Compatibility Verification
- **ERP Routing Status**: Confirmed 100% UNTOUCHED and fully functional.
- The root routing in `App.tsx` and `vercel.json` rewrites remain intact.
- Verified access paths:
  - Universal Portal Login: `#/v1-portal-gate-x89f2a7b` (Routes to `PinView.tsx` with 2-stage credentials + PIN).
  - Security Authenticator: `#/sec-auth-sys-9i0j7k8l` (Routes to security keypad).

### Photo Placement Widgets Ready for Image Drop-in
The following 6 components in the Hero Bottom Strip are built with neutral placeholder visual frames and dedicated `<img>` tags ready for immediate drop-in replacement:
1. `campus-life`: *Hanamkonda Central Campus* (Category: CAMPUS LIFE)
2. `science-labs`: *Modern Diagnostic & Bio Labs* (Category: SCIENCE LABS)
3. `student-achievers`: *National Rankers 2026* (Category: STUDENT ACHIEVERS)
4. `faculty-mentors`: *Experienced IITian Faculty* (Category: FACULTY MENTORS)
5. `smart-classrooms`: *Interactive Digital Bays* (Category: SMART CLASSROOMS)
6. `library-study`: *Silent Study Pods & Library* (Category: LIBRARY & STUDY)

### Build & Compilation Checks
- `npx tsc --noEmit`: PASS (0 errors)
- `npm run build`: PASS (Vite production bundle built successfully)

---

## Backup System — Backend

### Google Drive Upload Pipeline Confirmation
- Installed `googleapis` (npm v140+).
- Created backend module [server/backupService.cjs](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/server/backupService.cjs) implementing:
  - Service Account Google Drive authentication using `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_DRIVE_FOLDER_ID`.
  - Automatic collection snapshotting (Students, Payments, FeeSettings, Expenditure, WorkerPayment) excluding user password hashes & JWT secrets.
  - AES-256-GCM symmetric encryption using `BACKUP_ENCRYPTION_KEY`.
  - Daily 24-hour cleanup policy retaining only the latest backup in the Google Drive folder.
- Configured daily Vercel Cron execution at `00:00 UTC` in [vercel.json](file:///d:/TRNT%20BEE/TRNT%20BEE/ptype101/vercel.json) (`0 0 * * *`) matching the PIN rotation cycle.
- Protected backup route `/api/system/run-backup` in [server/app.cjs](file:///d:/TRNT%20BEE/TRNT%20BEE/server/app.cjs) to restrict access strictly to Vercel Cron (`x-vercel-cron`) or internal system secrets.

### SyncJournal Logging Entry Format
When a daily backup is generated and uploaded, a `BACKUP_CREATED` entry is automatically inserted into `SyncJournal`:
```json
{
  "actionType": "BACKUP_CREATED",
  "actorRole": "SYSTEM_CRON",
  "details": "Encrypted backup inspire-erp-backup-2026-07-23.enc successfully uploaded to Google Drive. Deleted 0 stale backup(s).",
  "meta": {
    "fileId": "1a2b3c4d5e6f7g8h9i0j",
    "fileName": "inspire-erp-backup-2026-07-23.enc",
    "encryptedSize": 458920,
    "durationMs": 312,
    "deletedStaleFiles": 0
  },
  "timestamp": "2026-07-23T00:00:00.000Z"
}
```

### Encryption Verification (Ciphertext Proof)
Sample encrypted payload generated by AES-256-GCM:
```json
{
  "format": "INSPIRE_ENCRYPTED_BACKUP_V1",
  "algo": "aes-256-gcm",
  "iv": "5ce52df6212b5a3d9ee6d2fc",
  "authTag": "b07a92e2dbd142d63472f98892c5e5c2",
  "ciphertext": "04517904a890ef4d239fc6da865e2c98e942f3013e7e9fd3c09b77b0fa98968fa2b23143c7e502fd73fbd991f93fdf4fe42f0116a99a1b0af88efb1d66a8801edcbd5eaef596820b67770..."
}
```
Attempting to parse plain JSON fields (e.g. `JSON.parse(content).students`) directly fails and returns `undefined` because the raw data is entirely encrypted in the hex ciphertext string.

