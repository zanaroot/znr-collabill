"use client";

import { Button, Card, Form, Input, Typography, message } from "antd";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type DataType = z.infer<typeof schema>;

export const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DataType>({
    resolver: zodResolver(schema),
  });

  if (!token) {
     return <Card title="Error"><Typography.Text type="danger">Invalid or missing token.</Typography.Text></Card>;
  }

  const onSubmit = async (data: DataType) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      if (response.ok) {
        message.success("Password updated successfully!");
        router.push("/sign-in");
      } else {
        const errorData = await response.json();
        message.error(errorData.error || "Failed to reset password.");
      }
    } catch (error) {
      console.error(error);
      message.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Reset Password" className="w-[400px]">
      <Typography.Text className="mb-8 block" type="secondary">
        Enter your new password below.
      </Typography.Text>
      <form onSubmit={handleSubmit(onSubmit)} className="ant-form ant-form-vertical">
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Form.Item
              label="Password"
              validateStatus={errors.password ? "error" : ""}
              help={errors.password?.message}
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
            >
              <Input.Password {...field} placeholder="••••••••" />
            </Form.Item>
          )}
        />
        <Button type="primary" htmlType="submit" loading={loading} block>
          Update Password
        </Button>
      </form>
    </Card>
  );
};
