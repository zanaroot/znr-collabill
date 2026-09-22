import { and, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { invoices } from "@/db/schema/invoice";
import { notifications } from "@/db/schema/notification";
import { projects } from "@/db/schema/project";
import { tasks } from "@/db/schema/task";
import { userRoles } from "@/db/schema/user";

const OPEN_TASK_STATUSES = [
    "BACKLOG",
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "APPROVED",
    "BLOCKED",
] as const;

export const dashboardRepository = {
    async getStatistics(
        organizationId: string,
        userId: string,
    ) {
        const [projectsResult, tasksResult, membersResult, invoicesResult] =
            await Promise.all([
                // Projects in the organization
                db
                    .select({ count: count() })
                    .from(projects)
                    .where(
                        eq(
                            projects.organizationId,
                            organizationId,
                        ),
                    ),

                // Open tasks assigned to the selected user
                db
                    .select({ count: count() })
                    .from(tasks)
                    .innerJoin(
                        projects,
                        eq(
                            tasks.projectId,
                            projects.id,
                        ),
                    )
                    .where(
                        and(
                            eq(
                                projects.organizationId,
                                organizationId,
                            ),
                            eq(
                                tasks.assignedTo,
                                userId,
                            ),
                            inArray(
                                tasks.status,
                                OPEN_TASK_STATUSES,
                            ),
                        ),
                    ),

                // Members in the organization
                db
                    .select({ count: count() })
                    .from(userRoles)
                    .where(
                        eq(
                            userRoles.organizationId,
                            organizationId,
                        ),
                    ),

                // Pending invoices in the organization
                db
                    .select({ count: count() })
                    .from(invoices)
                    .where(
                        and(
                            eq(
                                invoices.organizationId,
                                organizationId,
                            ),
                            eq(
                                invoices.status,
                                "VALIDATED",
                            ),
                        ),
                    ),
            ]);

        return {
            activeProjects: projectsResult[0]?.count ?? 0,
            openTasks: tasksResult[0]?.count ?? 0,
            teamMembers: membersResult[0]?.count ?? 0,
            pendingInvoices: invoicesResult[0]?.count ?? 0,
        };
    },

    async getNewTickets(
        organizationId: string,
        userId: string,
    ) {
        const filters = and(
            eq(
                notifications.organizationId,
                organizationId,
            ),
            eq(
                notifications.userId,
                userId,
            ),
            eq(
                notifications.type,
                "TASK_ASSIGNED",
            ),
            eq(
                notifications.entityType,
                "TASK",
            ),
            eq(
                notifications.isRead,
                false,
            ),
            inArray(
                tasks.status,
                OPEN_TASK_STATUSES,
            ),
        );

        const [tickets, totalResult] = await Promise.all([
            db
                .select({
                    id: tasks.id,
                    title: tasks.title,
                    priority: tasks.priority,
                    project: projects.name,
                    createdAt: tasks.createdAt,
                })
                .from(notifications)
                .innerJoin(
                    tasks,
                    eq(
                        notifications.entityId,
                        tasks.id,
                    ),
                )
                .innerJoin(
                    projects,
                    eq(
                        tasks.projectId,
                        projects.id,
                    ),
                )
                .where(filters)
                .orderBy(
                    desc(notifications.createdAt),
                )
                .limit(5),

            db
                .select({
                    count: count(),
                })
                .from(notifications)
                .innerJoin(
                    tasks,
                    eq(
                        notifications.entityId,
                        tasks.id,
                    ),
                )
                .innerJoin(
                    projects,
                    eq(
                        tasks.projectId,
                        projects.id,
                    ),
                )
                .where(filters),
        ]);

        return {
            tickets,
            total: totalResult[0]?.count ?? 0,
        };
    },
};