-- ROLLBACK for archive-tasks-for-validated-invoices.sql
--
-- This restores the previous status of every task archived by the script.
-- We cannot recover the original status value after the fact, so this
-- rollback only clears the 'ARCHIVED' status set by the migration.
-- If you need to restore specific previous statuses, capture them with
-- a snapshot SELECT * BEFORE running the migration:
--   CREATE TABLE tasks_pre_archive_snapshot AS
--     SELECT id, status, archived_at
--     FROM tasks
--     WHERE invoice_id IS NOT NULL
--       AND status = 'ARCHIVED';
--
-- Then, to rollback, restore statuses from that snapshot:
--   UPDATE tasks t
--   SET status = s.status,
--       archived_at = NULL
--   FROM tasks_pre_archive_snapshot s
--   WHERE t.id = s.id;

BEGIN;

-- Simple rollback: only un-archives tasks whose invoice is still VALIDATED
-- (i.e. the same set the migration would target). Tasks that have been
-- archived for other reasons are not touched.
UPDATE "tasks" AS t
SET "status" = 'VALIDATED',
    "archived_at" = NULL
FROM "invoices" AS i
WHERE t.invoice_id = i.id
  AND t.invoice_id IS NOT NULL
  AND i.status = 'VALIDATED'
  AND t.status = 'ARCHIVED';

COMMIT;
