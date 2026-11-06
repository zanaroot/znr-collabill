"server only";

import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema/organization";
import {
  subscriptionEvents,
  subscriptionPayments,
  subscriptionPlans,
  subscriptions,
} from "@/db/schema/subscription";
import {
  classifyPaymentTransition,
  type PaymentTransitionDecision,
} from "@/http/models/payment.model";
import type {
  SubscriptionEventType,
  SubscriptionPaymentStatus,
} from "@/http/models/subscription.model";
import {
  acquireSubscriptionLock,
  findLatestSubscriptionInTx,
  findLiveSubscriptionInTx,
} from "@/http/repositories/subscription.repository";
import type { PaymentWebhookEvent } from "@/packages/payment";

type PaymentRow = typeof subscriptionPayments.$inferSelect;
type SubscriptionRow = typeof subscriptions.$inferSelect;

export type ApplyPaymentProviderEventInput = {
  provider: string;
  eventType: SubscriptionEventType;
  event: PaymentWebhookEvent;
  subscriptionPatch?: Partial<typeof subscriptions.$inferInsert>;
};

export type ApplyPaymentProviderEventResult =
  | {
      outcome: "processed";
      payment: PaymentRow;
      subscription: SubscriptionRow | null;
    }
  | { outcome: "duplicate"; payment: PaymentRow }
  | {
      outcome: "ignored";
      reason: Extract<
        PaymentTransitionDecision,
        "already_settled" | "out_of_order"
      >;
      payment: PaymentRow;
    }
  | { outcome: "unknown_payment" };

export const findSubscriptionPaymentById = async (id: string) => {
  const [payment] = await db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.id, id))
    .limit(1);
  return payment ?? null;
};

export const findSubscriptionPaymentByProviderPaymentId = async (
  providerPaymentId: string,
) => {
  const [payment] = await db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.providerPaymentId, providerPaymentId))
    .limit(1);
  return payment ?? null;
};

export type ListPaymentsAdminFilters = {
  status?: SubscriptionPaymentStatus;
  organizationId?: string;
  provider?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
};

export const listSubscriptionPaymentsAdmin = async (
  filters: ListPaymentsAdminFilters,
) => {
  const conditions = [];
  if (filters.status) {
    conditions.push(eq(subscriptionPayments.status, filters.status));
  }
  if (filters.organizationId) {
    conditions.push(
      eq(subscriptionPayments.organizationId, filters.organizationId),
    );
  }
  if (filters.provider) {
    conditions.push(eq(subscriptionPayments.provider, filters.provider));
  }
  if (filters.from) {
    conditions.push(gte(subscriptionPayments.createdAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(subscriptionPayments.createdAt, filters.to));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(subscriptionPayments)
    .where(where);

  const rows = await db
    .select({
      id: subscriptionPayments.id,
      organizationId: subscriptionPayments.organizationId,
      subscriptionId: subscriptionPayments.subscriptionId,
      planId: subscriptionPayments.planId,
      status: subscriptionPayments.status,
      amountMinor: subscriptionPayments.amountMinor,
      currency: subscriptionPayments.currency,
      provider: subscriptionPayments.provider,
      providerPaymentId: subscriptionPayments.providerPaymentId,
      paidAt: subscriptionPayments.paidAt,
      failureReason: subscriptionPayments.failureReason,
      createdAt: subscriptionPayments.createdAt,
      updatedAt: subscriptionPayments.updatedAt,
      organizationName: organizations.name,
      planCode: subscriptionPlans.code,
      planName: subscriptionPlans.name,
    })
    .from(subscriptionPayments)
    .innerJoin(
      organizations,
      eq(subscriptionPayments.organizationId, organizations.id),
    )
    .innerJoin(
      subscriptionPlans,
      eq(subscriptionPayments.planId, subscriptionPlans.id),
    )
    .where(where)
    .orderBy(desc(subscriptionPayments.createdAt))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);

  return { rows, total: totalRow?.value ?? 0 };
};

export const findSubscriptionPaymentDetailAdmin = async (paymentId: string) => {
  const [row] = await db
    .select({
      payment: subscriptionPayments,
      organization: organizations,
      plan: subscriptionPlans,
      subscription: subscriptions,
    })
    .from(subscriptionPayments)
    .innerJoin(
      organizations,
      eq(subscriptionPayments.organizationId, organizations.id),
    )
    .innerJoin(
      subscriptionPlans,
      eq(subscriptionPayments.planId, subscriptionPlans.id),
    )
    .innerJoin(
      subscriptions,
      eq(subscriptionPayments.subscriptionId, subscriptions.id),
    )
    .where(eq(subscriptionPayments.id, paymentId))
    .limit(1);

  if (!row) return null;

  const providerIdPattern = row.payment.providerPaymentId
    ? or(
        ilike(subscriptionEvents.payload, `%${row.payment.id}%`),
        ilike(subscriptionEvents.payload, `%${row.payment.providerPaymentId}%`),
      )
    : ilike(subscriptionEvents.payload, `%${row.payment.id}%`);

  const events = await db
    .select()
    .from(subscriptionEvents)
    .where(
      and(
        eq(subscriptionEvents.organizationId, row.payment.organizationId),
        providerIdPattern,
      ),
    )
    .orderBy(desc(subscriptionEvents.createdAt))
    .limit(200);

  return { ...row, events };
};

export const linkSubscriptionPaymentSession = async (
  paymentId: string,
  providerPaymentId: string,
) => {
  const [updated] = await db
    .update(subscriptionPayments)
    .set({ providerPaymentId, updatedAt: new Date() })
    .where(eq(subscriptionPayments.id, paymentId))
    .returning();
  return updated ?? null;
};

export const updateSubscriptionPayment = async (
  paymentId: string,
  patch: Partial<typeof subscriptionPayments.$inferInsert>,
) => {
  const [updated] = await db
    .update(subscriptionPayments)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(subscriptionPayments.id, paymentId))
    .returning();
  return updated ?? null;
};

