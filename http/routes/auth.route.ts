import { Hono } from "hono";
import { login, logout, register } from "@/http/controllers/auth.controller";

export const authRoutes = new Hono()
  .post("/login", ...login)
  .post("/register", ...register)
  .post("/logout", ...logout);
