"use client";

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InputNumber, message } from "antd";
import { useEffect, useState } from "react";

import { useProjects, useUpdateProject } from "@/app/(private)/projects/_hooks/use-projects";
import {
    useCollaboratorRates,
    useCurrentUser,
    useUpdateCollaboratorRates,
    useUsers,
} from "@/app/(private)/team-management/_hooks/use-team";
import type { Project } from "@/http/models/project.model";
import { client } from "@/packages/hono";
import RateSettingsForm from "./rateSettingForm";

interface RateSettingsPanelProps {
    organizationId: string;
}





const DEFAULT_PRESENCE_TYPES = {
    OFFICE: { enabled: true, rate: 100 },
    REMOTE: { enabled: false, rate: 100 },
    ON_SITE: { enabled: false, rate: 100 },
    SICK: { enabled: true, rate: 100 },
    VACATION: { enabled: true, rate: 100 },
    ON_LEAVE: { enabled: true, rate: 100 },
};



export default function RateSettingsPanel({
    organizationId,
}: RateSettingsPanelProps) {
    const { data: currentUser } = useCurrentUser();
    const { data: users } = useUsers();

    const isOwner = currentUser?.organizationRole === "OWNER";

    const [selectedUserId, setSelectedUserId] = useState("");

    const [rates, setRates] = useState({
        rateXs: "0",
        rateS: "0",
        rateM: "0",
        rateL: "0",
        rateXl: "0",
        dailyRate: "0",
    });

    const [presenceTypes, setPresenceTypes] = useState(
        DEFAULT_PRESENCE_TYPES,
    );

    const [leaveSettings, setLeaveSettings] = useState({
        unusedLeavePolicy: "CARRY_OVER",
        adminLeaveQuota: 2.5,
        collaboratorLeaveQuota: 2.0,
    });

    const { data: projects } = useProjects();
    const queryClient = useQueryClient();
    const [
        presenceSelectionEnabled,
        setPresenceSelectionEnabled,
    ] = useState(true);

    const updateRatesMutation = useUpdateCollaboratorRates();
    const updateProjectMutation = useUpdateProject();
    const [projectRates, setProjectRates] = useState<
        Record<
            string,
            {
                baseRate: number;
                reviewerRate: number;
            }
        >
    >({});

    const projectRateColumns = [
        {
            title: "Project",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Base Rate",
            dataIndex: "baseRate",
            key: "baseRate",
            render: (
                value: number | string | null,
                record: Project,
            ) => {
                const currentValue =
                    projectRates[record.id]?.baseRate ??
                    Number(value ?? 0);

                return isOwner ? (
                    <InputNumber
                        min={0}
                        max={100}
                        step={0.01}
                        value={currentValue}
                        suffix="%"
                        onChange={(newValue) => {
                            setProjectRates((prev) => ({
                                ...prev,
                                [record.id]: {
                                    ...prev[record.id],
                                    baseRate: newValue ?? 0,
                                    reviewerRate:
                                        prev[record.id]
                                            ?.reviewerRate ??
                                        Number(
                                            record.reviewerRate ??
                                            0,
                                        ),
                                },
                            }));
                        }}
                    />
                ) : (
                    `${currentValue}%`
                );
            },
        },
        {
            title: "Reviewer Rate",
            dataIndex: "reviewerRate",
            key: "reviewerRate",
            render: (
                value: number | string | null,
                record: Project,
            ) => {
                const currentValue =
                    projectRates[record.id]?.reviewerRate ??
                    Number(value ?? 0);

                return isOwner ? (
                    <InputNumber
                        min={0}
                        max={100}
                        step={0.01}
                        value={currentValue}
                        suffix="%"
                        onChange={(newValue) => {
                            setProjectRates((prev) => ({
                                ...prev,
                                [record.id]: {
                                    ...prev[record.id],
                                    baseRate:
                                        prev[record.id]?.baseRate ??
                                        Number(
                                            record.baseRate ?? 0,
                                        ),
                                    reviewerRate:
                                        newValue ?? 0,
                                },
                            }));
                        }}
                    />
                ) : (
                    `${currentValue}%`
                );
            },
        },
    ];

    const attendanceMutation = useMutation({
        mutationFn: async () => {
            const response =
                await client.api.organizations[":organizationId"][
                    "attendance-settings"
                ].$put({
                    param: {
                        organizationId,
                    },
                    json: {
                        presenceSelectionEnabled:
                            presenceSelectionEnabled ??
                            true,

                        settings: Object.entries(presenceTypes).map(
                            ([type, { enabled, rate }]) => ({
                                type: type as
                                    | "OFFICE"
                                    | "REMOTE"
                                    | "ON_SITE"
                                    | "SICK"
                                    | "VACATION"
                                    | "ON_LEAVE",
                                enabled,
                                rate,
                            }),
                        ),
                    },
                });

            if (!response.ok) {
                throw new Error(
                    "Failed to update attendance settings",
                );
            }

            return response.json();
        },

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [
                    "organization-attendance-settings",
                    organizationId,
                ],
            });
        },
    });

    const leaveMutation = useMutation({
        mutationFn: async () => {
            const response =
                await client.api["leave-requests"].settings.$patch({
                    json: {
                        unusedLeavePolicy:
                            leaveSettings.unusedLeavePolicy as
                            | "CARRY_OVER"
                            | "PAID_AS_WORKED",

                        adminLeaveQuota:
                            String(leaveSettings.adminLeaveQuota),

                        collaboratorLeaveQuota:
                            String(
                                leaveSettings.collaboratorLeaveQuota,
                            ),
                    },
                });

            if (!response.ok) {
                const error = (await response.json()) as {
                    error?: string;
                };

                throw new Error(
                    error.error ||
                    "Failed to update leave settings",
                );
            }

            return response.json();
        },

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["current-organization-settings"],
            });
        },
    });

    useEffect(() => {
        if (!projects) return;

        setProjectRates(
            Object.fromEntries(
                projects.map((project) => [
                    project.id,
                    {
                        baseRate: Number(project.baseRate ?? 0),
                        reviewerRate: Number(
                            project.reviewerRate ?? 0,
                        ),
                    },
                ]),
            ),
        );
    }, [projects]);

    useEffect(() => {
        if (!currentUser) return;

        if (isOwner) {
            const firstMember = users?.find(
                (user) => user.id !== currentUser.id,
            );

            setSelectedUserId(
                firstMember?.id ?? currentUser.id,
            );
        } else {
            setSelectedUserId(currentUser.id);
        }
    }, [currentUser, users, isOwner]);

    const { data: selectedUserRates } =
        useCollaboratorRates(selectedUserId);

    useEffect(() => {
        if (!selectedUserRates) return;

        setRates({
            rateXs: selectedUserRates.rateXs ?? "0",
            rateS: selectedUserRates.rateS ?? "0",
            rateM: selectedUserRates.rateM ?? "0",
            rateL: selectedUserRates.rateL ?? "0",
            rateXl: selectedUserRates.rateXl ?? "0",
            dailyRate: selectedUserRates.dailyRate ?? "0",
        });
    }, [selectedUserRates]);

    const { data: attendanceSettings } = useQuery({
        queryKey: [
            "organization-attendance-settings",
            organizationId,
        ],

        enabled: Boolean(organizationId),

        queryFn: async () => {
            const response =
                await client.api.organizations[":organizationId"][
                    "attendance-settings"
                ].$get({
                    param: {
                        organizationId,
                    },
                });

            if (!response.ok) {
                throw new Error(
                    "Failed to fetch attendance settings",
                );
            }

            return response.json();
        },
    });

    useEffect(() => {
        if (!attendanceSettings) return;

        if (
            attendanceSettings.presenceSelectionEnabled !==
            undefined
        ) {
            setPresenceSelectionEnabled(
                attendanceSettings.presenceSelectionEnabled,
            );
        }

        if (!attendanceSettings.settings) return;

        const settings = Object.fromEntries(
            attendanceSettings.settings.map((setting) => [
                setting.type,
                {
                    enabled: setting.enabled,
                    rate: Number(setting.rate),
                },
            ]),
        ) as Partial<typeof DEFAULT_PRESENCE_TYPES>;

        setPresenceTypes((prev) => ({
            ...prev,
            ...settings,
        }));
    }, [attendanceSettings]);

    const selectedUser = users?.find(
        (user) => user.id === selectedUserId,
    );

    const handleSaveAll = async () => {
        if (!isOwner || !selectedUserId) return;

        try {
            await updateRatesMutation.mutateAsync({
                userId: selectedUserId,
                rates: {
                    ...rates,
                    organizationId,
                },
            });

            await Promise.all(
                Object.entries(projectRates).map(
                    ([projectId, projectRate]) =>
                        updateProjectMutation.mutateAsync({
                            id: projectId,
                            data: {
                                baseRate: projectRate.baseRate,
                                reviewerRate:
                                    projectRate.reviewerRate,
                            },
                        }),
                ),
            );

            await attendanceMutation.mutateAsync();

            await leaveMutation.mutateAsync();

            message.success(
                "All rates saved successfully",
            );
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save rates",
            );
        }
    };

    const isSaving =
        updateRatesMutation.isPending ||
        attendanceMutation.isPending ||
        leaveMutation.isPending;

    return (
        <RateSettingsForm
            isOwner={isOwner}
            users={users ?? []}
            selectedUser={selectedUser}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}

            rates={rates}
            setRates={setRates}

            presenceTypes={presenceTypes}
            setPresenceTypes={setPresenceTypes}

            leaveSettings={leaveSettings}
            setLeaveSettings={setLeaveSettings}

            projects={projects ?? []}
            projectRateColumns={projectRateColumns}

            onSaveAll={handleSaveAll}
            isSaving={isSaving}
        />
    );
}