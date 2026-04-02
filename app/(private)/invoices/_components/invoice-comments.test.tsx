import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceComments } from "@/app/(private)/invoices/_components/invoice-comments";

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

describe("InvoiceComments", () => {
  it("renders placeholder when no invoiceId", () => {
    render(<InvoiceComments invoiceId={null} />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Validate the invoice to enable comments"),
    ).toBeInTheDocument();
  });

  it("renders comment icon", () => {
    render(<InvoiceComments invoiceId={null} />, { wrapper: createWrapper() });

    const commentIcon = document.querySelector('[aria-label="comment"]');
    expect(commentIcon).toBeInTheDocument();
  });
});
