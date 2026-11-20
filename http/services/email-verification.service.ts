"server only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import { sendEmail } from "@/packages/email";

export const RESEND_COOLDOWN_SECONDS = 60;

const TOKEN_EXPIRATION_MINUTES = 30;

type VerificationUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: Date | null;
};

type VerifyEmailStatus = "verified" | "expired" | "invalid";

type IssueVerificationResult =
  | { status: "sent" }
  | { status: "cooldown" }
  | { status: "already-verified" };

export class EmailVerificationUnavailableError extends Error {
  constructor(message = "Email verification is temporarily unavailable.") {
    super(message);
    this.name = "EmailVerificationUnavailableError";
  }
}

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

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });

const getAppUrl = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    console.error("NEXT_PUBLIC_APP_URL is not configured.");

    throw new EmailVerificationUnavailableError();
  }

  return appUrl;
};

const buildVerificationEmail = (user: VerificationUser, token: string) => {
  const verificationUrl = new URL("/verify-email", getAppUrl());
  verificationUrl.searchParams.set("token", token);

  return {
    subject: "Verify your Collabill email address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Hello ${escapeHtml(user.name ?? "")},</p>
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
  };
};

export const issueEmailVerification = async (
  user: VerificationUser,
): Promise<IssueVerificationResult> => {
  if (user.emailVerified) {
    return { status: "already-verified" };
  }

  getAppUrl();

  const { token, tokenHash, expiresAt } = generateVerificationToken();
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    // Serialize concurrent token issuance for the same user so the cooldown
    // cannot be bypassed and only one token stays active at a time.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);

    const [recentVerification] = await tx
      .select({ id: emailVerifications.id })
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.userId, user.id),
          gt(
            emailVerifications.createdAt,
            new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
          ),
        ),
      )
      .limit(1);

    if (recentVerification) {
      return { status: "cooldown" as const };
    }

    await tx
      .delete(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));

    await tx.insert(emailVerifications).values({
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
      createdAt: now,
    });

    return { status: "sent" as const };
  });

  if (result.status !== "sent") {
    return result;
  }

  const email = buildVerificationEmail(user, token);

  try {
    await sendEmail({
      to: user.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (error) {
    await db
      .delete(emailVerifications)
      .where(eq(emailVerifications.tokenHash, tokenHash));

    throw error;
  }

  return { status: "sent" };
};

export const verifyEmailToken = async (
  token: string,
): Promise<VerifyEmailStatus> => {
  const tokenHash = hashVerificationToken(token);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [verification] = await tx
      .delete(emailVerifications)
      .where(eq(emailVerifications.tokenHash, tokenHash))
      .returning({
        userId: emailVerifications.userId,
        email: emailVerifications.email,
        expiresAt: emailVerifications.expiresAt,
      });

    if (!verification?.email) {
      return "invalid";
    }

    if (verification.expiresAt <= now) {
      return "expired";
    }

    const [updated] = await tx
      .update(users)
      .set({ emailVerified: now })
      .where(
        and(
          eq(users.id, verification.userId),
          eq(users.email, verification.email),
          isNull(users.emailVerified),
        ),
      )
      .returning({ id: users.id });

    if (updated) {
      return "verified";
    }

    const [currentUser] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, verification.userId))
      .limit(1);

    return currentUser?.email === verification.email ? "verified" : "invalid";
  });
};
