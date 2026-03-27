import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { authRoutes } from "./auth.route";
import { invoiceRoutes } from "./invoice.route";
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
    "/api/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "Get invoices",
        description: "Get all invoices for the current organization",
        responses: {
          200: {
            description: "List of invoices",
          },
        },
      },
      post: {
        tags: ["Invoices"],
        summary: "Create invoice",
        description: "Create a new invoice with lines",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "userId",
                  "organizationId",
                  "periodStart",
                  "periodEnd",
                  "lines",
                ],
                properties: {
                  userId: { type: "string", format: "uuid" },
                  organizationId: { type: "string", format: "uuid" },
                  periodStart: { type: "string", format: "date" },
                  periodEnd: { type: "string", format: "date" },
                  status: {
                    type: "string",
                    enum: ["DRAFT", "VALIDATED", "PAID"],
                  },
                  totalAmount: { type: "string" },
                  note: { type: "string", nullable: true },
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["type", "label", "quantity"],
                      properties: {
                        type: { type: "string" },
                        referenceId: { type: "string", format: "uuid" },
                        label: { type: "string" },
                        quantity: { type: "integer" },
                        unitPrice: { type: "string" },
                        total: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created invoice",
          },
        },
      },
    },
    "/api/invoices/{id}": {
      get: {
        tags: ["Invoices"],
        summary: "Get invoice by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "The invoice",
          },
          404: {
            description: "Invoice not found",
          },
        },
      },
    },
    "/api/invoices/{id}/status": {
      patch: {
        tags: ["Invoices"],
        summary: "Update invoice status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["DRAFT", "VALIDATED", "PAID"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated invoice",
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
  .route("/invoices", invoiceRoutes)
  .route("/users", userRoutes)
  .route("/organizations", organizationRoutes)
  .route("/projects", projectRoutes)
  .route("/tasks", taskRoutes);

app.get("/openapi.json", (c) => c.json(openAPIDocument));

app.get("/docs", swaggerUI({ url: "/api/openapi.json" }));

export type AppType = typeof app;
