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
import {
  getUserOrganizationsAction,
  selectOrganizationAction,
} from "@/http/actions/organization.action";

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
    queryFn: () => getUserOrganizationsAction(),
  });

  const { mutateAsync: selectOrg, isPending } = useMutation({
    mutationFn: selectOrganizationAction,
    onSuccess: (data) => {
      if (data.success) {
        message.success("Organization switched!");
      } else {
        message.error(data.error || "Something went wrong.");
      }
    },
  });

  const abbreviation = currentOrganization?.name
    ? currentOrganization.name
        .split(" ")
        .map((word) => word[0].toUpperCase())
        .join("")
    : "FB";

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
    onClick: () => {
      if (org.id !== currentOrganization?.id) {
        selectOrg(org.id);
      }
    },
    disabled: isPending,
  }));

  // Add a divider and "Manage Organizations" if needed later
  // items.push({ type: 'divider' });
  // items.push({ key: 'manage', label: 'Manage Organizations' });

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
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
            <Text type="secondary" size="small" ellipsis>
              {currentOrganization?.slug ?? "Small team plan"}{" "}
              <SwapOutlined size={10} />
            </Text>
          </Flex>
        )}
      </div>
    </Dropdown>
  );
};
