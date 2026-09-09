"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  type ResetPasswordConfirmInput,
  type ResetPasswordInput,
  resetPasswordConfirmSchema,
} from "@/http/models/password.model";
import { client } from "@/packages/hono";

export const ResetPasswordForm = () => {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordConfirmInput>({
    resolver: zodResolver(resetPasswordConfirmSchema),
  });

  const { mutateAsync: resetPassword, isPending } = useMutation({
    mutationFn: async (data: ResetPasswordInput) => {
      const res = await client.api.password.reset.$post({
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
      message.success("Password updated successfully!");
      router.push("/sign-in");
    },
    onError: (error: Error) => {
      message.error(error.message || "Something went wrong. Please try again.");
    },
  });

  if (!token) {
    return (
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-icon-wrapper error">
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
              aria-label="Error"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </div>
          <Typography.Title level={2} className="auth-card-title">
            Invalid link
          </Typography.Title>
          <Typography.Text type="secondary" className="auth-card-subtitle">
            This password reset link is invalid or has expired. Please request a
            new one.
          </Typography.Text>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordConfirmInput) => {
    try {
      await resetPassword({ token, password: data.password });
    } catch (error) {
      console.error(error);
    }
  };

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
            aria-label="Shield"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
        </div>
        <Typography.Title level={2} className="auth-card-title">
          Reset password
        </Typography.Title>
        <Typography.Text type="secondary" className="auth-card-subtitle">
          Enter your new password below
        </Typography.Text>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="ant-form ant-form-vertical"
      >
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Form.Item
              validateStatus={errors.password ? "error" : ""}
              help={errors.password?.message}
            >
              <Input.Password
                {...field}
                placeholder="New password"
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
                    aria-label="Lock"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
              />
            </Form.Item>
          )}
        />
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <Form.Item
              validateStatus={errors.confirmPassword ? "error" : ""}
              help={errors.confirmPassword?.message}
            >
              <Input.Password
                {...field}
                placeholder="Confirm new password"
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
                    aria-label="Lock"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
          Reset password
        </Button>
      </form>
    </div>
  );
};
