"use client";

import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Avatar, Dropdown } from "antd";
import { logoutAction } from "@/http/actions/auth.action";
import { getShortName } from "@/lib/get-short-name";
import { client } from "@/packages/hono";

export const UserDropdownMenus = () => {
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await client.api.users.me.$get();
      return await res.json();
    },
  });

  console.log(currentUser);

  const { mutateAsync: logout } = useMutation({
    mutationFn: logoutAction,
    onSuccess: () => {},
    onError: () => {},
  });

  const shortName = getShortName(currentUser?.name);

  return (
    <Dropdown
      menu={{
        items: [
          {
            icon: <UserOutlined />,
            key: "profile",
            label: "Profile",
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
  );
};
