import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv } from "@/http/models/auth.model";
import type { Role } from "@/http/models/user.model";
import { taskRoutes } from "@/http/routes/task.route";

const mocks = vi.hoisted(() => ({
  canTransitionTaskStatus: vi.fn(),
  canDeleteTaskByStatus: vi.fn(() => true),
  logAudit: vi.fn(),
  createNotification: vi.fn(),
  findProjectById: vi.fn(),
  isProjectMember: vi.fn(),
  getOrganizationRole: vi.fn(),
  getProjectMemberRole: vi.fn(),
  hasProjectAdminAccess: vi.fn(),
  findTaskById: vi.fn(),
  updateTaskWithAutoAssignment: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  notifyTaskAssignedEmail: vi.fn(),
  notifyTaskAssignedSlack: vi.fn(),
  notifyTaskInReviewSlack: vi.fn(),
  notifyTaskValidatedSlack: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock("@/app/_utils/task-workflow", () => ({
  canTransitionTaskStatus: mocks.canTransitionTaskStatus,
  canDeleteTaskByStatus: mocks.canDeleteTaskByStatus,
}));

vi.mock("@/http/actions/audit.action", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("@/http/repositories/notification.repository", () => ({
  createNotification: mocks.createNotification,
}));

vi.mock("@/http/repositories/project.repository", () => ({
  findProjectById: mocks.findProjectById,
  isProjectMember: mocks.isProjectMember,
  getOrganizationRole: mocks.getOrganizationRole,
  getProjectMemberRole: mocks.getProjectMemberRole,
  hasProjectAdminAccess: mocks.hasProjectAdminAccess,
}));

vi.mock("@/http/repositories/task.repository", () => ({
  findTaskById: mocks.findTaskById,
  updateTaskWithAutoAssignment: mocks.updateTaskWithAutoAssignment,
  createTask: mocks.createTask,
  deleteTask: mocks.deleteTask,
}));

vi.mock("@/lib/notifications", () => ({
  notifyTaskAssignedEmail: mocks.notifyTaskAssignedEmail,
  notifyTaskAssignedSlack: mocks.notifyTaskAssignedSlack,
  notifyTaskInReviewSlack: mocks.notifyTaskInReviewSlack,
  notifyTaskValidatedSlack: mocks.notifyTaskValidatedSlack,
}));

vi.mock("@/packages/minio", () => ({
  uploadFile: mocks.uploadFile,
}));

type TestUser = AuthEnv["Variables"]["user"];

const buildUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: "user-1",
  email: "user1@example.com",
  name: "User One",
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  emailVerified: null,
  platformRole: null,
  organizationId: "org-1",
  organizationName: "Org",
  organizationRole: "COLLABORATOR",
  ...overrides,
});

type TaskOverrides = {
  status?: string;
  assignedTo?: string | null;
  reviewerId?: string | null;
  gitBranch?: string | null;
  previewLink?: string | null;
  validatedBy?: string | null;
};

const buildTask = (overrides: TaskOverrides = {}) => ({
  id: "task-1",
  projectId: "project-1",
  title: "Task",
  description: null,
  size: "M",
  priority: 1,
  dueDate: null,
  assignedTo: overrides.assignedTo ?? null,
  status: overrides.status ?? "TODO",
  validatedAt: null,
  validatedBy: overrides.validatedBy ?? null,
  reviewerId: overrides.reviewerId ?? null,
  archivedAt: null,
  invoiceId: null,
  gitRepo: null,
  gitBranch: overrides.gitBranch ?? null,
  gitPullRequest: null,
  previewLink: overrides.previewLink ?? null,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
});

let currentUser: TestUser | undefined;

const app = new Hono<AuthEnv>();
app.use("*", async (c, next) => {
  const headerUserId = c.req.header("x-test-user-id");
  const headerRole = c.req.header("x-test-role") as Role | undefined;

  if (headerUserId) {
    c.set(
      "user",
      buildUser({
        id: headerUserId,
        organizationRole: headerRole ?? "OWNER",
      }),
    );
  } else if (currentUser) {
    c.set("user", currentUser);
  }

  await next();
});
app.route("/", taskRoutes);

const putTask = (body: unknown, id = "task-1") =>
  app.request(`/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = buildUser();
  mocks.canTransitionTaskStatus.mockReturnValue(true);
  mocks.canDeleteTaskByStatus.mockReturnValue(true);
  mocks.logAudit.mockResolvedValue(undefined);
  mocks.createNotification.mockResolvedValue(undefined);
  mocks.notifyTaskAssignedEmail.mockResolvedValue(undefined);
  mocks.notifyTaskAssignedSlack.mockResolvedValue(undefined);
  mocks.notifyTaskInReviewSlack.mockResolvedValue(undefined);
  mocks.notifyTaskValidatedSlack.mockResolvedValue(undefined);
  mocks.findProjectById.mockResolvedValue({
    id: "project-1",
    organizationId: "org-1",
  });
  mocks.isProjectMember.mockResolvedValue(true);
  mocks.getOrganizationRole.mockResolvedValue("COLLABORATOR");
  mocks.getProjectMemberRole.mockResolvedValue("MEMBER");
  mocks.hasProjectAdminAccess.mockResolvedValue(false);
  mocks.findTaskById.mockResolvedValue(buildTask());
  mocks.updateTaskWithAutoAssignment.mockImplementation(
    async (
      _id: string,
      input: Record<string, unknown>,
      auto?: string | null,
    ) => ({
      ...buildTask(),
      ...input,
      assignedTo: input.assignedTo ?? auto ?? null,
    }),
  );
});

describe("PUT /tasks/:id delivery fields", () => {
  it("allows a collaborator to update branch name and preview link", async () => {
    currentUser = buildUser({ organizationRole: "COLLABORATOR" });
    mocks.updateTaskWithAutoAssignment.mockResolvedValue(
      buildTask({
        gitBranch: "feature/collaborator-branch",
        previewLink: "https://preview.example.com/task",
      }),
    );

    const res = await putTask({
      gitBranch: "feature/collaborator-branch",
      previewLink: "https://preview.example.com/task",
    });

    expect(res.status).toBe(200);
    expect(mocks.updateTaskWithAutoAssignment).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        gitBranch: "feature/collaborator-branch",
        previewLink: "https://preview.example.com/task",
      }),
      null,
    );
  });

  it("rejects an invalid preview URL before persisting", async () => {
    const res = await putTask({ previewLink: "not-a-url" });

    expect(res.status).toBe(400);
    expect(mocks.updateTaskWithAutoAssignment).not.toHaveBeenCalled();
  });

  it("prevents users from another organization from updating a task", async () => {
    currentUser = buildUser({ organizationId: "org-2" });
    mocks.findProjectById.mockResolvedValue({
      id: "project-1",
      organizationId: "org-1",
    });

    const res = await putTask({
      gitBranch: "feature/other-org",
      previewLink: "https://preview.example.com/other-org",
    });

    expect(res.status).toBe(403);
    expect(mocks.updateTaskWithAutoAssignment).not.toHaveBeenCalled();
  });
});

describe("PUT /tasks/:id automatic assignment", () => {
  it("assigns an unassigned task to the user moving it to IN_PROGRESS", async () => {
    currentUser = buildUser({ id: "user-1", organizationRole: "COLLABORATOR" });
    mocks.findTaskById.mockResolvedValue(
      buildTask({ status: "TODO", assignedTo: null }),
    );
    mocks.updateTaskWithAutoAssignment.mockResolvedValue(
      buildTask({ status: "IN_PROGRESS", assignedTo: "user-1" }),
    );

    const res = await putTask({ status: "IN_PROGRESS" });
    const body = (await res.json()) as { assignedTo: string };

    expect(res.status).toBe(200);
    expect(body.assignedTo).toBe("user-1");
    expect(mocks.updateTaskWithAutoAssignment).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({ status: "IN_PROGRESS" }),
      "user-1",
    );

    const updates = mocks.updateTaskWithAutoAssignment.mock.calls[0][1] as
      | Record<string, unknown>
      | undefined;
    expect(updates).toBeDefined();
    expect(Object.hasOwn(updates ?? {}, "assignedTo")).toBe(false);
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TASK_ASSIGNED",
        userId: "user-1",
      }),
    );
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ autoAssignedTo: "user-1" }),
      }),
    );
  });

  it("does not override an existing assignee when moving to IN_PROGRESS", async () => {
    currentUser = buildUser({ id: "user-1", organizationRole: "COLLABORATOR" });
    mocks.findTaskById.mockResolvedValue(
      buildTask({ status: "TODO", assignedTo: "user-2" }),
    );
    mocks.updateTaskWithAutoAssignment.mockResolvedValue(
      buildTask({ status: "IN_PROGRESS", assignedTo: "user-2" }),
    );

    const res = await putTask({ status: "IN_PROGRESS" });
    const body = (await res.json()) as { assignedTo: string };

    expect(res.status).toBe(200);
    expect(body.assignedTo).toBe("user-2");
    expect(mocks.updateTaskWithAutoAssignment).toHaveBeenCalledWith(
      "task-1",
      expect.not.objectContaining({ assignedTo: expect.anything() }),
      null,
    );
  });

  it("keeps the first assignment during concurrent IN_PROGRESS updates", async () => {
    const state: { assignedTo: string | null } = { assignedTo: null };

    mocks.findTaskById.mockImplementation(async () =>
      buildTask({ status: "TODO", assignedTo: state.assignedTo }),
    );
    mocks.updateTaskWithAutoAssignment.mockImplementation(
      async (
        _id: string,
        input: Record<string, unknown>,
        auto?: string | null,
      ) => {
        state.assignedTo = state.assignedTo ?? auto ?? null;
        return buildTask({
          status: "IN_PROGRESS",
          assignedTo: state.assignedTo,
          reviewerId: null,
          ...input,
        });
      },
    );

    const requestFor = (userId: string) =>
      app.request("/task-1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userId,
          "x-test-role": "COLLABORATOR",
        },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });

    const [first, second] = await Promise.all([
      requestFor("user-1"),
      requestFor("user-2"),
    ]);
    const firstBody = (await first.json()) as { assignedTo: string };
    const secondBody = (await second.json()) as { assignedTo: string };

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.assignedTo).not.toBeNull();
    expect(["user-1", "user-2"]).toContain(state.assignedTo);
    expect(firstBody.assignedTo).toBe(state.assignedTo);
    expect(secondBody.assignedTo).toBe(state.assignedTo);
  });
});

describe("PUT /tasks/:id approval and validation rules", () => {
  it("rejects approving an unassigned task", async () => {
    currentUser = buildUser({ organizationRole: "OWNER" });
    mocks.findTaskById.mockResolvedValue(
      buildTask({
        status: "IN_REVIEW",
        assignedTo: null,
        reviewerId: "user-1",
      }),
    );

    const res = await putTask({ status: "APPROVED" });
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toContain("assignee");
    expect(mocks.updateTaskWithAutoAssignment).not.toHaveBeenCalled();
  });

  it("rejects validating an unassigned task", async () => {
    currentUser = buildUser({ organizationRole: "OWNER" });
    mocks.findTaskById.mockResolvedValue(
      buildTask({ status: "APPROVED", assignedTo: null }),
    );

    const res = await putTask({ status: "VALIDATED" });
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toContain("assignee");
    expect(mocks.updateTaskWithAutoAssignment).not.toHaveBeenCalled();
  });

  it("keeps approval and validation working for assigned tasks", async () => {
    currentUser = buildUser({ organizationRole: "OWNER" });
    mocks.findTaskById.mockResolvedValue(
      buildTask({ status: "APPROVED", assignedTo: "user-2" }),
    );
    mocks.updateTaskWithAutoAssignment.mockResolvedValue(
      buildTask({
        status: "VALIDATED",
        assignedTo: "user-2",
        validatedBy: "user-1",
      }),
    );

    const res = await putTask({ status: "VALIDATED" });
    const body = (await res.json()) as { status: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe("VALIDATED");
    expect(mocks.updateTaskWithAutoAssignment).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        status: "VALIDATED",
        validatedBy: "user-1",
        validatedAt: expect.any(Date),
      }),
      null,
    );
  });

  it("still enforces existing transition permissions", async () => {
    currentUser = buildUser({ organizationRole: "COLLABORATOR" });
    mocks.findTaskById.mockResolvedValue(
      buildTask({ status: "IN_REVIEW", assignedTo: "user-2" }),
    );
    mocks.canTransitionTaskStatus.mockReturnValue(false);

    const res = await putTask({ status: "APPROVED" });

    expect(res.status).toBe(403);
    expect(mocks.updateTaskWithAutoAssignment).not.toHaveBeenCalled();
  });
});
