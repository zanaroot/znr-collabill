"use client";

import { Button, Card, Flex, Form, Input, Typography } from "antd";
import Link from "next/link";

type DataType = {
  email: string;
  password: string;
};

export const SignInForm = () => {
  const onFinish = (values: DataType) => {
    console.log("onFinish", values);
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
            <Button type="primary" htmlType="submit">
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
