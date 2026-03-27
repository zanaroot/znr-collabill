import { Hono } from "hono";
import {
  acceptInvitationHandler,
  createPassword,
  declineInvitationHandler,
  getInvitation,
} from "@/http/controllers/invitation.controller";

export const publicInvitationRoutes = new Hono()
  .get("/:token", ...getInvitation)
  .post("/:token/accept", ...acceptInvitationHandler)
  .post("/:token/decline", ...declineInvitationHandler)
  .post("/create-password", ...createPassword);
