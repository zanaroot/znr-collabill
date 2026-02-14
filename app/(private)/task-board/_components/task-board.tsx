"use client";

import { Select, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useProjects } from "@/app/(private)/projects/_hooks/use-projects";
import { useTasks } from "../_hooks/use-tasks";
import { CreateBoard } from "./create-board";

const { Title, Text } = Typography;

type TaskBoardProps = {
  currentUserId?: string;
};

export function TaskBoard({ currentUserId }: TaskBoardProps) {
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const [projectId, setProjectId] = useState<string | undefined>();
  const { data: tasks, isLoading: isLoadingTasks } = useTasks(projectId);
  const taskCount = tasks?.length ?? 0;
  const selectedProject = useMemo(
    () => projects?.find((project) => project.id === projectId),
    [projects, projectId],
  );

  useEffect(() => {
    if (!projectId && projects?.length) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Task Board
            </Title>
            <Text type="secondary">
              Track work by status and move cards across columns.
            </Text>
          </div>

          {isLoadingProjects ? (
            <Spin />
          ) : projects?.length ? (
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <Text type="secondary">Project</Text>
              <Select
                value={projectId}
                onChange={(value) => setProjectId(value)}
                options={projects.map((project) => ({
                  label: project.name,
                  value: project.id,
                }))}
                style={{ minWidth: 260 }}
                size="large"
              />
            </div>
          ) : (
            <Text type="secondary">No projects yet</Text>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            {selectedProject?.name ?? "No project selected"}
          </span>
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
          projectName={selectedProject?.name}
          isProjectOwner={selectedProject?.createdBy === currentUserId}
        />
      )}
    </div>
  );
}
