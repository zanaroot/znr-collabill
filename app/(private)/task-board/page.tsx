import { TaskBoard } from "@/app/(private)/task-board/_components/task-board";
import { getCurrentUser } from "@/http/actions/get-current-user";

const TaskBoardPage = async () => {
  const user = await getCurrentUser();

  return (
    <div className="p-6">
      <TaskBoard currentUserId={user?.id} />
    </div>
  );
};

export default TaskBoardPage;
