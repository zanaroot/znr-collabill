import {
  claimJobRun,
  completeJobRun,
  failJobRun,
} from "@/http/repositories/job-run.repository";
import {
  findSurvivingContentsMentioningKeys,
  findTaskIdAndDescriptionByStatus,
  purgeTasksByIds,
} from "@/http/repositories/task.repository";
import { logError } from "@/lib/sentry";
import {
  collectStorageKeysFromDescriptions,
  getCleanupPeriodKeys,
  selectDeletableKeys,
  selectReferencedKeys,
  TASK_CLEANUP_JOB,
} from "@/lib/task-cleanup";
import { serverEnv } from "@/packages/env/server";
import { deleteFile } from "@/packages/minio";

const LOG_PREFIX = "[TaskCleanup]";
const TICK_INTERVAL_MS = 60 * 60 * 1000;

let cleanupInFlight = false;

const runCleanupForPeriod = async (period: string): Promise<void> => {
  const claim = await claimJobRun(TASK_CLEANUP_JOB, period);
  if (!claim) {
    console.log(
      `${LOG_PREFIX} ${period}: already completed or in progress, skipping`,
    );
    return;
  }

  try {
    const trashedTasks = await findTaskIdAndDescriptionByStatus("TRASH");
    const taskIds = trashedTasks.map((task) => task.id);
    const candidateKeys = collectStorageKeysFromDescriptions(
      trashedTasks.map((task) => task.description),
      serverEnv.S3_BUCKET,
    );

    let filesDeleted = 0;

    if (taskIds.length > 0 && candidateKeys.length > 0) {
      const survivingContents = await findSurvivingContentsMentioningKeys(
        candidateKeys,
        taskIds,
      );
      const referencedKeys = selectReferencedKeys(
        candidateKeys,
        survivingContents,
      );
      const deletableKeys = selectDeletableKeys(candidateKeys, referencedKeys);

      for (const key of deletableKeys) {
        await deleteFile(key);
        filesDeleted += 1;
      }

      if (referencedKeys.length > 0) {
        console.log(
          `${LOG_PREFIX} ${period}: kept ${referencedKeys.length} file(s) still referenced by surviving content`,
        );
      }
    }

    const tasksDeleted = await purgeTasksByIds(taskIds);
    await completeJobRun(claim.id, { tasksDeleted, filesDeleted });

    console.log(
      `${LOG_PREFIX} ${period}: complete — deleted ${tasksDeleted} task(s) and ${filesDeleted} file(s)`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} ${period}: failed — ${message}`, error);
    logError(error, { job: TASK_CLEANUP_JOB, period });

    await failJobRun(claim.id, message).catch((failError) => {
      console.error(
        `${LOG_PREFIX} ${period}: failed to record job failure:`,
        failError,
      );
      logError(failError, { job: TASK_CLEANUP_JOB, period, phase: "fail" });
    });
  }
};

const runMonthlyTaskCleanup = async (): Promise<void> => {
  if (cleanupInFlight) {
    console.log(`${LOG_PREFIX} skipped: previous run still in progress`);
    return;
  }

  cleanupInFlight = true;
  try {
    const periods = getCleanupPeriodKeys(new Date());
    for (const period of periods) {
      await runCleanupForPeriod(period);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX}: unexpected error`, error);
    logError(error, { job: TASK_CLEANUP_JOB });
  } finally {
    cleanupInFlight = false;
  }
};

declare global {
  var taskCleanupSchedulerInterval: ReturnType<typeof setInterval> | undefined;
}

export const startTaskCleanupScheduler = (): void => {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  if (globalThis.taskCleanupSchedulerInterval) {
    return;
  }

  const tick = (): void => {
    void runMonthlyTaskCleanup();
  };

  tick();

  const interval = setInterval(tick, TICK_INTERVAL_MS);
  if (typeof interval === "object" && typeof interval.unref === "function") {
    interval.unref();
  }
  globalThis.taskCleanupSchedulerInterval = interval;

  console.log(`${LOG_PREFIX} scheduler started (hourly tick)`);
};
