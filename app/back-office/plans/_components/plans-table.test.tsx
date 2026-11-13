import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminPlan } from "../../_hooks/use-back-office";

const mocks = vi.hoisted(() => ({
  $get: vi.fn(),
  $post: vi.fn(),
}));

vi.mock("@/packages/hono", () => ({
  client: {
    api: {
      "back-office": {
        billing: {
          plans: {
            $get: mocks.$get,
            $post: mocks.$post,
            ":planId": {
              $patch: vi.fn(),
            },
          },
        },
      },
    },
  },
}));

import { PlansTable } from "./plans-table";

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

const freePlan: AdminPlan = {
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
  subscriptionCount: 2,
};

const goldPlan: AdminPlan = {
  ...freePlan,
  id: "22222222-2222-4222-8222-222222222222",
  code: "GOLD",
  name: "Gold",
  description: "A test plan",
  maxMembers: null,
  maxProjects: null,
  subscriptionCount: 0,
};

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
});

describe("PlansTable creation workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a newly created plan in the list without a page refresh", async () => {
    mocks.$get
      .mockResolvedValueOnce(okResponse([freePlan]))
      .mockResolvedValueOnce(okResponse([freePlan, goldPlan]));
    mocks.$post.mockResolvedValue(okResponse(goldPlan));

    render(<PlansTable />, { wrapper: createWrapper() });

    expect(await screen.findAllByText("Free")).not.toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "New plan" }));
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
      json: expect.objectContaining({
        code: "GOLD",
        name: "Gold",
        description: "A test plan",
      }),
    });

    expect(await screen.findByText("Plan created")).toBeInTheDocument();
    expect(await screen.findByText("Gold")).toBeInTheDocument();
    expect(screen.getAllByText("Free")).not.toHaveLength(0);
    expect(mocks.$get.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the list unchanged and shows the server error when creation fails", async () => {
    mocks.$get.mockResolvedValue(okResponse([freePlan]));
    mocks.$post.mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: "Plan code already exists" }),
    });

    render(<PlansTable />, { wrapper: createWrapper() });

    expect(await screen.findAllByText("Free")).not.toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "New plan" }));
    fireEvent.change(await screen.findByPlaceholderText("GOLD"), {
      target: { value: "GOLD" },
    });
    fireEvent.change(screen.getByPlaceholderText("Gold"), {
      target: { value: "Gold" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Plan code already exists"),
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.$post).toHaveBeenCalledTimes(1));
    expect(mocks.$get).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Free")).not.toHaveLength(0);
    expect(screen.queryByText("Gold")).not.toBeInTheDocument();
  });
});
