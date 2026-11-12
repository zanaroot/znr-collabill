import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class NoLiveSubscriptionError extends Error {}
  class SubscriptionNotFoundError extends Error {}
  class SubscriptionPlanNotFoundError extends Error {}

  return {
    NoLiveSubscriptionError,
    SubscriptionNotFoundError,
    SubscriptionPlanNotFoundError,
    findLatestSubscriptionByOrganizationId: vi.fn(),
    findLiveSubscriptionWithPlan: vi.fn(),
    findPendingPaymentByOrganizationId: vi.fn(),
    findPaymentsByOrganizationId: vi.fn(),
    findSubscriptionPlanByCode: vi.fn(),
    findSubscriptionPlanById: vi.fn(),
    insertSubscriptionPayment: vi.fn(),
    cancelSubscription: vi.fn(),
    changeSubscriptionPlan: vi.fn(),
    ensureOrganizationSubscription: vi.fn(),
    listSubscriptionPlans: vi.fn(),
    recordSubscriptionEvent: vi.fn(),
    setSubscriptionStatus: vi.fn(),
    requirePaymentProvider: vi.fn(() => ({ name: "mock" })),
    createCheckoutSession: vi.fn(async () => ({
      providerCheckoutId: "cs_mock_123",
      checkoutUrl:
        "http://localhost:3000/api/payments/mock/checkout/cs_mock_123",
    })),
  };
});

vi.mock("@/http/repositories/subscription.repository", () => ({
  findLatestSubscriptionByOrganizationId:
    mocks.findLatestSubscriptionByOrganizationId,
  findLiveSubscriptionWithPlan: mocks.findLiveSubscriptionWithPlan,
  findPendingPaymentByOrganizationId: mocks.findPendingPaymentByOrganizationId,
  findPaymentsByOrganizationId: mocks.findPaymentsByOrganizationId,
  findSubscriptionPlanByCode: mocks.findSubscriptionPlanByCode,
  findSubscriptionPlanById: mocks.findSubscriptionPlanById,
  insertSubscriptionPayment: mocks.insertSubscriptionPayment,
}));

vi.mock("@/http/services/subscription.service", () => ({
  NoLiveSubscriptionError: mocks.NoLiveSubscriptionError,
  SubscriptionNotFoundError: mocks.SubscriptionNotFoundError,
  SubscriptionPlanNotFoundError: mocks.SubscriptionPlanNotFoundError,
  cancelSubscription: mocks.cancelSubscription,
  changeSubscriptionPlan: mocks.changeSubscriptionPlan,
  ensureOrganizationSubscription: mocks.ensureOrganizationSubscription,
  listSubscriptionPlans: mocks.listSubscriptionPlans,
  recordSubscriptionEvent: mocks.recordSubscriptionEvent,
  setSubscriptionStatus: mocks.setSubscriptionStatus,
}));

vi.mock("@/http/services/payment.service", () => ({
  requirePaymentProvider: mocks.requirePaymentProvider,
  createCheckoutSession: mocks.createCheckoutSession,
}));

import {
  BillingError,
  cancelOrganizationSubscription,
  changeOrganizationPlan,
  getOrganizationSubscription,
  initiateCheckout,
  listBillingPlans,
  listPaymentHistory,
  reactivateOrganizationSubscription,
} from "./billing.service";

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

const freeSubscription = {
  id: "22222222-2222-4222-8222-222222222221",
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
  plan: freePlan,
};

const proSubscription = {
  id: "22222222-2222-4222-8222-222222222222",
  organizationId,
  planId: proPlan.id,
  status: "ACTIVE" as const,
  interval: "MONTHLY" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "internal",
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodStart: now,
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: now,
  updatedAt: now,
  plan: proPlan,
};

