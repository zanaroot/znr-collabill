import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentWebhookEvent } from "@/packages/payment";

const txState = vi.hoisted(() => {
  const calls: string[] = [];
  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  const updateQueue: unknown[][] = [];
  const insertValuesLog: unknown[] = [];
  const updateSets: unknown[] = [];

  const reset = () => {
    calls.length = 0;
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    insertValuesLog.length = 0;
    updateSets.length = 0;
  };

  const select = vi.fn(() => {
    calls.push("select");
    const rows = selectQueue.shift() ?? [];
    const chain = Object.assign(Promise.resolve(rows), {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      for: vi.fn(() => chain),
    });
    return chain;
  });

  const insert = vi.fn(() => {
    calls.push("insert");
    const values = vi.fn((value: unknown) => {
      insertValuesLog.push(value);
      const rows = insertQueue.shift() ?? [];
      const builder = {
        onConflictDoNothing: vi.fn(() => {
          calls.push("conflict");
          return builder;
        }),
        returning: vi.fn(() => Promise.resolve(rows)),
      };
      return builder;
    });
    return { values };
  });

  const update = vi.fn(() => {
    calls.push("update");
    const rows = updateQueue.shift() ?? [];
    const set = vi.fn((value: unknown) => {
      updateSets.push(value);
      const where = vi.fn(() => {
        const chain = Object.assign(Promise.resolve(rows), {
          returning: vi.fn(() => Promise.resolve(rows)),
        });
        return chain;
      });
      return { where };
    });
    return { set };
  });

  const execute = vi.fn(() => {
    calls.push("lock");
    return Promise.resolve();
  });

  const tx = { select, insert, update, execute };

  return {
    calls,
    reset,
    enqueueSelect: (rows: unknown[]) => selectQueue.push(rows),
    enqueueInsert: (rows: unknown[]) => insertQueue.push(rows),
    enqueueUpdate: (rows: unknown[]) => updateQueue.push(rows),
    getInsertValues: () => insertValuesLog,
    getUpdateSets: () => updateSets,
    select,
    insert,
    update,
    execute,
    tx,
  };
});

vi.mock("@/db", () => ({
  db: {
    select: txState.select,
    insert: txState.insert,
    update: txState.update,
    execute: txState.execute,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(txState.tx),
    ),
  },
}));

import {
  applyPaymentProviderEvent,
  findSubscriptionPaymentById,
  findSubscriptionPaymentByProviderPaymentId,
  linkSubscriptionPaymentSession,
  updateSubscriptionPayment,
} from "./payment.repository";

const organizationId = "11111111-1111-4111-8111-111111111111";
const subscriptionId = "22222222-2222-4222-8222-222222222222";
const planId = "33333333-3333-4333-8333-333333333333";

