import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { serverEnv } from "../env/server";
import { s3 } from "./s3-client";

type ProjectFileScope = {
  organizationId: string;
  projectId: string;
};

type ProjectFileUpload = ProjectFileScope & {
  body: Uint8Array;
  contentType: string;
};

type ProjectFileReference = ProjectFileScope & {
  storageKey: string;
};

type ProjectFileDownload = Pick<
  GetObjectCommandOutput,
  "ContentLength" | "ContentType" | "ETag" | "LastModified"
> & {
  body: {
    transformToByteArray: () => Promise<Uint8Array>;
  };
};

export class ProjectFileStorageError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "STORAGE_FAILURE",
    options?: ErrorOptions,
  ) {
    super(
      code === "NOT_FOUND"
        ? "Project file was not found"
        : "Project file storage operation failed",
      options,
    );
    this.name = "ProjectFileStorageError";
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const objectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const encryptedFileMagic = Buffer.from("PFE1");
const encryptedFileIvLength = 12;
const encryptedFileTagLength = 16;

const getProjectFileEncryptionKey = () =>
  Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(serverEnv.ENCRYPTION_KEY, "utf8"),
      Buffer.from("collabill-project-files-v1", "utf8"),
      Buffer.from("AES-256-GCM application-layer encryption", "utf8"),
      32,
    ),
  );

const encryptFile = (plaintext: Uint8Array) => {
  const iv = randomBytes(encryptedFileIvLength);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getProjectFileEncryptionKey(),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return Buffer.concat([
    encryptedFileMagic,
    iv,
    cipher.getAuthTag(),
    ciphertext,
  ]);
};

const decryptFile = (encrypted: Uint8Array) => {
  const envelope = Buffer.from(encrypted);
  const headerLength =
    encryptedFileMagic.length + encryptedFileIvLength + encryptedFileTagLength;

  if (
    envelope.length < headerLength ||
    !envelope.subarray(0, encryptedFileMagic.length).equals(encryptedFileMagic)
  ) {
    throw new Error("Invalid encrypted project file");
  }

  const ivStart = encryptedFileMagic.length;
  const tagStart = ivStart + encryptedFileIvLength;
  const ciphertextStart = tagStart + encryptedFileTagLength;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getProjectFileEncryptionKey(),
    envelope.subarray(ivStart, tagStart),
  );
  decipher.setAuthTag(envelope.subarray(tagStart, ciphertextStart));

  return Buffer.concat([
    decipher.update(envelope.subarray(ciphertextStart)),
    decipher.final(),
  ]);
};

const getProjectPrefix = ({ organizationId, projectId }: ProjectFileScope) => {
  if (!uuidPattern.test(organizationId) || !uuidPattern.test(projectId)) {
    throw new TypeError("Organization and project IDs must be UUIDs");
  }

  return `organizations/${organizationId.toLowerCase()}/projects/${projectId.toLowerCase()}/`;
};

const validateStorageKey = (reference: ProjectFileReference) => {
  const prefix = getProjectPrefix(reference);
  const objectId = reference.storageKey.slice(prefix.length);

  if (
    !reference.storageKey.startsWith(prefix) ||
    !objectIdPattern.test(objectId)
  ) {
    throw new TypeError("Storage key does not belong to this project");
  }

  return reference.storageKey;
};

const isMissingObjectError = (error: unknown) =>
  error instanceof S3ServiceException &&
  error.name !== "NoSuchBucket" &&
  (error.name === "NoSuchKey" ||
    error.name === "NotFound" ||
    error.$metadata.httpStatusCode === 404);

const withStorageErrors = async <T>(
  operation: () => Promise<T>,
  missingObjectIsNotFound = false,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ProjectFileStorageError) {
      throw error;
    }

    if (missingObjectIsNotFound && isMissingObjectError(error)) {
      throw new ProjectFileStorageError("NOT_FOUND", { cause: error });
    }

    throw new ProjectFileStorageError("STORAGE_FAILURE", { cause: error });
  }
};

export const uploadProjectFile = async ({
  organizationId,
  projectId,
  body,
  contentType,
}: ProjectFileUpload) => {
  const prefix = getProjectPrefix({ organizationId, projectId });
  const storageKey = `${prefix}${randomUUID()}`;
  const encryptedBody = encryptFile(body);

  await withStorageErrors(() =>
    s3.send(
      new PutObjectCommand({
        Bucket: serverEnv.S3_PROJECT_FILES_BUCKET,
        Key: storageKey,
        Body: encryptedBody,
        ContentType: contentType,
      }),
    ),
  );

  return { storageKey, size: body.byteLength };
};

export const downloadProjectFile = async (
  reference: ProjectFileReference,
): Promise<ProjectFileDownload> => {
  const storageKey = validateStorageKey(reference);
  return withStorageErrors(async () => {
    const output = await s3.send(
      new GetObjectCommand({
        Bucket: serverEnv.S3_PROJECT_FILES_BUCKET,
        Key: storageKey,
      }),
    );

    if (!output.Body) {
      throw new ProjectFileStorageError("STORAGE_FAILURE");
    }

    const body = decryptFile(await output.Body.transformToByteArray());
    return {
      body: { transformToByteArray: async () => body },
      ContentLength: body.byteLength,
      ContentType: output.ContentType,
      ETag: output.ETag,
      LastModified: output.LastModified,
    };
  }, true);
};

export const getProjectFileContent = async (
  reference: ProjectFileReference,
) => {
  const file = await downloadProjectFile(reference);

  return withStorageErrors(async () =>
    Buffer.from(await file.body.transformToByteArray()),
  );
};

export const deleteProjectFile = async (reference: ProjectFileReference) => {
  const storageKey = validateStorageKey(reference);
  await withStorageErrors(() =>
    s3.send(
      new DeleteObjectCommand({
        Bucket: serverEnv.S3_PROJECT_FILES_BUCKET,
        Key: storageKey,
      }),
    ),
  );
};

export const replaceProjectFile = async ({
  organizationId,
  projectId,
  storageKey,
  body,
  contentType,
}: ProjectFileReference & Pick<ProjectFileUpload, "body" | "contentType">) => {
  const key = validateStorageKey({ organizationId, projectId, storageKey });
  const encryptedBody = encryptFile(body);

  await withStorageErrors(() =>
    s3.send(
      new PutObjectCommand({
        Bucket: serverEnv.S3_PROJECT_FILES_BUCKET,
        Key: key,
        Body: encryptedBody,
        ContentType: contentType,
      }),
    ),
  );

  return { storageKey: key, size: body.byteLength };
};

export const projectFileExists = async (reference: ProjectFileReference) => {
  const storageKey = validateStorageKey(reference);

  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: serverEnv.S3_PROJECT_FILES_BUCKET,
        Key: storageKey,
      }),
    );
    return true;
  } catch (error) {
    if (isMissingObjectError(error)) {
      return false;
    }

    throw new ProjectFileStorageError("STORAGE_FAILURE", { cause: error });
  }
};
