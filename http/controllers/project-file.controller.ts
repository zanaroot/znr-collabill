import "server-only";
import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { projectFiles } from "@/db/schema/project-file";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  projectFileListQuerySchema,
  projectFileParamsSchema,
  projectFilesParamsSchema,
  projectFileUploadFormSchema,
} from "@/http/models/project-file.model";
import * as projectRepository from "@/http/repositories/project.repository";
import * as projectFileRepository from "@/http/repositories/project-file.repository";
import {
  isPreviewableProjectTextFile,
  isSensitiveProjectFileName,
} from "@/lib/project-files";
import {
  deleteProjectFile,
  downloadProjectFile,
  ProjectFileStorageError,
  replaceProjectFile,
  uploadProjectFile,
} from "@/packages/minio/project-files";

const factory = createFactory<AuthEnv>();
const previewableMimeTypes = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
]);
type ProjectFileRecord = typeof projectFiles.$inferSelect;

const toProjectFileResponse = (
  file: ProjectFileRecord,
  uploadedByName: string,
) => {
  const { storageKey: _storageKey, ...metadata } = file;
  return { ...metadata, uploadedByName };
};

const createApiError = (status: 403 | 404 | 415 | 502, message: string) =>
  new HTTPException(status, {
    res: Response.json({ error: message }, { status }),
  });

const getSafeFileName = (name: string) => {
  const sanitized = name
    .replaceAll("\\", "/")
    .split("/")
    .at(-1)
    ?.replace(/\p{Cc}/gu, "")
    .trim()
    .slice(0, 255);

  return sanitized && sanitized !== "." && sanitized !== ".."
    ? sanitized
    : "download";
};

const getContentDisposition = (
  name: string,
  disposition: "attachment" | "inline",
) => {
  const safeName = getSafeFileName(name);
  const fallbackName = safeName.replace(/[^\x20-\x7e]|["\\;]/g, "_");
  const encodedName = encodeURIComponent(safeName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
};

const requireProjectAccess = async (
  projectId: string,
  userId: string,
  userOrganizationId: string | null,
  canManage: boolean,
) => {
  const project = await projectRepository.findProjectById(projectId);

  if (!project || project.organizationId !== userOrganizationId) {
    throw createApiError(404, "Project not found");
  }

  const organizationRole = await projectRepository.getOrganizationRole(
    userId,
    project.organizationId,
  );
  if (!organizationRole) {
    throw createApiError(
      403,
      "You are not a member of this project's organization",
    );
  }

  const projectRole = await projectRepository.getProjectMemberRole(
    projectId,
    userId,
  );
  const hasAdminAccess =
    organizationRole === "OWNER" ||
    organizationRole === "ADMIN" ||
    projectRole === "PRODUCT_OWNER";
  const isProjectMember = hasAdminAccess || projectRole !== null;

  if (!isProjectMember) {
    throw createApiError(403, "You do not have access to this project");
  }

  if (canManage && !hasAdminAccess) {
    throw createApiError(403, "Only project admins can modify project files");
  }

  return { ...project, canManageFiles: hasAdminAccess };
};

const getProjectFile = async (projectId: string, fileId: string) => {
  const file = await projectFileRepository.findProjectFileById(
    projectId,
    fileId,
  );

  if (!file) {
    throw createApiError(404, "Project file not found");
  }

  return file;
};

const withStorageErrors = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ProjectFileStorageError) {
      if (error.code === "NOT_FOUND") {
        throw createApiError(404, "Project file not found");
      }

      throw createApiError(502, "Project file storage is unavailable");
    }

    throw error;
  }
};

export const createProjectFile = factory.createHandlers(
  zValidator("param", projectFilesParamsSchema),
  zValidator("form", projectFileUploadFormSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    const user = c.get("user");
    const { file, isSensitive } = c.req.valid("form");
    const project = await requireProjectAccess(
      projectId,
      user.id,
      user.organizationId,
      false,
    );
    const name = getSafeFileName(file.name);
    const mimeType = file.type || "application/octet-stream";

    if (mimeType.length > 255) {
      return c.json({ error: "MIME type is too long" }, 400);
    }

    const body = new Uint8Array(await file.arrayBuffer());
    const stored = await withStorageErrors(() =>
      uploadProjectFile({
        organizationId: project.organizationId,
        projectId,
        body,
        contentType: mimeType,
      }),
    );

    let record: ProjectFileRecord;
    try {
      record = await projectFileRepository.createProjectFile({
        projectId,
        uploadedBy: user.id,
        name,
        mimeType,
        size: stored.size,
        storageKey: stored.storageKey,
        isSensitive: (isSensitive ?? false) || isSensitiveProjectFileName(name),
      });
    } catch (error) {
      try {
        await deleteProjectFile({
          organizationId: project.organizationId,
          projectId,
          storageKey: stored.storageKey,
        });
      } catch {
        // Keep cleanup failures out of logs; storage errors may include provider details.
      }

      throw error;
    }

    return c.json(toProjectFileResponse(record, user.name), 201);
  },
);

