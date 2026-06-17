import { z } from "zod";

const integrationTypeSchema = z.enum(["GITHUB", "SLACK"]);
export type IntegrationType = z.infer<typeof integrationTypeSchema>;

const githubCredentialsSchema = z.object({
  token: z.string().min(1),
});

const slackCredentialsSchema = z.object({
  botToken: z.string().min(1),
  defaultChannel: z.string().optional(),
});

export const saveIntegrationSchema = z.object({
  type: integrationTypeSchema,
  credentials: z.object({
    github: githubCredentialsSchema.optional(),
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

export const toggleIntegrationSchema = z.object({
  type: integrationTypeSchema,
  isActive: z.boolean(),
});

export const deleteIntegrationSchema = z.object({
  type: integrationTypeSchema,
});
