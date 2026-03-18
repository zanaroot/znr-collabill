import { useQuery } from "@tanstack/react-query";
import type { InvoiceLine } from "@/http/models/invoice.model";
import { client } from "@/packages/hono";

export const invoiceKeys = {
  all: ["invoices"] as const,
  lines: () => [...invoiceKeys.all, "lines"] as const,
};

export function useInvoiceLines() {
  return useQuery({
    queryKey: invoiceKeys.lines(),
    queryFn: async () => {
      const res = await client.api.invoices.lines.$get();
      if (!res.ok) throw new Error("Failed to fetch invoice lines");
      return (await res.json()) as InvoiceLine[];
    },
  });
}
