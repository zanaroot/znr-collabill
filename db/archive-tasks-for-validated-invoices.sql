BEGIN;

-- Archive tasks linked to a validated invoice.
-- Idempotent: only touches tasks whose status is not already 'ARCHIVED'
-- and whose linked invoice has status 'VALIDATED'.
WITH affected AS (
  UPDATE "tasks" AS t
  SET "status" = 'ARCHIVED',
      "archived_at" = COALESCE(t.archived_at, NOW())
  FROM "invoices" AS i
  WHERE t.invoice_id = i.id
    AND t.invoice_id IS NOT NULL
    AND i.status = 'VALIDATED'
    AND t.status <> 'ARCHIVED'
  RETURNING t.id
)
SELECT COUNT(*) AS archived_count FROM affected;

COMMIT;
