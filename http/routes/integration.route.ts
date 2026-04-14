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
import {
  adminMiddleware,
  ownerMiddleware,
} from "@/http/middleware/auth.middleware";

export const integrationRoutes = new Hono()
  .get("/", ...getIntegrations)
  .get("/:type", ...getIntegrationByType)
  .get("/:type/credentials", ...getIntegrationCredentials)
  .post("/", ownerMiddleware, ...saveIntegrationHandler)
  .put("/:type", ownerMiddleware, ...updateIntegration)
  .post("/toggle", adminMiddleware, ...toggleIntegrationHandler)
  .delete("/", ownerMiddleware, ...deleteIntegrationHandler);
