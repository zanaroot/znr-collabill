"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, message, Typography } from "antd";
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
    <div className="auth-card">
      <div className="auth-card-header">
        <div className="auth-icon-wrapper">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Information"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <Typography.Title level={2} className="auth-card-title">
          Forgot password?
        </Typography.Title>
        <Typography.Text type="secondary" className="auth-card-subtitle">
          Enter your email and we&apos;ll send you a reset link
        </Typography.Text>
      </div>

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
              <Input
                {...field}
                placeholder="Email address"
                size="large"
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
          )}
        />

        <Button
          type="primary"
          htmlType="submit"
          loading={isPending}
          block
          size="large"
          className="auth-submit-btn"
        >
          Send reset link
        </Button>
      </form>

      <div className="auth-card-footer">
        <Link href="/sign-in" className="auth-back-link">
          <ArrowLeftOutlined />
          Back to sign in
        </Link>
      </div>
    </div>
  );
};
