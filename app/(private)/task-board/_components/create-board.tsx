"use client";

import { PlusOutlined } from "@ant-design/icons";
import {
  Avatar,
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
import {
  TASK_SIZES,
  TASK_STATUSES,
  type Task as TaskModel,
  type TaskSize,
  type TaskStatus,
} from "@/http/models/task.model";
import { getAvatarUrl } from "@/lib/get-avatar-url";
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
import { TaskComments } from "./task-comments";

type User = {
  id: string;
  name: string;
  avatar: string | null;
};

const { Paragraph, Text } = Typography;

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
  assigneeId: null as string | null,
  gitBranch: "",
});

const TASK_SIZE_OPTIONS = TASK_SIZES.map((size) => ({
  label: size.toLowerCase(),
  value: size,
}));

type TaskFormValues = ReturnType<typeof defaultFormValues>;
type BoardView = "ACTIVE" | "INACTIVE" | "ALL";

const BOARD_VIEW_STATUSES: Record<BoardView, TaskStatus[]> = {
  ACTIVE: ["TODO", "IN_PROGRESS", "IN_REVIEW", "VALIDATED"],
  INACTIVE: ["TODO", "BLOCKED", "TRASH"],
  ALL: ["TODO", "IN_PROGRESS", "IN_REVIEW", "VALIDATED", "BLOCKED", "TRASH"],
};

type CreateBoardProps = {
  tasks: TaskModel[];
  projectId?: string;
  projectName?: string;
  isProjectOwner: boolean;
  members: User[];
  isAdmin: boolean;
};

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-4 mb-5">
    <Text strong style={{ minWidth: 110 }}>
      {label}
    </Text>

    <div className="flex-1">{children}</div>
  </div>
);

