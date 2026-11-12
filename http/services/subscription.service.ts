"server only";

import { z } from "zod";
import {
  type CancelSubscriptionInput,
  type ChangeSubscriptionPlanInput,
  cancelSubscriptionSchema,
  changeSubscriptionPlanSchema,
  type EnsureSubscriptionInput,
  ensureSubscriptionSchema,
  type LiveSubscriptionStatus,
  type RecordSubscriptionEventInput,
  type RecordSubscriptionPaymentInput,
  recordSubscriptionEventSchema,
  recordSubscriptionPaymentSchema,
  type SetSubscriptionStatusInput,
  type Subscription,
  type SubscriptionEvent,
  type SubscriptionEventType,
  type SubscriptionInterval,
  type SubscriptionPayment,
  type SubscriptionPlan,
  type SubscriptionPlanCode,
  type SubscriptionWithPlan,
  setSubscriptionStatusSchema,
  subscriptionEventTypes,
} from "@/http/models/subscription.model";
import {
  ensureLiveSubscription,
  findLatestSubscriptionByOrganizationId,
  findLiveSubscriptionWithPlan,
  findSubscriptionById,
  findSubscriptionPlanByCode,
  findSubscriptionPlans,
  insertSubscriptionEvent,
  insertSubscriptionPayment,
  replaceLiveSubscription,
  updateSubscriptionState,
} from "@/http/repositories/subscription.repository";

export class SubscriptionPlanNotFoundError extends Error {
  constructor(planCode: string) {
    super(`Subscription plan not found: ${planCode}`);
    this.name = "SubscriptionPlanNotFoundError";
  }
}

export class SubscriptionNotFoundError extends Error {
  constructor(subscriptionId: string) {
    super(`Subscription not found: ${subscriptionId}`);
    this.name = "SubscriptionNotFoundError";
  }
}

export class NoLiveSubscriptionError extends Error {
  constructor(organizationId: string) {
    super(`No subscription found for organization: ${organizationId}`);
    this.name = "NoLiveSubscriptionError";
  }
}

type SubscriptionFields = {
  organizationId: string;
  status?: LiveSubscriptionStatus;
  interval?: SubscriptionInterval | null;
  provider?: string;
  providerSubscriptionId?: string | null;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
};

const buildSubscriptionValues = (
  fields: SubscriptionFields,
  plan: SubscriptionPlan,
) => {
  const interval =
    fields.interval !== undefined ? fields.interval : plan.interval;
  const amountMinor =
    interval === "YEARLY"
      ? (plan.amountMinorYearly ?? plan.amountMinor)
      : plan.amountMinor;

  return {
    organizationId: fields.organizationId,
    planId: plan.id,
    status: fields.status ?? "ACTIVE",
    interval,
    amountMinor,
    currency: plan.currency,
    provider: fields.provider ?? "internal",
    providerSubscriptionId: fields.providerSubscriptionId ?? null,
    trialEndsAt: fields.trialEndsAt ?? null,
    currentPeriodStart: fields.currentPeriodStart ?? null,
    currentPeriodEnd: fields.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: fields.cancelAtPeriodEnd ?? false,
  };
};

const getPlanOrThrow = async (
  planCode: SubscriptionPlanCode,
): Promise<SubscriptionPlan> => {
  const plan = await findSubscriptionPlanByCode(planCode);
  if (!plan) {
    throw new SubscriptionPlanNotFoundError(planCode);
  }
  return plan;
};

export const recordSubscriptionEvent = async (
  input: RecordSubscriptionEventInput,
): Promise<{ event: SubscriptionEvent; created: boolean }> => {
  const parsed = recordSubscriptionEventSchema.parse(input);

  const { row, created } = await insertSubscriptionEvent({
    organizationId: parsed.organizationId,
    subscriptionId: parsed.subscriptionId ?? null,
    type: parsed.type,
    provider: parsed.provider,
    providerEventId: parsed.providerEventId ?? null,
    payload: JSON.stringify(parsed.payload),
  });

  return { event: row, created };
};

const recordEvent = async (input: {
  organizationId: string;
  subscriptionId: string | null;
  type: SubscriptionEventType;
  provider?: string;
  payload?: Record<string, unknown>;
}): Promise<void> => {
  await recordSubscriptionEvent({
    organizationId: input.organizationId,
    subscriptionId: input.subscriptionId,
    type: input.type,
    provider: input.provider ?? "internal",
    payload: input.payload ?? {},
  });
};

export const recordSubscriptionPayment = async (
  input: RecordSubscriptionPaymentInput,
): Promise<{ payment: SubscriptionPayment; created: boolean }> => {
  const parsed = recordSubscriptionPaymentSchema.parse(input);

  const subscription = await findSubscriptionById(parsed.subscriptionId);
  if (!subscription) {
    throw new SubscriptionNotFoundError(parsed.subscriptionId);
  }
  if (subscription.organizationId !== parsed.organizationId) {
    throw new Error("Subscription does not belong to the organization");
  }

  const { row, created } = await insertSubscriptionPayment({
    organizationId: parsed.organizationId,
    subscriptionId: parsed.subscriptionId,
    planId: subscription.planId,
    status: parsed.status,
    amountMinor: parsed.amountMinor,
    currency: parsed.currency,
    provider: parsed.provider,
    providerPaymentId: parsed.providerPaymentId ?? null,
    paidAt: parsed.paidAt ?? null,
    failureReason: parsed.failureReason ?? null,
  });

  if (created) {
    await recordEvent({
      organizationId: parsed.organizationId,
      subscriptionId: parsed.subscriptionId,
      type: subscriptionEventTypes.paymentRecorded,
      provider: parsed.provider,
      payload: {
        paymentId: row.id,
        status: row.status,
        amountMinor: row.amountMinor,
        providerPaymentId: row.providerPaymentId,
      },
    });
  }

  return { payment: row, created };
};

