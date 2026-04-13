import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import { createPasswordSchema } from "@/http/models/invitation.model";
import {
  acceptInvitation,
  createUserFromInvitation,
  deleteInvitationById,
  findValidInvitationByToken,
} from "@/http/repositories/invitation.repository";
import { findUserByEmail } from "@/http/repositories/user.repository";
import { wrapControllerWithSentry } from "../utils/wrap-with-sentry/wrap-controller-with-sentry";

const factory = createFactory<AuthEnv>();

export const getInvitation = factory.createHandlers(async (c) => {
  const token = c.req.param("token");
  if (!token) return c.json({ error: "Token required" }, 400);

  const invitation = await findValidInvitationByToken(token);
  if (!invitation)
    return c.json({ error: "Invalid or expired invitation token" }, 404);

  const existingUser = await findUserByEmail(invitation.email);

  return c.json({
    ...invitation,
    exists: !!existingUser,
  });
});

export const createPassword = factory.createHandlers(
  zValidator("json", createPasswordSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const { token, name, password } = payload;

    const invitation = await findValidInvitationByToken(token);
    if (!invitation) {
      return c.json({ error: "Invalid or expired invitation token" }, 400);
    }

    if (!invitation.organizationId) {
      return c.json({ error: "Invalid invitation: missing organization" }, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await createUserFromInvitation({
      email: invitation.email,
      name,
      passwordHash: hashedPassword,
      role: invitation.role,
      invitationId: invitation.id,
      organizationId: invitation.organizationId,
    });

    if (!newUser) {
      return c.json({ error: "A user with this email already exists" }, 400);
    }

    return c.json({ message: "Account created successfully" }, 201);
  },
);

export const acceptInvitationHandler = factory.createHandlers(async (c) => {
  const token = c.req.param("token");
  if (!token) return c.json({ error: "Token required" }, 400);

  const invitation = await findValidInvitationByToken(token);
  if (!invitation || !invitation.organizationId) {
    return c.json({ error: "Invalid or expired invitation token" }, 400);
  }

  const existingUser = await findUserByEmail(invitation.email);
  if (!existingUser) {
    return c.json({ error: "User not found" }, 404);
  }

  await acceptInvitation({
    userId: existingUser.id,
    organizationId: invitation.organizationId,
    role: invitation.role,
    invitationId: invitation.id,
  });

  return c.json({ message: "Invitation accepted successfully" });
});

export const declineInvitationHandler = factory.createHandlers(async (c) => {
  const token = c.req.param("token");
  if (!token) return c.json({ error: "Token required" }, 400);

  const invitation = await findValidInvitationByToken(token);
  if (!invitation) {
    return c.json({ error: "Invalid or expired invitation token" }, 400);
  }

  await deleteInvitationById(invitation.id);

  return c.json({ message: "Invitation declined successfully" });
});

const controllers = {
  getInvitation,
  createPassword,
  acceptInvitationHandler,
  declineInvitationHandler,
};

export const invitationControllers = wrapControllerWithSentry(controllers, {
  layerName: "invitation-controller",
});
