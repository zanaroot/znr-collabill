"use server";

import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/http/models/auth.model";
import {
  type MarkPresenceInput,
  markPresenceSchema,
  type Presence,
} from "@/http/models/presence.model";
import * as presenceRepository from "@/http/repositories/presence.repository";
import { getISODate } from "@/lib/date";
import { getCurrentUser } from "./get-current-user";

export const checkTodayPresenceAction = async (): Promise<Presence | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  return await presenceRepository.findPresenceByUserIdAndDate(
    user.id,
    getISODate(),
  );
};

export const markPresenceAction = async (
  input: MarkPresenceInput,
): Promise<ActionResponse & { data?: Presence }> => {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized", success: false };

    const parsed = markPresenceSchema.safeParse(input);
    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const presence = await presenceRepository.markPresence(
      user.id,
      parsed.data.status,
      parsed.data.date,
    );

    revalidatePath("/", "layout");
    return { success: true, data: presence };
  } catch (error) {
    console.error("Mark presence error:", error);
    return { error: "Something went wrong", success: false };
  }
};
