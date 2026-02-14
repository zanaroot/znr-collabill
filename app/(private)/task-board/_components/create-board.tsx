"use client";

import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { type DragEvent, type MouseEvent, useMemo, useState } from "react";
import type { Task as TaskModel } from "@/http/models/task.model";
import { TASK_SIZES, type TaskSize } from "@/lib/task-size";
import { TASK_STATUSES, type TaskStatus } from "@/lib/task-status";
import {
  canDeleteTaskByStatus,
  canTransitionTaskStatus,
  getAllowedTaskTransitions,
} from "@/lib/task-workflow";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "../_hooks/use-tasks";

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

type PriorityLabel =
  | "Urgent & Important"
  | "Urgent"
  | "Important"
  | "Low priority";
const PRIORITY_LABELS: PriorityLabel[] = [
  "Urgent & Important",
  "Urgent",
  "Important",
  "Low priority",
];
const PRIORITY_VALUE: Record<PriorityLabel, number> = {
  "Urgent & Important": 1,
  Urgent: 2,
  Important: 3,
  "Low priority": 4,
};
const PRIORITY_LABEL_FROM_VALUE = (value?: number | null): PriorityLabel => {
  if (value === 1) return "Urgent & Important";
  if (value === 2) return "Urgent";
  if (value === 3) return "Important";
  return "Low priority";
};

const defaultFormValues = (status: TaskStatus) => ({
  title: "",
  description: "",
  size: "M" as TaskSize,
  priorityLabel: "Low priority" as PriorityLabel,
  dueDate: "",
  status,
});

const TASK_SIZE_OPTIONS = TASK_SIZES.map((size) => ({
  label: size.toLowerCase(),
  value: size,
}));

type TaskFormValues = ReturnType<typeof defaultFormValues>;
type BoardView = "ACTIVE" | "INACTIVE";

const BOARD_VIEW_STATUSES: Record<BoardView, TaskStatus[]> = {
  ACTIVE: ["TODO", "IN_PROGRESS", "IN_REVIEW", "VALIDATED"],
  INACTIVE: ["TODO", "BLOCKED", "TRASH"],
};

type CreateBoardProps = {
  tasks: TaskModel[];
  projectId?: string;
  projectName?: string;
  isProjectOwner: boolean;
};

