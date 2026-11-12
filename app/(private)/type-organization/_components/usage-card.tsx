"use client";

import { Alert, Card, Progress, Typography } from "antd";
import { useEntitlements } from "@/app/_hooks/use-billing";
import type { SubscriptionInput } from "@/app/_utils/billing";
import { planLimitLabel } from "@/app/_utils/billing";
import { useProjects } from "@/app/(private)/projects/_hooks/use-projects";
import { useUsers } from "@/app/(private)/team-management/_hooks/use-team";

const { Text, Title } = Typography;

const UsageRow = ({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number | null;
}) => {
  const percent =
    limit && limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text>{label}</Text>
        <Text type="secondary">
          {limit === null ? "Unlimited" : `${count} / ${planLimitLabel(limit)}`}
        </Text>
      </div>
      {limit !== null && (
        <Progress
          percent={percent}
          size="small"
          status={count >= limit ? "success" : "normal"}
        />
      )}
    </div>
  );
};

export const UsageCard = ({
  subscription,
  isOwner,
}: {
  subscription: SubscriptionInput;
  isOwner: boolean;
}) => {
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: entitlements } = useEntitlements();

  const memberLimitReached = entitlements?.reached.members ?? false;
  const projectLimitReached = entitlements?.reached.projects ?? false;

  return (
    <Card title="Usage" style={{ marginBottom: 16 }}>
      <Title level={5} style={{ marginTop: 0 }}>
        Organization limits
      </Title>
      {memberLimitReached && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message={
            isOwner
              ? "You've reached the member limit on your current plan. Upgrade to Pro to invite more members."
              : "Your organization has reached its member limit."
          }
        />
      )}
      {projectLimitReached && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message={
            isOwner
              ? "You've reached the project limit on your current plan. Upgrade to Pro to create more projects."
              : "Your organization has reached its project limit."
          }
        />
      )}
      {isLoadingUsers || isLoadingProjects ? (
        <Text type="secondary">Loading usage…</Text>
      ) : (
        <>
          <UsageRow
            label="Members"
            count={users?.length ?? 0}
            limit={subscription.plan.maxMembers}
          />
          <UsageRow
            label="Projects"
            count={projects?.length ?? 0}
            limit={subscription.plan.maxProjects}
          />
        </>
      )}
    </Card>
  );
};
