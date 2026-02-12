'use server';

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema/schema";
import { sendEmail } from "@/lib/email";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const schema = z.object({
  email: z.email(),
});

export const forgotPasswordAction = async (input: { email: string }) => {
  try {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
      return {
        error: "Invalid email",
        success: false
      };
    }

    const validatedEmail = parsed.data.email;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedEmail))
      .limit(1);

    if (!user) {
      return {
        message: "If an account exists, an email has been sent.",
        success: true
      };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    await sendEmail({
      to: validatedEmail,
      subject: "Reset your password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    return {
      message: "If an account exists, an email has been sent.",
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