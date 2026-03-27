import { Hono } from "hono";
import {
  forgotPassword,
  resetPassword,
} from "@/http/controllers/password.controller";

export const publicPasswordRoutes = new Hono()
  .post("/forgot", ...forgotPassword)
  .post("/reset", ...resetPassword);
