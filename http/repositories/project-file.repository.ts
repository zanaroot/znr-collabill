import "server-only";

import { and, count, desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { projectFiles, users } from "@/db/schema";

export const findProjectFilesByProject = async (
  projectId: string,
  page: number,
  limit: number,
) => {
  const [files, [{ total }]] = await Promise.all([
    db
      .select({
        ...getTableColumns(projectFiles),
        uploadedByName: users.name,
      })
      .from(projectFiles)
      .innerJoin(users, eq(projectFiles.uploadedBy, users.id))
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt), desc(projectFiles.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ total: count() })
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId)),
  ]);

  return { files, total };
};

export const findProjectFileById = async (
  projectId: string,
  fileId: string,
) => {
  const [file] = await db
    .select({
      ...getTableColumns(projectFiles),
      uploadedByName: users.name,
    })
    .from(projectFiles)
    .innerJoin(users, eq(projectFiles.uploadedBy, users.id))
    .where(
      and(eq(projectFiles.projectId, projectId), eq(projectFiles.id, fileId)),
    )
    .limit(1);

  return file ?? null;
};

export const createProjectFile = async (input: {
  projectId: string;
  uploadedBy: string;
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
  isSensitive: boolean;
}) => {
  const [file] = await db.insert(projectFiles).values(input).returning();
  return file;
};

export const updateProjectFile = async (
  projectId: string,
  fileId: string,
  input: {
    name: string;
    mimeType: string;
    size: number;
    isSensitive: boolean;
  },
) => {
  const [file] = await db
    .update(projectFiles)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(eq(projectFiles.projectId, projectId), eq(projectFiles.id, fileId)),
    )
    .returning();

  return file ?? null;
};

export const deleteProjectFileRecord = async (
  projectId: string,
  fileId: string,
) => {
  const [file] = await db
    .delete(projectFiles)
    .where(
      and(eq(projectFiles.projectId, projectId), eq(projectFiles.id, fileId)),
    )
    .returning();

  return file ?? null;
};
