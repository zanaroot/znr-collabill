"use client";

import { ExclamationCircleOutlined } from "@ant-design/icons";
import { App, Button, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { formatMoney } from "@/app/_utils/billing";
import type { AdminPlan } from "../../_hooks/use-back-office";
import { useAdminPlans, useUpdatePlan } from "../../_hooks/use-back-office";
import { PlanFormDrawer } from "./plan-form-drawer";

const { Text } = Typography;

const limitText = (limit: number | null) =>
  limit === null ? "Unlimited" : `${limit}`;

const priceText = (amountMinor: number | null, currency: string) =>
  amountMinor === null
    ? "—"
    : amountMinor === 0
      ? "Free"
      : formatMoney(amountMinor, currency);

export const PlansTable = () => {
  const plans = useAdminPlans();
  const updatePlan = useUpdatePlan();
  const { modal, message } = App.useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (plan: AdminPlan) => {
    setEditing(plan);
    setDrawerOpen(true);
  };

  const toggleActive = (plan: AdminPlan) => {
    const nextActive = !(plan.active ?? true);
    if (!nextActive && plan.code === "FREE") {
      message.warning("The Free plan cannot be deactivated");
      return;
    }
    modal.confirm({
      title: nextActive ? `Activate ${plan.code}?` : `Deactivate ${plan.code}?`,
      icon: <ExclamationCircleOutlined />,
      content: nextActive
        ? "The plan becomes available for checkout and plan changes again."
        : "The plan is hidden from checkout and rejected for plan changes; existing subscriptions are unaffected.",
      okText: nextActive ? "Activate" : "Deactivate",
      okButtonProps: { danger: !nextActive },
      onOk: () =>
        updatePlan.mutateAsync({
          planId: plan.id,
          values: {
            name: plan.name,
            description: plan.description,
            amountMinor: plan.amountMinor,
            amountMinorYearly: plan.amountMinorYearly ?? null,
            currency: plan.currency,
            supportedCurrencies:
              plan.supportedCurrencies && plan.supportedCurrencies.length > 0
                ? plan.supportedCurrencies
                : [plan.currency],
            maxMembers: plan.maxMembers,
            maxProjects: plan.maxProjects,
            features: (plan.features ?? []) as ("integrations" | "finance")[],
            active: nextActive,
          },
        }),
    });
  };

  const columns: ColumnsType<AdminPlan> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 110,
      render: (code: string) => <Tag>{code}</Tag>,
    },
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Monthly",
      key: "monthly",
      width: 130,
      render: (_, plan) => priceText(plan.amountMinor, plan.currency),
    },
    {
      title: "Yearly",
      key: "yearly",
      width: 130,
      render: (_, plan) =>
        priceText(plan.amountMinorYearly ?? null, plan.currency),
    },
    {
      title: "Interval",
      dataIndex: "interval",
      key: "interval",
      width: 100,
      render: (interval: string | null) => interval ?? "—",
    },
    {
      title: "Currencies",
      dataIndex: "supportedCurrencies",
      key: "currencies",
      width: 140,
      render: (values: string[] | null, plan) =>
        (values && values.length > 0 ? values : [plan.currency]).join(", "),
    },
    {
      title: "Members",
      dataIndex: "maxMembers",
      key: "maxMembers",
      width: 100,
      render: (value: number | null) => limitText(value),
    },
    {
      title: "Projects",
      dataIndex: "maxProjects",
      key: "maxProjects",
      width: 100,
      render: (value: number | null) => limitText(value),
    },
    {
      title: "Features",
      dataIndex: "features",
      key: "features",
      width: 170,
      render: (features: string[] | null) =>
        !features || features.length === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          features.map((feature) => (
            <Tag key={feature} color="geekblue">
              {feature}
            </Tag>
          ))
        ),
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, plan) =>
        (plan.active ?? true) ? (
          <Tag color="success">Active</Tag>
        ) : (
          <Tag>Inactive</Tag>
        ),
    },
    {
      title: "Subscriptions",
      dataIndex: "subscriptionCount",
      key: "subscriptionCount",
      width: 120,
    },
    {
      title: "",
      key: "actions",
      width: 170,
      render: (_, plan) => (
        <Space size={4} onClick={(event) => event.stopPropagation()}>
          <Button size="small" onClick={() => openEdit(plan)}>
            Edit
          </Button>
          <Button
            size="small"
            danger={!plan.active}
            onClick={() => toggleActive(plan)}
          >
            {(plan.active ?? true) ? "Deactivate" : "Activate"}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreate}>
          New plan
        </Button>
      </div>
      <Table<AdminPlan>
        rowKey="id"
        size="small"
        loading={plans.isLoading}
        columns={columns}
        dataSource={plans.data ?? []}
        pagination={false}
        scroll={{ x: true }}
        onRow={(plan) => ({ onClick: () => openEdit(plan) })}
      />
      <PlanFormDrawer
        open={drawerOpen}
        plan={editing}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
};
