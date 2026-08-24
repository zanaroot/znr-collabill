"use client";

import { Empty, Flex, Spin } from "antd";
import { useNotifications } from "@/app/(private)/_components/notifications/_hook/use-notifications";
import { NotificationItem } from "./notification-item";

type Notification = {
  id: string;
  userId: string;
  organizationId: string;
  actorId: string | null;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string | null;
  isRead: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export const NotificationList = () => {
  const { data, isLoading, isError } = useNotifications();

  if (isLoading) {
    return (
      <Flex justify="center" align="center" style={{ padding: 40 }}>
        <Spin />
      </Flex>
    );
  }

  if (isError) {
    return (
      <Flex justify="center" style={{ padding: 40 }}>
        Impossible de charger les notifications.
      </Flex>
    );
  }

  const notifications = data ?? [];

  if (notifications.length === 0) {
    return <Empty description="No notifications" style={{ padding: 40 }} />;
  }

  return (
    <Flex vertical>
      {notifications.map((notification: Notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </Flex>
  );
};
