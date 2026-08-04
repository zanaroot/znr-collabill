import { useQuery } from "@tanstack/react-query";
import { client } from "@/packages/hono";

export const useOrganizationAttendanceSettings = (organizationId: string) => {
  return useQuery({
    queryKey: ["organization-attendance-settings", organizationId],
    queryFn: async () => {
      const res = await client.api.organizations[":organizationId"][
        "attendance-settings"
      ].$get({
        param: {
          organizationId,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch attendance settings");
      }

      return res.json();
    },
  });
};
