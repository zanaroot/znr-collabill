import { Hono } from "hono";
import {
  createOrganization,
  deleteOrganization,
  getMyOrganizations,
  getOwnedOrganizations,
  leaveOrganization,
  organizationOwner,
  selectOrganization,
} from "@/http/controllers/organization.controller";
import { ownerMiddleware } from "@/http/middleware/auth.middleware";

export const organizationRoutes = new Hono()
  .get("/", ...getOwnedOrganizations)
  .get("/me", ...getMyOrganizations)
  .post("/", ...createOrganization)
  .post("/:id/select", ...selectOrganization)
  .post("/:id/leave", ...leaveOrganization)
  .get("/:id/owner", ...organizationOwner)
  .delete("/:id", ownerMiddleware, ...deleteOrganization);
