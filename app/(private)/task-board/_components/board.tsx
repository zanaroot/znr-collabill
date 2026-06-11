"use client";

import { LockOutlined } from "@ant-design/icons";
import { Segmented } from "antd";
import { useMemo } from "react";
import {
  canTransitionTaskStatus,
  getAllowedTaskTransitions,
} from "@/app/_utils/task-workflow";
import type { ProjectMemberRole } from "@/http/models/project.model";
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
  userId?: string;
  members: TaskMembers;
  isAdmin: boolean;
  projectRole?: ProjectMemberRole;
  taskId?: string;
  projects?: Project[];
};

export function CreateBoard({
  tasks,
  projectId,
  projectName,
  userRole,
  userId,
  members,
  isAdmin,
  projectRole,
  taskId,
  projects = [],
}: CreateBoardProps) {
  const board = useBoard({
    tasks,
    projectId,
    userRole,
    userId,
    taskId,
    projectRole,
  });

  const hasPermission =
    isAdmin ||
    userRole === "OWNER" ||
    userRole === "ADMIN" ||
    projectRole === "PRODUCT_OWNER";

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
    <div className="flex flex-1 flex-col min-h-0">
      <div className="mb-3 flex items-center justify-end kanban-view-toggle shrink-0">
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

      {board.boardView !== "ARCHIVED" ? (
        <div className="flex-1 overflow-x-auto pb-4 kanban-board scrollbar-hide min-h-0">
          <div className="flex h-full min-w-max gap-6 kanban-columns px-1">
            {board.tasksByStatus.map(({ status, tasks: columnTasks }) => {
              const draggingTask = tasks.find(
                (task) => task.id === board.draggingTaskId,
              );
              return (
                <div
                  key={status}
                  className="h-full w-[320px] shrink-0 kanban-column"
                >
                  <Column
                    status={status}
                    tasks={columnTasks}
                    onAdd={() => board.openCreateDrawer(status)}
                    onEdit={board.openEditDrawer}
                    projectId={projectId}
                    draggingTaskId={board.draggingTaskId}
                    isDropDisabled={!projectId || board.isSaving}
                    draggingTask={draggingTask}
                    canMoveToStatus={(from, to) =>
                      canTransitionTaskStatus({
                        from,
                        to,
                        userRole,
                        projectRole,
                        reviewerId: draggingTask?.reviewerId ?? null,
                        userId,
                      })
                    }
                    canDragFromStatus={(status) =>
                      getAllowedTaskTransitions({
                        from: status,
                        userRole,
                        projectRole,
                        reviewerId: draggingTask?.reviewerId ?? null,
                        userId,
                      }).length > 0
                    }
                    onDragStartTask={board.handleDragStartTask}
                    onDragEndTask={board.handleDragEndTask}
                    onDropTask={board.handleDropTask}
                    members={members}
                    canCreateTask={
                      isAdmin ||
                      userRole === "OWNER" ||
                      userRole === "ADMIN" ||
                      (userRole === "COLLABORATOR" && status === "BACKLOG")
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          <ArchivedSection
            archivedTasksByProject={archivedTasksWithNames}
            members={members}
            onEditTask={board.openEditDrawer}
          />
        </div>
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
        userId={userId}
        projectRole={projectRole}
      />
    </div>
  );
}
