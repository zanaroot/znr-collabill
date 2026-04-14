import { z } from "zod";

export const updateOrganizationSlackSettingsSchema = z.object({
  slackBotToken: z.string().optional().nullable(),
  slackDefaultChannel: z.string().optional().nullable(),
});

export type UpdateOrganizationSlackSettingsInput = z.infer<
  typeof updateOrganizationSlackSettingsSchema
>;

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1),
  slackBotTokenEncrypted: z.string().nullable().optional(),
  slackDefaultChannel: z.string().nullable().optional(),
  createdAt: z.date().nullable().or(z.string()),
  deletedAt: z.date().nullable().or(z.string()).optional(),
});

export type Organization = z.infer<typeof organizationSchema>;

export const deleteOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  confirmDelete: z.literal("DELETE"),
  hardDelete: z.boolean().optional().default(false),
});

export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationSchema>;
