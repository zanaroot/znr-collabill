"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import type { CreateInvitationInput } from "@/http/models/user.model";
import { client } from "@/packages/hono";
import { teamKeys, useCurrentUser } from "../_hooks/use-team";

export const InviteUserModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { message } = App.useApp();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: CreateInvitationInput) => {
      const res = await client.api.users.invitations.$post({ json: data });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      form.resetFields();
      setIsOpen(false);
      message.success("Invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations() });
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
            <Button type="primary" htmlType="submit" block loading={isPending}>
              Invite
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
