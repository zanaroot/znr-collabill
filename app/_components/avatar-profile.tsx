"use client";

import { Avatar, type AvatarProps } from "antd";
import { getInitials } from "@/app/_utils/get-initials-text";
import { getAvatarUrl } from "@/lib/get-avatar-url";

type AvatarProfileProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: AvatarProps["size"];
  shape?: AvatarProps["shape"];
  userName?: string;
  userEmail?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

export const AvatarProfile = ({
  src,
  alt,
  className,
  size = 24,
  shape,
  userName,
  userEmail,
  onClick,
  icon,
  children,
}: AvatarProfileProps) => {
  const shortName = getInitials(userName);
  const avatarUrl = getAvatarUrl(src, userEmail);

  return (
    <Avatar
      src={avatarUrl}
      alt={alt}
      size={size}
      shape={shape}
      className={`bg-primary-500 ${className}`}
      onClick={onClick}
      icon={icon}
    >
      {children ?? shortName}
    </Avatar>
  );
};
