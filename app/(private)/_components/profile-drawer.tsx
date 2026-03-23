"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  Space,
  Tag,
} from "antd";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/http/models/auth.model";
import { client } from "@/packages/hono";

type ProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  currentUser: AuthUser | null | undefined;
};

export const ProfileDrawer = ({
  open,
  onClose,
  currentUser,
}: ProfileDrawerProps) => {
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentUser) {
      form.setFieldsValue({
        name: currentUser.name,
        email: currentUser.email,
      });
    }
  }, [currentUser, form]);

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async (values: { name: string; email: string }) => {
      const res = await client.api.users.me.$patch({
        json: values,
      });
      if (!res.ok) {
        throw new Error("Failed to update profile");
      }
      return await res.json();
    },
    onSuccess: () => {
      message.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      setEditing(false);
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const onFinish = (values: { name: string; email: string }) => {
    updateProfile(values);
  };

  return (
    <Drawer
      title="User Profile"
      placement="right"
      onClose={() => {
        onClose();
        setEditing(false);
      }}
      open={open}
      size={400}
      extra={
        <Space>
          {!editing ? (
            <Button type="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : (
            <>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
              <Button
                type="primary"
                onClick={() => form.submit()}
                loading={isPending}
              >
                Save
              </Button>
            </>
          )}
        </Space>
      }
    >
      {currentUser && (
        <>
          <Descriptions column={1} layout="vertical">
            <Descriptions.Item label="Role">
              <Tag color="blue">{currentUser.organizationRole}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Organization">
              {currentUser.organizationName || "N/A"}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            disabled={!editing}
          >
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: "Please enter your name" }]}
            >
              <Input placeholder="Enter your name" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <Input placeholder="Enter your email" disabled />
            </Form.Item>
          </Form>
        </>
      )}
    </Drawer>
  );
};
