"use client";

import { BellOutlined } from "@ant-design/icons";
import { Badge, Button, Popover, Typography } from "antd";
import { useMarkAllNotificationsAsRead } from "@/app/(private)/_components/notifications/_hook/use-mark-notification-as-read";
import { useUnreadNotificationsCount } from "@/app/(private)/_components/notifications/_hook/use-unread-notifications-count";
import { NotificationList } from "./notification-list";

export const NotificationPopover = () => {
  const { data } = useUnreadNotificationsCount();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const unreadCount = data?.count ?? 0;

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      markAllAsRead.mutate();
    }
  };

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      onOpenChange={handleOpenChange}
      title={<Typography.Text strong>Notifications</Typography.Text>}
      content={
        <div style={{ width: 380, maxWidth: "90vw" }}>
          <NotificationList />
        </div>
      }
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined style={{ fontSize: 20 }} />}
        />
      </Badge>
    </Popover>
  );
};
