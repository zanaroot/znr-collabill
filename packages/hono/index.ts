import { hc } from "hono/client";
import type { AppType } from "@/http/routes";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const client = hc<AppType>(getBaseUrl(), {
  headers: (): Record<string, string> => {
    if (typeof window !== "undefined") return {};
    return {
      Origin: getBaseUrl(),
    };
  },
});
