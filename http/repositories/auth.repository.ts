"server only";

import { db } from "@/db";
import { sessions } from "@/db/schema/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export const logout = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (sessionToken) {
    // Delete the session from the database
    await db
      .delete(sessions)
      .where(eq(sessions.token, sessionToken));

    // Clear the session cookie
    cookieStore.delete("session_token", { path: "/" });
  }
};