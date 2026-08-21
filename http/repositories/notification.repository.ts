import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  type notificationEntityTypeEnum,
  notifications,
  type notificationTypeEnum,
} from "@/db/schema";

export const createNotification = async (data: {
  userId: string;
  organizationId: string;
  actorId?: string;
  type: (typeof notificationTypeEnum.enumValues)[number];
  title: string;
  message: string;
  entityType: (typeof notificationEntityTypeEnum.enumValues)[number];
  entityId?: string;
}) => {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      organizationId: data.organizationId,
      actorId: data.actorId,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType,
      entityId: data.entityId,
    })
    .returning();

  return notification;
};

export const getNotificationsByUser = async (
  userId: string,
  organizationId: string,
) => {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
      ),
    )
    .orderBy(desc(notifications.createdAt));
};

export const getUnreadNotificationsCount = async (
  userId: string,
  organizationId: string,
) => {
  const unreadNotifications = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.isRead, false),
      ),
    );

  return unreadNotifications.length;
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string,
  organizationId: string,
) => {
  const [notification] = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
      ),
    )
    .returning();

  return notification;
};

export const markAllNotificationsAsRead = async (
  userId: string,
  organizationId: string,
) => {
  return db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.isRead, false),
      ),
    )
    .returning();
};
