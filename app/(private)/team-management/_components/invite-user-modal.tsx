"use client";

import { inviteUserAction } from "@/https/controllers/invite-user-controller";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select } from "antd";
import { useState } from "react";

export const InviteUserModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: inviteUserAction,
    onSuccess: () => {
      form.resetFields();
      setIsOpen(false);
    },
  });

  const handleFinish = async (values: {
    email: string;
    role: "OWNER" | "COLLABORATOR";
  }) => {
    await mutateAsync(values);
  };

  return (
    <>
      <Button type="primary" onClick={() => setIsOpen(true)}>
        Invite User
      </Button>
      <Modal
        title="Invite User"
        footer={null}
        destroyOnHidden
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        centered
      >
        <Form form={form} onFinish={handleFinish}>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role">
            <Select
              defaultActiveFirstOption
              options={[
                { value: "OWNER", label: "Owner" },
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
