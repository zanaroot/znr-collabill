import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logAudit: vi.fn(),
  getBillingOverview: vi.fn(),
  listOrganizationsAdmin: vi.fn(),
  countSubscriptionsByPlan: vi.fn(),
  findAllSubscriptionPlans: vi.fn(),
  findSubscriptionPlanByCode: vi.fn(),
  findSubscriptionPlanById: vi.fn(),
  insertSubscriptionPlan: vi.fn(),
  updateSubscriptionPlan: vi.fn(),
}));

vi.mock("@/http/actions/audit.action", () => ({
  logAudit: mocks.logAudit,
}));
vi.mock("@/http/repositories/back-office.repository", () => ({
  getBillingOverview: mocks.getBillingOverview,
  listOrganizationsAdmin: mocks.listOrganizationsAdmin,
}));
vi.mock("@/http/repositories/subscription.repository", () => ({
  countSubscriptionsByPlan: mocks.countSubscriptionsByPlan,
  findAllSubscriptionPlans: mocks.findAllSubscriptionPlans,
  findSubscriptionPlanByCode: mocks.findSubscriptionPlanByCode,
  findSubscriptionPlanById: mocks.findSubscriptionPlanById,
  insertSubscriptionPlan: mocks.insertSubscriptionPlan,
  updateSubscriptionPlan: mocks.updateSubscriptionPlan,
}));
vi.mock("@/db", () => ({ db: {}, dbClient: {} }));

import {
  BackOfficeError,
  createAdminPlan,
  listAdminPlans,
  listOrganizationsForAdmin,
  updateAdminPlan,
} from "@/http/services/back-office.service";

const actorId = "00000000-0000-4000-8000-0000000000aa";
const planId = "33333333-3333-4333-8333-333333333331";

const basePlanInput = {
  code: "GOLD",
  name: "Gold",
  description: "Gold tier",
  amountMinor: 5000,
  amountMinorYearly: 50000,
  currency: "USD" as const,
  supportedCurrencies: ["USD"] as ("USD" | "EUR")[],
  maxMembers: null,
  maxProjects: null,
  features: [] as ("integrations" | "finance")[],
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAdminPlan", () => {
  it("creates a plan with a derived monthly interval and audits it", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(null);
    mocks.insertSubscriptionPlan.mockResolvedValue({ id: planId });

    const input = { ...basePlanInput, features: ["finance" as const] };
    await createAdminPlan(input, actorId);

    expect(mocks.insertSubscriptionPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "GOLD",
        amountMinor: 5000,
        amountMinorYearly: 50000,
        interval: "MONTHLY",
        features: ["finance"],
        active: true,
      }),
    );
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: null,
        actorId,
        action: "CREATE",
        entity: "PLAN",
        entityId: planId,
      }),
    );
  });

  it("derives a yearly interval for yearly-only plans", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(null);
    mocks.insertSubscriptionPlan.mockResolvedValue({ id: planId });

    await createAdminPlan(
      { ...basePlanInput, amountMinor: 0, amountMinorYearly: 40000 },
      actorId,
    );

    expect(mocks.insertSubscriptionPlan).toHaveBeenCalledWith(
      expect.objectContaining({ interval: "YEARLY" }),
    );
  });

  it("derives a null interval when the plan has no prices", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue(null);
    mocks.insertSubscriptionPlan.mockResolvedValue({ id: planId });

    await createAdminPlan(
      { ...basePlanInput, amountMinor: 0, amountMinorYearly: null },
      actorId,
    );

    expect(mocks.insertSubscriptionPlan).toHaveBeenCalledWith(
      expect.objectContaining({ interval: null }),
    );
  });

  it("rejects duplicate plan codes", async () => {
    mocks.findSubscriptionPlanByCode.mockResolvedValue({ id: planId });

    await expect(createAdminPlan(basePlanInput, actorId)).rejects.toMatchObject(
      {
        name: "BackOfficeError",
        statusCode: 409,
      },
    );
    expect(mocks.insertSubscriptionPlan).not.toHaveBeenCalled();
  });
});

