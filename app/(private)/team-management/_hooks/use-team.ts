"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/http/models/auth.model";
import type { CollaboratorRate, Invitation, UserWithRoles } from "@/http/models/user.model";
import { client } from "@/packages/hono";

export const teamKeys = {
  all: ["team"] as const,
  currentUser: () => [...teamKeys.all, "currentUser"] as const,
  users: () => [...teamKeys.all, "users"] as const,
  invitations: () => [...teamKeys.all, "invitations"] as const,
  collaboratorRates: (userId: string) => [...teamKeys.all, "collaboratorRates", userId] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: teamKeys.currentUser(),
    queryFn: async () => {
      const res = await client.api.users.me.$get();
      if (!res.ok) throw new Error("Failed to fetch current user");
      return (await res.json()) as AuthUser;
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: teamKeys.users(),
    queryFn: async () => {
      const res = await client.api.users.all.$get();
      if (!res.ok) throw new Error("Failed to fetch users");
      return (await res.json()) as UserWithRoles[];
    },
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: teamKeys.invitations(),
    queryFn: async () => {
      const res = await client.api.users.invitations.$get();
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return (await res.json()) as Invitation[];
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.users.invitations[":id"].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to revoke invitation");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.users[":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to delete user");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.users() });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      role,
    }: {
      id: string;
      role: "ADMIN" | "COLLABORATOR";
    }) => {
      const res = await client.api.users[":id"].role.$patch({
        param: { id },
        json: { role },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to update user role");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.users() });
    },
  });
}

export function useCollaboratorRates(userId: string) {
  return useQuery({
    queryKey: teamKeys.collaboratorRates(userId),
    queryFn: async () => {
      const res = await client.api.users[":id"].rates.$get({
        param: { id: userId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        if (res.status === 404) {
          return null;
        }
        throw new Error(error.error || "Failed to fetch collaborator rates");
      }
      return (await res.json()) as CollaboratorRate;
    },
    enabled: !!userId,
  });
}

export function useUpdateCollaboratorRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      rates,
    }: {
      userId: string;
      rates: CollaboratorRate;
    }) => {
      const res = await client.api.users[":id"].rates.$patch({
        param: { id: userId },
        json: rates,
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to update collaborator rates");
      }
      return await res.json();
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.collaboratorRates(userId) });
    },
  });
}
