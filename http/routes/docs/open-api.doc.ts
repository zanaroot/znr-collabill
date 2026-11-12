export const openAPIDocument = {
  openapi: "3.0.0",
  info: {
    title: "Collabill API",
    version: "1.0.0",
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "session_token",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      PresenceStatus: {
        type: "string",
        enum: ["OFFICE", "REMOTE", "HALF_DAY", "SICK", "VACATION", "ON_LEAVE"],
      },
      InvoiceStatus: {
        type: "string",
        enum: ["DRAFT", "VALIDATED", "PAID"],
      },
      OrganizationRole: {
        type: "string",
        enum: ["OWNER", "ADMIN", "COLLABORATOR"],
      },
      ProjectRole: {
        type: "string",
        enum: ["MEMBER", "PRODUCT_OWNER"],
      },
      TaskStatus: {
        type: "string",
        enum: [
          "BACKLOG",
          "TODO",
          "IN_PROGRESS",
          "IN_REVIEW",
          "APPROVED",
          "VALIDATED",
          "BLOCKED",
          "TRASH",
          "ARCHIVED",
        ],
      },
      TaskSize: {
        type: "string",
        enum: ["XS", "S", "M", "L", "XL"],
      },
      LeaveType: {
        type: "string",
        enum: ["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"],
      },
      LeaveRequestStatus: {
        type: "string",
        enum: ["PENDING", "APPROVED", "REJECTED"],
      },
      IntegrationType: {
        type: "string",
        enum: ["GITHUB", "SLACK"],
      },
      SubscriptionPlanCode: {
        type: "string",
        enum: ["FREE", "PRO"],
      },
      SubscriptionInterval: {
        type: "string",
        enum: ["MONTHLY", "YEARLY"],
      },
      SubscriptionStatus: {
        type: "string",
        enum: ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"],
      },
      PaymentStatus: {
        type: "string",
        enum: ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"],
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register",
        security: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name", "organizationName"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string", minLength: 2 },
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
        security: [],
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
    "/api/password/forgot": {
      post: {
        tags: ["Password"],
        summary: "Forgot password",
        security: [],
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
        security: [],
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
        security: [],
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
        security: [],
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
        security: [],
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
        security: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "name", "password"],
                properties: {
                  token: { type: "string" },
                  name: { type: "string", minLength: 2 },
                  password: { type: "string", minLength: 8 },
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
                    organizationRole: {
                      $ref: "#/components/schemas/OrganizationRole",
                    },
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
                  name: { type: "string", minLength: 1 },
                  email: { type: "string", format: "email" },
                  avatar: { type: "string", nullable: true },
                  phoneNumber: { type: "string", nullable: true },
                  phoneOwnerName: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated user" },
        },
      },
    },
    "/api/users/me/avatar": {
      post: {
        tags: ["Users"],
        summary: "Upload avatar",
        description:
          "Upload the current user's avatar image (JPEG, PNG, WebP or GIF, max 5MB)",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Avatar uploaded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid file type or size" },
        },
      },
    },
    "/api/users/me/heartbeat": {
      post: {
        tags: ["Users"],
        summary: "Heartbeat",
        description: "Update the current user's last seen timestamp",
        responses: {
          200: {
            description: "Last seen updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    lastSeenAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/users/all": {
      get: {
        tags: ["Users"],
        summary: "Get organization members",
        description: "Get all members of the current organization",
        responses: {
          200: { description: "List of members" },
          404: { description: "No organization found" },
        },
      },
    },
    "/api/users/status": {
      get: {
        tags: ["Users"],
        summary: "Get members online status",
        description:
          "Get all organization members with their online status based on last seen",
        responses: {
          200: {
            description: "List of members with online status",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string" },
                      avatar: { type: "string", nullable: true },
                      role: { $ref: "#/components/schemas/OrganizationRole" },
                      lastSeenAt: {
                        type: "string",
                        nullable: true,
                        format: "date-time",
                      },
                      isOnline: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
          404: { description: "No organization found" },
        },
      },
    },
    "/api/users/invitations": {
      get: {
        tags: ["Users"],
        summary: "Get invitations",
        description: "Get all pending invitations for the organization",
        responses: {
          200: { description: "List of invitations" },
          403: { description: "Forbidden (admin/owner only)" },
          404: { description: "No organization found" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Invite user",
        description: "Invite a user to the organization (admin only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                  role: {
                    type: "string",
                    enum: ["ADMIN", "COLLABORATOR"],
                    default: "COLLABORATOR",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Invitation sent" },
          400: { description: "Invalid request" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/users/invitations/{id}/resend": {
      post: {
        tags: ["Users"],
        summary: "Resend invitation",
        description: "Resend an invitation email (admin only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Invitation resent" },
          400: { description: "Invalid request" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/users/invitations/{id}": {
      delete: {
        tags: ["Users"],
        summary: "Revoke invitation",
        description: "Revoke a pending invitation (admin only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Invitation revoked" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/users/{id}": {
      delete: {
        tags: ["Users"],
        summary: "Remove user from organization",
        description:
          "Remove a user from the organization (admin only, cannot remove yourself)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "User removed" },
          400: { description: "Cannot remove yourself" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/users/{id}/role": {
      patch: {
        tags: ["Users"],
        summary: "Update user role",
        description:
          "Update a member's organization role (owner only, cannot change your own role)",
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
                required: ["role"],
                properties: {
                  role: { $ref: "#/components/schemas/OrganizationRole" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Role updated" },
          400: { description: "Cannot change your own role" },
          403: { description: "Forbidden (owner only)" },
        },
      },
    },
    "/api/users/{id}/rates": {
      get: {
        tags: ["Users"],
        summary: "Get collaborator rates",
        description: "Get the billing rates for a collaborator",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Collaborator rates" },
          404: { description: "Rate not found" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update collaborator rates",
        description:
          "Update the billing rates for a collaborator (owner only, or self)",
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
                required: [
                  "organizationId",
                  "rateXs",
                  "rateS",
                  "rateM",
                  "rateL",
                  "rateXl",
                  "dailyRate",
                ],
                properties: {
                  organizationId: { type: "string", format: "uuid" },
                  rateXs: { type: "string", pattern: "^\\d+(\\.\\d{1,2})?$" },
                  rateS: { type: "string", pattern: "^\\d+(\\.\\d{1,2})?$" },
                  rateM: { type: "string", pattern: "^\\d+(\\.\\d{1,2})?$" },
                  rateL: { type: "string", pattern: "^\\d+(\\.\\d{1,2})?$" },
                  rateXl: { type: "string", pattern: "^\\d+(\\.\\d{1,2})?$" },
                  dailyRate: {
                    type: "string",
                    pattern: "^\\d+(\\.\\d{1,2})?$",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated rates" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/users/{id}/projects": {
      get: {
        tags: ["Users"],
        summary: "Get member projects",
        description: "Get the projects a member belongs to",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "organizationId",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "List of projects" },
        },
      },
    },
    "/api/organizations": {
      get: {
        tags: ["Organizations"],
        summary: "Get owned organizations",
        description:
          "Get organizations where the current user is owner/admin, with members",
        responses: {
          200: { description: "List of organizations" },
          403: { description: "Forbidden (collaborators cannot access)" },
        },
      },
      post: {
        tags: ["Organizations"],
        summary: "Create organization",
        description: "Create a new organization and select it in the session",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Organization created" },
        },
      },
    },
    "/api/organizations/me": {
      get: {
        tags: ["Organizations"],
        summary: "Get my organizations",
        description: "Get all organizations the current user belongs to",
        responses: {
          200: { description: "List of organizations" },
        },
      },
    },
    "/api/organizations/slack-settings": {
      get: {
        tags: ["Organizations"],
        summary: "Get organization Slack settings",
        description:
          "Get Slack settings for the current organization (owner only)",
        responses: {
          200: {
            description: "Slack settings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slackBotTokenEncrypted: { type: "boolean" },
                    slackDefaultChannel: {
                      type: "string",
                      nullable: true,
                    },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden (owner only)" },
        },
      },
      put: {
        tags: ["Organizations"],
        summary: "Update organization Slack settings",
        description: "Update Slack bot token and default channel (owner only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  slackBotToken: { type: "string", nullable: true },
                  slackDefaultChannel: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Slack settings updated" },
          403: { description: "Forbidden (owner only)" },
        },
      },
    },
    "/api/organizations/{id}/select": {
      post: {
        tags: ["Organizations"],
        summary: "Select organization",
        description: "Set the active organization in the current session",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Organization selected" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/organizations/{id}/leave": {
      post: {
        tags: ["Organizations"],
        summary: "Leave organization",
        description: "Remove the current user from the organization",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Left organization" },
          400: { description: "Invalid request" },
        },
      },
    },
    "/api/organizations/{id}/owner": {
      get: {
        tags: ["Organizations"],
        summary: "Get organization owner",
        description: "Get the owner of an organization",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Organization owner" },
        },
      },
    },
    "/api/organizations/{id}": {
      delete: {
        tags: ["Organizations"],
        summary: "Delete organization",
        description: "Delete an organization (owner only)",
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
                required: ["confirmDelete"],
                properties: {
                  confirmDelete: { type: "string", enum: ["DELETE"] },
                  hardDelete: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Organization deleted" },
          403: { description: "Forbidden (owner only)" },
        },
      },
    },
    "/api/organizations/{organizationId}/finance-emails": {
      get: {
        tags: ["Organizations"],
        summary: "Get finance emails",
        description: "Get finance notification emails (owner only)",
        parameters: [
          {
            name: "organizationId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "List of finance emails" },
          403: { description: "Forbidden (owner only)" },
        },
      },
      post: {
        tags: ["Organizations"],
        summary: "Add finance email",
        description: "Add a finance notification email (owner only)",
        parameters: [
          {
            name: "organizationId",
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
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Finance email added" },
          403: { description: "Forbidden (owner only)" },
        },
      },
    },
    "/api/organizations/{organizationId}/finance-emails/{financeEmailId}": {
      delete: {
        tags: ["Organizations"],
        summary: "Delete finance email",
        description: "Delete a finance notification email (owner only)",
        parameters: [
          {
            name: "organizationId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "financeEmailId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          204: { description: "Finance email deleted" },
          403: { description: "Forbidden (owner only)" },
        },
      },
    },
    "/api/organizations/{organizationId}/attendance-settings": {
      get: {
        tags: ["Organizations"],
        summary: "Get attendance settings",
        description: "Get attendance/presence settings for the organization",
        parameters: [
          {
            name: "organizationId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Attendance settings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    configured: { type: "boolean" },
                    presenceSelectionEnabled: { type: "boolean" },
                    settings: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            $ref: "#/components/schemas/PresenceStatus",
                          },
                          enabled: { type: "boolean" },
                          rate: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Organizations"],
        summary: "Update attendance settings",
        description: "Update attendance/presence settings (owner only)",
        parameters: [
          {
            name: "organizationId",
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
                required: ["presenceSelectionEnabled", "settings"],
                properties: {
                  presenceSelectionEnabled: { type: "boolean" },
                  settings: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["type", "enabled", "rate"],
                      properties: {
                        type: {
                          $ref: "#/components/schemas/PresenceStatus",
                        },
                        enabled: { type: "boolean" },
                        rate: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Attendance settings updated" },
          403: { description: "Forbidden (owner only)" },
        },
      },
    },
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "Get projects",
        description:
          "Get projects for the current organization (owners see all, collaborators see assigned)",
        responses: {
          200: { description: "List of projects" },
          404: { description: "No organization found" },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create project",
        description: "Create a new project (owner only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "baseRate"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 255 },
                  description: { type: "string" },
                  gitRepo: { type: "string", format: "uri" },
                  baseRate: { type: "number", minimum: 0 },
                  reviewerRate: { type: "number", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created project" },
          403: { description: "Forbidden (owner only)" },
        },
      },
    },
    "/api/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get project by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "The project" },
          403: { description: "Unauthorized" },
          404: { description: "Project not found" },
        },
      },
      put: {
        tags: ["Projects"],
        summary: "Update project",
        description:
          "Update a project (project admin; rate changes require owner)",
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
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 255 },
                  description: { type: "string" },
                  gitRepo: { type: "string", format: "uri" },
                  baseRate: { type: "number", minimum: 0 },
                  reviewerRate: { type: "number", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated project" },
          403: { description: "Forbidden (project admin/owner)" },
          404: { description: "Project not found" },
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete project",
        description:
          "Delete a project (project admin or creator; fails if active tasks exist)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Project deleted" },
          400: { description: "Project has active tasks" },
          403: { description: "Forbidden" },
          404: { description: "Project not found" },
        },
      },
    },
    "/api/projects/{id}/branches": {
      get: {
        tags: ["Projects"],
        summary: "Get project branches",
        description: "List git branches of the project's repository",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "List of branches" },
          403: { description: "Unauthorized" },
          404: { description: "Project not found" },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create project branch",
        description: "Create a new git branch in the project's repository",
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
                required: ["newBranchName", "sourceBranchName"],
                properties: {
                  newBranchName: { type: "string", minLength: 1 },
                  sourceBranchName: { type: "string", minLength: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Branch created" },
          400: { description: "No git repository configured" },
          500: { description: "Failed to create branch" },
        },
      },
    },
    "/api/projects/{id}/members": {
      get: {
        tags: ["Projects"],
        summary: "Get project members",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "List of project members" },
          403: { description: "Unauthorized" },
          404: { description: "Project not found" },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Add project member",
        description:
          "Add an organization member to the project (project admin)",
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
                required: ["userId"],
                properties: {
                  userId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Member added" },
          400: { description: "User does not belong to your organization" },
          403: { description: "Forbidden (project admin)" },
        },
      },
    },
    "/api/projects/{id}/members/{userId}": {
      delete: {
        tags: ["Projects"],
        summary: "Remove project member",
        description:
          "Remove a member from the project (project admin; cannot remove yourself or the project owner unless you are org owner)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Member removed" },
          400: { description: "Cannot remove yourself" },
          403: { description: "Forbidden" },
          404: { description: "User is not a member" },
        },
      },
    },
    "/api/projects/{id}/members/{userId}/role": {
      put: {
        tags: ["Projects"],
        summary: "Update project member role",
        description: "Update a member's role in the project (project admin)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "userId",
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
                required: ["role"],
                properties: {
                  role: { $ref: "#/components/schemas/ProjectRole" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Member role updated" },
          403: { description: "Forbidden (project admin)" },
          404: { description: "User is not a member" },
        },
      },
    },
    "/api/projects/{id}/slack-settings": {
      put: {
        tags: ["Projects"],
        summary: "Update project Slack settings",
        description: "Update Slack channel and notifications (project admin)",
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
                properties: {
                  slackChannel: { type: "string", nullable: true },
                  slackNotificationsEnabled: {
                    type: "boolean",
                    nullable: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Slack settings updated" },
          403: { description: "Forbidden (project admin)" },
          404: { description: "Project not found" },
        },
      },
    },
    "/api/tasks/project/{projectId}": {
      get: {
        tags: ["Tasks"],
        summary: "Get tasks by project",
        description: "Get all tasks of a project (project members only)",
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "List of tasks" },
          403: { description: "Unauthorized" },
        },
      },
    },
    "/api/tasks/project/{projectId}/period": {
      get: {
        tags: ["Tasks"],
        summary: "Get tasks by project and period",
        description:
          "Get tasks of a project within a date period (project members only)",
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "startDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: { description: "List of tasks" },
          403: { description: "Unauthorized" },
        },
      },
    },
    "/api/tasks": {
      post: {
        tags: ["Tasks"],
        summary: "Create task",
        description:
          "Create a task (project admin/owner required; reviewer defaults to creator)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["projectId", "title", "size"],
                properties: {
                  projectId: { type: "string", format: "uuid" },
                  title: { type: "string", minLength: 1 },
                  description: { type: "string" },
                  size: { $ref: "#/components/schemas/TaskSize" },
                  priority: { type: "integer" },
                  dueDate: { type: "string", nullable: true },
                  assignedTo: {
                    type: "string",
                    format: "uuid",
                    nullable: true,
                  },
                  status: { $ref: "#/components/schemas/TaskStatus" },
                  reviewerId: {
                    type: "string",
                    format: "uuid",
                    nullable: true,
                  },
                  gitRepo: { type: "string", format: "uri", nullable: true },
                  gitBranch: { type: "string", nullable: true },
                  gitPullRequest: { type: "string", nullable: true },
                  previewLink: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created task" },
          400: { description: "Reviewer must be a project member" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/tasks/{id}": {
      put: {
        tags: ["Tasks"],
        summary: "Update task",
        description:
          "Update a task (project members; status transitions and validation are permission-checked)",
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
                properties: {
                  title: { type: "string", minLength: 1 },
                  description: { type: "string" },
                  size: { $ref: "#/components/schemas/TaskSize" },
                  priority: { type: "integer" },
                  dueDate: { type: "string", nullable: true },
                  assignedTo: {
                    type: "string",
                    format: "uuid",
                    nullable: true,
                  },
                  reviewerId: {
                    type: "string",
                    format: "uuid",
                    nullable: true,
                  },
                  status: { $ref: "#/components/schemas/TaskStatus" },
                  gitRepo: { type: "string", format: "uri", nullable: true },
                  gitBranch: { type: "string", nullable: true },
                  gitPullRequest: { type: "string", nullable: true },
                  previewLink: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated task" },
          403: { description: "Forbidden or invalid status transition" },
          404: { description: "Task not found" },
        },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete task",
        description:
          "Delete a task (project admin; only allowed in certain statuses)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Task deleted" },
          403: {
            description:
              "Forbidden or task cannot be deleted in its current status",
          },
          404: { description: "Task not found" },
        },
      },
    },
    "/api/tasks/upload-image": {
      post: {
        tags: ["Tasks"],
        summary: "Upload editor image",
        description:
          "Upload an image for the rich text editor (JPEG, PNG, GIF, WebP or SVG, max 10MB)",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Image uploaded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid image type or size" },
        },
      },
    },
    "/api/billing/public/plans": {
      get: {
        tags: ["Billing"],
        summary: "List subscription plans (public)",
        description:
          "Get the subscription plan catalog for the public pricing page; no session required",
        security: [],
        responses: {
          200: { description: "List of subscription plans" },
        },
      },
    },
    "/api/billing/plans": {
      get: {
        tags: ["Billing"],
        summary: "List subscription plans",
        description: "Get all available subscription plans for the catalog",
        responses: {
          200: { description: "List of subscription plans" },
          400: { description: "Organization required" },
        },
      },
    },
    "/api/billing/subscription": {
      get: {
        tags: ["Billing"],
        summary: "Get current subscription",
        description:
          "Get the current organization subscription, provisioning the default FREE plan on first access",
        responses: {
          200: { description: "Current subscription with plan" },
          400: { description: "Organization required" },
          404: { description: "Plan not found" },
        },
      },
    },
    "/api/billing/usage": {
      get: {
        tags: ["Billing"],
        summary: "Get organization usage and limits",
        description:
          "Get the plan, entitlement features, resource limits, current usage and reached flags for the current organization (any member)",
        responses: {
          200: { description: "Organization usage and limits" },
          400: { description: "Organization required" },
        },
      },
    },
    "/api/billing/payments": {
      get: {
        tags: ["Billing"],
        summary: "List payment history",
        description:
          "Get payment history for the current organization (owner only)",
        responses: {
          200: { description: "List of payments" },
          400: { description: "Organization required" },
          403: { description: "Owner role required" },
        },
      },
    },
    "/api/billing/payments/{paymentId}/status": {
      get: {
        tags: ["Billing"],
        summary: "Reconcile payment status",
        description:
          "Fetch the payment status from the payment provider and apply verified transitions (owner only)",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "paymentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Current payment record" },
          400: { description: "Organization required or amount mismatch" },
          403: { description: "Owner role required" },
          404: { description: "Payment not found" },
          502: { description: "Provider status retrieval failed" },
          503: { description: "Payment provider is not configured" },
        },
      },
    },
    "/api/billing/checkout": {
      post: {
        tags: ["Billing"],
        summary: "Initiate checkout",
        description:
          "Create a pending payment for the selected plan and billing period (owner only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["planCode", "interval"],
                properties: {
                  planCode: {
                    $ref: "#/components/schemas/SubscriptionPlanCode",
                  },
                  interval: {
                    $ref: "#/components/schemas/SubscriptionInterval",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Pending checkout payment created" },
          400: {
            description:
              "Organization required, plan not purchasable or invalid interval",
          },
          403: { description: "Owner role required" },
          404: { description: "Plan not found" },
          409: {
            description:
              "Already subscribed to this plan or checkout in progress",
          },
        },
      },
    },
    "/api/billing/change-plan": {
      post: {
        tags: ["Billing"],
        summary: "Change subscription plan",
        description:
          "Switch to a different or cheaper plan immediately; upgrades require checkout (owner only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["planCode"],
                properties: {
                  planCode: {
                    $ref: "#/components/schemas/SubscriptionPlanCode",
                  },
                  interval: {
                    $ref: "#/components/schemas/SubscriptionInterval",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Subscription updated with plan" },
          400: { description: "Organization required or invalid interval" },
          403: { description: "Owner role required" },
          404: { description: "Plan not found" },
          409: {
            description: "No active subscription, same plan or upgrade attempt",
          },
        },
      },
    },
    "/api/billing/cancel": {
      post: {
        tags: ["Billing"],
        summary: "Cancel subscription",
        description:
          "Cancel immediately or at the end of the current billing period (owner only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  atPeriodEnd: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Subscription canceled" },
          400: { description: "Organization required or no billing period" },
          403: { description: "Owner role required" },
          409: {
            description:
              "No active subscription or cancellation already scheduled",
          },
        },
      },
    },
    "/api/billing/reactivate": {
      post: {
        tags: ["Billing"],
        summary: "Reactivate subscription",
        description:
          "Restore a canceled subscription to ACTIVE; expired paid periods require checkout (owner only)",
        responses: {
          200: { description: "Subscription reactivated" },
          400: { description: "Organization required" },
          403: { description: "Owner role required" },
          409: {
            description: "No subscription, already active or period ended",
          },
        },
      },
    },
    "/api/back-office/billing/overview": {
      get: {
        tags: ["Back Office"],
        summary: "Billing dashboard",
        description:
          "Platform administrator billing overview: organization counts, subscription status counts, MRR/ARR per currency and recent payments and events",
        responses: {
          200: { description: "Billing dashboard data" },
          403: { description: "Platform administrator access required" },
        },
      },
    },
    "/api/back-office/billing/plans": {
      get: {
        tags: ["Back Office"],
        summary: "List plans",
        description:
          "List all plans including inactive ones with subscription counts",
        responses: {
          200: { description: "List of plans" },
          403: { description: "Platform administrator access required" },
        },
      },
      post: {
        tags: ["Back Office"],
        summary: "Create plan",
        description:
          "Create a plan with monthly and/or yearly prices; the interval is derived from the provided prices",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "name", "amountMinor", "currency"],
                properties: {
                  code: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  amountMinor: { type: "integer", minimum: 0 },
                  amountMinorYearly: { type: "integer", minimum: 1 },
                  currency: { type: "string" },
                  supportedCurrencies: {
                    type: "array",
                    items: { type: "string" },
                  },
                  maxMembers: { type: "integer" },
                  maxProjects: { type: "integer" },
                  features: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["integrations", "finance"],
                    },
                  },
                  active: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Plan created" },
          400: { description: "Invalid plan values" },
          403: { description: "Platform administrator access required" },
          409: { description: "Plan code already exists" },
        },
      },
    },
    "/api/back-office/billing/plans/{planId}": {
      patch: {
        tags: ["Back Office"],
        summary: "Update plan",
        description:
          "Update plan values and activation; plans are never deleted, and the Free plan cannot be deactivated",
        parameters: [
          {
            name: "planId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Plan updated" },
          400: { description: "Invalid values or Free plan deactivation" },
          403: { description: "Platform administrator access required" },
          404: { description: "Plan not found" },
        },
      },
    },
    "/api/back-office/billing/organizations": {
      get: {
        tags: ["Back Office"],
        summary: "List organizations",
        description:
          "Searchable, paginated organizations with owner, latest subscription plan and status and latest payment status",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "planCode", in: "query", schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "TRIALING",
                "ACTIVE",
                "PAST_DUE",
                "SUSPENDED",
                "CANCELED",
                "EXPIRED",
              ],
            },
          },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "pageSize", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Paginated organizations" },
          403: { description: "Platform administrator access required" },
        },
      },
    },
    "/api/back-office/billing/organizations/{organizationId}": {
      get: {
        tags: ["Back Office"],
        summary: "Organization billing detail",
        description:
          "Organization owner and member count, subscriptions, payments, events, admin notes and entitlement usage",
        parameters: [
          {
            name: "organizationId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Organization billing detail" },
          403: { description: "Platform administrator access required" },
          404: { description: "Organization not found" },
        },
      },
    },
    "/api/back-office/billing/organizations/{organizationId}/notes": {
      post: {
        tags: ["Back Office"],
        summary: "Add admin note",
        description: "Record an internal billing note for an organization",
        parameters: [
          {
            name: "organizationId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: {
                  body: { type: "string" },
                  subscriptionId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Note created" },
          400: { description: "Invalid note body" },
          403: { description: "Platform administrator access required" },
          404: { description: "Organization or subscription not found" },
        },
      },
    },
    "/api/back-office/billing/payments": {
      get: {
        tags: ["Back Office"],
        summary: "List payments",
        description: "Paginated payment list with organization and plan names",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"],
            },
          },
          { name: "organizationId", in: "query", schema: { type: "string" } },
          { name: "provider", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string" } },
          { name: "to", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "pageSize", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Paginated payments" },
          403: { description: "Platform administrator access required" },
        },
      },
    },
    "/api/back-office/billing/payments/{paymentId}": {
      get: {
        tags: ["Back Office"],
        summary: "Payment detail",
        description:
          "Payment with organization, plan, subscription, related provider events and refund capability flags",
        parameters: [
          {
            name: "paymentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Payment detail" },
          403: { description: "Platform administrator access required" },
          404: { description: "Payment not found" },
        },
      },
    },
    "/api/back-office/billing/payments/{paymentId}/refund": {
      post: {
        tags: ["Back Office"],
        summary: "Refund payment",
        description:
          "Refund a succeeded payment through the configured provider; the refund is only recorded after the provider confirms it",
        parameters: [
          {
            name: "paymentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Payment refunded" },
          400: { description: "Provider does not support refunds" },
          403: { description: "Platform administrator access required" },
          404: { description: "Payment not found" },
          409: {
            description: "Payment not succeeded or missing provider reference",
          },
          502: { description: "Provider refund failed or unconfirmed" },
          503: { description: "Payment provider is not configured" },
        },
      },
    },
    "/api/back-office/billing/subscriptions/{subscriptionId}/activate": {
      post: {
        tags: ["Back Office"],
        summary: "Activate subscription",
        description:
          "Activate a non-live subscription and open a new billing period when the previous one ended",
        parameters: [
          {
            name: "subscriptionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Subscription activated" },
          403: { description: "Platform administrator access required" },
          404: { description: "Subscription not found" },
          409: { description: "Subscription is already active" },
        },
      },
    },
    "/api/back-office/billing/subscriptions/{subscriptionId}/suspend": {
      post: {
        tags: ["Back Office"],
        summary: "Suspend subscription",
        description:
          "Suspend a live subscription; suspended organizations drop to Free entitlements",
        parameters: [
          {
            name: "subscriptionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Subscription suspended" },
          403: { description: "Platform administrator access required" },
          404: { description: "Subscription not found" },
          409: { description: "Only an active subscription can be suspended" },
        },
      },
    },
    "/api/back-office/billing/subscriptions/{subscriptionId}/reactivate": {
      post: {
        tags: ["Back Office"],
        summary: "Reactivate subscription",
        description: "Reactivate a non-live subscription outside checkout",
        parameters: [
          {
            name: "subscriptionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Subscription reactivated" },
          403: { description: "Platform administrator access required" },
          404: { description: "Subscription not found" },
          409: { description: "Subscription is already active" },
        },
      },
    },
    "/api/back-office/billing/subscriptions/{subscriptionId}/extend": {
      post: {
        tags: ["Back Office"],
        summary: "Extend subscription period",
        description: "Extend the current period of a live subscription",
        parameters: [
          {
            name: "subscriptionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["days"],
                properties: { days: { type: "integer", minimum: 1 } },
              },
            },
          },
        },
        responses: {
          200: { description: "Period extended" },
          400: { description: "Invalid days" },
          403: { description: "Platform administrator access required" },
          404: { description: "Subscription not found" },
          409: { description: "Only an active subscription can be extended" },
        },
      },
    },
    "/api/back-office/billing/subscriptions/{subscriptionId}/cancel": {
      post: {
        tags: ["Back Office"],
        summary: "Cancel subscription",
        description: "Cancel a live subscription immediately or at period end",
        parameters: [
          {
            name: "subscriptionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { atPeriodEnd: { type: "boolean" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Subscription canceled" },
          403: { description: "Platform administrator access required" },
          404: { description: "Subscription not found" },
          409: {
            description:
              "No active subscription or cancellation already scheduled",
          },
        },
      },
    },
    "/api/back-office/billing/subscriptions/{subscriptionId}/change-plan": {
      post: {
        tags: ["Back Office"],
        summary: "Change subscription plan",
        description:
          "Switch a live subscription to another plan, including upgrades that bypass checkout",
        parameters: [
          {
            name: "subscriptionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["planCode"],
                properties: {
                  planCode: { type: "string" },
                  interval: { type: "string", enum: ["MONTHLY", "YEARLY"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Plan changed" },
          400: { description: "Plan unavailable or unsupported interval" },
          403: { description: "Platform administrator access required" },
          404: { description: "Subscription or plan not found" },
          409: {
            description: "Not active or already subscribed to this plan",
          },
        },
      },
    },
    "/api/webhooks/payments": {
      post: {
        tags: ["Webhooks"],
        summary: "Payment provider webhook",
        description:
          "Receive signed payment events from the configured provider; verified events update the matching payment and subscription idempotently",
        security: [],
        parameters: [
          {
            name: "X-Payment-Signature",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Event received" },
          400: {
            description: "Malformed payload, amount or organization mismatch",
          },
          401: { description: "Missing or invalid webhook signature" },
          503: { description: "Payment provider is not configured" },
        },
      },
    },
    "/api/payments/nowpayments/webhook": {
      post: {
        tags: ["Webhooks"],
        summary: "NOWPayments IPN webhook",
        description:
          "Receive NOWPayments instant payment notifications; the x-nowpayments-sig HMAC-SHA512 signature is verified over the key-sorted JSON payload before any payment or subscription is updated, idempotently",
        security: [],
        parameters: [
          {
            name: "x-nowpayments-sig",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Notification received or safely ignored" },
          400: {
            description: "Malformed payload or payment reference mismatch",
          },
          401: { description: "Missing or invalid IPN signature" },
          404: { description: "Payment reference not found" },
          500: { description: "Unexpected processing failure" },
          503: { description: "NOWPayments IPN is not configured" },
        },
      },
    },
    "/api/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "Get invoices",
        description: "Get all invoices for the current organization",
        responses: {
          200: { description: "List of invoices" },
        },
      },
      post: {
        tags: ["Invoices"],
        summary: "Create invoice",
        description:
          "Create a new invoice with lines (owner only); validated tasks in the period are archived",
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
                  status: { $ref: "#/components/schemas/InvoiceStatus" },
                  totalAmount: { type: "string" },
                  note: { type: "string", nullable: true },
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["type", "label", "quantity"],
                      properties: {
                        type: { type: "string" },
                        presenceType: { type: "string", nullable: true },
                        referenceId: {
                          type: "string",
                          format: "uuid",
                          nullable: true,
                        },
                        label: { type: "string" },
                        quantity: { type: "number" },
                        unitPrice: { type: "string", nullable: true },
                        total: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created invoice" },
          403: { description: "Unauthorized" },
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
          200: { description: "The invoice" },
          403: { description: "Unauthorized" },
          404: { description: "Invoice not found" },
        },
      },
    },
    "/api/invoices/{id}/status": {
      patch: {
        tags: ["Invoices"],
        summary: "Update invoice status",
        description:
          "Update invoice status (validate/unvalidate: owner only; mark as paid: owner or the invoice member, and only from VALIDATED). Setting DRAFT deletes the invoice and unarchives its tasks",
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
                  status: { $ref: "#/components/schemas/InvoiceStatus" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated invoice" },
          403: { description: "Unauthorized" },
          404: { description: "Invoice not found" },
          409: { description: "Invalid status transition" },
        },
      },
    },
    "/api/invoices/member/{userId}": {
      get: {
        tags: ["Invoices"],
        summary: "Get member invoice by month",
        description: "Get a member's invoice for a given month (YYYY-MM)",
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "month",
            in: "query",
            required: true,
            schema: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
          },
        ],
        responses: {
          200: {
            description: "The invoice, or null if none exists for the month",
          },
          400: { description: "Invalid month format" },
        },
      },
    },
    "/api/invoices/draft/{organizationId}/{targetUserId}/{periodStart}/{periodEnd}":
      {
        get: {
          tags: ["Invoices"],
          summary: "Get invoice draft",
          description:
            "Get the saved draft invoice for the given organization, target user and period (owner only)",
          parameters: [
            {
              name: "organizationId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "targetUserId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "periodStart",
              in: "path",
              required: true,
              schema: { type: "string", format: "date" },
            },
            {
              name: "periodEnd",
              in: "path",
              required: true,
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            200: { description: "The draft invoice, or null" },
          },
        },
      },
    "/api/invoices/draft": {
      post: {
        tags: ["Invoices"],
        summary: "Save invoice draft",
        description:
          "Create or update a draft invoice with custom lines (owner only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "organizationId",
                  "targetUserId",
                  "periodStart",
                  "periodEnd",
                ],
                properties: {
                  organizationId: { type: "string", format: "uuid" },
                  targetUserId: { type: "string", format: "uuid" },
                  periodStart: { type: "string", format: "date" },
                  periodEnd: { type: "string", format: "date" },
                  customLines: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["label", "amount"],
                      properties: {
                        label: { type: "string" },
                        amount: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Saved draft invoice" },
        },
      },
    },
    "/api/invoices/draft/{invoiceId}": {
      delete: {
        tags: ["Invoices"],
        summary: "Delete invoice draft",
        description: "Delete a draft invoice (owner only)",
        parameters: [
          {
            name: "invoiceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Draft deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/invoice-comments/invoice/{invoiceId}": {
      get: {
        tags: ["Invoice Comments"],
        summary: "Get invoice comments",
        description: "Get all comments on an invoice",
        parameters: [
          {
            name: "invoiceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "List of comments" },
          403: { description: "Unauthorized" },
          404: { description: "Invoice not found" },
        },
      },
      post: {
        tags: ["Invoice Comments"],
        summary: "Add invoice comment",
        description:
          "Add a comment on an invoice (notifies other members by email)",
        parameters: [
          {
            name: "invoiceId",
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
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    minLength: 1,
                    maxLength: 2000,
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created comment" },
          403: { description: "Unauthorized" },
          404: { description: "Invoice not found" },
        },
      },
    },
    "/api/task-comments/task/{taskId}": {
      get: {
        tags: ["Task Comments"],
        summary: "Get task comments",
        description: "Get all comments on a task",
        parameters: [
          {
            name: "taskId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "List of comments" },
          403: { description: "Unauthorized" },
          404: { description: "Task not found" },
        },
      },
      post: {
        tags: ["Task Comments"],
        summary: "Add task comment",
        description: "Add a comment on a task (notifies via Slack)",
        parameters: [
          {
            name: "taskId",
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
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    minLength: 1,
                    maxLength: 2000,
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created comment" },
          403: { description: "Unauthorized" },
          404: { description: "Task not found" },
        },
      },
    },
    "/api/task-comments/{commentId}": {
      put: {
        tags: ["Task Comments"],
        summary: "Update task comment",
        description: "Update a task comment (author only)",
        parameters: [
          {
            name: "commentId",
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
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    minLength: 1,
                    maxLength: 2000,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated comment" },
          403: { description: "Unauthorized (author only)" },
          404: { description: "Comment not found" },
        },
      },
    },
    "/api/presence/today": {
      get: {
        tags: ["Presence"],
        summary: "Get today's presence",
        description: "Get the current user's presence for today",
        responses: {
          200: { description: "Presence details" },
          404: { description: "No organization found" },
        },
      },
    },
    "/api/presence/my": {
      get: {
        tags: ["Presence"],
        summary: "Get my presences",
        description: "Get the current user's presences within a date range",
        parameters: [
          {
            name: "startDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: { description: "List of presences" },
          400: { description: "startDate and endDate are required" },
        },
      },
    },
    "/api/presence/all": {
      get: {
        tags: ["Presence"],
        summary: "Get all presences",
        description:
          "Get all presences in the organization within a date range (admin only)",
        parameters: [
          {
            name: "startDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: { description: "List of presences" },
          400: { description: "startDate and endDate are required" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/presence": {
      post: {
        tags: ["Presence"],
        summary: "Mark presence",
        description: "Mark the current user's presence for a date",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    $ref: "#/components/schemas/PresenceStatus",
                  },
                  date: { type: "string", format: "date" },
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
    "/api/presence/member/{userId}": {
      get: {
        tags: ["Presence"],
        summary: "Get member presences",
        description:
          "Get a member's presences within a date range (admin only)",
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "startDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: { description: "List of presences" },
          403: { description: "Forbidden (admin only)" },
        },
      },
      patch: {
        tags: ["Presence"],
        summary: "Update member presence",
        description:
          "Update a member's presence for a date (admin only, notifies the member)",
        parameters: [
          {
            name: "userId",
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
                required: ["date", "status"],
                properties: {
                  date: { type: "string", format: "date" },
                  status: { $ref: "#/components/schemas/PresenceStatus" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Presence updated" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/presence/member/{userId}/absence": {
      post: {
        tags: ["Presence"],
        summary: "Create member absence",
        description:
          "Create an absence (SICK, VACATION or ON_LEAVE) for a member (admin only)",
        parameters: [
          {
            name: "userId",
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
                required: ["date", "status"],
                properties: {
                  date: { type: "string", format: "date" },
                  status: {
                    type: "string",
                    enum: ["SICK", "VACATION", "ON_LEAVE"],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Absence created" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/integrations": {
      get: {
        tags: ["Integrations"],
        summary: "Get integrations",
        description: "Get all integrations for the organization (admin/owner)",
        responses: {
          200: { description: "List of integrations" },
          403: { description: "Forbidden (admin/owner only)" },
        },
      },
      post: {
        tags: ["Integrations"],
        summary: "Save integration",
        description:
          "Create or save an integration with credentials (admin only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "credentials"],
                properties: {
                  type: { $ref: "#/components/schemas/IntegrationType" },
                  credentials: {
                    type: "object",
                    properties: {
                      github: {
                        type: "object",
                        properties: {
                          token: { type: "string" },
                        },
                      },
                      slack: {
                        type: "object",
                        properties: {
                          botToken: { type: "string" },
                          defaultChannel: { type: "string" },
                        },
                      },
                    },
                  },
                  config: {
                    type: "object",
                    properties: {
                      github: {
                        type: "object",
                        properties: {
                          defaultBranch: { type: "string" },
                        },
                      },
                      slack: {
                        type: "object",
                        properties: {
                          defaultChannel: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Integration saved" },
          403: { description: "Forbidden (admin only)" },
        },
      },
      delete: {
        tags: ["Integrations"],
        summary: "Delete integration",
        description: "Delete an integration (admin only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: {
                  type: { $ref: "#/components/schemas/IntegrationType" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Integration deleted" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/integrations/toggle": {
      post: {
        tags: ["Integrations"],
        summary: "Toggle integration",
        description: "Enable or disable an integration (admin only)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "isActive"],
                properties: {
                  type: { $ref: "#/components/schemas/IntegrationType" },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Integration toggled" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/integrations/{type}": {
      get: {
        tags: ["Integrations"],
        summary: "Get integration by type",
        description: "Get an integration's non-secret details (admin/owner)",
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: { $ref: "#/components/schemas/IntegrationType" },
          },
        ],
        responses: {
          200: { description: "Integration details" },
          403: { description: "Forbidden (admin/owner only)" },
          404: { description: "Integration not found" },
        },
      },
      put: {
        tags: ["Integrations"],
        summary: "Update integration",
        description:
          "Update an integration's credentials and config (admin only)",
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: { $ref: "#/components/schemas/IntegrationType" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["credentials"],
                properties: {
                  credentials: {
                    type: "object",
                    properties: {
                      github: {
                        type: "object",
                        properties: {
                          token: { type: "string" },
                        },
                      },
                      slack: {
                        type: "object",
                        properties: {
                          botToken: { type: "string" },
                          defaultChannel: { type: "string" },
                        },
                      },
                    },
                  },
                  config: {
                    type: "object",
                    properties: {
                      github: {
                        type: "object",
                        properties: {
                          defaultBranch: { type: "string" },
                        },
                      },
                      slack: {
                        type: "object",
                        properties: {
                          defaultChannel: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Integration updated" },
          403: { description: "Forbidden (admin only)" },
        },
      },
    },
    "/api/integrations/{type}/credentials": {
      get: {
        tags: ["Integrations"],
        summary: "Get integration credentials",
        description: "Get decrypted credentials and config (admin/owner only)",
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: { $ref: "#/components/schemas/IntegrationType" },
          },
        ],
        responses: {
          200: { description: "Credentials and config" },
          403: { description: "Forbidden (admin/owner only)" },
          404: { description: "Integration not found" },
        },
      },
    },
    "/api/leave-requests/my": {
      get: {
        tags: ["Leave Requests"],
        summary: "Get my leave requests",
        description: "Get the current user's leave requests",
        responses: {
          200: { description: "List of leave requests" },
          404: { description: "No organization found" },
        },
      },
    },
    "/api/leave-requests/org": {
      get: {
        tags: ["Leave Requests"],
        summary: "Get organization leave requests",
        description: "Get all leave requests in the organization (admin/owner)",
        responses: {
          200: { description: "List of leave requests" },
          403: { description: "Forbidden (admin/owner only)" },
        },
      },
    },
    "/api/leave-requests/balance": {
      get: {
        tags: ["Leave Requests"],
        summary: "Get my leave balance",
        description:
          "Get the current user's leave balance for a month (defaults to current month)",
        parameters: [
          {
            name: "month",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 12 },
          },
          {
            name: "year",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 2000, maximum: 2100 },
          },
        ],
        responses: {
          200: {
            description: "Leave balance",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    balance: { type: "string" },
                    used: { type: "string" },
                    remaining: { type: "string" },
                    policy: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/leave-requests": {
      post: {
        tags: ["Leave Requests"],
        summary: "Create leave request",
        description:
          "Create a leave request (fails on overlap or insufficient balance)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["startDate", "endDate"],
                properties: {
                  startDate: {
                    type: "string",
                    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                  },
                  endDate: {
                    type: "string",
                    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                  },
                  type: { $ref: "#/components/schemas/LeaveType" },
                  reason: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Leave request created" },
          400: {
            description:
              "Overlapping request, insufficient balance, or leave disabled",
          },
        },
      },
    },
    "/api/leave-requests/{id}/status": {
      patch: {
        tags: ["Leave Requests"],
        summary: "Update leave request status",
        description: "Approve or reject a leave request (admin/owner)",
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
                    $ref: "#/components/schemas/LeaveRequestStatus",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated leave request" },
          403: { description: "Forbidden (admin/owner only)" },
          404: { description: "Leave request not found" },
        },
      },
    },
    "/api/leave-requests/settings": {
      get: {
        tags: ["Leave Requests"],
        summary: "Get leave settings",
        description: "Get organization leave settings",
        responses: {
          200: { description: "Organization leave settings" },
        },
      },
      patch: {
        tags: ["Leave Requests"],
        summary: "Update leave settings",
        description: "Update organization leave settings (admin/owner)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "unusedLeavePolicy",
                  "adminLeaveQuota",
                  "collaboratorLeaveQuota",
                ],
                properties: {
                  unusedLeavePolicy: {
                    type: "string",
                    enum: ["CARRY_OVER", "PAID_AS_WORKED"],
                  },
                  adminLeaveQuota: { type: "string" },
                  collaboratorLeaveQuota: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated leave settings" },
          403: { description: "Forbidden (admin/owner only)" },
        },
      },
    },
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get notifications",
        description: "Get the current user's notifications",
        responses: {
          200: { description: "List of notifications" },
        },
      },
    },
    "/api/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Get unread notifications count",
        responses: {
          200: {
            description: "Unread count",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Notification marked as read" },
          404: { description: "Notification not found" },
        },
      },
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        responses: {
          200: { description: "All notifications marked as read" },
        },
      },
    },
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard statistics",
        description:
          "Get dashboard statistics for the current period (owners may target a member via userId)",
        parameters: [
          {
            name: "userId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Dashboard statistics" },
          403: { description: "User does not belong to your organization" },
        },
      },
    },
    "/api/dashboard/new-tickets": {
      get: {
        tags: ["Dashboard"],
        summary: "Get new tickets",
        description:
          "Get recently created tickets (owners may target a member)",
        parameters: [
          {
            name: "userId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "New tickets" },
          403: { description: "User does not belong to your organization" },
        },
      },
    },
    "/api/dashboard/invoice-estimate": {
      get: {
        tags: ["Dashboard"],
        summary: "Get invoice estimate",
        description:
          "Get the estimated invoice for the current period based on presence and tasks (owners may target a member)",
        parameters: [
          {
            name: "userId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Invoice estimate",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: "number" },
                    status: { type: "string" },
                    periodStart: { type: "string" },
                    periodEnd: { type: "string" },
                    source: {
                      type: "string",
                      enum: ["invoice", "calculation"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/dashboard/important-tickets": {
      get: {
        tags: ["Dashboard"],
        summary: "Get important tickets",
        description:
          "Get important tickets for the current period (owners may target a member)",
        parameters: [
          {
            name: "userId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Important tickets" },
          403: { description: "User does not belong to your organization" },
        },
      },
    },
  },
};