export function CreateBoard({
  tasks,
  projectId,
  projectName,
  isProjectOwner,
}: CreateBoardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskModel | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [boardView, setBoardView] = useState<BoardView>("ACTIVE");
  const [formValues, setFormValues] = useState<TaskFormValues>(() =>
    defaultFormValues("TODO"),
  );

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const isSaving = createTaskMutation.isPending || updateTaskMutation.isPending;
  const isDeleting = deleteTaskMutation.isPending;
  const canDeleteActiveTask = activeTask
    ? canDeleteTaskByStatus(activeTask.status)
    : false;
  const activeTaskTransitions = activeTask
    ? getAllowedTaskTransitions({
        from: activeTask.status,
        isProjectOwner,
      })
    : [];

  const tasksByStatus = useMemo(() => {
    return BOARD_VIEW_STATUSES[boardView].map((status) => ({
      status,
      tasks: tasks.filter((task) => task.status === status),
    }));
  }, [boardView, tasks]);

  const openCreateDrawer = (status: TaskStatus) => {
    setActiveTask(null);
    setFormValues(defaultFormValues(status));
    setDrawerOpen(true);
  };

  const openEditDrawer = (task: TaskModel) => {
    setActiveTask(task);
    setFormValues({
      title: task.title,
      description: task.description ?? "",
      size: task.size,
      priorityLabel: PRIORITY_LABEL_FROM_VALUE(task.priority),
      dueDate: task.dueDate ?? "",
      status: task.status,
    });
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setActiveTask(null);
  };

  const handleSave = () => {
    if (!formValues.title.trim()) return;

    if (
      activeTask &&
      activeTask.status !== formValues.status &&
      !canTransitionTaskStatus({
        from: activeTask.status,
        to: formValues.status,
        isProjectOwner,
      })
    ) {
      return;
    }

    const payload = {
      title: formValues.title,
      description: formValues.description || undefined,
      size: formValues.size,
      priority: PRIORITY_VALUE[formValues.priorityLabel],
      dueDate: formValues.dueDate || undefined,
      status: formValues.status,
    };

    if (activeTask) {
      updateTaskMutation.mutate(
        { id: activeTask.id, data: payload },
        { onSuccess: handleClose },
      );
    } else if (projectId) {
      createTaskMutation.mutate(
        { ...payload, projectId },
        { onSuccess: handleClose },
      );
    }
  };

  const handleDelete = () => {
    if (!activeTask || !projectId) return;

    deleteTaskMutation.mutate(
      { id: activeTask.id, projectId },
      { onSuccess: handleClose },
    );
  };

  const handleDragStartTask = (taskId: string) => {
    setDraggingTaskId(taskId);
  };

  const handleDragEndTask = () => {
    setDraggingTaskId(null);
  };

  const handleDropTask = (taskId: string, status: TaskStatus) => {
    if (!projectId || isSaving) return;

    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) {
      setDraggingTaskId(null);
      return;
    }

    const canTransition = canTransitionTaskStatus({
      from: task.status,
      to: status,
      isProjectOwner,
    });

    if (!canTransition) {
      setDraggingTaskId(null);
      return;
    }

    updateTaskMutation.mutate(
      {
        id: task.id,
        data: { status },
      },
      {
        onSettled: () => {
          setDraggingTaskId(null);
        },
      },
    );
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        <Segmented
          options={[
            { label: "Active view", value: "ACTIVE" },
            { label: "Inactive view", value: "INACTIVE" },
          ]}
          value={boardView}
          onChange={(value) => setBoardView(value as BoardView)}
        />
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {tasksByStatus.map(({ status, tasks: columnTasks }) => (
            <div key={status} className="w-[320px] shrink-0">
              <Column
                status={status}
                tasks={columnTasks}
                onAdd={() => openCreateDrawer(status)}
                onEdit={openEditDrawer}
                projectId={projectId}
                draggingTaskId={draggingTaskId}
                isDropDisabled={!projectId || isSaving}
                draggingTask={tasks.find((task) => task.id === draggingTaskId)}
                canMoveToStatus={(from, to) =>
                  canTransitionTaskStatus({
                    from,
                    to,
                    isProjectOwner,
                  })
                }
                canDragFromStatus={(status) =>
                  getAllowedTaskTransitions({
                    from: status,
                    isProjectOwner,
                  }).length > 0
                }
                onDragStartTask={handleDragStartTask}
                onDragEndTask={handleDragEndTask}
                onDropTask={handleDropTask}
              />
            </div>
          ))}
        </div>
      </div>

      <Drawer
        title={activeTask ? "Edit task" : "Create task"}
        placement="right"
        open={drawerOpen}
        onClose={handleClose}
        size="large"
        extra={
          <Space>
            {activeTask && canDeleteActiveTask && (
              <Button
                danger
                onClick={handleDelete}
                loading={isDeleting}
                disabled={isDeleting}
              >
                Delete
              </Button>
            )}
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={isSaving}
              disabled={isSaving}
            >
              {activeTask ? "Save" : "Create"}
            </Button>
          </Space>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Project context
            </Text>
            <div className="mt-1 flex items-center justify-between gap-3">
              <Text strong style={{ fontSize: 16 }}>
                {projectName ?? "Select a project"}
              </Text>
              <Text type="secondary">
                {activeTask ? "Editing task" : "New task"}
              </Text>
            </div>
          </div>

          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                <Text strong>Task title</Text>
                <Input
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="What needs to be done?"
                  size="large"
                />
              </Space>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                <Text strong>Description</Text>
                <TextArea
                  value={formValues.description}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Add implementation details, notes, or links"
                />
              </Space>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Space
                  orientation="vertical"
                  size={8}
                  style={{ width: "100%" }}
                >
                  <Text strong>Due date</Text>
                  <Input
                    type="date"
                    value={formValues.dueDate ?? ""}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        dueDate: event.target.value || "",
                      }))
                    }
                  />
                </Space>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Space
                  orientation="vertical"
                  size={8}
                  style={{ width: "100%" }}
                >
                  <Text strong>Status</Text>
                  <Select
                    value={formValues.status}
                    onChange={(value) =>
                      setFormValues((prev) => ({
                        ...prev,
                        status: value,
                      }))
                    }
                    options={TASK_STATUSES.filter((status) => {
                      if (!activeTask) return true;
                      return (
                        status === activeTask.status ||
                        activeTaskTransitions.includes(status)
                      );
                    }).map((status) => ({
                      label: formatStatus(status),
                      value: status,
                    }))}
                    disabled={
                      Boolean(activeTask) && activeTaskTransitions.length === 0
                    }
                    style={{ width: "100%" }}
                  />
                </Space>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                <Space
                  orientation="vertical"
                  size={8}
                  style={{ width: "100%" }}
                >
                  <Text strong>Priority</Text>
                  <Segmented
                    options={PRIORITY_LABELS}
                    value={formValues.priorityLabel}
                    onChange={(value) =>
                      setFormValues((prev) => ({
                        ...prev,
                        priorityLabel: value as PriorityLabel,
                      }))
                    }
                    block
                  />
                </Space>

                <Space
                  orientation="vertical"
                  size={8}
                  style={{ width: "100%" }}
                >
                  <Text strong>Size</Text>
                  <Segmented
                    options={TASK_SIZE_OPTIONS}
                    value={formValues.size}
                    onChange={(value) =>
                      setFormValues((prev) => ({
                        ...prev,
                        size: value as TaskSize,
                      }))
                    }
                    block
                  />
                </Space>
              </Space>
            </div>
          </Space>
        </div>
      </Drawer>
    </>
  );
}

