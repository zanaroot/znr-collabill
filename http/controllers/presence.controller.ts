import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  markPresenceSchema,
  type PresenceStatus,
} from "@/http/models/presence.model";
import * as presenceRepository from "@/http/repositories/presence.repository";
import { getISODate } from "@/lib/date";
import { wrapControllerWithSentry } from "../utils/wrap-with-sentry/wrap-controller-with-sentry";

const factory = createFactory<AuthEnv>();

export const getTodayPresence = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user.organizationId)
    return c.json({ error: "No organization found" }, 404);

  const presence = await presenceRepository.findPresenceByUserIdAndDate(
    user.id,
    user.organizationId,
    getISODate(),
  );
  return c.json(presence);
});

export const markPresence = factory.createHandlers(
  zValidator("json", markPresenceSchema.omit({ organizationId: true })),
  async (c) => {
    const user = c.get("user");
    if (!user.organizationId)
      return c.json({ error: "No organization found" }, 404);

    const { status, date } = c.req.valid("json");

    const presence = await presenceRepository.markPresence(
      user.id,
      user.organizationId,
      status as PresenceStatus,
      date || getISODate(),
    );

    return c.json(presence);
  },
);

const controllers = {
  getTodayPresence,
  markPresence,
};

export const presenceControllers = wrapControllerWithSentry(controllers, {
  layerName: "presence-controller",
});
