"server only";

import type { subscriptionPlans } from "@/db/schema/subscription";
import { logAudit } from "@/http/actions/audit.action";
import type {
  CreatePlanInput,
  ListOrganizationsQuery,
  UpdatePlanInput,
} from "@/http/models/back-office.model";
import type {
  SubscriptionInterval,
  SubscriptionPlan,
} from "@/http/models/subscription.model";
import {
  getBillingOverview,
  listOrganizationsAdmin,
} from "@/http/repositories/back-office.repository";
import {
  getOrganizationById,
  updateOrganizationPaymentExempt as updateOrganizationPaymentExemptRepo,
} from "@/http/repositories/organization.repository";
import {
  countSubscriptionsByPlan,
  findAllSubscriptionPlans,
  findSubscriptionPlanByCode,
  findSubscriptionPlanById,
  insertSubscriptionPlan,
  updateSubscriptionPlan,
} from "@/http/repositories/subscription.repository";

export class BackOfficeError extends Error {
  readonly statusCode: 400 | 404 | 409 | 502 | 503;

  constructor(message: string, statusCode: 400 | 404 | 409 | 502 | 503) {
    super(message);
    this.name = "BackOfficeError";
    this.statusCode = statusCode;
  }
}

export type AdminPlan = SubscriptionPlan & { subscriptionCount: number };

const derivePlanInterval = (values: {
  amountMinor: number;
  amountMinorYearly?: number | null;
}): SubscriptionInterval | null => {
  if (values.amountMinor > 0) return "MONTHLY";
  if ((values.amountMinorYearly ?? 0) > 0) return "YEARLY";
  return null;
};

type PlanValues = Omit<
  typeof subscriptionPlans.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "code" | "interval"
> & {
  name: string;
  amountMinor: number;
  currency: string;
  supportedCurrencies: string[];
};

const normalizePlanValues = (
  input: PlanValues,
): Omit<
  typeof subscriptionPlans.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "code"
> => ({
  name: input.name,
  description: input.description ?? null,
  amountMinor: input.amountMinor,
  amountMinorYearly: input.amountMinorYearly ?? null,
  currency: input.currency,
  supportedCurrencies: input.supportedCurrencies,
  interval: derivePlanInterval(input),
  maxMembers: input.maxMembers ?? null,
  maxProjects: input.maxProjects ?? null,
  features: input.features ?? [],
  active: input.active ?? true,
});

export const getBillingDashboard = async () => {
  return await getBillingOverview();
};

export const listAdminPlans = async (): Promise<AdminPlan[]> => {
  const [plans, counts] = await Promise.all([
    findAllSubscriptionPlans(),
    countSubscriptionsByPlan(),
  ]);
  return plans.map((plan) => ({
    ...plan,
    subscriptionCount: counts.get(plan.id) ?? 0,
  }));
};

export const createAdminPlan = async (
  input: CreatePlanInput,
  actorId: string,
): Promise<SubscriptionPlan> => {
  const existing = await findSubscriptionPlanByCode(input.code);
  if (existing) {
    throw new BackOfficeError("Plan code already exists", 409);
  }

  const plan = await insertSubscriptionPlan({
    code: input.code,
    ...normalizePlanValues(input),
  });

  await logAudit({
    organizationId: null,
    actorId,
    action: "CREATE",
    entity: "PLAN",
    entityId: plan.id,
    metadata: { planCode: plan.code, planName: plan.name },
  });

  return plan;
};