type ColumnProps = {
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
};

function Column({
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
            disabled={!projectId}
          />
        }
        style={{
          minHeight: 640,
          borderColor: isDragOver ? "#1677ff" : undefined,
          background: isDragOver ? "#f0f7ff" : undefined,
          transition: "border-color 0.2s ease, background-color 0.2s ease",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tasks.map((task) => (
              <Card
                key={task.id}
                size="small"
                type="inner"
                style={{
                  borderRadius: 10,
                  cursor: canDragFromStatus(task.status) ? "grab" : "pointer",
                  opacity: draggingTaskId === task.id ? 0.6 : 1,
                  borderColor: "#e2e8f0",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
                }}
                onClick={() => onEdit(task)}
                draggable={Boolean(projectId) && canDragFromStatus(task.status)}
                onDragStart={(event) => {
                  if (!canDragFromStatus(task.status)) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.setData("text/plain", task.id);
                  onDragStartTask(task.id);
                }}
                onDragEnd={() => {
                  setIsDragOver(false);
                  onDragEndTask();
                }}
              >
                <div className="flex h-36 flex-col">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <Text strong>{task.title}</Text>
                    <Tag color={priorityTagColor(task.priority)}>
                      {priorityLabelFromValue(task.priority)}
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
                  </div>
                </div>
              </Card>
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

function priorityLabelFromValue(value?: number | null): PriorityLabel {
  return PRIORITY_LABEL_FROM_VALUE(value);
}

function formatStatus(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return "Todo";
    case "IN_PROGRESS":
      return "In progress";
    case "IN_REVIEW":
      return "In review";
    case "VALIDATED":
      return "Validated";
    case "BLOCKED":
      return "Blocked";
    case "TRASH":
      return "Trash";
    default:
      return status;
  }
}

function formatDueDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function priorityTagColor(value?: number | null) {
  const label = priorityLabelFromValue(value);

  if (label === "Urgent & Important") return "red";
  if (label === "Urgent") return "volcano";
  if (label === "Important") return "gold";
  return "default";
}

function statusTagColor(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return "default";
    case "IN_PROGRESS":
      return "blue";
    case "IN_REVIEW":
      return "purple";
    case "VALIDATED":
      return "green";
    case "BLOCKED":
      return "orange";
    case "TRASH":
      return "red";
    default:
      return "default";
  }
}
