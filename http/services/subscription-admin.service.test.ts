import { addDays, addMonths } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logAudit: vi.fn(),
  findSubscriptionById: vi.fn(),
  findSubscriptionPlanByCode: vi.fn(),
  findLiveSubscriptionWithPlan: vi.fn(),
  updateSubscriptionStateById: vi.fn(),
  insertSubscriptionAdminNote: vi.fn(),
  findSubscriptionAdminNotesByOrganization: vi.fn(),
  getOrganizationById: vi.fn(),
  cancelSubscription: vi.fn(),
  changeSubscriptionPlan: vi.fn(),
  recordSubscriptionEvent: vi.fn(),
}));

vi.mock("@/http/actions/audit.action", () => ({
  logAudit: mocks.logAudit,
}));
vi.mock("@/http/repositories/subscription.repository", () => ({
  findLiveSubscriptionWithPlan: mocks.findLiveSubscriptionWithPlan,
  findSubscriptionAdminNotesByOrganization:
    mocks.findSubscriptionAdminNotesByOrganization,
  findSubscriptionById: mocks.findSubscriptionById,
  findSubscriptionPlanByCode: mocks.findSubscriptionPlanByCode,
  insertSubscriptionAdminNote: mocks.insertSubscriptionAdminNote,
  updateSubscriptionStateById: mocks.updateSubscriptionStateById,
}));
vi.mock("@/http/repositories/organization.repository", () => ({
  getOrganizationById: mocks.getOrganizationById,
}));
vi.mock("@/http/services/subscription.service", () => ({
  cancelSubscription: mocks.cancelSubscription,
  changeSubscriptionPlan: mocks.changeSubscriptionPlan,
  recordSubscriptionEvent: mocks.recordSubscriptionEvent,
}));
vi.mock("@/db", () => ({ db: {}, dbClient: {} }));

import type { Subscription } from "@/http/models/subscription.model";
import {
  adminActivateSubscription,
  adminAddNote,
  adminCancelSubscription,
  adminChangeSubscriptionPlan,
  adminExtendSubscription,
  adminReactivateSubscription,
  adminSuspendSubscription,
} from "@/http/services/subscription-admin.service";

const actorId = "00000000-0000-4000-8000-0000000000aa";
const subscriptionId = "22222222-2222-4222-8222-222222222222";
const organizationId = "11111111-1111-4111-8111-111111111111";
const planId = "33333333-3333-4333-8333-333333333331";

const baseSubscription: Subscription = {
  id: subscriptionId,
  organizationId,
  planId,
  status: "ACTIVE" as const,
  interval: "MONTHLY" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "internal",
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
  currentPeriodEnd: new Date("2026-12-01T00:00:00.000Z"),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const buildSubscription = (
  overrides: Partial<Subscription> = {},
): Subscription => ({ ...baseSubscription, ...overrides });

const proPlan = {
  id: planId,
  code: "PRO",
  name: "Pro",
  description: null,
  amountMinor: 1900,
  amountMinorYearly: 19000,
  currency: "USD",
  supportedCurrencies: ["USD"],
  interval: "MONTHLY" as const,
  maxMembers: null,
  maxProjects: null,
  features: [] as string[],
  active: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.recordSubscriptionEvent.mockResolvedValue({ event: {}, created: true });
  mocks.logAudit.mockResolvedValue(undefined);
});

