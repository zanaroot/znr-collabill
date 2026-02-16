import { z } from "zod";

export const roleEnum = z.enum(["OWNER", "COLLABORATOR"]);
export type Role = z.infer<typeof roleEnum>;

export type UserRole = {
  userId: string;
  role: Role;
};

export type UserWithRoles = {
  id: string;
  email: string;
  name: string;
  createdAt: string | Date | null;
  roles: UserRole[];
};

export type Invitation = {
  id: string;
  email: string;
  token: string;
  role: Role;
  expiresAt: string | Date;
  createdAt: string | Date | null;
};
