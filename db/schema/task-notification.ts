import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const taskNotifications = pgTable(
  "task_notifications",
  {
    taskId: uuid("task_id").notNull(),
    type: text("type").notNull(),
    sentAt: timestamp("sent_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.type] })],
);