describe("adminActivateSubscription", () => {
  it("rejects activation of a live subscription", async () => {
    mocks.findSubscriptionById.mockResolvedValue(buildSubscription());

    await expect(
      adminActivateSubscription({ subscriptionId, actorId }),
    ).rejects.toMatchObject({ name: "BackOfficeError", statusCode: 409 });
    expect(mocks.updateSubscriptionStateById).not.toHaveBeenCalled();
  });

  it("activates a suspended subscription and records an event", async () => {
    const suspended = buildSubscription({ status: "SUSPENDED" as const });
    mocks.findSubscriptionById.mockResolvedValue(suspended);
    mocks.updateSubscriptionStateById.mockResolvedValue({
      previous: suspended,
      subscription: { ...suspended, status: "ACTIVE" as const },
    });

    const result = await adminActivateSubscription({
      subscriptionId,
      actorId,
    });

    expect(result.status).toBe("ACTIVE");
    expect(mocks.updateSubscriptionStateById).toHaveBeenCalledWith(
      subscriptionId,
      expect.objectContaining({ status: "ACTIVE", canceledAt: null }),
    );
    expect(mocks.recordSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SUBSCRIPTION_STATUS_CHANGED",
        payload: expect.objectContaining({
          manual: true,
          operation: "activate",
        }),
      }),
    );
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "SUBSCRIPTION", actorId }),
    );
  });

  it("fills an expired billing period on activation", async () => {
    const expired = buildSubscription({
      status: "CANCELED" as const,
      currentPeriodEnd: new Date("2025-01-01T00:00:00.000Z"),
      canceledAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    mocks.findSubscriptionById.mockResolvedValue(expired);
    mocks.updateSubscriptionStateById.mockResolvedValue({
      previous: expired,
      subscription: { ...expired, status: "ACTIVE" as const },
    });

    await adminActivateSubscription({ subscriptionId, actorId });

    const patch = mocks.updateSubscriptionStateById.mock.calls[0]?.[1] as {
      currentPeriodEnd?: Date;
    };
    const expectedEnd = addMonths(
      mocks.updateSubscriptionStateById.mock.calls[0]?.[1]
        .currentPeriodStart as Date,
      1,
    );
    expect(patch.currentPeriodEnd?.getTime()).toBe(expectedEnd.getTime());
  });

  it("returns 404 for an unknown subscription", async () => {
    mocks.findSubscriptionById.mockResolvedValue(null);

    await expect(
      adminActivateSubscription({ subscriptionId, actorId }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects activation when another live subscription exists", async () => {
    mocks.findSubscriptionById.mockResolvedValueOnce(
      buildSubscription({ status: "CANCELED" as const }),
    );
    mocks.findLiveSubscriptionWithPlan.mockResolvedValueOnce({
      subscription: buildSubscription(),
      plan: {},
    });

    await expect(
      adminActivateSubscription({ subscriptionId, actorId }),
    ).rejects.toMatchObject({ name: "BackOfficeError", statusCode: 409 });
    expect(mocks.updateSubscriptionStateById).not.toHaveBeenCalled();
  });
});

describe("adminReactivateSubscription", () => {
  it("reactivates a canceled subscription", async () => {
    const canceled = buildSubscription({ status: "CANCELED" as const });
    mocks.findSubscriptionById.mockResolvedValue(canceled);
    mocks.updateSubscriptionStateById.mockResolvedValue({
      previous: canceled,
      subscription: { ...canceled, status: "ACTIVE" as const },
    });

    const result = await adminReactivateSubscription({
      subscriptionId,
      actorId,
    });

    expect(result.status).toBe("ACTIVE");
    expect(mocks.recordSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ operation: "reactivate" }),
      }),
    );
  });

  it("rejects reactivation of a live subscription", async () => {
    mocks.findSubscriptionById.mockResolvedValue(buildSubscription());

    await expect(
      adminReactivateSubscription({ subscriptionId, actorId }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("maps a unique violation to a conflict", async () => {
    mocks.findSubscriptionById.mockResolvedValueOnce(
      buildSubscription({ status: "CANCELED" as const }),
    );
    mocks.findLiveSubscriptionWithPlan.mockResolvedValueOnce(null);
    mocks.updateSubscriptionStateById.mockRejectedValueOnce(
      Object.assign(new Error("duplicate key value"), { code: "23505" }),
    );

    await expect(
      adminReactivateSubscription({ subscriptionId, actorId }),
    ).rejects.toMatchObject({ name: "BackOfficeError", statusCode: 409 });
  });
});

describe("adminSuspendSubscription", () => {
  it("suspends a live subscription", async () => {
    mocks.findSubscriptionById.mockResolvedValue(buildSubscription());
    mocks.updateSubscriptionStateById.mockResolvedValue({
      previous: baseSubscription,
      subscription: { ...baseSubscription, status: "SUSPENDED" as const },
    });

    const result = await adminSuspendSubscription({ subscriptionId, actorId });

    expect(result.status).toBe("SUSPENDED");
    expect(mocks.updateSubscriptionStateById).toHaveBeenCalledWith(
      subscriptionId,
      expect.objectContaining({ status: "SUSPENDED" }),
    );
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "SUBSCRIPTION",
        metadata: expect.objectContaining({ operation: "suspend" }),
      }),
    );
  });

  it("rejects suspending a non-live subscription", async () => {
    mocks.findSubscriptionById.mockResolvedValue(
      buildSubscription({ status: "CANCELED" as const }),
    );

    await expect(
      adminSuspendSubscription({ subscriptionId, actorId }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.updateSubscriptionStateById).not.toHaveBeenCalled();
  });
});

