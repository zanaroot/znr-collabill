import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import * as leaveRepository from "@/http/repositories/leave.repository";
import {
  createLeaveRequestSchema,
  organizationLeaveSettingsSchema,
  updateLeaveRequestStatusSchema,
} from "../models/leave.model";

const factory = createFactory<AuthEnv>();

export const getMyLeaveRequests = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user.organizationId)
    return c.json({ error: "No organization found" }, 404);

  const requests = await leaveRepository.findLeaveRequestsByUserId(
    user.id,
    user.organizationId,
  );
  return c.json(requests);
});

export const getOrgLeaveRequests = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user.organizationId)
    return c.json({ error: "No organization found" }, 404);

  // Authorization check (Admin/Owner only)
  if (user.organizationRole === "COLLABORATOR") {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const requests = await leaveRepository.findLeaveRequestsByOrganizationId(
    user.organizationId,
  );
  return c.json(requests);
});

export const createLeaveRequest = factory.createHandlers(
  zValidator("json", createLeaveRequestSchema),
  async (c) => {
    const user = c.get("user");
    if (!user.organizationId)
      return c.json({ error: "No organization found" }, 404);

    const data = c.req.valid("json");

    // Check overlaps
    const overlapping = await leaveRepository.checkOverlappingRequests(
      user.id,
      user.organizationId,
      data.startDate,
      data.endDate,
    );

    if (overlapping) {
      return c.json({ error: "Overlapping leave request already exists" }, 400);
    }

    const request = await leaveRepository.createLeaveRequest(
      user.id,
      user.organizationId,
      data,
    );

    return c.json(request, 201);
  },
);

export const updateLeaveRequestStatus = factory.createHandlers(
  zValidator("json", updateLeaveRequestStatusSchema),
  async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const { status } = c.req.valid("json");

    if (!id) return c.json({ error: "Leave request ID is required" }, 400);

    if (!user.organizationId)
      return c.json({ error: "No organization found" }, 404);

    // Authorization check
    if (user.organizationRole === "COLLABORATOR") {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const existingRequest = await leaveRepository.findLeaveRequestById(id);
    if (!existingRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const request = await leaveRepository.updateLeaveRequestStatus(
      id,
      status,
      user.id,
    );

    return c.json(request);
  },
);

export const updateOrgSettings = factory.createHandlers(
  zValidator("json", organizationLeaveSettingsSchema),
  async (c) => {
    const user = c.get("user");
    if (!user.organizationId)
      return c.json({ error: "No organization found" }, 404);

    // Authorization check
    if (
      user.organizationRole !== "OWNER" &&
      user.organizationRole !== "ADMIN"
    ) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const data = c.req.valid("json");
    const org = await leaveRepository.updateOrganizationLeaveSettings(
      user.organizationId,
      data,
    );

    return c.json(org);
  },
);

export const getOrgSettings = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user.organizationId)
    return c.json({ error: "No organization found" }, 404);

  const { getOrganizationById } = await import(
    "@/http/repositories/organization.repository"
  );
  const org = await getOrganizationById(user.organizationId);

  return c.json(org);
});

export const getMyBalance = factory.createHandlers(async (c) => {
  const user = c.get("user");
  const monthStr = c.req.query("month");
  const yearStr = c.req.query("year");

  if (!user.organizationId)
    return c.json({ error: "No organization found" }, 404);

  const now = new Date();
  const month = monthStr ? Number(monthStr) : now.getMonth() + 1;
  const year = yearStr ? Number(yearStr) : now.getFullYear();

  const balance = await leaveRepository.findLeaveBalance(
    user.id,
    user.organizationId,
    month,
    year,
  );

  return c.json(balance || { balance: "0", used: "0", remaining: "0" });
});
