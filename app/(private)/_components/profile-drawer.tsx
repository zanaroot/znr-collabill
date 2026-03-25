"use client";

import { UploadOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  Space,
  Tag,
  Upload,
} from "antd";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/http/models/auth.model";
import { getAvatarUrl } from "@/lib/get-avatar-url";
import { getInitials } from "@/lib/get-initials-text";
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentUser) {
      form.setFieldsValue({
        name: currentUser.name,
        email: currentUser.email,
      });
      setAvatarFile(null);
    }
  }, [currentUser, form]);

  const { mutate: removeAvatar } = useMutation({
    mutationFn: async () => {
      const res = await client.api.users.me.$patch({
        json: { avatar: null },
      });
      if (!res.ok) {
        throw new Error("Failed to remove avatar");
      }
      return await res.json();
    },
    onSuccess: () => {
      message.success("Avatar removed");
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const { mutate: uploadAvatar } = useMutation({
    mutationFn: async (file: File) => {
      const res = await client.api.users.me.avatar.$post({
        form: { file },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "error" in data ? data.error : "Failed to upload avatar",
        );
      }
      return await res.json();
    },
    onSuccess: () => {
      message.success("Avatar updated successfully");
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

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
    if (avatarFile) {
      uploadAvatar(avatarFile, {
        onSuccess: () => {
          updateProfile(values);
        },
      });
    } else {
      updateProfile(values);
    }
  };

  const handleAvatarChange = (info: { file: { originFileObj?: File } }) => {
    const file = info.file.originFileObj;
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleRemoveAvatar = () => {
    removeAvatar();
  };

  const currentEmail = Form.useWatch("email", form) as string | undefined;
  const currentName = Form.useWatch("name", form) as string | undefined;

  const avatarUrl = avatarFile
    ? URL.createObjectURL(avatarFile)
    : getAvatarUrl(currentUser?.avatar, currentEmail ?? currentUser?.email);

  const initials = getInitials(currentName ?? currentUser?.name);

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
      forceRender
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
          <div className="mb-4 flex flex-col items-center gap-2">
            <Avatar size={72} src={avatarUrl}>
              {initials}
            </Avatar>
            {editing && (
              <Upload beforeUpload={() => false} onChange={handleAvatarChange}>
                <Button icon={<UploadOutlined />} size="small">
                  Change Avatar
                </Button>
              </Upload>
            )}
            {editing && currentUser.avatar && (
              <Button size="small" onClick={handleRemoveAvatar} type="text">
                Remove
              </Button>
            )}
          </div>

          <Descriptions column={1} layout="vertical">
            <Descriptions.Item label="Role">
              <Tag color="blue">{currentUser.organizationRole}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Organization">
              {currentUser.organizationName || "N/A"}
            </Descriptions.Item>
          </Descriptions>

          <Divider />
        </>
      )}

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
          <Input placeholder="Enter your email" />
        </Form.Item>
      </Form>
    </Drawer>
  );
};
