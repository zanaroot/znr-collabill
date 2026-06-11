"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Tag, Typography } from "antd";
import type { DragEvent, MouseEvent } from "react";
import { useState } from "react";
import { cn } from "@/app/_utils/class-name";
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
    <Card
      title={
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-2">
            <Text
              strong
              className="text-[14px] tracking-wide text-slate-600 dark:text-slate-300"
            >
              {formatStatus(status)}
            </Text>
            <Tag
              color={statusColor}
              className="m-0 border-none px-1.5 py-0 text-[11px] font-bold"
              style={{ borderRadius: "6px" }}
            >
              {tasks.length}
            </Tag>
          </div>
          <Button
            type="text"
            size="small"
            className="flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
            icon={<PlusOutlined className="text-[12px]" />}
            onClick={handlePlusClick}
            disabled={!projectId || !canCreateTask}
          />
        </div>
      }
      styles={{
        header: {
          padding: "0 16px",
          minHeight: "48px",
          borderBottom: "1px solid rgba(0,0,0,0.04)",
        },
        body: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "12px 8px",
          overflowY: "hidden",
          background: "transparent",
        },
      }}
      className={cn(
        "flex flex-col border-none shadow-sm transition-all duration-300",
        isDragOver
          ? "bg-blue-50/50 ring-2 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800/50"
          : "bg-slate-50/50 dark:bg-slate-900/20",
      )}
      style={{
        height: "100%",
        minHeight: 300,
        borderRadius: 16,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="flex flex-col gap-2 flex-1 overflow-y-auto overflow-x-hidden px-2 custom-scrollbar pb-2"
        style={{ minHeight: 0 }}
      >
        {tasks.length > 0 ? (
          tasks.map((task) => (
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
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary" className="text-xs italic">
                  {isDragOver ? "Drop task here" : "No tasks here"}
                </Text>
              }
            />
          </div>
        )}
      </div>
    </Card>
  );
}
