import { Hono } from "hono";
import { userRoutes } from "./groups/user";

export const app = new Hono().basePath("/api").route("/users", userRoutes);

export type AppType = typeof app;
