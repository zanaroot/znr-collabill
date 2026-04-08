"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  message,
  Row,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { client } from "@/packages/hono";

type DataType = {
  email: string;
  password: string;
};

export const SignInForm = () => {
  const router = useRouter();

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
    <Card className="signin-card">
      <div className="signin-header">
        <Typography.Title level={3} className="signin-title">
          Sign In
        </Typography.Title>
        <Typography.Text type="secondary">
          Sign in to your account
        </Typography.Text>
      </div>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, message: "Please input your email!" }]}
        >
          <Input
            placeholder="Enter your email"
            className="signin-input"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password
            placeholder="Enter your password"
            className="signin-input"
            size="large"
          />
        </Form.Item>

        <Row justify="space-between" align="middle" className="signin-actions">
          <Col>
            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={isPending}
                className="signin-submit-btn"
                size="large"
              >
                Sign In
              </Button>
            </Form.Item>
          </Col>
          <Col>
            <Link href="/forgot-password" className="signin-forgot">
              Forgot Password?
            </Link>
          </Col>
        </Row>

        <Divider plain className="signin-divider">
          Or
        </Divider>

        <div className="signin-footer">
          <Typography.Text type="secondary">
            Don't have an account?{" "}
          </Typography.Text>
          <Link href="/sign-up" className="signin-signup">
            Sign up
          </Link>
        </div>
      </Form>
    </Card>
  );
};
