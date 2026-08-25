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
              aria-label="Error"
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
                d="M15 9L9 15M9 9L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
            aria-label="Shield"
            role="img"
          >
            <path
              d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-label="Password"
                    role="img"
                  >
                    <path
                      d="M13.5 8.25H4.5C3.675 8.25 3 8.925 3 9.75V15C3 15.825 3.675 16.5 4.5 16.5H13.5C14.325 16.5 15 15.825 15 15V9.75C15 8.925 14.325 8.25 13.5 8.25Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.25 8.25V5.25C5.25 4.25544 5.64509 3.30161 6.34835 2.59835C7.05161 1.89509 8.00544 1.5 9 1.5C9.99456 1.5 10.9484 1.89509 11.6517 2.59835C12.3549 3.30161 12.75 4.25544 12.75 5.25V8.25"
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
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-label="Password"
                    role="img"
                  >
                    <path
                      d="M13.5 8.25H4.5C3.675 8.25 3 8.925 3 9.75V15C3 15.825 3.675 16.5 4.5 16.5H13.5C14.325 16.5 15 15.825 15 15V9.75C15 8.925 14.325 8.25 13.5 8.25Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.25 8.25V5.25C5.25 4.25544 5.64509 3.30161 6.34835 2.59835C7.05161 1.89509 8.00544 1.5 9 1.5C9.99456 1.5 10.9484 1.89509 11.6517 2.59835C12.3549 3.30161 12.75 4.25544 12.75 5.25V8.25"
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
          Reset password
        </Button>
      </form>
    </div>
  );
};
