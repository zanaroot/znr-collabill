"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Card, List, Typography } from "antd";
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
      <div className="flex justify-center items-center min-h-[400px]">
        <Card title="Loading Organizations" className="w-[400px]">
          <Typography.Text>Please wait...</Typography.Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Card title="Select Organization" className="w-[500px]">
        <Typography.Paragraph type="secondary">
          You belong to multiple organizations. Please select one to continue.
        </Typography.Paragraph>
        <List
          dataSource={organizations}
          renderItem={(org) => (
            <List.Item
              className="group transition-colors hover:bg-slate-50"
              actions={[
                <div
                  key="select-wrapper"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Button
                    key="select"
                    type="primary"
                    loading={isPending}
                    onClick={() => selectOrg(org.id)}
                  >
                    Select
                  </Button>
                </div>,
              ]}
            >
              <List.Item.Meta title={org.name} description={org.slug} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};
