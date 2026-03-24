import { Hono } from "hono";
import {
  createTask,
  deleteTask,
  getTasksByPeriod,
  getTasksByProject,
  updateTask,
} from "@/http/controllers/task.controller";
import {
  adminMiddleware,
  ownerMiddleware,
} from "@/http/middleware/auth.middleware";

export const taskRoutes = new Hono()
  .get("/project/:projectId", ...getTasksByProject)
  .get("/project/:projectId/period", ...getTasksByPeriod)
  .post("/", ownerMiddleware, adminMiddleware, ...createTask)
  .put("/:id", ownerMiddleware, adminMiddleware, ...updateTask)
  .delete("/:id", ownerMiddleware, adminMiddleware, ...deleteTask);
