'use server';

import { db } from "@/db";
import { invitations, users } from "@/db/schema/schema";
import { sendEmail } from "@/lib/email";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const schema = z.object({
  email: z.email(),
  role: z.enum(["OWNER", "COLLABORATOR"]).default("COLLABORATOR"),
});

export const inviteUserAction = async (input: { email: string; role?: "OWNER" | "COLLABORATOR" }) => {
  try {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
      return {
        error: "Invalid input",
        success: false
      };
    }

    const { email, role } = parsed.data;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return {
        error: "User already exists",
        success: false
      };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    await db.insert(invitations)
      .values({
        email,
        token,
        role,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: invitations.email,
        set: {
          token,
          role,
          expiresAt,
          createdAt: new Date(),
        },
      });

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
    console.log("Invitation sent successfully");

    return {
      message: "Invitation sent successfully",
      success: true
    };
  } catch (error) {
    console.error("Invitation error:", error);
    return {
      error: "Something went wrong",
      success: false
    };
  }
}
