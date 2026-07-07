# Teardown

This file documents how to safely reset the demo data used by the Residential Junior College ERP app.

## Before You Delete Anything

- Confirm `MONGODB_URI` points to the intended demo cluster.
- Confirm `MONGODB_DB_NAME=jc_erp_demo` or the database you actually want to clear.
- Export a backup first if you want to preserve seed data or user records.
- Stop the frontend and backend servers so nothing recreates documents during teardown.

## Safe MongoDB Reset

Use `mongosh` against the target `MONGODB_URI` and double-check the active database before dropping it:

```javascript
use jc_erp_demo
db.dropDatabase()
```

If you are connected to a different database name, replace `jc_erp_demo` with the exact value from your environment first.

## Safer Backup First

If you want a rollback point before teardown, export the database before dropping it:

```bash
mongodump --uri="$MONGODB_URI" --db=jc_erp_demo --out=./backup
```

Restore later with:

```bash
mongorestore --uri="$MONGODB_URI" --db=jc_erp_demo ./backup/jc_erp_demo
```

## Post-Teardown Repointing

- Update `server/.env` to a fresh database name if you want the app to start clean.
- Restart the backend so the new `MONGODB_DB_NAME` is picked up.
- Re-run the seed script only if you want the demo data restored.

## Fail-Safe

- If `MONGODB_URI` is not pointed at the intended demo database, do not run `dropDatabase()`.
- If you are unsure, stop here and verify the connection string in `server/.env` first.
