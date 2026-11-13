"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import type {
  CreatePlanInput,
  UpdatePlanInput,
} from "@/http/models/back-office.model";
import type {
  Subscription,
  SubscriptionEvent,
  SubscriptionInterval,
  SubscriptionPayment,
  SubscriptionPlan,
  SubscriptionPlanCode,
  SubscriptionStatus,
} from "@/http/models/subscription.model";
import { client } from "@/packages/hono";

type Jsonify<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

const backOfficeKeys = {
  all: ["back-office"] as const,
  overview: () => [...backOfficeKeys.all, "overview"] as const,
  plans: () => [...backOfficeKeys.all, "plans"] as const,
  organizations: (filters: Record<string, unknown>) =>
    [...backOfficeKeys.all, "organizations", filters] as const,
  organization: (organizationId: string) =>
    [...backOfficeKeys.all, "organization", organizationId] as const,
  payments: (filters: Record<string, unknown>) =>
    [...backOfficeKeys.all, "payments", filters] as const,
  payment: (paymentId: string) =>
    [...backOfficeKeys.all, "payment", paymentId] as const,
};

export type AdminPlan = Jsonify<
  SubscriptionPlan & { subscriptionCount: number }
>;

export type DashboardOverview = {
  totalOrganizations: number;
  organizationsWithLiveSubscription: number;
  organizationsOnPaidPlan: number;
  organizationsOnFreePlan: number;
  subscriptionsByStatus: Record<SubscriptionStatus, number>;
  revenueByCurrency: Array<{
    currency: string;
    mrrMinor: number;
    arrMinor: number;
  }>;
  recentPayments: Array<{
    id: string;
    organizationName: string;
    status: SubscriptionPayment["status"];
    amountMinor: number;
    currency: string;
    provider: string;
    planCode: string;
    createdAt: string;
  }>;
  recentEvents: Array<{
    id: string;
    organizationName: string;
    type: string;
    provider: string;
    payload: string;
    createdAt: string;
  }>;
};

export type OrganizationListFilters = {
  search?: string;
  planCode?: string;
  status?: SubscriptionStatus;
  page: number;
  pageSize: number;
};

export type OrganizationListRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  subscriptionId: string | null;
  planCode: string | null;
  planName: string | null;
  status: SubscriptionStatus | null;
  interval: SubscriptionInterval | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  canceledAt: string | null;
  latestPaymentStatus: SubscriptionPayment["status"] | null;
};

export type OrganizationBillingDetail = {
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: string | null;
  };
  owner: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
  } | null;
  memberCount: number;
  subscriptions: Array<Jsonify<Subscription & { plan: SubscriptionPlan }>>;
  payments: Array<Jsonify<SubscriptionPayment & { plan: SubscriptionPlan }>>;
  events: Array<Jsonify<SubscriptionEvent>>;
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
    authorName: string | null;
    authorEmail: string | null;
  }>;
  usage: {
    plan: { code: SubscriptionPlanCode; name: string };
    features: string[];
    limits: { maxMembers: number | null; maxProjects: number | null };
    usage: { members: number; projects: number };
    reached: { members: boolean; projects: boolean };
  };
};

export type PaymentListFilters = {
  status?: SubscriptionPayment["status"];
  provider?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

export type PaymentListRow = Jsonify<SubscriptionPayment> & {
  organizationName: string;
  planCode: string;
  planName: string;
};

export type PaymentDetail = {
  payment: Jsonify<SubscriptionPayment>;
  organization: { id: string; name: string };
  plan: { id: string; code: string; name: string };
  subscription: Jsonify<Subscription>;
  events: Array<Jsonify<SubscriptionEvent>>;
  refund: { configured: boolean; supported: boolean };
};

const readError = async (res: Response, fallback: string): Promise<string> => {
  const body = (await res.json().catch(() => null)) as {
    error?: string | { issues?: Array<{ message?: string }> };
  } | null;
  const error = body?.error;
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  if (error && typeof error === "object" && Array.isArray(error.issues)) {
    const messages = error.issues
      .map((issue) => issue.message)
      .filter((message): message is string => !!message);
    if (messages.length > 0) {
      return messages.join(", ");
    }
  }
  return fallback;
};

export const useBackOfficeOverview = () =>
  useQuery({
    queryKey: backOfficeKeys.overview(),
    queryFn: async (): Promise<DashboardOverview> => {
      const res = await client.api["back-office"].billing.overview.$get();
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to load dashboard"));
      }
      return res.json();
    },
  });

