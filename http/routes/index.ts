import { swaggerUI } from "@hono/swagger-ui";
import * as Sentry from "@sentry/nextjs";
import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import type { AuthEnv } from "@/http/models/auth.model";
import { authRoutes } from "./auth.route";
import { openAPIDocument } from "./docs/open-api.doc";
import { integrationRoutes } from "./integration.route";
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

export const app = new Hono<AuthEnv>()
  .basePath("/api")
  .onError((error, c) => {
    const user = (() => {
      try {
        return c.get("user") as { id: string; organizationId?: string | null };
      } catch {
        return undefined;
      }
    })();

    const eventId = Sentry.captureException(error, {
      tags: { layer: "api" },
      user: user?.id ? { id: user.id } : undefined,
      extra: {
        method: c.req.method,
        path: c.req.path,
        organizationId: user?.organizationId ?? null,
      },
    });

    return c.json({ error: "Something went wrong", eventId }, 500);
  })
  .route("/invitations/public", publicInvitationRoutes)
  .route("/password", publicPasswordRoutes)
  .route("/auth", authRoutes)
  .use("*", authMiddleware)
  .route("/invoice-comments", invoiceCommentRoutes)
  .route("/task-comments", taskCommentRoutes)
  .route("/invoices", invoiceRoutes)
  .route("/users", userRoutes)
  .route("/organizations", organizationRoutes)
  .route("/integrations", integrationRoutes)
  .route("/presence", presenceRoutes)
  .route("/projects", projectRoutes)
  .route("/tasks", taskRoutes);

app.get("/openapi.json", (c) => c.json(openAPIDocument));

app.get("/docs", swaggerUI({ url: "/api/openapi.json" }));

export type AppType = typeof app;
