import { Hono } from "hono";
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
} from "@/http/controllers/notification.controller";

export const notificationRoutes = new Hono()
  .get("/", getNotifications)
  .get("/unread-count", getUnreadNotifications)
  .patch("/:id/read", markNotificationAsRead);