export const useAdminPlans = () =>
  useQuery({
    queryKey: backOfficeKeys.plans(),
    queryFn: async (): Promise<AdminPlan[]> => {
      const res = await client.api["back-office"].billing.plans.$get();
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to load plans"));
      }
      return res.json();
    },
  });

export const useAdminOrganizations = (filters: OrganizationListFilters) =>
  useQuery({
    queryKey: backOfficeKeys.organizations(filters),
    queryFn: async (): Promise<{
      rows: OrganizationListRow[];
      total: number;
    }> => {
      const res = await client.api["back-office"].billing.organizations.$get({
        query: {
          search: filters.search || undefined,
          planCode: filters.planCode || undefined,
          status: filters.status || undefined,
          page: String(filters.page),
          pageSize: String(filters.pageSize),
        },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to load organizations"));
      }
      return res.json();
    },
  });

export const useAdminOrganization = (organizationId: string | null) =>
  useQuery({
    queryKey: backOfficeKeys.organization(organizationId ?? ""),
    enabled: !!organizationId,
    queryFn: async (): Promise<OrganizationBillingDetail> => {
      const res = await client.api["back-office"].billing.organizations[
        ":organizationId"
      ].$get({ param: { organizationId: organizationId ?? "" } });
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to load organization"));
      }
      return res.json();
    },
  });

export const useAdminPayments = (filters: PaymentListFilters) =>
  useQuery({
    queryKey: backOfficeKeys.payments(filters),
    queryFn: async (): Promise<{
      rows: PaymentListRow[];
      total: number;
    }> => {
      const res = await client.api["back-office"].billing.payments.$get({
        query: {
          status: filters.status || undefined,
          provider: filters.provider || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          page: String(filters.page),
          pageSize: String(filters.pageSize),
        },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to load payments"));
      }
      return res.json();
    },
  });

export const useAdminPayment = (paymentId: string | null) =>
  useQuery({
    queryKey: backOfficeKeys.payment(paymentId ?? ""),
    enabled: !!paymentId,
    queryFn: async (): Promise<PaymentDetail> => {
      const res = await client.api["back-office"].billing.payments[
        ":paymentId"
      ].$get({ param: { paymentId: paymentId ?? "" } });
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to load payment"));
      }
      return res.json();
    },
  });

const useBackOfficeMutation = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  options?: {
    successMessage?: string | ((variables: TVariables) => string);
    invalidate?: string[][];
  },
) => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      const success = options?.successMessage;
      if (success) {
        message.success(
          typeof success === "function" ? success(variables) : success,
        );
      }
      for (const queryKey of options?.invalidate ?? []) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
};

