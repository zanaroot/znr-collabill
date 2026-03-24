import { z } from "zod";

export const roleEnum = z.enum(["OWNER", "ADMIN", "COLLABORATOR"]);
export type Role = z.infer<typeof roleEnum>;

export const collaboratorRateSchema = z.object({
  organizationId: z.string().uuid(),
  rateXs: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid rate format"),
  rateS: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid rate format"),
  rateM: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid rate format"),
  rateL: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid rate format"),
  rateXl: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid rate format"),
  dailyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid rate format"),
});

export type CollaboratorRate = z.infer<typeof collaboratorRateSchema>;

export type UserWithCollaboratorRate = {
  id: string;
  email: string;
  name: string;
  createdAt: string | Date | null;
  role: Role;
  joinedAt: string | Date | null;
  collaboratorRate?: CollaboratorRate;
};

export type UserRole = {
  userId: string;
  role: Role;
};

export type UserWithRoles = {
  id: string;
  email: string;
  name: string;
  createdAt: string | Date | null;
  role: Role;
  joinedAt: string | Date | null;
};

export type Invitation = {
  id: string;
  email: string;
  token: string;
  role: Role;
  expiresAt: string | Date;
  createdAt: string | Date | null;
};
