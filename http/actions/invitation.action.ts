import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { logAudit } from "@/http/actions/audit.action";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import type { ActionResponse } from "@/http/models/auth.model";
import type {
  CreatePasswordInput,
  InviteUserInput,
} from "@/http/models/invitation.model";
import {
  createPasswordSchema,
  inviteUserSchema,
} from "@/http/models/invitation.model";
import {
  acceptInvitation,
  createUserFromInvitation,
  deleteInvitationById,
  findInvitationById,
  findPendingInvitation,
  findValidInvitationByToken,
  refreshInvitationToken,
  upsertInvitation,
} from "@/http/repositories/invitation.repository";
import {
  getOrganizationById,
  isUserInOrganization,
} from "@/http/repositories/organization.repository";
import { findUserByEmail } from "@/http/repositories/user.repository";
import { invitationContent } from "@/http/ressources/invitation-content";
import { sendEmail } from "@/packages/email";
import { wrapActionsWithSentry } from "../utils/wrap-with-sentry/wrap-actions-with-sentry";

export const inviteUserAction = async (
  input: InviteUserInput,
): Promise<ActionResponse> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { error: "Unauthorized", success: false };
    }

    if (
      currentUser.organizationRole !== "OWNER" &&
      currentUser.organizationRole !== "ADMIN"
    ) {
      return { error: "Forbidden", success: false };
    }

    const organizationId = currentUser.organizationId;

    if (!organizationId) {
      return { error: "No organization found", success: false };
    }

    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return { error: "Organization not found", success: false };
    }

    const parsed = inviteUserSchema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid input", success: false };
    }

    const { email, role } = parsed.data;

    // 1. Check if user is already a member of the target organization
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      const isMember = await isUserInOrganization(
        organizationId,
        existingUser.id,
      );
      if (isMember) {
        return {
          error: "User is already a member of this organization",
          success: false,
        };
      }
    }

    // 2. Check if there is an existing pending invitation for this organization and email
    const pendingInvite = await findPendingInvitation(organizationId, email);
    if (pendingInvite) {
      return {
        error: "An invitation for this user is already pending",
        success: false,
      };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await upsertInvitation({ email, token, role, expiresAt, organizationId });

    await sendEmail({
      to: email,
      subject: `You've been invited to join ${organization.name} on Collabill`,
      html: invitationContent({
        currentUserName: currentUser.name,
        organizationName: organization.name,
        role,
        invitationToken: token,
      }),
    });

    await logAudit({
      organizationId,
      actorId: currentUser.id,
      action: "CREATE",
      entity: "INVITATION",
      metadata: { email, role },
    });

    return { message: "Invitation sent successfully", success: true };
  } catch (error) {
    console.error("Invitation error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const createPasswordAction = async (
  input: CreatePasswordInput,
): Promise<ActionResponse> => {
  try {
    const parsed = createPasswordSchema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const { token, name, password } = parsed.data;
    const invitation = await findValidInvitationByToken(token);

    if (!invitation) {
      return { error: "Invalid or expired invitation token", success: false };
    }

    if (!invitation.organizationId) {
      return {
        error: "Invalid invitation: missing organization",
        success: false,
      };
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
      return {
        error: "A user with this email already exists",
        success: false,
      };
    }

    return { message: "Account created successfully", success: true };
  } catch (error) {
    console.error("Create password error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const getInvitationByToken = async (token: string) => {
  try {
    const invitation = await findValidInvitationByToken(token);
    if (!invitation) return null;

    const existingUser = await findUserByEmail(invitation.email);

    return {
      ...invitation,
      exists: !!existingUser,
    };
  } catch (error) {
    console.error("Get invitation by token error:", error);
    return null;
  }
};

export const acceptInvitationAction = async (
  token: string,
): Promise<ActionResponse> => {
  try {
    const invitation = await findValidInvitationByToken(token);

    if (!invitation || !invitation.organizationId) {
      return { error: "Invalid or expired invitation token", success: false };
    }

    const existingUser = await findUserByEmail(invitation.email);

    if (!existingUser) {
      return { error: "User not found", success: false };
    }

    await acceptInvitation({
      userId: existingUser.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
      invitationId: invitation.id,
    });

    await logAudit({
      organizationId: invitation.organizationId,
      actorId: existingUser.id,
      action: "CREATE",
      entity: "USER",
      entityId: existingUser.id,
      metadata: { email: invitation.email, role: invitation.role },
    });

    return { message: "Invitation accepted successfully", success: true };
  } catch (error) {
    console.error("Accept invitation error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const declineInvitationAction = async (
  token: string,
): Promise<ActionResponse> => {
  try {
    const invitation = await findValidInvitationByToken(token);

    if (!invitation) {
      return { error: "Invalid or expired invitation token", success: false };
    }

    const existingUser = await findUserByEmail(invitation.email);

    await deleteInvitationById(invitation.id);

    if (existingUser && invitation.organizationId) {
      await logAudit({
        organizationId: invitation.organizationId,
        actorId: existingUser.id,
        action: "DELETE",
        entity: "INVITATION",
        metadata: { email: invitation.email },
      });
    }

    return { message: "Invitation declined successfully", success: true };
  } catch (error) {
    console.error("Decline invitation error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const resendInvitationAction = async (
  invitationId: string,
): Promise<ActionResponse> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { error: "Unauthorized", success: false };
    }

    if (
      currentUser.organizationRole !== "OWNER" &&
      currentUser.organizationRole !== "ADMIN"
    ) {
      return { error: "Forbidden", success: false };
    }

    const organizationId = currentUser.organizationId;

    if (!organizationId) {
      return { error: "No organization found", success: false };
    }

    const invitation = await findInvitationById(invitationId);

    if (!invitation) {
      return { error: "Invitation not found", success: false };
    }

    if (invitation.organizationId !== organizationId) {
      return { error: "Forbidden", success: false };
    }

    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return { error: "Organization not found", success: false };
    }

    if (invitation.expiresAt && invitation.expiresAt <= new Date()) {
      const newToken = uuidv4();
      const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      await refreshInvitationToken(invitationId, newToken, newExpiresAt);
      invitation.token = newToken;
      invitation.expiresAt = newExpiresAt;
    }

    await sendEmail({
      to: invitation.email,
      subject: `You're invited to join ${organization.name} on Collabill`,
      html: invitationContent({
        currentUserName: currentUser.name,
        organizationName: organization.name,
        role: invitation.role,
        invitationToken: invitation.token,
      }),
    });

    return { message: "Invitation resent successfully", success: true };
  } catch (error) {
    console.error("Resend invitation error:", error);
    return { error: "Something went wrong", success: false };
  }
};

const actions = {
  inviteUserAction,
  createPasswordAction,
  getInvitationByToken,
  acceptInvitationAction,
  declineInvitationAction,
  resendInvitationAction,
};

export const invitationActions = wrapActionsWithSentry(
  actions as Record<string, (...args: unknown[]) => Promise<unknown>>,
);