const paymentRow = {
  id: "66666666-6666-4666-8666-666666666666",
  organizationId,
  subscriptionId: freeSubscription.id,
  planId: proPlan.id,
  status: "PENDING" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "mock",
  providerPaymentId: null,
  paidAt: null,
  failureReason: null,
  createdAt: now,
  updatedAt: now,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listBillingPlans", () => {
  it("delegates to the plan catalog", async () => {
    mocks.listSubscriptionPlans.mockResolvedValue([freePlan, proPlan]);

    const plans = await listBillingPlans();

    expect(plans).toEqual([freePlan, proPlan]);
    expect(mocks.listSubscriptionPlans).toHaveBeenCalledOnce();
  });
});

describe("getOrganizationSubscription", () => {
  it("provisions the default plan when the organization has no subscription", async () => {
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(null);
    mocks.ensureOrganizationSubscription.mockResolvedValue({
      subscription: freeSubscription,
      created: true,
    });

    const result = await getOrganizationSubscription(organizationId);

    expect(result).toEqual(freeSubscription);
    expect(mocks.ensureOrganizationSubscription).toHaveBeenCalledWith({
      organizationId,
    });
  });

  it("returns the live subscription with its plan", async () => {
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(
      proSubscription,
    );
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(proSubscription);

    const result = await getOrganizationSubscription(organizationId);

    expect(result).toEqual(proSubscription);
    expect(mocks.ensureOrganizationSubscription).not.toHaveBeenCalled();
  });

  it("returns the terminal subscription without resurrecting it", async () => {
    const canceled = { ...proSubscription, status: "CANCELED" as const };
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(canceled);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(null);
    mocks.findSubscriptionPlanById.mockResolvedValue(proPlan);

    const result = await getOrganizationSubscription(organizationId);

    expect(result.status).toBe("CANCELED");
    expect(result.plan).toEqual(proPlan);
    expect(mocks.ensureOrganizationSubscription).not.toHaveBeenCalled();
    expect(mocks.changeSubscriptionPlan).not.toHaveBeenCalled();
  });
});

