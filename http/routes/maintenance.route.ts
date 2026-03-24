import { Hono } from "hono";
import { closeStaleIterationsHandler } from "@/http/controllers/maintenance.controller";

export const maintenanceRoutes = new Hono().post(
  "/iterations/close-stale",
  ...closeStaleIterationsHandler,
);
