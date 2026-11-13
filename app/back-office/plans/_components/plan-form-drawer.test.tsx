import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminPlan } from "../../_hooks/use-back-office";

const mocks = vi.hoisted(() => ({
  $post: vi.fn(),
  $patch: vi.fn(),
}));

vi.mock("@/packages/hono", () => ({
  client: {
    api: {
      "back-office": {
        billing: {
          plans: {
            $post: mocks.$post,
            ":planId": {
              $patch: mocks.$patch,
            },
          },
        },
      },
    },
  },
}));

import { PlanFormDrawer } from "./plan-form-drawer";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <App>{children}</App>
    </QueryClientProvider>
  );
};

const existingPlan: AdminPlan = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "FREE",
  name: "Free",
  description: null,
  amountMinor: 0,
  amountMinorYearly: null,
  currency: "USD",
  supportedCurrencies: ["USD"],
  interval: null,
  maxMembers: 5,
  maxProjects: 3,
  features: [],
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  subscriptionCount: 0,
};

describe("PlanFormDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a plan with the typed values and shows success", async () => {
    mocks.$post.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: "plan-new" }),
    });
    const onClose = vi.fn();
    render(<PlanFormDrawer open plan={null} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    fireEvent.change(await screen.findByPlaceholderText("GOLD"), {
      target: { value: "GOLD" },
    });
    fireEvent.change(screen.getByPlaceholderText("Gold"), {
      target: { value: "Gold" },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional"), {
      target: { value: "A test plan" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.$post).toHaveBeenCalledTimes(1));
    expect(mocks.$post).toHaveBeenCalledWith({
      json: {
        code: "GOLD",
        name: "Gold",
        description: "A test plan",
        amountMinor: 0,
        amountMinorYearly: null,
        currency: "USD",
        supportedCurrencies: ["USD"],
        maxMembers: null,
        maxProjects: null,
        features: [],
        active: true,
      },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Plan created")).toBeInTheDocument();
  });

  it("shows validation errors and skips the request when required fields are empty", async () => {
    const onClose = vi.fn();
    render(<PlanFormDrawer open plan={null} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Too small: expected string to have >=2 characters",
      ),
    ).toBeInTheDocument();
    expect(mocks.$post).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("updates an existing plan with the edited values", async () => {
    mocks.$patch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: existingPlan.id }),
    });
    const onClose = vi.fn();
    render(<PlanFormDrawer open plan={existingPlan} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    fireEvent.change(await screen.findByPlaceholderText("Gold"), {
      target: { value: "Free Plus" },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional"), {
      target: { value: "Updated description" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.$patch).toHaveBeenCalledTimes(1));
    expect(mocks.$patch).toHaveBeenCalledWith({
      param: { planId: existingPlan.id },
      json: expect.objectContaining({
        code: "FREE",
        name: "Free Plus",
        description: "Updated description",
        currency: "USD",
        supportedCurrencies: ["USD"],
        active: true,
      }),
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("surfaces server-side validation errors as readable messages", async () => {
    mocks.$patch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            issues: [{ message: "supportedCurrencies must include currency" }],
          },
        }),
    });
    const onClose = vi.fn();
    render(<PlanFormDrawer open plan={existingPlan} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("supportedCurrencies must include currency"),
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.$patch).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });
});
