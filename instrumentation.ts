import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    if (process.env.NEXT_PHASE !== "phase-production-build") {
      const { startTaskCleanupScheduler } = await import(
        "./http/jobs/task-cleanup.job"
      );
      startTaskCleanupScheduler();
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
