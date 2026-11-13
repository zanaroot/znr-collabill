"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/packages/hono";

export interface ProjectFile {
  id: string;
  projectId: string;
  uploadedBy: string;
  uploadedByName: string;
  name: string;
  mimeType: string;
  size: number;
  isSensitive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectFilesResponse {
  files: ProjectFile[];
  total: number;
  page: number;
  limit: number;
}

type ErrorResponse = {
  error?: string;
  message?: string;
};

const projectFileKeys = {
  all: (projectId: string) => ["projects", projectId, "files"] as const,
  list: (projectId: string, page: number, limit: number) =>
    [...projectFileKeys.all(projectId), page, limit] as const,
};

const throwApiError = async (response: Response, fallback: string) => {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(fallback);
  }

  const error = (await response.json()) as ErrorResponse;
  throw new Error(error.error || error.message || fallback);
};

export function useProjectFiles(
  projectId: string,
  page: number,
  limit: number,
) {
  return useQuery({
    queryKey: projectFileKeys.list(projectId, page, limit),
    queryFn: async () => {
      const response = await client.api.projects[":projectId"].files.$get({
        param: { projectId },
        query: { page: String(page), limit: String(limit) },
      });

      if (!response.ok) {
        await throwApiError(response, "Failed to fetch project files");
      }

      return (await response.json()) as ProjectFilesResponse;
    },
    enabled: !!projectId,
  });
}

export function useDownloadProjectFile() {
  return useMutation({
    mutationFn: async ({
      projectId,
      fileId,
      fileName,
    }: {
      projectId: string;
      fileId: string;
      fileName: string;
    }) => {
      const response = await client.api.projects[":projectId"].files[
        ":fileId"
      ].download.$get({
        param: { projectId, fileId },
      });

      if (response.redirected) {
        throw new Error("Authentication is required to download project files");
      }

      if (!response.ok) {
        await throwApiError(response, "Failed to download project file");
      }

      if (
        !response.headers.get("content-disposition")?.startsWith("attachment;")
      ) {
        throw new Error("The server returned an invalid file response");
      }

      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    },
  });
}

export function useUploadProjectFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      file,
      isSensitive,
    }: {
      projectId: string;
      file: File;
      isSensitive: boolean;
    }) => {
      const response = await client.api.projects[":projectId"].files.$post({
        param: { projectId },
        form: {
          file,
          ...(isSensitive ? { isSensitive: "true" as const } : {}),
        },
      });

      if (!response.ok) {
        await throwApiError(response, "Failed to upload project file");
      }

      return (await response.json()) as ProjectFile;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectFileKeys.all(variables.projectId),
      });
    },
  });
}

export function useUpdateProjectFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      fileId,
      file,
      isSensitive,
    }: {
      projectId: string;
      fileId: string;
      file: File;
      isSensitive: boolean;
    }) => {
      const response = await client.api.projects[":projectId"].files[
        ":fileId"
      ].$put({
        param: { projectId, fileId },
        form: {
          file,
          ...(isSensitive ? { isSensitive: "true" as const } : {}),
        },
      });

      if (!response.ok) {
        await throwApiError(response, "Failed to replace project file");
      }

      return (await response.json()) as ProjectFile;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectFileKeys.all(variables.projectId),
      });
    },
  });
}

export function useDeleteProjectFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      fileId,
    }: {
      projectId: string;
      fileId: string;
    }) => {
      const response = await client.api.projects[":projectId"].files[
        ":fileId"
      ].$delete({
        param: { projectId, fileId },
      });

      if (!response.ok) {
        await throwApiError(response, "Failed to delete project file");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectFileKeys.all(variables.projectId),
      });
    },
  });
}
