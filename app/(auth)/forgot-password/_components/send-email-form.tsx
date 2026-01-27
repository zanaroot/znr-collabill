"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Form, Input, Typography, message } from "antd";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { PendingConfirmationForm } from "./pending-confirmation-form";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type DataType = z.infer<typeof schema>;

export const SendEmailForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DataType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: DataType) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        message.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error(error);
      message.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return <PendingConfirmationForm />;
  }

  return (
    <Card title="Forgot Password" className="w-[400px]">
      <Typography.Text className="mb-8 block" type="secondary">
        Enter your email address and we will send you a link to reset your
        password.
      </Typography.Text>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="ant-form ant-form-vertical"
      >
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Form.Item
              validateStatus={errors.email ? "error" : ""}
              help={errors.email?.message}
            >
              <Input {...field} placeholder="Enter your email" />
            </Form.Item>
          )}
        />
        <Flex justify="space-between" align="center">
          <Button type="primary" htmlType="submit" loading={loading}>
            Send
          </Button>
          <Link href="/sign-in" prefetch>
            <Button type="link" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Flex>
      </form>
    </Card>
  );
};

