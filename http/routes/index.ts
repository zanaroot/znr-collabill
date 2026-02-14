import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { projectRoutes } from "./project.route";
import { taskRoutes } from "./task.route";
import { userRoutes } from "./user.route";

export const app = new Hono()
  .basePath("/api")
  .use("*", authMiddleware)
  .route("/users", userRoutes)
  .route("/projects", projectRoutes)
  .route("/tasks", taskRoutes);

export type AppType = typeof app;
