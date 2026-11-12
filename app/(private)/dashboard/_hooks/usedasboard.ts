import { useQuery } from "@tanstack/react-query";
import { client } from "@/packages/hono";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  statistics: ["dashboard-statistics"] as const,
  statisticsFor: (userId?: string) =>
    [...dashboardKeys.statistics, userId] as const,
  newTickets: (userId?: string) =>
    [...dashboardKeys.all, "new-tickets", userId] as const,
  invoiceEstimate: ["dashboard", "invoice-estimate"] as const,
  invoiceEstimateFor: (userId?: string) =>
    [...dashboardKeys.invoiceEstimate, userId] as const,
  importantTickets: (userId?: string) =>
    [...dashboardKeys.all, "important-tickets", userId] as const,
};

export const useDashboardStatistics = (userId?: string) => {
  return useQuery({
    queryKey: dashboardKeys.statisticsFor(userId),
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
    queryKey: dashboardKeys.newTickets(userId),
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
    queryKey: dashboardKeys.invoiceEstimateFor(userId),

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
    queryKey: dashboardKeys.importantTickets(userId),
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
