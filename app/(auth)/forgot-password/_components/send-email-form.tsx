"use client";

import { forgotPasswordAction } from "@/https/controllers/forgot-password-controller";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Flex, Form, Input, Typography, message } from "antd";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { PendingConfirmationForm } from "./pending-confirmation-form";

const schema = z.object({
  email: z.email("Please enter a valid email"),
});

type DataType = z.infer<typeof schema>;

export const SendEmailForm = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DataType>({
    resolver: zodResolver(schema),
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: forgotPasswordAction,
    onSuccess: () => {
      message.success("If an account exists, an email has been sent.");
    },
    onError: () => {
      message.error("Something went wrong. Please try again.");
    },
  });

  const onSubmit = async (data: DataType) => {
    try {
      await mutateAsync(data);
    } catch (error) {
      console.error(error);
      message.error("An unexpected error occurred.");
    }
  };

  if (isPending) {
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
