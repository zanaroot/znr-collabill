import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv, AuthUser } from "@/http/models/auth.model";
import { PaymentError } from "@/http/models/payment.model";
import { billingRoutes } from "@/http/routes/billing.route";
import {
  getBillingPayments,
  getBillingPlans,
  getBillingSubscription,
  getBillingUsage,
  getPaymentStatus,
  getPublicBillingPlans,
  postCancel,
  postChangePlan,
  postCheckout,
  postReactivate,
} from "./billing.controller";

const mocks = vi.hoisted(() => {
  class BillingError extends Error {
    statusCode: 400 | 404 | 409;

    constructor(message: string, statusCode: 400 | 404 | 409) {
      super(message);
      this.name = "BillingError";
      this.statusCode = statusCode;
    }
  }

  return {
    BillingError,
    listBillingPlans: vi.fn(),
    getOrganizationSubscription: vi.fn(),
    listPaymentHistory: vi.fn(),
    initiateCheckout: vi.fn(),
    changeOrganizationPlan: vi.fn(),
    cancelOrganizationSubscription: vi.fn(),
    reactivateOrganizationSubscription: vi.fn(),
    logAudit: vi.fn(),
    getPaymentStatusForOrganization: vi.fn(),
    getOrganizationUsage: vi.fn(),
  };
});

vi.mock("@/http/services/billing.service", () => ({
  BillingError: mocks.BillingError,
  cancelOrganizationSubscription: mocks.cancelOrganizationSubscription,
  changeOrganizationPlan: mocks.changeOrganizationPlan,
  getOrganizationSubscription: mocks.getOrganizationSubscription,
  initiateCheckout: mocks.initiateCheckout,
  listBillingPlans: mocks.listBillingPlans,
  listPaymentHistory: mocks.listPaymentHistory,
  reactivateOrganizationSubscription: mocks.reactivateOrganizationSubscription,
}));
vi.mock("@/http/actions/audit.action", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/http/services/payment.service", () => ({
  getPaymentStatusForOrganization: mocks.getPaymentStatusForOrganization,
}));
vi.mock("@/http/services/entitlement.service", () => ({
  getOrganizationUsage: mocks.getOrganizationUsage,
}));
vi.mock("@/db", () => ({ db: {}, dbClient: {} }));

const now = new Date("2026-01-01T00:00:00.000Z");

const owner: AuthUser = {
  id: "00000000-0000-4000-8000-0000000000aa",
  email: "owner@example.com",
  name: "Owner",
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  organizationId: "00000000-0000-4000-8000-0000000000bb",
  organizationName: "Acme",
  organizationRole: "OWNER",
  platformRole: null,
  emailVerified: null,
};

const collaborator: AuthUser = {
  ...owner,
  id: "00000000-0000-4000-8000-0000000000cc",
  email: "member@example.com",
  organizationRole: "COLLABORATOR",
};

const memberWithoutOrg: AuthUser = {
  ...owner,
  organizationId: null,
  organizationName: null,
  organizationRole: null,
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
  organizationId: owner.organizationId ?? "",
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
  organizationId: owner.organizationId ?? "",
  subscriptionId: subscriptionRow.id,
  planId: proPlan.id,
  status: "PENDING" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "internal",
  providerPaymentId: null,
  paidAt: null,
  failureReason: null,
  createdAt: now,
  updatedAt: now,
};

const createControllerApp = (user: AuthUser = owner) =>
  new Hono<AuthEnv>()
    .use("*", async (c, next) => {
      c.set("user", user);
      await next();
    })
    .get("/plans", ...getBillingPlans)
    .get("/subscription", ...getBillingSubscription)
    .get("/usage", ...getBillingUsage)
    .get("/payments", ...getBillingPayments)
    .get("/payments/:paymentId/status", ...getPaymentStatus)
    .post("/checkout", ...postCheckout)
    .post("/change-plan", ...postChangePlan)
    .post("/cancel", ...postCancel)
    .post("/reactivate", ...postReactivate);