export const useCreatePlan = () =>
  useBackOfficeMutation(
    async (input: CreatePlanInput) => {
      const res = await client.api["back-office"].billing.plans.$post({
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Plan creation failed"));
      }
      return res.json();
    },
    {
      successMessage: "Plan created",
      invalidate: [[...backOfficeKeys.all, "plans"]],
    },
  );

export const useUpdatePlan = () =>
  useBackOfficeMutation(
    async (input: { planId: string; values: UpdatePlanInput }) => {
      const res = await client.api["back-office"].billing.plans[
        ":planId"
      ].$patch({ param: { planId: input.planId }, json: input.values });
      if (!res.ok) {
        throw new Error(await readError(res, "Plan update failed"));
      }
      return res.json();
    },
    {
      successMessage: "Plan updated",
      invalidate: [[...backOfficeKeys.all, "plans"]],
    },
  );

const subscriptionActionInvalidations = [
  [...backOfficeKeys.all, "organizations"],
  [...backOfficeKeys.all, "organization"],
  [...backOfficeKeys.all, "overview"],
];

type SubscriptionActionInput = {
  subscriptionId: string;
  successMessage: string;
};

export const useActivateSubscription = () =>
  useBackOfficeMutation(
    async (input: SubscriptionActionInput) => {
      const res = await client.api["back-office"].billing.subscriptions[
        ":subscriptionId"
      ].activate.$post({
        param: { subscriptionId: input.subscriptionId },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Subscription action failed"));
      }
      return res.json();
    },
    {
      successMessage: (input: SubscriptionActionInput) => input.successMessage,
      invalidate: subscriptionActionInvalidations,
    },
  );

export const useReactivateSubscription = () =>
  useBackOfficeMutation(
    async (input: SubscriptionActionInput) => {
      const res = await client.api["back-office"].billing.subscriptions[
        ":subscriptionId"
      ].reactivate.$post({
        param: { subscriptionId: input.subscriptionId },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Subscription action failed"));
      }
      return res.json();
    },
    {
      successMessage: (input: SubscriptionActionInput) => input.successMessage,
      invalidate: subscriptionActionInvalidations,
    },
  );

export const useSuspendSubscription = () =>
  useBackOfficeMutation(
    async (input: SubscriptionActionInput) => {
      const res = await client.api["back-office"].billing.subscriptions[
        ":subscriptionId"
      ].suspend.$post({
        param: { subscriptionId: input.subscriptionId },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Subscription action failed"));
      }
      return res.json();
    },
    {
      successMessage: (input: SubscriptionActionInput) => input.successMessage,
      invalidate: subscriptionActionInvalidations,
    },
  );

export const useCancelSubscription = () =>
  useBackOfficeMutation(
    async (input: SubscriptionActionInput & { atPeriodEnd?: boolean }) => {
      const res = await client.api["back-office"].billing.subscriptions[
        ":subscriptionId"
      ].cancel.$post({
        param: { subscriptionId: input.subscriptionId },
        json: { atPeriodEnd: input.atPeriodEnd ?? false },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Subscription action failed"));
      }
      return res.json();
    },
    {
      successMessage: (input: SubscriptionActionInput) => input.successMessage,
      invalidate: subscriptionActionInvalidations,
    },
  );

export const useExtendSubscription = () =>
  useBackOfficeMutation(
    async (input: { subscriptionId: string; days: number }) => {
      const res = await client.api["back-office"].billing.subscriptions[
        ":subscriptionId"
      ].extend.$post({
        param: { subscriptionId: input.subscriptionId },
        json: { days: input.days },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Extension failed"));
      }
      return res.json();
    },
    {
      successMessage: "Subscription period extended",
      invalidate: [
        [...backOfficeKeys.all, "organizations"],
        [...backOfficeKeys.all, "organization"],
        [...backOfficeKeys.all, "overview"],
      ],
    },
  );

export const useChangeAdminPlan = () =>
  useBackOfficeMutation(
    async (input: {
      subscriptionId: string;
      planCode: SubscriptionPlanCode;
      interval?: SubscriptionInterval;
    }) => {
      const res = await client.api["back-office"].billing.subscriptions[
        ":subscriptionId"
      ]["change-plan"].$post({
        param: { subscriptionId: input.subscriptionId },
        json: { planCode: input.planCode, interval: input.interval },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Plan change failed"));
      }
      return res.json();
    },
    {
      successMessage: "Subscription plan updated",
      invalidate: [
        [...backOfficeKeys.all, "organizations"],
        [...backOfficeKeys.all, "organization"],
        [...backOfficeKeys.all, "overview"],
        [...backOfficeKeys.all, "plans"],
      ],
    },
  );

export const useAddAdminNote = () =>
  useBackOfficeMutation(
    async (input: { organizationId: string; body: string }) => {
      const res = await client.api["back-office"].billing.organizations[
        ":organizationId"
      ].notes.$post({
        param: { organizationId: input.organizationId },
        json: { body: input.body },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Note save failed"));
      }
      return res.json();
    },
    {
      successMessage: "Note added",
      invalidate: [[...backOfficeKeys.all, "organization"]],
    },
  );

export const useRefundPayment = () =>
  useBackOfficeMutation(
    async (paymentId: string) => {
      const res = await client.api["back-office"].billing.payments[
        ":paymentId"
      ].refund.$post({ param: { paymentId } });
      if (!res.ok) {
        throw new Error(await readError(res, "Refund failed"));
      }
      return res.json();
    },
    {
      successMessage: "Payment refunded",
      invalidate: [
        [...backOfficeKeys.all, "payment"],
        [...backOfficeKeys.all, "payments"],
        [...backOfficeKeys.all, "overview"],
        [...backOfficeKeys.all, "organization"],
      ],
    },
  );
