import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { userRoutes } from "./user.route";

export const app = new Hono()
  .basePath("/api")
  .use("*", authMiddleware)
  .route("/users", userRoutes);

export type AppType = typeof app;
