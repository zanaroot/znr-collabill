"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, Tabs, Typography } from "antd";
import { useState } from "react";
import type { OrganizationLeaveSettings } from "@/http/models/leave.model";
import { client } from "@/packages/hono";
import { LeaveAdminPanel } from "./_components/leave-admin-panel";
import { LeaveCalendar } from "./_components/leave-calendar";
import { LeaveRequestModal } from "./_components/leave-request-modal";
import { LeaveSettingsPanel } from "./_components/leave-settings-panel";

const { Title } = Typography;

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await client.api.users.me.$get();
      return res.json();
    },
  });

  const { data: orgSettings } = useQuery({
    queryKey: ["current-organization-settings"],
    queryFn: async () => {
      const res = await client.api["leave-requests"].settings.$get();
      const data = await res.json();
      if ("error" in data) return null;
      return data as OrganizationLeaveSettings;
    },
  });

  const isAdmin =
    user?.organizationRole === "ADMIN" || user?.organizationRole === "OWNER";

  const isPaidAsWorked = orgSettings?.unusedLeavePolicy === "PAID_AS_WORKED";

  const items = [
    {
      key: "calendar",
      label: isAdmin ? "Calendar" : "My Calendar",
      children: (
        <LeaveCalendar
          onRequestLeave={() => setIsModalOpen(true)}
          isAdmin={isAdmin}
          isLeaveDisabled={isPaidAsWorked}
        />
      ),
    },
    {
      key: "requests",
      label: "My Requests",
      children: <LeaveAdminPanel mode="user" />,
    },
  ];

  if (isAdmin) {
    items.push({
      key: "admin",
      label: "Teams Requests",
      children: <LeaveAdminPanel mode="admin" />,
    });
    items.push({
      key: "settings",
      label: "Settings",
      children: <LeaveSettingsPanel />,
    });
  }

  return (
    <div
      className="p-6"
      style={{ height: "calc(100vh - 160px)", overflowY: "auto" }}
    >
      <Title level={2}>Leave Management</Title>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </Card>

      <LeaveRequestModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isLeaveDisabled={isPaidAsWorked}
      />
    </div>
  );
}
