import { Hono } from "hono";
import {
  createComment,
  getCommentsByTask,
  updateComment,
} from "@/http/controllers/task-comment.controller";

export const taskCommentRoutes = new Hono()
  .get("/task/:taskId", ...getCommentsByTask)
  .post("/task/:taskId", ...createComment)
  .put("/:commentId", ...updateComment);