const usageFixture = {
  plan: { code: "PRO" as const, name: "Pro" },
  features: ["integrations", "finance"],
  limits: { maxMembers: null, maxProjects: null },
  usage: { members: 2, projects: 4 },
  reached: { members: false, projects: false },
};

const createRouteApp = (user: AuthUser) =>
  new Hono<AuthEnv>()
    .use("*", async (c, next) => {
      c.set("user", user);
      await next();
    })
    .route("/", billingRoutes);

const postJson = (path: string, body: unknown, app = createControllerApp()) =>
  app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET billing reads", () => {
  it("returns the plan catalog to any member", async () => {
    mocks.listBillingPlans.mockResolvedValue([proPlan]);

    const res = await createControllerApp().request("/plans");

    expect(res.status).toBe(200);
    expect(mocks.listBillingPlans).toHaveBeenCalledOnce();
  });

  it("returns the session organization subscription", async () => {
    mocks.getOrganizationSubscription.mockResolvedValue(subscriptionRow);

    const res =
      await createControllerApp(collaborator).request("/subscription");

    expect(res.status).toBe(200);
    expect(mocks.getOrganizationSubscription).toHaveBeenCalledWith(
      collaborator.organizationId,
    );
  });

  it("returns usage and limits for the session organization", async () => {
    mocks.getOrganizationUsage.mockResolvedValue(usageFixture);

    const res = await createControllerApp().request("/usage");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(usageFixture);
    expect(mocks.getOrganizationUsage).toHaveBeenCalledWith(
      owner.organizationId,
    );
  });

  it("returns 400 when the session has no organization", async () => {
    const res = await createControllerApp(memberWithoutOrg).request("/usage");

    expect(res.status).toBe(400);
    expect(mocks.getOrganizationUsage).not.toHaveBeenCalled();
  });

  it("returns payment history for the session organization", async () => {
    mocks.listPaymentHistory.mockResolvedValue([paymentRow]);

    const res = await createControllerApp().request("/payments");

    expect(res.status).toBe(200);
    expect(mocks.listPaymentHistory).toHaveBeenCalledWith(owner.organizationId);
  });

  it("rejects reads for users without an organization", async () => {
    const res =
      await createControllerApp(memberWithoutOrg).request("/subscription");

    expect(res.status).toBe(400);
    expect(mocks.getOrganizationSubscription).not.toHaveBeenCalled();
  });
});

describe("GET public plans (no session)", () => {
  it("returns the plan catalog without a user context", async () => {
    mocks.listBillingPlans.mockResolvedValue([proPlan]);
    const app = new Hono().get("/plans", ...getPublicBillingPlans);

    const res = await app.request("/plans");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      {
        ...proPlan,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ]);
    expect(mocks.listBillingPlans).toHaveBeenCalledOnce();
  });
});

describe("GET payment status", () => {
  it("reconciles a payment for the session organization", async () => {
    mocks.getPaymentStatusForOrganization.mockResolvedValue({
      ...paymentRow,
      status: "SUCCEEDED",
    });

    const res = await createControllerApp().request(
      `/payments/${paymentRow.id}/status`,
    );

    expect(res.status).toBe(200);
    expect(mocks.getPaymentStatusForOrganization).toHaveBeenCalledWith({
      organizationId: owner.organizationId,
      paymentId: paymentRow.id,
    });
  });

  it("maps a payment from another organization to 404", async () => {
    mocks.getPaymentStatusForOrganization.mockRejectedValue(
      new PaymentError("Payment not found", 404),
    );

    const res = await createControllerApp().request(
      `/payments/${paymentRow.id}/status`,
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: "Payment not found",
    });
  });

  it("maps an unconfigured provider to 503", async () => {
    mocks.getPaymentStatusForOrganization.mockRejectedValue(
      new PaymentError("Payment provider is not configured", 503),
    );

    const res = await createControllerApp().request(
      `/payments/${paymentRow.id}/status`,
    );

    expect(res.status).toBe(503);
  });

  it("rejects status reads for users without an organization", async () => {
    const res = await createControllerApp(memberWithoutOrg).request(
      `/payments/${paymentRow.id}/status`,
    );

    expect(res.status).toBe(400);
    expect(mocks.getPaymentStatusForOrganization).not.toHaveBeenCalled();
  });
});

