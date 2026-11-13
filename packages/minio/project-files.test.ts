import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../env/server", () => ({
  serverEnv: {
    S3_PROJECT_FILES_BUCKET: "project-files",
    ENCRYPTION_KEY: "test-encryption-key-for-project-files-32chars",
  },
}));
vi.mock("./s3-client", () => ({
  s3: { send: vi.fn() },
}));

import {
  deleteProjectFile,
  downloadProjectFile,
  getProjectFileContent,
  projectFileExists,
  replaceProjectFile,
  uploadProjectFile,
} from "./project-files";
import { s3 } from "./s3-client";

const scope = {
  organizationId: "e2a2eb9d-569b-47a8-88e8-c208862473e3",
  projectId: "93aa035a-c67a-4f4f-b97b-369b77d89ce2",
};
const storageKey = `organizations/${scope.organizationId}/projects/${scope.projectId}/475cb4f5-c40e-497d-b508-61f80e2e8a40`;
const send = vi.mocked(s3.send);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("project file storage", () => {
  it("uploads under a unique organization and project key", async () => {
    send.mockResolvedValueOnce({} as never);

    const body = Buffer.from("file contents");
    const result = await uploadProjectFile({
      ...scope,
      body,
      contentType: "text/plain",
    });

    expect(result.size).toBe(body.byteLength);
    expect(result.storageKey).toMatch(
      new RegExp(
        `^organizations/${scope.organizationId}/projects/${scope.projectId}/[0-9a-f-]{36}$`,
      ),
    );
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(PutObjectCommand);
  });

  it("returns a stream and can retrieve file contents", async () => {
    const body = Buffer.from("file contents");
    send.mockResolvedValueOnce({} as never);
    await uploadProjectFile({
      ...scope,
      body,
      contentType: "text/plain",
    });

    const putCommand = send.mock.calls[0]?.[0] as PutObjectCommand;
    const encryptedBody = Buffer.from(putCommand.input.Body as Uint8Array);
    expect(encryptedBody).not.toEqual(body);

    send.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => encryptedBody },
      ContentType: "text/plain",
    } as never);
    const reference = { ...scope, storageKey };
    const download = await downloadProjectFile(reference);
    send.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => encryptedBody },
      ContentType: "text/plain",
    } as never);
    const content = await getProjectFileContent(reference);

    expect(download.ContentType).toBe("text/plain");
    expect(await download.body.transformToByteArray()).toEqual(body);
    expect(content).toEqual(body);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(GetObjectCommand);
  });

  it("rejects modified or plaintext objects instead of returning them", async () => {
    send.mockResolvedValueOnce({} as never);
    await uploadProjectFile({
      ...scope,
      body: Buffer.from("sensitive"),
      contentType: "text/plain",
    });
    const putCommand = send.mock.calls[0]?.[0] as PutObjectCommand;
    const encryptedBody = Buffer.from(putCommand.input.Body as Uint8Array);
    encryptedBody[encryptedBody.length - 1] ^= 0xff;
    send.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => encryptedBody },
    } as never);

    await expect(
      downloadProjectFile({ ...scope, storageKey }),
    ).rejects.toMatchObject({
      name: "ProjectFileStorageError",
      code: "STORAGE_FAILURE",
    });
  });

  it("replaces and deletes a file using its scoped key", async () => {
    send.mockResolvedValue({} as never);

    const replacement = await replaceProjectFile({
      ...scope,
      storageKey,
      body: Buffer.from("replacement"),
      contentType: "text/plain",
    });
    await deleteProjectFile({ ...scope, storageKey });

    expect(replacement).toEqual({
      storageKey,
      size: Buffer.byteLength("replacement"),
    });
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it("checks existence and reports missing objects as false", async () => {
    send.mockResolvedValueOnce({} as never);
    await expect(projectFileExists({ ...scope, storageKey })).resolves.toBe(
      true,
    );
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);

    send.mockRejectedValueOnce(
      new S3ServiceException({
        name: "NotFound",
        $fault: "client",
        $metadata: { httpStatusCode: 404 },
      }),
    );
    await expect(projectFileExists({ ...scope, storageKey })).resolves.toBe(
      false,
    );
  });

  it("reports missing downloads with a not-found storage error", async () => {
    send.mockRejectedValueOnce(
      new S3ServiceException({
        name: "NoSuchKey",
        $fault: "client",
        $metadata: { httpStatusCode: 404 },
      }),
    );

    await expect(
      downloadProjectFile({ ...scope, storageKey }),
    ).rejects.toMatchObject({
      name: "ProjectFileStorageError",
      code: "NOT_FOUND",
    });
  });

  it("rejects keys outside the requested project without contacting MinIO", async () => {
    await expect(
      deleteProjectFile({
        ...scope,
        storageKey: storageKey.replace(scope.projectId, "not-the-project"),
      }),
    ).rejects.toThrow(TypeError);

    expect(send).not.toHaveBeenCalled();
  });

  it("wraps MinIO failures with a stable service error", async () => {
    send.mockRejectedValueOnce(new Error("network unavailable"));

    await expect(
      deleteProjectFile({ ...scope, storageKey }),
    ).rejects.toMatchObject({
      name: "ProjectFileStorageError",
      code: "STORAGE_FAILURE",
    } satisfies { name: string; code: string });
  });
});
