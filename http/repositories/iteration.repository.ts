"server only";

import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { iterations } from "@/db/schema";
import type {
  CreateIterationInput,
  UpdateIterationInput,
} from "@/http/models/iteration.model";
import { getISODate } from "@/lib/date";

export const findIterationsByOrganizationId = async (
  organizationId: string,
) => {
  return await db
    .select()
    .from(iterations)
    .where(eq(iterations.organizationId, organizationId))
    .orderBy(desc(iterations.startDate), desc(iterations.createdAt));
};

export const findIterationById = async (id: string) => {
  const [iteration] = await db
    .select()
    .from(iterations)
    .where(eq(iterations.id, id))
    .limit(1);
  return iteration ?? null;
};

export const createIteration = async (input: CreateIterationInput) => {
  const [iteration] = await db
    .insert(iterations)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
    })
    .returning();

  return iteration;
};

export const updateIteration = async (
  id: string,
  input: UpdateIterationInput,
) => {
  const [iteration] = await db
    .update(iterations)
    .set(input)
    .where(eq(iterations.id, id))
    .returning();

  return iteration ?? null;
};

export const deleteIteration = async (id: string) => {
  const [iteration] = await db
    .delete(iterations)
    .where(eq(iterations.id, id))
    .returning();
  return iteration ?? null;
};

export const findCurrentIteration = async (organizationId: string) => {
  const [iteration] = await db
    .select()
    .from(iterations)
    .where(
      and(
        eq(iterations.organizationId, organizationId),
        eq(iterations.status, "OPEN"),
      ),
    )
    .orderBy(desc(iterations.startDate))
    .limit(1);

  return iteration ?? null;
};

export const closeStaleIterations = async () => {
  const today = getISODate();

  const result = await db
    .update(iterations)
    .set({ status: "CLOSED" })
    .where(and(eq(iterations.status, "OPEN"), lte(iterations.endDate, today)))
    .returning({ id: iterations.id });

  return {
    count: result.length,
    closedIds: result.map((it) => it.id),
  };
};
