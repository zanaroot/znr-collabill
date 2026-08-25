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
