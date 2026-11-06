"server only";

import { addDays, addMonths, addYears } from "date-fns";
import { logAudit } from "@/http/actions/audit.action";
import type {
  AdminCancelInput,
  AdminChangePlanInput,
  AdminExtendInput,
} from "@/http/models/back-office.model";
import {
  liveSubscriptionStatusSchema,
  type Subscription,
  type SubscriptionInterval,
  type SubscriptionWithPlan,
  subscriptionEventTypes,
} from "@/http/models/subscription.model";
import { getOrganizationById } from "@/http/repositories/organization.repository";
import {
  findLiveSubscriptionWithPlan,
  findSubscriptionAdminNotesByOrganization,
  findSubscriptionById,
  findSubscriptionPlanByCode,
  insertSubscriptionAdminNote,
  updateSubscriptionStateById,
} from "@/http/repositories/subscription.repository";
import { BackOfficeError } from "@/http/services/back-office.service";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  recordSubscriptionEvent,
} from "@/http/services/subscription.service";

const isLiveStatus = (status: Subscription["status"]): boolean =>
  liveSubscriptionStatusSchema.safeParse(status).success;

const requireSubscription = async (subscriptionId: string) => {
  const subscription = await findSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new BackOfficeError("Subscription not found", 404);
  }
  return subscription;
};

const nextPeriodEnd = (start: Date, interval: SubscriptionInterval | null) =>
  interval === "YEARLY" ? addYears(start, 1) : addMonths(start, 1);

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

const updateStateOrConflict = async (
  ...args: Parameters<typeof updateSubscriptionStateById>
) => {
  try {
    return await updateSubscriptionStateById(...args);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BackOfficeError(
        "Organization already has an active subscription",
        409,
      );
    }
    throw error;
  }
};

const auditSubscription = async (input: {
  actorId: string;
  organizationId: string;
  subscriptionId: string;
  action: "UPDATE";
  metadata: Record<string, unknown>;
}) => {
  await logAudit({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: input.action,
    entity: "SUBSCRIPTION",
    entityId: input.subscriptionId,
    metadata: input.metadata,
  });
};

const activateSubscriptionRow = async (input: {
  subscriptionId: string;
  actorId: string;
  operation: "activate" | "reactivate";
}) => {
  const subscription = await requireSubscription(input.subscriptionId);
  if (isLiveStatus(subscription.status)) {
    throw new BackOfficeError("Subscription is already active", 409);
  }
  const liveSibling = await findLiveSubscriptionWithPlan(
    subscription.organizationId,
  );
  if (liveSibling) {
    throw new BackOfficeError(
      "Organization already has an active subscription",
      409,
    );
  }

  const now = new Date();
  const needsPeriod =
    !subscription.currentPeriodEnd ||
    subscription.currentPeriodEnd.getTime() <= now.getTime();

  const result = await updateStateOrConflict(subscription.id, {
    status: "ACTIVE",
    cancelAtPeriodEnd: false,
    canceledAt: null,
    ...(needsPeriod
      ? {
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd(now, subscription.interval),
        }
      : {}),
  });
  if (!result) {
    throw new BackOfficeError("Subscription not found", 404);
  }

  await recordSubscriptionEvent({
    organizationId: subscription.organizationId,
    subscriptionId: subscription.id,
    type: subscriptionEventTypes.statusChanged,
    provider: subscription.provider,
    payload: {
      previousStatus: subscription.status,
      status: result.subscription.status,
      manual: true,
      operation: input.operation,
      actorId: input.actorId,
    },
  });

  await auditSubscription({
    actorId: input.actorId,
    organizationId: subscription.organizationId,
    subscriptionId: subscription.id,
    action: "UPDATE",
    metadata: {
      operation: input.operation,
      previousStatus: subscription.status,
      status: result.subscription.status,
    },
  });

  return result.subscription;
};

export const adminActivateSubscription = async (input: {
  subscriptionId: string;
  actorId: string;
}): Promise<Subscription> => {
  return await activateSubscriptionRow({ ...input, operation: "activate" });
};

export const adminReactivateSubscription = async (input: {
  subscriptionId: string;
  actorId: string;
}): Promise<Subscription> => {
  return await activateSubscriptionRow({ ...input, operation: "reactivate" });
};

export const adminSuspendSubscription = async (input: {
  subscriptionId: string;
  actorId: string;
}): Promise<Subscription> => {
  const subscription = await requireSubscription(input.subscriptionId);
  if (!isLiveStatus(subscription.status)) {
    throw new BackOfficeError(
      "Only an active subscription can be suspended",
      409,
    );
  }

  const result = await updateSubscriptionStateById(subscription.id, {
    status: "SUSPENDED",
    cancelAtPeriodEnd: false,
  });
  if (!result) {
    throw new BackOfficeError("Subscription not found", 404);
  }

  await recordSubscriptionEvent({
    organizationId: subscription.organizationId,
    subscriptionId: subscription.id,
    type: subscriptionEventTypes.statusChanged,
    provider: subscription.provider,
    payload: {
      previousStatus: subscription.status,
      status: "SUSPENDED",
      manual: true,
      actorId: input.actorId,
    },
  });

  await auditSubscription({
    actorId: input.actorId,
    organizationId: subscription.organizationId,
    subscriptionId: subscription.id,
    action: "UPDATE",
    metadata: {
      operation: "suspend",
      previousStatus: subscription.status,
      status: "SUSPENDED",
    },
  });

  return result.subscription;
};

