import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/http/models/project.model";
import * as projectRepository from "@/http/repositories/project.repository";

const factory = createFactory<AuthEnv>();

export const getProjects = factory.createHandlers(async (c) => {
  const user = c.get("user");
  const projects = await projectRepository.findProjectsByUserId(user.id);
  return c.json(projects);
});

export const getProject = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  const isMember = await projectRepository.isProjectMember(id, user.id);
  if (!isMember) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const project = await projectRepository.findProjectById(id);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json(project);
});

export const createProject = factory.createHandlers(
  zValidator("json", createProjectSchema),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    const project = await projectRepository.createProject({
      ...data,
      createdBy: user.id,
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

    const isMember = await projectRepository.isProjectMember(id, user.id);
    if (!isMember) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const project = await projectRepository.updateProject(id, data);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.json(project);
  },
);

export const deleteProject = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
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
