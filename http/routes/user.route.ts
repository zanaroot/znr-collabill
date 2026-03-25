import { Hono } from "hono";
import {
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
} from "@/http/controllers/user.controller";
import {
  adminMiddleware,
  ownerMiddleware,
} from "@/http/middleware/auth.middleware";

export const userRoutes = new Hono()
  .get("/me", ...getMe)
  .patch("/me", ...updateMe)
  .get("/all", ...getUsers)
  .get("/invitations", ...getInvitations)
  .post(
    "/invitations/:id/resend",
    ownerMiddleware,
    adminMiddleware,
    ...resendInvitation,
  )
  .delete(
    "/invitations/:id",
    ownerMiddleware,
    adminMiddleware,
    ...revokeInvitation,
  )
  .delete("/:id", ownerMiddleware, adminMiddleware, ...removeUser)
  .patch(
    "/:id/role",
    ownerMiddleware,
    adminMiddleware,
    ...updateUserRoleHandler,
  )
  .get("/:id/rates", ...getCollaboratorRateHandler)
  .patch(
    "/:id/rates",
    ownerMiddleware,
    adminMiddleware,
    ...updateCollaboratorRateHandler,
  );
