"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { ActionResponse } from "@/http/models/auth.model";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/http/models/password.model";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/http/models/password.model";
import {
  createPasswordResetToken,
  deleteResetTokenById,
  findValidResetToken,
} from "@/http/repositories/password-reset.repository";
import { findUserByEmail } from "@/http/repositories/user.repository";
import { sendEmail } from "@/lib/email";

export const forgotPasswordAction = async (
  input: ForgotPasswordInput,
): Promise<ActionResponse> => {
  try {
    const parsed = forgotPasswordSchema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid email", success: false };
    }

    const user = await findUserByEmail(parsed.data.email);

    if (!user) {
      return {
        message: "If an account exists, an email has been sent.",
        success: true,
      };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await createPasswordResetToken({ userId: user.id, token, expiresAt });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    await sendEmail({
      to: parsed.data.email,
      subject: "Reset your password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    return {
      message: "If an account exists, an email has been sent.",
      success: true,
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const resetPasswordWithTokenAction = async (
  input: ResetPasswordInput,
): Promise<ActionResponse> => {
  try {
    const parsed = resetPasswordSchema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const { token, password } = parsed.data;
    const resetToken = await findValidResetToken(token);

    if (!resetToken) {
      return { error: "Invalid or expired token", success: false };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.id, resetToken.userId));

    await deleteResetTokenById(resetToken.id);

    return { message: "Password updated successfully", success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { error: "Something went wrong", success: false };
  }
};
