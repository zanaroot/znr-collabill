"server only";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";
import { wrapRepositoryWithSentry } from "../utils/wrap-with-sentry/wrap-repository-with-sentry";

export const createPasswordResetToken = async (data: {
  userId: string;
  token: string;
  expiresAt: Date;
}) => {
  const [record] = await db
    .insert(passwordResetTokens)
    .values(data)
    .returning();
  return record;
};

export const findValidResetToken = async (token: string) => {
  const [result] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return result ?? null;
};

export const deleteResetTokenById = async (id: string) => {
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, id));
};

export const passwordResetRepository = {
  createPasswordResetToken,
  findValidResetToken,
  deleteResetTokenById,
};

export const passwordResetRepositoryWithSentry = wrapRepositoryWithSentry(
  passwordResetRepository as Record<
    string,
    (...args: unknown[]) => Promise<unknown>
  >,
  "password-reset-repository",
) as typeof passwordResetRepository;
