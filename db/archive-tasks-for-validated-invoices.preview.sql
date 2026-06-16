SELECT
  t.id AS task_id,
  t.title AS task_title,
  t.status AS current_status,
  t.invoice_id,
  i.id AS invoice_id,
  i.status AS invoice_status,
  i.validated_at AS invoice_validated_at
FROM "tasks" t
INNER JOIN "invoices" i ON i.id = t.invoice_id
WHERE t.invoice_id IS NOT NULL
  AND i.status = 'VALIDATED'
  AND t.status <> 'ARCHIVED'
ORDER BY i.validated_at DESC NULLS LAST, t.id;
