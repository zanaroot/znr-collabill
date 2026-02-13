import { Hono } from "hono";
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from "@/http/controllers/project.controller";

export const projectRoutes = new Hono()
  .get("/", ...getProjects)
  .get("/:id", ...getProject)
  .post("/", ...createProject)
  .put("/:id", ...updateProject)
  .delete("/:id", ...deleteProject);
