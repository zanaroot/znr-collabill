"use server";

import { serverEnv } from "@/packages/env/server";

export const getKey = async (): Promise<Buffer> => {
  const key = serverEnv.ENCRYPTION_KEY;
  return Buffer.from(key.slice(0, 32).padEnd(32, "0"));
};
