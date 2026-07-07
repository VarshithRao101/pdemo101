# Vercel Deployment Notes

This project now supports deploying the Vite frontend and Express API together on one Vercel domain.

## Domain

Production frontend/API domain:

```text
https://pdemo101-9yqv.vercel.app
```

## Vercel Environment Variables

Set these in the Vercel project environment:

```text
MONGODB_URI=<your MongoDB connection string>
MONGODB_DB_NAME=jc_erp_demo
JWT_SECRET=<your JWT secret>
BYPASS_DB_EMPTY_CHECK=true
ALLOWED_ORIGINS=https://pdemo101-9yqv.vercel.app
```

`VITE_API_BASE_URL` is optional for this single-domain deployment. If it is not set, the frontend uses `/api`.

## API Health Check

After deployment, verify:

```text
https://pdemo101-9yqv.vercel.app/api/health
```

Expected response includes:

```json
{
  "status": "ok"
}
```

## Realtime Note

Vercel serverless functions do not host long-lived Socket.IO servers. Production disables the realtime socket client unless `VITE_ENABLE_REALTIME` is explicitly set. Normal login and portal HTTP data flows use the `/api` serverless routes.
