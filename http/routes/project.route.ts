import { Hono } from "hono";
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProject,
  getProjectMembers,
  getProjects,
  updateProject,
} from "@/http/controllers/project.controller";

export const projectRoutes = new Hono()
  .get("/", ...getProjects)
  .get("/:id", ...getProject)
  .post("/", ...createProject)
  .put("/:id", ...updateProject)
  .delete("/:id", ...deleteProject)
  .get("/:id/members", ...getProjectMembers)
  .post("/:id/members", ...addProjectMember);