describe("POST /checkout", () => {
  const checkoutBody = {
    planCode: "PRO",
    interval: "MONTHLY",
    organizationId: "99999999-9999-4999-9999-999999999999",
    status: "ACTIVE",
    amountMinor: 1,
  };

  it("creates a pending payment scoped to the session organization", async () => {
    mocks.initiateCheckout.mockResolvedValue({
      payment: paymentRow,
      plan: proPlan,
      billingPeriod: { startsAt: now, endsAt: new Date(now.getTime()) },
    });
    mocks.logAudit.mockResolvedValue(undefined);

    const res = await postJson("/checkout", checkoutBody);

    expect(res.status).toBe(201);
    expect(mocks.initiateCheckout.mock.calls[0]?.[0]).toEqual({
      organizationId: owner.organizationId,
      planCode: "PRO",
      interval: "MONTHLY",
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: owner.organizationId,
        actorId: owner.id,
        entity: "PAYMENT",
        action: "CREATE",
      }),
    );
  });

  it("rejects checkout for users without an organization", async () => {
    const res = await createControllerApp(memberWithoutOrg).request(
      "/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: "PRO", interval: "MONTHLY" }),
      },
    );

    expect(res.status).toBe(400);
    expect(mocks.initiateCheckout).not.toHaveBeenCalled();
  });

  it("maps a duplicate pending checkout to 409", async () => {
    mocks.initiateCheckout.mockRejectedValue(
      new mocks.BillingError("A checkout is already in progress", 409),
    );

    const res = await postJson("/checkout", {
      planCode: "PRO",
      interval: "MONTHLY",
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "A checkout is already in progress",
    });
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it("maps an unknown plan to 404", async () => {
    mocks.initiateCheckout.mockRejectedValue(
      new mocks.BillingError("Plan not found", 404),
    );

    const res = await postJson("/checkout", {
      planCode: "PRO",
      interval: "MONTHLY",
    });

    expect(res.status).toBe(404);
  });

  it("rejects an unsupported interval before calling the service", async () => {
    const res = await postJson("/checkout", {
      planCode: "PRO",
      interval: "WEEKLY",
    });

    expect(res.status).toBe(400);
    expect(mocks.initiateCheckout).not.toHaveBeenCalled();
  });
});

describe("POST /change-plan", () => {
  it("switches plans and records an audit entry", async () => {
    const freeSubscription = {
      ...subscriptionRow,
      planId: "33333333-3333-4333-8333-333333333331",
      status: "ACTIVE" as const,
      interval: null,
      amountMinor: 0,
      plan: { ...proPlan, code: "FREE" as const, amountMinor: 0 },
    };
    mocks.changeOrganizationPlan.mockResolvedValue(freeSubscription);
    mocks.logAudit.mockResolvedValue(undefined);

    const res = await postJson("/change-plan", {
      planCode: "FREE",
      organizationId: "99999999-9999-4999-9999-999999999999",
    });

    expect(res.status).toBe(200);
    expect(mocks.changeOrganizationPlan.mock.calls[0]?.[0]).toEqual({
      organizationId: owner.organizationId,
      planCode: "FREE",
      interval: undefined,
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "SUBSCRIPTION",
        entityId: freeSubscription.id,
        action: "UPDATE",
      }),
    );
  });

  it("maps an upgrade attempt to 409", async () => {
    mocks.changeOrganizationPlan.mockRejectedValue(
      new mocks.BillingError("Upgrade requires checkout", 409),
    );

    const res = await postJson("/change-plan", { planCode: "PRO" });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Upgrade requires checkout",
    });
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});

