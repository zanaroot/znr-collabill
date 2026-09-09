"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
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
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-loading-spinner" />
          <Typography.Title level={2} className="auth-card-title">
            Loading invitation...
          </Typography.Title>
        </div>
      </div>
    );
  }

  if (!invitation || !token) {
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
            Invalid invitation
          </Typography.Title>
          <Typography.Text type="secondary" className="auth-card-subtitle">
            This invitation link is invalid or has expired.
          </Typography.Text>
        </div>
      </div>
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
              aria-label="Users"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <Typography.Title level={2} className="auth-card-title">
            Join organization
          </Typography.Title>
          <Typography.Text type="secondary" className="auth-card-subtitle">
            You&apos;ve been invited to join an organization. Accept to continue
            with your existing account.
          </Typography.Text>
        </div>

        <div className="auth-button-group">
          <Button
            type="primary"
            onClick={() => acceptInvitation(token)}
            loading={isAccepting}
            block
            size="large"
            className="auth-submit-btn"
          >
            Accept invitation
          </Button>
          <Button
            onClick={() => declineInvitation(token)}
            loading={isDeclining}
            block
            size="large"
            className="auth-secondary-btn"
          >
            Decline
          </Button>
        </div>
      </div>
    );
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
            aria-label="Add user"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" x2="19" y1="8" y2="14" />
            <line x1="22" x2="16" y1="11" y2="11" />
          </svg>
        </div>
        <Typography.Title level={2} className="auth-card-title">
          Create your account
        </Typography.Title>
        <Typography.Text type="secondary" className="auth-card-subtitle">
          Welcome! Please enter your details to get started.
        </Typography.Text>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="ant-form ant-form-vertical"
      >
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Form.Item
              validateStatus={errors.name ? "error" : ""}
              help={errors.name?.message}
            >
              <Input
                {...field}
                placeholder="Full name"
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
                    aria-label="Person"
                  >
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
                  </svg>
                }
              />
            </Form.Item>
          )}
        />
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
                placeholder="Password"
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
                placeholder="Confirm password"
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
          loading={isCreating}
          block
          size="large"
          className="auth-submit-btn"
        >
          Create account
        </Button>
      </form>
    </div>
  );
};