export const getProjectFiles = factory.createHandlers(
  zValidator("param", projectFilesParamsSchema),
  zValidator("query", projectFileListQuerySchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    const { page, limit } = c.req.valid("query");
    const user = c.get("user");

    await requireProjectAccess(projectId, user.id, user.organizationId, false);

    const files = await projectFileRepository.findProjectFilesByProject(
      projectId,
      page,
      limit,
    );

    return c.json({
      files: files.files.map((file) =>
        toProjectFileResponse(file, file.uploadedByName),
      ),
      total: files.total,
      page,
      limit,
    });
  },
);

export const getProjectFileMetadata = factory.createHandlers(
  zValidator("param", projectFileParamsSchema),
  async (c) => {
    const { projectId, fileId } = c.req.valid("param");
    const user = c.get("user");

    await requireProjectAccess(projectId, user.id, user.organizationId, false);
    const file = await getProjectFile(projectId, fileId);

    return c.json(toProjectFileResponse(file, file.uploadedByName));
  },
);

const sendProjectFile = async (
  organizationId: string,
  file: ProjectFileRecord,
  disposition: "attachment" | "inline",
) => {
  const isTextPreview = isPreviewableProjectTextFile(file.name, file.mimeType);
  const isPreviewable =
    previewableMimeTypes.has(file.mimeType) || isTextPreview;

  if (disposition === "inline" && !isPreviewable) {
    throw createApiError(415, "This file type cannot be previewed");
  }

  const content = await withStorageErrors(async () => {
    const object = await downloadProjectFile({
      organizationId,
      projectId: file.projectId,
      storageKey: file.storageKey,
    });

    return object.body.transformToByteArray();
  });

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": getContentDisposition(file.name, disposition),
    "Content-Length": String(content.byteLength),
    "Content-Type":
      disposition === "inline" && isTextPreview
        ? "text/plain; charset=utf-8"
        : file.mimeType,
    "X-Content-Type-Options": "nosniff",
  });

  return new Response(new Uint8Array(content), {
    status: 200,
    headers,
  });
};

export const downloadProjectFileHandler = factory.createHandlers(
  zValidator("param", projectFileParamsSchema),
  async (c) => {
    const { projectId, fileId } = c.req.valid("param");
    const user = c.get("user");

    const project = await requireProjectAccess(
      projectId,
      user.id,
      user.organizationId,
      false,
    );
    const file = await getProjectFile(projectId, fileId);

    if (file.isSensitive && !project.canManageFiles) {
      throw createApiError(
        403,
        "Only organization admins or project owners can access sensitive files",
      );
    }

    return sendProjectFile(project.organizationId, file, "attachment");
  },
);

export const previewProjectFile = factory.createHandlers(
  zValidator("param", projectFileParamsSchema),
  async (c) => {
    const { projectId, fileId } = c.req.valid("param");
    const user = c.get("user");

    const project = await requireProjectAccess(
      projectId,
      user.id,
      user.organizationId,
      false,
    );
    const file = await getProjectFile(projectId, fileId);

    if (file.isSensitive && !project.canManageFiles) {
      throw createApiError(
        403,
        "Only organization admins or project owners can access sensitive files",
      );
    }

    return sendProjectFile(project.organizationId, file, "inline");
  },
);

export const replaceProjectFileHandler = factory.createHandlers(
  zValidator("param", projectFileParamsSchema),
  zValidator("form", projectFileUploadFormSchema),
  async (c) => {
    const { projectId, fileId } = c.req.valid("param");
    const user = c.get("user");
    const { file: replacement, isSensitive } = c.req.valid("form");
    const project = await requireProjectAccess(
      projectId,
      user.id,
      user.organizationId,
      true,
    );
    const existing = await getProjectFile(projectId, fileId);
    const name = getSafeFileName(replacement.name);
    const mimeType = replacement.type || "application/octet-stream";

    if (mimeType.length > 255) {
      return c.json({ error: "MIME type is too long" }, 400);
    }

    const body = new Uint8Array(await replacement.arrayBuffer());
    const stored = await withStorageErrors(() =>
      replaceProjectFile({
        organizationId: project.organizationId,
        projectId,
        storageKey: existing.storageKey,
        body,
        contentType: mimeType,
      }),
    );
    const updated = await projectFileRepository.updateProjectFile(
      projectId,
      fileId,
      {
        name,
        mimeType,
        size: stored.size,
        isSensitive:
          existing.isSensitive ||
          (isSensitive ?? false) ||
          isSensitiveProjectFileName(name),
      },
    );

    if (!updated) {
      throw createApiError(404, "Project file not found");
    }

    return c.json(toProjectFileResponse(updated, existing.uploadedByName));
  },
);

export const deleteProjectFileHandler = factory.createHandlers(
  zValidator("param", projectFileParamsSchema),
  async (c) => {
    const { projectId, fileId } = c.req.valid("param");
    const user = c.get("user");
    const project = await requireProjectAccess(
      projectId,
      user.id,
      user.organizationId,
      true,
    );
    const file = await getProjectFile(projectId, fileId);

    await withStorageErrors(() =>
      deleteProjectFile({
        organizationId: project.organizationId,
        projectId,
        storageKey: file.storageKey,
      }),
    );
    const deleted = await projectFileRepository.deleteProjectFileRecord(
      projectId,
      fileId,
    );

    if (!deleted) {
      throw createApiError(404, "Project file not found");
    }

    return c.body(null, 204);
  },
);