describe("POST /cancel", () => {
  it("cancels immediately and records an audit entry", async () => {
    const canceled = {
      ...subscriptionRow,
      status: "CANCELED" as const,
      canceledAt: now,
    };
    mocks.cancelOrganizationSubscription.mockResolvedValue(canceled);
    mocks.logAudit.mockResolvedValue(undefined);

    const res = await postJson("/cancel", {});

    expect(res.status).toBe(200);
    expect(mocks.cancelOrganizationSubscription).toHaveBeenCalledWith({
      organizationId: owner.organizationId,
      atPeriodEnd: undefined,
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "SUBSCRIPTION", action: "UPDATE" }),
    );
  });

  it("maps missing active subscription to 409", async () => {
    mocks.cancelOrganizationSubscription.mockRejectedValue(
      new mocks.BillingError("No active subscription to cancel", 409),
    );

    const res = await postJson("/cancel", { atPeriodEnd: true });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "No active subscription to cancel",
    });
  });

  it("maps an invalid cancellation window to 400", async () => {
    mocks.cancelOrganizationSubscription.mockRejectedValue(
      new mocks.BillingError(
        "Subscription has no billing period to cancel at the end of",
        400,
      ),
    );

    const res = await postJson("/cancel", { atPeriodEnd: true });

    expect(res.status).toBe(400);
  });
});

describe("POST /reactivate", () => {
  it("reactivates the subscription and records an audit entry", async () => {
    mocks.reactivateOrganizationSubscription.mockResolvedValue(subscriptionRow);
    mocks.logAudit.mockResolvedValue(undefined);

    const res = await postJson("/reactivate", {});

    expect(res.status).toBe(200);
    expect(mocks.reactivateOrganizationSubscription).toHaveBeenCalledWith({
      organizationId: owner.organizationId,
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "SUBSCRIPTION",
        action: "UPDATE",
        entityId: subscriptionRow.id,
      }),
    );
  });

  it("maps an already active subscription to 409", async () => {
    mocks.reactivateOrganizationSubscription.mockRejectedValue(
      new mocks.BillingError("Subscription is already active", 409),
    );

    const res = await postJson("/reactivate", {});

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Subscription is already active",
    });
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});

describe("billing route access control", () => {
  it("allows owners to reach mutations", async () => {
    mocks.initiateCheckout.mockResolvedValue({
      payment: paymentRow,
      plan: proPlan,
      billingPeriod: { startsAt: now, endsAt: new Date(now.getTime()) },
    });
    mocks.logAudit.mockResolvedValue(undefined);

    const res = await createRouteApp(owner).request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode: "PRO", interval: "MONTHLY" }),
    });

    expect(res.status).toBe(201);
  });

  it("blocks mutations from non owner members", async () => {
    const res = await createRouteApp(collaborator).request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode: "PRO", interval: "MONTHLY" }),
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Forbidden: Owner role required",
    });
    expect(mocks.initiateCheckout).not.toHaveBeenCalled();
  });

  it("blocks payment history from non owner members", async () => {
    const res = await createRouteApp(collaborator).request("/payments");

    expect(res.status).toBe(403);
    expect(mocks.listPaymentHistory).not.toHaveBeenCalled();
  });

  it("blocks payment status reconciliation from non owner members", async () => {
    const res = await createRouteApp(collaborator).request(
      `/payments/${paymentRow.id}/status`,
    );

    expect(res.status).toBe(403);
    expect(mocks.getPaymentStatusForOrganization).not.toHaveBeenCalled();
  });

  it("allows non owner members to read plans", async () => {
    mocks.listBillingPlans.mockResolvedValue([proPlan]);

    const res = await createRouteApp(collaborator).request("/plans");

    expect(res.status).toBe(200);
    expect(mocks.listBillingPlans).toHaveBeenCalledOnce();
  });

  it("allows non owner members to read usage", async () => {
    mocks.getOrganizationUsage.mockResolvedValue(usageFixture);

    const res = await createRouteApp(collaborator).request("/usage");

    expect(res.status).toBe(200);
    expect(mocks.getOrganizationUsage).toHaveBeenCalledWith(
      collaborator.organizationId,
    );
  });

  it("blocks cancel from non owner members", async () => {
    const res = await createRouteApp(collaborator).request("/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
    expect(mocks.cancelOrganizationSubscription).not.toHaveBeenCalled();
  });
});
