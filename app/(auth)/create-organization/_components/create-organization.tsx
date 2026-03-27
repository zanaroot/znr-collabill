"use client";

import { useMutation } from "@tanstack/react-query";
import { Button, Card, Form, Input, message, Typography } from "antd";
import { useRouter } from "next/navigation";
import { client } from "@/packages/hono";

const { Title } = Typography;

interface OrganizationForm {
  name: string;
}

export const CreateOrganization = () => {
  const router = useRouter();

  const { mutateAsync: createOrg, isPending: loading } = useMutation({
    mutationFn: async (values: OrganizationForm) => {
      const res = await client.api.organizations.$post({
        json: values,
      });
      const result = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(result.error || "Error creating the organization.");
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Organization created successfully!");
        router.push("/task-board");
      } else {
        message.error(data.error || "Error creating the organization.");
      }
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(error.message || "Error creating the organization.");
    },
  });

  const onFinish = async (values: OrganizationForm) => {
    await createOrg(values);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <Card style={{ width: 500 }}>
        <Title level={3} style={{ textAlign: "center" }}>
          Create an Organization
        </Title>
        <p style={{ textAlign: "center", color: "#666", marginBottom: 24 }}>
          You need to create an organization to get started. You will become the
          owner.
        </p>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ name: "" }}
        >
          <Form.Item
            label="Organization Name"
            name="name"
            rules={[
              { required: true, message: "Please enter the organization name" },
            ]}
          >
            <Input placeholder="My Organization" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Create Organization
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
