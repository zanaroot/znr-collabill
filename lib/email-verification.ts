import { createHash, randomBytes } from "node:crypto";

export function generateEmailVerificationToken() {
  const token = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256").update(token).digest("hex");

  return {
    token,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
