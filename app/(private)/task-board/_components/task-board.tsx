"use client";

import { Select, Spin, Typography } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useEffect, useMemo } from "react";
import { useLastProject } from "@/app/(private)/_providers/last-projects-providers";
// import TestSentry from "@/app/_components/test-sentry";
import {
  useProjectMembers,
  useProjects,
} from "@/app/(private)/projects/_hooks/use-projects";
import { useCurrentUser } from "@/app/(private)/team-management/_hooks/use-team";
import { lastProjectKey } from "@/http/ressources/keys";
import { useTasks } from "../_hooks/use-tasks";
import { CreateBoard } from "./board";

const { Title, Text } = Typography;

export const TaskBoard = () => {
  const { data: currentUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { setLastProjectId } = useLastProject();

  const { data: projects, isLoading: isLoadingProjects } = useProjects();

  const rawProjectId = searchParams.get("projectId") ?? undefined;
  const taskId = searchParams.get("taskId") ?? undefined;

  const resolvedProjectId = useMemo(() => {
    if (!projects?.length) return undefined;

    if (rawProjectId && projects.some((p) => p.id === rawProjectId)) {
      return rawProjectId;
    }

    if (typeof window === "undefined") return undefined;

    const last = localStorage.getItem(
      lastProjectKey(currentUser?.id ?? "", currentUser?.organizationId ?? ""),
    );

    if (last && projects.some((p) => p.id === last)) {
      return last;
    }

    return projects[0]?.id;
  }, [projects, rawProjectId, currentUser?.id, currentUser?.organizationId]);

  useEffect(() => {
    if (
      !isLoadingProjects &&
      projects?.length &&
      resolvedProjectId &&
      resolvedProjectId !== rawProjectId
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", resolvedProjectId);

      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [
    resolvedProjectId,
    rawProjectId,
    isLoadingProjects,
    projects,
    router,
    pathname,
    searchParams,
  ]);

  const { data: tasks, isLoading: isLoadingTasks } =
    useTasks(resolvedProjectId);

  const { data: projectMembers, isLoading: isLoadingMembers } =
    useProjectMembers(resolvedProjectId ?? "");

  const taskCount =
    tasks?.filter(
      (task) => task.status !== "ARCHIVED" && task.status !== "TRASH",
    ).length ?? 0;

  const selectedProject = useMemo(
    () => projects?.find((p) => p.id === resolvedProjectId),
    [projects, resolvedProjectId],
  );

  const userRole = currentUser?.organizationRole ?? undefined;

  const userProjectRole = useMemo(() => {
    if (!currentUser?.id || !projectMembers) return undefined;

    return projectMembers.find((m) => m.id === currentUser.id)?.projectRole;
  }, [currentUser?.id, projectMembers]);

  const handleProjectChange = (value: string) => {
    setLastProjectId(value);

    localStorage.setItem(
      lastProjectKey(currentUser?.id ?? "", currentUser?.organizationId ?? ""),
      value,
    );

    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", value);

    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="responsive-task-board h-full min-h-0">
      <div className="task-board-header shrink-0">
        <div className="task-board-title-section">
          <Title level={3} style={{ margin: 0 }} className="dark:text-white">
            Task Board
          </Title>
          <Text type="secondary" className="dark:text-gray-400">
            Track work by status and move cards across columns.
          </Text>
        </div>

        <div className="task-board-project-selector">
          {isLoadingProjects ? (
            <Spin />
          ) : projects?.length ? (
            <div className="project-selector-row">
              <Text type="secondary" className="project-label">
                Project
              </Text>

              <Select
                value={resolvedProjectId}
                onChange={handleProjectChange}
                options={projects.map((project) => ({
                  label: project.name,
                  value: project.id,
                }))}
                className="project-select"
                popupMatchSelectWidth={false}
              />
            </div>
          ) : null}
        </div>

        <div className="task-board-tags">
          <span className="task-tag">
            {selectedProject?.name ?? "No project selected"}
          </span>
          <span className="task-tag">{taskCount} tasks</span>
        </div>
      </div>

      {isLoadingTasks || isLoadingMembers ? (
        <div className="flex-1 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : (
        <CreateBoard
          tasks={tasks ?? []}
          projectId={resolvedProjectId}
          projectName={selectedProject?.name}
          userRole={userRole}
          userId={currentUser?.id}
          isAdmin={
            currentUser?.organizationRole === "ADMIN" ||
            currentUser?.organizationRole === "OWNER"
          }
          projectRole={userProjectRole}
          members={
            projectMembers?.map((user) => ({
              id: user.id,
              name: user.name || user.email,
              avatar: user.avatar,
              email: user.email,
              role: user.role,
            })) ?? []
          }
          taskId={taskId}
          projects={projects ?? []}
        />
      )}
    </div>
  );
};
