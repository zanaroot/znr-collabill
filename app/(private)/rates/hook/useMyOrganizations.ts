import { useQuery } from "@tanstack/react-query";
import { client } from "@/packages/hono";

export const useMyOrganizations = () => {
  return useQuery({
    queryKey: ["my-organizations"],
    queryFn: async () => {
      const res = await client.api.organizations.me.$get();

      if (!res.ok) {
        throw new Error("Failed to fetch organizations");
      }

      return res.json();
    },
  });
};
