"use client";

import { useMutation } from "@tanstack/react-query";
import { Button, Card, Form, Input, message, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { registerAction } from "@/http/actions/auth.action";
import type { RegisterInput } from "@/http/models/auth.model";

const { Title } = Typography;

const OwnerStepContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgName = searchParams.get("orgName");

  const { mutateAsync, isPending } = useMutation({
    mutationFn: registerAction,
    onSuccess: (data) => {
      if (data.success) {
        message.success("Account and Organization created successfully!");
        router.push("/task-board");
      } else {
        message.error(data.error || "Error creating the account.");
      }
    },
    onError: () => {
      message.error("Something went wrong. Please try again.");
    },
  });

  if (!orgName) {
    router.push("/sign-up");
    return null;
  }

  const onFinish = async (values: Omit<RegisterInput, "organizationName">) => {
    await mutateAsync({
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
