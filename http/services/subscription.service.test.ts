import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  ensureLiveSubscription: vi.fn(),
  findLatestSubscriptionByOrganizationId: vi.fn(),
  findLiveSubscriptionWithPlan: vi.fn(),
  findSubscriptionById: vi.fn(),
  findSubscriptionPlanByCode: vi.fn(),
  findSubscriptionPlans: vi.fn(),
  insertSubscriptionEvent: vi.fn(),
  insertSubscriptionPayment: vi.fn(),
  replaceLiveSubscription: vi.fn(),
  updateSubscriptionState: vi.fn(),
}));

vi.mock("@/http/repositories/subscription.repository", () => repoMocks);

import {
  cancelSubscription,
  changeSubscriptionPlan,
  ensureOrganizationSubscription,
  getOrganizationSubscription,
  listSubscriptionPlans,
  NoLiveSubscriptionError,
  recordSubscriptionEvent,
  recordSubscriptionPayment,
  SubscriptionNotFoundError,
  SubscriptionPlanNotFoundError,
  setSubscriptionStatus,
} from "./subscription.service";

const now = new Date("2026-01-01T00:00:00.000Z");
const organizationId = "11111111-1111-4111-8111-111111111111";

const freePlan = {
  id: "33333333-3333-4333-8333-333333333331",
  code: "FREE" as const,
  name: "Free",
  description: "Starter plan for small teams",
  amountMinor: 0,
  currency: "USD",
  interval: null,
  maxMembers: 5,
  maxProjects: 3,
  createdAt: now,
  updatedAt: now,
};

const proPlan = {
  id: "33333333-3333-4333-8333-333333333332",
  code: "PRO" as const,
  name: "Pro",
  description: "Unlimited members and projects",
  amountMinor: 1900,
  currency: "USD",
  interval: "MONTHLY" as const,
  maxMembers: null,
  maxProjects: null,
  createdAt: now,
  updatedAt: now,
};

const subscriptionRow = {
  id: "22222222-2222-4222-8222-222222222222",
  organizationId,
  planId: freePlan.id,
  status: "ACTIVE" as const,
  interval: null,
  amountMinor: 0,
  currency: "USD",
  provider: "internal",
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: now,
  updatedAt: now,
};

const eventRow = { id: "99999999-9999-4999-8999-999999999999" };
const paymentRow = { id: "88888888-8888-4888-8888-888888888888" };

beforeEach(() => {
  vi.resetAllMocks();
  repoMocks.insertSubscriptionEvent.mockResolvedValue({
    event: eventRow,
    created: true,
  });
  repoMocks.insertSubscriptionPayment.mockResolvedValue({
    row: paymentRow,
    created: true,
  });
  repoMocks.findSubscriptionById.mockResolvedValue(subscriptionRow);
});

describe("ensureOrganizationSubscription", () => {
  it("creates the FREE subscription and records a created event", async () => {
    repoMocks.findSubscriptionPlanByCode.mockResolvedValue(freePlan);
    repoMocks.ensureLiveSubscription.mockResolvedValue({
      row: subscriptionRow,
      created: true,
    });

    const result = await ensureOrganizationSubscription({ organizationId });

    expect(result.created).toBe(true);
    expect(result.subscription.plan).toEqual(freePlan);
    expect(repoMocks.findSubscriptionPlanByCode).toHaveBeenCalledWith("FREE");
    expect(repoMocks.ensureLiveSubscription).toHaveBeenCalledWith({
      organizationId,
      planId: freePlan.id,
      status: "ACTIVE",
      interval: null,
      amountMinor: 0,
      currency: "USD",
      provider: "internal",
      providerSubscriptionId: null,
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    expect(repoMocks.insertSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        subscriptionId: subscriptionRow.id,
        type: "SUBSCRIPTION_CREATED",
      }),
    );
  });

  it("skips the event when a live subscription already exists", async () => {
    repoMocks.findSubscriptionPlanByCode.mockResolvedValue(freePlan);
    repoMocks.ensureLiveSubscription.mockResolvedValue({
      row: subscriptionRow,
      created: false,
    });

    const result = await ensureOrganizationSubscription({
      organizationId,
      planCode: "PRO",
      provider: "stripe",
      providerSubscriptionId: "sub_123",
    });

    expect(result.created).toBe(false);
    expect(repoMocks.ensureLiveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: freePlan.id,
        status: "ACTIVE",
      }),
    );
    expect(repoMocks.insertSubscriptionEvent).not.toHaveBeenCalled();
  });

  it("throws when the requested plan does not exist", async () => {
    repoMocks.findSubscriptionPlanByCode.mockResolvedValue(null);

    await expect(
      ensureOrganizationSubscription({
        organizationId,
        planCode: "PRO",
      }),
    ).rejects.toThrow(SubscriptionPlanNotFoundError);
    expect(repoMocks.ensureLiveSubscription).not.toHaveBeenCalled();
  });
});

