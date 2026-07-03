import { Hono } from "hono";
import {
  addFinanceEmail,
  createOrganization,
  deleteFinanceEmail,
  deleteOrganization,
  getFinanceEmails,
  getMyOrganizations,
  getOrganizationSlackSettings,
  getOwnedOrganizations,
  leaveOrganization,
  organizationOwner,
  selectOrganization,
  updateOrganizationSlackSettings,
} from "@/http/controllers/organization.controller";
import { ownerMiddleware } from "@/http/middleware/auth.middleware";

export const organizationRoutes = new Hono()
  .get("/", ...getOwnedOrganizations)
  .get("/me", ...getMyOrganizations)
  .get("/slack-settings", ...getOrganizationSlackSettings)
  .post("/", ...createOrganization)
  .post("/:id/select", ...selectOrganization)
  .post("/:id/leave", ...leaveOrganization)
  .get("/:id/owner", ...organizationOwner)
  .delete("/:id", ownerMiddleware, ...deleteOrganization)
  .put("/slack-settings", ownerMiddleware, ...updateOrganizationSlackSettings)
  .get("/:organizationId/finance-emails", ownerMiddleware, ...getFinanceEmails)
  .post("/:organizationId/finance-emails", ownerMiddleware, ...addFinanceEmail)
  .delete(
    "/:organizationId/finance-emails/:financeEmailId",
    ownerMiddleware,
    ...deleteFinanceEmail,
  );
