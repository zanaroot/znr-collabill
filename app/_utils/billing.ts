import { format } from "date-fns";
import type {
  SubscriptionInterval,
  SubscriptionPaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionWithPlan,
} from "@/http/models/subscription.model";

export type PlanActionKind = "loading" | "current" | "checkout" | "change";

export type PlanInput = Pick<
  SubscriptionPlan,
  | "id"
  | "code"
  | "name"
  | "description"
  | "amountMinor"
  | "amountMinorYearly"
  | "currency"
  | "interval"
  | "maxMembers"
  | "maxProjects"
>;

export type SubscriptionInput = Omit<
  SubscriptionWithPlan,
  | "createdAt"
  | "updatedAt"
  | "trialEndsAt"
  | "currentPeriodStart"
  | "currentPeriodEnd"
  | "canceledAt"
  | "plan"
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
  trialEndsAt: Date | string | null;
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
  canceledAt: Date | string | null;
  plan: PlanInput;
};

type StatusMeta = { label: string; color: string };

const subscriptionStatusMeta: Record<SubscriptionStatus, StatusMeta> = {
  TRIALING: { label: "Trial", color: "blue" },
  ACTIVE: { label: "Active", color: "success" },
  PAST_DUE: { label: "Past due", color: "warning" },
  SUSPENDED: { label: "Suspended", color: "purple" },
  CANCELED: { label: "Canceled", color: "default" },
  EXPIRED: { label: "Expired", color: "default" },
};

const paymentStatusMeta: Record<SubscriptionPaymentStatus, StatusMeta> = {
  PENDING: { label: "Pending", color: "processing" },
  SUCCEEDED: { label: "Succeeded", color: "success" },
  FAILED: { label: "Failed", color: "error" },
  REFUNDED: { label: "Refunded", color: "warning" },
};

export const getSubscriptionStatusMeta = (
  status: SubscriptionStatus,
): StatusMeta => subscriptionStatusMeta[status];

export const getPaymentStatusMeta = (
  status: SubscriptionPaymentStatus,
): StatusMeta => paymentStatusMeta[status];

export const formatMoney = (amountMinor: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);

export const planSupportsInterval = (
  plan: {
    amountMinor: number;
    amountMinorYearly?: number | null;
    interval: SubscriptionInterval | null;
  },
  interval: SubscriptionInterval,
): boolean => {
  if (!plan.interval && plan.amountMinor === 0) {
    return true;
  }
  return interval === "MONTHLY"
    ? plan.amountMinor > 0
    : (plan.amountMinorYearly ?? 0) > 0;
};

export const formatPlanPrice = (
  plan: {
    amountMinor: number;
    amountMinorYearly?: number | null;
    currency: string;
    interval: SubscriptionInterval | null;
  },
  interval?: SubscriptionInterval | null,
): string => {
  if (plan.amountMinor === 0 && (plan.amountMinorYearly ?? 0) === 0) {
    return "Free";
  }
  const target = interval ?? plan.interval;
  if (target === "YEARLY") {
    const amount = plan.amountMinorYearly ?? plan.amountMinor;
    return `${formatMoney(amount, plan.currency)} / year`;
  }
  return `${formatMoney(plan.amountMinor, plan.currency)} / month`;
};

export const formatSubscriptionPrice = (subscription: {
  amountMinor: number;
  currency: string;
  interval: SubscriptionInterval | null;
}): string => {
  if (subscription.amountMinor === 0) {
    return "Free";
  }
  const period = subscription.interval === "YEARLY" ? "year" : "month";
  return `${formatMoney(subscription.amountMinor, subscription.currency)} / ${period}`;
};

export const getIntervalLabel = (
  interval: SubscriptionInterval | null,
): string => {
  if (interval === "MONTHLY") return "Monthly";
  if (interval === "YEARLY") return "Yearly";
  return "—";
};

export const planLimitLabel = (limit: number | null): string =>
  limit === null ? "Unlimited" : `${limit}`;

export const planFeatures = (
  plan: Pick<
    SubscriptionPlan,
    "description" | "interval" | "amountMinor" | "amountMinorYearly"
  >,
  interval?: SubscriptionInterval | null,
): string[] => {
  const features: string[] = [];
  if (plan.description) {
    features.push(plan.description);
  }
  if (plan.amountMinor === 0 && (plan.amountMinorYearly ?? 0) === 0) {
    features.push("Free forever");
    return features;
  }
  const target = interval ?? plan.interval;
  features.push(target === "YEARLY" ? "Billed annually" : "Billed monthly");
  return features;
};

export const isLiveSubscription = (status: SubscriptionStatus): boolean =>
  status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";

export const getPlanAction = (
  plan: Pick<
    SubscriptionPlan,
    "id" | "interval" | "amountMinor" | "amountMinorYearly"
  >,
  subscription:
    | { planId: string; plan: { amountMinor: number } }
    | null
    | undefined,
  interval?: SubscriptionInterval | null,
): PlanActionKind => {
  if (subscription === undefined) {
    return "loading";
  }
  if (subscription && subscription.planId === plan.id) {
    return "current";
  }
  if (!plan.interval) {
    return "change";
  }
  if (!subscription) {
    return "checkout";
  }
  const target =
    (interval ?? plan.interval) === "YEARLY"
      ? (plan.amountMinorYearly ?? plan.amountMinor)
      : plan.amountMinor;
  return target > subscription.plan.amountMinor ? "checkout" : "change";
};

const toDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

export const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy");
};

export const formatDateTime = (
  value: Date | string | null | undefined,
): string => {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy HH:mm");
};
