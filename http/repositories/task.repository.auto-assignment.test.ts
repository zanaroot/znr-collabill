import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTaskWithAutoAssignment } from "./task.repository";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("@/db", () => {
  const chain = { where: mocks.where, returning: mocks.returning };
  mocks.set.mockReturnValue(chain);
  mocks.where.mockReturnValue(chain);
  mocks.returning.mockResolvedValue([{ id: "task-1" }]);

  return {
    db: {
      update: vi.fn(() => ({ set: mocks.set })),
    },
  };
});

const dialect = new PgDialect();

const getSetValues = () =>
  mocks.set.mock.calls[0][0] as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.returning.mockResolvedValue([{ id: "task-1" }]);
});

describe("updateTaskWithAutoAssignment", () => {
  it("uses an atomic coalesce so only an unassigned task is assigned", async () => {
    await updateTaskWithAutoAssignment(
      "task-1",
      { status: "IN_PROGRESS" },
      "user-1",
    );

    const assignedTo = getSetValues().assignedTo as SQL;
    const { sql, params } = dialect.sqlToQuery(assignedTo);

    expect(sql.toLowerCase()).toContain("coalesce");
    expect(sql).toContain('"tasks"."assigned_to"');
    expect(params).toContain("user-1");
  });

  it("overrides an explicit null assignee with the coalesce expression", async () => {
    await updateTaskWithAutoAssignment(
      "task-1",
      { assignedTo: null },
      "user-1",
    );

    const assignedTo = getSetValues().assignedTo as SQL;
    const { sql } = dialect.sqlToQuery(assignedTo);

    expect(sql.toLowerCase()).toContain("coalesce");
  });

  it("leaves explicit assignees untouched when no auto-assignment is requested", async () => {
    await updateTaskWithAutoAssignment(
      "task-1",
      { assignedTo: "user-2" },
      null,
    );

    expect(getSetValues().assignedTo).toBe("user-2");
  });
});
