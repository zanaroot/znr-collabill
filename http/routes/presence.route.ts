import { Hono } from "hono";
import {
  getTodayPresence,
  markPresence,
} from "@/http/controllers/presence.controller";
import { sundayMiddleware } from "@/http/middleware/sunday.middleware";

export const presenceRoutes = new Hono()
  .use("*", sundayMiddleware)
  .get("/today", ...getTodayPresence)
  .post("/", ...markPresence);
