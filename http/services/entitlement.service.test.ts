import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptInvitationInTx,
  createUserFromInvitationInTx,
} from "@/http/repositories/invitation.repository";
import {
  acceptInvitationWithMemberLimit,
  checkFeatureEnabled,
  checkResourceLimit,
  createInvitedUserWithMemberLimit,
  getOrganizationUsage,
  loadEntitlement,
  runWithResourceLimit,
} from "./entitlement.service";

type TestPlan = {
  id: string;
  code: "FREE" | "PRO";
  name: string;
  maxMembers: number | null;
  maxProjects: number | null;
  features: string[];
};

const state = vi.hoisted(() => {
  const FREE_PLAN = {
    id: "plan-free",
    code: "FREE",
    name: "Free",
    maxMembers: 5,
    maxProjects: 3,
    features: [],
  };

  const PRO_PLAN = {
    id: "plan-pro",
    code: "PRO",
    name: "Pro",
    maxMembers: null,
    maxProjects: null,
    features: ["integrations", "finance"],
  };

  return {
    FREE_PLAN,
    PRO_PLAN,
    events: [] as string[],
    plansQueried: [] as string[],
    live: new Map<string, TestPlan>(),
    projectCounts: new Map<string, number>(),
    memberCounts: new Map<string, number>(),
  };
});

vi.mock("@/db", () => {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    db: {
      transaction: <T>(cb: (tx: unknown) => Promise<T>): Promise<T> => {
        const next = queue.then(async () => cb({ tag: "tx" }));
        queue = next.catch(() => undefined);
        return next;
      },
    },
  };
});

vi.mock("@/http/repositories/subscription.repository", () => ({
  acquireSubscriptionLock: vi.fn(async (_tx: unknown, orgId: string) => {
    state.events.push(`lock:${orgId}`);
  }),
  findLiveSubscriptionWithPlan: vi.fn(async (orgId: string) => {
    const plan = state.live.get(orgId);
    return plan ? { id: `sub-${orgId}`, organizationId: orgId, plan } : null;
  }),
  findLiveSubscriptionWithPlanInTx: vi.fn(
    async (_tx: unknown, orgId: string) => {
      const plan = state.live.get(orgId);
      return plan ? { id: `sub-${orgId}`, organizationId: orgId, plan } : null;
    },
  ),
  findSubscriptionPlanByCode: vi.fn(async (code: string) => {
    state.plansQueried.push(code);
    if (code === "FREE") return state.FREE_PLAN;
    if (code === "PRO") return state.PRO_PLAN;
    return null;
  }),
  findSubscriptionPlanByCodeInTx: vi.fn(async (_tx: unknown, code: string) => {
    state.plansQueried.push(code);
    if (code === "FREE") return state.FREE_PLAN;
    if (code === "PRO") return state.PRO_PLAN;
    return null;
  }),
}));

vi.mock("@/http/repositories/project.repository", () => ({
  countProjectsByOrganizationId: vi.fn(async (orgId: string) => {
    state.events.push(`count:projects:${orgId}`);
    return state.projectCounts.get(orgId) ?? 0;
  }),
  countProjectsByOrganizationIdInTx: vi.fn(
    async (_tx: unknown, orgId: string) => {
      state.events.push(`count:projects:${orgId}`);
      return state.projectCounts.get(orgId) ?? 0;
    },
  ),
}));

vi.mock("@/http/repositories/organization.repository", () => ({
  countOrganizationMembers: vi.fn(async (orgId: string) => {
    state.events.push(`count:members:${orgId}`);
    return state.memberCounts.get(orgId) ?? 0;
  }),
  countOrganizationMembersInTx: vi.fn(async (_tx: unknown, orgId: string) => {
    state.events.push(`count:members:${orgId}`);
    return state.memberCounts.get(orgId) ?? 0;
  }),
}));

