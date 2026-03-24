"use client";

import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Avatar, Dropdown } from "antd";
import { useState } from "react";
import { getInitials } from "@/lib/get-initials-text";
import { client } from "@/packages/hono";
import { ProfileDrawer } from "./profile-drawer";

export const UserDropdownMenus = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  const shortName = getInitials(currentUser?.name);

  return (
    <>
      <Dropdown
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
            },
            {
              icon: <LogoutOutlined />,
              key: "logout",
              label: "Logout",
              onClick: () => logout(),
            },
          ],
        }}
        trigger={["click"]}
      >
        <Avatar className="cursor-pointer">{shortName}</Avatar>
      </Dropdown>

      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
};
