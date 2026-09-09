"use client";

import { Button, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OrganizationForm {
  name: string;
}

export const OrgStep = () => {
  const router = useRouter();

  const onFinish = (values: OrganizationForm) => {
    const params = new URLSearchParams();
    params.set("orgName", values.name);
    router.push(`/sign-up/owner?${params.toString()}`);
  };

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <div className="auth-step-indicator">
          <div className="auth-step active">1</div>
          <div className="auth-step-line" />
          <div className="auth-step">2</div>
        </div>
        <Typography.Title level={2} className="auth-card-title">
          Create an organization
        </Typography.Title>
        <Typography.Text type="secondary" className="auth-card-subtitle">
          Tell us the name of your organization to get started
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
            size="large"
            className="auth-submit-btn"
          >
            Continue
          </Button>
        </Form.Item>
      </Form>

      <div className="auth-card-footer">
        <Typography.Text type="secondary">
          Already have an account?{" "}
        </Typography.Text>
        <Link href="/sign-in" className="auth-link-bold">
          Sign in
        </Link>
      </div>
    </div>
  );
};