vi.mock("@/http/repositories/invitation.repository", () => ({
  acceptInvitationInTx: vi.fn(
    async (_tx: unknown, data: { organizationId: string }) => {
      state.events.push(`accept:${data.organizationId}`);
    },
  ),
  createUserFromInvitationInTx: vi.fn(
    async (_tx: unknown, data: { organizationId: string; email: string }) => {
      state.events.push(`create-user:${data.organizationId}`);
      return { id: "user-created", ...data };
    },
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.events.length = 0;
  state.plansQueried.length = 0;
  state.live.clear();
  state.projectCounts.clear();
  state.memberCounts.clear();
});

describe("loadEntitlement", () => {
  it("uses the live subscription plan when one exists", async () => {
    state.live.set("org-live", state.PRO_PLAN as TestPlan);

    const entitlement = await loadEntitlement("org-live");

    expect(entitlement.planCode).toBe("PRO");
    expect(entitlement.features).toEqual(["integrations", "finance"]);
    expect(entitlement.limits).toEqual({
      maxMembers: null,
      maxProjects: null,
    });
  });

  it("falls back to the FREE plan when there is no live subscription", async () => {
    const entitlement = await loadEntitlement("org-expired");

    expect(entitlement.planCode).toBe("FREE");
    expect(entitlement.limits).toEqual({ maxMembers: 5, maxProjects: 3 });
    expect(state.plansQueried).toContain("FREE");
  });
});

describe("Free plan resource limits", () => {
  beforeEach(() => {
    state.live.set("org-free", state.FREE_PLAN as TestPlan);
  });

  it("denies project creation at the Free limit and allows below it", async () => {
    state.projectCounts.set("org-free", 3);

    const denied = await runWithResourceLimit(
      "org-free",
      "projects",
      async () => "created",
    );

    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.denial.code).toBe("PROJECT_LIMIT_REACHED");
      expect(denied.denial.limit).toBe(3);
      expect(denied.denial.usage).toBe(3);
      expect(denied.denial.plan).toBe("FREE");
      expect(denied.denial.upgradeRequired).toBe(true);
      expect(denied.denial.error).not.toMatch(/upgrade/i);
    }

    state.projectCounts.set("org-free", 2);

    const allowed = await runWithResourceLimit(
      "org-free",
      "projects",
      async () => "created",
    );

    expect(allowed).toEqual({ allowed: true, value: "created" });
  });

  it("denies member invitations at the Free member limit", async () => {
    state.memberCounts.set("org-free", 5);

    await expect(checkResourceLimit("org-free", "members")).resolves.toEqual(
      expect.objectContaining({
        code: "MEMBER_LIMIT_REACHED",
        limit: 5,
        usage: 5,
        plan: "FREE",
      }),
    );

    state.memberCounts.set("org-free", 4);

    await expect(checkResourceLimit("org-free", "members")).resolves.toBeNull();
  });

  it("blocks invitation acceptance at the limit without touching the invitation", async () => {
    state.memberCounts.set("org-free", 5);

    const denied = await acceptInvitationWithMemberLimit({
      userId: "user-1",
      organizationId: "org-free",
      role: "COLLABORATOR",
      invitationId: "invitation-1",
    });

    expect(denied.allowed).toBe(false);
    expect(acceptInvitationInTx).not.toHaveBeenCalled();

    state.memberCounts.set("org-free", 4);

    const allowed = await acceptInvitationWithMemberLimit({
      userId: "user-1",
      organizationId: "org-free",
      role: "COLLABORATOR",
      invitationId: "invitation-1",
    });

    expect(allowed.allowed).toBe(true);
    expect(acceptInvitationInTx).toHaveBeenCalledOnce();
  });

  it("blocks account creation from an invitation link when the org is full", async () => {
    state.memberCounts.set("org-free", 5);

    const denied = await createInvitedUserWithMemberLimit({
      email: "invitee@example.com",
      name: "Invitee",
      passwordHash: "hash",
      role: "COLLABORATOR",
      invitationId: "invitation-2",
      organizationId: "org-free",
    });

    expect(denied.allowed).toBe(false);
    expect(createUserFromInvitationInTx).not.toHaveBeenCalled();
  });

  it("denies plan-restricted features on the Free plan", async () => {
    const denial = await checkFeatureEnabled("org-free", "finance");

    expect(denial).toEqual(
      expect.objectContaining({
        code: "FEATURE_NOT_ENABLED",
        feature: "finance",
        plan: "FREE",
        upgradeRequired: true,
      }),
    );
    if (denial) {
      expect(denial.error).not.toMatch(/upgrade/i);
    }

    await expect(
      checkFeatureEnabled("org-free", "integrations"),
    ).resolves.toEqual(
      expect.objectContaining({ code: "FEATURE_NOT_ENABLED" }),
    );
  });
});

describe("Pro plan entitlements", () => {
  beforeEach(() => {
    state.live.set("org-pro", state.PRO_PLAN as TestPlan);
  });

  it("allows project creation far beyond the Free ceiling", async () => {
    state.projectCounts.set("org-pro", 999);

    await expect(checkResourceLimit("org-pro", "projects")).resolves.toBeNull();

    const result = await runWithResourceLimit(
      "org-pro",
      "projects",
      async () => "created",
    );

    expect(result).toEqual({ allowed: true, value: "created" });
  });

  it("grants every configured feature on the Pro plan", async () => {
    await expect(
      checkFeatureEnabled("org-pro", "integrations"),
    ).resolves.toBeNull();
    await expect(checkFeatureEnabled("org-pro", "finance")).resolves.toBeNull();
  });

  it("reports unlimited usage on the Pro plan", async () => {
    state.projectCounts.set("org-pro", 999);
    state.memberCounts.set("org-pro", 999);

    const usage = await getOrganizationUsage("org-pro");

    expect(usage.plan).toEqual({ code: "PRO", name: "Pro" });
    expect(usage.limits).toEqual({ maxMembers: null, maxProjects: null });
    expect(usage.usage).toEqual({ members: 999, projects: 999 });
    expect(usage.reached).toEqual({ members: false, projects: false });
  });
});

