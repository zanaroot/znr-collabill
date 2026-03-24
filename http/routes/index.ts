import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { authRoutes } from "./auth.route";
import { iterationRoutes } from "./iteration.route";
import { maintenanceRoutes } from "./maintenance.route";
import { organizationRoutes } from "./organization.route";
import { projectRoutes } from "./project.route";
import { taskRoutes } from "./task.route";
import { userRoutes } from "./user.route";

export const app = new Hono()
  .basePath("/api")
  .use("*", authMiddleware)
  .route("/auth", authRoutes)
  .route("/users", userRoutes)
  .route("/organizations", organizationRoutes)
  .route("/projects", projectRoutes)
  .route("/tasks", taskRoutes)
  .route("/iterations", iterationRoutes)
  .route("/maintenance", maintenanceRoutes);

export type AppType = typeof app;
