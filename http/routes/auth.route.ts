import { Hono } from "hono";
import { login, logout, register } from "@/http/controllers/auth.controller";
import {
  sendEmailVerification,
  sendMemberEmailVerification,
  verifyEmail,
} from "@/http/controllers/email-verification.controller";

export const authRoutes = new Hono()
  .post("/login", ...login)
  .post("/register", ...register)
  .post("/logout", ...logout)
  .post("/email-verification/send", ...sendEmailVerification)
  .post(
    "/email-verification/send-member/:userId",
    ...sendMemberEmailVerification,
  )
  .get("/email-verification/verify", ...verifyEmail);
