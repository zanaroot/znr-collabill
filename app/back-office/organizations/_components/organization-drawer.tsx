"use client";

import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  getPaymentStatusMeta,
  getSubscriptionStatusMeta,
} from "@/app/_utils/billing";
import type {
  SubscriptionInterval,
  SubscriptionPlanCode,
} from "@/http/models/subscription.model";
import type { OrganizationBillingDetail } from "../../_hooks/use-back-office";
import {
  useActivateSubscription,
  useAddAdminNote,
  useAdminOrganization,
  useAdminPlans,
  useCancelSubscription,
  useChangeAdminPlan,
  useExtendSubscription,
  useReactivateSubscription,
  useSuspendSubscription,
} from "../../_hooks/use-back-office";

const { Text, Paragraph } = Typography;

type SubscriptionRow = OrganizationBillingDetail["subscriptions"][number];

const isLiveStatus = (status: SubscriptionRow["status"]) =>
  status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";

export const OrganizationDrawer = ({
  organizationId,
  onClose,
}: {
  organizationId: string | null;
  onClose: () => void;
}) => {
  const detail = useAdminOrganization(organizationId);
  const plans = useAdminPlans();
  const { modal, message } = App.useApp();

  const activate = useActivateSubscription();
  const reactivate = useReactivateSubscription();
  const suspend = useSuspendSubscription();
  const cancel = useCancelSubscription();
  const extend = useExtendSubscription();
  const changePlan = useChangeAdminPlan();
  const addNote = useAddAdminNote();

  const [extendTarget, setExtendTarget] = useState<SubscriptionRow | null>(
    null,
  );
  const [extendDays, setExtendDays] = useState<number>(30);
  const [changeTarget, setChangeTarget] = useState<SubscriptionRow | null>(
    null,
  );
  const [nextPlanCode, setNextPlanCode] = useState<
    SubscriptionPlanCode | undefined
  >();
  const [nextInterval, setNextInterval] = useState<
    SubscriptionInterval | undefined
  >();
  const [noteForm] = Form.useForm();

  const run = async (action: Promise<unknown>) => {
    await action.catch(() => undefined);
  };

  const confirmActivate = (subscription: SubscriptionRow) => {
    const resume = subscription.status === "SUSPENDED" ? activate : reactivate;
    const verb = resume === activate ? "Activate" : "Reactivate";
    modal.confirm({
      title: `${verb} subscription?`,
      icon: <ExclamationCircleOutlined />,
      content: `The subscription moves to ACTIVE and a new billing period opens if the previous one ended.`,
      okText: verb,
      onOk: () =>
        run(
          resume.mutateAsync({
            subscriptionId: subscription.id,
            successMessage: `Subscription ${verb.toLowerCase()}d`,
          }),
        ),
    });
  };

  const confirmSuspend = (subscription: SubscriptionRow) => {
    modal.confirm({
      title: "Suspend subscription?",
      icon: <ExclamationCircleOutlined />,
      content:
        "The organization loses paid entitlements immediately and drops to Free plan limits until reactivated.",
      okText: "Suspend",
      okButtonProps: { danger: true },
      onOk: () =>
        run(
          suspend.mutateAsync({
            subscriptionId: subscription.id,
            successMessage: "Subscription suspended",
          }),
        ),
    });
  };

  const confirmCancel = (
    subscription: SubscriptionRow,
    atPeriodEnd: boolean,
  ) => {
    modal.confirm({
      title: atPeriodEnd ? "Cancel at period end?" : "Cancel subscription now?",
      icon: <ExclamationCircleOutlined />,
      content: atPeriodEnd
        ? "The subscription stays active until the current period ends."
        : "The subscription is canceled immediately and the organization drops to Free entitlements.",
      okText: atPeriodEnd ? "Schedule cancellation" : "Cancel now",
      okButtonProps: { danger: true },
      onOk: () =>
        run(
          cancel.mutateAsync({
            subscriptionId: subscription.id,
            successMessage: atPeriodEnd
              ? "Cancellation scheduled"
              : "Subscription canceled",
            atPeriodEnd,
          }),
        ),
    });
  };

  const submitExtend = async () => {
    if (!extendTarget) return;
    if (extendDays < 1 || extendDays > 365) {
      message.error("Extension must be between 1 and 365 days");
      return;
    }
    await run(
      extend.mutateAsync({
        subscriptionId: extendTarget.id,
        days: extendDays,
      }),
    );
    setExtendTarget(null);
  };

  const submitChangePlan = async () => {
    if (!changeTarget || !nextPlanCode) {
      message.error("Select a target plan");
      return;
    }
    await run(
      changePlan.mutateAsync({
        subscriptionId: changeTarget.id,
        planCode: nextPlanCode,
        interval: nextInterval,
      }),
    );
    setChangeTarget(null);
    setNextPlanCode(undefined);
    setNextInterval(undefined);
  };

  const submitNote = async () => {
    if (!organizationId) return;
    const values = await noteForm.validateFields();
    await run(
      addNote.mutateAsync({
        organizationId,
        body: values.body as string,
      }),
    );
    noteForm.resetFields();
  };

  const subscriptionColumns: ColumnsType<SubscriptionRow> = [
    {
      title: "Plan",
      key: "plan",
      width: 130,
      render: (_, row) => (
        <span>
          <Tag>{row.plan.code}</Tag>
          <br />
          <small>{row.interval ?? "—"}</small>
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: SubscriptionRow["status"]) => {
        const meta = getSubscriptionStatusMeta(status);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Amount",
      key: "amount",
      width: 110,
      render: (_, row) => formatMoney(row.amountMinor, row.currency),
    },
    {
      title: "Period",
      key: "period",
      width: 200,
      render: (_, row) =>
        `${formatDate(row.currentPeriodStart)} → ${formatDate(row.currentPeriodEnd)}`,
    },
    {
      title: "Auto-renew off",
      dataIndex: "cancelAtPeriodEnd",
      key: "cancelAtPeriodEnd",
      width: 120,
      render: (value: boolean) => (value ? "Scheduled" : "—"),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_, row) => {
        if (!isLiveStatus(row.status)) {
          const hasLiveSibling = (detail.data?.subscriptions ?? []).some(
            (subscription) =>
              subscription.id !== row.id && isLiveStatus(subscription.status),
          );
          if (hasLiveSibling) {
            return null;
          }
          return (
            <Button
              size="small"
              type="primary"
              onClick={(event) => {
                event.stopPropagation();
                confirmActivate(row);
              }}
            >
              {row.status === "SUSPENDED" ? "Activate" : "Reactivate"}
            </Button>
          );
        }
        return (
          <Dropdown.Button
            size="small"
            onClick={(event) => event.stopPropagation()}
            menu={{
              items: [
                {
                  key: "suspend",
                  label: "Suspend",
                  danger: true,
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation();
                    confirmSuspend(row);
                  },
                },
                {
                  key: "extend",
                  label: "Extend period",
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation();
                    setExtendDays(30);
                    setExtendTarget(row);
                  },
                },
                {
                  key: "change",
                  label: "Change plan",
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation();
                    setNextPlanCode(undefined);
                    setNextInterval(undefined);
                    setChangeTarget(row);
                  },
                },
                { type: "divider" },
                {
                  key: "cancel-now",
                  label: "Cancel now",
                  danger: true,
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation();
                    confirmCancel(row, false);
                  },
                },
                {
                  key: "cancel-end",
                  label: "Cancel at period end",
                  onClick: ({ domEvent }) => {
                    domEvent.stopPropagation();
                    confirmCancel(row, true);
                  },
                },
              ],
            }}
          >
            Actions
          </Dropdown.Button>
        );
      },
    },
  ];

  const data = detail.data;

  return (
    <Drawer
      title={data?.organization.name ?? "Organization"}
      open={!!organizationId}
      onClose={onClose}
      width={920}
    >
      {detail.isLoading && (
        <div style={{ padding: 48, textAlign: "center" }}>
          <Spin />
        </div>
      )}
      {detail.isError && (
        <Alert type="error" showIcon message="Failed to load organization" />
      )}
      {data && (
        <>
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="Name">
              {data.organization.name}
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              {data.owner?.email ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Members">
              {data.memberCount}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {formatDate(data.organization.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Plan">
              {data.usage.plan.name}
            </Descriptions.Item>
            <Descriptions.Item label="Features">
              {data.usage.features.length === 0
                ? "—"
                : data.usage.features.map((feature) => (
                    <Tag key={feature}>{feature}</Tag>
                  ))}
            </Descriptions.Item>
          </Descriptions>

          <Alert
            type={
              data.usage.reached.members || data.usage.reached.projects
                ? "warning"
                : "info"
            }
            showIcon
            style={{ marginTop: 12 }}
            message={`Members ${data.usage.usage.members}${
              data.usage.limits.maxMembers === null
                ? ""
                : ` / ${data.usage.limits.maxMembers}`
            } · Projects ${data.usage.usage.projects}${
              data.usage.limits.maxProjects === null
                ? ""
                : ` / ${data.usage.limits.maxProjects}`
            }`}
          />

          <Divider titlePlacement="left">Subscriptions</Divider>
          <Table
            size="small"
            rowKey="id"
            columns={subscriptionColumns}
            dataSource={data.subscriptions}
            pagination={false}
            scroll={{ x: true }}
          />

          <Divider titlePlacement="left">Payments</Divider>
          {data.payments.length === 0 ? (
            <Empty description="No payments" />
          ) : (
            <Table
              size="small"
              rowKey={(row) => row.id}
              pagination={false}
              scroll={{ x: true }}
              dataSource={data.payments}
              columns={[
                {
                  title: "Plan",
                  dataIndex: ["plan", "code"],
                  width: 100,
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  width: 120,
                  render: (
                    status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED",
                  ) => {
                    const meta = getPaymentStatusMeta(status);
                    return <Tag color={meta.color}>{meta.label}</Tag>;
                  },
                },
                {
                  title: "Amount",
                  key: "amount",
                  width: 120,
                  render: (_, row) =>
                    formatMoney(row.amountMinor, row.currency),
                },
                { title: "Provider", dataIndex: "provider", width: 110 },
                {
                  title: "Paid at",
                  dataIndex: "paidAt",
                  width: 140,
                  render: (value: string | null) => formatDate(value),
                },
              ]}
            />
          )}

          <Divider titlePlacement="left">Subscription events</Divider>
          <List
            size="small"
            dataSource={data.events.slice(0, 20)}
            renderItem={(event) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      <Tag>{event.type}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDateTime(event.createdAt)}
                      </Text>
                    </span>
                  }
                  description={
                    <Paragraph
                      style={{ marginBottom: 0 }}
                      ellipsis={{ rows: 1, tooltip: event.payload }}
                    >
                      {event.provider} · {event.payload}
                    </Paragraph>
                  }
                />
              </List.Item>
            )}
          />

          <Divider titlePlacement="left">Admin notes</Divider>
          <Form form={noteForm} layout="inline" style={{ marginBottom: 12 }}>
            <Form.Item
              name="body"
              rules={[
                { required: true, message: "Note is required" },
                { max: 1000, message: "Note is too long" },
              ]}
              style={{ flex: 1, minWidth: 300 }}
            >
              <Input.TextArea rows={2} placeholder="Add an internal note" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                loading={addNote.isPending}
                onClick={() => submitNote()}
              >
                Add note
              </Button>
            </Form.Item>
          </Form>
          <List
            size="small"
            dataSource={data.notes}
            locale={{ emptyText: "No notes yet" }}
            renderItem={(note) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      {note.authorName ?? "Unknown"}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {" "}
                        · {formatDateTime(note.createdAt)}
                      </Text>
                    </span>
                  }
                  description={note.body}
                />
              </List.Item>
            )}
          />
        </>
      )}

      <Modal
        title="Extend billing period"
        open={!!extendTarget}
        onCancel={() => setExtendTarget(null)}
        onOk={() => submitExtend()}
        okText="Extend"
        confirmLoading={extend.isPending}
      >
        <p>
          Extends {extendTarget?.planId ? "the current period" : ""} by the
          number of days below, from the current period end (or today if it
          already ended).
        </p>
        <InputNumber
          min={1}
          max={365}
          value={extendDays}
          onChange={(value) => setExtendDays(value ?? 0)}
          style={{ width: "100%" }}
          addonAfter="days"
        />
      </Modal>

      <Modal
        title="Change subscription plan"
        open={!!changeTarget}
        onCancel={() => setChangeTarget(null)}
        onOk={() => submitChangePlan()}
        okText="Change plan"
        confirmLoading={changePlan.isPending}
      >
        <p>
          Admin plan changes apply immediately, including upgrades that would
          normally require checkout.
        </p>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select
            placeholder="Target plan"
            style={{ width: "100%" }}
            value={nextPlanCode}
            onChange={(value) => setNextPlanCode(value as SubscriptionPlanCode)}
            options={(plans.data ?? [])
              .filter(
                (plan) =>
                  (plan.active ?? true) && plan.id !== changeTarget?.planId,
              )
              .map((plan) => ({
                label: `${plan.name} (${plan.code})`,
                value: plan.code,
              }))}
          />
          <Select
            allowClear
            placeholder="Billing interval (optional)"
            style={{ width: "100%" }}
            value={nextInterval}
            onChange={(value) => setNextInterval(value)}
            options={[
              { label: "Monthly", value: "MONTHLY" },
              { label: "Yearly", value: "YEARLY" },
            ]}
          />
        </Space>
      </Modal>
    </Drawer>
  );
};