export const listSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  return await findSubscriptionPlans();
};

export const getOrganizationSubscription = async (
  organizationId: string,
): Promise<SubscriptionWithPlan | null> => {
  const id = z.uuid().parse(organizationId);
  return await findLiveSubscriptionWithPlan(id);
};

export const ensureOrganizationSubscription = async (
  input: EnsureSubscriptionInput,
): Promise<{ subscription: SubscriptionWithPlan; created: boolean }> => {
  const parsed = ensureSubscriptionSchema.parse(input);
  const plan = await getPlanOrThrow(parsed.planCode);

  const { row, created } = await ensureLiveSubscription(
    buildSubscriptionValues(parsed, plan),
  );

  if (created) {
    await recordEvent({
      organizationId: parsed.organizationId,
      subscriptionId: row.id,
      type: subscriptionEventTypes.created,
      provider: parsed.provider ?? "internal",
      payload: { planCode: plan.code, status: row.status },
    });
  }

  return { subscription: { ...row, plan }, created };
};

export const changeSubscriptionPlan = async (
  input: ChangeSubscriptionPlanInput,
): Promise<{
  subscription: SubscriptionWithPlan;
  previous: Subscription | null;
  changed: boolean;
}> => {
  const parsed = changeSubscriptionPlanSchema.parse(input);
  const plan = await getPlanOrThrow(parsed.planCode);

  const result = await replaceLiveSubscription(
    buildSubscriptionValues(parsed, plan),
  );

  if (result.changed) {
    await recordEvent({
      organizationId: parsed.organizationId,
      subscriptionId: result.subscription.id,
      type: result.previous
        ? subscriptionEventTypes.planChanged
        : subscriptionEventTypes.created,
      provider: result.subscription.provider,
      payload: {
        planCode: plan.code,
        previousPlanId: result.previous?.planId ?? null,
        previousStatus: result.previous?.status ?? null,
      },
    });
  }

  return {
    subscription: { ...result.subscription, plan },
    previous: result.previous,
    changed: result.changed,
  };
};

export const cancelSubscription = async (
  input: CancelSubscriptionInput,
): Promise<Subscription> => {
  const parsed = cancelSubscriptionSchema.parse(input);

  const result = await updateSubscriptionState(
    parsed.organizationId,
    parsed.atPeriodEnd
      ? { cancelAtPeriodEnd: true }
      : {
          status: "CANCELED",
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
        },
  );
  if (!result) {
    throw new NoLiveSubscriptionError(parsed.organizationId);
  }

  await recordEvent({
    organizationId: parsed.organizationId,
    subscriptionId: result.subscription.id,
    type: subscriptionEventTypes.canceled,
    provider: result.subscription.provider,
    payload: {
      atPeriodEnd: parsed.atPeriodEnd ?? false,
      previousStatus: result.previous.status,
      status: result.subscription.status,
    },
  });

  return result.subscription;
};

export const setSubscriptionStatus = async (
  input: SetSubscriptionStatusInput,
): Promise<Subscription> => {
  const parsed = setSubscriptionStatusSchema.parse(input);

  const current = await findLatestSubscriptionByOrganizationId(
    parsed.organizationId,
  );
  if (!current) {
    throw new NoLiveSubscriptionError(parsed.organizationId);
  }

  const changesStatus = current.status !== parsed.status;
  const updatesRequested =
    parsed.trialEndsAt !== undefined ||
    parsed.currentPeriodStart !== undefined ||
    parsed.currentPeriodEnd !== undefined ||
    parsed.providerSubscriptionId !== undefined ||
    parsed.cancelAtPeriodEnd !== undefined;

  if (!changesStatus && !updatesRequested) {
    return current;
  }

  const terminal = parsed.status === "CANCELED" || parsed.status === "EXPIRED";

  const patch = {
    status: parsed.status,
    ...(changesStatus ? { canceledAt: terminal ? new Date() : null } : {}),
    ...(parsed.cancelAtPeriodEnd !== undefined
      ? { cancelAtPeriodEnd: parsed.cancelAtPeriodEnd }
      : {}),
    ...(parsed.providerSubscriptionId !== undefined
      ? { providerSubscriptionId: parsed.providerSubscriptionId }
      : {}),
    ...(parsed.trialEndsAt !== undefined
      ? { trialEndsAt: parsed.trialEndsAt }
      : {}),
    ...(parsed.currentPeriodStart !== undefined
      ? { currentPeriodStart: parsed.currentPeriodStart }
      : {}),
    ...(parsed.currentPeriodEnd !== undefined
      ? { currentPeriodEnd: parsed.currentPeriodEnd }
      : {}),
  };

  const result = await updateSubscriptionState(parsed.organizationId, patch);
  if (!result) {
    throw new NoLiveSubscriptionError(parsed.organizationId);
  }

  if (changesStatus) {
    await recordEvent({
      organizationId: parsed.organizationId,
      subscriptionId: result.subscription.id,
      type: subscriptionEventTypes.statusChanged,
      provider: result.subscription.provider,
      payload: {
        previousStatus: result.previous.status,
        status: result.subscription.status,
      },
    });
  }

  return result.subscription;
};
