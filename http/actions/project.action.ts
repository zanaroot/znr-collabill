"use server";

import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/http/models/auth.model";
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/http/models/project.model";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/http/models/project.model";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import { getCurrentUser } from "./get-current-user";

export const createProjectAction = async (
  input: CreateProjectInput,
): Promise<ActionResponse & { data?: Project }> => {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized", success: false };

    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const project = await projectRepository.createProject({
      ...parsed.data,
      createdBy: user.id,
    });

    revalidatePath("/projects");
    return { success: true, data: project };
  } catch (error) {
    console.error("Create project error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const updateProjectAction = async (
  id: string,
  input: UpdateProjectInput,
): Promise<ActionResponse & { data?: Project }> => {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized", success: false };

    const isMember = await projectRepository.isProjectMember(id, user.id);
    if (!isMember) return { error: "Unauthorized", success: false };

    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const project = await projectRepository.updateProject(id, parsed.data);

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);

    return { success: true, data: project };
  } catch (error) {
    console.error("Update project error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const deleteProjectAction = async (
  id: string,
): Promise<ActionResponse> => {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized", success: false };

    const project = await projectRepository.findProjectById(id);
    if (!project) return { error: "Project not found", success: false };

    if (project.createdBy !== user.id) {
      return {
        error: "Only the creator can delete the project",
        success: false,
      };
    }

    const taskCount = await taskRepository.countTasksByProjectId(id);
    if (taskCount > 0) {
      return {
        error: "Project has tasks. Complete or reassign them before deleting.",
        success: false,
      };
    }

    await projectRepository.deleteProject(id);

    revalidatePath("/projects");
    return { success: true, message: "Project deleted successfully" };
  } catch (error) {
    console.error("Delete project error:", error);
    return { error: "Something went wrong", success: false };
  }
};
