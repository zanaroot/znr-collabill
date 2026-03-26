import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { authRoutes } from "./auth.route";
import { invoiceCommentRoutes } from "./invoice-comment.route";
import { organizationRoutes } from "./organization.route";
import { projectRoutes } from "./project.route";
import { taskRoutes } from "./task.route";
import { userRoutes } from "./user.route";

const openAPIDocument = {
  openapi: "3.0.0",
  info: {
    title: "Collabill API",
    version: "1.0.0",
  },
  paths: {
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        description: "Logout current user by clearing session cookie",
        responses: {
          200: {
            description: "Logout successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current user",
        description: "Get the currently authenticated user",
        responses: {
          200: {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    name: { type: "string", nullable: true },
                    avatar: { type: "string", nullable: true },
                    organizationId: { type: "string", nullable: true },
                    organizationName: { type: "string", nullable: true },
                    organizationRole: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update current user",
        description: "Update the currently authenticated user's profile",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  avatar: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated user",
          },
        },
      },
    },
  },
};

export const app = new Hono()
  .basePath("/api")
  .use("*", authMiddleware)
  .route("/auth", authRoutes)
  .route("/invoice-comments", invoiceCommentRoutes)
  .route("/users", userRoutes)
  .route("/organizations", organizationRoutes)
  .route("/projects", projectRoutes)
  .route("/tasks", taskRoutes);

app.get("/openapi.json", (c) => c.json(openAPIDocument));

app.get("/docs", swaggerUI({ url: "/api/openapi.json" }));

export type AppType = typeof app;
