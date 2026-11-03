import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoices } from "@/db/schema";
import {
  getValidatedTaskIdsByPeriodAndReviewer,
  getValidatedTaskIdsByPeriodAndUser,
  getValidatedTaskSummaryByOrganization,
  getValidatedTaskSummaryByReviewer,
} from "./task.repository";

const dbState = vi.hoisted(() => ({
  whereConditions: [] as unknown[],
  joinTables: [] as unknown[],
  rows: [] as unknown[],
}));

vi.mock("@/db", () => {
  const createChain = () => {
    const chain = Promise.resolve(dbState.rows);
    return Object.assign(chain, {
      from: vi.fn(() => chain),
      innerJoin: vi.fn((table: unknown) => {
        dbState.joinTables.push(table);
        return chain;
      }),
      leftJoin: vi.fn((table: unknown) => {
        dbState.joinTables.push(table);
        return chain;
      }),
      where: vi.fn((condition: unknown) => {
        dbState.whereConditions.push(condition);
        return chain;
      }),
      groupBy: vi.fn(() => chain),
    });
  };

  return { db: { select: vi.fn(() => createChain()) } };
});

const dialect = new PgDialect();

const renderLastCondition = () => {
  const condition = dbState.whereConditions.at(-1) as unknown;
  return dialect.sqlToQuery(condition as SQL);
};

const octoberPeriod = {
  start: new Date("2025-10-01T00:00:00.000Z"),
  end: new Date("2025-10-31T00:00:00.000Z"),
};

const novemberPeriod = {
  start: new Date("2025-11-01T00:00:00.000Z"),
  end: new Date("2025-11-30T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  dbState.whereConditions.length = 0;
  dbState.joinTables.length = 0;
  dbState.rows.length = 0;
});

describe("ticket-to-invoice period assignment", () => {
  it("selects archiveable tickets by work date (createdAt), never by validation date", async () => {
    await getValidatedTaskIdsByPeriodAndUser(
      "user-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    const { sql, params } = renderLastCondition();

    expect(sql).toContain('"tasks"."created_at" >=');
    expect(sql).toContain('"tasks"."created_at" <=');
    expect(sql).not.toContain("validated_at");
    expect(params).toContain("user-1");
    expect(params).toContain("VALIDATED");
    expect(params).toContain("2025-10-01T00:00:00.000Z");
    expect(
      params.some(
        (param) =>
          typeof param === "string" &&
          param.startsWith("2025-10-31T") &&
          param.endsWith("59.999Z"),
      ),
    ).toBe(true);
  });

  it("selects reviewer tickets by work date regardless of when they were validated", async () => {
    await getValidatedTaskIdsByPeriodAndReviewer(
      "reviewer-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    const { sql, params } = renderLastCondition();

    expect(sql).toContain('"tasks"."reviewer_id"');
    expect(sql).toContain('"tasks"."created_at" >=');
    expect(sql).not.toContain("validated_at");
    expect(params).toContain("reviewer-1");
    expect(params).toContain("VALIDATED");
    expect(params).toContain("2025-10-01T00:00:00.000Z");
  });

  it("keeps October work in the October period even when queried in November", async () => {
    await getValidatedTaskIdsByPeriodAndUser(
      "user-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );
    const october = renderLastCondition();

    dbState.whereConditions.length = 0;

    await getValidatedTaskIdsByPeriodAndUser(
      "user-1",
      novemberPeriod.start,
      novemberPeriod.end,
    );
    const november = renderLastCondition();

    expect(october.params).toContain("2025-10-01T00:00:00.000Z");
    expect(november.params).toContain("2025-11-01T00:00:00.000Z");
    expect(october.params).not.toContain("2025-11-01T00:00:00.000Z");
    expect(november.params).not.toContain("2025-10-01T00:00:00.000Z");
    expect(october.sql).not.toContain("validated_at");
    expect(november.sql).not.toContain("validated_at");
    expect(october.sql).toContain('"tasks"."created_at"');
    expect(november.sql).toContain('"tasks"."created_at"');
  });
});

describe("invoice summary period condition", () => {
  it("includes validated tickets by work date and archived tickets by their invoice period", async () => {
    await getValidatedTaskSummaryByOrganization(
      "user-1",
      "org-1",
      "user-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    const { sql, params } = renderLastCondition();

    expect(sql).toContain('"tasks"."created_at" >=');
    expect(sql).toContain('"tasks"."status"');
    expect(sql).toContain('"tasks"."invoice_id" is not null');
    expect(sql).toContain('"invoices"."period_start"');
    expect(sql).toContain('"invoices"."period_end"');
    expect(sql).not.toContain("validated_at");
    expect(params).toContain("VALIDATED");
    expect(params).toContain("2025-10-01");
    expect(params).toContain("2025-10-31");
    expect(params).toContain("2025-10-01T00:00:00.000Z");
    expect(dbState.joinTables).toContain(invoices);
  });

  it("does not expose tickets already invoiced in another period", async () => {
    await getValidatedTaskSummaryByOrganization(
      "user-1",
      "org-1",
      "user-1",
      novemberPeriod.start,
      novemberPeriod.end,
    );

    const { params } = renderLastCondition();

    expect(params).toContain("2025-11-01");
    expect(params).toContain("2025-11-30");
    expect(params).not.toContain("2025-10-01");
    expect(params).not.toContain("2025-10-31");
  });

  it("assigns reviewer tickets to the work period, not the validation period", async () => {
    await getValidatedTaskSummaryByReviewer(
      "reviewer-1",
      "org-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    const { sql, params } = renderLastCondition();

    expect(sql).toContain('"tasks"."reviewer_id"');
    expect(sql).toContain('"tasks"."created_at" >=');
    expect(sql).toContain('"invoices"."period_start"');
    expect(sql).not.toContain("validated_at");
    expect(params).toContain("2025-10-01");
    expect(params).toContain("2025-10-31");
    expect(dbState.joinTables).toContain(invoices);
  });
});
