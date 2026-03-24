import { Hono } from "hono";
import {
  getCollaboratorRateHandler,
  getInvitations,
  getMe,
  getUsers,
  removeUser,
  revokeInvitation,
  updateCollaboratorRateHandler,
  updateMe,
  updateUserRoleHandler,
} from "@/http/controllers/user.controller";

export const userRoutes = new Hono()
  .get("/me", ...getMe)
  .patch("/me", ...updateMe)
  .get("/all", ...getUsers)
  .get("/invitations", ...getInvitations)
  .delete("/invitations/:id", ...revokeInvitation)
  .delete("/:id", ...removeUser)
  .patch("/:id/role", ...updateUserRoleHandler)
  .get("/:id/rates", ...getCollaboratorRateHandler)
  .patch("/:id/rates", ...updateCollaboratorRateHandler);
