import { Hono } from "hono";
import {
  deleteOrganization,
  getOwnedOrganizations,
  organizationOwner,
} from "@/http/controllers/organization.controller";

export const organizationRoutes = new Hono()
  .get("/", ...getOwnedOrganizations)
  .get("/:id/owner", ...organizationOwner)
  .delete("/:id", ...deleteOrganization);