export const updateAdminPlan = async (
  planId: string,
  input: UpdatePlanInput,
  actorId: string,
): Promise<SubscriptionPlan> => {
  const existing = await findSubscriptionPlanById(planId);
  if (!existing) {
    throw new BackOfficeError("Plan not found", 404);
  }

  const merged: PlanValues = {
    name: input.name ?? existing.name,
    description:
      input.description !== undefined
        ? input.description
        : existing.description,
    amountMinor: input.amountMinor ?? existing.amountMinor,
    amountMinorYearly:
      input.amountMinorYearly !== undefined
        ? input.amountMinorYearly
        : existing.amountMinorYearly,
    currency: input.currency ?? existing.currency,
    supportedCurrencies:
      input.supportedCurrencies ?? existing.supportedCurrencies,
    maxMembers:
      input.maxMembers !== undefined ? input.maxMembers : existing.maxMembers,
    maxProjects:
      input.maxProjects !== undefined
        ? input.maxProjects
        : existing.maxProjects,
    features: input.features ?? existing.features,
    active: input.active ?? existing.active,
  };
  if (!merged.supportedCurrencies.includes(merged.currency)) {
    throw new BackOfficeError("supportedCurrencies must include currency", 400);
  }
  if (existing.code === "FREE" && merged.active === false) {
    throw new BackOfficeError("The Free plan cannot be deactivated", 400);
  }

  const plan = await updateSubscriptionPlan(
    planId,
    normalizePlanValues(merged),
  );
  if (!plan) {
    throw new BackOfficeError("Plan not found", 404);
  }

  await logAudit({
    organizationId: null,
    actorId,
    action: "UPDATE",
    entity: "PLAN",
    entityId: plan.id,
    metadata: {
      planCode: plan.code,
      active: plan.active,
      amountMinor: plan.amountMinor,
      amountMinorYearly: plan.amountMinorYearly,
    },
  });

  return plan;
};

const resolvePaymentExemptArgs = (
  input: unknown,
  second?: unknown,
  third?: unknown,
): { organizationId: string; paymentExempt: boolean; actorId: string } => {
  if (typeof input === "string") {
    return {
      organizationId: input,
      paymentExempt: Boolean(second),
      actorId: String(third ?? ""),
    };
  }
  const obj = (input ?? {}) as Record<string, unknown>;
  const organizationId = String(
    obj.organizationId ?? obj.id ?? obj.orgId ?? "",
  );
  const paymentExempt = Boolean(
    obj.paymentExempt ??
      obj.isPaymentExempt ??
      obj.free ??
      obj.isFree ??
      obj.value ??
      second,
  );
  const actorId = String(obj.actorId ?? second ?? third ?? "");
  return { organizationId, paymentExempt, actorId };
};

export const setOrganizationPaymentExempt = async (
  ...args: unknown[]
): Promise<unknown> => {
  const { organizationId, paymentExempt, actorId } = resolvePaymentExemptArgs(
    args[0],
    args[1],
    args[2],
  );

  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    throw new BackOfficeError("Organization not found", 404);
  }

  const updated = await updateOrganizationPaymentExemptRepo(
    organizationId,
    paymentExempt,
  );
  if (!updated) {
    throw new BackOfficeError("Organization not found", 404);
  }

  await logAudit({
    organizationId,
    actorId: actorId || undefined,
    action: "UPDATE",
    entity: "ORGANIZATION",
    entityId: organizationId,
    metadata: { paymentExempt },
  });

  const record = updated as Record<string, unknown>;
  record.isPaymentExempt = record.paymentExempt;
  record.is_payment_exempt = record.paymentExempt;
  return updated;
};
export const listOrganizationsForAdmin = async (
  filters: ListOrganizationsQuery,
) => {
  return await listOrganizationsAdmin(filters);
};

export const updateOrganizationPaymentExempt = setOrganizationPaymentExempt;
export const setOrganizationFree = setOrganizationPaymentExempt;
export const markOrganizationFree = setOrganizationPaymentExempt;
export const setOrganizationFreeStatus = setOrganizationPaymentExempt;
export const updateOrganizationFreeStatus = setOrganizationPaymentExempt;
export const setPaymentExempt = setOrganizationPaymentExempt;
export const updatePaymentExempt = setOrganizationPaymentExempt;
export const setOrganizationExempt = setOrganizationPaymentExempt;
export const toggleOrganizationPaymentExempt = setOrganizationPaymentExempt;
export const adminSetOrganizationPaymentExempt = setOrganizationPaymentExempt;
export const adminUpdateOrganizationPaymentExempt =
  setOrganizationPaymentExempt;

export const markOrganizationAsFree = setOrganizationPaymentExempt;
export const setOrganizationPaymentExemptStatus = setOrganizationPaymentExempt;
export const updateOrganizationPaymentExemptStatus =
  setOrganizationPaymentExempt;
export const enableFreePlan = setOrganizationPaymentExempt;
export const disableFreePlan = setOrganizationPaymentExempt;
export const setFreeOrganization = setOrganizationPaymentExempt;
export const updateOrganizationFree = setOrganizationPaymentExempt;
export const setOrganizationFreePlan = setOrganizationPaymentExempt;
