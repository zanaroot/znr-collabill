"server only";

import { db } from "@/db";
import type {
  SubscriptionFeature,
  SubscriptionPlan,
  SubscriptionPlanCode,
} from "@/http/models/subscription.model";
import type { Role } from "@/http/models/user.model";
import {
  acceptInvitationInTx,
  createUserFromInvitationInTx,
} from "@/http/repositories/invitation.repository";
import {
  countOrganizationMembers,
  countOrganizationMembersInTx,
} from "@/http/repositories/organization.repository";
import {
  countProjectsByOrganizationId,
  countProjectsByOrganizationIdInTx,
} from "@/http/repositories/project.repository";
import {
  acquireSubscriptionLock,
  findLiveSubscriptionWithPlan,
  findLiveSubscriptionWithPlanInTx,
  findSubscriptionPlanByCode,
  findSubscriptionPlanByCodeInTx,
} from "@/http/repositories/subscription.repository";

export type EntitlementResource = "projects" | "members";

type EntitlementDenialCode =
  | "PROJECT_LIMIT_REACHED"
  | "MEMBER_LIMIT_REACHED"
  | "FEATURE_NOT_ENABLED";

export type EntitlementDenial = {
  error: string;
  code: EntitlementDenialCode;
  upgradeRequired: true;
  plan: SubscriptionPlanCode;
  resource?: EntitlementResource;
  feature?: SubscriptionFeature;
  limit?: number;
  usage?: number;
};

export type OrganizationEntitlement = {
  organizationId: string;
  planCode: SubscriptionPlanCode;
  planName: string;
  features: string[];
  limits: {
    maxMembers: number | null;
    maxProjects: number | null;
  };
};

export type ResourceLimitResult<T> =
  | { allowed: true; value: T }
  | { allowed: false; denial: EntitlementDenial };

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const featureLabels: Record<SubscriptionFeature, string> = {
  integrations: "Integrations",
  finance: "Finance settings",
};

class SubscriptionPlanNotConfiguredError extends Error {
  constructor() {
    super("Fallback FREE subscription plan is not configured");
    this.name = "SubscriptionPlanNotConfiguredError";
  }
}

const toEntitlement = (
  organizationId: string,
  plan: SubscriptionPlan,
): OrganizationEntitlement => ({
  organizationId,
  planCode: plan.code,
  planName: plan.name,
  features: plan.features ?? [],
  limits: {
    maxMembers: plan.maxMembers,
    maxProjects: plan.maxProjects,
  },
});

const requireFallbackPlan = (plan: SubscriptionPlan | null) => {
  if (!plan) {
    throw new SubscriptionPlanNotConfiguredError();
  }
  return plan;
};

export const loadEntitlement = async (
  organizationId: string,
): Promise<OrganizationEntitlement> => {
  const live = await findLiveSubscriptionWithPlan(organizationId);
  if (live) {
    return toEntitlement(organizationId, live.plan);
  }
  const fallback = requireFallbackPlan(
    await findSubscriptionPlanByCode("FREE"),
  );
  return toEntitlement(organizationId, fallback);
};

const loadEntitlementInTx = async (
  tx: Transaction,
  organizationId: string,
): Promise<OrganizationEntitlement> => {
  const live = await findLiveSubscriptionWithPlanInTx(tx, organizationId);
  if (live) {
    return toEntitlement(organizationId, live.plan);
  }
  const fallback = requireFallbackPlan(
    await findSubscriptionPlanByCodeInTx(tx, "FREE"),
  );
  return toEntitlement(organizationId, fallback);
};

const countResource = async (
  organizationId: string,
  resource: EntitlementResource,
): Promise<number> => {
  if (resource === "projects") {
    return countProjectsByOrganizationId(organizationId);
  }
  return countOrganizationMembers(organizationId);
};

