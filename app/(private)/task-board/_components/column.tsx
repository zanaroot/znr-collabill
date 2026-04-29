"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Tag, Typography } from "antd";
import type { DragEvent, MouseEvent } from "react";
import { useState } from "react";
import { formatStatus, statusTagColor } from "@/app/_utils/status-task";
import type { Task as TaskModel, TaskStatus } from "@/http/models/task.model";
import { TaskCard } from "./task-card";

const { Text } = Typography;

export type TaskMembers = {
  id: string;
  name: string;
  avatar: string | null;
  email?: string;
  role?: string;
}[];

export type ColumnProps = {
  status: TaskStatus;
  tasks: TaskModel[];
  onAdd: () => void;
  onEdit: (task: TaskModel) => void;
  projectId?: string;
  draggingTaskId: string | null;
  draggingTask?: TaskModel;
  isDropDisabled: boolean;
  canMoveToStatus: (from: TaskStatus, to: TaskStatus) => boolean;
  canDragFromStatus: (status: TaskStatus) => boolean;
  onDragStartTask: (taskId: string) => void;
  onDragEndTask: () => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  members: TaskMembers;
  canCreateTask: boolean;
};

export function Column({
  status,
  tasks,
  onAdd,
  onEdit,
  projectId,
  draggingTaskId,
  draggingTask,
  isDropDisabled,
  canMoveToStatus,
  canDragFromStatus,
  onDragStartTask,
  onDragEndTask,
  onDropTask,
  members,
  canCreateTask,
}: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const canDropCurrentTask =
    draggingTask && canMoveToStatus(draggingTask.status, status);
  const isDropEnabled =
    Boolean(projectId) && !isDropDisabled && Boolean(canDropCurrentTask);
  const statusColor = statusTagColor(status);

  const handlePlusClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!projectId) return;
    onAdd();
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!isDropEnabled || !draggingTaskId) return;
    event.preventDefault();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    if (isDragOver) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    if (!isDropEnabled) return;

    const droppedTaskId =
      event.dataTransfer.getData("text/plain") || draggingTaskId;
    if (!droppedTaskId) return;

    onDropTask(droppedTaskId, status);
  };

  return (
    <div>
      <Card
        title={
          <div className="flex items-center justify-between gap-2">
            <Text strong>{formatStatus(status)}</Text>
            <Tag color={statusColor}>{tasks.length}</Tag>
          </div>
        }
        extra={
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={handlePlusClick}
            disabled={!projectId || !canCreateTask}
          />
        }
        style={{
          height: "calc(100vh - 200px)",
          minHeight: 400,
          maxHeight: "calc(100vh - 120px)",
          borderColor: isDragOver ? "#1677ff" : undefined,
          background: isDragOver ? "#f0f7ff" : undefined,
          transition: "border-color 0.2s ease, background-color 0.2s ease",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
          display: "flex",
          flexDirection: "column",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
              overflowY: "auto",
              paddingRight: 4,
              minHeight: 0,
            }}
          >
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                members={members}
                canDrag={Boolean(projectId) && canDragFromStatus(task.status)}
                isDragging={draggingTaskId === task.id}
                onClick={() => onEdit(task)}
                onDragStart={onDragStartTask}
                onDragEnd={() => {
                  setIsDragOver(false);
                  onDragEndTask();
                }}
              />
            ))}
          </div>
        ) : (
          <Empty
            description={
              isDragOver ? "Drop task here" : "No tasks in this stage"
            }
          />
        )}
      </Card>
    </div>
  );
}
