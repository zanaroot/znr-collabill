import { Hono } from "hono";
import { cronController } from "@/http/controllers/cron.controller";

export const cronRoutes = new Hono()
    .post("/close-iterations", ...cronController.closeIterations);
