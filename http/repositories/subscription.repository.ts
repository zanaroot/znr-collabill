"server only";

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  subscriptionAdminNotes,
  subscriptionEvents,
  subscriptionPayments,
  subscriptionPlans,
  subscriptions,
} from "@/db/schema/subscription";
import { users } from "@/db/schema/user";
import type {
  LiveSubscriptionStatus,
  SubscriptionInterval,
  SubscriptionPlanCode,
  SubscriptionWithPlan,
} from "@/http/models/subscription.model";
import { liveSubscriptionStatuses } from "@/http/models/subscription.model";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type LiveSubscriptionValues = {
  organizationId: string;
  planId: string;
  status: LiveSubscriptionStatus;
  interval: SubscriptionInterval | null;
  amountMinor: number;
  currency: string;
  provider: string;
  providerSubscriptionId: string | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

type ReplaceLiveSubscriptionResult = {
  previous: typeof subscriptions.$inferSelect | null;
  subscription: typeof subscriptions.$inferSelect;
  changed: boolean;
};

type UpsertSubscriptionResult<T> = {
  row: T;
  created: boolean;
};

export const acquireSubscriptionLock = async (
  tx: Transaction,
  organizationId: string,
) => {
  const lockKey = `subscription:${organizationId}`;
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
  );
};

export const findLiveSubscriptionInTx = async (
  tx: Transaction,
  organizationId: string,
) => {
  const [subscription] = await tx
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        inArray(subscriptions.status, [...liveSubscriptionStatuses]),
      ),
    )
    .limit(1);
  return subscription ?? null;
};

export const findLatestSubscriptionInTx = async (
  tx: Transaction,
  organizationId: string,
) => {
  const [subscription] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return subscription ?? null;
};

export const findSubscriptionPlans = async () => {
  return await db
    .select()
    .from(subscriptionPlans)
    .orderBy(asc(subscriptionPlans.amountMinor));
};

export const findSubscriptionPlanByCode = async (
  code: SubscriptionPlanCode,
) => {
  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.code, code))
    .limit(1);
  return plan ?? null;
};

export const findAllSubscriptionPlans = async () => {
  return await db
    .select()
    .from(subscriptionPlans)
    .orderBy(desc(subscriptionPlans.createdAt));
};

export const countSubscriptionsByPlan = async () => {
  const rows = await db
    .select({ planId: subscriptions.planId, value: count() })
    .from(subscriptions)
    .groupBy(subscriptions.planId);
  return new Map(rows.map((row) => [row.planId, row.value]));
};

export const insertSubscriptionPlan = async (
  input: Omit<
    typeof subscriptionPlans.$inferInsert,
    "id" | "createdAt" | "updatedAt"
  >,
) => {
  const [created] = await db
    .insert(subscriptionPlans)
    .values(input)
    .returning();
  if (!created) {
    throw new Error("Failed to create subscription plan");
  }
  return created;
};

export const updateSubscriptionPlan = async (
  id: string,
  patch: Partial<typeof subscriptionPlans.$inferInsert>,
) => {
  const [updated] = await db
    .update(subscriptionPlans)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(subscriptionPlans.id, id))
    .returning();
  return updated ?? null;
};

export const findSubscriptionPlanById = async (id: string) => {
  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, id))
    .limit(1);
  return plan ?? null;
};

export const findSubscriptionPlanByCodeInTx = async (
  tx: Transaction,
  code: SubscriptionPlanCode,
) => {
  const [plan] = await tx
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.code, code))
    .limit(1);
  return plan ?? null;
};

export const findLiveSubscriptionWithPlanInTx = async (
  tx: Transaction,
  organizationId: string,
): Promise<SubscriptionWithPlan | null> => {
  const [row] = await tx
    .select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(subscriptions.planId, subscriptionPlans.id),
    )
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        inArray(subscriptions.status, [...liveSubscriptionStatuses]),
      ),
    )
    .limit(1);

  if (!row) return null;

  return { ...row.subscription, plan: row.plan };
};

