import { Hono } from "hono";
import {
  createMeetingGuestLink,
  createMeetingHandler,
  getMeetingById,
  getMeetings,
  inviteMeetingMembers,
  revokeMeetingInvitation,
} from "@/http/controllers/meeting.controller";
import {
  endMeeting,
  joinMeeting,
  leaveMeeting,
} from "@/http/controllers/meeting-room.controller";
import { rateLimit } from "@/http/middleware/rate-limit.middleware";

const createLimit = rateLimit({
  name: "meeting-create",
  limit: 10,
  windowMs: 60_000,
});

const inviteLimit = rateLimit({
  name: "meeting-invite",
  limit: 20,
  windowMs: 60_000,
});

const joinLimit = rateLimit({
  name: "meeting-join",
  limit: 30,
  windowMs: 60_000,
});

const guestLinkLimit = rateLimit({
  name: "meeting-guest-link",
  limit: 10,
  windowMs: 60_000,
});

export const meetingRoutes = new Hono()
  .get("/", ...getMeetings)
  .get("/:id", ...getMeetingById)
  .post("/", createLimit, ...createMeetingHandler)
  .post("/:id/join", joinLimit, ...joinMeeting)
  .post("/:id/leave", ...leaveMeeting)
  .post("/:id/end", ...endMeeting)
  .post("/:id/invitations", inviteLimit, ...inviteMeetingMembers)
  .delete("/:id/invitations/:invitationId", ...revokeMeetingInvitation)
  .post("/:id/guest-link", guestLinkLimit, ...createMeetingGuestLink);
