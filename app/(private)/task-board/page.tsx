// import * as Sentry from "@sentry/nextjs";
import { Suspense } from "react";
import { SentryErrorBoundary } from "@/app/_components/sentry-error-boundary";
import { TaskBoard } from "@/app/(private)/task-board/_components/task-board";

const TaskBoardPage = async () => {
  return (
    <div className="p-6">
      <Suspense fallback={<div>Chargement...</div>}>
        <SentryErrorBoundary>
          <TaskBoard />
        </SentryErrorBoundary>
      </Suspense>
    </div>
  );
};

export default TaskBoardPage;
