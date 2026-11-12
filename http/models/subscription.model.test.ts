import { describe, expect, it } from "vitest";
import {
  amountMinorSchema,
  cancelSubscriptionSchema,
  changeSubscriptionPlanSchema,
  currencySchema,
  ensureSubscriptionSchema,
  liveSubscriptionStatuses,
  liveSubscriptionStatusSchema,
  type ProviderReferenceEntityType,
  providerReferenceEntityTypeSchema,
  recordSubscriptionEventSchema,
  recordSubscriptionPaymentSchema,
  type SubscriptionPaymentStatus,
  type SubscriptionStatus,
  setSubscriptionStatusSchema,
  subscriptionEventSchema,
  subscriptionEventTypes,
  subscriptionIntervalSchema,
  subscriptionPaymentSchema,
  subscriptionPaymentStatusSchema,
  subscriptionPlanCodeSchema,
  subscriptionPlanSchema,
  subscriptionSchema,
  subscriptionStatusSchema,
  subscriptionWithPlanSchema,
} from "@/http/models/subscription.model";

const now = new Date("2026-01-01T00:00:00.000Z");
const organizationId = "11111111-1111-4111-8111-111111111111";

const planRow = {
  id: "33333333-3333-4333-8333-333333333333",
  code: "PRO",
  name: "Pro",
  description: "Unlimited members and projects",
  amountMinor: 1900,
  currency: "USD",
  interval: "MONTHLY",
  maxMembers: null,
  maxProjects: null,
  createdAt: now,
  updatedAt: now,
};

const subscriptionRow = {
  id: "22222222-2222-4222-8222-222222222222",
  organizationId,
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
  createdAt: now,
  updatedAt: now,
};

const paymentRow = {
  id: "66666666-6666-4666-8666-666666666666",
  organizationId,
  subscriptionId: subscriptionRow.id,
  planId: planRow.id,
  status: "SUCCEEDED",
  amountMinor: 1900,
  currency: "USD",
  provider: "stripe",
  providerPaymentId: "pi_123",
  paidAt: now,
  failureReason: null,
  createdAt: now,
  updatedAt: now,
};

const eventRow = {
  id: "99999999-9999-4999-8999-999999999999",
  organizationId,
  subscriptionId: subscriptionRow.id,
  type: "SUBSCRIPTION_CREATED",
  provider: "internal",
  providerEventId: null,
  payload: "{}",
  createdAt: now,
};

