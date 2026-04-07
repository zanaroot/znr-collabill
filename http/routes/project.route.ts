import { Hono } from "hono";
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProject,
  getProjectMembers,
  getProjects,
  removeProjectMember,
  updateProject,
} from "@/http/controllers/project.controller";
import {
  adminMiddleware,
  ownerMiddleware,
} from "@/http/middleware/auth.middleware";

export const projectRoutes = new Hono()
  .get("/", ...getProjects)
  .get("/:id", ...getProject)
  .post("/", ownerMiddleware, ...createProject)
  .put("/:id", adminMiddleware, ...updateProject)
  .delete("/:id", adminMiddleware, ...deleteProject)
  .get("/:id/members", ...getProjectMembers)
  .post("/:id/members", adminMiddleware, ...addProjectMember)
  .delete("/:id/members/:userId", adminMiddleware, ...removeProjectMember);
