import { Hono } from "hono";
import { getMe } from "@/http/controllers/user.controller";

export const userRoutes = new Hono().get("/me", ...getMe);
