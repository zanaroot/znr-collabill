"use client";

import { Button, Drawer, Typography } from "antd";
import type { Task as TaskModel } from "@/http/models/task.model";
import type { TaskFormValues } from "@/lib/priority";
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
}: TaskDrawerProps) {
  const handleClose = () => {
    onClose();
  };

  const canEdit = hasPermission;
  const canShowEditButton = activeTask && canEdit;

  return (
    <Drawer
      title={activeTask ? "Edit task" : "Create task"}
      placement="right"
      open={open}
      onClose={handleClose}
      size={700}
      className="task-drawer"
      styles={{
        body: { padding: 16 },
        header: { padding: "12px 16px" },
      }}
      footer={
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
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-4 py-3">
          <Text
            type="secondary"
            style={{ fontSize: 12 }}
            className="dark:text-gray-400"
          >
            Project context
          </Text>
          <div className="mt-1 flex items-center justify-between gap-3">
            <Text strong style={{ fontSize: 16 }} className="dark:text-white">
              {projectName ?? "Select a project"}
            </Text>
            <Text type="secondary" className="dark:text-gray-400">
              {activeTask ? "Editing task" : "New task"}
            </Text>
          </div>
        </div>

        <TaskForm
          formValues={formValues}
          onFormValuesChange={onFormValuesChange}
          isEditing={isEditing}
          members={members}
          projectId={activeTask?.projectId || projectId}
        />

        {activeTask && <TaskComments taskId={activeTask.id} />}
      </div>
    </Drawer>
  );
}
