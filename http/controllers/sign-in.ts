"use server";

import { db } from "@/db";
import { sessions, users } from "@/db/schema/schema";
import { generateSessionToken, getSessionExpirationDate } from "@/lib/session";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type SignInResponse = {
  message?: string;
  error?: string;
  success: boolean;
};

export const signInAction = async (input: {
  email: string;
  password: string;
}): Promise<SignInResponse> => {
  try {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { error: "User not found", success: false };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return { error: "Invalid password", success: false };
    }

    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpirationDate(7);

    await db.insert(sessions).values({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    const cookieStore = cookies();
    (await cookieStore).set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return {
      message: "Sign in successful",
      success: true,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "Something went wrong", success: false };
  }
};
