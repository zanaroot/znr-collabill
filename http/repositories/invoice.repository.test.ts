import { beforeEach, describe, expect, it, vi } from "vitest";

const txState = vi.hoisted(() => {
  const calls: string[] = [];

  const draftInvoiceRow = {
    id: "inv-1",
    userId: "user-1",
    organizationId: "org-1",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    status: "DRAFT",
    totalAmount: "950.00",
  };

  let selectRows: unknown[] = [];
  const setSelectRows = (rows: unknown[]) => {
    selectRows = rows;
  };

  const select = vi.fn(() => {
    const chain = Object.assign(Promise.resolve(selectRows), {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
    });
    return chain;
  });

  const execute = vi.fn(() => {
    calls.push("lock");
    return Promise.resolve();
  });

  const updateReturning = vi.fn(
    async (): Promise<unknown[]> => [draftInvoiceRow],
  );
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const deleteWhere = vi.fn(() => {
    calls.push("delete-lines");
    return Promise.resolve([]);
  });
  const remove = vi.fn(() => ({ where: deleteWhere }));

  const insertValues = vi.fn((values: unknown) => {
    calls.push(Array.isArray(values) ? "insert-lines" : "insert-invoice");
    if (Array.isArray(values)) {
      return Promise.resolve([]);
    }
    return { returning: vi.fn(async () => [draftInvoiceRow]) };
  });
  const insert = vi.fn(() => ({ values: insertValues }));

  return {
    calls,
    draftInvoiceRow,
    setSelectRows,
    select,
    execute,
    update,
    updateSet,
    updateReturning,
    remove,
    deleteWhere,
    insert,
    insertValues,
  };
});

vi.mock("@/db", () => ({
  db: {
    select: txState.select,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        select: txState.select,
        execute: txState.execute,
        update: txState.update,
        delete: txState.remove,
        insert: txState.insert,
      }),
    ),
  },
}));

import {
  findClosedBillingPeriods,
  upsertInvoiceForPeriod,
} from "./invoice.repository";

const invoiceInput = {
  userId: "user-1",
  organizationId: "org-1",
  periodStart: "2025-10-01",
  periodEnd: "2025-10-31",
  status: "VALIDATED" as const,
  totalAmount: "950.00",
};

const lines = [
  {
    type: "TASK",
    label: "Tasks M for Alice (Website)",
    quantity: 2,
    unitPrice: "75.00",
    total: "150.00",
  },
  {
    type: "PRESENCE",
    presenceType: "FULL_DAY",
    label: "Presence for Alice",
    quantity: 10,
    unitPrice: "80.00",
    total: "800.00",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  txState.calls.length = 0;
  txState.setSelectRows([]);
  txState.updateReturning.mockReset();
  txState.updateReturning.mockImplementation(async () => [
    txState.draftInvoiceRow,
  ]);
});

describe("findClosedBillingPeriods", () => {
  it("returns the period keys of validated and paid invoices", async () => {
    txState.setSelectRows([
      { periodStart: "2025-09-01" },
      { periodStart: "2025-10-01" },
      { periodStart: "2025-11-01" },
    ]);

    const closed = await findClosedBillingPeriods("user-1", "org-1");

    expect(closed).toEqual(new Set(["2025-09", "2025-10", "2025-11"]));
  });

  it("returns an empty set when nothing has been invoiced yet", async () => {
    txState.setSelectRows([]);

    const closed = await findClosedBillingPeriods("user-1", "org-1");

    expect(closed.size).toBe(0);
  });
});

describe("upsertInvoiceForPeriod", () => {
  it("creates the invoice, its lines and archives the billing tickets atomically", async () => {
    txState.setSelectRows([]);
    txState.updateReturning.mockResolvedValueOnce([{ id: "task-1" }]);

    const result = await upsertInvoiceForPeriod(invoiceInput, lines, [
      "task-1",
      "task-2",
    ]);

    expect(result.conflict).toBe(false);
    if (result.conflict) return;

    expect(result.invoice).toBe(txState.draftInvoiceRow);
    expect(result.archivedTaskIds).toEqual(["task-1"]);
    expect(txState.execute).toHaveBeenCalledTimes(1);
    expect(txState.calls).toEqual(["lock", "insert-invoice", "insert-lines"]);
    expect(txState.insertValues).toHaveBeenCalledWith([
      expect.objectContaining({ invoiceId: "inv-1", type: "TASK" }),
      expect.objectContaining({ invoiceId: "inv-1", type: "PRESENCE" }),
    ]);
  });

  it("replaces an existing draft in place without duplicating lines", async () => {
    txState.setSelectRows([txState.draftInvoiceRow]);
    txState.updateReturning
      .mockResolvedValueOnce([txState.draftInvoiceRow])
      .mockResolvedValueOnce([{ id: "task-1" }]);

    const result = await upsertInvoiceForPeriod(invoiceInput, lines, [
      "task-1",
    ]);

    expect(result.conflict).toBe(false);
    expect(txState.calls).toEqual(["lock", "delete-lines", "insert-lines"]);
    expect(txState.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "VALIDATED",
        totalAmount: "950.00",
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("returns a conflict instead of modifying an invoice that is already validated", async () => {
    txState.setSelectRows([
      { ...txState.draftInvoiceRow, status: "VALIDATED" },
    ]);

    const result = await upsertInvoiceForPeriod(invoiceInput, lines, [
      "task-1",
    ]);

    expect(result).toEqual({ conflict: true });
    expect(txState.calls).toEqual(["lock"]);
    expect(txState.updateSet).not.toHaveBeenCalled();
    expect(txState.insertValues).not.toHaveBeenCalled();
    expect(txState.deleteWhere).not.toHaveBeenCalled();
  });

  it("returns a conflict for invoices that are already paid", async () => {
    txState.setSelectRows([{ ...txState.draftInvoiceRow, status: "PAID" }]);

    const result = await upsertInvoiceForPeriod(invoiceInput, lines, []);

    expect(result).toEqual({ conflict: true });
    expect(txState.updateSet).not.toHaveBeenCalled();
  });

  it("does not archive tickets when the invoice is saved as a draft", async () => {
    txState.setSelectRows([]);

    const result = await upsertInvoiceForPeriod(
      { ...invoiceInput, status: "DRAFT" },
      lines,
      ["task-1"],
    );

    expect(result.conflict).toBe(false);
    if (result.conflict) return;
    expect(result.archivedTaskIds).toEqual([]);
    expect(txState.updateSet).not.toHaveBeenCalled();
    expect(txState.calls).toEqual(["lock", "insert-invoice", "insert-lines"]);
  });

  it("clears stale lines even when the new set is empty", async () => {
    txState.setSelectRows([txState.draftInvoiceRow]);
    txState.updateReturning
      .mockResolvedValueOnce([txState.draftInvoiceRow])
      .mockResolvedValueOnce([]);

    const result = await upsertInvoiceForPeriod(invoiceInput, [], []);

    expect(result.conflict).toBe(false);
    expect(txState.deleteWhere).toHaveBeenCalledTimes(1);
    expect(txState.insertValues).not.toHaveBeenCalled();
  });

  it("skips archiving when no billing tickets are eligible", async () => {
    txState.setSelectRows([]);

    const result = await upsertInvoiceForPeriod(invoiceInput, lines, []);

    expect(result.conflict).toBe(false);
    if (result.conflict) return;
    expect(result.archivedTaskIds).toEqual([]);
    expect(txState.update).not.toHaveBeenCalled();
  });
});
