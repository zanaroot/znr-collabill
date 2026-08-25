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
              aria-label="Join"
              role="img"
            >
              <path
                d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11ZM22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
            aria-label="Person"
            role="img"
          >
            <path
              d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M8 11C10.2091 11 12 9.20914 12 7C12 4.79086 10.2091 3 8 3C5.79086 3 4 4.79086 4 7C4 9.20914 5.79086 11 8 11ZM20 8V14M23 11H17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-label="Person"
                    role="img"
                  >
                    <path
                      d="M15 15.75V14.25C15 13.4544 14.6839 12.6913 14.1213 12.1287C13.5587 11.5661 12.7956 11.25 12 11.25H6C5.20435 11.25 4.44129 11.5661 3.87868 12.1287C3.31607 12.6913 3 13.4544 3 14.25V15.75M12.75 4.5C12.75 5.74264 11.7426 6.75 10.5 6.75C9.25736 6.75 8.25 5.74264 8.25 4.5C8.25 3.25736 9.25736 2.25 10.5 2.25C11.7426 2.25 12.75 3.25736 12.75 4.5Z"
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
                placeholder="Confirm password"
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