describe("changeSubscriptionPlan", () => {
  it("terminates the previous plan and records a plan change", async () => {
    const proSubscription = {
      ...subscriptionRow,
      id: "44444444-4444-4444-8444-444444444444",
      planId: proPlan.id,
      interval: "MONTHLY" as const,
      amountMinor: 1900,
    };
    repoMocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);
    repoMocks.replaceLiveSubscription.mockResolvedValue({
      previous: subscriptionRow,
      subscription: proSubscription,
      changed: true,
    });

    const result = await changeSubscriptionPlan({
      organizationId,
      planCode: "PRO",
    });

    expect(result.changed).toBe(true);
    expect(result.previous).toEqual(subscriptionRow);
    expect(result.subscription.plan).toEqual(proPlan);
    expect(repoMocks.replaceLiveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        planId: proPlan.id,
        interval: "MONTHLY",
        amountMinor: 1900,
        status: "ACTIVE",
      }),
    );
    expect(repoMocks.insertSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SUBSCRIPTION_PLAN_CHANGED",
        payload: JSON.stringify({
          planCode: "PRO",
          previousPlanId: freePlan.id,
          previousStatus: "ACTIVE",
        }),
      }),
    );
  });

  it("records a created event when there was no previous subscription", async () => {
    const proSubscription = {
      ...subscriptionRow,
      planId: proPlan.id,
      interval: "MONTHLY" as const,
      amountMinor: 1900,
    };
    repoMocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);
    repoMocks.replaceLiveSubscription.mockResolvedValue({
      previous: null,
      subscription: proSubscription,
      changed: true,
    });

    const result = await changeSubscriptionPlan({
      organizationId,
      planCode: "PRO",
      status: "TRIALING",
      trialEndsAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    expect(result.changed).toBe(true);
    expect(repoMocks.replaceLiveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "TRIALING" }),
    );
    expect(repoMocks.insertSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIPTION_CREATED" }),
    );
  });

  it("is a no-op when the plan is already live", async () => {
    repoMocks.findSubscriptionPlanByCode.mockResolvedValue(freePlan);
    repoMocks.replaceLiveSubscription.mockResolvedValue({
      previous: subscriptionRow,
      subscription: subscriptionRow,
      changed: false,
    });

    const result = await changeSubscriptionPlan({
      organizationId,
      planCode: "FREE",
    });

    expect(result.changed).toBe(false);
    expect(repoMocks.insertSubscriptionEvent).not.toHaveBeenCalled();
  });

  it("throws for an unknown plan code", async () => {
    repoMocks.findSubscriptionPlanByCode.mockResolvedValue(null);

    await expect(
      changeSubscriptionPlan({ organizationId, planCode: "PRO" }),
    ).rejects.toThrow(SubscriptionPlanNotFoundError);
  });
});