describe("subscription model enums", () => {
  it("parses every subscription status", () => {
    for (const status of [
      "TRIALING",
      "ACTIVE",
      "PAST_DUE",
      "CANCELED",
      "EXPIRED",
    ]) {
      expect(subscriptionStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects misspelled statuses", () => {
    expect(subscriptionStatusSchema.safeParse("CANCELLED").success).toBe(false);
  });

  it("limits live statuses to non-terminal ones", () => {
    expect([...liveSubscriptionStatuses]).toEqual([
      "TRIALING",
      "ACTIVE",
      "PAST_DUE",
    ]);
    expect(liveSubscriptionStatusSchema.safeParse("CANCELED").success).toBe(
      false,
    );
  });

  it("parses intervals, plan codes and payment statuses", () => {
    expect(subscriptionIntervalSchema.safeParse("MONTHLY").success).toBe(true);
    expect(subscriptionIntervalSchema.safeParse("WEEKLY").success).toBe(false);
    expect(subscriptionPlanCodeSchema.safeParse("FREE").success).toBe(true);
    expect(subscriptionPlanCodeSchema.safeParse("ENTERPRISE").success).toBe(
      true,
    );
    expect(subscriptionPlanCodeSchema.safeParse("enterprise").success).toBe(
      false,
    );
    expect(subscriptionPaymentStatusSchema.safeParse("SUCCEEDED").success).toBe(
      true,
    );
    expect(subscriptionPaymentStatusSchema.safeParse("PAID").success).toBe(
      false,
    );
  });

  it("parses provider reference entity types", () => {
    expect(
      providerReferenceEntityTypeSchema.safeParse("ORGANIZATION").success,
    ).toBe(true);
    expect(providerReferenceEntityTypeSchema.safeParse("INVOICE").success).toBe(
      false,
    );
  });

  it("exposes known subscription event types", () => {
    expect(subscriptionEventTypes).toEqual({
      created: "SUBSCRIPTION_CREATED",
      planChanged: "SUBSCRIPTION_PLAN_CHANGED",
      statusChanged: "SUBSCRIPTION_STATUS_CHANGED",
      canceled: "SUBSCRIPTION_CANCELED",
      paymentRecorded: "SUBSCRIPTION_PAYMENT_RECORDED",
      checkoutInitiated: "CHECKOUT_INITIATED",
      paymentSucceeded: "PAYMENT_SUCCEEDED",
      paymentFailed: "PAYMENT_FAILED",
      paymentRefunded: "PAYMENT_REFUNDED",
      periodExtended: "SUBSCRIPTION_PERIOD_EXTENDED",
    });
  });

  it("keeps the exported unions in sync with their schemas", () => {
    const statuses: SubscriptionStatus[] = [
      "TRIALING",
      "ACTIVE",
      "PAST_DUE",
      "SUSPENDED",
      "CANCELED",
      "EXPIRED",
    ];
    const paymentStatuses: SubscriptionPaymentStatus[] = [
      "PENDING",
      "SUCCEEDED",
      "FAILED",
      "REFUNDED",
    ];
    const entityTypes: ProviderReferenceEntityType[] = [
      "ORGANIZATION",
      "SUBSCRIPTION",
      "PAYMENT",
      "PLAN",
    ];

    expect(subscriptionStatusSchema.options).toEqual(statuses);
    expect(subscriptionPaymentStatusSchema.options).toEqual(paymentStatuses);
    expect(providerReferenceEntityTypeSchema.options).toEqual(entityTypes);
  });
});

describe("money and currency schemas", () => {
  it("accepts three-letter uppercase currencies only", () => {
    expect(currencySchema.safeParse("USD").success).toBe(true);
    expect(currencySchema.safeParse("usd").success).toBe(false);
    expect(currencySchema.safeParse("DOLLAR").success).toBe(false);
  });

  it("accepts non-negative integer minor amounts", () => {
    expect(amountMinorSchema.safeParse(0).success).toBe(true);
    expect(amountMinorSchema.safeParse(1900).success).toBe(true);
    expect(amountMinorSchema.safeParse(-1).success).toBe(false);
    expect(amountMinorSchema.safeParse(19.99).success).toBe(false);
  });
});

describe("subscription entity schemas", () => {
  it("parses a plan row", () => {
    expect(subscriptionPlanSchema.safeParse(planRow).success).toBe(true);
  });

  it("rejects a plan with a negative price", () => {
    const result = subscriptionPlanSchema.safeParse({
      ...planRow,
      amountMinor: -100,
    });
    expect(result.success).toBe(false);
  });

  it("parses a subscription with its plan", () => {
    const result = subscriptionWithPlanSchema.safeParse({
      ...subscriptionRow,
      plan: planRow,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a subscription with an unknown status", () => {
    const result = subscriptionWithPlanSchema.safeParse({
      ...subscriptionRow,
      status: "PENDING",
      plan: planRow,
    });
    expect(result.success).toBe(false);
  });

  it("parses a subscription row", () => {
    expect(subscriptionSchema.safeParse(subscriptionRow).success).toBe(true);
  });

  it("rejects a subscription row with a lowercase currency", () => {
    const result = subscriptionSchema.safeParse({
      ...subscriptionRow,
      currency: "usd",
    });
    expect(result.success).toBe(false);
  });

  it("parses a payment row", () => {
    expect(subscriptionPaymentSchema.safeParse(paymentRow).success).toBe(true);
  });

  it("rejects a payment row with an unknown status", () => {
    const result = subscriptionPaymentSchema.safeParse({
      ...paymentRow,
      status: "COMPLETED",
    });
    expect(result.success).toBe(false);
  });

  it("parses an event row", () => {
    expect(subscriptionEventSchema.safeParse(eventRow).success).toBe(true);
  });

  it("rejects an event row with an empty type", () => {
    const result = subscriptionEventSchema.safeParse({ ...eventRow, type: "" });
    expect(result.success).toBe(false);
  });
});

describe("ensureSubscriptionSchema", () => {
  it("defaults to the FREE plan", () => {
    const result = ensureSubscriptionSchema.safeParse({ organizationId });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.planCode).toBe("FREE");
    expect(result.data.status).toBeUndefined();
  });

  it("coerces provider timing strings into dates", () => {
    const result = ensureSubscriptionSchema.safeParse({
      organizationId,
      planCode: "PRO",
      currentPeriodEnd: "2026-02-01T00:00:00.000Z",
      trialEndsAt: null,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.currentPeriodEnd).toBeInstanceOf(Date);
    expect(result.data.trialEndsAt).toBeNull();
  });

  it("rejects terminal statuses for a new subscription", () => {
    const result = ensureSubscriptionSchema.safeParse({
      organizationId,
      status: "CANCELED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid organization id", () => {
    const result = ensureSubscriptionSchema.safeParse({
      organizationId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("changeSubscriptionPlanSchema", () => {
  it("parses a plan change with provider details", () => {
    const result = changeSubscriptionPlanSchema.safeParse({
      organizationId,
      planCode: "PRO",
      interval: "MONTHLY",
      status: "ACTIVE",
      provider: "stripe",
      providerSubscriptionId: "sub_123",
    });
    expect(result.success).toBe(true);
  });

  it("requires a plan code", () => {
    const result = changeSubscriptionPlanSchema.safeParse({ organizationId });
    expect(result.success).toBe(false);
  });

  it("rejects malformed plan codes", () => {
    const result = changeSubscriptionPlanSchema.safeParse({
      organizationId,
      planCode: "enterprise plan",
    });
    expect(result.success).toBe(false);
  });
});

describe("cancelSubscriptionSchema", () => {
  it("parses an immediate cancel without options", () => {
    const result = cancelSubscriptionSchema.safeParse({ organizationId });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.atPeriodEnd).toBeUndefined();
  });

  it("parses a cancel at period end", () => {
    const result = cancelSubscriptionSchema.safeParse({
      organizationId,
      atPeriodEnd: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("setSubscriptionStatusSchema", () => {
  it("parses a terminal status transition", () => {
    const result = setSubscriptionStatusSchema.safeParse({
      organizationId,
      status: "CANCELED",
    });
    expect(result.success).toBe(true);
  });

  it("parses a period update with a live status", () => {
    const result = setSubscriptionStatusSchema.safeParse({
      organizationId,
      status: "ACTIVE",
      currentPeriodStart: "2026-02-01T00:00:00.000Z",
      currentPeriodEnd: "2026-03-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it("rejects unknown statuses", () => {
    const result = setSubscriptionStatusSchema.safeParse({
      organizationId,
      status: "PAUSED",
    });
    expect(result.success).toBe(false);
  });
});

describe("recordSubscriptionPaymentSchema", () => {
  it("applies defaults for status, currency and provider", () => {
    const result = recordSubscriptionPaymentSchema.safeParse({
      organizationId,
      subscriptionId: subscriptionRow.id,
      amountMinor: 1900,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.status).toBe("PENDING");
    expect(result.data.currency).toBe("USD");
    expect(result.data.provider).toBe("internal");
  });

  it("rejects negative amounts", () => {
    const result = recordSubscriptionPaymentSchema.safeParse({
      organizationId,
      subscriptionId: subscriptionRow.id,
      amountMinor: -1900,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid currencies", () => {
    const result = recordSubscriptionPaymentSchema.safeParse({
      organizationId,
      subscriptionId: subscriptionRow.id,
      amountMinor: 1900,
      currency: "usd",
    });
    expect(result.success).toBe(false);
  });
});

describe("recordSubscriptionEventSchema", () => {
  it("defaults the payload and provider", () => {
    const result = recordSubscriptionEventSchema.safeParse({
      organizationId,
      type: subscriptionEventTypes.created,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.payload).toEqual({});
    expect(result.data.provider).toBe("internal");
  });

  it("rejects an empty event type", () => {
    const result = recordSubscriptionEventSchema.safeParse({
      organizationId,
      type: "",
    });
    expect(result.success).toBe(false);
  });

  it("keeps custom payload keys", () => {
    const result = recordSubscriptionEventSchema.safeParse({
      organizationId,
      type: subscriptionEventTypes.statusChanged,
      payload: { from: "PAST_DUE", to: "ACTIVE" },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.payload).toEqual({ from: "PAST_DUE", to: "ACTIVE" });
  });
});
