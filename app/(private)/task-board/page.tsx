import { Suspense } from "react";
import { TaskBoard } from "@/app/(private)/task-board/_components/task-board";
import { getCurrentUser } from "@/http/actions/get-current-user.action";

const TaskBoardPage = async () => {
  const user = await getCurrentUser();

  return (
    <div className="p-6">
      <Suspense fallback={<div />}>
        <TaskBoard currentUserId={user?.id} />
      </Suspense>
    </div>
  );
};

export default TaskBoardPage;
