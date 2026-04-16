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
  isPresent?: boolean;
  onPresenceClick?: () => void;
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
  isPresent,
  onPresenceClick,
}: AvatarProfileProps) => {
  const shortName = getInitials(userName);
  const avatarUrl = getAvatarUrl(src, userEmail);

  const avatar = (
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

  if (isPresent !== undefined) {
    const dotSize = typeof size === "number" ? Math.max(size * 0.3, 8) : 12;

    const handlePresenceClick = (e: React.MouseEvent) => {
      if (onPresenceClick) {
        e.stopPropagation();
        onPresenceClick();
      }
    };

    const handlePresenceKeyDown = (e: React.KeyboardEvent) => {
      if (onPresenceClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onPresenceClick();
      }
    };

    return (
      <span style={{ position: "relative", display: "inline-flex" }}>
        {avatar}
        {onPresenceClick ? (
          <button
            type="button"
            aria-label={isPresent ? "Present" : "Not present"}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              backgroundColor: isPresent ? "#52c41a" : "#ff4d4f",
              border: "2px solid white",
              cursor: "pointer",
              padding: 0,
            }}
            onClick={handlePresenceClick}
            onKeyDown={handlePresenceKeyDown}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              backgroundColor: isPresent ? "#52c41a" : "#ff4d4f",
              border: "2px solid white",
            }}
          />
        )}
      </span>
    );
  }

  return avatar;
};
