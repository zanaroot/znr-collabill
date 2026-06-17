-- Data migration: archive every task whose linked invoice is already validated.
--
-- This file is applied automatically by `pnpm db:migrate` (which runs at
-- container start via the Dockerfile CMD). Drizzle tracks the migration in
-- `__drizzle_migrations`, so re-runs are no-ops once the entry is recorded.
--
-- Idempotency is enforced by:
--   1. The Drizzle migration tracking table (no re-execution after first run).
--   2. The `t.status <> 'ARCHIVED'` guard inside the UPDATE itself, which
--      also makes the statement safe to run manually a second time.

BEGIN;

DO $$
DECLARE
  found_count    BIGINT;
  archived_count BIGINT;
BEGIN
  SELECT COUNT(*)
    INTO found_count
    FROM "tasks" t
    INNER JOIN "invoices" i ON i.id = t.invoice_id
   WHERE t.invoice_id IS NOT NULL
     AND i.status = 'VALIDATED'
     AND t.status <> 'ARCHIVED';

  RAISE NOTICE 'Tasks linked to a VALIDATED invoice (not yet archived): %', found_count;

  WITH affected AS (
    UPDATE "tasks" AS t
       SET "status"      = 'ARCHIVED',
           "archived_at" = COALESCE(t.archived_at, NOW())
      FROM "invoices" AS i
     WHERE t.invoice_id = i.id
       AND t.invoice_id IS NOT NULL
       AND i.status = 'VALIDATED'
       AND t.status <> 'ARCHIVED'
     RETURNING t.id
  )
  SELECT COUNT(*) INTO archived_count FROM affected;

  RAISE NOTICE 'Tasks archived: %', archived_count;
END $$;

COMMIT;
