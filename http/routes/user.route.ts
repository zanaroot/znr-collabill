import { Hono } from "hono";
import {
  createInvitation,
  getCollaboratorRateHandler,
  getInvitations,
  getMe,
  getUsers,
  removeUser,
  resendInvitation,
  revokeInvitation,
  updateCollaboratorRateHandler,
  updateMe,
  updateUserRoleHandler,
  uploadAvatar,
} from "@/http/controllers/user.controller";
import {
  adminMiddleware,
  ownerMiddleware,
} from "@/http/middleware/auth.middleware";

export const userRoutes = new Hono()
  .get("/me", ...getMe)
  .patch("/me", ...updateMe)
  .post("/me/avatar", ...uploadAvatar)
  .get("/all", ...getUsers)
  .get("/invitations", ...getInvitations)
  .post("/invitations", adminMiddleware, ...createInvitation)
  .post("/invitations/:id/resend", adminMiddleware, ...resendInvitation)
  .delete("/invitations/:id", ownerMiddleware, ...revokeInvitation)
  .delete("/:id", ownerMiddleware, ...removeUser)
  .patch("/:id/role", ownerMiddleware, ...updateUserRoleHandler)
  .get("/:id/rates", ...getCollaboratorRateHandler)
  .patch("/:id/rates", ownerMiddleware, ...updateCollaboratorRateHandler);
