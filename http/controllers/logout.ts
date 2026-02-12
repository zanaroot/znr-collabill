"use server";

import { db } from "@/db";
import { sessions } from "@/db/schema/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export const logoutAction = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  cookieStore.delete("session_token");
};
