"use client";

import { useMutation } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { client } from "@/packages/hono";

type DataType = {
  email: string;
  password: string;
};

export const SignInForm = () => {
  const router = useRouter();
  const { message } = App.useApp();

  const { mutateAsync: signIn, isPending } = useMutation({
    mutationFn: async (values: DataType) => {
      const res = await client.api.auth.login.$post({
        json: values,
      });
      const result = (await res.json()) as {
        success?: boolean;
        error?: string;
        orgCount?: number;
      };
      if (!res.ok) {
        throw new Error(result.error || "Something went wrong.");
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Sign in successful!");
        if (data.orgCount === 0) {
          router.push("/create-organization");
        } else if (data.orgCount && data.orgCount > 1) {
          router.push("/select-organization");
        } else {
          router.push("/task-board");
        }
      } else {
        message.error(data.error || "Something went wrong.");
      }
    },
    onError: (error: Error) => {
      message.error(error.message || "Something went wrong. Please try again.");
    },
  });

  const onFinish = async (values: DataType) => {
    await signIn(values);
  };

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <Typography.Title level={2} className="auth-card-title">
          Welcome back
        </Typography.Title>
        <Typography.Text type="secondary" className="auth-card-subtitle">
          Sign in to your account to continue
        </Typography.Text>
      </div>

      <Form layout="vertical" onFinish={onFinish} size="large">
        <Form.Item
          name="email"
          rules={[{ required: true, message: "Please input your email!" }]}
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
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password
            placeholder="Password"
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

        <div className="auth-form-options">
          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            block
            size="large"
            className="auth-submit-btn"
          >
            Sign in
          </Button>
        </Form.Item>
      </Form>

      <div className="auth-card-footer">
        <Typography.Text type="secondary">
          Don&apos;t have an account?{" "}
        </Typography.Text>
        <Link href="/sign-up" className="auth-link-bold">
          Get started
        </Link>
      </div>
    </div>
  );
};
