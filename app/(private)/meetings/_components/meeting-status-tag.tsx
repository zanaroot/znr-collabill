"use client";

import { Tag } from "antd";
import type { MeetingStatus } from "@/http/models/meeting.model";

const STATUS_COLORS: Record<MeetingStatus, string> = {
  SCHEDULED: "blue",
  ACTIVE: "green",
  ENDED: "default",
  EXPIRED: "orange",
  CANCELLED: "red",
};

export const MeetingStatusTag = ({ status }: { status: MeetingStatus }) => (
  <Tag color={STATUS_COLORS[status]}>{status}</Tag>
);
