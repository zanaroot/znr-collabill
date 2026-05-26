import { Hono } from "hono";
import {
  createTask,
  deleteTask,
  getTasksByPeriod,
  getTasksByProject,
  updateTask,
} from "@/http/controllers/task.controller";
import { memberMiddleware } from "@/http/middleware/auth.middleware";

export const taskRoutes = new Hono()
  .get("/project/:projectId", ...getTasksByProject)
  .get("/project/:projectId/period", ...getTasksByPeriod)
  .post("/", memberMiddleware, ...createTask)
  .put("/:id", ...updateTask)
  .delete("/:id", memberMiddleware, ...deleteTask);
