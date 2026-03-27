import { Hono } from "hono";
import {
  createTask,
  deleteTask,
  getTasksByPeriod,
  getTasksByProject,
  updateTask,
} from "@/http/controllers/task.controller";
import { adminMiddleware } from "@/http/middleware/auth.middleware";

export const taskRoutes = new Hono()
  .get("/project/:projectId", ...getTasksByProject)
  .get("/project/:projectId/period", ...getTasksByPeriod)
  .post("/", adminMiddleware, ...createTask)
  .put("/:id", adminMiddleware, ...updateTask)
  .delete("/:id", adminMiddleware, ...deleteTask);