describe("organization isolation", () => {
  it("evaluates resource limits per organization", async () => {
    state.live.set("org-a", state.FREE_PLAN as TestPlan);
    state.live.set("org-b", state.FREE_PLAN as TestPlan);
    state.projectCounts.set("org-a", 3);
    state.projectCounts.set("org-b", 0);

    const deniedA = await runWithResourceLimit(
      "org-a",
      "projects",
      async () => "created",
    );
    const allowedB = await runWithResourceLimit(
      "org-b",
      "projects",
      async () => {
        state.projectCounts.set(
          "org-b",
          (state.projectCounts.get("org-b") ?? 0) + 1,
        );
        return "created";
      },
    );

    expect(deniedA.allowed).toBe(false);
    if (!deniedA.allowed) {
      expect(deniedA.denial.usage).toBe(3);
    }
    expect(allowedB).toEqual({ allowed: true, value: "created" });
    expect(state.projectCounts.get("org-b")).toBe(1);
    expect(state.projectCounts.get("org-a")).toBe(3);
  });

  it("does not leak plan features across organizations", async () => {
    state.live.set("org-pro", state.PRO_PLAN as TestPlan);
    state.live.set("org-free", state.FREE_PLAN as TestPlan);

    await expect(checkFeatureEnabled("org-pro", "finance")).resolves.toBeNull();

    const denial = await checkFeatureEnabled("org-free", "finance");
    expect(denial).toEqual(
      expect.objectContaining({ plan: "FREE", code: "FEATURE_NOT_ENABLED" }),
    );
  });
});

describe("concurrent project creation", () => {
  it("serializes limit evaluation behind the subscription lock", async () => {
    state.live.set("org-race", state.FREE_PLAN as TestPlan);
    state.projectCounts.set("org-race", 2);

    const create = () =>
      runWithResourceLimit("org-race", "projects", async () => {
        const next = (state.projectCounts.get("org-race") ?? 0) + 1;
        state.projectCounts.set("org-race", next);
        return `project-${next}`;
      });

    const results = await Promise.all([create(), create()]);

    const allowed = results.filter((result) => result.allowed);
    const deniedResult = results.find((result) => !result.allowed);

    expect(allowed).toHaveLength(1);
    expect(deniedResult).toBeDefined();
    if (deniedResult && !deniedResult.allowed) {
      expect(deniedResult.denial.code).toBe("PROJECT_LIMIT_REACHED");
    }
    expect(state.projectCounts.get("org-race")).toBe(3);

    expect(state.events).toHaveLength(4);
    for (let index = 0; index < state.events.length; index += 2) {
      expect(state.events[index]).toBe("lock:org-race");
      expect(state.events[index + 1]).toBe("count:projects:org-race");
    }
  });

  it("keeps serving requests after a failed action", async () => {
    state.live.set("org-err", state.PRO_PLAN as TestPlan);

    await expect(
      runWithResourceLimit("org-err", "projects", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const result = await runWithResourceLimit(
      "org-err",
      "projects",
      async () => "created",
    );

    expect(result).toEqual({ allowed: true, value: "created" });
  });
});

describe("plan downgrade", () => {
  it("keeps existing usage visible while blocking new creations", async () => {
    state.live.set("org-downgrade", state.FREE_PLAN as TestPlan);
    state.projectCounts.set("org-downgrade", 7);

    const action = vi.fn(async () => "created");
    const result = await runWithResourceLimit(
      "org-downgrade",
      "projects",
      action,
    );

    expect(result.allowed).toBe(false);
    expect(action).not.toHaveBeenCalled();

    const usage = await getOrganizationUsage("org-downgrade");

    expect(usage.plan.code).toBe("FREE");
    expect(usage.usage.projects).toBe(7);
    expect(usage.reached.projects).toBe(true);
    expect(state.projectCounts.get("org-downgrade")).toBe(7);
  });
});

describe("expired subscription fallback", () => {
  it("serves usage and checks from the FREE fallback without throwing", async () => {
    state.projectCounts.set("org-expired", 3);

    const usage = await getOrganizationUsage("org-expired");

    expect(usage.plan.code).toBe("FREE");
    expect(usage.limits).toEqual({ maxMembers: 5, maxProjects: 3 });
    expect(state.plansQueried).toContain("FREE");

    await expect(
      checkResourceLimit("org-expired", "projects"),
    ).resolves.toEqual(
      expect.objectContaining({ plan: "FREE", code: "PROJECT_LIMIT_REACHED" }),
    );
    await expect(
      checkFeatureEnabled("org-expired", "integrations"),
    ).resolves.toEqual(
      expect.objectContaining({ plan: "FREE", code: "FEATURE_NOT_ENABLED" }),
    );
  });
});
