import { and, eq } from "drizzle-orm";
import { createFactory } from "hono/factory";

import { db } from "@/db";
import { userRoles } from "@/db/schema/user";
import type { AuthEnv } from "@/http/models/auth.model";

import { dashboardRepository } from "../repositories/dashboard-repository";

const factory = createFactory<AuthEnv>();

export const getDashboardStatistics = factory.createHandlers(
    async (c) => {
        const user = c.get("user");
        const { userId } = c.req.query();

        if (!user.organizationId) {
            return c.json(
                { error: "No organization found" },
                404,
            );
        }

        let targetUserId = user.id;

        if (
            user.organizationRole === "OWNER" &&
            userId
        ) {
            const member = await db
                .select({
                    userId: userRoles.userId,
                })
                .from(userRoles)
                .where(
                    and(
                        eq(
                            userRoles.userId,
                            userId,
                        ),
                        eq(
                            userRoles.organizationId,
                            user.organizationId,
                        ),
                    ),
                )
                .limit(1);

            if (!member.length) {
                return c.json(
                    {
                        error: "User does not belong to your organization",
                    },
                    403,
                );
            }

            targetUserId = userId;
        }

        const statistics =
            await dashboardRepository.getStatistics(
                user.organizationId,
                targetUserId,
            );

        return c.json(statistics);
    },
);

export const getDashboardNewTickets = factory.createHandlers(
    async (c) => {
        const user = c.get("user");
        const { userId } = c.req.query();

        if (!user.organizationId) {
            return c.json(
                { error: "No organization found" },
                404,
            );
        }

        let targetUserId = user.id;

        if (
            user.organizationRole === "OWNER" &&
            userId
        ) {
            const member = await db
                .select({
                    userId: userRoles.userId,
                })
                .from(userRoles)
                .where(
                    and(
                        eq(
                            userRoles.userId,
                            userId,
                        ),
                        eq(
                            userRoles.organizationId,
                            user.organizationId,
                        ),
                    ),
                )
                .limit(1);

            if (!member.length) {
                return c.json(
                    {
                        error: "User does not belong to your organization",
                    },
                    403,
                );
            }

            targetUserId = userId;
        }

        const result =
            await dashboardRepository.getNewTickets(
                user.organizationId,
                targetUserId,
            );

        return c.json(result);
    },
);