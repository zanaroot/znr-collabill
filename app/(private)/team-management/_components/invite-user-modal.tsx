"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import { billingKeys, useEntitlements } from "@/app/_hooks/use-billing";
import type { CreateInvitationInput } from "@/http/models/user.model";
import { client } from "@/packages/hono";
import { teamKeys, useCurrentUser } from "../_hooks/use-team";

export const InviteUserModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: entitlements } = useEntitlements({ enabled: isOpen });

  const { message } = App.useApp();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: CreateInvitationInput) => {
      const res = await client.api.users.invitations.$post({ json: data });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      form.resetFields();
      setIsOpen(false);
      message.success("Invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations() });
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handleFinish = async (values: CreateInvitationInput) => {
    await mutateAsync(values);
  };

  const canInvite =
    currentUser &&
    (currentUser.organizationRole === "OWNER" ||
      currentUser.organizationRole === "ADMIN");

  if (!canInvite) {
    return null;
  }

  const isOwner = currentUser.organizationRole === "OWNER";
  const memberLimitReached = entitlements?.reached.members ?? false;

  return (
    <>
      <Button type="primary" onClick={() => setIsOpen(true)}>
        Invite User
      </Button>
      <Modal
        title="Invite User"
        footer={null}
        destroyOnHidden
        forceRender
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        centered
      >
        {memberLimitReached && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message={
              isOwner
                ? "You've reached the member limit on your current plan. Upgrade to Pro to invite more members."
                : "Your organization has reached its member limit."
            }
          />
        )}
        <Form
          form={form}
          onFinish={handleFinish}
          initialValues={{ role: "COLLABORATOR" }}
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role">
            <Select
              defaultActiveFirstOption
              options={[
                { value: "ADMIN", label: "Admin" },
                { value: "COLLABORATOR", label: "Collaborator" },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isPending}
              disabled={memberLimitReached}
            >
              Invite
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
