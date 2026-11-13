import { Hono } from "hono";
import {
  createProjectFile,
  deleteProjectFileHandler,
  downloadProjectFileHandler,
  getProjectFileMetadata,
  getProjectFiles,
  previewProjectFile,
  replaceProjectFileHandler,
} from "@/http/controllers/project-file.controller";

export const projectFileRoutes = new Hono()
  .post("/", ...createProjectFile)
  .get("/", ...getProjectFiles)
  .get("/:fileId", ...getProjectFileMetadata)
  .get("/:fileId/download", ...downloadProjectFileHandler)
  .get("/:fileId/preview", ...previewProjectFile)
  .put("/:fileId", ...replaceProjectFileHandler)
  .delete("/:fileId", ...deleteProjectFileHandler);
