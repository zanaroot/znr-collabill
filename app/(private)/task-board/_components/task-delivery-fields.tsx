"use client";

import {
  BranchesOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { App, Button, Input, Space, Tag, Tooltip, Typography } from "antd";
import { useState } from "react";
import type { UpdateTaskInput } from "@/http/models/task.model";
import { useUpdateTask } from "../_hooks/use-tasks";
import { InfoRow } from "./info-row";

const { Text } = Typography;

type DeliveryField = "gitBranch" | "previewLink";

type TaskDeliveryFieldsProps = {
  taskId?: string;
  gitBranch: string;
  previewLink: string;
  canEdit: boolean;
  onFieldSaved: (field: DeliveryField, value: string) => void;
};

const isValidPreviewUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export function TaskDeliveryFields({
  taskId,
  gitBranch,
  previewLink,
  canEdit,
  onFieldSaved,
}: TaskDeliveryFieldsProps) {
  const { message } = App.useApp();
  const updateTaskMutation = useUpdateTask();
  const [editingField, setEditingField] = useState<DeliveryField | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const startEditing = (field: DeliveryField) => {
    setEditingField(field);
    setDraftValue(field === "gitBranch" ? gitBranch : previewLink);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setDraftValue("");
  };

  const saveField = (field: DeliveryField) => {
    if (!taskId) return;

    const rawValue = draftValue.trim();

    if (field === "gitBranch") {
      if (rawValue.length > 255) {
        message.error("Branch name must be at most 255 characters");
        return;
      }
      if (/\s/.test(rawValue)) {
        message.error("Branch name cannot contain spaces");
        return;
      }
    }

    if (field === "previewLink" && rawValue && !isValidPreviewUrl(rawValue)) {
      message.error("Preview link must be a valid URL");
      return;
    }

    const payload: UpdateTaskInput =
      field === "gitBranch"
        ? { gitBranch: rawValue || null }
        : { previewLink: rawValue || null };

    updateTaskMutation.mutate(
      { id: taskId, data: payload },
      {
        onSuccess: (task) => {
          const savedValue = task[field] ?? "";
          onFieldSaved(field, savedValue);
          setEditingField(null);
          setDraftValue("");
          message.success(
            field === "gitBranch"
              ? "Branch name updated"
              : "Preview link updated",
          );
        },
        onError: (error) => {
          message.error(error.message);
        },
      },
    );
  };

  const renderEditor = (field: DeliveryField, placeholder: string) => (
    <Space.Compact className="w-full">
      <Input
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onPressEnter={() => saveField(field)}
        placeholder={placeholder}
        prefix={
          field === "gitBranch" ? (
            <BranchesOutlined className="text-zinc-400" />
          ) : (
            <LinkOutlined className="text-zinc-400" />
          )
        }
        autoFocus
        allowClear
      />
      <Tooltip title="Save">
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => saveField(field)}
          loading={updateTaskMutation.isPending}
          aria-label="Save"
        />
      </Tooltip>
      <Tooltip title="Cancel">
        <Button
          icon={<CloseOutlined />}
          onClick={cancelEditing}
          disabled={updateTaskMutation.isPending}
          aria-label="Cancel"
        />
      </Tooltip>
    </Space.Compact>
  );

  const renderEditButton = (field: DeliveryField) =>
    canEdit && taskId ? (
      <Tooltip
        title={field === "gitBranch" ? "Edit branch" : "Edit preview link"}
      >
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => startEditing(field)}
          aria-label={
            field === "gitBranch" ? "Edit branch name" : "Edit preview link"
          }
        />
      </Tooltip>
    ) : null;

  return (
    <>
      <InfoRow label="Git Branch" icon={<BranchesOutlined />}>
        {editingField === "gitBranch" ? (
          renderEditor("gitBranch", "feature/branch-name")
        ) : (
          <Space size={4}>
            {gitBranch ? (
              <Tag
                color="purple"
                icon={<BranchesOutlined />}
                className="m-0 break-all font-mono"
              >
                {gitBranch}
              </Tag>
            ) : (
              <Text type="secondary">—</Text>
            )}
            {renderEditButton("gitBranch")}
          </Space>
        )}
      </InfoRow>

      <InfoRow label="Preview" icon={<LinkOutlined />}>
        {editingField === "previewLink" ? (
          renderEditor("previewLink", "https://preview-link.com")
        ) : (
          <Space size={4}>
            {previewLink ? (
              <Button
                type="link"
                href={previewLink}
                target="_blank"
                rel="noopener noreferrer"
                icon={<LinkOutlined />}
                className="p-0 h-auto break-all text-left"
              >
                Visit Link
              </Button>
            ) : (
              <Text type="secondary">Not available</Text>
            )}
            {renderEditButton("previewLink")}
          </Space>
        )}
      </InfoRow>
    </>
  );
}
