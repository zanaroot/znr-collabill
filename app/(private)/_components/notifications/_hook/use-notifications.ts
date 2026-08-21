"use client";

import { useQuery } from "@tanstack/react-query";
import { client } from "@/packages/hono";

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await client.api.notifications.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      return response.json();
    },
  });
};
