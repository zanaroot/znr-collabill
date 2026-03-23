import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { authRoutes } from "./auth.route";
import { cronRoutes } from "./cron.route";
import { iterationRoutes } from "./iteration.route";
import { organizationRoutes } from "./organization.route";
import { projectRoutes } from "./project.route";
import { taskRoutes } from "./task.route";
import { userRoutes } from "./user.route";

export const app = new Hono()
  .basePath("/api")
  .route("/cron", cronRoutes) // Public cron endpoint with its own secret
  .use("*", authMiddleware) // Everything after this is protected
  .route("/auth", authRoutes)
  .route("/users", userRoutes)
  .route("/organizations", organizationRoutes)
  .route("/projects", projectRoutes)
  .route("/tasks", taskRoutes)
  .route("/iterations", iterationRoutes);

export type AppType = typeof app;
