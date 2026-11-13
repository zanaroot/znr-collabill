"server only";

import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { organizationMembers, organizations } from "@/db/schema/organization";
import {
  subscriptionEvents,
  subscriptionPayments,
  subscriptionPlans,
  subscriptions,
} from "@/db/schema/subscription";
import { users } from "@/db/schema/user";
import type { SubscriptionStatus } from "@/http/models/subscription.model";
import { liveSubscriptionStatuses } from "@/http/models/subscription.model";

export type ListOrganizationsAdminFilters = {
  search?: string;
  planCode?: string;
  status?: SubscriptionStatus;
  page: number;
  pageSize: number;
};

const buildLatestSubscriptionRank = () =>
  db
    .select({
      organizationId: subscriptions.organizationId,
      id: subscriptions.id,
      status: subscriptions.status,
      interval: subscriptions.interval,
      amountMinor: subscriptions.amountMinor,
      currency: subscriptions.currency,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      canceledAt: subscriptions.canceledAt,
      planCode: subscriptionPlans.code,
      planName: subscriptionPlans.name,
      rn: sql<number>`row_number() over (partition by ${subscriptions.organizationId} order by ${subscriptions.createdAt} desc, ${subscriptions.id} desc)`.as(
        "subscription_rn",
      ),
    })
    .from(subscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(subscriptions.planId, subscriptionPlans.id),
    )
    .as("latest_subscription_rank");

const buildLatestPaymentRank = () =>
  db
    .select({
      organizationId: subscriptionPayments.organizationId,
      status: subscriptionPayments.status,
      rn: sql<number>`row_number() over (partition by ${subscriptionPayments.organizationId} order by ${subscriptionPayments.createdAt} desc, ${subscriptionPayments.id} desc)`.as(
        "payment_rn",
      ),
    })
    .from(subscriptionPayments)
    .as("latest_payment_rank");

const buildOrganizationAdminQuery = () => {
  const latestSubscriptionRank = buildLatestSubscriptionRank();
  const latestPaymentRank = buildLatestPaymentRank();

  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
      paymentExempt: organizations.paymentExempt,
      ownerName: users.name,
      ownerEmail: users.email,
      subscriptionId: latestSubscriptionRank.id,
      planCode: latestSubscriptionRank.planCode,
      planName: latestSubscriptionRank.planName,
      status: latestSubscriptionRank.status,
      interval: latestSubscriptionRank.interval,
      currentPeriodStart: latestSubscriptionRank.currentPeriodStart,
      currentPeriodEnd: latestSubscriptionRank.currentPeriodEnd,
      cancelAtPeriodEnd: latestSubscriptionRank.cancelAtPeriodEnd,
      canceledAt: latestSubscriptionRank.canceledAt,
      latestPaymentStatus: latestPaymentRank.status,
    })
    .from(organizations)
    .leftJoin(
      latestSubscriptionRank,
      and(
        eq(organizations.id, latestSubscriptionRank.organizationId),
        sql`${latestSubscriptionRank.rn} = 1`,
      ),
    )
    .leftJoin(
      latestPaymentRank,
      and(
        eq(organizations.id, latestPaymentRank.organizationId),
        sql`${latestPaymentRank.rn} = 1`,
      ),
    )
    .leftJoin(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, organizations.id),
        eq(organizationMembers.role, "OWNER"),
      ),
    )
    .leftJoin(users, eq(organizationMembers.userId, users.id));
};

