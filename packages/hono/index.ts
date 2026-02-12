import { hc } from "hono/client";
import type { AppType } from "@/http/routes";

export const client = hc<AppType>("/");
