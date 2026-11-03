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

const mocks = vi.hoisted(() => ({
  findClosedBillingPeriods: vi.fn(),
}));

vi.mock("@/http/repositories/invoice.repository", () => ({
  findClosedBillingPeriods: mocks.findClosedBillingPeriods,
}));

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

const septemberPeriod = {
  start: new Date("2025-09-01T00:00:00.000Z"),
  end: new Date("2025-09-30T00:00:00.000Z"),
};

const taskRow = (id: string, createdAt: string) => ({
  id,
  createdAt: new Date(createdAt),
});

beforeEach(() => {
  vi.clearAllMocks();
  dbState.whereConditions.length = 0;
  dbState.joinTables.length = 0;
  dbState.rows = [];
  mocks.findClosedBillingPeriods.mockResolvedValue(new Set());
});

describe("late-validated ticket assignment", () => {
  it("assigns a late-validated ticket to the next open invoice", async () => {
    dbState.rows = [taskRow("task-late-sept", "2025-09-15T00:00:00.000Z")];
    mocks.findClosedBillingPeriods.mockResolvedValue(new Set(["2025-09"]));

    const ids = await getValidatedTaskIdsByPeriodAndUser(
      "user-1",
      "org-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    expect(ids).toEqual(["task-late-sept"]);
    expect(mocks.findClosedBillingPeriods).toHaveBeenCalledWith(
      "user-1",
      "org-1",
    );

    const { sql, params } = renderLastCondition();
    expect(sql).toContain('"tasks"."invoice_id" is null');
    expect(sql).toContain('"tasks"."status"');
    expect(sql).not.toContain("validated_at");
    expect(params).toContain("user-1");
    expect(params).toContain("VALIDATED");
  });

  it("keeps an on-time ticket in its own period when no invoice exists yet", async () => {
    dbState.rows = [taskRow("task-oct", "2025-10-05T00:00:00.000Z")];

    const ids = await getValidatedTaskIdsByPeriodAndUser(
      "user-1",
      "org-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    expect(ids).toEqual(["task-oct"]);
  });

  it("does not assign to a later period while an earlier period is still open", async () => {
    dbState.rows = [taskRow("task-late-sept", "2025-09-15T00:00:00.000Z")];
    mocks.findClosedBillingPeriods.mockResolvedValue(new Set(["2025-09"]));

    const ids = await getValidatedTaskIdsByPeriodAndUser(
      "user-1",
      "org-1",
      novemberPeriod.start,
      novemberPeriod.end,
    );

    expect(ids).toEqual([]);
  });

  it("groups tickets from multiple closed periods into the same open invoice", async () => {
    dbState.rows = [
      taskRow("task-aug", "2025-08-10T00:00:00.000Z"),
      taskRow("task-sept", "2025-09-15T00:00:00.000Z"),
      taskRow("task-oct-open", "2025-10-05T00:00:00.000Z"),
    ];
    mocks.findClosedBillingPeriods.mockResolvedValue(
      new Set(["2025-08", "2025-09"]),
    );

    const ids = await getValidatedTaskIdsByPeriodAndUser(
      "user-1",
      "org-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    expect(ids).toEqual(["task-aug", "task-sept", "task-oct-open"]);
  });

  it("never selects tickets by their validation date", async () => {
    dbState.rows = [taskRow("task-oct", "2025-10-05T00:00:00.000Z")];

    await getValidatedTaskIdsByPeriodAndUser(
      "user-1",
      "org-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    const { sql } = renderLastCondition();
    expect(sql).not.toContain("validated_at");
  });

  it("resolves reviewer tickets against the reviewer's own invoice periods", async () => {
    dbState.rows = [taskRow("task-review-late", "2025-09-20T00:00:00.000Z")];
    mocks.findClosedBillingPeriods.mockResolvedValue(new Set(["2025-09"]));

    const ids = await getValidatedTaskIdsByPeriodAndReviewer(
      "reviewer-1",
      "org-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    expect(ids).toEqual(["task-review-late"]);
    expect(mocks.findClosedBillingPeriods).toHaveBeenCalledWith(
      "reviewer-1",
      "org-1",
    );

    const { sql, params } = renderLastCondition();
    expect(sql).toContain('"tasks"."reviewer_id"');
    expect(sql).toContain('"tasks"."invoice_id" is null');
    expect(sql).not.toContain("validated_at");
    expect(params).toContain("reviewer-1");
  });
});

describe("invoice summary period condition", () => {
  it("combines chain-eligible unarchived tickets with the period's archived tickets", async () => {
    dbState.rows = [taskRow("task-late-sept", "2025-09-15T00:00:00.000Z")];
    mocks.findClosedBillingPeriods.mockResolvedValue(new Set(["2025-09"]));

    await getValidatedTaskSummaryByOrganization(
      "user-1",
      "org-1",
      "user-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    const { sql, params } = renderLastCondition();

    expect(sql).toContain('"tasks"."id" in');
    expect(sql).toContain('"tasks"."invoice_id" is null');
    expect(sql).toContain('"tasks"."status"');
    expect(sql).toContain('"invoices"."period_start"');
    expect(sql).toContain('"invoices"."period_end"');
    expect(sql).not.toContain("validated_at");
    expect(params).toContain("task-late-sept");
    expect(params).toContain("2025-10-01");
    expect(params).toContain("2025-10-31");
    expect(dbState.joinTables).toContain(invoices);
  });

  it("exposes no unarchived tickets when the target period is already closed", async () => {
    dbState.rows = [taskRow("task-sept", "2025-09-15T00:00:00.000Z")];
    mocks.findClosedBillingPeriods.mockResolvedValue(new Set(["2025-09"]));

    await getValidatedTaskSummaryByOrganization(
      "user-1",
      "org-1",
      "user-1",
      septemberPeriod.start,
      septemberPeriod.end,
    );

    const { sql, params } = renderLastCondition();

    expect(sql).not.toContain('"tasks"."id" in');
    expect(params).not.toContain("task-sept");
    expect(params).toContain("2025-09-01");
    expect(params).toContain("2025-09-30");
  });

  it("does not expose tickets already invoiced in another period", async () => {
    dbState.rows = [taskRow("task-late-sept", "2025-09-15T00:00:00.000Z")];
    mocks.findClosedBillingPeriods.mockResolvedValue(new Set(["2025-09"]));

    await getValidatedTaskSummaryByOrganization(
      "user-1",
      "org-1",
      "user-1",
      novemberPeriod.start,
      novemberPeriod.end,
    );

    const { sql, params } = renderLastCondition();

    expect(sql).not.toContain('"tasks"."id" in');
    expect(params).toContain("2025-11-01");
    expect(params).toContain("2025-11-30");
    expect(params).not.toContain("2025-10-01");
    expect(params).not.toContain("2025-09-01");
  });

  it("assigns reviewer tickets via the same chain, not the validation period", async () => {
    dbState.rows = [taskRow("task-review-late", "2025-09-20T00:00:00.000Z")];
    mocks.findClosedBillingPeriods.mockResolvedValue(new Set(["2025-09"]));

    await getValidatedTaskSummaryByReviewer(
      "reviewer-1",
      "org-1",
      octoberPeriod.start,
      octoberPeriod.end,
    );

    const { sql, params } = renderLastCondition();

    expect(sql).toContain('"tasks"."reviewer_id"');
    expect(sql).toContain('"tasks"."id" in');
    expect(params).toContain("task-review-late");
    expect(params).toContain("2025-10-01");
    expect(dbState.joinTables).toContain(invoices);
  });
});
