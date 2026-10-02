import { useQuery } from "@tanstack/react-query";
import { client } from "@/packages/hono";

export const useDashboardStatistics = (userId?: string) => {
  return useQuery({
    queryKey: ["dashboard-statistics", userId],
    queryFn: async () => {
      const response = await client.api.dashboard.$get({
        query: userId ? { userId } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard statistics");
      }

      return response.json();
    },
    enabled: !!userId,
  });
};

export const useDashboardNewTickets = (userId?: string) => {
  return useQuery({
    queryKey: ["dashboard", "new-tickets", userId],
    queryFn: async () => {
      const response = await client.api.dashboard["new-tickets"].$get({
        query: userId ? { userId } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard new tickets");
      }

      return response.json();
    },
    enabled: !!userId,
  });
};

export const useDashboardInvoiceEstimate = (userId?: string) => {
  return useQuery({
    queryKey: ["dashboard", "invoice-estimate", userId],

    queryFn: async () => {
      const res = await client.api.dashboard["invoice-estimate"].$get({
        query: userId ? { userId } : {},
      });

      if (!res.ok) {
        throw new Error("Failed to fetch invoice estimate");
      }

      return res.json();
    },
  });
};

export const useDashboardImportantTickets = (userId?: string) => {
  return useQuery({
    queryKey: ["dashboard", "important-tickets", userId],
    queryFn: async () => {
      const response = await client.api.dashboard["important-tickets"].$get({
        query: userId ? { userId } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to fetch important tickets");
      }

      return response.json();
    },
    enabled: !!userId,
  });
};
