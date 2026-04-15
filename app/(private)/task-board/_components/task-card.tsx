"use client";

import { Card, Modal, Tag, Typography } from "antd";
import { useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { TaskSizeTag } from "@/app/_components/task-size-tag";
import { getPriorityLabel, priorityTagColor } from "@/app/_utils/priority";
import type { Task as TaskModel } from "@/http/models/task.model";
import { formatDueDate } from "@/lib/date";

const { Text } = Typography;

export type TaskCardProps = {
  task: TaskModel;
  members: {
    id: string;
    name: string;
    avatar: string | null;
    email?: string;
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
  const [imageModalUrl, setImageModalUrl] = useState("");
  const assignee = task.assignedTo
    ? members.find((m) => m.id === task.assignedTo)
    : null;

  const descriptionImages = task.description
    ? Array.from(
        new DOMParser()
          .parseFromString(task.description, "text/html")
          .querySelectorAll("img"),
      ).map((img) => img.src)
    : [];

  return (
    <>
      <Card
        size="small"
        type="inner"
        style={{
          borderRadius: 10,
          cursor: canDrag ? "grab" : "pointer",
          opacity: isDragging ? 0.6 : 1,
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
        <div className="flex max-h-36 flex-col">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Text strong>{task.title}</Text>
            <Tag color={priorityTagColor(task.priority)}>
              {getPriorityLabel(task.priority)}
            </Tag>
          </div>

          {/* <div className="min-h-0 flex-1 overflow-hidden">
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
          </div> */}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TaskSizeTag size={task.size} />
            {task.dueDate ? (
              <Tag variant="filled" color="processing">
                Due {formatDueDate(task.dueDate)}
              </Tag>
            ) : null}
            {assignee && (
              <AvatarProfile
                size="small"
                src={assignee.avatar}
                userName={assignee.name}
                userEmail={assignee.email}
              />
            )}
            {descriptionImages.length > 0 && (
              <Tag
                variant="filled"
                color="blue"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageModalUrl(descriptionImages[0]);
                }}
              >
                {descriptionImages.length} image
                {descriptionImages.length > 1 ? "s" : ""}
              </Tag>
            )}
          </div>
        </div>
      </Card>
      <Modal
        open={!!imageModalUrl}
        onCancel={() => setImageModalUrl("")}
        footer={null}
        width="90vw"
        centered
      >
        <div
          style={{
            width: "100%",
            height: "80vh",
            backgroundImage: `url(${imageModalUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </Modal>
    </>
  );
}
