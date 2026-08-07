# Hostinger Migration Preparation Report

**Date:** 2026-08-06  
**Status:** Verified & Ready for Hostinger Dashboard Deployment  
**Target Platform:** Hostinger Node.js Web App Hosting (Persistent Process)

---

## 1. Overview of Architectural Changes

The application has been prepared to transition from Vercel's serverless function architecture to Hostinger's persistent Node.js process environment.

Key updates implemented:
1. **Persistent Entry Point (`server.js`)**: Created a root entry point (`server.js`) bridging Hostinger's default expected startup file to `server/start.cjs`.
2. **Package Scripts Update (`package.json`)**: Updated `"start"` script to `node server.js` and `"build"` script to `vite build`.
3. **Internalized Backup Scheduler**: Added `node-cron` to execute daily automated database backups at **00:00 UTC** directly inside the persistent Node.js process, replacing Vercel HTTP crons.
4. **Standalone Static Asset & SPA Serving**: Updated `server/app.cjs` to serve `dist/` static files and fallback non-API routes to `dist/index.html`.
5. **Retained Vercel Artifacts**: Kept `api/index.js` and `vercel.json` intact for immediate rollback capability if ever required.
6. **Legacy Code Cleanup**: Completely removed dead Service Account fallback code (`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY`) in `server/services/googleDriveService.cjs`.

---

## 2. Hostinger Dashboard Deployment Configuration

When setting up the Node.js Web Application in the Hostinger Dashboard, use the following settings:

| Setting | Recommended Value |
| :--- | :--- |
| **Node.js Version** | `18.x` or `20.x` (LTS) |
| **Application Root** | `/` (Project Root) |
| **Application Startup File / Start Command** | `server.js` (or `node server.js`) |
| **Build Command** | `npm run build` |

---

## 3. Final Single Environment Variables List (Exact Names Only)

Add the following exact environment variable names into the Hostinger Panel under **Environment Variables** (one name each, zero legacy alternatives or fallbacks):

### Core Application & Database Variables
1. `PORT` *(Optional — Hostinger sets this automatically, fallback is 3000)*
2. `MONGODB_URI`
3. `MONGODB_DB_NAME`
4. `JWT_SECRET`
5. `JWT_REFRESH_SECRET`
6. `JWT_EXPIRES_IN`
7. `ALLOWED_ORIGINS`

### Backup & OAuth2 Drive Variables
8. `BACKUP_ENCRYPTION_KEY`
9. `GOOGLE_OAUTH_CLIENT_ID`
10. `GOOGLE_OAUTH_CLIENT_SECRET`
11. `GOOGLE_OAUTH_REFRESH_TOKEN`
12. `GOOGLE_DRIVE_FOLDER_ID`

---

## 4. Verification & Build Confirmation

- **TypeScript Validation (`npx tsc --noEmit`)**: Passed (0 errors).
- **Vite Build (`npm run build`)**: Passed (Output generated in `dist/`).
- **Database Connection Caching**: Verified compatible with persistent process lifecycle.
- **Manual Trigger Backup Route (`GET /api/system/run-backup`)**: Retained intact for manual authenticator/admin triggers.
- **Dependency Audit**: Verified `node-cron` is explicitly registered in `package.json` dependencies:
  ```json
  "node-cron": "^4.6.0"
  ```

---

## 5. Live Server Execution & Endpoint Verification (Step 2 Proof)

### A. Real Server Startup Console Output (`node server/start.cjs`)
```text
✅ [Database]: Connected to MongoDB (jc_erp_prod)
✅ [Database]: Initial connection established at server startup.
🚀 [Hostinger Node.js Server]: Listening on port 3000 (PID: 11380)
```

### B. GET `/api/health` Response
```json
{
  "status": "ok",
  "timestamp": "2026-08-06T11:02:43.597Z",
  "database": "connected",
  "hasMongoUri": true,
  "dbError": null
}
```

### C. Root URL (`/`) Response (Serving `dist/index.html`)
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Inspire Educational Institutions | Administrative Portal Gateway</title>
    <meta name="title" content="Inspire Educational Institutions | Administrative Portal Gateway" />
    <meta name="description" content="Official administrative portal gateway of Inspire Educational Institutions. Secure login for Rector, Principal, Accountants, and Authenticator systems." />
    <meta name="theme-color" content="#087FBC" />
    <script type="module" crossorigin src="/assets/main-B0p9ssdz.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/main-DwHHcPWw.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

### D. POST `/api/auth/login` Authenticated Response
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNmQ2ZGMwNjAwZjU2ZDJjMTE4ODc2ZSIsInVzZXJuYW1lIjoiOTA1OTA6ODM4NCIsInJvbGUiOiJhdXRoZW50aWNhdG9yIiwiY2FtcHVzIjoiQWxsIiwibmFtZSI6IlNlY3VyaXR5IEF1dGhlbnRpY2F0b3IiLCJzZXNzaW9uSWQiOiJlZDdjNGZlMi1hNDkwLTRjMTAtOTVkNS1hOGRlOWNiZjhmYmQiLCJpYXQiOjE3ODYwMTQ0MTYsImV4cCI6MTc4NjAxODAxNn0...",
  "refreshToken": "69cd86770ca08b301d131dc7a6d60c790ad2e54be9bc1a751130303f35f004b0f80c3b410f9c1866",
  "user": {
    "id": "6a6d6dc0600f56d2c118876e",
    "username": "9059068384",
    "role": "authenticator",
    "campus": "All",
    "name": "Security Authenticator"
  }
}
```

---

## 6. Next Steps for Deployment

1. Commit and push these code changes to your Git repository.
2. Connect your repository to Hostinger Node.js Web App.
3. Configure the Start Command (`node server/start.cjs`) and add the 12 environment variables listed in Section 3 above.
4. Trigger deployment on Hostinger and point DNS records to Hostinger IP.
