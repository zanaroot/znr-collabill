"use client";

import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Flex, Popover, Typography } from "antd";
import { useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { client } from "@/packages/hono";
import { ProfileDrawer } from "./profile-drawer";
import { SettingsModal } from "./settings-modal";

interface UserDropdownMenusProps {
  isPresent?: boolean;
  onPresenceClick?: () => void;
}

export const UserDropdownMenus = ({
  isPresent,
  onPresenceClick,
}: UserDropdownMenusProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await client.api.users.me.$get();
      return await res.json();
    },
  });

  const { mutateAsync: logout } = useMutation({
    mutationFn: async () => {
      const res = await client.api.auth.logout.$post();
      return await res.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const handleMenuClick = (key: string) => {
    setPopoverOpen(false);

    if (key === "profile") {
      setDrawerOpen(true);
    }

    if (key === "settings") {
      setSettingsOpen(true);
    }

    if (key === "logout") {
      logout();
    }
  };

  const menuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
    },
  ];

  return (
    <>
      <Popover
        trigger="click"
        placement="bottomRight"
        arrow
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        align={{
          offset: [0, 15],
        }}
        content={
          <Flex vertical gap={4} style={{ minWidth: 90 }}>
            {menuItems.map((item) => (
              <Flex
                key={item.key}
                align="center"
                gap={10}
                onClick={() => handleMenuClick(item.key)}
                style={{
                  padding: "6px 8px",
                  cursor: "pointer",
                  borderRadius: 6,
                }}
                className="text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                {item.icon}
                <Typography.Text className="text-inherit">
                  {item.label}
                </Typography.Text>
              </Flex>
            ))}
          </Flex>
        }
      >
        <div className="mt-2">
          <AvatarProfile
            className="cursor-pointer"
            src={currentUser?.avatar}
            userName={currentUser?.name}
            userEmail={currentUser?.email}
            size={32}
            isPresent={isPresent}
            onPresenceClick={onPresenceClick}
          />
        </div>
      </Popover>

      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentUser={currentUser}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
