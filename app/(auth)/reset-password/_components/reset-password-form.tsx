"use client";

import { resetPasswordWithTokenAction } from "@/http/controllers/reset-password-with-token-controller";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type DataType = z.infer<typeof schema>;

export const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DataType>({
    resolver: zodResolver(schema),
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: resetPasswordWithTokenAction,
    onSuccess: () => {
      message.success("Password updated successfully!");
      router.push("/sign-in");
    },
    onError: () => {
      message.error("Something went wrong. Please try again.");
    },
  });

  if (!token) {
    return (
      <Card title="Error">
        <Typography.Text type="danger">
          Invalid or missing token.
        </Typography.Text>
      </Card>
    );
  }

  const onSubmit = async (data: DataType) => {
    try {
      await mutateAsync({ token, password: data.password });
    } catch (error) {
      console.error(error);
      message.error("An unexpected error occurred.");
    }
  };

  return (
    <Card title="Reset Password" className="w-[400px]">
      <Typography.Text className="mb-8 block" type="secondary">
        Enter your new password below.
      </Typography.Text>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="ant-form ant-form-vertical"
      >
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Form.Item
              label="Password"
              validateStatus={errors.password ? "error" : ""}
              help={errors.password?.message}
              labelCol={{ span: 24 }}
            >
              <Input.Password {...field} placeholder="••••••••" />
            </Form.Item>
          )}
        />
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <Form.Item
              label="Confirm Password"
              validateStatus={errors.confirmPassword ? "error" : ""}
              help={errors.confirmPassword?.message}
              labelCol={{ span: 24 }}
            >
              <Input.Password {...field} placeholder="••••••••" />
            </Form.Item>
          )}
        />
        <Button type="primary" htmlType="submit" loading={isPending} block>
          Update Password
        </Button>
      </form>
    </Card>
  );
};
