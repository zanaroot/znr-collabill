"use client";

import { Input, Segmented, Select, Space, Tag, Typography } from "antd";
import type { TaskSize } from "@/http/models/task.model";
import { TASK_SIZES, TASK_STATUSES } from "@/http/models/task.model";
import { formatDueDate } from "@/lib/date";
import {
  getPriorityTagColor,
  PRIORITY_LABELS,
  type PriorityLabel,
  type TaskFormValues,
} from "@/lib/priority";
import { formatStatus } from "@/lib/status-task";
import type { TaskMembers } from "./column";
import { InfoRow } from "./info-row";

const { Text } = Typography;

const TASK_SIZE_OPTIONS = TASK_SIZES.map((size) => ({
  label: size.toLowerCase(),
  value: size,
}));

type TaskFormProps = {
  formValues: TaskFormValues;
  onFormValuesChange: (values: TaskFormValues) => void;
  isEditing: boolean;
  members: TaskMembers;
};

export function TaskForm({
  formValues,
  onFormValuesChange,
  isEditing,
  members,
}: TaskFormProps) {
  const updateField = <K extends keyof TaskFormValues>(
    field: K,
    value: TaskFormValues[K],
  ) => {
    onFormValuesChange({ ...formValues, [field]: value });
  };

  const renderField = (
    editComponent: React.ReactNode,
    viewComponent: React.ReactNode,
  ) => (isEditing ? editComponent : viewComponent);

  const assignee = formValues.assigneeId
    ? members.find((m) => m.id === formValues.assigneeId)
    : null;

  return (
    <Space vertical size={12} style={{ width: "100%" }}>
      {renderField(
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={8} style={{ width: "100%" }}>
            <Typography.Text strong className="dark:text-white">
              Task title
            </Typography.Text>
            <Input
              value={formValues.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="What needs to be done?"
              size="large"
            />
          </Space>
        </div>,

        <InfoRow label="Task title">
          <Typography.Text strong>
            {formValues.title || "Untitled task"}
          </Typography.Text>
        </InfoRow>,
      )}

      {renderField(
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={8} style={{ width: "100%" }}>
            <Typography.Text strong>Description</Typography.Text>
            <Input.TextArea
              value={formValues.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              placeholder="Add details..."
            />
          </Space>
        </div>,

        <InfoRow label="Description">
          <Typography.Text>
            {formValues.description || "No description"}
          </Typography.Text>
        </InfoRow>,
      )}

      {renderField(
        <div className="task-form-grid">
          <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <Space vertical size={8} style={{ width: "100%" }}>
              <Typography.Text strong>Due date</Typography.Text>
              <Input
                type="date"
                value={formValues.dueDate ?? ""}
                onChange={(e) => updateField("dueDate", e.target.value || "")}
              />
            </Space>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <Space vertical size={8} style={{ width: "100%" }}>
              <Typography.Text strong>Status</Typography.Text>
              <Select
                value={formValues.status}
                onChange={(value) => updateField("status", value)}
                options={TASK_STATUSES.map((status) => ({
                  label: formatStatus(status),
                  value: status,
                }))}
                style={{ width: "100%" }}
              />
            </Space>
          </div>
        </div>,

        <>
          <InfoRow label="Due date">
            <Typography.Text>
              {formValues.dueDate
                ? formatDueDate(formValues.dueDate)
                : "No due date"}
            </Typography.Text>
          </InfoRow>

          <InfoRow label="Status">
            <Tag color="blue">{formatStatus(formValues.status)}</Tag>
          </InfoRow>
        </>,
      )}

      {renderField(
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={12} style={{ width: "100%" }}>
            <Space vertical size={8} style={{ width: "100%" }}>
              <Text strong>Priority</Text>
              <Segmented
                options={PRIORITY_LABELS}
                value={formValues.priorityLabel}
                onChange={(value) =>
                  updateField("priorityLabel", value as PriorityLabel)
                }
                block
              />
            </Space>

            <Space vertical size={8} style={{ width: "100%" }}>
              <Text strong>Size</Text>
              <Segmented
                options={TASK_SIZE_OPTIONS}
                value={formValues.size}
                onChange={(value) => updateField("size", value as TaskSize)}
                block
              />
            </Space>
          </Space>
        </div>,

        <>
          <InfoRow label="Priority">
            <Tag color={getPriorityTagColor(formValues.priorityLabel)}>
              {formValues.priorityLabel}
            </Tag>
          </InfoRow>

          <InfoRow label="Size">
            <Tag>{formValues.size}</Tag>
          </InfoRow>
        </>,
      )}

      {renderField(
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={8} style={{ width: "100%" }}>
            <Text strong>Assignee</Text>
            <Select
              value={formValues.assigneeId}
              onChange={(value) => updateField("assigneeId", value ?? null)}
              placeholder="Select a member"
              options={members.map((m) => ({
                label: m.name,
                value: m.id,
              }))}
              style={{ width: "100%" }}
              allowClear
              onClear={() => updateField("assigneeId", null)}
            />
          </Space>
        </div>,

        <InfoRow label="Assignee">
          {assignee ? (
            <div className="flex items-center gap-2">
              <Text>{assignee.name}</Text>
            </div>
          ) : (
            <Text type="secondary">Unassigned</Text>
          )}
        </InfoRow>,
      )}

      {renderField(
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={8} style={{ width: "100%" }}>
            <Text strong>Git Branch</Text>
            <Input
              value={formValues.gitBranch}
              onChange={(e) => updateField("gitBranch", e.target.value)}
              placeholder="feature/my-branch"
            />
          </Space>
        </div>,

        <InfoRow label="Git Branch">
          <Typography.Text code>{formValues.gitBranch || "—"}</Typography.Text>
        </InfoRow>,
      )}
    </Space>
  );
}
