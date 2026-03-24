"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import { inviteUserAction } from "@/http/actions/invitation.action";
import { teamKeys, useCurrentUser } from "../_hooks/use-team";

export const InviteUserModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: inviteUserAction,
    onSuccess: (data) => {
      if (data.success) {
        form.resetFields();
        setIsOpen(false);
        queryClient.invalidateQueries({ queryKey: teamKeys.invitations() });
      }
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const handleFinish = async (values: {
    email: string;
    role: "ADMIN" | "COLLABORATOR";
  }) => {
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
            rules={[{ required: true, message: "Please enter email" }]}
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
