import { Hono } from "hono";
import {
  createTask,
  deleteTask,
  getTasksByPeriod,
  getTasksByProject,
  updateTask,
  uploadEditorImage,
} from "@/http/controllers/task.controller";

export const taskRoutes = new Hono()
  .get("/project/:projectId", ...getTasksByProject)
  .get("/project/:projectId/period", ...getTasksByPeriod)
  .post("/", ...createTask)
  .put("/:id", ...updateTask)
  .delete("/:id", ...deleteTask)
  .post("/upload-image", ...uploadEditorImage);
