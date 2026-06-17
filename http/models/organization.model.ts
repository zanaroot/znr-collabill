import { z } from "zod";

const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1),
  slackBotTokenEncrypted: z.string().nullable().optional(),
  slackDefaultChannel: z.string().nullable().optional(),
  unusedLeavePolicy: z
    .enum(["CARRY_OVER", "PAID_AS_WORKED"])
    .default("CARRY_OVER"),
  adminLeaveQuota: z.string().default("2.5"),
  collaboratorLeaveQuota: z.string().default("2.0"),
  createdAt: z.date().nullable().or(z.string()),
  deletedAt: z.date().nullable().or(z.string()).optional(),
});

export type Organization = z.infer<typeof organizationSchema>;
