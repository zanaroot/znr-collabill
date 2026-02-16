import { Hono } from "hono";
import {
  getInvitations,
  getMe,
  getUsers,
  removeUser,
  revokeInvitation,
  updateUserRoleHandler,
} from "@/http/controllers/user.controller";

export const userRoutes = new Hono()
  .get("/me", ...getMe)
  .get("/all", ...getUsers)
  .get("/invitations", ...getInvitations)
  .delete("/invitations/:id", ...revokeInvitation)
  .delete("/:id", ...removeUser)
  .patch("/:id/role", ...updateUserRoleHandler);
