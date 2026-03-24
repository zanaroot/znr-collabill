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
import {
  adminMiddleware,
  ownerMiddleware,
} from "@/http/middleware/auth.middleware";

export const projectRoutes = new Hono()
  .get("/", ...getProjects)
  .get("/:id", ...getProject)
  .post("/", ownerMiddleware, ...createProject)
  .put("/:id", ownerMiddleware, adminMiddleware, ...updateProject)
  .delete("/:id", ownerMiddleware, adminMiddleware, ...deleteProject)
  .get("/:id/members", ...getProjectMembers)
  .post("/:id/members", ownerMiddleware, adminMiddleware, ...addProjectMember);