describe("cancelSubscription", () => {
  it("cancels immediately and records the event", async () => {
    const canceled = {
      ...subscriptionRow,
      status: "CANCELED" as const,
      canceledAt: now,
    };
    repoMocks.updateSubscriptionState.mockResolvedValue({
      previous: subscriptionRow,
      subscription: canceled,
    });

    const result = await cancelSubscription({ organizationId });

    expect(result.status).toBe("CANCELED");
    expect(repoMocks.updateSubscriptionState).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({
        status: "CANCELED",
        canceledAt: expect.any(Date),
        cancelAtPeriodEnd: false,
      }),
    );
    expect(repoMocks.insertSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIPTION_CANCELED" }),
    );
  });

  it("keeps the subscription live when canceling at period end", async () => {
    const flagged = { ...subscriptionRow, cancelAtPeriodEnd: true };
    repoMocks.updateSubscriptionState.mockResolvedValue({
      previous: subscriptionRow,
      subscription: flagged,
    });

    const result = await cancelSubscription({
      organizationId,
      atPeriodEnd: true,
    });

    expect(result.status).toBe("ACTIVE");
    expect(repoMocks.updateSubscriptionState).toHaveBeenCalledWith(
      organizationId,
      { cancelAtPeriodEnd: true },
    );
  });

  it("throws when the organization has no subscription", async () => {
    repoMocks.updateSubscriptionState.mockResolvedValue(null);

    await expect(cancelSubscription({ organizationId })).rejects.toThrow(
      NoLiveSubscriptionError,
    );
    expect(repoMocks.insertSubscriptionEvent).not.toHaveBeenCalled();
  });
});

describe("setSubscriptionStatus", () => {
  it("is a no-op when the status already matches", async () => {
    repoMocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(
      subscriptionRow,
    );

    const result = await setSubscriptionStatus({
      organizationId,
      status: "ACTIVE",
    });

    expect(result.status).toBe("ACTIVE");
    expect(repoMocks.updateSubscriptionState).not.toHaveBeenCalled();
    expect(repoMocks.insertSubscriptionEvent).not.toHaveBeenCalled();
  });

  it("applies a status transition with billing period dates", async () => {
    const pastDue = { ...subscriptionRow, status: "PAST_DUE" as const };
    const active = { ...subscriptionRow, status: "ACTIVE" as const };
    repoMocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(pastDue);
    repoMocks.updateSubscriptionState.mockResolvedValue({
      previous: pastDue,
      subscription: active,
    });
    const periodStart = new Date("2026-02-01T00:00:00.000Z");
    const periodEnd = new Date("2026-03-01T00:00:00.000Z");

    const result = await setSubscriptionStatus({
      organizationId,
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    expect(result.status).toBe("ACTIVE");
    expect(repoMocks.updateSubscriptionState).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({
        status: "ACTIVE",
        canceledAt: null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      }),
    );
    expect(repoMocks.insertSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SUBSCRIPTION_STATUS_CHANGED",
        payload: JSON.stringify({
          previousStatus: "PAST_DUE",
          status: "ACTIVE",
        }),
      }),
    );
  });

  it("stamps canceledAt when moving to a terminal status", async () => {
    repoMocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(
      subscriptionRow,
    );
    const canceled = {
      ...subscriptionRow,
      status: "CANCELED" as const,
      canceledAt: now,
    };
    repoMocks.updateSubscriptionState.mockResolvedValue({
      previous: subscriptionRow,
      subscription: canceled,
    });

    const result = await setSubscriptionStatus({
      organizationId,
      status: "CANCELED",
    });

    expect(result.status).toBe("CANCELED");
    expect(repoMocks.updateSubscriptionState).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({
        status: "CANCELED",
        canceledAt: expect.any(Date),
      }),
    );
  });

  it("throws when there is no subscription to update", async () => {
    repoMocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(null);

    await expect(
      setSubscriptionStatus({ organizationId, status: "ACTIVE" }),
    ).rejects.toThrow(NoLiveSubscriptionError);
  });
});

