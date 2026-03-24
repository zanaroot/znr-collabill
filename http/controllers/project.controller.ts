import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/http/models/project.model";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";

const factory = createFactory<AuthEnv>();

export const getProjects = factory.createHandlers(async (c) => {
  const user = c.get("user");

  if (!user.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  const role = await projectRepository.getOrganizationRole(
    user.id,
    user.organizationId,
  );

  let projects: Awaited<
    ReturnType<typeof projectRepository.findProjectsByOrganizationId>
  >;
  if (role === "OWNER") {
    projects = await projectRepository.findProjectsByOrganizationId(
      user.organizationId,
    );
  } else {
    projects = await projectRepository.findProjectsForCollaborator(
      user.organizationId,
      user.id,
    );
  }

  return c.json(projects);
});

export const getProject = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  const project = await projectRepository.findProjectById(id);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  if (project.organizationId !== user.organizationId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  return c.json(project);
});

export const createProject = factory.createHandlers(
  zValidator("json", createProjectSchema),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    if (!user.organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }

    const project = await projectRepository.createProject({
      ...data,
      createdBy: user.id,
      organizationId: user.organizationId,
    });

    return c.json(project, 201);
  },
);

export const updateProject = factory.createHandlers(
  zValidator("json", updateProjectSchema),
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const data = c.req.valid("json");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const project = await projectRepository.findProjectById(id);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.organizationId !== user.organizationId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const updated = await projectRepository.updateProject(id, data);
    if (!updated) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.json(updated);
  },
);

export const deleteProject = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  const taskCount = await taskRepository.countTasksByProjectId(id);
  if (taskCount > 0) {
    return c.json(
      { error: "Project has active tasks. Close or reassign them first." },
      400,
    );
  }

  const project = await projectRepository.findProjectById(id);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  if (project.createdBy !== user.id) {
    return c.json({ error: "Only the creator can delete the project" }, 403);
  }

  await projectRepository.deleteProject(id);
  return c.json({ message: "Project deleted successfully" });
});

export const getProjectMembers = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  const project = await projectRepository.findProjectById(id);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  if (project.organizationId !== user.organizationId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const members = await projectRepository.findProjectMembers(id);
  return c.json(members);
});

export const addProjectMember = factory.createHandlers(
  zValidator("json", z.object({ userId: z.string().uuid() })),
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const { userId } = c.req.valid("json");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const project = await projectRepository.findProjectById(id);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.organizationId !== user.organizationId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    if (!user.organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }

    const isOrgMember = await projectRepository.isOrganizationMember(
      user.organizationId,
      userId,
    );
    if (!isOrgMember) {
      return c.json(
        { error: "User does not belong to your organization" },
        400,
      );
    }

    await projectRepository.addProjectMember(id, userId);
    return c.json({ message: "Member added successfully" });
  },
);
