import { beforeEach, describe, expect, it, vi } from "vitest";

const txState = vi.hoisted(() => {
  const calls: string[] = [];
  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  const updateQueue: unknown[][] = [];

  let lastInsertValues: unknown;
  let lastUpdateSet: unknown;

  const reset = () => {
    calls.length = 0;
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    lastInsertValues = undefined;
    lastUpdateSet = undefined;
  };

  const enqueueSelect = (rows: unknown[]) => {
    selectQueue.push(rows);
  };
  const enqueueInsert = (rows: unknown[]) => {
    insertQueue.push(rows);
  };
  const enqueueUpdate = (rows: unknown[]) => {
    updateQueue.push(rows);
  };

  const select = vi.fn(() => {
    calls.push("select");
    const rows = selectQueue.shift() ?? [];
    const chain = Object.assign(Promise.resolve(rows), {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
    });
    return chain;
  });

  const insert = vi.fn(() => {
    calls.push("insert");
    const values = vi.fn((value: unknown) => {
      lastInsertValues = value;
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
      lastUpdateSet = value;
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

  return {
    calls,
    reset,
    enqueueSelect,
    enqueueInsert,
    enqueueUpdate,
    getLastInsertValues: () => lastInsertValues,
    getLastUpdateSet: () => lastUpdateSet,
    select,
    insert,
    update,
    execute,
  };
});

vi.mock("@/db", () => ({
  db: {
    select: txState.select,
    insert: txState.insert,
    update: txState.update,
    execute: txState.execute,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        select: txState.select,
        insert: txState.insert,
        update: txState.update,
        execute: txState.execute,
      }),
    ),
  },
}));

import {
  ensureLiveSubscription,
  findLatestSubscriptionByOrganizationId,
  findLiveSubscriptionWithPlan,
  findPaymentsByOrganizationId,
  findPendingPaymentByOrganizationId,
  findSubscriptionById,
  findSubscriptionPlanByCode,
  findSubscriptionPlanById,
  findSubscriptionPlans,
  insertSubscriptionEvent,
  insertSubscriptionPayment,
  replaceLiveSubscription,
  updateSubscriptionState,
} from "./subscription.repository";

const planRow = {
  id: "33333333-3333-4333-8333-333333333333",
  code: "PRO",
  name: "Pro",
  description: null,
  amountMinor: 1900,
  currency: "USD",
  interval: "MONTHLY",
  maxMembers: null,
  maxProjects: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const subscriptionRow = {
  id: "22222222-2222-4222-8222-222222222222",
  organizationId: "11111111-1111-4111-8111-111111111111",
  planId: planRow.id,
  status: "ACTIVE",
  interval: "MONTHLY",
  amountMinor: 1900,
  currency: "USD",
  provider: "internal",
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const liveValues = {
  organizationId: subscriptionRow.organizationId,
  planId: planRow.id,
  status: "ACTIVE" as const,
  interval: "MONTHLY" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "internal",
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  txState.reset();
});

describe("plan and subscription lookups", () => {
  it("lists plans in queue order", async () => {
    txState.enqueueSelect([planRow, { ...planRow, code: "FREE" }]);

    const plans = await findSubscriptionPlans();

    expect(plans).toHaveLength(2);
    expect(txState.calls).toEqual(["select"]);
  });

  it("finds a plan by code", async () => {
    txState.enqueueSelect([planRow]);

    const plan = await findSubscriptionPlanByCode("PRO");

    expect(plan?.id).toBe(planRow.id);
  });

  it("returns null for a missing plan code", async () => {
    txState.enqueueSelect([]);

    const plan = await findSubscriptionPlanByCode("PRO");

    expect(plan).toBeNull();
  });

  it("finds a subscription by id", async () => {
    txState.enqueueSelect([subscriptionRow]);

    const subscription = await findSubscriptionById(subscriptionRow.id);

    expect(subscription?.id).toBe(subscriptionRow.id);
  });

  it("returns null when no subscription exists for an organization", async () => {
    txState.enqueueSelect([]);

    const subscription = await findLatestSubscriptionByOrganizationId(
      subscriptionRow.organizationId,
    );

    expect(subscription).toBeNull();
  });

  it("joins the live subscription with its plan", async () => {
    txState.enqueueSelect([{ subscription: subscriptionRow, plan: planRow }]);

    const result = await findLiveSubscriptionWithPlan(
      subscriptionRow.organizationId,
    );

    expect(result).toEqual({ ...subscriptionRow, plan: planRow });
  });

  it("returns null when there is no live subscription", async () => {
    txState.enqueueSelect([]);

    const result = await findLiveSubscriptionWithPlan(
      subscriptionRow.organizationId,
    );

    expect(result).toBeNull();
  });
});

describe("ensureLiveSubscription", () => {
  it("creates a subscription when the organization has none", async () => {
    txState.enqueueSelect([]);
    txState.enqueueInsert([subscriptionRow]);

    const result = await ensureLiveSubscription(liveValues);

    expect(result).toEqual({ row: subscriptionRow, created: true });
    expect(txState.calls).toEqual(["lock", "select", "insert"]);
    expect(txState.getLastInsertValues()).toEqual(liveValues);
  });

  it("returns the existing live subscription untouched", async () => {
    txState.enqueueSelect([subscriptionRow]);

    const result = await ensureLiveSubscription(liveValues);

    expect(result).toEqual({ row: subscriptionRow, created: false });
    expect(txState.calls).toEqual(["lock", "select"]);
    expect(txState.insert).not.toHaveBeenCalled();
  });
});

describe("replaceLiveSubscription", () => {
  it("creates the first subscription when none exists", async () => {
    txState.enqueueSelect([]);
    txState.enqueueInsert([subscriptionRow]);

    const result = await replaceLiveSubscription(liveValues);

    expect(result).toEqual({
      previous: null,
      subscription: subscriptionRow,
      changed: true,
    });
    expect(txState.calls).toEqual(["lock", "select", "insert"]);
  });

  it("cancels the previous subscription and inserts the new plan", async () => {
    txState.enqueueSelect([subscriptionRow]);
    txState.enqueueUpdate([]);
    txState.enqueueInsert([
      { ...subscriptionRow, id: "44444444-4444-4444-8444-444444444444" },
    ]);

    const result = await replaceLiveSubscription({
      ...liveValues,
      planId: "55555555-5555-4555-8555-555555555555",
    });

    expect(result.changed).toBe(true);
    expect(result.previous?.id).toBe(subscriptionRow.id);
    expect(result.subscription.id).toBe("44444444-4444-4444-8444-444444444444");
    expect(txState.calls).toEqual(["lock", "select", "update", "insert"]);
    expect(txState.getLastUpdateSet()).toEqual(
      expect.objectContaining({
        status: "CANCELED",
        cancelAtPeriodEnd: false,
        canceledAt: expect.any(Date),
      }),
    );
  });

  it("is a no-op when the same plan is already live", async () => {
    txState.enqueueSelect([subscriptionRow]);

    const result = await replaceLiveSubscription(liveValues);

    expect(result).toEqual({
      previous: subscriptionRow,
      subscription: subscriptionRow,
      changed: false,
    });
    expect(txState.calls).toEqual(["lock", "select"]);
  });
});

describe("updateSubscriptionState", () => {
  it("patches the live subscription and reports the previous row", async () => {
    const canceled = { ...subscriptionRow, status: "CANCELED" };
    txState.enqueueSelect([subscriptionRow]);
    txState.enqueueUpdate([canceled]);

    const result = await updateSubscriptionState(
      subscriptionRow.organizationId,
      { status: "CANCELED" },
    );

    expect(result).toEqual({
      previous: subscriptionRow,
      subscription: canceled,
    });
    expect(txState.getLastUpdateSet()).toEqual(
      expect.objectContaining({
        status: "CANCELED",
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("falls back to the latest subscription when none is live", async () => {
    const terminal = { ...subscriptionRow, status: "CANCELED" };
    txState.enqueueSelect([]);
    txState.enqueueSelect([terminal]);
    txState.enqueueUpdate([{ ...terminal, status: "EXPIRED" }]);

    const result = await updateSubscriptionState(
      subscriptionRow.organizationId,
      { status: "EXPIRED" },
    );

    expect(result?.previous.status).toBe("CANCELED");
    expect(result?.subscription.status).toBe("EXPIRED");
    expect(txState.calls).toEqual(["lock", "select", "select", "update"]);
  });

  it("returns null when the organization has no subscription", async () => {
    txState.enqueueSelect([]);
    txState.enqueueSelect([]);

    const result = await updateSubscriptionState(
      subscriptionRow.organizationId,
      { status: "CANCELED" },
    );

    expect(result).toBeNull();
    expect(txState.update).not.toHaveBeenCalled();
  });
});

describe("insertSubscriptionPayment", () => {
  it("inserts a provider payment once", async () => {
    const payment = {
      id: "66666666-6666-4666-8666-666666666666",
      organizationId: subscriptionRow.organizationId,
      subscriptionId: subscriptionRow.id,
      status: "SUCCEEDED",
      amountMinor: 1900,
      currency: "USD",
      provider: "stripe",
      providerPaymentId: "pi_123",
      paidAt: new Date(),
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    txState.enqueueInsert([payment]);

    const result = await insertSubscriptionPayment({
      organizationId: subscriptionRow.organizationId,
      subscriptionId: subscriptionRow.id,
      planId: planRow.id,
      status: "SUCCEEDED",
      amountMinor: 1900,
      currency: "USD",
      provider: "stripe",
      providerPaymentId: "pi_123",
      paidAt: new Date(),
      failureReason: null,
    });

    expect(result).toEqual({ row: payment, created: true });
    expect(txState.calls).toEqual(["insert", "conflict"]);
  });

  it("returns the existing payment when the provider id conflicts", async () => {
    const existing = { id: "77777777-7777-4777-8777-777777777777" };
    txState.enqueueInsert([]);
    txState.enqueueSelect([existing]);

    const result = await insertSubscriptionPayment({
      organizationId: subscriptionRow.organizationId,
      subscriptionId: subscriptionRow.id,
      planId: planRow.id,
      status: "SUCCEEDED",
      amountMinor: 1900,
      currency: "USD",
      provider: "stripe",
      providerPaymentId: "pi_123",
      paidAt: null,
      failureReason: null,
    });

    expect(result).toEqual({ row: existing, created: false });
    expect(txState.calls).toEqual(["insert", "conflict", "select"]);
  });

  it("inserts internal payments without a conflict guard", async () => {
    const payment = { id: "88888888-8888-4888-8888-888888888888" };
    txState.enqueueInsert([payment]);

    const result = await insertSubscriptionPayment({
      organizationId: subscriptionRow.organizationId,
      subscriptionId: subscriptionRow.id,
      planId: planRow.id,
      status: "PENDING",
      amountMinor: 1900,
      currency: "USD",
      provider: "internal",
      providerPaymentId: null,
      paidAt: null,
      failureReason: null,
    });

    expect(result.created).toBe(true);
    expect(txState.calls).toEqual(["insert"]);
  });
});

describe("insertSubscriptionEvent", () => {
  it("inserts an internal event without a provider id", async () => {
    const event = { id: "99999999-9999-4999-8999-999999999999" };
    txState.enqueueInsert([event]);

    const result = await insertSubscriptionEvent({
      organizationId: subscriptionRow.organizationId,
      subscriptionId: subscriptionRow.id,
      type: "SUBSCRIPTION_CREATED",
      provider: "internal",
      providerEventId: null,
      payload: "{}",
    });

    expect(result).toEqual({ row: event, created: true });
    expect(txState.calls).toEqual(["insert"]);
  });

  it("returns the stored event when the provider event id conflicts", async () => {
    const existing = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
    txState.enqueueInsert([]);
    txState.enqueueSelect([existing]);

    const result = await insertSubscriptionEvent({
      organizationId: subscriptionRow.organizationId,
      subscriptionId: subscriptionRow.id,
      type: "invoice.payment_failed",
      provider: "stripe",
      providerEventId: "evt_123",
      payload: "{}",
    });

    expect(result).toEqual({ row: existing, created: false });
    expect(txState.calls).toEqual(["insert", "conflict", "select"]);
  });

  it("inserts provider events with the conflict guard", async () => {
    const event = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" };
    txState.enqueueInsert([event]);

    const result = await insertSubscriptionEvent({
      organizationId: subscriptionRow.organizationId,
      subscriptionId: subscriptionRow.id,
      type: "invoice.paid",
      provider: "stripe",
      providerEventId: "evt_456",
      payload: "{}",
    });

    expect(result.created).toBe(true);
    expect(txState.calls).toEqual(["insert", "conflict"]);
  });
});

describe("billing payment lookups", () => {
  const paymentRow = {
    id: "66666666-6666-4666-8666-666666666666",
    organizationId: subscriptionRow.organizationId,
    subscriptionId: subscriptionRow.id,
    planId: planRow.id,
    status: "PENDING",
    amountMinor: 1900,
    currency: "USD",
    provider: "internal",
    providerPaymentId: null,
    paidAt: null,
    failureReason: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("finds a plan by id", async () => {
    txState.enqueueSelect([planRow]);

    const plan = await findSubscriptionPlanById(planRow.id);

    expect(plan?.id).toBe(planRow.id);
    expect(txState.calls).toEqual(["select"]);
  });

  it("returns null for a missing plan id", async () => {
    txState.enqueueSelect([]);

    const plan = await findSubscriptionPlanById(planRow.id);

    expect(plan).toBeNull();
  });

  it("returns the latest pending payment for the organization", async () => {
    txState.enqueueSelect([{ payment: paymentRow }]);

    const payment = await findPendingPaymentByOrganizationId(
      subscriptionRow.organizationId,
    );

    expect(payment).toEqual(paymentRow);
    expect(txState.calls).toEqual(["select"]);
  });

  it("returns null when no pending payment exists", async () => {
    txState.enqueueSelect([]);

    const payment = await findPendingPaymentByOrganizationId(
      subscriptionRow.organizationId,
    );

    expect(payment).toBeNull();
  });

  it("returns payment history rows for the organization", async () => {
    const historyRow = {
      id: paymentRow.id,
      planId: planRow.id,
      planCode: "PRO",
      status: "SUCCEEDED",
      amountMinor: 1900,
      currency: "USD",
      provider: "internal",
      providerPaymentId: "pi_123",
      paidAt: new Date("2026-01-02T00:00:00.000Z"),
      failureReason: null,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    txState.enqueueSelect([historyRow]);

    const rows = await findPaymentsByOrganizationId(
      subscriptionRow.organizationId,
    );

    expect(rows).toEqual([historyRow]);
    expect(txState.calls).toEqual(["select"]);
  });
});
