import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { createFactory } from "hono/factory";
import { db } from "@/db";
import { emailVerifications, userRoles, users } from "@/db/schema";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { sendEmail } from "@/packages/email";

const TOKEN_EXPIRATION_MINUTES = 30;
const RESEND_COOLDOWN_SECONDS = 60;

const generateVerificationToken = () => {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  return {
    token,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000),
  };
};

const hashVerificationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const getVerificationResultUrl = (
  requestUrl: string,
  status: "verified" | "expired" | "invalid",
) => {
  const url = new URL("/verify-email", requestUrl);
  url.searchParams.set("status", status);

  return url.toString();
};

export const sendEmailVerification = createFactory().createHandlers(
  authMiddleware,
  async (c: Context) => {
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

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, authenticatedUser.id),
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

      if (user.emailVerified) {
        return c.json({
          success: true,
          message: "Your email address is already verified.",
        });
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL;

      if (!appUrl) {
        console.error("NEXT_PUBLIC_APP_URL is not configured.");

        return c.json(
          {
            success: false,
            error: "Email verification is temporarily unavailable.",
          },
          500,
        );
      }

      const recentVerification = await db.query.emailVerifications.findFirst({
        where: and(
          eq(emailVerifications.userId, user.id),
          gt(
            emailVerifications.createdAt,
            new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
          ),
        ),
        columns: {
          id: true,
        },
      });

      if (recentVerification) {
        return c.json(
          {
            success: false,
            error: "Please wait 60 seconds before requesting another email.",
          },
          429,
        );
      }

      const { token, tokenHash, expiresAt } = generateVerificationToken();

      await db
        .delete(emailVerifications)
        .where(eq(emailVerifications.userId, user.id));

      await db.insert(emailVerifications).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const verificationUrl = new URL(
        "/api/auth/email-verification/verify",
        appUrl,
      );
      verificationUrl.searchParams.set("token", token);

      try {
        await sendEmail({
          to: user.email,
          subject: "Verify your Collabill email address",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Verify your email address</h2>
              <p>Hello ${user.name ?? ""},</p>
              <p>Please click the button below to verify your email address.</p>
              <p>
                <a
                  href="${verificationUrl.toString()}"
                  style="display: inline-block; padding: 12px 20px; background: #1677ff; color: #ffffff; text-decoration: none; border-radius: 6px;"
                >
                  Verify my email
                </a>
              </p>
              <p>This link expires in ${TOKEN_EXPIRATION_MINUTES} minutes and can only be used once.</p>
              <p>If you did not create this account, you can ignore this email.</p>
            </div>
          `,
          text: [
            "Verify your Collabill email address",
            "",
            `Hello ${user.name ?? ""},`,
            "",
            "Open this link to verify your email:",
            verificationUrl.toString(),
            "",
            `The link expires in ${TOKEN_EXPIRATION_MINUTES} minutes and can only be used once.`,
          ].join("\n"),
        });
      } catch (error) {
        await db
          .delete(emailVerifications)
          .where(eq(emailVerifications.tokenHash, tokenHash));

        throw error;
      }

      return c.json({
        success: true,
        message: "Verification email sent successfully.",
      });
    } catch (error) {
      console.error("Failed to send verification email:", error);

      return c.json(
        {
          success: false,
          error:
            "Unable to send the verification email. Please try again later.",
        },
        500,
      );
    }
  },
);

export const verifyEmail = createFactory().createHandlers(
  async (c: Context) => {
    const token = c.req.query("token");

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return c.redirect(getVerificationResultUrl(c.req.url, "invalid"));
    }

    const tokenHash = hashVerificationToken(token);
    const now = new Date();

    try {
      const result = await db.transaction(async (tx) => {
        const [verification] = await tx
          .delete(emailVerifications)
          .where(
            and(
              eq(emailVerifications.tokenHash, tokenHash),
              gt(emailVerifications.expiresAt, now),
            ),
          )
          .returning({
            userId: emailVerifications.userId,
          });

        if (!verification) {
          return "not-found" as const;
        }

        await tx
          .update(users)
          .set({ emailVerified: now })
          .where(
            and(eq(users.id, verification.userId), isNull(users.emailVerified)),
          );

        return "verified" as const;
      });

      if (result === "verified") {
        return c.redirect(getVerificationResultUrl(c.req.url, "verified"));
      }

      const existingVerification = await db.query.emailVerifications.findFirst({
        where: eq(emailVerifications.tokenHash, tokenHash),
        columns: {
          expiresAt: true,
        },
      });

      if (existingVerification && existingVerification.expiresAt <= now) {
        await db
          .delete(emailVerifications)
          .where(eq(emailVerifications.tokenHash, tokenHash));

        return c.redirect(getVerificationResultUrl(c.req.url, "expired"));
      }

      return c.redirect(getVerificationResultUrl(c.req.url, "invalid"));
    } catch (error) {
      console.error("Failed to verify email:", error);

      return c.redirect(getVerificationResultUrl(c.req.url, "invalid"));
    }
  },
);

export const sendMemberEmailVerification = createFactory().createHandlers(
  authMiddleware,
  async (c: Context) => {
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

    if (
      authenticatedUser.organizationRole !== "OWNER" &&
      authenticatedUser.organizationRole !== "ADMIN"
    ) {
      return c.json(
        {
          success: false,
          error: "You are not allowed to verify another member's email.",
        },
        403,
      );
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
        },
      });

      if (!user) {
        return c.json({ success: false, error: "Member not found." }, 404);
      }

      if (!authenticatedUser.organizationId) {
        return c.json(
          {
            success: false,
            error: "You are not associated with an organization.",
          },
          403,
        );
      }

      const memberRole = await db.query.userRoles.findFirst({
        where: and(
          eq(userRoles.userId, user.id),
          eq(userRoles.organizationId, authenticatedUser.organizationId),
        ),
        columns: {
          userId: true,
        },
      });

      if (!memberRole) {
        return c.json(
          {
            success: false,
            error: "This user does not belong to your organization.",
          },
          403,
        );
      }

      if (user.emailVerified) {
        return c.json({
          success: true,
          message: "This member's email address is already verified.",
        });
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL;

      if (!appUrl) {
        console.error("NEXT_PUBLIC_APP_URL is not configured.");

        return c.json(
          {
            success: false,
            error: "Email verification is temporarily unavailable.",
          },
          500,
        );
      }

      const recentVerification = await db.query.emailVerifications.findFirst({
        where: and(
          eq(emailVerifications.userId, user.id),
          gt(
            emailVerifications.createdAt,
            new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
          ),
        ),
        columns: {
          id: true,
        },
      });

      if (recentVerification) {
        return c.json(
          {
            success: false,
            error: "Please wait 60 seconds before requesting another email.",
          },
          429,
        );
      }

      const { token, tokenHash, expiresAt } = generateVerificationToken();

      await db
        .delete(emailVerifications)
        .where(eq(emailVerifications.userId, user.id));

      await db.insert(emailVerifications).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const verificationUrl = new URL(
        "/api/auth/email-verification/verify",
        appUrl,
      );
      verificationUrl.searchParams.set("token", token);

      try {
        await sendEmail({
          to: user.email,
          subject: "Verify your Collabill email address",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Verify your email address</h2>
              <p>Hello ${user.name ?? ""},</p>
              <p>An organization administrator has requested that you verify your email address.</p>
              <p>
                <a
                  href="${verificationUrl.toString()}"
                  style="display: inline-block; padding: 12px 20px; background: #1677ff; color: #ffffff; text-decoration: none; border-radius: 6px;"
                >
                  Verify my email
                </a>
              </p>
              <p>This link expires in ${TOKEN_EXPIRATION_MINUTES} minutes and can only be used once.</p>
              <p>If you did not expect this email, you can ignore it.</p>
            </div>
          `,
          text: [
            "Verify your Collabill email address",
            "",
            `Hello ${user.name ?? ""},`,
            "",
            "An organization administrator has requested that you verify your email address.",
            "",
            "Open this link to verify your email:",
            verificationUrl.toString(),
            "",
            `The link expires in ${TOKEN_EXPIRATION_MINUTES} minutes and can only be used once.`,
          ].join("\n"),
        });
      } catch (error) {
        await db
          .delete(emailVerifications)
          .where(eq(emailVerifications.tokenHash, tokenHash));

        throw error;
      }

      return c.json({
        success: true,
        message: "Verification email sent successfully to the member.",
      });
    } catch (error) {
      console.error("Failed to send member verification email:", error);

      return c.json(
        {
          success: false,
          error:
            "Unable to send the verification email. Please try again later.",
        },
        500,
      );
    }
  },
);
