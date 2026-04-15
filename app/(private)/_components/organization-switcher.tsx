"use client";

import { CheckOutlined, SwapOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Dropdown,
  Flex,
  type MenuProps,
  message,
  Typography,
} from "antd";
import { getInitials } from "@/app/_utils/get-initials-text";
import { CreateOrganization } from "@/app/(private)/_components/create-organization";
import { taskKeys } from "@/app/(private)/task-board/_hooks/use-tasks";
import { client } from "@/packages/hono";
import { queryClient } from "@/packages/react-query";

const { Text } = Typography;

type Organization = {
  id: string;
  name: string;
  slug: string;
};

export const OrganizationSwitcher = ({
  currentOrganization,
  collapsed,
}: {
  currentOrganization?: Organization | null;
  collapsed: boolean;
}) => {
  const { data: organizations } = useQuery({
    queryKey: ["userOrganizations"],
    queryFn: async () => {
      const res = await client.api.organizations.me.$get();
      return await res.json();
    },
  });

  const { mutateAsync: selectOrg, isPending } = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.organizations[":id"].select.$post({
        param: { id },
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if ("success" in data && data.success) {
        message.success("Organization switched!");

        queryClient.invalidateQueries({ queryKey: taskKeys.all });
        window.location.reload();
      } else {
        message.error(
          ("error" in data ? data.error : null) || "Something went wrong.",
        );
      }
    },
  });

  const abbreviation = getInitials(currentOrganization?.name);

  const items: MenuProps["items"] = (organizations || []).map((org) => ({
    key: org.id,
    label: (
      <Flex justify="space-between" align="center" style={{ minWidth: 160 }}>
        <Text strong={org.id === currentOrganization?.id}>{org.name}</Text>
        {org.id === currentOrganization?.id && (
          <CheckOutlined style={{ color: "#1890ff" }} />
        )}
      </Flex>
    ),
    onClick: async () => {
      if (org.id !== currentOrganization?.id) {
        await selectOrg(org.id);
      }
    },
    disabled: isPending,
  }));

  items.push({
    key: "create-organization",
    label: (
      <div style={{ minWidth: 160 }}>
        <CreateOrganization
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["userOrganizations"] });
          }}
        />
      </div>
    ),
  });

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        style={{ marginBottom: 16, marginTop: 16 }}
      >
        <Avatar shape="square" size={collapsed ? "default" : "large"}>
          {abbreviation}
        </Avatar>
        {!collapsed && (
          <Flex vertical style={{ overflow: "hidden" }}>
            <Text strong ellipsis style={{ margin: 0, lineHeight: 1.2 }}>
              {currentOrganization?.name ?? "Flow Board"}
            </Text>
            <Text type="secondary" ellipsis>
              {currentOrganization?.slug ?? "Small team plan"}{" "}
              <SwapOutlined size={10} />
            </Text>
          </Flex>
        )}
      </div>
    </Dropdown>
  );
};
