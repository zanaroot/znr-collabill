import { Hono } from "hono";
import {
  addProjectMember,
  createProject,
  createProjectBranch,
  deleteProject,
  getProject,
  getProjectBranches,
  getProjectMembers,
  getProjects,
  removeProjectMember,
  updateProject,
  updateProjectSlackSettings,
} from "@/http/controllers/project.controller";
import {
  adminMiddleware,
  ownerMiddleware,
} from "@/http/middleware/auth.middleware";

export const projectRoutes = new Hono()
  .get("/", ...getProjects)
  .get("/:id", ...getProject)
  .get("/:id/branches", ...getProjectBranches)
  .post("/:id/branches", ...createProjectBranch)
  .post("/", ownerMiddleware, ...createProject)
  .put("/:id", adminMiddleware, ...updateProject)
  .delete("/:id", adminMiddleware, ...deleteProject)
  .get("/:id/members", ...getProjectMembers)
  .post("/:id/members", adminMiddleware, ...addProjectMember)
  .delete("/:id/members/:userId", adminMiddleware, ...removeProjectMember)
  .put("/:id/slack-settings", adminMiddleware, ...updateProjectSlackSettings);
