import { z } from "zod";

const PRESENCE_STATUSES = [
  "OFFICE",
  "REMOTE",
  "ON_SITE",
  "SICK",
  "VACATION",
  "ON_LEAVE",
] as const;

export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

const presenceStatusEnum = z.enum(PRESENCE_STATUSES);

export type PresenceStatusValue = PresenceStatus;

export const markPresenceSchema = z.object({
  organizationId: z.string().uuid(),
  date: z.string().optional(),
  status: presenceStatusEnum.optional().default("OFFICE"),
});
