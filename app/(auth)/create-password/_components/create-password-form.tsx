"use client";

import { createPasswordAction } from "@/https/controllers/create-password-controller";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Form, Input, message, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type DataType = z.infer<typeof schema>;

export const CreatePasswordForm = () => {
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
    mutationFn: createPasswordAction,
    onSuccess: (data) => {
      if (data.success) {
        message.success("Account created successfully!");
        router.push("/sign-in");
      } else {
        message.error(data.error || "Something went wrong.");
      }
    },
    onError: () => {
      message.error("Something went wrong. Please try again.");
    },
  });

  if (!token) {
    return (
      <Card title="Error">
        <Typography.Text type="danger">
          Invalid or missing invitation token.
        </Typography.Text>
      </Card>
    );
  }

  const onSubmit = async (data: DataType) => {
    try {
      await mutateAsync({
        token,
        name: data.name,
        password: data.password,
      });
    } catch (error) {
      console.error(error);
      message.error("An unexpected error occurred.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Card title="Create Your Account" className="w-[400px]">
        <Typography.Text className="mb-8 block" type="secondary">
          Welcome! Please enter your name and choose a password to complete your registration.
        </Typography.Text>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="ant-form ant-form-vertical"
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Full Name"
                validateStatus={errors.name ? "error" : ""}
                help={errors.name?.message}
                labelCol={{ span: 24 }}
              >
                <Input {...field} placeholder="John Doe" />
              </Form.Item>
            )}
          />
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
            Create Account
          </Button>
        </form>
      </Card>
    </div>
  );
};
