import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { authRoutes } from "./auth.route";
import { openAPIDocument } from "./docs/open-api.doc";
import { publicInvitationRoutes } from "./invitation.route";
import { invoiceRoutes } from "./invoice.route";
import { invoiceCommentRoutes } from "./invoice-comment.route";
import { organizationRoutes } from "./organization.route";
import { publicPasswordRoutes } from "./password.route";
import { presenceRoutes } from "./presence.route";
import { projectRoutes } from "./project.route";
import { taskRoutes } from "./task.route";
import { taskCommentRoutes } from "./task-comment.route";
import { userRoutes } from "./user.route";

export const app = new Hono()
  .basePath("/api")
  .route("/invitations/public", publicInvitationRoutes)
  .route("/password", publicPasswordRoutes)
  .route("/auth", authRoutes)
  .use("*", authMiddleware)
  .route("/invoice-comments", invoiceCommentRoutes)
  .route("/task-comments", taskCommentRoutes)
  .route("/invoices", invoiceRoutes)
  .route("/users", userRoutes)
  .route("/organizations", organizationRoutes)
  .route("/presence", presenceRoutes)
  .route("/projects", projectRoutes)
  .route("/tasks", taskRoutes);

app.get("/openapi.json", (c) => c.json(openAPIDocument));

app.get("/docs", swaggerUI({ url: "/api/openapi.json" }));

export type AppType = typeof app;
