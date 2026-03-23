import { Hono } from "hono";
import { iterationController } from "@/http/controllers/iteration.controller";

export const iterationRoutes = new Hono()
  .get("/", ...iterationController.list)
  .get("/:id", ...iterationController.get)
  .post("/", ...iterationController.create)
  .patch("/:id", ...iterationController.update)
  .delete("/:id", ...iterationController.delete);