export function CreateBoard({
  tasks,
  projectId,
  projectName,
  isProjectOwner,
  members,
  isAdmin,
}: CreateBoardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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

  const tasksByStatus = useMemo(() => {
    return BOARD_VIEW_STATUSES[boardView].map((status) => {
      return {
        status,
        tasks: tasks.filter((task) => task.status === status),
      };
    });
  }, [boardView, tasks]);

  const openCreateDrawer = (status: TaskStatus) => {
    setActiveTask(null);
    setFormValues(defaultFormValues(status));
    setDrawerOpen(true);
    setIsEditing(true);
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
      assigneeId: task.assignedTo ?? null,
      gitBranch: task.gitBranch ?? "",
    });
    setDrawerOpen(true);
    setIsEditing(false);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setActiveTask(null);
    setIsEditing(false);
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
      assignedTo: formValues.assigneeId,
      gitBranch: formValues.gitBranch || undefined,
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
      {
        id: activeTask.id,
        projectId,
      },
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

  const renderField = (
    editComponent: React.ReactNode,
    viewComponent: React.ReactNode,
  ) => (isEditing ? editComponent : viewComponent);

  return (
    <>
      <div className="mb-3 flex items-center justify-end kanban-view-toggle">
        <Segmented
          options={[
            { label: "All", value: "ALL" },
            { label: "Active view", value: "ACTIVE" },
            { label: "Inactive view", value: "INACTIVE" },
          ]}
          value={boardView}
          onChange={(value) => setBoardView(value as BoardView)}
          className="view-toggle"
        />
      </div>

      <div className="overflow-x-auto pb-2 kanban-board">
        <div className="flex min-w-max gap-4 kanban-columns">
          {tasksByStatus.map(({ status, tasks: columnTasks }) => (
            <div key={status} className="w-[320px] shrink-0 kanban-column">
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
                members={members}
                canCreateTask={isProjectOwner || isAdmin}
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
        width="100%"
        className="task-drawer"
        styles={{
          body: { padding: 16 },
          header: { padding: "12px 16px" },
        }}
        footer={
          <div className="task-drawer-footer">
            {!isEditing && activeTask && (isProjectOwner || isAdmin) && (
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
                {activeTask && canDeleteActiveTask && (
                  <Button danger onClick={handleDelete} loading={isDeleting}>
                    Delete
                  </Button>
                )}

                <Button onClick={() => setIsEditing(false)}>Cancel</Button>

                <Button type="primary" onClick={handleSave} loading={isSaving}>
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

          <Space vertical size={12} style={{ width: "100%" }}>
            {renderField(
              <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <Space vertical size={8} style={{ width: "100%" }}>
                  <Typography.Text strong className="dark:text-white">
                    Task title
                  </Typography.Text>
                  <Input
                    value={formValues.title}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
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
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
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
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          dueDate: e.target.value || "",
                        }))
                      }
                    />
                  </Space>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <Space vertical size={8} style={{ width: "100%" }}>
                    <Typography.Text strong>Status</Typography.Text>
                    <Select
                      value={formValues.status}
                      onChange={(value) =>
                        setFormValues((prev) => ({
                          ...prev,
                          status: value,
                        }))
                      }
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
                        setFormValues((prev) => ({
                          ...prev,
                          priorityLabel: value,
                        }))
                      }
                      block
                    />
                  </Space>

                  <Space vertical size={8} style={{ width: "100%" }}>
                    <Text strong>Size</Text>
                    <Segmented
                      options={TASK_SIZE_OPTIONS}
                      value={formValues.size}
                      onChange={(value) =>
                        setFormValues((prev) => ({
                          ...prev,
                          size: value,
                        }))
                      }
                      block
                    />
                  </Space>
                </Space>
              </div>,

              <>
                <InfoRow label="Priority">
                  <Tag color="volcano">
                    {convertPriorityLabelToTag(formValues.priorityLabel)}
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
                    onChange={(value) =>
                      setFormValues((prev) => ({
                        ...prev,
                        assigneeId: value ?? null,
                      }))
                    }
                    placeholder="Select a member"
                    options={members.map((m) => ({
                      label: m.name,
                      value: m.id,
                    }))}
                    style={{ width: "100%" }}
                    allowClear
                    onClear={() => {
                      setFormValues((prev) => ({
                        ...prev,
                        assigneeId: null,
                      }));
                    }}
                  />
                </Space>
              </div>,

              <InfoRow label="Assignee">
                {(() => {
                  const assignee = members.find(
                    (m) => m.id === formValues.assigneeId,
                  );

                  return assignee ? (
                    <div className="flex items-center gap-2">
                      <Text>{assignee.name}</Text>
                      <Avatar
                        size="small"
                        src={getAvatarUrl(assignee?.avatar, assignee?.name)}
                      >
                        {assignee.name?.charAt(0).toUpperCase()}
                      </Avatar>
                    </div>
                  ) : (
                    <Text type="secondary">Unassigned</Text>
                  );
                })()}
              </InfoRow>,
            )}

            {renderField(
              <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <Space vertical size={8} style={{ width: "100%" }}>
                  <Text strong>Git Branch</Text>
                  <Input
                    value={formValues.gitBranch}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        gitBranch: e.target.value,
                      }))
                    }
                    placeholder="feature/my-branch"
                  />
                </Space>
              </div>,

              <InfoRow label="Git Branch">
                <Text code>{formValues.gitBranch || "—"}</Text>
              </InfoRow>,
            )}
          </Space>

          {activeTask && <TaskComments taskId={activeTask.id} />}
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
  members: User[];
  canCreateTask: boolean;
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 500,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
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
                    {task.assignedTo &&
                      (() => {
                        const assignee = members.find(
                          (m) => m.id === task.assignedTo,
                        );
                        return (
                          <Avatar
                            size="small"
                            src={getAvatarUrl(assignee?.avatar, assignee?.name)}
                            alt={assignee?.name || "Unknown"}
                          >
                            {assignee?.name?.charAt(0).toUpperCase() || "?"}
                          </Avatar>
                        );
                      })()}
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

function convertPriorityLabelToTag(label: PriorityLabel) {
  let color: string;

  if (label === "Urgent & Important") color = "red";
  else if (label === "Urgent") color = "volcano";
  else if (label === "Important") color = "gold";
  else color = "default";

  return <Tag color={color}>{label}</Tag>;
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
