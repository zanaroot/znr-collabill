export { s3 } from "./s3-client";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { serverEnv } from "../env/server";
import { s3 } from "./s3-client";

export const uploadFile = async (
  file: Buffer,
  key: string,
  contentType: string,
) => {
  const command = new PutObjectCommand({
    Bucket: serverEnv.S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3.send(command);

  // Return a path that can be converted to public URL later or use a consistent format
  return `/${serverEnv.S3_BUCKET}/${key}`;
};

export const deleteFile = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: serverEnv.S3_BUCKET,
    Key: key,
  });

  await s3.send(command);
};

export const getFileUrl = (path: string) => {
  if (path.startsWith("http")) return path;
  const endpoint = serverEnv.S3_ENDPOINT.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${endpoint}${normalizedPath}`;
};
