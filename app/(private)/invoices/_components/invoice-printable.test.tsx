import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoicePrintable } from "@/app/(private)/invoices/_components/invoice-printable";

// Mock the client
vi.mock("@/packages/hono", () => ({
  client: {
    api: {
      organizations: {
        ":id": {
          owner: {
            $get: vi.fn(() =>
              Promise.resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    id: "owner-1",
                    name: "Owner Name",
                    email: "owner@example.com",
                  }),
              }),
            ),
          },
        },
      },
      invoices: {
        $post: vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: "invoice-1" }),
          }),
        ),
      },
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("InvoicePrintable", () => {
  const mockProps = {
    presenceData: [
      {
        userId: "user-1",
        userName: "John Doe",
        dailyRate: "100",
        presenceCount: 5,
      },
    ],
    taskData: [],
    organizationName: "Test Org",
    organizationId: "org-1",
    targetUserName: "John Doe",
    targetUserId: "user-1",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    periodName: "April 2026",
    isOwner: true,
  };

  it("renders basic invoice info", () => {
    render(<InvoicePrintable {...mockProps} />, { wrapper: createWrapper() });

    expect(screen.getAllByText("Test Org").length).toBeGreaterThan(0);
    expect(screen.getByText("INVOICE")).toBeInTheDocument();
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
  });

  it("calculates total with presence data", () => {
    render(<InvoicePrintable {...mockProps} />, { wrapper: createWrapper() });

    // 5 * 100 = 500
    // Total appears multiple times (line total, subtotal, grand total)
    expect(screen.getAllByText(/500 €/).length).toBeGreaterThan(0);
  });

  it("renders custom fields and updates total", () => {
    const customLines = [{ label: "Bonus", amount: "200", key: "1" }];
    render(<InvoicePrintable {...mockProps} customLines={customLines} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Bonus")).toBeInTheDocument();
    expect(screen.getAllByText(/200 €/).length).toBeGreaterThan(0);

    // Total: 500 (presence) + 200 (bonus) = 700
    expect(screen.getAllByText(/700 €/).length).toBeGreaterThan(0);
  });

  it("shows add custom field UI when isOwner and no existingInvoice", () => {
    render(<InvoicePrintable {...mockProps} />, { wrapper: createWrapper() });

    expect(
      screen.getByPlaceholderText("Label (e.g. Bonus, Prime)"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("does not show add custom field UI when not owner", () => {
    render(<InvoicePrintable {...mockProps} isOwner={false} />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.queryByPlaceholderText("Label (e.g. Bonus, Prime)"),
    ).not.toBeInTheDocument();
  });

  it("does not show add custom field UI when existingInvoice exists", () => {
    render(
      <InvoicePrintable
        {...mockProps}
        existingInvoice={{ id: "inv-1", status: "VALIDATED" }}
      />,
      {
        wrapper: createWrapper(),
      },
    );

    expect(
      screen.queryByPlaceholderText("Label (e.g. Bonus, Prime)"),
    ).not.toBeInTheDocument();
  });
});
