import { Hono } from "hono";
import { logout } from "@/http/controllers/auth.controller";

export const authRoutes = new Hono().post("/logout", ...logout);
