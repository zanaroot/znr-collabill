"use client";

import { useQuery } from "@tanstack/react-query";
import { client } from "@/packages/hono";

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await client.api.notifications["unread-count"].$get();

      if (!response.ok) {
        throw new Error("Failed to fetch unread notifications count");
      }

      return response.json();
    },
  });
};
