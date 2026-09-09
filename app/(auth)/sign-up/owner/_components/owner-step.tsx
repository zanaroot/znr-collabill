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
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="Completed"
            >
              <path d="M20 6 9 17l-5-5" />
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
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                aria-label="Person"
              >
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
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
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                aria-label="Email"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                aria-label="Lock"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
