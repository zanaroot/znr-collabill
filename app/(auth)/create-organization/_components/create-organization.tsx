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
            aria-label="Lightning"
            role="img"
          >
            <path
              d="M22 12H18L15 21L9 3L6 12H2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
                viewBox="0 0 18 18"
                fill="none"
                aria-label="Organization"
                role="img"
              >
                <path
                  d="M2.25 14.25V3.75C2.25 2.925 2.925 2.25 3.75 2.25H7.5C8.325 2.25 9 2.925 9 3.75V14.25M9 14.25V5.25C9 4.425 9.675 3.75 10.5 3.75H14.25C15.075 3.75 15.75 4.425 15.75 5.25V14.25M2.25 14.25H15.75M6 9H6.01M6 11.25H6.01M12 9H12.01M12 11.25H12.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
