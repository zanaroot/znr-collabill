"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, List, Typography } from "antd";
import { useRouter } from "next/navigation";
import { client } from "@/packages/hono";

export const SelectOrganizationForm = () => {
  const { message } = App.useApp();
  const router = useRouter();

  const { data: organizations, isLoading } = useQuery({
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
        message.success("Organization selected!");
        router.push("/task-board");
        router.refresh();
      } else {
        message.error(
          ("error" in data ? data.error : null) || "Something went wrong.",
        );
      }
    },
  });

  if (isLoading) {
    return (
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-loading-spinner" />
          <Typography.Title level={2} className="auth-card-title">
            Loading organizations...
          </Typography.Title>
          <Typography.Text type="secondary" className="auth-card-subtitle">
            Please wait while we fetch your organizations
          </Typography.Text>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <div className="auth-icon-wrapper">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Users"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <Typography.Title level={2} className="auth-card-title">
          Select organization
        </Typography.Title>
        <Typography.Text type="secondary" className="auth-card-subtitle">
          You belong to multiple organizations. Choose one to continue.
        </Typography.Text>
      </div>

      <List
        className="auth-org-list"
        dataSource={organizations}
        renderItem={(org) => (
          <List.Item
            className="auth-org-item"
            actions={[
              <Button
                key="select"
                type="primary"
                loading={isPending}
                onClick={() => selectOrg(org.id)}
                size="large"
                className="auth-submit-btn"
              >
                Select
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={<span className="auth-org-name">{org.name}</span>}
              description={org.slug}
            />
          </List.Item>
        )}
      />
    </div>
  );
};
