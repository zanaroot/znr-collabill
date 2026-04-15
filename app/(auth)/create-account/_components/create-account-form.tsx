"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  type CreateAccountInput,
  createAccountSchema,
} from "@/http/models/auth.model";
import type { CreatePasswordInput } from "@/http/models/invitation.model";
import { client } from "@/packages/hono";

type InvitationResponse = {
  id: string;
  email: string;
  organizationId: string | null;
  role: string;
  expiresAt: string;
  exists: boolean;
};

export const CreateAccountForm = () => {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
  });

  const { data: invitation, isLoading } = useQuery<InvitationResponse | null>({
    queryKey: ["invitation", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await client.api.invitations.public[":token"].$get({
        param: { token },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch invitation");
      }
      return await res.json();
    },
    enabled: !!token,
  });

  const { mutateAsync: createAccount, isPending: isCreating } = useMutation({
    mutationFn: async (data: CreatePasswordInput) => {
      const res = await client.api.invitations.public["create-password"].$post({
        json: data,
      });
      const result = await res.json();
      if (!res.ok) {
        const errorData = result as { error?: string };
        throw new Error(errorData.error || "Failed to create account");
      }
      return result;
    },
    onSuccess: () => {
      message.success("Account created successfully!");
      router.push("/sign-in");
    },
    onError: (error: Error) => {
      message.error(error.message || "Something went wrong.");
    },
  });

  const { mutateAsync: acceptInvitation, isPending: isAccepting } = useMutation(
    {
      mutationFn: async (token: string) => {
        const res = await client.api.invitations.public[":token"].accept.$post({
          param: { token },
        });
        const result = await res.json();
        if (!res.ok) {
          const errorData = result as { error?: string };
          throw new Error(errorData.error || "Failed to join organization");
        }
        return result;
      },
      onSuccess: () => {
        message.success("Successfully joined the organization!");
        router.push("/sign-in");
      },
      onError: (error: Error) => {
        message.error(error.message || "Something went wrong.");
      },
    },
  );

  const { mutateAsync: declineInvitation, isPending: isDeclining } =
    useMutation({
      mutationFn: async (token: string) => {
        const res = await client.api.invitations.public[":token"].decline.$post(
          {
            param: { token },
          },
        );
        const result = await res.json();
        if (!res.ok) {
          const errorData = result as { error?: string };
          throw new Error(errorData.error || "Failed to decline invitation");
        }
        return result;
      },
      onSuccess: () => {
        message.success("Invitation declined.");
        router.push("/");
      },
      onError: (error: Error) => {
        message.error(error.message || "Something went wrong.");
      },
    });

  if (isLoading) {
    return (
      <Card title="Loading">
        <Typography.Text>Loading invitation...</Typography.Text>
      </Card>
    );
  }

  if (!invitation || !token) {
    return (
      <Card title="Error">
        <Typography.Text type="danger">
          Invalid or missing invitation token.
        </Typography.Text>
      </Card>
    );
  }

  const onSubmit = async (data: CreateAccountInput) => {
    try {
      await createAccount({
        token: token,
        name: data.name,
        password: data.password,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (invitation?.exists) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Card title="Join Organization" className="w-[400px]">
          <Typography.Paragraph>
            Welcome back! You have been invited to join an organization. Since
            you already have an account, you can just accept the invitation.
          </Typography.Paragraph>
          <div className="flex flex-col gap-4 mt-8">
            <Button
              type="primary"
              onClick={() => acceptInvitation(token)}
              loading={isAccepting}
              block
            >
              Accept Invitation
            </Button>
            <Button
              danger
              onClick={() => declineInvitation(token)}
              loading={isDeclining}
              block
            >
              Decline Invitation
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Card title="Create Your Account" className="w-[400px]">
        <Typography.Text className="mb-8 block" type="secondary">
          Welcome {invitation?.email}! Please enter your name and choose a
          password to complete your registration.
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
          <Button type="primary" htmlType="submit" loading={isCreating} block>
            Create Account
          </Button>
        </form>
      </Card>
    </div>
  );
};
