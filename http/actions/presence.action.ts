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
import { wrapActionsWithSentry } from "../utils/wrap-with-sentry/wrap-actions-with-sentry";
import { getCurrentUser } from "./get-current-user.action";

export const checkTodayPresenceAction = async (): Promise<Presence | null> => {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;

  return await presenceRepository.findPresenceByUserIdAndDate(
    user.id,
    user.organizationId,
    getISODate(),
  );
};

export const markPresenceAction = async (
  input: MarkPresenceInput,
): Promise<ActionResponse & { data?: Presence }> => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId)
      return { error: "Unauthorized", success: false };

    const parsed = markPresenceSchema.safeParse({
      ...input,
      organizationId: user.organizationId,
    });
    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const presence = await presenceRepository.markPresence(
      user.id,
      user.organizationId,
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

const actions = {
  checkTodayPresenceAction,
  markPresenceAction,
};

export const presenceActions = wrapActionsWithSentry(
  actions as Record<string, (...args: unknown[]) => Promise<unknown>>,
);