const buildPaymentPatch = (
  event: PaymentWebhookEvent,
): Partial<typeof subscriptionPayments.$inferInsert> => {
  if (event.type === "payment.succeeded") {
    const occurredAt = new Date(event.occurredAt);
    return {
      status: "SUCCEEDED",
      paidAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
      failureReason: null,
    };
  }

  if (event.type === "payment.failed") {
    return {
      status: "FAILED",
      paidAt: null,
      failureReason: event.failureReason ?? "Payment failed",
    };
  }

  return { status: "REFUNDED" };
};

export const applyPaymentProviderEvent = async (
  input: ApplyPaymentProviderEventInput,
): Promise<ApplyPaymentProviderEventResult> => {
  return await db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(subscriptionPayments)
      .where(
        eq(
          subscriptionPayments.providerPaymentId,
          input.event.providerPaymentId,
        ),
      )
      .for("update")
      .limit(1);

    if (!payment) {
      return { outcome: "unknown_payment" };
    }

    await acquireSubscriptionLock(tx, payment.organizationId);

    const [insertedEvent] = await tx
      .insert(subscriptionEvents)
      .values({
        organizationId: payment.organizationId,
        subscriptionId: payment.subscriptionId,
        type: input.eventType,
        provider: input.provider,
        providerEventId: input.event.eventId,
        payload: JSON.stringify(input.event),
      })
      .onConflictDoNothing({ target: subscriptionEvents.providerEventId })
      .returning();

    if (!insertedEvent) {
      return { outcome: "duplicate", payment };
    }

    const decision = classifyPaymentTransition(
      payment.status,
      input.event.type,
    );
    if (decision !== "apply") {
      return { outcome: "ignored", reason: decision, payment };
    }

    const now = new Date();
    const [updatedPayment] = await tx
      .update(subscriptionPayments)
      .set({ ...buildPaymentPatch(input.event), updatedAt: now })
      .where(eq(subscriptionPayments.id, payment.id))
      .returning();

    if (!updatedPayment) {
      throw new Error("Failed to update subscription payment");
    }

    let updatedSubscription: SubscriptionRow | null = null;
    if (input.event.type === "payment.succeeded" && input.subscriptionPatch) {
      const live = await findLiveSubscriptionInTx(tx, payment.organizationId);
      const paymentSubscription = live
        ? null
        : ((
            await tx
              .select()
              .from(subscriptions)
              .where(eq(subscriptions.id, payment.subscriptionId))
              .limit(1)
          )[0] ?? null);
      const target =
        live ??
        paymentSubscription ??
        (await findLatestSubscriptionInTx(tx, payment.organizationId));

      if (target) {
        const [updated] = await tx
          .update(subscriptions)
          .set({ ...input.subscriptionPatch, updatedAt: now })
          .where(eq(subscriptions.id, target.id))
          .returning();
        updatedSubscription = updated ?? null;
      }
    }

    return {
      outcome: "processed",
      payment: updatedPayment,
      subscription: updatedSubscription,
    };
  });
};
