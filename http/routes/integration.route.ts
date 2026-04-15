import { Hono } from "hono";
import {
  deleteIntegrationHandler,
  getIntegrationByType,
  getIntegrationCredentials,
  getIntegrations,
  saveIntegrationHandler,
  toggleIntegrationHandler,
  updateIntegration,
} from "@/http/controllers/integration.controller";
import { adminMiddleware } from "@/http/middleware/auth.middleware";

export const integrationRoutes = new Hono()
  .get("/", ...getIntegrations)
  .get("/:type", ...getIntegrationByType)
  .get("/:type/credentials", ...getIntegrationCredentials)
  .post("/", adminMiddleware, ...saveIntegrationHandler)
  .put("/:type", adminMiddleware, ...updateIntegration)
  .post("/toggle", adminMiddleware, ...toggleIntegrationHandler)
  .delete("/", adminMiddleware, ...deleteIntegrationHandler);
