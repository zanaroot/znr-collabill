"use client";

import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dropdown } from "antd";
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

  return (
    <>
      <Dropdown
        trigger={["click"]}
        arrow
        menu={{
          items: [
            {
              icon: <UserOutlined />,
              key: "profile",
              label: "Profile",
              onClick: () => setDrawerOpen(true),
            },
            {
              icon: <SettingOutlined />,
              key: "settings",
              label: "Settings",
              onClick: () => setSettingsOpen(true),
            },
            {
              icon: <LogoutOutlined />,
              key: "logout",
              label: "Logout",
              onClick: () => logout(),
            },
          ],
        }}
      >
        <div>
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
      </Dropdown>

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
