import { Hono } from "hono";
import * as leaveController from "@/http/controllers/leave.controller";

export const leaveRoutes = new Hono()
  .get("/my", ...leaveController.getMyLeaveRequests)
  .get("/org", ...leaveController.getOrgLeaveRequests)
  .get("/balance", ...leaveController.getMyBalance)
  .post("/", ...leaveController.createLeaveRequest)
  .patch("/:id/status", ...leaveController.updateLeaveRequestStatus)
  .get("/settings", ...leaveController.getOrgSettings)
  .patch("/settings", ...leaveController.updateOrgSettings);
