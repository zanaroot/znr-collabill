// @vitest-environment node

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import type { AuthEnv, AuthUser } from "@/http/models/auth.model";
import {
  MAX_PROJECT_FILE_SIZE,
  projectFileUploadFormSchema,
} from "@/http/models/project-file.model";
import { projectFileRoutes } from "@/http/routes/project-file.route";
import { ProjectFileStorageError } from "@/packages/minio/project-files";

const mocks = vi.hoisted(() => ({
  findProjectById: vi.fn(),
  getOrganizationRole: vi.fn(),
  getProjectMemberRole: vi.fn(),
  isProjectMember: vi.fn(),
  findProjectFilesByProject: vi.fn(),
  findProjectFileById: vi.fn(),
  createProjectFile: vi.fn(),
  updateProjectFile: vi.fn(),
  deleteProjectFileRecord: vi.fn(),
  uploadProjectFile: vi.fn(),
  downloadProjectFile: vi.fn(),
  replaceProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/http/repositories/session.repository", () => ({
  findValidSessionByToken: vi.fn(),
}));
vi.mock("@/http/repositories/project.repository", () => ({
  findProjectById: mocks.findProjectById,
  getOrganizationRole: mocks.getOrganizationRole,
  getProjectMemberRole: mocks.getProjectMemberRole,
  isProjectMember: mocks.isProjectMember,
}));
vi.mock("@/http/repositories/project-file.repository", () => ({
  findProjectFilesByProject: mocks.findProjectFilesByProject,
  findProjectFileById: mocks.findProjectFileById,
  createProjectFile: mocks.createProjectFile,
  updateProjectFile: mocks.updateProjectFile,
  deleteProjectFileRecord: mocks.deleteProjectFileRecord,
}));
vi.mock("@/packages/minio/project-files", () => ({
  uploadProjectFile: mocks.uploadProjectFile,
  downloadProjectFile: mocks.downloadProjectFile,
  replaceProjectFile: mocks.replaceProjectFile,
  deleteProjectFile: mocks.deleteProjectFile,
  ProjectFileStorageError: class ProjectFileStorageError extends Error {
    code = "STORAGE_FAILURE";
  },
}));

const user: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "member@example.com",
  name: "Member",
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  organizationId: "00000000-0000-4000-8000-000000000002",
  organizationName: "Acme",
  organizationRole: "COLLABORATOR",
  platformRole: null,
  emailVerified: null,
};
const projectId = "00000000-0000-4000-8000-000000000003";
const fileId = "00000000-0000-4000-8000-000000000004";
const storageKey = `organizations/${user.organizationId}/projects/${projectId}/00000000-0000-4000-8000-000000000005`;
const project = {
  id: projectId,
  organizationId: user.organizationId,
};
const fileRecord = {
  id: fileId,
  projectId,
  uploadedBy: user.id,
  name: "brief.pdf",
  mimeType: "application/pdf",
  size: 5,
  storageKey,
  isSensitive: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const createApp = () =>
  new Hono<AuthEnv>()
    .use("*", async (c, next) => {
      c.set("user", user);
      await next();
    })
    .route("/projects/:projectId/files", projectFileRoutes);

const projectFilesUrl = `/projects/${projectId}/files`;

const createUploadForm = (name = "brief.pdf", mimeType = "application/pdf") => {
  const form = new FormData();
  form.set("file", new File(["hello"], name, { type: mimeType }), name);
  return form;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findProjectById.mockResolvedValue(project);
  mocks.getOrganizationRole.mockResolvedValue("COLLABORATOR");
  mocks.getProjectMemberRole.mockResolvedValue("MEMBER");
  mocks.isProjectMember.mockResolvedValue(true);
  mocks.uploadProjectFile.mockResolvedValue({ storageKey, size: 5 });
  mocks.downloadProjectFile.mockResolvedValue({
    body: {
      transformToByteArray: async () =>
        new Uint8Array([104, 101, 108, 108, 111]),
    },
    ContentLength: 5,
  });
  mocks.replaceProjectFile.mockResolvedValue({ storageKey, size: 5 });
  mocks.createProjectFile.mockResolvedValue(fileRecord);
  mocks.findProjectFilesByProject.mockResolvedValue({
    files: [{ ...fileRecord, uploadedByName: user.name }],
    total: 1,
  });
  mocks.findProjectFileById.mockResolvedValue(fileRecord);
  mocks.updateProjectFile.mockResolvedValue(fileRecord);
  mocks.deleteProjectFileRecord.mockResolvedValue(fileRecord);
});

