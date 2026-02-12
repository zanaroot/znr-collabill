import type { AppType } from "@/http/routes";
import { hc } from "hono/client";

export const client = hc<AppType>("/");
