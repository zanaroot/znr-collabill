import { publicEnv } from "@/packages/env";

export const getPublicS3Endpoint = () => {
  const endpoint = publicEnv.NEXT_PUBLIC_S3_ENDPOINT;
  return endpoint.replace(/\/$/, "");
};
