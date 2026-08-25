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
            aria-label="Team"
            role="img"
          >
            <path
              d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11ZM22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
