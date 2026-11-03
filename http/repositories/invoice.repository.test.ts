import { beforeEach, describe, expect, it, vi } from "vitest";

const txState = vi.hoisted(() => {
  const calls: string[] = [];

  const invoiceRow = {
    id: "inv-1",
    userId: "user-1",
    organizationId: "org-1",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    status: "VALIDATED",
    totalAmount: "950.00",
  };

  const updateReturning = vi.fn(async () => [invoiceRow]);
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const deleteWhere = vi.fn(() => {
    calls.push("delete");
    return Promise.resolve([]);
  });
  const remove = vi.fn(() => ({ where: deleteWhere }));

  const insertValues = vi.fn(() => {
    calls.push("insert");
    return Promise.resolve([]);
  });
  const insert = vi.fn(() => ({ values: insertValues }));

  return {
    calls,
    invoiceRow,
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
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        update: txState.update,
        delete: txState.remove,
        insert: txState.insert,
      }),
    ),
  },
}));

import { replaceInvoiceWithLines } from "./invoice.repository";

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
});

describe("replaceInvoiceWithLines", () => {
  it("replaces the previous line set with the new one without duplicating lines", async () => {
    const invoice = await replaceInvoiceWithLines(
      "inv-1",
      { status: "VALIDATED", totalAmount: "950.00" },
      lines,
    );

    expect(invoice).toBe(txState.invoiceRow);
    expect(txState.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "VALIDATED",
        totalAmount: "950.00",
        updatedAt: expect.any(Date),
      }),
    );
    expect(txState.deleteWhere).toHaveBeenCalledTimes(1);
    expect(txState.insertValues).toHaveBeenCalledWith([
      expect.objectContaining({ invoiceId: "inv-1", type: "TASK" }),
      expect.objectContaining({ invoiceId: "inv-1", type: "PRESENCE" }),
    ]);
    expect(txState.calls).toEqual(["delete", "insert"]);
  });

  it("clears stale lines even when the new set is empty", async () => {
    const invoice = await replaceInvoiceWithLines(
      "inv-1",
      { status: "DRAFT" },
      [],
    );

    expect(invoice).toBe(txState.invoiceRow);
    expect(txState.deleteWhere).toHaveBeenCalledTimes(1);
    expect(txState.insertValues).not.toHaveBeenCalled();
  });

  it("fails when the invoice no longer exists", async () => {
    txState.updateReturning.mockResolvedValueOnce([]);

    await expect(
      replaceInvoiceWithLines("inv-missing", { status: "DRAFT" }, lines),
    ).rejects.toThrow("Invoice not found");
    expect(txState.insertValues).not.toHaveBeenCalled();
  });
});
