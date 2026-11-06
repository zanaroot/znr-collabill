import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPlanPrice,
  getIntervalLabel,
  getPaymentStatusMeta,
  getPlanAction,
  getSubscriptionStatusMeta,
  isLiveSubscription,
  planFeatures,
  planLimitLabel,
} from "@/app/_utils/billing";
import type {
  SubscriptionPlan,
  SubscriptionWithPlan,
} from "@/http/models/subscription.model";

const now = new Date(2026, 2, 15, 10, 30);

const freePlan: SubscriptionPlan = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "FREE",
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

const proMonthlyPlan: SubscriptionPlan = {
  id: "22222222-2222-2222-2222-222222222222",
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

const proYearlyPlan: SubscriptionPlan = {
  ...proMonthlyPlan,
  id: "33333333-3333-3333-3333-333333333333",
  amountMinor: 19000,
  interval: "YEARLY",
};

const subscriptionOnFree: SubscriptionWithPlan = {
  id: "44444444-4444-4444-4444-444444444444",
  organizationId: "55555555-5555-5555-5555-555555555555",
  planId: freePlan.id,
  status: "ACTIVE",
  interval: null,
  amountMinor: 0,
  currency: "USD",
  provider: "mock",
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodStart: now,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: now,
  updatedAt: now,
  plan: freePlan,
};

const subscriptionOnPro: SubscriptionWithPlan = {
  ...subscriptionOnFree,
  id: "66666666-6666-6666-6666-666666666666",
  planId: proMonthlyPlan.id,
  interval: "MONTHLY",
  amountMinor: 1900,
  plan: proMonthlyPlan,
};

describe("billing format helpers", () => {
  it("formats minor amounts as currency", () => {
    expect(formatMoney(1900, "USD")).toBe("$19.00");
    expect(formatMoney(0, "USD")).toBe("$0.00");
  });

  it("formats plan price with period or Free", () => {
    expect(formatPlanPrice(freePlan)).toBe("Free");
    expect(formatPlanPrice(proMonthlyPlan)).toBe("$19.00 / month");
    expect(formatPlanPrice(proYearlyPlan)).toBe("$190.00 / year");
  });

  it("labels intervals", () => {
    expect(getIntervalLabel("MONTHLY")).toBe("Monthly");
    expect(getIntervalLabel("YEARLY")).toBe("Yearly");
    expect(getIntervalLabel(null)).toBe("—");
  });

  it("labels plan limits", () => {
    expect(planLimitLabel(5)).toBe("5");
    expect(planLimitLabel(null)).toBe("Unlimited");
  });

  it("derives plan features from the plan data", () => {
    expect(planFeatures(freePlan)).toEqual([
      "Starter plan for small teams",
      "Free forever",
    ]);
    expect(planFeatures(proMonthlyPlan)).toEqual([
      "Unlimited members and projects",
      "Billed monthly",
    ]);
    expect(planFeatures({ ...proMonthlyPlan, description: null })).toEqual([
      "Billed monthly",
    ]);
  });

  it("formats dates from Date objects and ISO strings", () => {
    expect(formatDate(now)).toBe("Mar 15, 2026");
    expect(formatDate(now.toISOString())).toBe("Mar 15, 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDateTime(now)).toBe("Mar 15, 2026 10:30");
    expect(formatDateTime(now.toISOString())).toBe("Mar 15, 2026 10:30");
  });
});

describe("billing status metadata", () => {
  it("maps subscription statuses to labels and colors", () => {
    expect(getSubscriptionStatusMeta("ACTIVE")).toEqual({
      label: "Active",
      color: "success",
    });
    expect(getSubscriptionStatusMeta("PAST_DUE").label).toBe("Past due");
    expect(getSubscriptionStatusMeta("TRIALING").label).toBe("Trial");
  });

  it("maps payment statuses to labels and colors", () => {
    expect(getPaymentStatusMeta("SUCCEEDED")).toEqual({
      label: "Succeeded",
      color: "success",
    });
    expect(getPaymentStatusMeta("PENDING").label).toBe("Pending");
    expect(getPaymentStatusMeta("REFUNDED").color).toBe("warning");
  });

  it("detects live subscription statuses", () => {
    expect(isLiveSubscription("ACTIVE")).toBe(true);
    expect(isLiveSubscription("TRIALING")).toBe(true);
    expect(isLiveSubscription("PAST_DUE")).toBe(true);
    expect(isLiveSubscription("CANCELED")).toBe(false);
    expect(isLiveSubscription("EXPIRED")).toBe(false);
  });
});

describe("getPlanAction", () => {
  it("returns loading while the subscription is unknown", () => {
    expect(getPlanAction(freePlan, undefined)).toBe("loading");
  });

  it("marks the active plan as current", () => {
    expect(getPlanAction(freePlan, subscriptionOnFree)).toBe("current");
    expect(getPlanAction(proMonthlyPlan, subscriptionOnPro)).toBe("current");
  });

  it("routes the free plan through plan changes", () => {
    expect(getPlanAction(freePlan, subscriptionOnPro)).toBe("change");
    expect(getPlanAction(freePlan, null)).toBe("change");
  });

  it("requires checkout for upgrades without a subscription", () => {
    expect(getPlanAction(proMonthlyPlan, null)).toBe("checkout");
  });

  it("requires checkout for upgrades from a cheaper plan", () => {
    expect(getPlanAction(proMonthlyPlan, subscriptionOnFree)).toBe("checkout");
    expect(getPlanAction(proYearlyPlan, subscriptionOnFree)).toBe("checkout");
  });

  it("allows direct changes to same-price or downgraded plans", () => {
    const onProYearly: SubscriptionWithPlan = {
      ...subscriptionOnPro,
      plan: proYearlyPlan,
      planId: proYearlyPlan.id,
      interval: "YEARLY",
      amountMinor: 19000,
    };
    expect(getPlanAction(proMonthlyPlan, onProYearly)).toBe("change");
    expect(getPlanAction(freePlan, subscriptionOnPro)).toBe("change");
  });
});
