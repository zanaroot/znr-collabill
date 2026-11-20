import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { createFactory } from "hono/factory";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  EmailVerificationUnavailableError,
  issueEmailVerification,
  RESEND_COOLDOWN_SECONDS,
  verifyEmailToken,
} from "@/http/services/email-verification.service";

const factory = createFactory<AuthEnv>();
const publicFactory = createFactory();

const verifyTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i, "Invalid verification token"),
});

const getVerificationPageUrl = (requestUrl: string, token?: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? requestUrl;
  const url = new URL("/verify-email", baseUrl);

  if (token) {
    url.searchParams.set("token", token);
  }

  return url;
};

const sendVerificationEmailForUser = async (c: Context, userId: string) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return c.json({ success: false, error: "User not found." }, 404);
    }

    const result = await issueEmailVerification(user);

    if (result.status === "already-verified") {
      return c.json({
        success: true,
        alreadyVerified: true,
        message: "Your email address is already verified.",
      });
    }

    if (result.status === "cooldown") {
      return c.json(
        {
          success: false,
          error: `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting another email.`,
        },
        429,
      );
    }

    return c.json({
      success: true,
      message: "Verification email sent successfully.",
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);

    if (error instanceof EmailVerificationUnavailableError) {
      return c.json(
        {
          success: false,
          error: "Email verification is temporarily unavailable.",
        },
        500,
      );
    }

    return c.json(
      {
        success: false,
        error: "Unable to send the verification email. Please try again later.",
      },
      500,
    );
  }
};

export const sendEmailVerification = factory.createHandlers(
  authMiddleware,
  async (c) => {
    const authenticatedUser = c.get("user");

    if (!authenticatedUser) {
      return c.json(
        {
          success: false,
          error: "You must be signed in to verify your email.",
        },
        401,
      );
    }

    return sendVerificationEmailForUser(c, authenticatedUser.id);
  },
);

export const sendMemberEmailVerification = factory.createHandlers(
  authMiddleware,
  async (c) => {
    const authenticatedUser = c.get("user");
    const targetUserId = c.req.param("userId");

    if (!authenticatedUser) {
      return c.json(
        {
          success: false,
          error: "You must be signed in to send a verification email.",
        },
        401,
      );
    }

    if (targetUserId !== authenticatedUser.id) {
      return c.json(
        {
          success: false,
          error: "You can only verify your own email address.",
        },
        403,
      );
    }

    return sendVerificationEmailForUser(c, targetUserId);
  },
);

export const verifyEmail = publicFactory.createHandlers(
  zValidator("json", verifyTokenSchema),
  async (c) => {
    const { token } = c.req.valid("json");

    try {
      const status = await verifyEmailToken(token);

      return c.json(
        {
          success: status === "verified",
          status,
        },
        status === "verified" ? 200 : status === "expired" ? 410 : 400,
      );
    } catch (error) {
      console.error("Failed to verify email:", error);

      return c.json({ success: false, status: "invalid" }, 500);
    }
  },
);

// Legacy links pointed at this endpoint. Redirect them to the confirmation page
// instead of consuming the token on a GET request (email scanners follow GETs).
export const redirectToVerifyEmailPage = publicFactory.createHandlers(
  async (c) => {
    const token = c.req.query("token");

    return c.redirect(getVerificationPageUrl(c.req.url, token).toString());
  },
);
