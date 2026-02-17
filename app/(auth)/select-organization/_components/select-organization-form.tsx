"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, List, message, Typography } from "antd";
import { useRouter } from "next/navigation";
import {
  getUserOrganizationsAction,
  selectOrganizationAction,
} from "@/http/actions/organization.action";

export const SelectOrganizationForm = () => {
  const router = useRouter();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["userOrganizations"],
    queryFn: getUserOrganizationsAction,
  });

  const { mutateAsync: selectOrg, isPending } = useMutation({
    mutationFn: selectOrganizationAction,
    onSuccess: (data) => {
      if (data.success) {
        message.success("Organization selected!");
        router.push("/task-board");
      } else {
        message.error(data.error || "Something went wrong.");
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
              actions={[
                <Button
                  key="select"
                  type="primary"
                  loading={isPending}
                  onClick={() => selectOrg(org.id)}
                >
                  Select
                </Button>,
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
