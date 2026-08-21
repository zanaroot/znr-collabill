"use client";

import { BellOutlined } from "@ant-design/icons";
import { Avatar, Flex, Typography } from "antd";
import { useMarkNotificationAsRead } from "@/app/(private)/_components/notifications/_hook/use-mark-notification-as-read";


type NotificationItemProps = {
    notification: {
        id: string;
        title: string;
        message: string;
        isRead: boolean;
        createdAt: string | Date;
    };
};

export const NotificationItem = ({
    notification,
}: NotificationItemProps) => {
    const markAsRead = useMarkNotificationAsRead();

    const handleClick = () => {
        if (notification.isRead) {
            return;
        }

        markAsRead.mutate(notification.id);
    };

    return (
        <Flex
            gap={12}
            align="flex-start"
            onClick={handleClick}
            style={{
                padding: "12px 16px",
                cursor: notification.isRead ? "default" : "pointer",
                borderBottom: "1px solid",
            }}
        >
            <Avatar
                icon={<BellOutlined />}
                size={40}
            />

            <Flex vertical flex={1} gap={4}>
                <Typography.Text strong={!notification.isRead}>
                    {notification.title}
                </Typography.Text>

                <Typography.Text type="secondary">
                    {notification.message}
                </Typography.Text>

                <Typography.Text type="secondary">
                    {new Date(notification.createdAt).toLocaleString()}
                </Typography.Text>
            </Flex>
        </Flex>
    );
};