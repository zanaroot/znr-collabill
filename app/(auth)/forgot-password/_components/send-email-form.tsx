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
            aria-label="Info"
            role="img"
          >
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 8V12M12 16H12.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
