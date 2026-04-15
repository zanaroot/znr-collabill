"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOARD_VIEW_STATUSES,
  type BoardView,
  defaultFormValues,
  getPriorityValue,
  PRIORITY_LABEL_FROM_VALUE,
  type TaskFormValues,
} from "@/app/_utils/priority";
import {
  canDeleteTaskByStatus,
  canTransitionTaskStatus,
  getAllowedTaskTransitions,
} from "@/app/_utils/task-workflow";
import type { Task as TaskModel, TaskStatus } from "@/http/models/task.model";
import type { Role } from "@/http/models/user.model";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "../_hooks/use-tasks";

export type TaskMembers = {
  id: string;
  name: string;
  avatar: string | null;
  role?: string;
}[];

export type UseBoardOptions = {
  tasks: TaskModel[];
  projectId?: string;
  userRole?: Role;
  taskId?: string;
};

export type UseBoardReturn = {
  boardView: BoardView;
  setBoardView: (view: BoardView) => void;
  tasksByStatus: { status: TaskStatus; tasks: TaskModel[] }[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  activeTask: TaskModel | null;
  setActiveTask: (task: TaskModel | null) => void;
  formValues: TaskFormValues;
  setFormValues: (values: TaskFormValues) => void;
  isSaving: boolean;
  isDeleting: boolean;
  canDeleteActiveTask: boolean;
  draggingTaskId: string | null;
  setDraggingTaskId: (id: string | null) => void;
  hasPermission: boolean;
  canCreateTask: boolean;
  openCreateDrawer: (status: TaskStatus) => void;
  openEditDrawer: (task: TaskModel) => void;
  handleClose: () => void;
  handleSave: () => void;
  handleDelete: () => void;
  handleDragStartTask: (taskId: string) => void;
  handleDragEndTask: () => void;
  handleDropTask: (taskId: string, status: TaskStatus) => void;
};

export function useBoard({
  tasks,
  projectId,
  userRole,
  taskId,
}: UseBoardOptions): UseBoardReturn {
  const [boardView, setBoardView] = useState<BoardView>("ACTIVE");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskModel | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<TaskFormValues>(() =>
    defaultFormValues("TODO"),
  );

  useEffect(() => {
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
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
      }
    }
  }, [taskId, tasks]);

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

  const hasPermission = Boolean(
    userRole || userRole === "ADMIN" || userRole === "OWNER",
  );
  const canCreateTask = Boolean(userRole);

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
        userRole,
      })
    ) {
      return;
    }

    const payload = {
      title: formValues.title,
      description: formValues.description || undefined,
      size: formValues.size,
      priority: getPriorityValue(formValues.priorityLabel),
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
      userRole,
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

  return {
    boardView,
    setBoardView,
    tasksByStatus,
    drawerOpen,
    setDrawerOpen,
    isEditing,
    setIsEditing,
    activeTask,
    setActiveTask,
    formValues,
    setFormValues,
    isSaving,
    isDeleting,
    canDeleteActiveTask,
    draggingTaskId,
    setDraggingTaskId,
    hasPermission,
    canCreateTask,
    openCreateDrawer,
    openEditDrawer,
    handleClose,
    handleSave,
    handleDelete,
    handleDragStartTask,
    handleDragEndTask,
    handleDropTask,
  };
}

export function useCanMoveToStatus(userRole?: Role) {
  return (from: TaskStatus, to: TaskStatus) =>
    canTransitionTaskStatus({ from, to, userRole });
}

export function useCanDragFromStatus(userRole?: Role) {
  return (status: TaskStatus) =>
    getAllowedTaskTransitions({ from: status, userRole }).length > 0;
}
