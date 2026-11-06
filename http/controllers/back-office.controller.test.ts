import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv, AuthUser } from "@/http/models/auth.model";
import { backOfficeRoutes } from "@/http/routes/back-office.route";

const mocks = vi.hoisted(() => {
  class BackOfficeError extends Error {
    statusCode: 400 | 404 | 409 | 502 | 503;

    constructor(message: string, statusCode: 400 | 404 | 409 | 502 | 503) {
      super(message);
      this.name = "BackOfficeError";
      this.statusCode = statusCode;
    }
  }

  return {
    BackOfficeError,
    getBillingDashboard: vi.fn(),
    listAdminPlans: vi.fn(),
    createAdminPlan: vi.fn(),
    updateAdminPlan: vi.fn(),
    listOrganizationsForAdmin: vi.fn(),
    getOrganizationBillingDetail: vi.fn(),
    adminAddNote: vi.fn(),
    listAdminNotes: vi.fn(),
    adminActivateSubscription: vi.fn(),
    adminSuspendSubscription: vi.fn(),
    adminReactivateSubscription: vi.fn(),
    adminExtendSubscription: vi.fn(),
    adminCancelSubscription: vi.fn(),
    adminChangeSubscriptionPlan: vi.fn(),
    listPaymentsForAdmin: vi.fn(),
    getPaymentForAdmin: vi.fn(),
    refundPaymentAsAdmin: vi.fn(),
    getOrganizationUsage: vi.fn(),
  };
});

vi.mock("@/http/services/back-office.service", () => ({
  BackOfficeError: mocks.BackOfficeError,
  createAdminPlan: mocks.createAdminPlan,
  getBillingDashboard: mocks.getBillingDashboard,
  listAdminPlans: mocks.listAdminPlans,
  listOrganizationsForAdmin: mocks.listOrganizationsForAdmin,
  updateAdminPlan: mocks.updateAdminPlan,
}));
vi.mock("@/http/repositories/back-office.repository", () => ({
  getOrganizationBillingDetail: mocks.getOrganizationBillingDetail,
}));
vi.mock("@/http/services/subscription-admin.service", () => ({
  adminActivateSubscription: mocks.adminActivateSubscription,
  adminAddNote: mocks.adminAddNote,
  adminCancelSubscription: mocks.adminCancelSubscription,
  adminChangeSubscriptionPlan: mocks.adminChangeSubscriptionPlan,
  adminExtendSubscription: mocks.adminExtendSubscription,
  adminReactivateSubscription: mocks.adminReactivateSubscription,
  adminSuspendSubscription: mocks.adminSuspendSubscription,
  listAdminNotes: mocks.listAdminNotes,
}));
vi.mock("@/http/services/payment-admin.service", () => ({
  getPaymentForAdmin: mocks.getPaymentForAdmin,
  listPaymentsForAdmin: mocks.listPaymentsForAdmin,
  refundPaymentAsAdmin: mocks.refundPaymentAsAdmin,
}));
vi.mock("@/http/services/entitlement.service", () => ({
  getOrganizationUsage: mocks.getOrganizationUsage,
}));
vi.mock("@/db", () => ({ db: {}, dbClient: {} }));

const platformAdmin: AuthUser = {
  id: "00000000-0000-4000-8000-0000000000aa",
  email: "platform@collabill.local",
  name: "Platform Admin",
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  organizationId: null,
  organizationName: null,
  organizationRole: null,
  platformRole: "PLATFORM_ADMIN",
  emailVerified: null,
};

const orgOwner: AuthUser = {
  ...platformAdmin,
  platformRole: null,
  organizationId: "11111111-1111-4111-8111-111111111111",
  organizationRole: "OWNER",
};

const createRouteApp = (user: AuthUser) =>
  new Hono<AuthEnv>()
    .use("*", async (c, next) => {
      c.set("user", user);
      await next();
    })
    .route("/", backOfficeRoutes);

const postJson = (path: string, body: unknown) =>
  createRouteApp(platformAdmin).request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("back-office authorization", () => {
  it("blocks organization owners from the dashboard", async () => {
    const res = await createRouteApp(orgOwner).request("/billing/overview");
    expect(res.status).toBe(403);
    expect(mocks.getBillingDashboard).not.toHaveBeenCalled();
  });

  it("allows platform administrators", async () => {
    mocks.getBillingDashboard.mockResolvedValue({ totalOrganizations: 3 });

    const res =
      await createRouteApp(platformAdmin).request("/billing/overview");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ totalOrganizations: 3 });
  });

  it("blocks plan writes for organization admins", async () => {
    const admin: AuthUser = {
      ...orgOwner,
      id: "00000000-0000-4000-8000-0000000000bb",
      organizationRole: "ADMIN",
    };

    const res = await createRouteApp(admin).request("/billing/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
    expect(mocks.createAdminPlan).not.toHaveBeenCalled();
  });
});

