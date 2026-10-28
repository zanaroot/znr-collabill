"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateMeetingInput,
  GuestLinkResponse,
  MeetingDto,
  MeetingInvitationDto,
  MeetingTokenResponse,
  PublicMeetingInfo,
} from "@/http/models/meeting.model";
import { client } from "@/packages/hono";

export type MeetingListItem = MeetingDto & { participantCount: number };

const meetingKeys = {
  all: ["meetings"] as const,
  list: () => [...meetingKeys.all, "list"] as const,
  detail: (id: string) => [...meetingKeys.all, "detail", id] as const,
  publicInfo: (token: string) =>
    [...meetingKeys.all, "publicInfo", token] as const,
};

export const useMeetings = () =>
  useQuery({
    queryKey: meetingKeys.list(),
    queryFn: async () => {
      const res = await client.api.meetings.$get();
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return (await res.json()) as MeetingListItem[];
    },
  });

export const useMeeting = (id: string) =>
  useQuery({
    queryKey: meetingKeys.detail(id),
    queryFn: async () => {
      const res = await client.api.meetings[":id"].$get({ param: { id } });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to fetch meeting");
      }
      return (await res.json()) as MeetingDto;
    },
    enabled: Boolean(id),
  });

export const useCreateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      const res = await client.api.meetings.$post({ json: input });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to create meeting");
      }
      const data = (await res.json()) as { meeting: MeetingDto };
      return data.meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.list() });
    },
  });
};

export const useInviteMeetingMembers = (meetingId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const res = await client.api.meetings[":id"].invitations.$post({
        param: { id: meetingId },
        json: { userIds },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to invite members");
      }
      return (await res.json()) as {
        created: MeetingInvitationDto[];
        skipped: string[];
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.detail(meetingId),
      });
    },
  });
};

export const useRevokeMeetingInvitation = (meetingId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await client.api.meetings[":id"].invitations[
        ":invitationId"
      ].$delete({
        param: { id: meetingId, invitationId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to revoke invitation");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.detail(meetingId),
      });
    },
  });
};

export const useCreateGuestLink = (meetingId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await client.api.meetings[":id"]["guest-link"].$post({
        param: { id: meetingId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to create guest link");
      }
      return (await res.json()) as GuestLinkResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.detail(meetingId),
      });
    },
  });
};

export const useJoinMeeting = () =>
  useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await client.api.meetings[":id"].join.$post({
        param: { id: meetingId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to join meeting");
      }
      return (await res.json()) as MeetingTokenResponse;
    },
  });

export const useLeaveMeeting = (meetingId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await client.api.meetings[":id"].leave.$post({
        param: { id: meetingId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to leave meeting");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.detail(meetingId),
      });
    },
  });
};

export const useEndMeeting = (meetingId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await client.api.meetings[":id"].end.$post({
        param: { id: meetingId },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to end meeting");
      }
      return (await res.json()) as { meeting: MeetingDto };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.list() });
      queryClient.invalidateQueries({
        queryKey: meetingKeys.detail(meetingId),
      });
    },
  });
};

export const usePublicMeetingInfo = (token: string) =>
  useQuery({
    queryKey: meetingKeys.publicInfo(token),
    queryFn: async () => {
      const res = await client.api.meetings.public[":token"].$get({
        param: { token },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "This meeting link is invalid");
      }
      return (await res.json()) as PublicMeetingInfo;
    },
    enabled: Boolean(token),
    retry: false,
  });

export const useGuestJoinMeeting = (token: string) =>
  useMutation({
    mutationFn: async (name: string) => {
      const res = await client.api.meetings.public[":token"].join.$post({
        param: { token },
        json: { name },
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to join meeting");
      }
      return (await res.json()) as MeetingTokenResponse;
    },
  });
