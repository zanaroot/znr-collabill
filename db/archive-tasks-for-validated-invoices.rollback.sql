-- MANUAL ROLLBACK for migration 0009_archive_tasks_for_validated_invoices.
--
-- Drizzle does not run down-migrations automatically. Use this only if you
-- need to undo the archive operation. It restores tasks to 'VALIDATED' and
-- clears archived_at, but ONLY for tasks whose linked invoice is still in
-- 'VALIDATED' status (i.e. the same set the forward migration targeted).
--
-- Apply with:
--   psql "$DATABASE_URL" -f db/archive-tasks-for-validated-invoices.rollback.sql

BEGIN;

UPDATE "tasks" AS t
   SET "status"      = 'VALIDATED',
       "archived_at" = NULL
  FROM "invoices" AS i
 WHERE t.invoice_id = i.id
   AND t.invoice_id IS NOT NULL
   AND i.status = 'VALIDATED'
   AND t.status = 'ARCHIVED';

COMMIT;
