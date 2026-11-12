import type { PresenceStatus } from "@/http/models/presence.model";

export const PRESENCE_STATUS_COLORS: Record<PresenceStatus, string> = {
  OFFICE: "#52c41a",
  REMOTE: "#1890ff",
  HALF_DAY: "#722ed1",
  SICK: "#fa541c",
  VACATION: "#eb2f96",
  ON_LEAVE: "#faad14",
};
