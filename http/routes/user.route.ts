import { Hono } from "hono";
import {
  getInvitations,
  getMe,
  getUsers,
  removeUser,
  revokeInvitation,
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
  .patch("/:id/role", ...updateUserRoleHandler);