const countResourceInTx = async (
  tx: Transaction,
  organizationId: string,
  resource: EntitlementResource,
): Promise<number> => {
  if (resource === "projects") {
    return countProjectsByOrganizationIdInTx(tx, organizationId);
  }
  return countOrganizationMembersInTx(tx, organizationId);
};

const evaluateResourceDenial = (
  entitlement: OrganizationEntitlement,
  resource: EntitlementResource,
  usage: number,
): EntitlementDenial | null => {
  const limit =
    resource === "projects"
      ? entitlement.limits.maxProjects
      : entitlement.limits.maxMembers;

  if (limit === null || usage < limit) {
    return null;
  }

  const label = resource === "projects" ? "Project" : "Member";
  return {
    error: `${label} limit reached: your ${entitlement.planName} plan allows up to ${limit} ${resource}`,
    code:
      resource === "projects"
        ? "PROJECT_LIMIT_REACHED"
        : "MEMBER_LIMIT_REACHED",
    upgradeRequired: true,
    plan: entitlement.planCode,
    resource,
    limit,
    usage,
  };
};

export const checkResourceLimit = async (
  organizationId: string,
  resource: EntitlementResource,
): Promise<EntitlementDenial | null> => {
  const entitlement = await loadEntitlement(organizationId);
  const usage = await countResource(organizationId, resource);
  return evaluateResourceDenial(entitlement, resource, usage);
};

export const checkFeatureEnabled = async (
  organizationId: string,
  feature: SubscriptionFeature,
): Promise<EntitlementDenial | null> => {
  const entitlement = await loadEntitlement(organizationId);
  if (entitlement.features.includes(feature)) {
    return null;
  }
  return {
    error: `${featureLabels[feature]} is not available on the ${entitlement.planName} plan`,
    code: "FEATURE_NOT_ENABLED",
    upgradeRequired: true,
    plan: entitlement.planCode,
    feature,
  };
};

export const runWithResourceLimit = async <T>(
  organizationId: string,
  resource: EntitlementResource,
  action: (tx: Transaction) => Promise<T>,
): Promise<ResourceLimitResult<T>> => {
  return await db.transaction(async (tx) => {
    await acquireSubscriptionLock(tx, organizationId);
    const entitlement = await loadEntitlementInTx(tx, organizationId);
    const usage = await countResourceInTx(tx, organizationId, resource);
    const denial = evaluateResourceDenial(entitlement, resource, usage);
    if (denial) {
      return { allowed: false as const, denial };
    }
    const value = await action(tx);
    return { allowed: true as const, value };
  });
};

export const getOrganizationUsage = async (organizationId: string) => {
  const entitlement = await loadEntitlement(organizationId);
  const [members, projects] = await Promise.all([
    countOrganizationMembers(organizationId),
    countProjectsByOrganizationId(organizationId),
  ]);

  return {
    plan: {
      code: entitlement.planCode,
      name: entitlement.planName,
    },
    features: entitlement.features,
    limits: entitlement.limits,
    usage: { members, projects },
    reached: {
      members:
        entitlement.limits.maxMembers !== null &&
        members >= entitlement.limits.maxMembers,
      projects:
        entitlement.limits.maxProjects !== null &&
        projects >= entitlement.limits.maxProjects,
    },
  };
};

export const acceptInvitationWithMemberLimit = async (data: {
  userId: string;
  organizationId: string;
  role: Role;
  invitationId: string;
}): Promise<ResourceLimitResult<void>> =>
  runWithResourceLimit(data.organizationId, "members", async (tx) => {
    await acceptInvitationInTx(tx, data);
  });

export const createInvitedUserWithMemberLimit = async (data: {
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  invitationId: string;
  organizationId: string;
}): Promise<
  ResourceLimitResult<Awaited<ReturnType<typeof createUserFromInvitationInTx>>>
> =>
  runWithResourceLimit(data.organizationId, "members", (tx) =>
    createUserFromInvitationInTx(tx, data),
  );
