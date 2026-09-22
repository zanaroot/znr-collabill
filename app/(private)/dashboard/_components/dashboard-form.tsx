"use client";

import {
    ArrowRightOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    ProjectOutlined,
    RiseOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import {
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    Empty,
    Flex,
    Progress,
    Row,
    Select,
    Space,
    Statistic,
    Tag,
    Typography,
} from "antd";
import { useState } from "react";

import {
    useCurrentUser,
    useUsers,
} from "@/app/(private)/team-management/_hooks/use-team";

import {
    useDashboardNewTickets,
    useDashboardStatistics,
} from "../_hooks/usedasboard";

const { Text, Title } = Typography;

export default function Dashboard() {
    const [selectedUserId, setSelectedUserId] = useState("");

    const { data: currentUser } = useCurrentUser();
    const { data: users } = useUsers();

    const isOwner = currentUser?.organizationRole === "OWNER";

    // OWNER peut sélectionner un membre.
    // Sans sélection, on affiche son propre dashboard.
    const dashboardUserId =
        isOwner && selectedUserId ? selectedUserId : currentUser?.id;

    const {
        data: statistics,
        isLoading: isLoadingStatistics,
    } = useDashboardStatistics(dashboardUserId);

    const {
        data: newTicketsData,
        isLoading: isLoadingNewTickets,
    } = useDashboardNewTickets(dashboardUserId);

    const newTickets = newTicketsData?.tickets ?? [];
    const newTicketsCount = newTicketsData?.total ?? 0;

    const importantTickets = [
        {
            id: "CLB-121",
            title: "Invoice calculation is incorrect",
            project: "Billing",
            priority: "URGENT",
        },
        {
            id: "CLB-115",
            title: "Members cannot access project",
            project: "Collabill",
            priority: "IMPORTANT",
        },
        {
            id: "CLB-104",
            title: "Attendance settings issue",
            project: "Collabill",
            priority: "IMPORTANT",
        },
    ];

    return (
        <Space
            orientation="vertical"
            size={24}
            style={{
                width: "100%",
                minHeight: "100%",
                paddingBottom: 32,
                overflowY: "auto",
            }}
        >
            {/* Header */}
            <Flex
                align="center"
                justify="space-between"
                wrap="wrap"
                gap={16}
            >
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        Dashboard
                    </Title>

                    <Text type="secondary">
                        Overview of your activity and current work.
                    </Text>
                </div>

                {isOwner && (
                    <Select
                        showSearch
                        allowClear
                        value={selectedUserId || undefined}
                        placeholder="Select a member"
                        optionFilterProp="label"
                        onChange={(value) => setSelectedUserId(value ?? "")}
                        style={{ width: 300 }}
                        options={
                            users?.map((user) => ({
                                value: user.id,
                                label: user.name,
                            })) ?? []
                        }
                    />
                )}
            </Flex>

            {/* Statistics */}
            <Row gutter={[16, 16]}>
                {/* Projects */}
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Projects"
                            value={statistics?.activeProjects ?? 0}
                            loading={isLoadingStatistics}
                            prefix={<ProjectOutlined />}
                        />

                        <Flex
                            align="center"
                            gap={6}
                            style={{ marginTop: 12 }}
                        >
                            <RiseOutlined />

                            <Text type="secondary">
                                Projects in your organization
                            </Text>
                        </Flex>
                    </Card>
                </Col>

                {/* Open tasks */}
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Open tasks"
                            value={statistics?.openTasks ?? 0}
                            loading={isLoadingStatistics}
                            prefix={<ClockCircleOutlined />}
                        />

                        <Flex
                            align="center"
                            gap={6}
                            style={{ marginTop: 12 }}
                        >
                            <ClockCircleOutlined />

                            <Text type="secondary">
                                Tasks waiting for action
                            </Text>
                        </Flex>
                    </Card>
                </Col>

                {/* Team members */}
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Team members"
                            value={statistics?.teamMembers ?? 0}
                            loading={isLoadingStatistics}
                            prefix={<TeamOutlined />}
                        />

                        <Flex
                            align="center"
                            gap={6}
                            style={{ marginTop: 12 }}
                        >
                            <TeamOutlined />

                            <Text type="secondary">
                                Members in your organization
                            </Text>
                        </Flex>
                    </Card>
                </Col>

                {/* Pending invoices */}
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Pending invoices"
                            value={statistics?.pendingInvoices ?? 0}
                            loading={isLoadingStatistics}
                            prefix={<FileTextOutlined />}
                        />

                        <Flex
                            align="center"
                            gap={6}
                            style={{ marginTop: 12 }}
                        >
                            <ClockCircleOutlined />

                            <Text type="secondary">
                                Invoices awaiting payment
                            </Text>
                        </Flex>
                    </Card>
                </Col>
            </Row>

            {/* Main content */}
            <Row gutter={[16, 16]}>
                {/* New tickets */}
                <Col xs={24} lg={14}>
                    <Card
                        loading={isLoadingNewTickets}
                        title={
                            <Flex align="center" justify="space-between">
                                <Space>
                                    <FileTextOutlined />
                                    <span>New tickets assigned to you</span>
                                </Space>

                                <Badge
                                    count={newTicketsCount}
                                    overflowCount={99}
                                />
                            </Flex>
                        }
                        extra={
                            <Button
                                type="link"
                                icon={<ArrowRightOutlined />}
                            >
                                View all
                            </Button>
                        }
                    >
                        {newTickets.length === 0 ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No new tickets assigned to you"
                            />
                        ) : (
                            <Space
                                orientation="vertical"
                                size={0}
                                style={{
                                    width: "100%",
                                }}
                            >
                                {newTickets.map((ticket) => (
                                    <Card
                                        key={ticket.id}
                                        size="small"
                                        variant="borderless"
                                        style={{
                                            borderBottom: "1px solid #f0f0f0",
                                            borderRadius: 0,
                                        }}
                                    >
                                        <Flex
                                            align="center"
                                            justify="space-between"
                                            gap={16}
                                        >
                                            <Flex
                                                align="center"
                                                gap={12}
                                                style={{
                                                    minWidth: 0,
                                                }}
                                            >
                                                <Avatar
                                                    shape="square"
                                                    icon={<FileTextOutlined />}
                                                />

                                                <div
                                                    style={{
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Flex
                                                        align="center"
                                                        gap={8}
                                                        wrap="wrap"
                                                    >
                                                        <Text strong>
                                                            {ticket.id}
                                                        </Text>

                                                        {ticket.priority !== null && (
                                                            <Tag color="blue">
                                                                Priority{" "}
                                                                {ticket.priority}
                                                            </Tag>
                                                        )}
                                                    </Flex>

                                                    <Text
                                                        ellipsis
                                                        style={{
                                                            display: "block",
                                                            maxWidth: 400,
                                                        }}
                                                    >
                                                        {ticket.title}
                                                    </Text>

                                                    <Text type="secondary">
                                                        {ticket.project}
                                                        {" · "}
                                                        {ticket.createdAt
                                                            ? new Date(
                                                                ticket.createdAt,
                                                            ).toLocaleDateString()
                                                            : "—"}
                                                    </Text>
                                                </div>
                                            </Flex>

                                            <Button
                                                type="text"
                                                icon={<ArrowRightOutlined />}
                                            />
                                        </Flex>
                                    </Card>
                                ))}
                            </Space>
                        )}
                    </Card>
                </Col>

                {/* Current month invoice */}
                <Col xs={24} lg={10}>
                    <Card
                        title={
                            <Space>
                                <FileTextOutlined />
                                Current month invoice
                            </Space>
                        }
                    >
                        <Space
                            orientation="vertical"
                            size={20}
                            style={{
                                width: "100%",
                            }}
                        >
                            <div>
                                <Text type="secondary">
                                    Estimated amount
                                </Text>

                                <Title
                                    level={1}
                                    style={{
                                        margin: "4px 0 0",
                                        fontSize: 36,
                                    }}
                                >
                                    1,240 €
                                </Title>
                            </div>

                            <Flex
                                align="center"
                                justify="space-between"
                            >
                                <Text type="secondary">
                                    Invoice status
                                </Text>

                                <Tag color="processing">
                                    DRAFT
                                </Tag>
                            </Flex>

                            <div>
                                <Flex
                                    align="center"
                                    justify="space-between"
                                    style={{
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text type="secondary">
                                        Billing progress
                                    </Text>

                                    <Text strong>
                                        72%
                                    </Text>
                                </Flex>

                                <Progress
                                    percent={72}
                                    showInfo={false}
                                />
                            </div>

                            <Button
                                block
                                type="default"
                                icon={<ArrowRightOutlined />}
                            >
                                View invoice
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>
            {/* Important tickets */}
            <Card
                title={
                    <Space>
                        <ExclamationCircleOutlined />

                        Important & urgent tickets
                    </Space>
                }
                extra={
                    <Button
                        type="link"
                        icon={<ArrowRightOutlined />}
                    >
                        View all
                    </Button>
                }
            >
                <Space
                    orientation="vertical"
                    size={12}
                    style={{ width: "100%" }}
                >
                    {importantTickets.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No important or urgent tickets"
                        />
                    ) : (
                        importantTickets.map((ticket) => (
                            <Card
                                key={ticket.id}
                                size="small"
                            >
                                <Flex
                                    align="center"
                                    justify="space-between"
                                    gap={16}
                                >
                                    <Flex
                                        align="center"
                                        gap={12}
                                        style={{
                                            minWidth: 0,
                                        }}
                                    >
                                        <Avatar
                                            shape="square"
                                            icon={
                                                <ExclamationCircleOutlined />
                                            }
                                        />

                                        <div>
                                            <Flex
                                                align="center"
                                                gap={8}
                                            >
                                                <Text strong>
                                                    {ticket.id}
                                                </Text>

                                                <Tag
                                                    color={
                                                        ticket.priority ===
                                                            "URGENT"
                                                            ? "red"
                                                            : "orange"
                                                    }
                                                >
                                                    {ticket.priority}
                                                </Tag>
                                            </Flex>

                                            <Text
                                                ellipsis
                                                style={{
                                                    display: "block",
                                                    maxWidth: 600,
                                                }}
                                            >
                                                {ticket.title}
                                            </Text>

                                            <Text type="secondary">
                                                {ticket.project}
                                            </Text>
                                        </div>
                                    </Flex>

                                    <Button
                                        type="text"
                                        icon={
                                            <ArrowRightOutlined />
                                        }
                                    />
                                </Flex>
                            </Card>
                        ))
                    )}
                </Space>
            </Card>
        </Space>
    );
}

export { Dashboard };