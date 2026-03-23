export const PRESENCE_STATUSES = [
  "OFFICE",
  "REMOTE",
  "ON_SITE",
  "SICK",
  "VACATION",
] as const;

export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];