const pendingPayment = {
  id: "66666666-6666-4666-8666-666666666666",
  organizationId,
  subscriptionId,
  planId,
  status: "PENDING",
  amountMinor: 1900,
  currency: "USD",
  provider: "mock",
  providerPaymentId: "cs_mock_1",
  paidAt: null,
  failureReason: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const succeededPayment = { ...pendingPayment, status: "SUCCEEDED" };

const subscriptionRow = {
  id: subscriptionId,
  organizationId,
  planId,
  status: "TRIALING",
  interval: "MONTHLY",
  amountMinor: 0,
  currency: "USD",
  provider: null,
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const successEvent: PaymentWebhookEvent = {
  eventId: "evt_1",
  type: "payment.succeeded",
  providerPaymentId: "cs_mock_1",
  amountMinor: 1900,
  currency: "USD",
  organizationId,
  failureReason: null,
  occurredAt: "2026-01-02T00:00:00.000Z",
};

const successPatch = {
  planId,
  status: "ACTIVE" as const,
  interval: "MONTHLY" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "mock",
};

const succeededEventRow = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };

beforeEach(() => {
  vi.clearAllMocks();
  txState.reset();
});

describe("payment lookups", () => {
  it("finds a payment by id", async () => {
    txState.enqueueSelect([pendingPayment]);

    const payment = await findSubscriptionPaymentById(pendingPayment.id);

    expect(payment).toEqual(pendingPayment);
    expect(txState.calls).toEqual(["select"]);
  });

  it("returns null for a missing payment id", async () => {
    txState.enqueueSelect([]);

    const payment = await findSubscriptionPaymentById("missing");

    expect(payment).toBeNull();
  });

  it("finds a payment by provider payment id", async () => {
    txState.enqueueSelect([pendingPayment]);

    const payment =
      await findSubscriptionPaymentByProviderPaymentId("cs_mock_1");

    expect(payment?.id).toBe(pendingPayment.id);
  });

  it("returns null for an unknown provider payment id", async () => {
    txState.enqueueSelect([]);

    const payment = await findSubscriptionPaymentByProviderPaymentId("unknown");

    expect(payment).toBeNull();
  });
});

describe("payment session linking", () => {
  it("links a checkout session to the payment", async () => {
    txState.enqueueUpdate([{ ...pendingPayment, providerPaymentId: "cs_9" }]);

    const linked = await linkSubscriptionPaymentSession(
      pendingPayment.id,
      "cs_9",
    );

    expect(linked?.providerPaymentId).toBe("cs_9");
    expect(txState.getUpdateSets()[0]).toEqual(
      expect.objectContaining({
        providerPaymentId: "cs_9",
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("returns null when no payment row is updated", async () => {
    txState.enqueueUpdate([]);

    const linked = await linkSubscriptionPaymentSession("missing", "cs_9");

    expect(linked).toBeNull();
  });

  it("patches a payment row", async () => {
    txState.enqueueUpdate([
      { ...pendingPayment, status: "FAILED", failureReason: "declined" },
    ]);

    const updated = await updateSubscriptionPayment(pendingPayment.id, {
      status: "FAILED",
      failureReason: "declined",
    });

    expect(updated?.status).toBe("FAILED");
    expect(txState.getUpdateSets()[0]).toEqual(
      expect.objectContaining({ status: "FAILED", failureReason: "declined" }),
    );
  });

  it("returns null when the payment row is missing", async () => {
    txState.enqueueUpdate([]);

    const updated = await updateSubscriptionPayment("missing", {
      status: "FAILED",
    });

    expect(updated).toBeNull();
  });
});

describe("applyPaymentProviderEvent", () => {
  it("returns unknown_payment when no payment matches the provider id", async () => {
    txState.enqueueSelect([]);

    const result = await applyPaymentProviderEvent({
      provider: "mock",
      eventType: "PAYMENT_SUCCEEDED",
      event: successEvent,
      subscriptionPatch: successPatch,
    });

    expect(result).toEqual({ outcome: "unknown_payment" });
    expect(txState.calls).toEqual(["select"]);
    expect(txState.insert).not.toHaveBeenCalled();
    expect(txState.update).not.toHaveBeenCalled();
  });

  it("stores the event and applies a successful payment", async () => {
    txState.enqueueSelect([pendingPayment]);
    txState.enqueueInsert([succeededEventRow]);
    txState.enqueueUpdate([
      { ...pendingPayment, status: "SUCCEEDED", paidAt: new Date() },
    ]);
    txState.enqueueSelect([]);
    txState.enqueueSelect([subscriptionRow]);
    txState.enqueueUpdate([
      { ...subscriptionRow, status: "ACTIVE", planId, amountMinor: 1900 },
    ]);

    const result = await applyPaymentProviderEvent({
      provider: "mock",
      eventType: "PAYMENT_SUCCEEDED",
      event: successEvent,
      subscriptionPatch: successPatch,
    });

    expect(result.outcome).toBe("processed");
    if (result.outcome !== "processed") return;
    expect(result.payment.status).toBe("SUCCEEDED");
    expect(result.subscription?.status).toBe("ACTIVE");
    expect(txState.calls).toEqual([
      "select",
      "lock",
      "insert",
      "conflict",
      "update",
      "select",
      "select",
      "update",
    ]);
    expect(txState.getInsertValues()[0]).toEqual(
      expect.objectContaining({
        organizationId,
        subscriptionId,
        type: "PAYMENT_SUCCEEDED",
        provider: "mock",
        providerEventId: "evt_1",
      }),
    );
    const [paymentPatch, subscriptionPatchUpdate] = txState.getUpdateSets();
    expect(paymentPatch).toEqual(
      expect.objectContaining({
        status: "SUCCEEDED",
        paidAt: expect.any(Date),
        failureReason: null,
      }),
    );
    expect(subscriptionPatchUpdate).toEqual(
      expect.objectContaining({ status: "ACTIVE", planId }),
    );
  });

  it("prefers the live subscription over the payment subscription row", async () => {
    txState.enqueueSelect([pendingPayment]);
    txState.enqueueInsert([succeededEventRow]);
    txState.enqueueUpdate([
      { ...pendingPayment, status: "SUCCEEDED", paidAt: new Date() },
    ]);
    txState.enqueueSelect([subscriptionRow]);
    txState.enqueueUpdate([{ ...subscriptionRow, status: "ACTIVE" }]);

    const result = await applyPaymentProviderEvent({
      provider: "mock",
      eventType: "PAYMENT_SUCCEEDED",
      event: successEvent,
      subscriptionPatch: successPatch,
    });

    expect(result.outcome).toBe("processed");
    if (result.outcome !== "processed") return;
    expect(result.subscription?.id).toBe(subscriptionId);
    expect(txState.calls).toEqual([
      "select",
      "lock",
      "insert",
      "conflict",
      "update",
      "select",
      "update",
    ]);
  });

  it("ignores a duplicate provider event id", async () => {
    txState.enqueueSelect([pendingPayment]);
    txState.enqueueInsert([]);

    const result = await applyPaymentProviderEvent({
      provider: "mock",
      eventType: "PAYMENT_SUCCEEDED",
      event: successEvent,
      subscriptionPatch: successPatch,
    });

    expect(result).toEqual({ outcome: "duplicate", payment: pendingPayment });
    expect(txState.calls).toEqual(["select", "lock", "insert", "conflict"]);
    expect(txState.update).not.toHaveBeenCalled();
  });

  it("ignores a late failure after the payment already succeeded", async () => {
    txState.enqueueSelect([succeededPayment]);
    txState.enqueueInsert([{ id: "evt-row-2" }]);

    const result = await applyPaymentProviderEvent({
      provider: "mock",
      eventType: "PAYMENT_FAILED",
      event: { ...successEvent, eventId: "evt_2", type: "payment.failed" },
    });

    expect(result).toEqual({
      outcome: "ignored",
      reason: "out_of_order",
      payment: succeededPayment,
    });
    expect(txState.update).not.toHaveBeenCalled();
  });

  it("reports an already settled payment for a repeated success", async () => {
    txState.enqueueSelect([succeededPayment]);
    txState.enqueueInsert([{ id: "evt-row-3" }]);

    const result = await applyPaymentProviderEvent({
      provider: "mock",
      eventType: "PAYMENT_SUCCEEDED",
      event: { ...successEvent, eventId: "evt_3" },
    });

    expect(result).toEqual({
      outcome: "ignored",
      reason: "already_settled",
      payment: succeededPayment,
    });
    expect(txState.update).not.toHaveBeenCalled();
  });

  it("marks a failed payment without touching the subscription", async () => {
    txState.enqueueSelect([pendingPayment]);
    txState.enqueueInsert([{ id: "evt-row-4" }]);
    txState.enqueueUpdate([
      {
        ...pendingPayment,
        status: "FAILED",
        failureReason: "declined",
        paidAt: null,
      },
    ]);

    const result = await applyPaymentProviderEvent({
      provider: "mock",
      eventType: "PAYMENT_FAILED",
      event: { ...successEvent, type: "payment.failed" },
    });

    expect(result.outcome).toBe("processed");
    if (result.outcome !== "processed") return;
    expect(result.payment.status).toBe("FAILED");
    expect(result.payment.failureReason).toBe("declined");
    expect(result.subscription).toBeNull();
    expect(txState.calls).toEqual([
      "select",
      "lock",
      "insert",
      "conflict",
      "update",
    ]);
  });

  it("marks a refunded payment without revoking the subscription", async () => {
    txState.enqueueSelect([succeededPayment]);
    txState.enqueueInsert([{ id: "evt-row-5" }]);
    txState.enqueueUpdate([{ ...succeededPayment, status: "REFUNDED" }]);

    const result = await applyPaymentProviderEvent({
      provider: "mock",
      eventType: "PAYMENT_REFUNDED",
      event: { ...successEvent, type: "payment.refunded" },
    });

    expect(result.outcome).toBe("processed");
    if (result.outcome !== "processed") return;
    expect(result.payment.status).toBe("REFUNDED");
    expect(result.subscription).toBeNull();
    expect(txState.calls).toEqual([
      "select",
      "lock",
      "insert",
      "conflict",
      "update",
    ]);
  });
});
