import { Hono } from "hono";
import {
  getMyPresences,
  getTodayPresence,
  markPresence,
} from "@/http/controllers/presence.controller";
import { sundayMiddleware } from "@/http/middleware/sunday.middleware";

export const presenceRoutes = new Hono()
  .use("*", sundayMiddleware)
  .get("/today", ...getTodayPresence)
  .get("/my", ...getMyPresences)
  .post("/", ...markPresence);
