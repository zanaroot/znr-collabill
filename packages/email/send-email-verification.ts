"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import { generateEmailVerificationToken } from "@/lib/email-verification";
import { sendEmail } from "@/packages/email";
import { serverEnv } from "@/packages/env/server";
import { emailVerificationTemplate } from "./templates/email-verification";

export async function sendUserVerificationEmail(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.emailVerified) {
    return { status: "already_verified" as const };
  }

  const { token, tokenHash, expiresAt } = generateEmailVerificationToken();

  const appUrl = serverEnv.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("Application URL not configured");
  }

  const verificationUrl = new URL("/verify-email", appUrl);
  verificationUrl.searchParams.set("token", token);

  const template = emailVerificationTemplate({
    name: user.name,
    verificationUrl: verificationUrl.toString(),
  });

  await db.transaction(async (tx) => {
    await tx
      .delete(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));

    await tx.insert(emailVerifications).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
  });

  try {
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    await db
      .delete(emailVerifications)
      .where(
        and(
          eq(emailVerifications.userId, user.id),
          eq(emailVerifications.tokenHash, tokenHash),
        ),
      );

    throw error;
  }

  return { status: "sent" as const };
}
