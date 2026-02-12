import { Hono } from "hono";
import { userController } from "../../controllers/user";

export const userRoutes = new Hono().get("/", ...userController.get);
