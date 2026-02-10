"use client";

import { signInAction } from "@/https/controllers/sign-in";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Flex, Form, Input, message, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
        router.push("/task-board");
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
    <Card title="Sign In" className="w-[400px]">
      <Typography.Text className="mb-8!" type="secondary">
        Sign in to your account
      </Typography.Text>
      <Form<DataType> layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="email"
          rules={[{ required: true, message: "Please input your email!" }]}
          label="Email"
        >
          <Input placeholder="Enter your email" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: "Please input your password!" }]}
          label="Password"
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>
        <Flex justify="space-between">
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isPending}>
              Sign In
            </Button>
          </Form.Item>
          <Form.Item>
            <Link href="/forgot-password" prefetch>
              Forgot Password?
            </Link>
          </Form.Item>
        </Flex>
      </Form>
    </Card>
  );
};
