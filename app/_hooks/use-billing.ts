"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useEffect, useRef, useState } from "react";
import type {
  SubscriptionInterval,
  SubscriptionPaymentStatus,
  SubscriptionPlanCode,
} from "@/http/models/subscription.model";
import { client } from "@/packages/hono";

const PENDING_CHECKOUT_KEY = "collabill.pendingCheckout";
const RECOVERY_POLL_MS = 3000;
const MAX_RECOVERY_ATTEMPTS = 10;

export const billingKeys = {
  all: ["billing"] as const,
  plans: () => [...billingKeys.all, "plans"] as const,
  subscription: () => [...billingKeys.all, "subscription"] as const,
  payments: () => [...billingKeys.all, "payments"] as const,
  usage: () => [...billingKeys.all, "usage"] as const,
  recovery: (paymentId: string) =>
    [...billingKeys.all, "recovery", paymentId] as const,
};

type OrganizationUsage = {
  plan: { code: SubscriptionPlanCode; name: string };
  features: string[];
  limits: {
    maxMembers: number | null;
    maxProjects: number | null;
  };
  usage: { members: number; projects: number };
  reached: { members: boolean; projects: boolean };
};

export type PaymentHistoryRow = {
  id: string;
  planId: string;
  planCode: SubscriptionPlanCode;
  status: SubscriptionPaymentStatus;
  amountMinor: number;
  currency: string;
  provider: string;
  providerPaymentId: string | null;
  paidAt: Date | string | null;
  failureReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type PendingCheckout = {
  paymentId: string;
  planCode: string;
  startedAt: string;
};

const readError = async (res: Response, fallback: string): Promise<string> => {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || fallback;
};

export const usePlans = () =>
  useQuery({
    queryKey: billingKeys.plans(),
    queryFn: async () => {
      const res = await client.api.billing.public.plans.$get();
      if (!res.ok) {
        throw new Error("Failed to load subscription plans");
      }
      return res.json();
    },
  });

export const useSubscription = (options?: { required?: boolean }) => {
  const required = options?.required ?? true;
  return useQuery({
    queryKey: billingKeys.subscription(),
    retry: false,
    queryFn: async () => {
      try {
        const res = await client.api.billing.subscription.$get();
        if (res.ok) {
          return await res.json();
        }
        if (!required) {
          return null;
        }
        throw new Error(await readError(res, "Failed to load subscription"));
      } catch (error) {
        if (!required) {
          return null;
        }
        throw error;
      }
    },
  });
};

export const usePayments = (enabled = true) =>
  useQuery({
    queryKey: billingKeys.payments(),
    enabled,
    queryFn: async () => {
      const res = await client.api.billing.payments.$get();
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to load payments"));
      }
      return res.json();
    },
  });

export const useEntitlements = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: billingKeys.usage(),
    enabled: options?.enabled ?? true,
    retry: false,
    queryFn: async () => {
      const res = await client.api.billing.usage.$get();
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to load usage"));
      }
      return (await res.json()) as OrganizationUsage;
    },
  });

export const useCheckout = () => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async (input: {
      planCode: SubscriptionPlanCode;
      interval: SubscriptionInterval;
    }) => {
      const res = await client.api.billing.checkout.$post({ json: input });
      if (!res.ok) {
        throw new Error(await readError(res, "Checkout failed"));
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
      const pending: PendingCheckout = {
        paymentId: data.payment.id,
        planCode: data.plan.code,
        startedAt: new Date().toISOString(),
      };
      try {
        window.sessionStorage.setItem(
          PENDING_CHECKOUT_KEY,
          JSON.stringify(pending),
        );
      } catch {
        message.warning(
          "Could not remember this checkout — you can reconcile it from payment history.",
        );
      }
      if (!data.checkoutUrl) {
        message.error("Checkout session could not be created");
        return;
      }
      window.location.assign(data.checkoutUrl);
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
};

export const useChangePlan = () => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async (input: {
      planCode: SubscriptionPlanCode;
      interval?: SubscriptionInterval;
    }) => {
      const res = await client.api.billing["change-plan"].$post({
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Plan change failed"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
      message.success("Subscription plan updated");
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async (input: { atPeriodEnd?: boolean }) => {
      const res = await client.api.billing.cancel.$post({ json: input });
      if (!res.ok) {
        throw new Error(await readError(res, "Cancellation failed"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
      message.success("Subscription canceled");
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
};

export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async () => {
      const res = await client.api.billing.reactivate.$post({ json: {} });
      if (!res.ok) {
        throw new Error(await readError(res, "Reactivation failed"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
      message.success("Subscription reactivated");
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
};

export const useReconcilePayment = () => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await client.api.billing.payments[":paymentId"].status.$get({
        param: { paymentId },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to check payment status"));
      }
      return res.json();
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
      if (payment.status === "SUCCEEDED") {
        message.success("Payment confirmed — subscription updated");
      } else if (payment.status === "FAILED") {
        message.error(
          payment.failureReason
            ? `Payment failed: ${payment.failureReason}`
            : "Payment failed",
        );
      } else if (payment.status === "REFUNDED") {
        message.info("Payment refunded");
      } else {
        message.info("Payment is still pending");
      }
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
};

const readPendingCheckout = (): PendingCheckout | null => {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCheckout>;
    if (!parsed.paymentId) return null;
    return {
      paymentId: parsed.paymentId,
      planCode: parsed.planCode ?? "",
      startedAt: parsed.startedAt ?? "",
    };
  } catch {
    return null;
  }
};

const clearPendingCheckout = (): void => {
  try {
    window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    // Storage may be unavailable; the in-memory state still clears.
  }
};

export const useCheckoutRecovery = () => {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const attemptsRef = useRef(0);
  const settledRef = useRef(false);

  useEffect(() => {
    setPending(readPendingCheckout());
  }, []);

  const dismiss = () => {
    clearPendingCheckout();
    setPending(null);
  };

  const query = useQuery({
    queryKey: billingKeys.recovery(pending?.paymentId ?? ""),
    enabled: !!pending,
    retry: false,
    refetchInterval: (queryState) => {
      const status = queryState.state.data?.status;
      if (status !== undefined && status !== "PENDING") {
        return false;
      }
      if (attemptsRef.current >= MAX_RECOVERY_ATTEMPTS) {
        return false;
      }
      return RECOVERY_POLL_MS;
    },
    queryFn: async () => {
      if (!pending) {
        throw new Error("No pending checkout");
      }
      attemptsRef.current += 1;
      const res = await client.api.billing.payments[":paymentId"].status.$get({
        param: { paymentId: pending.paymentId },
      });
      if (!res.ok) {
        throw new Error(await readError(res, "Failed to check payment"));
      }
      const payment = await res.json();
      if (payment.status !== "PENDING" && !settledRef.current) {
        settledRef.current = true;
        clearPendingCheckout();
        queryClient.invalidateQueries({ queryKey: billingKeys.subscription() });
        queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
        queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
      }
      return payment;
    },
  });

  return {
    pending,
    payment: query.data,
    isError: query.isError,
    error: query.error,
    isChecking: query.isFetching,
    attemptsExhausted:
      attemptsRef.current >= MAX_RECOVERY_ATTEMPTS &&
      (query.data?.status ?? "PENDING") === "PENDING",
    dismiss,
    checkNow: () => query.refetch(),
  };
};
