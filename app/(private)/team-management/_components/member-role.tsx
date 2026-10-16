
"use client";

import { Select, Tag } from "antd";
import type { Role } from "@/http/models/user.model";

type MemberRoleProps = {
  role: Role;
  isOwner: boolean;
  isCurrentUser: boolean;
  loading?: boolean;
  onChange?: (role: Role) => void;
};

const roleLabels: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  COLLABORATOR: "Collaborator",
};

const roleColors: Record<Role, string> = {
  OWNER: "gold",
  ADMIN: "blue",
  COLLABORATOR: "green",
};

export const MemberRole = ({
  role,
  isOwner,
  isCurrentUser,
  loading = false,
  onChange,
}: MemberRoleProps) => {
  if (isOwner) {
    return (
      <Select
        value={role}
        disabled={isCurrentUser || loading}
        onClick={(event) => event.stopPropagation()}
        onChange={onChange}
        style={{ width: "100%", minWidth: 100 }}
        options={[
          { value: "OWNER", label: "Owner" },
          { value: "ADMIN", label: "Admin" },
          { value: "COLLABORATOR", label: "Collaborator" },
        ]}
      />
    );
  }

  return <Tag color={roleColors[role]}>{roleLabels[role]}</Tag>;
};