describe("initiateCheckout", () => {
  it("creates a pending payment priced from the plan", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(freeSubscription);
    mocks.findPendingPaymentByOrganizationId.mockResolvedValue(null);
    mocks.insertSubscriptionPayment.mockResolvedValue({
      row: paymentRow,
      created: true,
    });
    mocks.recordSubscriptionEvent.mockResolvedValue({
      row: {},
      created: true,
    });

    const result = await initiateCheckout({
      organizationId,
      planCode: "PRO",
      interval: "MONTHLY",
    });

    expect(result.payment).toEqual({
      ...paymentRow,
      provider: "mock",
      providerPaymentId: "cs_mock_123",
    });
    expect(result.plan).toEqual(proPlan);
    expect(result.checkoutUrl).toBe(
      "http://localhost:3000/api/payments/mock/checkout/cs_mock_123",
    );
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith({
      paymentId: paymentRow.id,
      organizationId,
      planCode: proPlan.code,
      amountMinor: proPlan.amountMinor,
      currency: proPlan.currency,
    });
    expect(mocks.insertSubscriptionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        subscriptionId: freeSubscription.id,
        planId: proPlan.id,
        status: "PENDING",
        amountMinor: 1900,
        currency: "USD",
        provider: "mock",
      }),
    );
    expect(mocks.recordSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        subscriptionId: freeSubscription.id,
        type: "CHECKOUT_INITIATED",
      }),
    );
    const day = 24 * 60 * 60 * 1000;
    const duration =
      result.billingPeriod.endsAt.getTime() -
      result.billingPeriod.startsAt.getTime();
    expect(duration).toBeGreaterThan(27 * day);
    expect(duration).toBeLessThan(32 * day);
  });

  it("ensures a subscription first when the organization has none", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(null);
    mocks.ensureOrganizationSubscription.mockResolvedValue({
      subscription: freeSubscription,
      created: true,
    });
    mocks.findPendingPaymentByOrganizationId.mockResolvedValue(null);
    mocks.insertSubscriptionPayment.mockResolvedValue({
      row: paymentRow,
      created: true,
    });
    mocks.recordSubscriptionEvent.mockResolvedValue({
      row: {},
      created: true,
    });

    await initiateCheckout({
      organizationId,
      planCode: "PRO",
      interval: "MONTHLY",
    });

    expect(mocks.ensureOrganizationSubscription).toHaveBeenCalledWith({
      organizationId,
    });
    expect(mocks.insertSubscriptionPayment).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: freeSubscription.id }),
    );
  });

  it("returns 404 for an unknown plan", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(null);

    await expect(
      initiateCheckout({
        organizationId,
        planCode: "PRO",
        interval: "MONTHLY",
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 404,
    );
  });

  it("rejects the free plan as not purchasable", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(freePlan);

    await expect(
      initiateCheckout({
        organizationId,
        planCode: "FREE",
        interval: "MONTHLY",
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 400,
    );
    expect(mocks.insertSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("rejects a mismatched billing interval", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);

    await expect(
      initiateCheckout({
        organizationId,
        planCode: "PRO",
        interval: "YEARLY",
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 400,
    );
  });

  it("rejects checkout for the current plan", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(proSubscription);

    await expect(
      initiateCheckout({
        organizationId,
        planCode: "PRO",
        interval: "MONTHLY",
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
    expect(mocks.insertSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("rejects a second checkout while one is pending", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(freeSubscription);
    mocks.findPendingPaymentByOrganizationId.mockResolvedValue(paymentRow);

    await expect(
      initiateCheckout({
        organizationId,
        planCode: "PRO",
        interval: "MONTHLY",
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
    expect(mocks.insertSubscriptionPayment).not.toHaveBeenCalled();
  });
});

describe("changeOrganizationPlan", () => {
  it("switches to a cheaper plan immediately", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(freePlan);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(proSubscription);
    mocks.changeSubscriptionPlan.mockResolvedValue({
      subscription: freeSubscription,
      previous: proSubscription,
      changed: true,
    });

    const result = await changeOrganizationPlan({
      organizationId,
      planCode: "FREE",
    });

    expect(result).toEqual(freeSubscription);
    expect(mocks.changeSubscriptionPlan).toHaveBeenCalledWith({
      organizationId,
      planCode: "FREE",
      interval: null,
    });
  });

  it("rejects an upgrade without checkout", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(freeSubscription);

    await expect(
      changeOrganizationPlan({ organizationId, planCode: "PRO" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError &&
        error.statusCode === 409 &&
        error.message === "Upgrade requires checkout",
    );
    expect(mocks.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("rejects a no-op plan change", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(proSubscription);

    await expect(
      changeOrganizationPlan({ organizationId, planCode: "PRO" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
  });

  it("rejects changes without a live subscription", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(freePlan);
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(null);

    await expect(
      changeOrganizationPlan({ organizationId, planCode: "FREE" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
  });

  it("rejects an interval that does not match the plan", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);

    await expect(
      changeOrganizationPlan({
        organizationId,
        planCode: "PRO",
        interval: "YEARLY",
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 400,
    );
  });

  it("returns 404 for an unknown plan", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(null);

    await expect(
      changeOrganizationPlan({ organizationId, planCode: "PRO" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 404,
    );
  });
});

describe("cancelOrganizationSubscription", () => {
  it("cancels immediately when no period is requested", async () => {
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(proSubscription);
    mocks.cancelSubscription.mockResolvedValue({
      ...proSubscription,
      status: "CANCELED",
    });

    const result = await cancelOrganizationSubscription({ organizationId });

    expect(result.status).toBe("CANCELED");
    expect(mocks.cancelSubscription).toHaveBeenCalledWith({
      organizationId,
      atPeriodEnd: undefined,
    });
  });

  it("schedules cancellation at the end of the period", async () => {
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(proSubscription);
    mocks.cancelSubscription.mockResolvedValue({
      ...proSubscription,
      status: "CANCELED",
      cancelAtPeriodEnd: true,
    });

    await cancelOrganizationSubscription({
      organizationId,
      atPeriodEnd: true,
    });

    expect(mocks.cancelSubscription).toHaveBeenCalledWith({
      organizationId,
      atPeriodEnd: true,
    });
  });

  it("rejects cancellation without a live subscription", async () => {
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(null);

    await expect(
      cancelOrganizationSubscription({ organizationId }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
  });

  it("rejects period end cancellation without a billing period", async () => {
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(freeSubscription);

    await expect(
      cancelOrganizationSubscription({ organizationId, atPeriodEnd: true }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 400,
    );
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
  });

  it("rejects scheduling twice", async () => {
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue({
      ...proSubscription,
      cancelAtPeriodEnd: true,
    });

    await expect(
      cancelOrganizationSubscription({ organizationId, atPeriodEnd: true }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
  });

  it("maps a race with a removed subscription to 409", async () => {
    mocks.findLiveSubscriptionWithPlan.mockResolvedValue(proSubscription);
    mocks.cancelSubscription.mockRejectedValue(
      new mocks.NoLiveSubscriptionError(),
    );

    await expect(
      cancelOrganizationSubscription({ organizationId }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
  });
});

describe("reactivateOrganizationSubscription", () => {
  it("reactivates a canceled free subscription", async () => {
    const canceled = {
      ...freeSubscription,
      status: "CANCELED" as const,
      canceledAt: now,
    };
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(canceled);
    mocks.findSubscriptionPlanById.mockResolvedValue(freePlan);
    mocks.setSubscriptionStatus.mockResolvedValue({
      ...canceled,
      status: "ACTIVE",
      canceledAt: null,
    });

    const result = await reactivateOrganizationSubscription({
      organizationId,
    });

    expect(result.status).toBe("ACTIVE");
    expect(mocks.setSubscriptionStatus).toHaveBeenCalledWith({
      organizationId,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
    });
  });

  it("reactivates a paid subscription still inside its period", async () => {
    const canceled = { ...proSubscription, status: "CANCELED" as const };
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(canceled);
    mocks.findSubscriptionPlanById.mockResolvedValue(proPlan);
    mocks.setSubscriptionStatus.mockResolvedValue({
      ...canceled,
      status: "ACTIVE",
    });

    await reactivateOrganizationSubscription({ organizationId });

    expect(mocks.setSubscriptionStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE", cancelAtPeriodEnd: false }),
    );
  });

  it("requires checkout when the paid period has ended", async () => {
    const expired = {
      ...proSubscription,
      status: "CANCELED" as const,
      currentPeriodEnd: new Date("2025-12-01T00:00:00.000Z"),
    };
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(expired);
    mocks.findSubscriptionPlanById.mockResolvedValue(proPlan);

    await expect(
      reactivateOrganizationSubscription({ organizationId }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
    expect(mocks.setSubscriptionStatus).not.toHaveBeenCalled();
  });

  it("rejects reactivation when there is no subscription", async () => {
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(null);

    await expect(
      reactivateOrganizationSubscription({ organizationId }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
  });

  it("rejects reactivation of a live subscription", async () => {
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue(
      proSubscription,
    );

    await expect(
      reactivateOrganizationSubscription({ organizationId }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 409,
    );
    expect(mocks.setSubscriptionStatus).not.toHaveBeenCalled();
  });

  it("returns 404 when the plan no longer exists", async () => {
    mocks.findLatestSubscriptionByOrganizationId.mockResolvedValue({
      ...freeSubscription,
      status: "CANCELED" as const,
    });
    mocks.findSubscriptionPlanById.mockResolvedValue(null);

    await expect(
      reactivateOrganizationSubscription({ organizationId }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BillingError && error.statusCode === 404,
    );
  });
});

describe("listPaymentHistory", () => {
  it("delegates to the payment history lookup", async () => {
    mocks.findPaymentsByOrganizationId.mockResolvedValue([paymentRow]);

    const rows = await listPaymentHistory(organizationId);

    expect(rows).toEqual([paymentRow]);
    expect(mocks.findPaymentsByOrganizationId).toHaveBeenCalledWith(
      organizationId,
    );
  });
});