export const findPendingPaymentByOrganizationId = async (
  organizationId: string,
) => {
  const [row] = await db
    .select({ payment: subscriptionPayments })
    .from(subscriptionPayments)
    .where(
      and(
        eq(subscriptionPayments.organizationId, organizationId),
        eq(subscriptionPayments.status, "PENDING"),
      ),
    )
    .orderBy(desc(subscriptionPayments.createdAt))
    .limit(1);
  return row?.payment ?? null;
};

export const findPaymentsByOrganizationId = async (organizationId: string) => {
  return await db
    .select({
      id: subscriptionPayments.id,
      planId: subscriptionPayments.planId,
      planCode: subscriptionPlans.code,
      status: subscriptionPayments.status,
      amountMinor: subscriptionPayments.amountMinor,
      currency: subscriptionPayments.currency,
      provider: subscriptionPayments.provider,
      providerPaymentId: subscriptionPayments.providerPaymentId,
      paidAt: subscriptionPayments.paidAt,
      failureReason: subscriptionPayments.failureReason,
      createdAt: subscriptionPayments.createdAt,
      updatedAt: subscriptionPayments.updatedAt,
    })
    .from(subscriptionPayments)
    .innerJoin(
      subscriptionPlans,
      eq(subscriptionPayments.planId, subscriptionPlans.id),
    )
    .where(eq(subscriptionPayments.organizationId, organizationId))
    .orderBy(desc(subscriptionPayments.createdAt));
};

export const findSubscriptionById = async (id: string) => {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  return subscription ?? null;
};

export const findLatestSubscriptionByOrganizationId = async (
  organizationId: string,
) => {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return subscription ?? null;
};

export const findLiveSubscriptionWithPlan = async (
  organizationId: string,
): Promise<SubscriptionWithPlan | null> => {
  const [row] = await db
    .select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(subscriptions.planId, subscriptionPlans.id),
    )
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        inArray(subscriptions.status, [...liveSubscriptionStatuses]),
      ),
    )
    .limit(1);

  if (!row) return null;

  return { ...row.subscription, plan: row.plan };
};

export const ensureLiveSubscription = async (
  input: LiveSubscriptionValues,
): Promise<UpsertSubscriptionResult<typeof subscriptions.$inferSelect>> => {
  return await db.transaction(async (tx) => {
    await acquireSubscriptionLock(tx, input.organizationId);

    const existing = await findLiveSubscriptionInTx(tx, input.organizationId);
    if (existing) {
      return { row: existing, created: false };
    }

    const [created] = await tx.insert(subscriptions).values(input).returning();
    if (!created) {
      throw new Error("Failed to create subscription");
    }

    return { row: created, created: true };
  });
};

export const replaceLiveSubscription = async (
  input: LiveSubscriptionValues,
): Promise<ReplaceLiveSubscriptionResult> => {
  return await db.transaction(async (tx) => {
    await acquireSubscriptionLock(tx, input.organizationId);

    const existing = await findLiveSubscriptionInTx(tx, input.organizationId);

    if (
      existing &&
      existing.planId === input.planId &&
      existing.providerSubscriptionId === input.providerSubscriptionId &&
      existing.interval === input.interval
    ) {
      return { previous: existing, subscription: existing, changed: false };
    }

    if (existing) {
      await tx
        .update(subscriptions)
        .set({
          status: "CANCELED",
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existing.id));
    }

    const [created] = await tx.insert(subscriptions).values(input).returning();
    if (!created) {
      throw new Error("Failed to create subscription");
    }

    return { previous: existing, subscription: created, changed: true };
  });
};

export const updateSubscriptionState = async (
  organizationId: string,
  patch: Partial<typeof subscriptions.$inferInsert>,
): Promise<{
  previous: typeof subscriptions.$inferSelect;
  subscription: typeof subscriptions.$inferSelect;
} | null> => {
  return await db.transaction(async (tx) => {
    await acquireSubscriptionLock(tx, organizationId);

    const live = await findLiveSubscriptionInTx(tx, organizationId);
    const target =
      live ?? (await findLatestSubscriptionInTx(tx, organizationId));
    if (!target) return null;

    const [updated] = await tx
      .update(subscriptions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(subscriptions.id, target.id))
      .returning();
    if (!updated) {
      throw new Error("Failed to update subscription");
    }

    return { previous: target, subscription: updated };
  });
};

