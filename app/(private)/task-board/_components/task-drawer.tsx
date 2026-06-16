"use client";

import { Button, Drawer, Space, Typography } from "antd";
import type { TaskFormValues } from "@/app/_utils/priority";
import type { ProjectMemberRole } from "@/http/models/project.model";
import type { Task as TaskModel } from "@/http/models/task.model";
import type { Role } from "@/http/models/user.model";
import type { TaskMembers } from "./column";
import { TaskComments } from "./task-comments";
import { TaskForm } from "./task-form";

const { Text } = Typography;

type TaskDrawerProps = {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  formValues: TaskFormValues;
  onFormValuesChange: (values: TaskFormValues) => void;
  isSaving: boolean;
  isDeleting: boolean;
  canDelete: boolean;
  onSave: () => void;
  onDelete: () => void;
  hasPermission: boolean;
  members: TaskMembers;
  projectName?: string;
  projectId?: string;
  activeTask: TaskModel | null;
  projectGitBranches?: string[];
  userRole?: Role;
  userId?: string;
  projectRole?: ProjectMemberRole;
};

const hideEditButtonByStatus = (status: string) => {
  return status === "VALIDATED" || status === "ARCHIVED";
};

export function TaskDrawer({
  open,
  onClose,
  isEditing,
  setIsEditing,
  formValues,
  onFormValuesChange,
  isSaving,
  isDeleting,
  canDelete,
  onSave,
  onDelete,
  hasPermission,
  members,
  projectName,
  projectId,
  activeTask,
  projectGitBranches = [],
  userRole,
  userId,
  projectRole,
}: TaskDrawerProps) {
  const handleClose = () => {
    onClose();
  };

  const canEdit = hasPermission;
  const canShowEditButton =
    activeTask && canEdit && !hideEditButtonByStatus(activeTask.status);

  return (
    <Drawer
      title={
        activeTask ? (
          <div className="flex flex-col gap-0.5">
            <Typography.Title level={4} className="m-0 leading-tight">
              {activeTask.title}
            </Typography.Title>
            <Text type="secondary" className="text-xs font-medium">
              {projectName ?? "Task Details"}
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <Typography.Title level={4} className="m-0 leading-tight">
              Create Task
            </Typography.Title>
            <Text type="secondary" className="text-xs font-medium">
              {projectName ?? "New Task"}
            </Text>
          </div>
        )
      }
      closable={{ placement: "end" }}
      open={open}
      onClose={handleClose}
      size="70%"
      extra={
        <Space size={12}>
          {!isEditing && canShowEditButton && (
            <Button type="primary" onClick={() => setIsEditing(true)}>
              Edit Task
            </Button>
          )}

          {isEditing && (
            <Space size={8}>
              {activeTask && canDelete && (
                <Button danger onClick={onDelete} loading={isDeleting}>
                  Delete
                </Button>
              )}

              <Button onClick={() => setIsEditing(false)}>Cancel</Button>

              <Button
                type="primary"
                onClick={onSave}
                loading={isSaving}
                disabled={!formValues.title.trim()}
              >
                {activeTask ? "Save Changes" : "Create Task"}
              </Button>
            </Space>
          )}
        </Space>
      }
      className="task-drawer"
      styles={{
        body: { padding: "24px" },
        header: { padding: "16px 24px" },
      }}
    >
      <div className="flex flex-col gap-8 min-h-full">
        <TaskForm
          formValues={formValues}
          onFormValuesChange={onFormValuesChange}
          isEditing={isEditing}
          members={members}
          projectId={activeTask?.projectId || projectId}
          taskId={activeTask?.id}
          projectGitBranches={projectGitBranches}
          userRole={userRole}
          userId={userId}
          projectRole={projectRole}
        />

        {activeTask && (
          <div className="mt-4">
            <TaskComments taskId={activeTask.id} />
          </div>
        )}
      </div>
    </Drawer>
  );
}
