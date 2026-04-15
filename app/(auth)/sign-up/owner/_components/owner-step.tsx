"use client";

import { useMutation } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Typography } from "antd";
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
    <Card style={{ width: 500 }}>
      <Title level={3} style={{ textAlign: "center" }}>
        Organization Owner
      </Title>
      <p style={{ textAlign: "center", color: "#666", marginBottom: 24 }}>
        Setting up owner for <strong>{orgName}</strong>
      </p>
      <Form
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ name: "", email: "", password: "" }}
      >
        <Form.Item
          label="Full Name"
          name="name"
          rules={[{ required: true, message: "Please enter your name" }]}
        >
          <Input placeholder="John Doe" size="large" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Please enter your email" },
            { type: "email", message: "Please enter a valid email" },
          ]}
        >
          <Input placeholder="john@example.com" size="large" />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: "Please enter your password" },
            { min: 8, message: "Password must be at least 8 characters" },
          ]}
        >
          <Input.Password placeholder="••••••••" size="large" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={isPending}
          >
            Complete Registration
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export const OwnerStep = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OwnerStepContent />
    </Suspense>
  );
};
