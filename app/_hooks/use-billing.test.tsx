import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { App } from "antd";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { client } from "@/packages/hono";
import {
  useChangePlan,
  useCheckout,
  useCheckoutRecovery,
  useSubscription,
} from "./use-billing";

vi.mock("@/packages/hono", () => ({
  client: {
    api: {
      billing: {
        public: { plans: { $get: vi.fn() } },
        subscription: { $get: vi.fn() },
        payments: {
          $get: vi.fn(),
          ":paymentId": { status: { $get: vi.fn() } },
        },
        checkout: { $post: vi.fn() },
        "change-plan": { $post: vi.fn() },
        cancel: { $post: vi.fn() },
        reactivate: { $post: vi.fn() },
      },
    },
  },
}));

const PENDING_KEY = "collabill.pendingCheckout";

const okJson = (data: unknown) =>
  ({ ok: true, status: 200, json: async () => data }) as never;

const failResponse = () => ({ ok: false, status: 401 }) as never;

const subscriptionFixture = {
  id: "sub-1",
  organizationId: "org-1",
  planId: "plan-1",
  status: "ACTIVE",
  interval: "MONTHLY",
  amountMinor: 1900,
  currency: "USD",
  provider: "mock",
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodStart: "2026-03-01T00:00:00.000Z",
  currentPeriodEnd: "2026-04-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  canceledAt: null,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  plan: {
    id: "plan-1",
    code: "PRO",
    name: "Pro",
    description: "Unlimited members and projects",
    amountMinor: 1900,
    currency: "USD",
    interval: "MONTHLY",
    maxMembers: null,
    maxProjects: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

const paymentFixture = {
  id: "pay_1",
  organizationId: "org-1",
  subscriptionId: "sub-1",
  planId: "plan-1",
  status: "PENDING",
  amountMinor: 1900,
  currency: "USD",
  provider: "mock",
  providerPaymentId: null,
  paidAt: null,
  failureReason: null,
  createdAt: "2026-03-15T00:00:00.000Z",
  updatedAt: "2026-03-15T00:00:00.000Z",
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <App>{children}</App>
    </QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
});

describe("useSubscription", () => {
  it("returns null for anonymous users when not required", async () => {
    vi.mocked(client.api.billing.subscription.$get).mockResolvedValue(
      failResponse(),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSubscription({ required: false }), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
    expect(result.current.isError).toBe(false);
  });

  it("throws for anonymous users when required", async () => {
    vi.mocked(client.api.billing.subscription.$get).mockResolvedValue(
      failResponse(),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSubscription(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("returns the subscription when authorized", async () => {
    vi.mocked(client.api.billing.subscription.$get).mockResolvedValue(
      okJson(subscriptionFixture),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSubscription(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.data?.plan.code).toBe("PRO");
    });
    expect(result.current.isError).toBe(false);
  });
});

describe("useCheckout", () => {
  it("stores the pending checkout before redirecting", async () => {
    vi.mocked(client.api.billing.checkout.$post).mockResolvedValue(
      okJson({
        payment: { id: "pay_9", createdAt: "2026-03-15T00:00:00.000Z" },
        plan: { code: "PRO" },
        billingPeriod: {
          startsAt: "2026-03-15T00:00:00.000Z",
          endsAt: "2026-04-15T00:00:00.000Z",
        },
        checkoutUrl: "http://localhost:3000/api/payments/mock/checkout/cs_1",
      }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCheckout(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ planCode: "PRO", interval: "MONTHLY" });
    });

    await waitFor(() => {
      const raw = window.sessionStorage.getItem(PENDING_KEY);
      expect(raw).toContain("pay_9");
      expect(raw).toContain("PRO");
    });
    expect(client.api.billing.checkout.$post).toHaveBeenCalledWith({
      json: { planCode: "PRO", interval: "MONTHLY" },
    });
  });
});

describe("useChangePlan", () => {
  it("invalidates subscription and payment queries on success", async () => {
    vi.mocked(client.api.billing["change-plan"].$post).mockResolvedValue(
      okJson(subscriptionFixture),
    );
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useChangePlan(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ planCode: "FREE" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["billing", "subscription"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["billing", "payments"],
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe("useCheckoutRecovery", () => {
  it("starts from a stored pending checkout", async () => {
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        paymentId: "pay_1",
        planCode: "PRO",
        startedAt: "2026-03-15T00:00:00.000Z",
      }),
    );
    vi.mocked(
      client.api.billing.payments[":paymentId"].status.$get,
    ).mockResolvedValue(okJson(paymentFixture));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCheckoutRecovery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.pending?.paymentId).toBe("pay_1");
    });
    await waitFor(() => {
      expect(result.current.payment?.status).toBe("PENDING");
    });
  });

  it("clears the stored checkout once the payment settles", async () => {
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        paymentId: "pay_1",
        planCode: "PRO",
        startedAt: "2026-03-15T00:00:00.000Z",
      }),
    );
    const statusMock = vi.mocked(
      client.api.billing.payments[":paymentId"].status.$get,
    );
    statusMock.mockResolvedValue(okJson(paymentFixture));
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCheckoutRecovery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.pending?.paymentId).toBe("pay_1");
    });

    statusMock.mockResolvedValue(
      okJson({
        ...paymentFixture,
        status: "SUCCEEDED",
        paidAt: "2026-03-15T01:00:00.000Z",
      }),
    );

    await act(async () => {
      await result.current.checkNow();
    });

    await waitFor(() => {
      expect(result.current.payment?.status).toBe("SUCCEEDED");
    });
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["billing", "subscription"],
    });
  });

  it("dismisses without waiting for a payment", async () => {
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        paymentId: "pay_1",
        planCode: "PRO",
        startedAt: "2026-03-15T00:00:00.000Z",
      }),
    );
    vi.mocked(
      client.api.billing.payments[":paymentId"].status.$get,
    ).mockResolvedValue(okJson(paymentFixture));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCheckoutRecovery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.pending).not.toBeNull();
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.pending).toBeNull();
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });
});
