import { Spin } from "antd";
import { Suspense } from "react";
import { TaskBoard } from "@/app/(private)/task-board/_components/task-board";

const TaskBoardPage = async () => {
  return (
    <div className="h-full flex flex-col">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <Spin size="large" />
          </div>
        }
      >
        <TaskBoard />
      </Suspense>
    </div>
  );
};

export default TaskBoardPage;
