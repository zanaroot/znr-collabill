"use client";

import { Select, Spin, Typography } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useMemo } from "react";
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

  const { data: projects, isLoading: isLoadingProjects } = useProjects();

  const projectId = searchParams.get("projectId") ?? undefined;
  const taskId = searchParams.get("taskId") ?? undefined;

  const { data: tasks, isLoading: isLoadingTasks } = useTasks(projectId);

  const { data: projectMembers, isLoading: isLoadingMembers } =
    useProjectMembers(projectId ?? "");
  const taskCount = tasks?.length ?? 0;

  const selectedProject = useMemo(
    () => projects?.find((p) => p.id === projectId),
    [projects, projectId],
  );

  const userRole = currentUser?.organizationRole ?? undefined;

  const validProjectId = useMemo(() => {
    if (!projects?.length) return undefined;
    const exists = projects.some((p) => p.id === projectId);
    if (exists) return projectId;
    if (typeof window === "undefined") return undefined;
    const lastProjectId = localStorage.getItem(
      lastProjectKey(currentUser?.id ?? "", currentUser?.organizationId ?? ""),
    );
    const lastProjectExists = projects.some((p) => p.id === lastProjectId);
    if (lastProjectId && lastProjectExists) return lastProjectId;
    return projects[0].id;
  }, [projects, projectId, currentUser?.id, currentUser?.organizationId]);

  if (
    !isLoadingProjects &&
    projects?.length &&
    validProjectId &&
    validProjectId !== projectId
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", validProjectId);
  }

  const handleProjectChange = (value: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        lastProjectKey(
          currentUser?.id ?? "",
          currentUser?.organizationId ?? "",
        ),
        value,
      );
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="responsive-task-board">
      <div className="task-board-header">
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
                value={projectId}
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

        {isLoadingTasks || isLoadingMembers ? (
          <Spin />
        ) : (
          <CreateBoard
            tasks={tasks ?? []}
            projectId={projectId}
            projectName={selectedProject?.name}
            userRole={userRole}
            isAdmin={
              currentUser?.organizationRole === "ADMIN" ||
              currentUser?.organizationRole === "OWNER"
            }
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
          />
        )}
      </div>
    </div>
  );
};
