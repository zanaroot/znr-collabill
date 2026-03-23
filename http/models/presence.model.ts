import { z } from "zod";
import { PRESENCE_STATUSES, type PresenceStatus } from "@/lib/presence-status";

const presenceStatusEnum = z.enum(PRESENCE_STATUSES);

export const presenceSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  date: z.string(), // YYYY-MM-DD
  checkInAt: z.date(),
  checkOutAt: z.date().nullable(),
  status: presenceStatusEnum,
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type Presence = z.infer<typeof presenceSchema>;
export type PresenceStatusValue = PresenceStatus;

export const markPresenceSchema = z.object({
  date: z.string().optional(),
  status: presenceStatusEnum.optional().default("OFFICE"),
});

export type MarkPresenceInput = z.infer<typeof markPresenceSchema>;

export const checkOutSchema = z.object({
  date: z.string().optional(),
});

export type CheckOutInput = z.infer<typeof checkOutSchema>;
