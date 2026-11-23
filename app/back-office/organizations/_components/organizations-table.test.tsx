import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationsTable } from "./organizations-table";

const mocks = vi.hoisted(() => ({
  organizationsGet: vi.fn(),
  organizationDelete: vi.fn(),
  plansGet: vi.fn(),
}));

vi.mock("@/packages/hono", () => ({
  client: {
    api: {
      "back-office": {
        billing: {
          organizations: {
            $get: mocks.organizationsGet,
            ":organizationId": {
              $delete: mocks.organizationDelete,
            },
          },
          plans: { $get: mocks.plansGet },
        },
      },
    },
  },
}));

const organization = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Acme Inc.",
  slug: "acme-inc",
  createdAt: "2026-01-01T00:00:00.000Z",
  ownerName: "Alex Example",
  ownerEmail: "alex@example.com",
  subscriptionId: null,
  planCode: null,
  planName: null,
  status: null,
  interval: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: null,
  canceledAt: null,
  paymentExempt: false,
  latestPaymentStatus: null,
};

const response = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
});

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

describe("OrganizationsTable deletion", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.plansGet.mockResolvedValue(response([]));
  });

  it("confirms the selected organization and refreshes after deletion", async () => {
    mocks.organizationsGet
      .mockResolvedValueOnce(response({ rows: [organization], total: 1 }))
      .mockResolvedValue(response({ rows: [], total: 0 }));
    mocks.organizationDelete.mockResolvedValue(
      response({ success: true, message: "Organization deleted" }),
    );
    render(<OrganizationsTable />, { wrapper: createWrapper() });

    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Acme Inc." }),
    );
    expect(await screen.findAllByText("Delete organization")).not.toHaveLength(
      0,
    );
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          !!element.textContent?.includes("cannot be undone"),
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );

    await waitFor(() =>
      expect(mocks.organizationDelete).toHaveBeenCalledOnce(),
    );
    expect(mocks.organizationDelete).toHaveBeenCalledWith({
      param: { organizationId: organization.id },
    });
    expect(await screen.findByText("Organization deleted")).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.organizationsGet).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Delete Acme Inc." }),
      ).toBeNull(),
    );
  });

  it("keeps the confirmation open when deletion is blocked by the API", async () => {
    mocks.organizationsGet.mockResolvedValue(
      response({ rows: [organization], total: 1 }),
    );
    mocks.organizationDelete.mockResolvedValue(
      response(
        { error: "Organization cannot be deleted while invoices exist" },
        false,
        409,
      ),
    );
    render(<OrganizationsTable />, { wrapper: createWrapper() });

    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Acme Inc." }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete organization" }),
    );

    expect(
      await screen.findByText(
        "Organization cannot be deleted while invoices exist",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Delete organization")).not.toHaveLength(0);
    expect(screen.getAllByText("Acme Inc.")).not.toHaveLength(0);
  });
});
