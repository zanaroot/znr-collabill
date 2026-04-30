"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, Tabs, Typography } from "antd";
import { useState } from "react";
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

  const isAdmin =
    user?.organizationRole === "ADMIN" || user?.organizationRole === "OWNER";

  const items = [
    {
      key: "calendar",
      label: "My Calendar",
      children: <LeaveCalendar onRequestLeave={() => setIsModalOpen(true)} />,
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
      label: "Admin Panel",
      children: <LeaveAdminPanel mode="admin" />,
    });
    items.push({
      key: "settings",
      label: "Settings",
      children: <LeaveSettingsPanel />,
    });
  }

  return (
    <div className="p-6 overflow-y-auto">
      <Title level={2}>Leave Management</Title>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </Card>

      <LeaveRequestModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
