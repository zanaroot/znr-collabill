import { Hono } from "hono";
import {
  createTask,
  deleteTask,
  getTasksByIteration,
  getTasksByProject,
  updateTask,
} from "@/http/controllers/task.controller";

export const taskRoutes = new Hono()
  .get("/project/:projectId", ...getTasksByProject)
  .get("/iteration/:iterationId", ...getTasksByIteration)
  .post("/", ...createTask)
  .put("/:id", ...updateTask)
  .delete("/:id", ...deleteTask);
