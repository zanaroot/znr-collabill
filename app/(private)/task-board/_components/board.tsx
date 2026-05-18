"use client";

import { LockOutlined } from "@ant-design/icons";
import { Segmented } from "antd";
import { useMemo } from "react";
import {
  canTransitionTaskStatus,
  getAllowedTaskTransitions,
} from "@/app/_utils/task-workflow";
import type { Task as TaskModel } from "@/http/models/task.model";
import type { Role } from "@/http/models/user.model";
import { useBoard } from "../_hooks/use-board";
import { ArchivedSection } from "./archived-section";
import { Column, type TaskMembers } from "./column";
import { TaskDrawer } from "./task-drawer";

type Project = {
  id: string;
  name: string;
};

type CreateBoardProps = {
  tasks: TaskModel[];
  projectId?: string;
  projectName?: string;
  userRole?: Role;
  members: TaskMembers;
  isAdmin: boolean;
  taskId?: string;
  projects?: Project[];
};

export function CreateBoard({
  tasks,
  projectId,
  projectName,
  userRole,
  members,
  isAdmin,
  taskId,
  projects = [],
}: CreateBoardProps) {
  const board = useBoard({
    tasks,
    projectId,
    userRole,
    taskId,
  });

  const hasPermission = isAdmin || userRole === "OWNER" || userRole === "ADMIN";

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const archivedTasksWithNames = useMemo(
    () =>
      board.archivedTasksByProject.map((item) => ({
        ...item,
        projectName: projectMap.get(item.projectId) || "Unknown Project",
      })),
    [board.archivedTasksByProject, projectMap],
  );

  const projectGitBranches = useMemo(() => {
    const activeProjectId = board.activeTask?.projectId ?? projectId;
    if (!activeProjectId) return [];

    return tasks
      .filter(
        (task) =>
          task.projectId === activeProjectId &&
          task.id !== board.activeTask?.id,
      )
      .map((task) => task.gitBranch)
      .filter((branch): branch is string => Boolean(branch?.trim()));
  }, [board.activeTask?.id, board.activeTask?.projectId, projectId, tasks]);

  return (
    <>
      <div className="mb-3 flex items-center justify-end kanban-view-toggle">
        <Segmented
          options={[
            { label: "All", value: "ALL" },
            { label: "Active view", value: "ACTIVE" },
            { label: "Inactive view", value: "INACTIVE" },
            { label: "Archived", value: "ARCHIVED", icon: <LockOutlined /> },
          ]}
          value={board.boardView}
          onChange={(value) =>
            board.setBoardView(
              value as "ACTIVE" | "INACTIVE" | "ALL" | "ARCHIVED",
            )
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
      {board.boardView === "ARCHIVED" && (
        <ArchivedSection
          archivedTasksByProject={archivedTasksWithNames}
          members={members}
          onEditTask={board.openEditDrawer}
        />
      )}

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
        projectGitBranches={projectGitBranches}
        userRole={userRole}
      />
    </>
  );
}
