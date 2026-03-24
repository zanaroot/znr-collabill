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
  period: (projectId: string, startDate: string, endDate: string) =>
    [...taskKeys.all, "period", projectId, startDate, endDate] as const,
};

export function useTasks(
  projectId?: string,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey:
      projectId && startDate && endDate
        ? taskKeys.period(projectId, startDate, endDate)
        : projectId
          ? taskKeys.project(projectId)
          : taskKeys.all,
    queryFn: async () => {
      if (projectId && startDate && endDate) {
        const res = await client.api.tasks.project[":projectId"].period.$get({
          param: { projectId },
          query: { startDate, endDate },
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
    enabled: Boolean(projectId),
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
        queryClient.invalidateQueries({
          queryKey: [...taskKeys.all, "period", task.projectId],
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
      queryClient.invalidateQueries({
        queryKey: [...taskKeys.all, "period", task.projectId],
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: string;
      projectId: string;
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

      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.project(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: [...taskKeys.all, "period", projectId],
      });
    },
  });
}
