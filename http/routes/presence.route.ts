import { Hono } from "hono";
import {
  getAllPresences,
  getMyPresences,
  getTodayPresence,
  markPresence,
} from "@/http/controllers/presence.controller";
import { adminMiddleware } from "@/http/middleware/auth.middleware";
import { sundayMiddleware } from "@/http/middleware/sunday.middleware";

export const presenceRoutes = new Hono()
  .use("*", sundayMiddleware)
  .get("/today", ...getTodayPresence)
  .get("/my", ...getMyPresences)
  .get("/all", adminMiddleware, ...getAllPresences)
  .post("/", ...markPresence);
