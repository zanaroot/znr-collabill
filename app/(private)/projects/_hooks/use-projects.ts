import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/http/models/project.model";
import { client } from "@/packages/hono";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  members: (id: string) => [...projectKeys.all, id, "members"] as const,
};

type ErrorResponse = {
  error?: string;
  message?: string;
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const res = await client.api.projects.$get();
      if (!res.ok) throw new Error("Failed to fetch projects");
      return (await res.json()) as Project[];
    },
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: async () => {
      const res = await client.api.projects[":id"].members.$get({
        param: { id: projectId },
      });
      if (!res.ok) throw new Error("Failed to fetch project members");
      return (await res.json()) as {
        id: string;
        name: string;
        email: string;
        avatar: string | null;
      }[];
    },
    enabled: !!projectId,
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => {
      const res = await client.api.projects[":id"].members.$post({
        param: { id: projectId },
        json: { userId },
      });
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(
          error.error || error.message || "Failed to add project member",
        );
      }
      return (await res.json()) as { message: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.members(variables.projectId),
      });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const res = await client.api.projects.$post({
        json: data,
      });
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(
          error.error || error.message || "Failed to create project",
        );
      }
      return (await res.json()) as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.projects[":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(
          error.error || error.message || "Failed to delete project",
        );
      }
      return (await res.json()) as { message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProjectInput;
    }) => {
      const res = await client.api.projects[":id"].$put({
        param: { id },
        json: data,
      });
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(
          error.error || error.message || "Failed to update project",
        );
      }
      return (await res.json()) as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
