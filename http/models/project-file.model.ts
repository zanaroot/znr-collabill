import { z } from "zod";
import { MAX_PROJECT_FILE_SIZE } from "@/lib/project-files";

export { MAX_PROJECT_FILE_SIZE };

export const projectFilesParamsSchema = z.object({
  projectId: z.uuid(),
});

export const projectFileParamsSchema = projectFilesParamsSchema.extend({
  fileId: z.uuid(),
});

export const projectFileListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const isUploadedFile = (value: unknown): value is File =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  "type" in value &&
  typeof value.type === "string" &&
  "size" in value &&
  typeof value.size === "number" &&
  "arrayBuffer" in value &&
  typeof value.arrayBuffer === "function";

export const projectFileUploadFormSchema = z.object({
  file: z
    .custom<File>(isUploadedFile, "A file is required")
    .refine((file) => file.size > 0, "The file must not be empty")
    .refine(
      (file) => file.size <= MAX_PROJECT_FILE_SIZE,
      "The file exceeds the 50MB limit",
    )
    .refine((file) => file.name.trim().length > 0, "A file name is required")
    .refine(
      (file) =>
        !file.type || /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(file.type),
      "The MIME type is invalid",
    ),
  isSensitive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export type ProjectFileUploadForm = z.infer<typeof projectFileUploadFormSchema>;
