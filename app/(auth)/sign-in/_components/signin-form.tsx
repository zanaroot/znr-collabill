"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Divider,
  Flex,
  Form,
  Input,
  message,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { signInAction } from "@/http/actions/auth.action";

type DataType = {
  email: string;
  password: string;
};

export const SignInForm = () => {
  const router = useRouter();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: signInAction,
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
    onError: () => {
      message.error("Something went wrong. Please try again.");
    },
  });

  const onFinish = async (values: DataType) => {
    await mutateAsync(values);
  };

  return (
    <div className="w-[100%] flex items-center justify-center bg-gray-50 rounded-[20px]">
      <Card
        title={
          <div className="text-center mt-5">
            <Typography.Title level={3}>Sign In</Typography.Title>
            <Typography.Text type="secondary">
              Sign in to your account
            </Typography.Text>
          </div>
        }
        className="w-[450px] shadow-lg p-8"
      >
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Please input your email!" }]}
          >
            <Input
              placeholder="Enter your email"
              className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password
              placeholder="••••••••"
              className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
            />
          </Form.Item>

          <Flex justify="space-between" className="mb-6">
            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={isPending}
                className="bg-blue-600 hover:bg-blue-700 transition-colors rounded-md w-32"
              >
                Sign In
              </Button>
            </Form.Item>
            <Form.Item className="mb-0">
              <Link
                href="/forgot-password"
                className="text-blue-600 hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </Form.Item>
          </Flex>

          <Divider plain>Or</Divider>

          <div className="text-center mt-4">
            <Typography.Text type="secondary">
              Don't have an account?{" "}
            </Typography.Text>
            <Link
              href="/sign-up"
              className="text-blue-600 font-medium hover:underline"
            >
              Sign up
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};
