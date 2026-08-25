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
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password
            placeholder="Password"
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
