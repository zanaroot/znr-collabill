"use client";

import { Collapse, Tag, Typography } from "antd";
import type { Task as TaskModel } from "@/http/models/task.model";
import { TaskCard } from "./task-card";

const { Text } = Typography;

export type ArchivedTasksByProject = {
  projectId: string;
  projectName: string;
  tasks: TaskModel[];
};

export type ArchivedSectionProps = {
  archivedTasksByProject: ArchivedTasksByProject[];
  members: {
    id: string;
    name: string;
    avatar: string | null;
    email?: string;
    role?: string;
  }[];
  onEditTask: (task: TaskModel) => void;
};

export function ArchivedSection({
  archivedTasksByProject,
  members,
  onEditTask,
}: ArchivedSectionProps) {
  console.log("archivedTasksByProject", archivedTasksByProject);
  // if (archivedTasksByProject.length === 0) {
  //   return null;
  // }

  const items = archivedTasksByProject.map((project) => ({
    key: project.projectId,
    label: (
      <div className="flex items-center justify-between w-full pr-2">
        <Text strong>{project.projectName}</Text>
        <Tag color="default">{project.tasks.length}</Tag>
      </div>
    ),
    children: (
      <div className="flex flex-col gap-2">
        {project.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            members={members}
            canDrag={false}
            isDragging={false}
            onClick={() => onEditTask(task)}
            onDragStart={() => {}}
            onDragEnd={() => {}}
          />
        ))}
      </div>
    ),
  }));

  return (
    <div className="mt-6">
      <Collapse items={items} defaultActiveKey={[]} bordered={false} />
    </div>
  );
}
