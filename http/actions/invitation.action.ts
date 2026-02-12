"use server";

import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getCurrentUser } from "@/http/actions/get-current-user";
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
  createUserFromInvitation,
  findValidInvitationByToken,
  upsertInvitation,
} from "@/http/repositories/invitation.repository";
import {
  findUserByEmail,
  hasUserRole,
} from "@/http/repositories/user.repository";
import { sendEmail } from "@/lib/email";

export const inviteUserAction = async (
  input: InviteUserInput,
): Promise<ActionResponse> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { error: "Unauthorized", success: false };
    }

    const isOwner = await hasUserRole(currentUser.id, "OWNER");

    if (!isOwner) {
      return { error: "Forbidden", success: false };
    }

    const parsed = inviteUserSchema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid input", success: false };
    }

    const { email, role } = parsed.data;
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return { error: "User already exists", success: false };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await upsertInvitation({ email, token, role, expiresAt });

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/create-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "You've been invited to Collabill",
      html: `
        <p>You have been invited to join Collabill as a ${role}.</p>
        <p>Click <a href="${inviteLink}">here</a> to create your account and set your password.</p>
        <p>This link will expire in 7 days.</p>
      `,
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await createUserFromInvitation({
      email: invitation.email,
      name,
      passwordHash: hashedPassword,
      role: invitation.role,
      invitationId: invitation.id,
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
    return await findValidInvitationByToken(token);
  } catch (error) {
    console.error("Get invitation by token error:", error);
    return null;
  }
};
