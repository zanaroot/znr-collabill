"use client";

import { UploadOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Upload, type UploadProps } from "antd";
import ImgCrop from "antd-img-crop";
import { useEffect } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { EmailVerificationStatus } from "@/app/(private)/_components/email-verification-status";
import { teamKeys } from "@/app/(private)/team-management/_hooks/use-team";
import type { AuthUser } from "@/http/models/auth.model";
import { client } from "@/packages/hono";

type AvatarSectionProps = {
  avatarUrl?: string | null;
  editing: boolean;
  currentUser?: AuthUser | null;
  handleAvatarChange: UploadProps["onChange"];
  handleRemoveAvatar: () => void;
};

type VerificationResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export const AvatarSection = ({
  avatarUrl,
  editing,
  currentUser,
  handleAvatarChange,
  handleRemoveAvatar,
}: AvatarSectionProps) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  useEffect(() => {
    const refreshUser = () => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.currentUser(),
      });
    };

    window.addEventListener("focus", refreshUser);

    return () => {
      window.removeEventListener("focus", refreshUser);
    };
  }, [queryClient]);

  const {
    mutateAsync: sendVerificationEmail,
    isPending: isSendingVerification,
  } = useMutation({
    mutationFn: async () => {
      const res = await client.api.auth["email-verification"].send.$post();

      const result = (await res.json()) as VerificationResponse;

      if (!res.ok || result.success === false) {
        throw new Error(
          result.error || "Unable to send the verification email.",
        );
      }

      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: teamKeys.currentUser(),
      });
    },
  });

  const handleVerifyEmail = async () => {
    try {
      const result = await sendVerificationEmail();

      message.success(
        result.message || "Verification email sent. Please check your inbox.",
      );
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Unable to send the verification email.",
      );

      throw error;
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <AvatarProfile
        size={320}
        src={avatarUrl}
        className="shadow-sm border"
        userName={currentUser?.name}
        userEmail={currentUser?.email}
      />

      {currentUser?.email && (
        <EmailVerificationStatus
          email={currentUser.email}
          emailVerified={currentUser.emailVerified}
          onVerify={handleVerifyEmail}
          loading={isSendingVerification}
        />
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
  );
};
