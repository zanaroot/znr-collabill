export const openAPIDocument = {
  openapi: "3.0.0",
  info: {
    title: "Collabill API",
    version: "1.0.0",
  },
  paths: {
    "/api/password/forgot": {
      post: {
        tags: ["Password"],
        summary: "Forgot password",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Email sent if user exists" },
        },
      },
    },
    "/api/password/reset": {
      post: {
        tags: ["Password"],
        summary: "Reset password",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password updated" },
        },
      },
    },
    "/api/invitations/public/{token}": {
      get: {
        tags: ["Public Invitations"],
        summary: "Get invitation by token",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Invitation details" },
          404: { description: "Invitation not found" },
        },
      },
    },
    "/api/invitations/public/{token}/accept": {
      post: {
        tags: ["Public Invitations"],
        summary: "Accept invitation",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Invitation accepted" },
        },
      },
    },
    "/api/invitations/public/{token}/decline": {
      post: {
        tags: ["Public Invitations"],
        summary: "Decline invitation",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Invitation declined" },
        },
      },
    },
    "/api/invitations/public/create-password": {
      post: {
        tags: ["Public Invitations"],
        summary: "Create password from invitation",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "name", "password"],
                properties: {
                  token: { type: "string" },
                  name: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Account created" },
        },
      },
    },
    "/api/presence/today": {
      get: {
        tags: ["Presence"],
        summary: "Get today's presence",
        responses: {
          200: { description: "Presence details" },
        },
      },
    },
    "/api/presence": {
      post: {
        tags: ["Presence"],
        summary: "Mark presence",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  date: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Presence marked" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name", "organizationName"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  name: { type: "string" },
                  organizationName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Registration successful" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful" },
        },
      },
    },
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
