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
  updateProjectMemberRole,
  updateProjectSlackSettings,
} from "@/http/controllers/project.controller";
import {
  ownerMiddleware,
  projectAdminMiddleware,
} from "@/http/middleware/auth.middleware";

export const projectRoutes = new Hono()
  .get("/", ...getProjects)
  .get("/:id", ...getProject)
  .get("/:id/branches", ...getProjectBranches)
  .post("/:id/branches", ...createProjectBranch)
  .post("/", ownerMiddleware, ...createProject)
  .put("/:id", projectAdminMiddleware, ...updateProject)
  .delete("/:id", projectAdminMiddleware, ...deleteProject)
  .get("/:id/members", ...getProjectMembers)
  .post("/:id/members", projectAdminMiddleware, ...addProjectMember)
  .delete(
    "/:id/members/:userId",
    projectAdminMiddleware,
    ...removeProjectMember,
  )
  .put("/:id/slack-settings", projectAdminMiddleware, ...updateProjectSlackSettings)
  .put(
    "/:id/members/:userId/role",
    projectAdminMiddleware,
    ...updateProjectMemberRole,
  );
