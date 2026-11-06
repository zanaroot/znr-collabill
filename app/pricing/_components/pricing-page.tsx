"use client";

import {
  Alert,
  Button,
  Card,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useState } from "react";
import { CheckoutRecoveryBanner } from "@/app/_components/billing/checkout-recovery-banner";
import { PlanCtaButton } from "@/app/_components/billing/plan-cta";
import { QueryErrorAlert } from "@/app/_components/billing/query-error-alert";
import { usePlans, useSubscription } from "@/app/_hooks/use-billing";
import {
  formatPlanPrice,
  planFeatures,
  planLimitLabel,
  planSupportsInterval,
} from "@/app/_utils/billing";
import type { SubscriptionInterval } from "@/http/models/subscription.model";
import type { Role } from "@/http/models/user.model";

const { Title, Text, Paragraph } = Typography;

type PricingPageProps = {
  user: { organizationRole: Role | null } | null;
};

const CenteredSpin = () => (
  <div style={{ padding: 48, textAlign: "center" }}>
    <Spin />
  </div>
);

export const PricingPage = ({ user }: PricingPageProps) => {
  const [billingInterval, setBillingInterval] =
    useState<SubscriptionInterval>("MONTHLY");
  const plans = usePlans();
  const subscription = useSubscription({ required: false });
  const isOwner = user?.organizationRole === "OWNER";

  const allPlans = plans.data ?? [];
  const visiblePlans = allPlans.filter((plan) =>
    planSupportsInterval(plan, billingInterval),
  );
  const hasPaidMonthly = allPlans.some(
    (plan) => plan.amountMinor > 0 && plan.interval === "MONTHLY",
  );
  const hasYearlyPrice = allPlans.some(
    (plan) => (plan.amountMinorYearly ?? 0) > 0,
  );
  const showYearlyNotice =
    billingInterval === "YEARLY" && !hasYearlyPrice && hasPaidMonthly;

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "16px 24px",
        }}
      >
        <Link href="/">
          <Text strong style={{ fontSize: 20 }}>
            CollaBill
          </Text>
        </Link>
        <Space>
          {user ? (
            <Button type="primary" href="/dashboard">
              Dashboard
            </Button>
          ) : (
            <>
              <Button href="/sign-in">Sign in</Button>
              <Button type="primary" href="/sign-up">
                Get started
              </Button>
            </>
          )}
        </Space>
      </header>

      <div style={{ textAlign: "center", padding: "32px 24px 0" }}>
        <Title level={2} style={{ marginBottom: 8 }}>
          Simple pricing for every team
        </Title>
        <Paragraph type="secondary">
          Start free, upgrade when your team needs more.
        </Paragraph>
        <Segmented
          value={billingInterval}
          onChange={(value) =>
            setBillingInterval(value as SubscriptionInterval)
          }
          options={[
            { label: "Monthly", value: "MONTHLY" },
            { label: "Yearly", value: "YEARLY" },
          ]}
        />
      </div>

      <div style={{ maxWidth: 640, margin: "24px auto 0", padding: "0 24px" }}>
        <CheckoutRecoveryBanner />
        {showYearlyNotice && (
          <Alert
            type="info"
            showIcon
            message="Annual billing isn't available yet — paid plans are billed monthly."
          />
        )}
        {plans.isError && (
          <QueryErrorAlert
            message="Failed to load subscription plans"
            onRetry={() => plans.refetch()}
          />
        )}
      </div>

      {plans.isLoading ? (
        <CenteredSpin />
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
            maxWidth: 760,
            margin: "24px auto 0",
            padding: "0 24px 64px",
          }}
        >
          {visiblePlans.map((plan) => {
            const isCurrent = subscription.data?.planId === plan.id;
            return (
              <Card
                key={plan.id}
                style={{ width: 340 }}
                title={
                  <Space size={8}>
                    <span>{plan.name}</span>
                    <Tag>{plan.code}</Tag>
                    {isCurrent && <Tag color="success">Current plan</Tag>}
                  </Space>
                }
              >
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <Title level={3} style={{ margin: 0 }}>
                    {formatPlanPrice(plan, billingInterval)}
                  </Title>
                </div>
                <Space
                  direction="vertical"
                  size={6}
                  style={{ width: "100%", marginBottom: 16 }}
                >
                  {planFeatures(plan, billingInterval).map((feature) => (
                    <Text key={feature}>{feature}</Text>
                  ))}
                </Space>
                <Title level={5} style={{ marginTop: 0 }}>
                  Organization limits
                </Title>
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
                {!user ? (
                  <Button type="primary" block href="/sign-up">
                    Get started
                  </Button>
                ) : isOwner ? (
                  <PlanCtaButton
                    plan={plan}
                    subscription={subscription.data}
                    isOwner={isOwner}
                    interval={billingInterval}
                    block
                  />
                ) : (
                  <Text type="secondary">
                    Ask your organization owner to change plans
                  </Text>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
