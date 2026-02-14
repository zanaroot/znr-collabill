import { Hono } from "hono";
import {
  createTask,
  deleteTask,
  getTasksByProject,
  updateTask,
} from "@/http/controllers/task.controller";

export const taskRoutes = new Hono()
  .get("/project/:projectId", ...getTasksByProject)
  .post("/", ...createTask)
  .put("/:id", ...updateTask)
  .delete("/:id", ...deleteTask);
