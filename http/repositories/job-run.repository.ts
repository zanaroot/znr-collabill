import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobRuns } from "@/db/schema";

const STALE_RUNNING_MS = 2 * 60 * 60 * 1000;
const MAX_ERROR_LENGTH = 5000;

export const claimJobRun = async (job: string, period: string) => {
  const [inserted] = await db
    .insert(jobRuns)
    .values({ job, period, status: "RUNNING" })
    .onConflictDoNothing({ target: [jobRuns.job, jobRuns.period] })
    .returning();

  if (inserted) {
    return inserted;
  }

  const [existing] = await db
    .select()
    .from(jobRuns)
    .where(and(eq(jobRuns.job, job), eq(jobRuns.period, period)))
    .limit(1);

  if (!existing || existing.status === "SUCCEEDED") {
    return null;
  }

  const isStale =
    existing.status === "RUNNING" &&
    existing.startedAt.getTime() + STALE_RUNNING_MS < Date.now();

  if (existing.status !== "FAILED" && !isStale) {
    return null;
  }

  const [reclaimed] = await db
    .update(jobRuns)
    .set({
      status: "RUNNING",
      startedAt: new Date(),
      finishedAt: null,
      error: null,
      tasksDeleted: 0,
      filesDeleted: 0,
    })
    .where(
      and(eq(jobRuns.id, existing.id), eq(jobRuns.status, existing.status)),
    )
    .returning();

  return reclaimed ?? null;
};

export const completeJobRun = async (
  id: string,
  stats: { tasksDeleted: number; filesDeleted: number },
) => {
  await db
    .update(jobRuns)
    .set({
      status: "SUCCEEDED",
      finishedAt: new Date(),
      error: null,
      tasksDeleted: stats.tasksDeleted,
      filesDeleted: stats.filesDeleted,
    })
    .where(eq(jobRuns.id, id));
};

export const failJobRun = async (id: string, error: string) => {
  await db
    .update(jobRuns)
    .set({
      status: "FAILED",
      finishedAt: new Date(),
      error: error.slice(0, MAX_ERROR_LENGTH),
    })
    .where(eq(jobRuns.id, id));
};
