import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  markPresenceSchema,
  type PresenceStatus,
} from "@/http/models/presence.model";
import * as presenceRepository from "@/http/repositories/presence.repository";
import { getISODate } from "@/lib/date";

const factory = createFactory<AuthEnv>();

const presenceRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

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

export const getMyPresences = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user.organizationId)
    return c.json({ error: "No organization found" }, 404);

  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!startDate || !endDate) {
    return c.json({ error: "startDate and endDate are required" }, 400);
  }

  const presences = await presenceRepository.findPresencesByUserIdAndDateRange(
    user.id,
    user.organizationId,
    startDate,
    endDate,
  );

  return c.json(presences);
});

export const getAllPresences = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user.organizationId)
    return c.json({ error: "No organization found" }, 404);

  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!startDate || !endDate) {
    return c.json({ error: "startDate and endDate are required" }, 400);
  }

  const presences = await presenceRepository.findAllPresencesByOrganization(
    user.organizationId,
    startDate,
    endDate,
  );

  return c.json(presences);
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

export const getMemberPresences = factory.createHandlers(
  zValidator("query", presenceRangeSchema),
  async (c) => {
    const user = c.get("user");

    if (!user.organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }

    const userId = c.req.param("userId");

    const { startDate, endDate } = c.req.valid("query");

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const presences =
      await presenceRepository.findPresencesByUserIdAndDateRange(
        userId,
        user.organizationId,
        startDate,
        endDate,
      );

    return c.json(presences);
  },
);

const createMemberAbsenceSchema = z.object({
  date: z.string(),
  status: z.enum(["SICK", "VACATION", "ON_LEAVE"]),
});

export const createMemberAbsence = factory.createHandlers(
  zValidator("json", createMemberAbsenceSchema),
  async (c) => {
    const user = c.get("user");

    if (!user.organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }

    const userIdParam = c.req.param("userId");

    if (!userIdParam) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const userId = userIdParam;

    const { date, status } = c.req.valid("json");

    const absence = await presenceRepository.createMemberAbsence({
      userId,
      organizationId: user.organizationId,
      createdBy: user.id,
      date,
      status,
    });

    return c.json(absence, 201);
  },
);
