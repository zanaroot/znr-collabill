"use client";

import { Select, Spin, Typography } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useEffect, useMemo, useState } from "react";
import { useIterations } from "@/app/(private)/_hooks/use-iterations";
import { useProjects } from "@/app/(private)/projects/_hooks/use-projects";
import { useUsers } from "@/app/(private)/team-management/_hooks/use-team";
import { useTasks } from "../_hooks/use-tasks";
import { CreateBoard } from "./create-board";

const { Title, Text } = Typography;

type TaskBoardProps = {
  currentUserId?: string;
};

export function TaskBoard({ currentUserId }: TaskBoardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectIdParam = searchParams.get("projectId");
  const iterationIdParam = searchParams.get("iterationId");

  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: iterations, isLoading: isLoadingIterations } = useIterations();
  
  const [projectId, setProjectId] = useState<string | undefined>(
    projectIdParam || undefined,
  );
  const [iterationId, setIterationId] = useState<string | undefined>(
    iterationIdParam || undefined,
  );

  const { data: tasks, isLoading: isLoadingTasks } = useTasks(projectId, iterationId);
  const { data: users } = useUsers();
  const taskCount = tasks?.length ?? 0;
  
  const selectedProject = useMemo(
    () => projects?.find((project) => project.id === projectId),
    [projects, projectId],
  );

  const selectedIteration = useMemo(
    () => iterations?.find((it: any) => it.id === iterationId),
    [iterations, iterationId],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    if (projectId && projectIdParam !== projectId) {
      params.set("projectId", projectId);
      changed = true;
    }

    if (iterationId && iterationIdParam !== iterationId) {
      params.set("iterationId", iterationId);
      changed = true;
    } else if (!iterationId && iterationIdParam) {
      params.delete("iterationId");
      changed = true;
    }

    if (changed) {
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [projectId, iterationId, searchParams, pathname, router, projectIdParam, iterationIdParam]);

  useEffect(() => {
    if (!projectId && projects?.length && !projectIdParam) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId, projectIdParam]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Task Board
            </Title>
            <Text type="secondary">
              Track work by status and move cards across columns.
            </Text>
          </div>

          <div className="flex flex-col gap-4">
            {isLoadingProjects ? (
              <Spin />
            ) : projects?.length ? (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Text type="secondary" className="min-w-[70px]">Project</Text>
                <Select
                  value={projectId}
                  onChange={(value) => {
                    setProjectId(value);
                    setIterationId(undefined); // Reset iteration when project changes? 
                    // Actually, iterations are org-wide, so maybe not?
                  }}
                  options={projects.map((project) => ({
                    label: project.name,
                    value: project.id,
                  }))}
                  style={{ minWidth: 260 }}
                  size="large"
                />
              </div>
            ) : null}

            {isLoadingIterations ? (
              <Spin />
            ) : (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Text type="secondary" className="min-w-[70px]">Iteration</Text>
                <Select
                  value={iterationId}
                  onChange={(value) => setIterationId(value)}
                  placeholder="All Iterations"
                  allowClear
                  options={iterations?.map((it: any) => ({
                    label: `${it.name} (${it.startDate} to ${it.endDate})`,
                    value: it.id,
                  }))}
                  style={{ minWidth: 260 }}
                  size="large"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            {selectedProject?.name ?? "No project selected"}
          </span>
          {selectedIteration && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Iteration: {selectedIteration.name}
            </span>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
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
          iterationId={iterationId}
          projectName={selectedProject?.name}
          isProjectOwner={selectedProject?.createdBy === currentUserId}
          members={
            users?.map((user) => ({
              id: user.id,
              name: user.name || user.email,
            })) ?? []
          }
        />
      )}
    </div>
  );
}
