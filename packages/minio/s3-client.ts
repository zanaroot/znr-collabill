import { S3Client } from "@aws-sdk/client-s3";
import { serverEnv } from "../env/server";

export const s3 = new S3Client({
  endpoint: serverEnv.S3_ENDPOINT,
  region: serverEnv.S3_REGION,
  credentials: {
    accessKeyId: serverEnv.S3_ACCESS_KEY,
    secretAccessKey: serverEnv.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});
