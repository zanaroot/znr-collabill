"use client";

import { Button, Drawer, Flex, Typography } from "antd";
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
          <Flex vertical>
            <Typography.Title level={2} className="m-0!">
              {activeTask.title}
            </Typography.Title>
            <Text strong type="secondary">
              {projectName ?? "Select a project"}
            </Text>
          </Flex>
        ) : (
          "Create task"
        )
      }
      closable={{ placement: "end" }}
      open={open}
      onClose={handleClose}
      size={!isEditing ? "70%" : "32%"}
      extra={
        <div className="task-drawer-footer">
          {!isEditing && canShowEditButton && (
            <Button type="primary" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}

          {isEditing && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
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
                {activeTask ? "Save" : "Create"}
              </Button>
            </div>
          )}
        </div>
      }
      className="task-drawer"
      styles={{
        body: { padding: 16 },
        header: { padding: "12px 16px" },
      }}
    >
      <Flex vertical justify="space-between" gap={20} className="min-h-full">
        <TaskForm
          formValues={formValues}
          onFormValuesChange={onFormValuesChange}
          isEditing={isEditing}
          members={members}
          projectId={activeTask?.projectId || projectId}
          taskId={activeTask?.id}
          projectGitBranches={projectGitBranches}
          userRole={userRole}
          projectRole={projectRole}
        />

        {activeTask && <TaskComments taskId={activeTask.id} />}
      </Flex>
    </Drawer>
  );
}
