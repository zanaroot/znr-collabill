import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { authRoutes } from "./auth.route";
import { invoiceCommentRoutes } from "./invoice-comment.route";
import { organizationRoutes } from "./organization.route";
import { projectRoutes } from "./project.route";
import { taskRoutes } from "./task.route";
import { userRoutes } from "./user.route";

export const app = new Hono()
  .basePath("/api")
  .use("*", authMiddleware)
  .route("/auth", authRoutes)
  .route("/invoice-comments", invoiceCommentRoutes)
  .route("/users", userRoutes)
  .route("/organizations", organizationRoutes)
  .route("/projects", projectRoutes)
  .route("/tasks", taskRoutes);

export type AppType = typeof app;
