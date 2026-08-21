import type { Context } from "hono";
import {
  getNotificationsByUser,
  getUnreadNotificationsCount,
  markNotificationAsRead as markNotificationAsReadRepository,
} from "@/http/repositories/notification.repository";

export const getNotifications = async (c: Context) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const organizationId = user.organizationId;

  if (!organizationId) {
    return c.json({ error: "Organization not found" }, 400);
  }

  const notifications = await getNotificationsByUser(user.id, organizationId);

  return c.json(notifications);
};

export const getUnreadNotifications = async (c: Context) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const organizationId = user.organizationId;

  if (!organizationId) {
    return c.json({ error: "Organization not found" }, 400);
  }

  const count = await getUnreadNotificationsCount(user.id, organizationId);

  return c.json({ count });
};

export const markNotificationAsRead = async (c: Context) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const organizationId = user.organizationId;

  if (!organizationId) {
    return c.json({ error: "Organization not found" }, 400);
  }

  const notificationId = c.req.param("id");

  const notification = await markNotificationAsReadRepository(
    notificationId,
    user.id,
    organizationId,
  );

  if (!notification) {
    return c.json({ error: "Notification not found" }, 404);
  }

  return c.json(notification);
};
