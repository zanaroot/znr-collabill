"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UploadProps } from "antd";
import { Drawer, Form, message } from "antd";
import { useEffect, useState } from "react";
import {
  AvatarSection,
  ProfileForm,
  ProfileInfo,
} from "@/app/(private)/_components/profile";
import { teamKeys } from "@/app/(private)/team-management/_hooks/use-team";
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
  const [form] = Form.useForm<{ name: string; email: string }>();
  const [editing, setEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentUser) {
      form.setFieldsValue({ name: currentUser.name, email: currentUser.email });
      setAvatarFile(null);
    }
  }, [currentUser, form]);

  useEffect(() => {
    return () => {
      if (avatarFile) URL.revokeObjectURL(URL.createObjectURL(avatarFile));
    };
  }, [avatarFile]);

  const { mutate: removeAvatar } = useMutation({
    mutationFn: async () => {
      const res = await client.api.users.me.$patch({ json: { avatar: null } });
      if (!res.ok) throw new Error("Failed to remove avatar");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.users() });
      queryClient.invalidateQueries({ queryKey: teamKeys.currentUser() });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  const { mutate: uploadAvatar, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      const res = await client.api.users.me.avatar.$post({ form: { file } });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "error" in data ? data.error : "Failed to upload avatar",
        );
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.currentUser() });
      queryClient.invalidateQueries({ queryKey: teamKeys.users() });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async (values: { name: string; email: string }) => {
      const res = await client.api.users.me.$patch({ json: values });
      if (!res.ok) throw new Error("Failed to update profile");
      return await res.json();
    },
    onSuccess: () => {
      message.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      setEditing(false);
    },
    onError: (error: Error) => message.error(error.message),
  });

  const onFinish = (values: { name: string; email: string }) => {
    if (avatarFile) {
      uploadAvatar(avatarFile, { onSuccess: () => updateProfile(values) });
    } else updateProfile(values);
  };

  const handleAvatarChange: UploadProps["onChange"] = ({ file }) => {
    const fileObj = file.originFileObj;
    if (fileObj) setAvatarFile(fileObj);
  };

  const avatarUrl = avatarFile
    ? URL.createObjectURL(avatarFile)
    : currentUser?.avatar;

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
    >
      <div className="flex flex-col items-center w-full">
        <AvatarSection
          avatarUrl={avatarUrl}
          editing={editing}
          currentUser={currentUser}
          handleAvatarChange={handleAvatarChange}
          handleRemoveAvatar={() => removeAvatar()}
        />

        {!editing ? (
          <ProfileInfo
            currentUser={currentUser}
            currentName={currentUser?.name}
            currentEmail={currentUser?.email}
            onEdit={() => setEditing(true)}
          />
        ) : (
          <ProfileForm
            form={form}
            onFinish={onFinish}
            isPending={isPending}
            isUploading={isUploading}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>
    </Drawer>
  );
};