describe("project file routes", () => {
  it("rejects unauthenticated requests before accessing project files", async () => {
    const app = new Hono<AuthEnv>()
      .use("*", authMiddleware)
      .route("/projects/:projectId/files", projectFileRoutes);

    const response = await app.request(projectFilesUrl);

    expect(response.status).toBe(302);
    expect(mocks.findProjectById).not.toHaveBeenCalled();
  });

  it("creates metadata and stores file contents outside the database", async () => {
    const response = await createApp().request(projectFilesUrl, {
      method: "POST",
      body: createUploadForm("brief.pdf"),
    });

    expect(response.status).toBe(201);
    expect(mocks.uploadProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: user.organizationId,
        projectId,
        contentType: "application/pdf",
        body: expect.any(Uint8Array),
      }),
    );
    expect(mocks.createProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: "brief.pdf", storageKey, size: 5 }),
    );
    expect(await response.json()).not.toHaveProperty("storageKey");
  });

  it.each([
    [".env", "text/plain", true],
    [".env.local", "text/plain", true],
    ["notes.md", "text/markdown", false],
    ["settings.json", "application/json", false],
    ["notes.txt", "text/plain", false],
  ])("uploads %s and records whether the file is sensitive", async (name, mimeType, sensitive) => {
    const response = await createApp().request(projectFilesUrl, {
      method: "POST",
      body: createUploadForm(name, mimeType),
    });

    expect(response.status).toBe(201);
    expect(mocks.uploadProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: mimeType }),
    );
    expect(mocks.createProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({ name, isSensitive: sensitive }),
    );
  });

  it("rejects files exceeding the configured size before storage", () => {
    const file = new File(["small"], "large.txt", { type: "text/plain" });
    Object.defineProperty(file, "size", {
      value: MAX_PROJECT_FILE_SIZE + 1,
    });

    const result = projectFileUploadFormSchema.safeParse({ file });

    expect(result.success).toBe(false);
    expect(mocks.uploadProjectFile).not.toHaveBeenCalled();
  });

  it("lists and returns metadata only for files in the requested project", async () => {
    const app = createApp();
    const listResponse = await app.request(projectFilesUrl);
    const metadataResponse = await app.request(`${projectFilesUrl}/${fileId}`);

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.files[0]).not.toHaveProperty("storageKey");
    expect(listBody.files[0].uploadedByName).toBe(user.name);
    expect(listBody.total).toBe(1);
    expect(metadataResponse.status).toBe(200);
    expect(await metadataResponse.json()).not.toHaveProperty("storageKey");
    expect(mocks.findProjectFileById).toHaveBeenCalledWith(projectId, fileId);
  });

  it("downloads and previews an authorized file with safe response headers", async () => {
    const app = createApp();
    const download = await app.request(`${projectFilesUrl}/${fileId}/download`);
    const preview = await app.request(`${projectFilesUrl}/${fileId}/preview`);

    expect(download.status).toBe(200);
    expect(download.headers.get("content-disposition")).toContain("attachment");
    expect(preview.headers.get("content-disposition")).toContain("inline");
    expect(download.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await download.text()).toBe("hello");
    expect(mocks.downloadProjectFile).toHaveBeenCalledTimes(2);
  });

  it("previews text, Markdown, and JSON files as non-executable text", async () => {
    mocks.findProjectFileById.mockResolvedValue({
      ...fileRecord,
      name: "settings.json",
      mimeType: "application/json",
    });

    const response = await createApp().request(
      `${projectFilesUrl}/${fileId}/preview`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");

    mocks.findProjectFileById.mockResolvedValue({
      ...fileRecord,
      name: "notes.md",
      mimeType: "text/markdown",
    });
    const markdown = await createApp().request(
      `${projectFilesUrl}/${fileId}/preview`,
    );

    expect(markdown.status).toBe(200);
    expect(markdown.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );

    mocks.findProjectFileById.mockResolvedValue({
      ...fileRecord,
      name: "notes.txt",
      mimeType: "text/plain",
    });
    const text = await createApp().request(
      `${projectFilesUrl}/${fileId}/preview`,
    );

    expect(text.status).toBe(200);
    expect(text.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  it("serves environment configuration as plain text even with an unsafe MIME type", async () => {
    mocks.getProjectMemberRole.mockResolvedValue("PRODUCT_OWNER");
    mocks.findProjectFileById.mockResolvedValue({
      ...fileRecord,
      name: ".env",
      mimeType: "text/html",
      isSensitive: true,
    });

    const response = await createApp().request(
      `${projectFilesUrl}/${fileId}/preview`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("restricts sensitive file preview and download to project admins", async () => {
    mocks.findProjectFileById.mockResolvedValue({
      ...fileRecord,
      isSensitive: true,
    });
    const app = createApp();

    const deniedPreview = await app.request(
      `${projectFilesUrl}/${fileId}/preview`,
    );
    const deniedDownload = await app.request(
      `${projectFilesUrl}/${fileId}/download`,
    );

    expect(deniedPreview.status).toBe(403);
    expect(deniedDownload.status).toBe(403);
    expect(mocks.downloadProjectFile).not.toHaveBeenCalled();

    mocks.getProjectMemberRole.mockResolvedValue("PRODUCT_OWNER");
    const allowedPreview = await app.request(
      `${projectFilesUrl}/${fileId}/preview`,
    );
    const allowedDownload = await app.request(
      `${projectFilesUrl}/${fileId}/download`,
    );

    expect(allowedPreview.status).toBe(200);
    expect(allowedDownload.status).toBe(200);
    expect(mocks.downloadProjectFile).toHaveBeenCalledTimes(2);
  });

  it("replaces and deletes files only for project admins", async () => {
    mocks.getProjectMemberRole.mockResolvedValue("PRODUCT_OWNER");
    const app = createApp();
    const replace = await app.request(`${projectFilesUrl}/${fileId}`, {
      method: "PUT",
      body: createUploadForm("updated.pdf"),
    });

    const remove = await app.request(`${projectFilesUrl}/${fileId}`, {
      method: "DELETE",
    });

    expect(replace.status).toBe(200);
    expect(mocks.replaceProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({ storageKey, projectId }),
    );
    expect(remove.status).toBe(204);
    expect(mocks.deleteProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({ storageKey, projectId }),
    );
    expect(mocks.deleteProjectFileRecord).toHaveBeenCalledWith(
      projectId,
      fileId,
    );
  });

  it("does not allow a sensitive file to be downgraded during replacement", async () => {
    mocks.getProjectMemberRole.mockResolvedValue("PRODUCT_OWNER");
    mocks.findProjectFileById.mockResolvedValue({
      ...fileRecord,
      isSensitive: true,
    });
    const form = createUploadForm("updated.pdf");
    form.set("isSensitive", "false");

    const response = await createApp().request(`${projectFilesUrl}/${fileId}`, {
      method: "PUT",
      body: form,
    });

    expect(response.status).toBe(200);
    expect(mocks.updateProjectFile).toHaveBeenCalledWith(
      projectId,
      fileId,
      expect.objectContaining({ isSensitive: true }),
    );
  });

  it("denies writes by regular members and hides files from other projects", async () => {
    const app = createApp();
    const denied = await app.request(`${projectFilesUrl}/${fileId}`, {
      method: "PUT",
      body: createUploadForm(),
    });

    expect(denied.status).toBe(403);
    expect(mocks.replaceProjectFile).not.toHaveBeenCalled();

    mocks.findProjectFileById.mockResolvedValue(null);
    const missing = await app.request(`${projectFilesUrl}/${fileId}`);

    expect(missing.status).toBe(404);
  });

  it("denies access to users outside the project organization", async () => {
    mocks.findProjectById.mockResolvedValue({
      ...project,
      organizationId: "00000000-0000-4000-8000-000000000099",
    });

    const response = await createApp().request(projectFilesUrl);

    expect(response.status).toBe(404);
    expect(mocks.findProjectFilesByProject).not.toHaveBeenCalled();
  });

  it("returns an explicit gateway error when MinIO is unavailable", async () => {
    const error = new ProjectFileStorageError("STORAGE_FAILURE");
    Object.defineProperty(error, "cause", {
      value: new Error("sensitive-secret-value"),
    });
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.downloadProjectFile.mockRejectedValueOnce(error);

    const response = await createApp().request(
      `${projectFilesUrl}/${fileId}/download`,
    );

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "Project file storage is unavailable",
    });
    expect(JSON.stringify(body)).not.toContain("sensitive-secret-value");
    expect(logError).not.toHaveBeenCalled();
    logError.mockRestore();
  });

  it("rejects malformed project ids and unsupported preview types", async () => {
    const invalidProject = await createApp().request(
      "/projects/not-a-uuid/files",
    );
    expect(invalidProject.status).toBe(400);

    mocks.findProjectFileById.mockResolvedValue({
      ...fileRecord,
      mimeType: "text/html",
    });
    const unsupported = await createApp().request(
      `${projectFilesUrl}/${fileId}/preview`,
    );

    expect(unsupported.status).toBe(415);
    expect(mocks.downloadProjectFile).not.toHaveBeenCalled();
  });
});
