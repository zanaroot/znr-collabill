import { randomBytes } from "node:crypto";

export const generateSessionToken = (): string =>
  randomBytes(32).toString("base64url");
