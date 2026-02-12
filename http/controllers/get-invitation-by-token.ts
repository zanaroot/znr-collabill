"use server";

import { db } from "@/db";
import { invitations } from "@/db/schema/schema";
import { and, eq, gt } from "drizzle-orm";

export const getInvitationByToken = async (token: string) => {
  try {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return invitation;
  } catch (error) {
    console.error("Get invitation by token error:", error);
    return null;
  }
};
