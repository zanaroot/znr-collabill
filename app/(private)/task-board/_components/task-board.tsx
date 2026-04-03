"use client";

import { Select, Spin, Typography } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useEffect, useMemo, useState } from "react";
import { useProjects } from "@/app/(private)/projects/_hooks/use-projects";
import {
  useCurrentUser,
  useUsers,
} from "@/app/(private)/team-management/_hooks/use-team";
import { useTasks } from "../_hooks/use-tasks";
import { CreateBoard } from "./create-board";

const { Title, Text } = Typography;

type TaskBoardProps = {
  currentUserId?: string;
};

export function TaskBoard({ currentUserId }: TaskBoardProps) {
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

  const { data: users } = useUsers();
  const taskCount = tasks?.length ?? 0;

  const selectedProject = useMemo(
    () => projects?.find((project) => project.id === projectId),
    [projects, projectId],
  );

  const LAST_PROJECT_KEY = "collabill_last_project_id";

  // 1. Initial sync: If no projectId or invalid projectId, try to restore from localStorage or first project
  useEffect(() => {
    if (projects?.length) {
      const projectExists = projects.some((p) => p.id === projectIdParam);
      
      if (!projectIdParam || !projectExists) {
        const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
        const lastProjectExists = projects.some((p) => p.id === lastProjectId);
        const targetId = (lastProjectId && lastProjectExists) ? lastProjectId : projects[0].id;
        
        const params = new URLSearchParams(searchParams.toString());
        params.set("projectId", targetId);
        router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, [projects, projectIdParam, pathname, router, searchParams]);

  // 2. State sync: Keep local state in sync with URL and update localStorage
  useEffect(() => {
    if (projectIdParam) {
      setProjectId(projectIdParam);
      localStorage.setItem(LAST_PROJECT_KEY, projectIdParam);
    }
  }, [projectIdParam]);

  // 3. Handle dropdown change: Update URL directly (which triggers sync effect #2)
  const handleProjectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-linear-to-r from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Title level={3} style={{ margin: 0 }} className="dark:text-white">
              Task Board
            </Title>
            <Text type="secondary" className="dark:text-gray-400">
              Track work by status and move cards across columns.
            </Text>
          </div>

          <div className="flex flex-col gap-4">
            {isLoadingProjects ? (
              <Spin />
            ) : projects?.length ? (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Text type="secondary" className="min-w-[70px]">
                  Project
                </Text>
                <Select
                  value={projectId}
                  onChange={handleProjectChange}
                  options={projects.map((project) => ({
                    label: project.name,
                    value: project.id,
                  }))}
                  style={{ minWidth: 260 }}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-gray-300">
            {selectedProject?.name ?? "No project selected"}
          </span>
          <span className="rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-gray-300">
            {taskCount} tasks
          </span>
        </div>
      </div>

      {isLoadingTasks ? (
        <Spin />
      ) : (
        <CreateBoard
          tasks={tasks ?? []}
          projectId={projectId}
          projectName={selectedProject?.name}
          isProjectOwner={selectedProject?.createdBy === currentUserId}
          isAdmin={
            currentUser?.organizationRole === "ADMIN" ||
            currentUser?.organizationRole === "OWNER"
          }
          members={
            users?.map((user) => ({
              id: user.id,
              name: user.name || user.email,
              avatar: user.avatar,
            })) ?? []
          }
        />
      )}
    </div>
  );
}
