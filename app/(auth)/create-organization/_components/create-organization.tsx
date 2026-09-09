"use client";

import { useMutation } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";
import { client } from "@/packages/hono";

const { Title } = Typography;

interface OrganizationForm {
  name: string;
}

export const CreateOrganization = () => {
  const router = useRouter();
  const { message } = App.useApp();

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
            aria-label="Home"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <Title level={2} className="auth-card-title">
          Create an organization
        </Title>
        <Typography.Text type="secondary" className="auth-card-subtitle">
          Set up your workspace to start collaborating with your team
        </Typography.Text>
      </div>

      <Form
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ name: "" }}
        size="large"
      >
        <Form.Item
          name="name"
          rules={[
            { required: true, message: "Please enter the organization name" },
          ]}
        >
          <Input
            placeholder="Organization name"
            prefix={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                aria-label="Organization"
              >
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                <path d="M10 6h4" />
                <path d="M10 10h4" />
                <path d="M10 14h4" />
                <path d="M10 18h4" />
              </svg>
            }
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            size="large"
            className="auth-submit-btn"
          >
            Create organization
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
