'use server';

import { db } from "@/db";
import { invitations, userRoles, users } from "@/db/schema/schema";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  name: z.string().min(2),
  password: z.string().min(8),
});

export type CreatePasswordResponse = {
  message?: string;
  error?: string;
  success: boolean;
};

export const createPasswordAction = async (input: {
  token: string;
  name: string;
  password: string;
}): Promise<CreatePasswordResponse> => {
  try {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
      return {
        error: "Invalid data",
        success: false,
      };
    }

    const { token, name, password } = parsed.data;

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          gt(invitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      return {
        error: "Invalid or expired invitation token",
        success: false,
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Use a transaction to ensure both user and role are created, and invitation is deleted
    return await db.transaction(async (tx) => {
      // Check if user already exists (shouldn't happen if invitation logic is correct)
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.email, invitation.email))
        .limit(1);

      if (existingUser) {
        return {
          error: "A user with this email already exists",
          success: false,
        };
      }

      const [newUser] = await tx
        .insert(users)
        .values({
          email: invitation.email,
          name,
          passwordHash: hashedPassword,
        })
        .returning();

      await tx.insert(userRoles).values({
        userId: newUser.id,
        role: invitation.role,
      });

      await tx.delete(invitations).where(eq(invitations.id, invitation.id));

      return {
        message: "Account created successfully",
        success: true,
      };
    });
  } catch (error) {
    console.error("Create password error:", error);
    return {
      error: "Something went wrong",
      success: false,
    };
  }
};