describe("recordSubscriptionPayment", () => {
  it("stores the payment and records a payment event", async () => {
    const result = await recordSubscriptionPayment({
      organizationId,
      subscriptionId: subscriptionRow.id,
      amountMinor: 1900,
      status: "SUCCEEDED",
      provider: "stripe",
      providerPaymentId: "pi_123",
      paidAt: now,
    });

    expect(result).toEqual({ payment: paymentRow, created: true });
    expect(repoMocks.insertSubscriptionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        subscriptionId: subscriptionRow.id,
        planId: freePlan.id,
        amountMinor: 1900,
        providerPaymentId: "pi_123",
      }),
    );
    expect(repoMocks.insertSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIPTION_PAYMENT_RECORDED" }),
    );
  });

  it("skips the event for an idempotent replay", async () => {
    repoMocks.insertSubscriptionPayment.mockResolvedValue({
      row: paymentRow,
      created: false,
    });

    const result = await recordSubscriptionPayment({
      organizationId,
      subscriptionId: subscriptionRow.id,
      amountMinor: 1900,
      providerPaymentId: "pi_123",
    });

    expect(result.created).toBe(false);
    expect(repoMocks.insertSubscriptionEvent).not.toHaveBeenCalled();
  });

  it("throws when the subscription does not exist", async () => {
    repoMocks.findSubscriptionById.mockResolvedValue(null);

    await expect(
      recordSubscriptionPayment({
        organizationId,
        subscriptionId: subscriptionRow.id,
        amountMinor: 1900,
      }),
    ).rejects.toThrow(SubscriptionNotFoundError);
    expect(repoMocks.insertSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("rejects payments for another organization", async () => {
    repoMocks.findSubscriptionById.mockResolvedValue({
      ...subscriptionRow,
      organizationId: "22222222-2222-4222-8222-222222222223",
    });

    await expect(
      recordSubscriptionPayment({
        organizationId,
        subscriptionId: subscriptionRow.id,
        amountMinor: 1900,
      }),
    ).rejects.toThrow("does not belong");
  });
});

describe("recordSubscriptionEvent", () => {
  it("serializes the payload and applies defaults", async () => {
    const result = await recordSubscriptionEvent({
      organizationId,
      subscriptionId: subscriptionRow.id,
      type: "SUBSCRIPTION_CREATED",
      payload: { planCode: "FREE" },
    });

    expect(result.created).toBe(true);
    expect(repoMocks.insertSubscriptionEvent).toHaveBeenCalledWith({
      organizationId,
      subscriptionId: subscriptionRow.id,
      type: "SUBSCRIPTION_CREATED",
      provider: "internal",
      providerEventId: null,
      payload: JSON.stringify({ planCode: "FREE" }),
    });
  });

  it("is idempotent for provider event ids", async () => {
    repoMocks.insertSubscriptionEvent.mockResolvedValue({
      event: eventRow,
      created: false,
    });

    const result = await recordSubscriptionEvent({
      organizationId,
      type: "invoice.payment_failed",
      provider: "stripe",
      providerEventId: "evt_123",
    });

    expect(result.created).toBe(false);
  });
});

describe("read paths", () => {
  it("lists plans from the repository", async () => {
    repoMocks.findSubscriptionPlans.mockResolvedValue([freePlan, proPlan]);

    const plans = await listSubscriptionPlans();

    expect(plans).toEqual([freePlan, proPlan]);
  });

  it("returns the live subscription with its plan", async () => {
    repoMocks.findLiveSubscriptionWithPlan.mockResolvedValue({
      ...subscriptionRow,
      plan: freePlan,
    });

    const result = await getOrganizationSubscription(organizationId);

    expect(result?.plan).toEqual(freePlan);
    expect(repoMocks.findLiveSubscriptionWithPlan).toHaveBeenCalledWith(
      organizationId,
    );
  });

  it("rejects invalid organization ids", async () => {
    await expect(getOrganizationSubscription("nope")).rejects.toThrow();
    expect(repoMocks.findLiveSubscriptionWithPlan).not.toHaveBeenCalled();
  });
});
