"use client";

import { ExclamationCircleOutlined } from "@ant-design/icons";
import { App, Button, Card, Descriptions, Space, Tag, Typography } from "antd";
import { SubscriptionStatusTag } from "@/app/_components/billing/status-tags";
import {
  useCancelSubscription,
  useReactivateSubscription,
} from "@/app/_hooks/use-billing";
import type { SubscriptionInput } from "@/app/_utils/billing";
import {
  formatDate,
  formatSubscriptionPrice,
  getIntervalLabel,
  isLiveSubscription,
} from "@/app/_utils/billing";

const { Text } = Typography;

export const SubscriptionSummaryCard = ({
  subscription,
  isOwner,
}: {
  subscription: SubscriptionInput;
  isOwner: boolean;
}) => {
  const { modal } = App.useApp();
  const cancelSubscription = useCancelSubscription();
  const reactivateSubscription = useReactivateSubscription();

  const live = isLiveSubscription(subscription.status);
  const periodEnd = formatDate(subscription.currentPeriodEnd);

  const handleCancel = () => {
    modal.confirm({
      title: "Cancel subscription?",
      icon: <ExclamationCircleOutlined />,
      content: `You will keep access until ${periodEnd}. No further charges will be made.`,
      okText: "Cancel subscription",
      okType: "danger",
      cancelText: "Keep subscription",
      onOk: () =>
        cancelSubscription
          .mutateAsync({ atPeriodEnd: true })
          .catch(() => undefined),
    });
  };

  const handleReactivate = () => {
    modal.confirm({
      title: "Reactivate subscription?",
      icon: <ExclamationCircleOutlined />,
      content: "Your subscription will continue and billing will resume.",
      okText: "Reactivate",
      cancelText: "Cancel",
      onOk: () => reactivateSubscription.mutateAsync().catch(() => undefined),
    });
  };

  const renewalText = (() => {
    if (!live) return "—";
    if (subscription.cancelAtPeriodEnd) return `Cancels ${periodEnd}`;
    if (subscription.currentPeriodEnd) return `Renews ${periodEnd}`;
    return "—";
  })();

  return (
    <Card
      title="Subscription"
      style={{ marginBottom: 16 }}
      extra={
        isOwner ? (
          <Space>
            {subscription.cancelAtPeriodEnd ? (
              <Button
                size="small"
                type="primary"
                loading={reactivateSubscription.isPending}
                onClick={handleReactivate}
              >
                Reactivate
              </Button>
            ) : (
              <Button
                size="small"
                danger
                disabled={!live}
                loading={cancelSubscription.isPending}
                onClick={handleCancel}
              >
                Cancel subscription
              </Button>
            )}
          </Space>
        ) : undefined
      }
    >
      <Descriptions column={2}>
        <Descriptions.Item label="Plan">
          <Space size={4}>
            <Text strong>{subscription.plan.name}</Text>
            <Tag>{subscription.plan.code}</Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <SubscriptionStatusTag status={subscription.status} />
          {subscription.cancelAtPeriodEnd && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              at period end
            </Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Price">
          {formatSubscriptionPrice(subscription)}
        </Descriptions.Item>
        <Descriptions.Item label="Billing interval">
          {getIntervalLabel(subscription.interval)}
        </Descriptions.Item>
        <Descriptions.Item label="Current period">
          {formatDate(subscription.currentPeriodStart)} – {periodEnd}
        </Descriptions.Item>
        <Descriptions.Item label="Renewal">{renewalText}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
};
