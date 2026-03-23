import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/packages/hono";
import type {
  CreateIterationInput,
  Iteration,
  UpdateIterationInput,
} from "@/http/models/iteration.model";

export const useIterations = () => {
  return useQuery({
    queryKey: ["iterations"],
    queryFn: async () => {
      const res = await client.api.iterations.$get();
      if (!res.ok) throw new Error("Failed to fetch iterations");
      return (await res.json()) as Iteration[];
    },
  });
};

export const useIteration = (id?: string) => {
  return useQuery({
    queryKey: ["iteration", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await client.api.iterations[":id"].$get({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to fetch iteration");
      return (await res.json()) as Iteration;
    },
    enabled: !!id,
  });
};

export const useCreateIteration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateIterationInput) => {
      const res = await client.api.iterations.$post({
        json: input,
      });
      if (!res.ok) throw new Error("Failed to create iteration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["iterations"],
      });
    },
  });
};

export const useUpdateIteration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateIterationInput }) => {
      const res = await client.api.iterations[":id"].$patch({
        param: { id },
        json: data,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update iteration: ${text}`);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["iteration", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["iterations"],
      });
    },
  });
};

export const useDeleteIteration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.iterations[":id"].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to delete iteration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["iterations"],
      });
    },
  });
};
