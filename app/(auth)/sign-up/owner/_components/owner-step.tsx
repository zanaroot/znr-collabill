"use client";

import { useMutation } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { RegisterInput } from "@/http/models/auth.model";
import { client } from "@/packages/hono";

const { Title } = Typography;

const OwnerStepContent = () => {
  const router = useRouter();
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const orgName = searchParams.get("orgName");

  const { mutateAsync: register, isPending } = useMutation({
    mutationFn: async (values: RegisterInput) => {
      const res = await client.api.auth.register.$post({
        json: values,
      });
      const result = (await res.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(result.error || "Error creating the account.");
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Account and Organization created successfully!");
        router.push("/task-board");
      } else {
        message.error(data.error || "Error creating the account.");
      }
    },
    onError: (error: Error) => {
      message.error(error.message || "Something went wrong. Please try again.");
    },
  });

  if (!orgName) {
    router.push("/sign-up");
    return null;
  }

  const onFinish = async (values: Omit<RegisterInput, "organizationName">) => {
    await register({
      ...values,
      organizationName: orgName,
    });
  };

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <div className="auth-step-indicator">
          <div className="auth-step completed">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-label="Checkmark"
              role="img"
            >
              <path
                d="M11.667 3.5L5.25 9.917L2.333 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="auth-step-line completed" />
          <div className="auth-step active">2</div>
        </div>
        <Title level={2} className="auth-card-title">
          Create your account
        </Title>
        <Typography.Text type="secondary" className="auth-card-subtitle">
          Setting up owner for <strong>{orgName}</strong>
        </Typography.Text>
      </div>

      <Form
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ name: "", email: "", password: "" }}
        size="large"
      >
        <Form.Item
          name="name"
          rules={[{ required: true, message: "Please enter your name" }]}
        >
          <Input
            placeholder="Full name"
            prefix={
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-label="Person"
                role="img"
              >
                <path
                  d="M15 15.75V14.25C15 13.4544 14.6839 12.6913 14.1213 12.1287C13.5587 11.5661 12.7956 11.25 12 11.25H6C5.20435 11.25 4.44129 11.5661 3.87868 12.1287C3.31607 12.6913 3 13.4544 3 14.25V15.75M12.75 4.5C12.75 5.74264 11.7426 6.75 10.5 6.75C9.25736 6.75 8.25 5.74264 8.25 4.5C8.25 3.25736 9.25736 2.25 10.5 2.25C11.7426 2.25 12.75 3.25736 12.75 4.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
        </Form.Item>

        <Form.Item
          name="email"
          rules={[
            { required: true, message: "Please enter your email" },
            { type: "email", message: "Please enter a valid email" },
          ]}
        >
          <Input
            placeholder="Email address"
            prefix={
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-label="Email"
                role="img"
              >
                <path
                  d="M2.25 4.5L9 9.75L15.75 4.5M3.75 3H14.25C15.075 3 15.75 3.675 15.75 4.5V13.5C15.75 14.325 15.075 15 14.25 15H3.75C2.925 15 2.25 14.325 2.25 13.5V4.5C2.25 3.675 2.925 3 3.75 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: "Please enter your password" },
            { min: 8, message: "Password must be at least 8 characters" },
          ]}
        >
          <Input.Password
            placeholder="Password (min. 8 characters)"
            prefix={
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-label="Password"
                role="img"
              >
                <path
                  d="M13.5 8.25H4.5C3.675 8.25 3 8.925 3 9.75V15C3 15.825 3.675 16.5 4.5 16.5H13.5C14.325 16.5 15 15.825 15 15V9.75C15 8.925 14.325 8.25 13.5 8.25Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.25 8.25V5.25C5.25 4.25544 5.64509 3.30161 6.34835 2.59835C7.05161 1.89509 8.00544 1.5 9 1.5C9.99456 1.5 10.9484 1.89509 11.6517 2.59835C12.3549 3.30161 12.75 4.25544 12.75 5.25V8.25"
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
            loading={isPending}
            className="auth-submit-btn"
          >
            Create account
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

export const OwnerStep = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OwnerStepContent />
    </Suspense>
  );
};
