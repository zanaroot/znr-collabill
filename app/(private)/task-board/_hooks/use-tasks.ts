import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "@/http/models/task.model";
import { client } from "@/packages/hono";

type ErrorResponse = {
  error?: string;
  message?: string;
};

export const taskKeys = {
  all: ["tasks"] as const,
  project: (projectId: string) =>
    [...taskKeys.all, "project", projectId] as const,
  iteration: (iterationId: string) =>
    [...taskKeys.all, "iteration", iterationId] as const,
};

export function useTasks(projectId?: string, iterationId?: string) {
  return useQuery({
    queryKey: iterationId
      ? taskKeys.iteration(iterationId)
      : projectId
        ? taskKeys.project(projectId)
        : taskKeys.all,
    queryFn: async () => {
      if (iterationId) {
        const res = await client.api.tasks.iteration[":iterationId"].$get({
          param: { iterationId },
        });
        if (!res.ok) throw new Error("Failed to fetch tasks");
        return (await res.json()) as Task[];
      }

      if (projectId) {
        const res = await client.api.tasks.project[":projectId"].$get({
          param: { projectId },
        });
        if (!res.ok) throw new Error("Failed to fetch tasks");
        return (await res.json()) as Task[];
      }

      return [] as Task[];
    },
    enabled: Boolean(projectId || iterationId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await client.api.tasks.$post({
        json: data,
      });

      if (!res.ok) {
        const payload = (await res.json()) as ErrorResponse;
        throw new Error(
          payload.error || payload.message || "Failed to create task",
        );
      }

      return (await res.json()) as Task;
    },
    onSuccess: (task) => {
      if (task.projectId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.project(task.projectId),
        });
      }
      if (task.iterationId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.iteration(task.iterationId),
        });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskInput }) => {
      const res = await client.api.tasks[":id"].$put({
        param: { id },
        json: data,
      });

      if (!res.ok) {
        const payload = (await res.json()) as ErrorResponse;
        throw new Error(
          payload.error || payload.message || "Failed to update task",
        );
      }

      return (await res.json()) as Task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.project(task.projectId),
      });
      if (task.iterationId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.iteration(task.iterationId),
        });
      }
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      iterationId,
    }: {
      id: string;
      projectId: string;
      iterationId?: string;
    }) => {
      const res = await client.api.tasks[":id"].$delete({
        param: { id },
      });

      if (!res.ok) {
        const payload = (await res.json()) as ErrorResponse;
        throw new Error(
          payload.error || payload.message || "Failed to delete task",
        );
      }

      return { projectId, iterationId };
    },
    onSuccess: ({ projectId, iterationId }) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.project(projectId),
      });
      if (iterationId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.iteration(iterationId),
        });
      }
    },
  });
}
