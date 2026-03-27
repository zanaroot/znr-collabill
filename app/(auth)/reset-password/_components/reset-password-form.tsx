"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Form, Input, message, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import type { ResetPasswordInput } from "@/http/models/password.model";
import { client } from "@/packages/hono";

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
      <Card title="Error">
        <Typography.Text type="danger">
          Invalid or missing token.
        </Typography.Text>
      </Card>
    );
  }

  const onSubmit = async (data: DataType) => {
    try {
      await resetPassword({ token, password: data.password });
    } catch (error) {
      console.error(error);
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