export const updateSubscriptionStateById = async (
  subscriptionId: string,
  patch: Partial<typeof subscriptions.$inferInsert>,
): Promise<{
  previous: typeof subscriptions.$inferSelect;
  subscription: typeof subscriptions.$inferSelect;
} | null> => {
  return await db.transaction(async (tx) => {
    const [peek] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);
    if (!peek) return null;

    await acquireSubscriptionLock(tx, peek.organizationId);

    const [target] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .for("update")
      .limit(1);
    if (!target) return null;

    const [updated] = await tx
      .update(subscriptions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();
    if (!updated) {
      throw new Error("Failed to update subscription");
    }

    return { previous: target, subscription: updated };
  });
};

export const insertSubscriptionAdminNote = async (
  input: Omit<typeof subscriptionAdminNotes.$inferInsert, "id" | "createdAt">,
) => {
  const [created] = await db
    .insert(subscriptionAdminNotes)
    .values(input)
    .returning();
  if (!created) {
    throw new Error("Failed to create subscription note");
  }
  return created;
};

export const findSubscriptionAdminNotesByOrganization = async (
  organizationId: string,
) => {
  return await db
    .select({
      id: subscriptionAdminNotes.id,
      organizationId: subscriptionAdminNotes.organizationId,
      subscriptionId: subscriptionAdminNotes.subscriptionId,
      authorId: subscriptionAdminNotes.authorId,
      body: subscriptionAdminNotes.body,
      createdAt: subscriptionAdminNotes.createdAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(subscriptionAdminNotes)
    .leftJoin(users, eq(subscriptionAdminNotes.authorId, users.id))
    .where(eq(subscriptionAdminNotes.organizationId, organizationId))
    .orderBy(desc(subscriptionAdminNotes.createdAt));
};

export const insertSubscriptionPayment = async (
  input: Omit<
    typeof subscriptionPayments.$inferInsert,
    "id" | "createdAt" | "updatedAt"
  >,
): Promise<
  UpsertSubscriptionResult<typeof subscriptionPayments.$inferSelect>
> => {
  if (input.providerPaymentId) {
    const [inserted] = await db
      .insert(subscriptionPayments)
      .values(input)
      .onConflictDoNothing({ target: subscriptionPayments.providerPaymentId })
      .returning();
    if (inserted) return { row: inserted, created: true };

    const [existing] = await db
      .select()
      .from(subscriptionPayments)
      .where(
        eq(subscriptionPayments.providerPaymentId, input.providerPaymentId),
      )
      .limit(1);
    if (!existing) {
      throw new Error("Failed to record subscription payment");
    }
    return { row: existing, created: false };
  }

  const [inserted] = await db
    .insert(subscriptionPayments)
    .values(input)
    .returning();
  if (!inserted) {
    throw new Error("Failed to record subscription payment");
  }
  return { row: inserted, created: true };
};

export const insertSubscriptionEvent = async (
  input: Omit<typeof subscriptionEvents.$inferInsert, "id" | "createdAt">,
): Promise<
  UpsertSubscriptionResult<typeof subscriptionEvents.$inferSelect>
> => {
  if (input.providerEventId) {
    const [inserted] = await db
      .insert(subscriptionEvents)
      .values(input)
      .onConflictDoNothing({ target: subscriptionEvents.providerEventId })
      .returning();
    if (inserted) return { row: inserted, created: true };

    const [existing] = await db
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.providerEventId, input.providerEventId))
      .limit(1);
    if (!existing) {
      throw new Error("Failed to record subscription event");
    }
    return { row: existing, created: false };
  }

  const [inserted] = await db
    .insert(subscriptionEvents)
    .values(input)
    .returning();
  if (!inserted) {
    throw new Error("Failed to record subscription event");
  }
  return { row: inserted, created: true };
};
