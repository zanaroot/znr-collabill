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
          "Update invoice status (owner only); setting DRAFT deletes the invoice and unarchives its tasks",
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
