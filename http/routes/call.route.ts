import { Hono } from "hono";
import {
  acceptCall,
  cancelCall,
  createCall,
  getActiveCalls,
  getCallById,
  getCalls,
  getCallToken,
  leaveCall,
  rejectCall,
} from "@/http/controllers/call.controller";
import { rateLimit } from "@/http/middleware/rate-limit.middleware";

const createLimit = rateLimit({
  name: "call-create",
  limit: 10,
  windowMs: 60_000,
});

const tokenLimit = rateLimit({
  name: "call-token",
  limit: 30,
  windowMs: 60_000,
});

export const callRoutes = new Hono()
  .get("/", ...getCalls)
  .get("/active", ...getActiveCalls)
  .get("/:id", ...getCallById)
  .post("/", createLimit, ...createCall)
  .post("/:id/accept", ...acceptCall)
  .post("/:id/reject", ...rejectCall)
  .post("/:id/cancel", ...cancelCall)
  .post("/:id/leave", ...leaveCall)
  .post("/:id/token", tokenLimit, ...getCallToken);