const buildOrganizationAdminWhere = (
  filters: ListOrganizationsAdminFilters,
  latestSubscriptionRank: ReturnType<typeof buildLatestSubscriptionRank>,
) => {
  const conditions = [];
  if (filters.search) {
    conditions.push(ilike(organizations.name, `%${filters.search}%`));
  }
  if (filters.planCode) {
    conditions.push(
      filters.planCode === "FREE"
        ? or(
            sql`${latestSubscriptionRank.id} is null`,
            eq(latestSubscriptionRank.planCode, "FREE"),
          )
        : eq(latestSubscriptionRank.planCode, filters.planCode),
    );
  }
  if (filters.status) {
    conditions.push(eq(latestSubscriptionRank.status, filters.status));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
};

export const getBillingOverview = async () => {
  const [orgCountRow] = await db.select({ value: count() }).from(organizations);

  const liveRows = await db
    .selectDistinct({ organizationId: subscriptions.organizationId })
    .from(subscriptions)
    .where(inArray(subscriptions.status, [...liveSubscriptionStatuses]));

  const paidRows = await db
    .selectDistinct({ organizationId: subscriptions.organizationId })
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.status, [...liveSubscriptionStatuses]),
        sql`${subscriptions.amountMinor} > 0`,
      ),
    );
  const paidOrganizations = paidRows.length;

  const latestStatusRank = db
    .select({
      organizationId: subscriptions.organizationId,
      status: subscriptions.status,
      rn: sql<number>`row_number() over (partition by ${subscriptions.organizationId} order by ${subscriptions.createdAt} desc, ${subscriptions.id} desc)`.as(
        "status_rn",
      ),
    })
    .from(subscriptions)
    .as("latest_status_rank");

  const statusRows = await db
    .select({ status: latestStatusRank.status, value: count() })
    .from(latestStatusRank)
    .where(sql`${latestStatusRank.rn} = 1`)
    .groupBy(latestStatusRank.status);

  const revenueRows = await db
    .select({
      currency: subscriptions.currency,
      mrr: sql<string>`coalesce(sum(case when ${subscriptions.interval} = 'YEARLY' then ${subscriptions.amountMinor} / 12.0 else ${subscriptions.amountMinor} end), 0)`,
      arr: sql<string>`coalesce(sum(case when ${subscriptions.interval} = 'YEARLY' then ${subscriptions.amountMinor} else ${subscriptions.amountMinor} * 12 end), 0)`,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.status, [...liveSubscriptionStatuses]))
    .groupBy(subscriptions.currency);

  const recentPayments = await db
    .select({
      id: subscriptionPayments.id,
      organizationId: subscriptionPayments.organizationId,
      organizationName: organizations.name,
      status: subscriptionPayments.status,
      amountMinor: subscriptionPayments.amountMinor,
      currency: subscriptionPayments.currency,
      provider: subscriptionPayments.provider,
      planCode: subscriptionPlans.code,
      createdAt: subscriptionPayments.createdAt,
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
    .orderBy(desc(subscriptionPayments.createdAt))
    .limit(10);

  const recentEvents = await db
    .select({
      id: subscriptionEvents.id,
      organizationId: subscriptionEvents.organizationId,
      organizationName: organizations.name,
      subscriptionId: subscriptionEvents.subscriptionId,
      type: subscriptionEvents.type,
      provider: subscriptionEvents.provider,
      payload: subscriptionEvents.payload,
      createdAt: subscriptionEvents.createdAt,
    })
    .from(subscriptionEvents)
    .innerJoin(
      organizations,
      eq(subscriptionEvents.organizationId, organizations.id),
    )
    .orderBy(desc(subscriptionEvents.createdAt))
    .limit(10);

  const totalOrganizations = orgCountRow?.value ?? 0;
  const statuses: Record<SubscriptionStatus, number> = {
    TRIALING: 0,
    ACTIVE: 0,
    PAST_DUE: 0,
    SUSPENDED: 0,
    CANCELED: 0,
    EXPIRED: 0,
  };
  for (const row of statusRows) {
    statuses[row.status as SubscriptionStatus] = row.value;
  }

  return {
    totalOrganizations,
    organizationsWithLiveSubscription: liveRows.length,
    organizationsOnPaidPlan: paidOrganizations,
    organizationsOnFreePlan: Math.max(
      0,
      totalOrganizations - paidOrganizations,
    ),
    subscriptionsByStatus: statuses,
    revenueByCurrency: revenueRows.map((row) => ({
      currency: row.currency,
      mrrMinor: Math.round(Number(row.mrr)),
      arrMinor: Math.round(Number(row.arr)),
    })),
    recentPayments,
    recentEvents,
  };
};

export const listOrganizationsAdmin = async (
  filters: ListOrganizationsAdminFilters,
) => {
  const latestSubscriptionRank = buildLatestSubscriptionRank();
  const where = buildOrganizationAdminWhere(filters, latestSubscriptionRank);

  const [totalRow] = await db
    .select({ value: count() })
    .from(organizations)
    .leftJoin(
      latestSubscriptionRank,
      and(
        eq(organizations.id, latestSubscriptionRank.organizationId),
        sql`${latestSubscriptionRank.rn} = 1`,
      ),
    )
    .where(where);

  const rows = await buildOrganizationAdminQuery()
    .where(where)
    .orderBy(desc(organizations.createdAt))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);

  return { rows, total: totalRow?.value ?? 0 };
};

export const getOrganizationBillingDetail = async (organizationId: string) => {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!organization) return null;

  const [ownerRow] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.role, "OWNER"),
      ),
    )
    .limit(1);

  const [memberCountRow] = await db
    .select({ value: count() })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));

  const subscriptionRows = await db
    .select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(subscriptions.planId, subscriptionPlans.id),
    )
    .where(eq(subscriptions.organizationId, organizationId))
    .orderBy(desc(subscriptions.createdAt));

  const paymentRows = await db
    .select({ payment: subscriptionPayments, plan: subscriptionPlans })
    .from(subscriptionPayments)
    .innerJoin(
      subscriptionPlans,
      eq(subscriptionPayments.planId, subscriptionPlans.id),
    )
    .where(eq(subscriptionPayments.organizationId, organizationId))
    .orderBy(desc(subscriptionPayments.createdAt))
    .limit(50);

  const eventRows = await db
    .select()
    .from(subscriptionEvents)
    .where(eq(subscriptionEvents.organizationId, organizationId))
    .orderBy(desc(subscriptionEvents.createdAt))
    .limit(50);

  return {
    organization,
    owner: ownerRow ?? null,
    memberCount: memberCountRow?.value ?? 0,
    subscriptions: subscriptionRows.map((row) => ({
      ...row.subscription,
      plan: row.plan,
    })),
    payments: paymentRows.map((row) => ({ ...row.payment, plan: row.plan })),
    events: eventRows,
  };
};