describe("GET back-office reads", () => {
  it("returns plans with counts", async () => {
    mocks.listAdminPlans.mockResolvedValue([]);

    const res = await createRouteApp(platformAdmin).request("/billing/plans");

    expect(res.status).toBe(200);
  });

  it("returns organizations with pagination filters", async () => {
    mocks.listOrganizationsForAdmin.mockResolvedValue({ rows: [], total: 0 });

    const res = await createRouteApp(platformAdmin).request(
      "/billing/organizations?search=acme&page=2&pageSize=10",
    );

    expect(res.status).toBe(200);
    expect(mocks.listOrganizationsForAdmin).toHaveBeenCalledWith({
      search: "acme",
      page: 2,
      pageSize: 10,
    });
  });

  it("rejects invalid pagination", async () => {
    const res = await createRouteApp(platformAdmin).request(
      "/billing/organizations?page=0",
    );

    expect(res.status).toBe(400);
    expect(mocks.listOrganizationsForAdmin).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown organizations", async () => {
    mocks.getOrganizationBillingDetail.mockResolvedValue(null);

    const res = await createRouteApp(platformAdmin).request(
      "/billing/organizations/11111111-1111-4111-8111-111111111111",
    );

    expect(res.status).toBe(404);
  });

  it("returns organization detail with notes and usage", async () => {
    mocks.getOrganizationBillingDetail.mockResolvedValue({
      organization: { id: "11111111-1111-4111-8111-111111111111" },
      owner: null,
      memberCount: 1,
      subscriptions: [],
      payments: [],
      events: [],
    });
    mocks.listAdminNotes.mockResolvedValue([]);
    mocks.getOrganizationUsage.mockResolvedValue({ plan: { code: "FREE" } });

    const res = await createRouteApp(platformAdmin).request(
      "/billing/organizations/11111111-1111-4111-8111-111111111111",
    );

    expect(res.status).toBe(200);
    expect(mocks.listAdminNotes).toHaveBeenCalledOnce();
    expect(mocks.getOrganizationUsage).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});

describe("POST back-office writes", () => {
  it("creates a plan with the session actor", async () => {
    mocks.createAdminPlan.mockResolvedValue({ id: "plan-1" });

    const res = await postJson("/billing/plans", {
      code: "GOLD",
      name: "Gold",
      amountMinor: 5000,
      amountMinorYearly: 50000,
      currency: "USD",
      supportedCurrencies: ["USD"],
      features: [],
      active: true,
    });

    expect(res.status).toBe(201);
    expect(mocks.createAdminPlan).toHaveBeenCalledWith(
      expect.objectContaining({ code: "GOLD" }),
      platformAdmin.id,
    );
  });

  it("rejects plans whose supported currencies omit the currency", async () => {
    const res = await postJson("/billing/plans", {
      code: "GOLD",
      name: "Gold",
      amountMinor: 5000,
      currency: "USD",
      supportedCurrencies: ["EUR"],
      features: [],
      active: true,
    });

    expect(res.status).toBe(400);
    expect(mocks.createAdminPlan).not.toHaveBeenCalled();
  });

  it("maps service errors onto status codes", async () => {
    mocks.adminSuspendSubscription.mockRejectedValue(
      new mocks.BackOfficeError(
        "Only an active subscription can be suspended",
        409,
      ),
    );

    const res = await postJson(
      "/billing/subscriptions/22222222-2222-4222-8222-222222222222/suspend",
      {},
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Only an active subscription can be suspended",
    });
  });

  it("passes the actor into subscription actions", async () => {
    mocks.adminSuspendSubscription.mockResolvedValue({ id: "sub-1" });

    await postJson(
      "/billing/subscriptions/22222222-2222-4222-8222-222222222222/suspend",
      {},
    );

    expect(mocks.adminSuspendSubscription).toHaveBeenCalledWith({
      subscriptionId: "22222222-2222-4222-8222-222222222222",
      actorId: platformAdmin.id,
    });
  });

  it("refunds payments with the session actor", async () => {
    mocks.refundPaymentAsAdmin.mockResolvedValue({ id: "pay-1" });

    const res = await postJson(
      "/billing/payments/66666666-6666-4666-8666-666666666666/refund",
      {},
    );

    expect(res.status).toBe(200);
    expect(mocks.refundPaymentAsAdmin).toHaveBeenCalledWith({
      paymentId: "66666666-6666-4666-8666-666666666666",
      actorId: platformAdmin.id,
    });
  });

  it("returns payment detail with refund capability flags", async () => {
    mocks.getPaymentForAdmin.mockResolvedValue({
      payment: { id: "66666666-6666-4666-8666-666666666666" },
      refund: { configured: true, supported: true },
    });

    const res = await createRouteApp(platformAdmin).request(
      "/billing/payments/66666666-6666-4666-8666-666666666666",
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      refund: { configured: true, supported: true },
    });
  });

  it("stores organization notes with the session actor", async () => {
    mocks.adminAddNote.mockResolvedValue({ id: "note-1" });

    const res = await postJson(
      "/billing/organizations/11111111-1111-4111-8111-111111111111/notes",
      { body: "Called the customer" },
    );

    expect(res.status).toBe(201);
    expect(mocks.adminAddNote).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "11111111-1111-4111-8111-111111111111",
        body: "Called the customer",
        actorId: platformAdmin.id,
      }),
    );
  });

  it("rejects empty notes", async () => {
    const res = await postJson(
      "/billing/organizations/11111111-1111-4111-8111-111111111111/notes",
      { body: "   " },
    );

    expect(res.status).toBe(400);
    expect(mocks.adminAddNote).not.toHaveBeenCalled();
  });
});
