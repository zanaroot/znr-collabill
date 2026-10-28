import { Hono } from "hono";
import {
  getPublicMeetingInfo,
  guestJoinMeeting,
} from "@/http/controllers/meeting-room.controller";
import { rateLimit } from "@/http/middleware/rate-limit.middleware";

const guestJoinLimit = rateLimit({
  name: "meeting-guest-join",
  limit: 10,
  windowMs: 60_000,
  keyBy: "ip",
});

export const publicMeetingRoutes = new Hono()
  .get("/:token", ...getPublicMeetingInfo)
  .post("/:token/join", guestJoinLimit, ...guestJoinMeeting);
