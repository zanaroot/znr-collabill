import { Hono } from "hono";
import {
  deleteOrganization,
  getOwnedOrganizations,
} from "@/http/controllers/organization.controller";

export const organizationRoutes = new Hono()
  .get("/", ...getOwnedOrganizations)
  .delete("/:id", ...deleteOrganization);
