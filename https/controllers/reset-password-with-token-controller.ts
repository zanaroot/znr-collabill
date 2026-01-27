'use server';

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema/schema";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export type ResetPasswordTokenResponse = {
  message?: string;
  error?: string;
  success: boolean;
};

export const resetPasswordWithTokenAction = async (input: { token: string; password: string }): Promise<ResetPasswordTokenResponse> => {
  try {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
      return {
        error: "Invalid data",
        success: false
      };
    }

    const { token, password } = parsed.data;

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetToken) {
      return {
        error: "Invalid or expired token",
        success: false
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.id, resetToken.userId));

    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));

    return {
      message: "Password updated successfully",
      success: true
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      error: "Something went wrong",
      success: false
    };
  }
}