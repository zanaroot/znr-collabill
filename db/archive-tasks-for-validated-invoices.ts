import { sql } from "drizzle-orm";
import { db, dbClient } from "./index";

const run = async () => {
  console.log("=== Archive tasks linked to validated invoices ===\n");

  console.log("[1/3] Previewing affected tasks...");
  const preview = await db.execute<{
    task_id: string;
    task_title: string;
    current_status: string;
    invoice_id: string;
    invoice_status: string;
    invoice_validated_at: Date | null;
    count: string;
  }>(sql`
		SELECT
			t.id AS task_id,
			t.title AS task_title,
			t.status AS current_status,
			t.invoice_id,
			i.id AS invoice_id,
			i.status AS invoice_status,
			i.validated_at AS invoice_validated_at,
			COUNT(*) OVER () AS count
		FROM "tasks" t
		INNER JOIN "invoices" i ON i.id = t.invoice_id
		WHERE t.invoice_id IS NOT NULL
			AND i.status = 'VALIDATED'
			AND t.status <> 'ARCHIVED'
		ORDER BY i.validated_at DESC NULLS LAST, t.id;
	`);

  const rows = preview as unknown as Array<{
    task_id: string;
    task_title: string;
    current_status: string;
    invoice_id: string;
    invoice_status: string;
    invoice_validated_at: Date | null;
    count: string;
  }>;
  const totalFound = rows[0]?.count ? Number(rows[0].count) : 0;
  console.log(`      Found ${totalFound} task(s) to archive.`);

  if (totalFound > 0) {
    console.log("      First 10 rows:");
    for (const row of rows.slice(0, 10)) {
      console.log(
        `        - task=${row.task_id} status=${row.current_status} invoice=${row.invoice_id}`,
      );
    }
  }

  console.log("\n[2/3] Running update in a transaction...");
  const result = await db.transaction(async (tx) => {
    const updated = await tx.execute<{ archived_count: string }>(sql`
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
		`);
    const list = updated as unknown as Array<{ archived_count: string }>;
    return list[0]?.archived_count ?? "0";
  });

  const archivedCount = Number(result);
  console.log(`      Archived ${archivedCount} task(s).`);

  console.log("\n[3/3] Done.");
  console.log(`      Tasks found:    ${totalFound}`);
  console.log(`      Tasks archived: ${archivedCount}`);
  console.log(`      Idempotent:     yes (re-running will archive 0 tasks)`);
};

run()
  .then(async () => {
    await dbClient.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Archive script failed:", error);
    await dbClient.end();
    process.exit(1);
  });
