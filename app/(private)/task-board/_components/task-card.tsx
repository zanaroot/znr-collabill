"use client";

import { Avatar, Card, Tag, Typography } from "antd";
import type { Task as TaskModel } from "@/http/models/task.model";
import { formatDueDate } from "@/lib/date";
import { getAvatarUrl } from "@/lib/get-avatar-url";
import { getPriorityLabel, priorityTagColor } from "@/lib/priority";

const { Text, Paragraph } = Typography;

export type TaskCardProps = {
  task: TaskModel;
  members: {
    id: string;
    name: string;
    avatar: string | null;
    role?: string;
  }[];
  canDrag: boolean;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
};

export function TaskCard({
  task,
  members,
  canDrag,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const assignee = task.assignedTo
    ? members.find((m) => m.id === task.assignedTo)
    : null;

  return (
    <Card
      size="small"
      type="inner"
      style={{
        borderRadius: 10,
        cursor: canDrag ? "grab" : "pointer",
        opacity: isDragging ? 0.6 : 1,
        borderColor: "#e2e8f0",
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
      }}
      onClick={onClick}
      draggable={canDrag}
      onDragStart={(event) => {
        if (!canDrag) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-36 flex-col">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Text strong>{task.title}</Text>
          <Tag color={priorityTagColor(task.priority)}>
            {getPriorityLabel(task.priority)}
          </Tag>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {task.description ? (
            <Paragraph
              type="secondary"
              ellipsis={{ rows: 3 }}
              style={{ marginBottom: 0 }}
            >
              {task.description}
            </Paragraph>
          ) : (
            <Paragraph
              type="secondary"
              italic
              ellipsis={{ rows: 3 }}
              style={{ marginBottom: 0 }}
            >
              No description
            </Paragraph>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tag variant="filled" color="default">
            Size {task.size}
          </Tag>
          {task.dueDate ? (
            <Tag variant="filled" color="processing">
              Due {formatDueDate(task.dueDate)}
            </Tag>
          ) : null}
          {assignee && (
            <Avatar
              size="small"
              src={getAvatarUrl(assignee.avatar, assignee.name)}
              alt={assignee.name || "Unknown"}
            >
              {assignee.name?.charAt(0).toUpperCase() || "?"}
            </Avatar>
          )}
        </div>
      </div>
    </Card>
  );
}
