"use client";

import { CheckCircleOutlined } from "@ant-design/icons";
import { Card, Col, Row, Space, Spin, Tag, Typography } from "antd";
import { CheckoutRecoveryBanner } from "@/app/_components/billing/checkout-recovery-banner";
import { PlanCtaButton } from "@/app/_components/billing/plan-cta";
import { QueryErrorAlert } from "@/app/_components/billing/query-error-alert";
import { usePlans, useSubscription } from "@/app/_hooks/use-billing";
import {
  formatPlanPrice,
  planFeatures,
  planLimitLabel,
} from "@/app/_utils/billing";
import { PaymentHistoryTable } from "./payment-history-table";
import { SubscriptionSummaryCard } from "./subscription-summary-card";
import { UsageCard } from "./usage-card";

const { Text, Title } = Typography;

const CenteredSpin = () => (
  <div style={{ padding: 32, textAlign: "center" }}>
    <Spin />
  </div>
);

export const OrganizationBillingPanel = ({ isOwner }: { isOwner: boolean }) => {
  const subscription = useSubscription();
  const plans = usePlans();

  return (
    <div style={{ padding: "16px 0" }}>
      <CheckoutRecoveryBanner />

      {subscription.isError ? (
        <QueryErrorAlert
          message="Failed to load subscription"
          onRetry={() => subscription.refetch()}
        />
      ) : subscription.isLoading ? (
        <CenteredSpin />
      ) : (
        subscription.data && (
          <>
            <SubscriptionSummaryCard
              subscription={subscription.data}
              isOwner={isOwner}
            />
            <UsageCard subscription={subscription.data} isOwner={isOwner} />
          </>
        )
      )}

      <Title level={5}>Plans</Title>
      {plans.isError ? (
        <QueryErrorAlert
          message="Failed to load plans"
          onRetry={() => plans.refetch()}
        />
      ) : plans.isLoading ? (
        <CenteredSpin />
      ) : (
        <Row gutter={[16, 16]}>
          {(plans.data ?? []).map((plan) => {
            const isCurrent = subscription.data?.planId === plan.id;
            return (
              <Col xs={24} md={12} key={plan.id}>
                <Card
                  title={
                    <Space size={8}>
                      <span>{plan.name}</span>
                      <Tag>{plan.code}</Tag>
                      {isCurrent && <Tag color="success">Current plan</Tag>}
                    </Space>
                  }
                  extra={formatPlanPrice(plan)}
                >
                  <Space
                    direction="vertical"
                    size={6}
                    style={{ width: "100%", marginBottom: 16 }}
                  >
                    {planFeatures(plan).map((feature) => (
                      <Text key={feature}>
                        <CheckCircleOutlined style={{ marginRight: 6 }} />
                        {feature}
                      </Text>
                    ))}
                  </Space>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text type="secondary">Members</Text>
                    <Text>{planLimitLabel(plan.maxMembers)}</Text>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <Text type="secondary">Projects</Text>
                    <Text>{planLimitLabel(plan.maxProjects)}</Text>
                  </div>
                  {isOwner ? (
                    <PlanCtaButton
                      plan={plan}
                      subscription={subscription.data}
                      isOwner={isOwner}
                      block
                    />
                  ) : (
                    <Text type="secondary">
                      Only the organization owner can change plans
                    </Text>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {isOwner && <PaymentHistoryTable />}
    </div>
  );
};
