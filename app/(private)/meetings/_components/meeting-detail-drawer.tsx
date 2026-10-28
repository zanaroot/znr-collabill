"use client";

import { CopyOutlined, LinkOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Avatar,
  Button,
  Divider,
  Drawer,
  Flex,
  List,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCurrentUser,
  useUsers,
} from "@/app/(private)/team-management/_hooks/use-team";
import {
  useCreateGuestLink,
  useEndMeeting,
  useInviteMeetingMembers,
  useMeeting,
  useRevokeMeetingInvitation,
} from "../_hooks/use-meetings";
import { MeetingStatusTag } from "./meeting-status-tag";

const isJoinable = (status: string) =>
  status === "SCHEDULED" || status === "ACTIVE";

export const MeetingDetailDrawer = ({
  meetingId,
  onClose,
}: {
  meetingId: string | null;
  onClose: () => void;
}) => {
  const { message } = App.useApp();
  const router = useRouter();
  const { data: meeting, isLoading } = useMeeting(meetingId ?? "");
  const { data: users } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [guestLink, setGuestLink] = useState<string | null>(null);

  const inviteMembers = useInviteMeetingMembers(meetingId ?? "");
  const revokeInvitation = useRevokeMeetingInvitation(meetingId ?? "");
  const createGuestLink = useCreateGuestLink(meetingId ?? "");
  const endMeeting = useEndMeeting(meetingId ?? "");

  const isManager =
    meeting &&
    (meeting.createdBy === currentUser?.id ||
      currentUser?.organizationRole === "OWNER" ||
      currentUser?.organizationRole === "ADMIN");

  const invitedUserIds = new Set(
    (meeting?.invitations ?? [])
      .filter((invitation) => !invitation.revokedAt)
      .map((invitation) => invitation.inviteeUserId)
      .filter((id): id is string => Boolean(id)),
  );

  const memberOptions = (users ?? [])
    .filter((user) => !invitedUserIds.has(user.id))
    .map((user) => ({ label: user.name, value: user.id }));

  const handleInvite = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      await inviteMembers.mutateAsync(selectedUserIds);
      setSelectedUserIds([]);
      message.success("Members invited");
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await revokeInvitation.mutateAsync(invitationId);
      message.success("Invitation revoked");
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const handleGuestLink = async () => {
    try {
      const result = await createGuestLink.mutateAsync();
      setGuestLink(result.url);
      message.success("Guest link created");
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const handleEnd = async () => {
    try {
      await endMeeting.mutateAsync();
      message.success("Meeting ended");
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    message.success("Link copied");
  };

  return (
    <Drawer
      title={meeting?.title ?? "Meeting"}
      open={Boolean(meetingId)}
      onClose={onClose}
      width={480}
      loading={isLoading}
      extra={
        <Space>
          {meeting && isJoinable(meeting.status) ? (
            <Button
              type="primary"
              onClick={() => router.push(`/meetings/${meeting.id}`)}
            >
              Join
            </Button>
          ) : null}
          {meeting && isManager && isJoinable(meeting.status) ? (
            <Button danger onClick={handleEnd} loading={endMeeting.isPending}>
              End
            </Button>
          ) : null}
        </Space>
      }
    >
      {meeting ? (
        <>
          <Flex gap={8} align="center" wrap>
            <MeetingStatusTag status={meeting.status} />
            {meeting.guestAccess ? (
              <Tag color="purple">Guests allowed</Tag>
            ) : null}
          </Flex>
          <Divider style={{ margin: "12px 0" }} />
          <Typography.Paragraph>
            <Typography.Text strong>Created by:</Typography.Text>{" "}
            {meeting.creator?.name ?? "-"}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <Typography.Text strong>Scheduled:</Typography.Text>{" "}
            {meeting.scheduledAt
              ? dayjs(meeting.scheduledAt).format("MMM D, YYYY HH:mm")
              : "Not scheduled"}
          </Typography.Paragraph>
          <Typography.Paragraph>
            <Typography.Text strong>Expires:</Typography.Text>{" "}
            {meeting.expiresAt
              ? dayjs(meeting.expiresAt).format("MMM D, YYYY HH:mm")
              : "Never"}
          </Typography.Paragraph>

          <Divider titlePlacement="left" plain>
            Invite members
          </Divider>
          <Flex gap={8} align="start">
            <Select
              mode="multiple"
              style={{ flex: 1 }}
              placeholder="Select members"
              options={memberOptions}
              value={selectedUserIds}
              onChange={setSelectedUserIds}
              allowClear
            />
            <Button
              type="primary"
              onClick={handleInvite}
              loading={inviteMembers.isPending}
              disabled={selectedUserIds.length === 0}
            >
              Invite
            </Button>
          </Flex>
          <List
            size="small"
            style={{ marginTop: 12 }}
            dataSource={(meeting.invitations ?? []).filter(
              (invitation) => invitation.type === "MEMBER",
            )}
            locale={{ emptyText: "No invitations yet" }}
            renderItem={(invitation) => (
              <List.Item
                actions={[
                  <Button
                    key="revoke"
                    type="link"
                    danger
                    size="small"
                    disabled={Boolean(invitation.revokedAt)}
                    onClick={() => handleRevoke(invitation.id)}
                  >
                    {invitation.revokedAt ? "Revoked" : "Revoke"}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar src={invitation.inviteeUser?.avatar || undefined}>
                      {invitation.inviteeUser?.name?.charAt(0) ?? "?"}
                    </Avatar>
                  }
                  title={invitation.inviteeUser?.name ?? invitation.email}
                />
              </List.Item>
            )}
          />

          {meeting.guestAccess ? (
            <>
              <Divider titlePlacement="left" plain>
                External guest link
              </Divider>
              <Flex gap={8} vertical>
                <Button
                  icon={<LinkOutlined />}
                  onClick={handleGuestLink}
                  loading={createGuestLink.isPending}
                >
                  {guestLink ? "Rotate guest link" : "Create guest link"}
                </Button>
                {guestLink ? (
                  <Alert
                    type="info"
                    showIcon
                    message="Link copied once — rotate to revoke the previous link."
                    action={
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyLink(guestLink)}
                      >
                        Copy
                      </Button>
                    }
                  />
                ) : null}
              </Flex>
            </>
          ) : null}

          <Divider titlePlacement="left" plain>
            Participants
          </Divider>
          <List
            size="small"
            dataSource={meeting.participants ?? []}
            locale={{ emptyText: "No one has joined yet" }}
            renderItem={(participant) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar src={participant.user?.avatar || undefined}>
                      {(
                        participant.user?.name ??
                        participant.guestName ??
                        "G"
                      ).charAt(0)}
                    </Avatar>
                  }
                  title={
                    participant.user?.name ??
                    `${participant.guestName ?? "Guest"} (guest)`
                  }
                  description={`Joined ${dayjs(participant.joinedAt).format(
                    "MMM D, YYYY HH:mm",
                  )}${participant.leftAt ? " · Left" : " · In meeting"}`}
                />
              </List.Item>
            )}
          />
        </>
      ) : null}
    </Drawer>
  );
};
