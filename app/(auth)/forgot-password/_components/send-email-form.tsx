"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Flex, Form, Input, message, Typography } from "antd";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from "@/http/models/auth.model";
import { client } from "@/packages/hono";
import { PendingConfirmationForm } from "./pending-confirmation-form";

export const SendEmailForm = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const {
    mutateAsync: sendEmail,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      const res = await client.api.password.forgot.$post({
        json: data,
      });
      const result = await res.json();
      if (!res.ok) {
        const errorData = result as { error?: string };
        throw new Error(errorData.error || "Something went wrong.");
      }
      return result;
    },
    onSuccess: () => {
      message.success("If an account exists, an email has been sent.");
    },
    onError: (error: Error) => {
      message.error(error.message || "Something went wrong. Please try again.");
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await sendEmail(data);
    } catch (error) {
      console.error(error);
    }
  };

  if (isPending || isSuccess) {
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
          <Button type="primary" htmlType="submit" loading={isPending}>
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
