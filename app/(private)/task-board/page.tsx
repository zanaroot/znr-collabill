// import * as Sentry from "@sentry/nextjs";
import { Suspense } from "react";
// import { TaskErrorBoundary } from "@/app/(private)/task-board/_components/TaskErrorBoundary";
import { TaskBoard } from "@/app/(private)/task-board/_components/task-board";

const TaskBoardPage = async () => {
  return (
    <div className="p-6">
      <Suspense fallback={<div />}>
        <TaskBoard />
      </Suspense>
    </div>
  );
};

export default TaskBoardPage;
