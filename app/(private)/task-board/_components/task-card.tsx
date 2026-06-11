"use client";

import { CalendarOutlined, FileImageOutlined } from "@ant-design/icons";
import { Card, Modal, Tag, Tooltip, Typography } from "antd";
import { useMemo, useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { TaskSizeTag } from "@/app/_components/task-size-tag";
import { cn } from "@/app/_utils/class-name";
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

  const assignee = useMemo(
    () =>
      task.assignedTo ? members.find((m) => m.id === task.assignedTo) : null,
    [task.assignedTo, members],
  );

  const descriptionImages = useMemo(() => {
    if (typeof window === "undefined" || !task.description) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(task.description, "text/html");
      return Array.from(doc.querySelectorAll("img")).map((img) => img.src);
    } catch {
      return [];
    }
  }, [task.description]);

  return (
    <>
      <Card
        size="small"
        hoverable
        className={cn(
          "transition-all duration-200 border-border hover:shadow-md",
          isDragging ? "opacity-50 grayscale-[0.5]" : "opacity-100",
        )}
        style={{
          borderRadius: 12,
          cursor: canDrag ? "grab" : "pointer",
        }}
        styles={{
          body: { padding: "12px" },
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
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <Text
              strong
              className="line-clamp-2 flex-1 text-[14px] leading-snug"
            >
              {task.title}
            </Text>
            <Tag
              color={priorityTagColor(task.priority)}
              className="m-0 border-none px-2 py-0 text-[10px] font-bold tracking-wider"
              style={{ height: "fit-content", borderRadius: "4px" }}
            >
              {getPriorityLabel(task.priority).split(" ")[0]}
            </Tag>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-y-3 mt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <TaskSizeTag size={task.size} />

              {task.dueDate && (
                <Tag
                  icon={<CalendarOutlined className="text-[10px]" />}
                  className="m-0 flex items-center gap-1 border-none bg-blue-50 text-blue-600 px-2 py-0.5 text-[11px]"
                  style={{ borderRadius: "4px" }}
                >
                  {formatDueDate(task.dueDate)}
                </Tag>
              )}

              {descriptionImages.length > 0 && (
                <Tooltip
                  title={`${descriptionImages.length} image${descriptionImages.length > 1 ? "s" : ""} in description`}
                >
                  <Tag
                    icon={<FileImageOutlined className="text-[10px]" />}
                    className="m-0 flex items-center gap-1 cursor-pointer border-none bg-orange-50 text-orange-600 px-2 py-0.5 text-[11px]"
                    style={{ borderRadius: "4px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageModalUrl(descriptionImages[0]);
                    }}
                  >
                    {descriptionImages.length}
                  </Tag>
                </Tooltip>
              )}
            </div>

            {assignee && (
              <div className="shrink-0 ml-auto">
                <AvatarProfile
                  size={24}
                  src={assignee.avatar}
                  userName={assignee.name}
                  userEmail={assignee.email}
                  className="border border-white ring-1 ring-slate-100"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
      <Modal
        open={!!imageModalUrl}
        onCancel={() => setImageModalUrl("")}
        footer={null}
        width={800}
        centered
        destroyOnClose
      >
        <div className="mt-4 flex flex-col gap-4">
          {/* biome-ignore lint/performance/noImgElement: External dynamic image */}
          <img
            src={imageModalUrl}
            alt="Task description preview"
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          />
          {descriptionImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {descriptionImages.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  className={cn(
                    "w-16 h-16 shrink-0 overflow-hidden rounded-md cursor-pointer border-2 transition-all p-0",
                    imageModalUrl === src
                      ? "border-blue-500 scale-105"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                  onClick={() => setImageModalUrl(src)}
                >
                  {/* biome-ignore lint/performance/noImgElement: External dynamic image */}
                  <img
                    key={src}
                    src={src}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
