import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createFactory } from "hono/factory";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { AuthEnv } from "@/http/models/auth.model";
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
import { sendEmail } from "@/packages/email";

import { publicEnv } from "@/packages/env";
import { wrapControllerWithSentry } from "../utils/wrap-with-sentry/wrap-controller-with-sentry";

const appUrl = publicEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const factory = createFactory<AuthEnv>();

export const forgotPassword = factory.createHandlers(
  zValidator("json", forgotPasswordSchema),
  async (c) => {
    try {
      const { email } = c.req.valid("json");
      const user = await findUserByEmail(email);

      if (!user) {
        return c.json({
          message: "If an account exists, an email has been sent.",
          success: true,
        });
      }

      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      await createPasswordResetToken({ userId: user.id, token, expiresAt });

      const resetLink = `${appUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: email,
        subject: "Reset your password",
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
      });

      return c.json({
        message: "If an account exists, an email has been sent.",
        success: true,
      });
    } catch (error) {
      console.error("Password reset error:", error);
      return c.json({ error: "Something went wrong", success: false }, 500);
    }
  },
);

export const resetPassword = factory.createHandlers(
  zValidator("json", resetPasswordSchema),
  async (c) => {
    try {
      const { token, password } = c.req.valid("json");
      const resetToken = await findValidResetToken(token);

      if (!resetToken) {
        return c.json(
          { error: "Invalid or expired token", success: false },
          400,
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db
        .update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.id, resetToken.userId));

      await deleteResetTokenById(resetToken.id);

      return c.json({
        message: "Password updated successfully",
        success: true,
      });
    } catch (error) {
      console.error("Password reset error:", error);
      return c.json({ error: "Something went wrong", success: false }, 500);
    }
  },
);

const controllers = {
  forgotPassword,
  resetPassword,
};

export const passwordControllers = wrapControllerWithSentry(controllers, {
  layerName: "password-controller",
});
