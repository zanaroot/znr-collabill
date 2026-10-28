"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CallDto,
  CallTokenResponse,
  CallType,
} from "@/http/models/call.model";
import { client } from "@/packages/hono";

const callKeys = {
  all: ["calls"] as const,
  active: () => [...callKeys.all, "active"] as const,
  history: () => [...callKeys.all, "history"] as const,
};

const ACTIVE_CALLS_POLL_MS = 5_000;

export const useActiveCalls = () =>
  useQuery({
    queryKey: callKeys.active(),
    queryFn: async () => {
      const res = await client.api.calls.active.$get();
      if (!res.ok) throw new Error("Failed to fetch active calls");
      return (await res.json()) as CallDto[];
    },
    refetchInterval: ACTIVE_CALLS_POLL_MS,
  });

export const useCallHistory = () =>
  useQuery({
    queryKey: callKeys.history(),
    queryFn: async () => {
      const res = await client.api.calls.$get();
      if (!res.ok) throw new Error("Failed to fetch call history");
      return (await res.json()) as CallDto[];
    },
  });

export const useStartCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      calleeId,
      type,
    }: {
      calleeId: string;
      type: CallType;
    }) => {
      const res = await client.api.calls.$post({ json: { calleeId, type } });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to start call");
      }
      const data = (await res.json()) as { call: CallDto };
      return data.call;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.active() });
    },
  });
};

export const useAcceptCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const res = await client.api.calls[":id"].accept.$post({
        param: { id: callId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to accept call");
      }
      return (await res.json()) as CallTokenResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.active() });
    },
  });
};

export const useRejectCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const res = await client.api.calls[":id"].reject.$post({
        param: { id: callId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to reject call");
      }
      return (await res.json()) as { call: CallDto };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.active() });
    },
  });
};

export const useCancelCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const res = await client.api.calls[":id"].cancel.$post({
        param: { id: callId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to cancel call");
      }
      return (await res.json()) as { call: CallDto };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.active() });
    },
  });
};

export const useLeaveCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const res = await client.api.calls[":id"].leave.$post({
        param: { id: callId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to leave call");
      }
      return (await res.json()) as { call: CallDto };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.active() });
      queryClient.invalidateQueries({ queryKey: callKeys.history() });
    },
  });
};

export const useCallToken = (callId: string, enabled: boolean) =>
  useQuery({
    queryKey: [...callKeys.all, "token", callId] as const,
    queryFn: async () => {
      const res = await client.api.calls[":id"].token.$post({
        param: { id: callId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to join call");
      }
      return (await res.json()) as CallTokenResponse;
    },
    enabled,
    retry: false,
    staleTime: 0,
  });