export const adminExtendSubscription = async (
  input: { subscriptionId: string; actorId: string } & AdminExtendInput,
): Promise<Subscription> => {
  const subscription = await requireSubscription(input.subscriptionId);
  if (!isLiveStatus(subscription.status)) {
    throw new BackOfficeError(
      "Only an active subscription can be extended",
      409,
    );
  }

  const now = new Date();
  const base =
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd.getTime() > now.getTime()
      ? subscription.currentPeriodEnd
      : now;
  const currentPeriodEnd = addDays(base, input.days);

  const result = await updateSubscriptionStateById(subscription.id, {
    currentPeriodEnd,
    ...(subscription.currentPeriodStart ? {} : { currentPeriodStart: now }),
  });
  if (!result) {
    throw new BackOfficeError("Subscription not found", 404);
  }

  await recordSubscriptionEvent({
    organizationId: subscription.organizationId,
    subscriptionId: subscription.id,
    type: subscriptionEventTypes.periodExtended,
    provider: subscription.provider,
    payload: {
      days: input.days,
      previousPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      actorId: input.actorId,
    },
  });

  await auditSubscription({
    actorId: input.actorId,
    organizationId: subscription.organizationId,
    subscriptionId: subscription.id,
    action: "UPDATE",
    metadata: {
      operation: "extend",
      days: input.days,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    },
  });

  return result.subscription;
};

export const adminCancelSubscription = async (
  input: { subscriptionId: string; actorId: string } & AdminCancelInput,
): Promise<Subscription> => {
  const subscription = await requireSubscription(input.subscriptionId);
  if (!isLiveStatus(subscription.status)) {
    throw new BackOfficeError("No active subscription to cancel", 409);
  }
  if (input.atPeriodEnd) {
    if (!subscription.currentPeriodEnd) {
      throw new BackOfficeError(
        "Subscription has no billing period to cancel at the end of",
        400,
      );
    }
    if (subscription.cancelAtPeriodEnd) {
      throw new BackOfficeError("Cancellation is already scheduled", 409);
    }
  }

  const canceled = await cancelSubscription({
    organizationId: subscription.organizationId,
    atPeriodEnd: input.atPeriodEnd,
  });

  await auditSubscription({
    actorId: input.actorId,
    organizationId: subscription.organizationId,
    subscriptionId: subscription.id,
    action: "UPDATE",
    metadata: {
      operation: "cancel",
      atPeriodEnd: input.atPeriodEnd,
      status: canceled.status,
    },
  });

  return canceled;
};

const resolveAdminInterval = (
  plan: {
    amountMinor: number;
    amountMinorYearly: number | null;
    interval: SubscriptionInterval | null;
  },
  requested: SubscriptionInterval | undefined,
  fallback: SubscriptionInterval | null,
): SubscriptionInterval | null => {
  const isAvailable = (interval: SubscriptionInterval): boolean =>
    interval === "MONTHLY"
      ? plan.amountMinor > 0
      : (plan.amountMinorYearly ?? 0) > 0;

  if (requested) {
    if (!isAvailable(requested)) {
      throw new BackOfficeError(
        "Unsupported billing interval for this plan",
        400,
      );
    }
    return requested;
  }

  if (plan.amountMinor <= 0 && (plan.amountMinorYearly ?? 0) <= 0) {
    return null;
  }

  if (fallback && isAvailable(fallback)) return fallback;
  if (plan.amountMinor > 0) return "MONTHLY";
  return "YEARLY";
};

export const adminChangeSubscriptionPlan = async (
  input: {
    subscriptionId: string;
    actorId: string;
  } & AdminChangePlanInput,
): Promise<SubscriptionWithPlan> => {
  const subscription = await requireSubscription(input.subscriptionId);
  if (!isLiveStatus(subscription.status)) {
    throw new BackOfficeError(
      "Only an active subscription can change plans",
      409,
    );
  }

  const plan = await findSubscriptionPlanByCode(input.planCode);
  if (!plan) {
    throw new BackOfficeError("Plan not found", 404);
  }
  if (plan.active === false) {
    throw new BackOfficeError("Plan is not available", 400);
  }

  const interval = resolveAdminInterval(
    plan,
    input.interval,
    subscription.interval,
  );
  if (subscription.planId === plan.id && interval === subscription.interval) {
    throw new BackOfficeError("Already subscribed to this plan", 409);
  }

  const { subscription: changed } = await changeSubscriptionPlan({
    organizationId: subscription.organizationId,
    planCode: plan.code,
    interval,
  });

  await auditSubscription({
    actorId: input.actorId,
    organizationId: subscription.organizationId,
    subscriptionId: subscription.id,
    action: "UPDATE",
    metadata: {
      operation: "change_plan",
      planCode: plan.code,
      interval,
      previousPlanId: subscription.planId,
      previousStatus: subscription.status,
    },
  });

  return changed;
};

export const adminAddNote = async (input: {
  organizationId: string;
  actorId: string;
  subscriptionId?: string | null;
  body: string;
}) => {
  const organization = await getOrganizationById(input.organizationId);
  if (!organization) {
    throw new BackOfficeError("Organization not found", 404);
  }

  if (input.subscriptionId) {
    const subscription = await findSubscriptionById(input.subscriptionId);
    if (!subscription || subscription.organizationId !== organization.id) {
      throw new BackOfficeError("Subscription not found", 404);
    }
  }

  const note = await insertSubscriptionAdminNote({
    organizationId: organization.id,
    subscriptionId: input.subscriptionId ?? null,
    authorId: input.actorId,
    body: input.body,
  });

  await logAudit({
    organizationId: organization.id,
    actorId: input.actorId,
    action: "CREATE",
    entity: "SUBSCRIPTION",
    entityId: input.subscriptionId ?? organization.id,
    metadata: { noteId: note.id, kind: "admin_note" },
  });

  return note;
};

export const listAdminNotes = async (organizationId: string) => {
  return await findSubscriptionAdminNotesByOrganization(organizationId);
};
