"use client";

import { UploadOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UploadProps } from "antd";
import {
  Avatar,
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  Space,
  Tag,
  Upload,
} from "antd";
import ImgCrop from "antd-img-crop";
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

  useEffect(() => {
    return () => {
      if (avatarFile) {
        URL.revokeObjectURL(URL.createObjectURL(avatarFile));
      }
    };
  }, [avatarFile]);

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

  const { mutate: uploadAvatar, isPending: isUploading } = useMutation({
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

  const handleAvatarChange: UploadProps["onChange"] = ({ file }) => {
    const fileObj = file.originFileObj;
    if (fileObj) {
      setAvatarFile(fileObj);
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
          ) : null}
        </Space>
      }
    >
      <div className="flex flex-col items-center">
        <div className="w-full flex flex-col items-center text-center gap-3">
          <Avatar size={320} src={avatarUrl} className="shadow-sm border">
            {initials}
          </Avatar>

          {!editing && (
            <>
              <div className="flex flex-col items-center">
                <span className="text-xl font-semibold leading-tight">
                  {currentName ?? currentUser?.name}
                </span>
                <span className="text-sm text-gray-500">
                  {currentEmail ?? currentUser?.email}
                </span>
              </div>

              <div className="w-full mt-3">
                <Button block onClick={() => setEditing(true)}>
                  Edit profile
                </Button>
              </div>
            </>
          )}

          {editing && (
            <div className="flex flex-col items-center gap-2">
              <ImgCrop rotationSlider>
                <Upload onChange={handleAvatarChange} showUploadList={false}>
                  <Button size="small" icon={<UploadOutlined />}>
                    Change avatar
                  </Button>
                </Upload>
              </ImgCrop>

              {currentUser?.avatar && (
                <Button
                  size="small"
                  type="text"
                  danger
                  onClick={handleRemoveAvatar}
                >
                  Remove avatar
                </Button>
              )}
            </div>
          )}
        </div>

        <Divider />

        {!editing && (
          <div className="w-full mt-6 pt-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Role</span>
              <Tag color="blue">{currentUser?.organizationRole}</Tag>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Organization</span>
              <span>{currentUser?.organizationName || "N/A"}</span>
            </div>
          </div>
        )}

        {editing && (
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="w-full mt-6"
          >
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: "Please enter your name" }]}
            >
              <Input placeholder="Enter your name" />
            </Form.Item>

            <div className="flex gap-2 mt-2">
              <Button onClick={() => setEditing(false)} block>
                Cancel
              </Button>

              <Button
                type="primary"
                htmlType="submit"
                loading={isPending || isUploading}
                block
              >
                Save
              </Button>
            </div>
          </Form>
        )}
      </div>
    </Drawer>
  );
};
