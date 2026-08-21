"use client";

import { BellOutlined } from "@ant-design/icons";
import { Badge, Button, Popover, Typography } from "antd";
import { useUnreadNotificationsCount } from "@/app/(private)/_components/notifications/_hook/use-unread-notifications-count";
import { NotificationList } from "./notification-list";

export const NotificationPopover = () => {
    const { data } = useUnreadNotificationsCount();

    const unreadCount = data?.count ?? 0;

    return (
        <Popover
            trigger="click"
            placement="bottomRight"
            title={
                <Typography.Text strong>
                    Notifications
                </Typography.Text>
            }
            content={
                <div style={{ width: 380, maxWidth: "90vw" }}>
                    <NotificationList />
                </div>
            }
        >
            <Badge
                count={unreadCount}
                size="small"
                offset={[-2, 2]}
            >
                <Button
                    type="text"
                    shape="circle"
                    icon={<BellOutlined style={{ fontSize: 20 }} />}
                />
            </Badge>
        </Popover>
    );
};