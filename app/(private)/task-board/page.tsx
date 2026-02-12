import { CreateBoard } from "@/app/(private)/task-board/_components/create-board";
import { db } from "@/db";

const TaskBoardPage = async () => {
  const tasksData = await db.query.tasks.findMany();
  const tasksDataNonNull = tasksData.map((t) => ({
    ...t,
    status: t.status ?? "TODO",
  }));

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Task Board</h1>
      <CreateBoard tasks={tasksDataNonNull} />
    </div>
  );
};

export default TaskBoardPage;
