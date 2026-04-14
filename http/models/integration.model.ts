import { z } from "zod";

export const integrationTypeSchema = z.enum(["GITHUB", "BREVO", "SLACK"]);
export type IntegrationType = z.infer<typeof integrationTypeSchema>;

export const githubCredentialsSchema = z.object({
  token: z.string().min(1),
});

export const brevoCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  mailFrom: z.email().or(z.string().includes("@")),
});

export const slackCredentialsSchema = z.object({
  botToken: z.string().min(1),
  defaultChannel: z.string().optional(),
});

export const saveIntegrationSchema = z.object({
  type: integrationTypeSchema,
  credentials: z.object({
    github: githubCredentialsSchema.optional(),
    brevo: brevoCredentialsSchema.optional(),
    slack: slackCredentialsSchema.optional(),
  }),
  config: z
    .object({
      slack: z
        .object({
          defaultChannel: z.string().optional(),
        })
        .optional(),
      github: z
        .object({
          defaultBranch: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type SaveIntegrationInput = z.infer<typeof saveIntegrationSchema>;

export const toggleIntegrationSchema = z.object({
  type: integrationTypeSchema,
  isActive: z.boolean(),
});

export type ToggleIntegrationInput = z.infer<typeof toggleIntegrationSchema>;

export const deleteIntegrationSchema = z.object({
  type: integrationTypeSchema,
});

export type DeleteIntegrationInput = z.infer<typeof deleteIntegrationSchema>;

export type IntegrationCredentials =
  | { github: z.infer<typeof githubCredentialsSchema> }
  | { brevo: z.infer<typeof brevoCredentialsSchema> }
  | { slack: z.infer<typeof slackCredentialsSchema> };

export const integrationResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  type: integrationTypeSchema,
  isActive: z.string(),
  config: z.string().nullable().optional(),
  hasCredentials: z.boolean(),
  createdAt: z.date().nullable().or(z.string()),
  updatedAt: z.date().nullable().or(z.string()),
});

export type IntegrationResponse = z.infer<typeof integrationResponseSchema>;
