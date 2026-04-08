"use client";

import { Segmented } from "antd";
import type { Task as TaskModel } from "@/http/models/task.model";
import {
  canTransitionTaskStatus,
  getAllowedTaskTransitions,
} from "@/lib/task-workflow";
import { useBoard } from "../_hooks/use-board";
import { Column, type TaskMembers } from "./column";
import { TaskDrawer } from "./task-drawer";

type CreateBoardProps = {
  tasks: TaskModel[];
  projectId?: string;
  projectName?: string;
  userRole?: "OWNER" | "ADMIN" | "COLLABORATOR";
  members: TaskMembers;
  isAdmin: boolean;
};

export function CreateBoard({
  tasks,
  projectId,
  projectName,
  userRole,
  members,
  isAdmin,
}: CreateBoardProps) {
  const board = useBoard({
    tasks,
    projectId,
    userRole,
  });

  const hasPermission = isAdmin || userRole === "OWNER" || userRole === "ADMIN";

  return (
    <>
      <div className="mb-3 flex items-center justify-end kanban-view-toggle">
        <Segmented
          options={[
            { label: "All", value: "ALL" },
            { label: "Active view", value: "ACTIVE" },
            { label: "Inactive view", value: "INACTIVE" },
          ]}
          value={board.boardView}
          onChange={(value) =>
            board.setBoardView(value as "ACTIVE" | "INACTIVE" | "ALL")
          }
          className="view-toggle"
        />
      </div>

      <div className="overflow-x-auto pb-2 kanban-board">
        <div className="flex min-w-max gap-4 kanban-columns">
          {board.tasksByStatus.map(({ status, tasks: columnTasks }) => (
            <div key={status} className="w-[320px] shrink-0 kanban-column">
              <Column
                status={status}
                tasks={columnTasks}
                onAdd={() => board.openCreateDrawer(status)}
                onEdit={board.openEditDrawer}
                projectId={projectId}
                draggingTaskId={board.draggingTaskId}
                isDropDisabled={!projectId || board.isSaving}
                draggingTask={tasks.find(
                  (task) => task.id === board.draggingTaskId,
                )}
                canMoveToStatus={(from, to) =>
                  canTransitionTaskStatus({
                    from,
                    to,
                    userRole,
                  })
                }
                canDragFromStatus={(status) =>
                  getAllowedTaskTransitions({
                    from: status,
                    userRole,
                  }).length > 0
                }
                onDragStartTask={board.handleDragStartTask}
                onDragEndTask={board.handleDragEndTask}
                onDropTask={board.handleDropTask}
                members={members}
                canCreateTask={hasPermission}
              />
            </div>
          ))}
        </div>
      </div>

      <TaskDrawer
        open={board.drawerOpen}
        onClose={board.handleClose}
        isEditing={board.isEditing}
        setIsEditing={board.setIsEditing}
        formValues={board.formValues}
        onFormValuesChange={board.setFormValues}
        isSaving={board.isSaving}
        isDeleting={board.isDeleting}
        canDelete={board.canDeleteActiveTask}
        onSave={board.handleSave}
        onDelete={board.handleDelete}
        hasPermission={hasPermission}
        members={members}
        projectName={projectName}
        projectId={projectId}
        activeTask={board.activeTask}
      />
    </>
  );
}
