"use client";

import { Select, Spin, Typography } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useEffect, useMemo, useState } from "react";
import {
  useProjectMembers,
  useProjects,
} from "@/app/(private)/projects/_hooks/use-projects";
import { useCurrentUser } from "@/app/(private)/team-management/_hooks/use-team";
import type { Role } from "@/http/models/user.model";
import { useTasks } from "../_hooks/use-tasks";
import { CreateBoard } from "./board";

const { Title, Text } = Typography;

type TaskBoardProps = {
  currentUserId?: string;
  currentUserRole?: Role;
};

const LAST_PROJECT_KEY = "collabill_last_project_id";

export function TaskBoard({ currentUserId: _currentUserId }: TaskBoardProps) {
  const { data: currentUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectIdParam = searchParams.get("projectId");

  const { data: projects, isLoading: isLoadingProjects } = useProjects();

  const [projectId, setProjectId] = useState<string | undefined>(
    projectIdParam || undefined,
  );

  const { data: tasks, isLoading: isLoadingTasks } = useTasks(projectId);

  const { data: projectMembers, isLoading: isLoadingMembers } =
    useProjectMembers(projectId || "");
  const taskCount = tasks?.length ?? 0;

  const selectedProject = useMemo(
    () => projects?.find((project) => project.id === projectId),
    [projects, projectId],
  );

  const userRole = currentUser?.organizationRole ?? undefined;

  useEffect(() => {
    if (projects?.length) {
      const projectExists = projects.some((p) => p.id === projectIdParam);

      if (!projectIdParam || !projectExists) {
        const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
        const lastProjectExists = projects.some((p) => p.id === lastProjectId);
        const targetId =
          lastProjectId && lastProjectExists ? lastProjectId : projects[0].id;

        const params = new URLSearchParams(searchParams.toString());
        params.set("projectId", targetId);
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, [projects, projectIdParam, pathname, router, searchParams]);

  useEffect(() => {
    if (projectIdParam) {
      setProjectId(projectIdParam);
      localStorage.setItem(LAST_PROJECT_KEY, projectIdParam);
    }
  }, [projectIdParam]);

  const handleProjectChange = (value: string) => {
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
        />
      )}
    </div>
  );
}