describe("updateAdminPlan", () => {
  it("rejects unknown plans", async () => {
    mocks.findSubscriptionPlanById.mockResolvedValue(null);

    await expect(
      updateAdminPlan(planId, basePlanInput, actorId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("refuses to deactivate the FREE plan", async () => {
    mocks.findSubscriptionPlanById.mockResolvedValue({
      id: planId,
      code: "FREE",
    });

    await expect(
      updateAdminPlan(planId, { ...basePlanInput, active: false }, actorId),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.updateSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("updates values and audits the change", async () => {
    mocks.findSubscriptionPlanById.mockResolvedValue({
      id: planId,
      code: "GOLD",
    });
    mocks.updateSubscriptionPlan.mockResolvedValue({
      id: planId,
      code: "GOLD",
      active: true,
    });

    await updateAdminPlan(
      planId,
      { ...basePlanInput, amountMinor: 6000, amountMinorYearly: null },
      actorId,
    );

    expect(mocks.updateSubscriptionPlan).toHaveBeenCalledWith(
      planId,
      expect.objectContaining({ amountMinor: 6000, amountMinorYearly: null }),
    );
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "PLAN", action: "UPDATE" }),
    );
  });

  it("merges partial updates with the existing plan values", async () => {
    mocks.findSubscriptionPlanById.mockResolvedValue({
      id: planId,
      code: "GOLD",
      name: "Gold",
      description: "Gold tier",
      amountMinor: 5000,
      amountMinorYearly: 50000,
      currency: "USD",
      supportedCurrencies: ["USD"],
      maxMembers: null,
      maxProjects: null,
      features: ["finance"],
      active: true,
    });
    mocks.updateSubscriptionPlan.mockResolvedValue({
      id: planId,
      code: "GOLD",
      active: true,
    });

    await updateAdminPlan(planId, { name: "Platinum" }, actorId);

    expect(mocks.updateSubscriptionPlan).toHaveBeenCalledWith(
      planId,
      expect.objectContaining({
        name: "Platinum",
        amountMinor: 5000,
        amountMinorYearly: 50000,
        currency: "USD",
        supportedCurrencies: ["USD"],
        features: ["finance"],
        active: true,
      }),
    );
  });

  it("rejects updates whose currencies stop covering the plan currency", async () => {
    mocks.findSubscriptionPlanById.mockResolvedValue({
      id: planId,
      code: "GOLD",
      name: "Gold",
      description: null,
      amountMinor: 5000,
      amountMinorYearly: null,
      currency: "USD",
      supportedCurrencies: ["USD"],
      maxMembers: null,
      maxProjects: null,
      features: [],
      active: true,
    });

    await expect(
      updateAdminPlan(
        planId,
        { supportedCurrencies: ["EUR", "GBP"], currency: "USD" },
        actorId,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.updateSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("propagates BackOfficeError from a failed update", async () => {
    mocks.findSubscriptionPlanById.mockResolvedValue({
      id: planId,
      code: "GOLD",
    });
    mocks.updateSubscriptionPlan.mockResolvedValue(null);

    await expect(
      updateAdminPlan(planId, basePlanInput, actorId),
    ).rejects.toBeInstanceOf(BackOfficeError);
  });
});

describe("listAdminPlans", () => {
  it("merges subscription counts into the plan list", async () => {
    const plan = {
      id: planId,
      code: "PRO",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mocks.findAllSubscriptionPlans.mockResolvedValue([plan]);
    mocks.countSubscriptionsByPlan.mockResolvedValue(new Map([[planId, 7]]));

    const result = await listAdminPlans();

    expect(result).toEqual([{ ...plan, subscriptionCount: 7 }]);
  });
});

describe("listOrganizationsForAdmin", () => {
  it("passes filters through to the repository", async () => {
    mocks.listOrganizationsAdmin.mockResolvedValue({ rows: [], total: 0 });

    const result = await listOrganizationsForAdmin({
      search: "acme",
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ rows: [], total: 0 });
    expect(mocks.listOrganizationsAdmin).toHaveBeenCalledWith({
      search: "acme",
      page: 1,
      pageSize: 20,
    });
  });
});
