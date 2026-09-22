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
