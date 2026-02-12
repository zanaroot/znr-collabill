"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { ActionResponse, SignInInput } from "@/http/models/auth.model";
import { signInSchema } from "@/http/models/auth.model";
import {
  createSession,
  deleteSessionByToken,
} from "@/http/repositories/session.repository";
import { findUserByEmail } from "@/http/repositories/user.repository";
import { generateSessionToken, getSessionExpirationDate } from "@/lib/session";

export const signInAction = async (
  input: SignInInput,
): Promise<ActionResponse> => {
  try {
    const parsed = signInSchema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return { error: "User not found", success: false };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return { error: "Invalid password", success: false };
    }

    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpirationDate(7);

    await createSession({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    const cookieStore = await cookies();
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return { message: "Sign in successful", success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const logoutAction = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    await deleteSessionByToken(token);
  }

  cookieStore.delete("session_token");
};