describe("adminExtendSubscription", () => {
  it("extends a live period from its current end date", async () => {
    const subscription = buildSubscription();
    const originalEnd = subscription.currentPeriodEnd as Date;
    mocks.findSubscriptionById.mockResolvedValue(subscription);
    mocks.updateSubscriptionStateById.mockResolvedValue({
      previous: subscription,
      subscription,
    });

    await adminExtendSubscription({ subscriptionId, actorId, days: 30 });

    expect(mocks.updateSubscriptionStateById).toHaveBeenCalledWith(
      subscriptionId,
      expect.objectContaining({
        currentPeriodEnd: addDays(originalEnd, 30),
      }),
    );
    expect(mocks.recordSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIPTION_PERIOD_EXTENDED" }),
    );
  });

  it("rejects extending a non-live subscription", async () => {
    mocks.findSubscriptionById.mockResolvedValue(
      buildSubscription({ status: "SUSPENDED" as const }),
    );

    await expect(
      adminExtendSubscription({ subscriptionId, actorId, days: 7 }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.updateSubscriptionStateById).not.toHaveBeenCalled();
  });
});

describe("adminCancelSubscription", () => {
  it("cancels a live subscription immediately", async () => {
    const subscription = buildSubscription();
    mocks.findSubscriptionById.mockResolvedValue(subscription);
    mocks.cancelSubscription.mockResolvedValue({
      ...subscription,
      status: "CANCELED",
    });

    const result = await adminCancelSubscription({
      subscriptionId,
      actorId,
      atPeriodEnd: false,
    });

    expect(result.status).toBe("CANCELED");
    expect(mocks.cancelSubscription).toHaveBeenCalledWith({
      organizationId,
      atPeriodEnd: false,
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ operation: "cancel" }),
      }),
    );
  });

  it("rejects canceling a non-live subscription", async () => {
    mocks.findSubscriptionById.mockResolvedValue(
      buildSubscription({ status: "EXPIRED" as const }),
    );

    await expect(
      adminCancelSubscription({
        subscriptionId,
        actorId,
        atPeriodEnd: false,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
  });

  it("rejects scheduling a cancel without a billing period", async () => {
    mocks.findSubscriptionById.mockResolvedValue(
      buildSubscription({ currentPeriodEnd: null }),
    );

    await expect(
      adminCancelSubscription({
        subscriptionId,
        actorId,
        atPeriodEnd: true,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects a duplicate scheduled cancellation", async () => {
    mocks.findSubscriptionById.mockResolvedValue(
      buildSubscription({ cancelAtPeriodEnd: true }),
    );

    await expect(
      adminCancelSubscription({
        subscriptionId,
        actorId,
        atPeriodEnd: true,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("adminChangeSubscriptionPlan", () => {
  it("rejects plan changes on non-live subscriptions", async () => {
    mocks.findSubscriptionById.mockResolvedValue(
      buildSubscription({ status: "CANCELED" as const }),
    );

    await expect(
      adminChangeSubscriptionPlan({
        subscriptionId,
        actorId,
        planCode: "FREE",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects unknown target plans", async () => {
    mocks.findSubscriptionById.mockResolvedValue(buildSubscription());
    mocks.findSubscriptionPlanByCode.mockResolvedValue(null);

    await expect(
      adminChangeSubscriptionPlan({
        subscriptionId,
        actorId,
        planCode: "GOLD",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects deactivated target plans", async () => {
    mocks.findSubscriptionById.mockResolvedValue(buildSubscription());
    mocks.findSubscriptionPlanByCode.mockResolvedValue({
      ...proPlan,
      code: "GOLD",
      active: false,
    });

    await expect(
      adminChangeSubscriptionPlan({
        subscriptionId,
        actorId,
        planCode: "GOLD",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("rejects an unsupported interval for the target plan", async () => {
    mocks.findSubscriptionById.mockResolvedValue(buildSubscription());
    mocks.findSubscriptionPlanByCode.mockResolvedValue({
      ...proPlan,
      amountMinor: 0,
      amountMinorYearly: null,
      active: true,
    });

    await expect(
      adminChangeSubscriptionPlan({
        subscriptionId,
        actorId,
        planCode: "PRO",
        interval: "MONTHLY",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects switching to the same plan and interval", async () => {
    mocks.findSubscriptionById.mockResolvedValue(buildSubscription());
    mocks.findSubscriptionPlanByCode.mockResolvedValue(proPlan);

    await expect(
      adminChangeSubscriptionPlan({
        subscriptionId,
        actorId,
        planCode: "PRO",
        interval: "MONTHLY",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("changes to a yearly paid plan and audits the change", async () => {
    const subscription = buildSubscription();
    const goldPlan = {
      ...proPlan,
      id: "33333333-3333-4333-8333-333333333332",
      code: "GOLD",
      amountMinor: 5000,
      amountMinorYearly: 50000,
    };
    mocks.findSubscriptionById.mockResolvedValue(subscription);
    mocks.findSubscriptionPlanByCode.mockResolvedValue(goldPlan);
    mocks.changeSubscriptionPlan.mockResolvedValue({
      subscription: { ...subscription, planId: goldPlan.id, plan: goldPlan },
      previous: subscription,
      changed: true,
    });

    const result = await adminChangeSubscriptionPlan({
      subscriptionId,
      actorId,
      planCode: "GOLD",
      interval: "YEARLY",
    });

    expect(result.planId).toBe(goldPlan.id);
    expect(mocks.changeSubscriptionPlan).toHaveBeenCalledWith({
      organizationId,
      planCode: "GOLD",
      interval: "YEARLY",
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          operation: "change_plan",
          planCode: "GOLD",
          interval: "YEARLY",
        }),
      }),
    );
  });

  it("allows an admin upgrade without checkout", async () => {
    const subscription = buildSubscription({ amountMinor: 1900 });
    const goldPlan = {
      ...proPlan,
      id: "33333333-3333-4333-8333-333333333333",
      code: "GOLD",
      amountMinor: 9900,
    };
    mocks.findSubscriptionById.mockResolvedValue(subscription);
    mocks.findSubscriptionPlanByCode.mockResolvedValue(goldPlan);
    mocks.changeSubscriptionPlan.mockResolvedValue({
      subscription: { ...subscription, planId: goldPlan.id, plan: goldPlan },
      previous: subscription,
      changed: true,
    });

    const result = await adminChangeSubscriptionPlan({
      subscriptionId,
      actorId,
      planCode: "GOLD",
    });

    expect(result.planId).toBe(goldPlan.id);
  });
});

describe("adminAddNote", () => {
  it("rejects notes for unknown organizations", async () => {
    mocks.getOrganizationById.mockResolvedValue(null);

    await expect(
      adminAddNote({ organizationId, actorId, body: "hello" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects notes for subscriptions outside the organization", async () => {
    mocks.getOrganizationById.mockResolvedValue({ id: organizationId });
    mocks.findSubscriptionById.mockResolvedValue(
      buildSubscription({
        organizationId: "11111111-1111-4111-8111-999999999999",
      }),
    );

    await expect(
      adminAddNote({
        organizationId,
        actorId,
        subscriptionId,
        body: "hello",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("stores a note and audits it", async () => {
    mocks.getOrganizationById.mockResolvedValue({ id: organizationId });
    mocks.findSubscriptionById.mockResolvedValue(buildSubscription());
    mocks.insertSubscriptionAdminNote.mockResolvedValue({ id: "note-1" });

    await adminAddNote({
      organizationId,
      actorId,
      subscriptionId,
      body: "Contacted the customer",
    });

    expect(mocks.insertSubscriptionAdminNote).toHaveBeenCalledWith({
      organizationId,
      subscriptionId,
      authorId: actorId,
      body: "Contacted the customer",
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        action: "CREATE",
        entity: "SUBSCRIPTION",
        metadata: { noteId: "note-1", kind: "admin_note" },
      }),
    );
  });
});
