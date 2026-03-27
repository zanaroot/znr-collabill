import { Hono } from "hono";
import {
  getTodayPresence,
  markPresence,
} from "@/http/controllers/presence.controller";

export const presenceRoutes = new Hono()
  .get("/today", ...getTodayPresence)
  .post("/", ...markPresence);
