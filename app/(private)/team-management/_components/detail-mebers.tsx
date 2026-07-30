"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
	Alert,
	App,
	Badge,
	Button,
	Calendar,
	Card,
	Col,
	DatePicker,
	Divider,
	Drawer,
	Flex,
	Row,
	Select,
	Space,
	Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { useAddProjectMember, useMemberProjects, useProjects, useRemoveProjectMember } from "@/app/(private)/projects/_hooks/use-projects";
import { useCurrentUser } from "@/app/(private)/team-management/_hooks/use-team";
import type { UserWithRoles } from "@/http/models/user.model";
import { client } from "@/packages/hono";

interface DetailMembersProps {
	open: boolean;
	onClose: () => void;
	member: UserWithRoles | null;
}

// interface MemberPresence {
// 	date: string;
// 	status: "PRESENT" | "REMOTE" | "LEAVE" | "SICK";
// }

export const DetailMembers = ({
	open,
	onClose,
	member,
}: DetailMembersProps) => {
	const [selectedProjectId, setSelectedProjectId] = useState<string>();
	const addMemberMutation = useAddProjectMember();
	const { data: projects } = useProjects();
	const { data: memberProjects = [] } = useMemberProjects(
		member?.id || ""
	);
	const { data: currentUser } = useCurrentUser();
	const removeMemberMutation = useRemoveProjectMember();
	const isOwner = currentUser?.organizationRole === "OWNER";
	const [currentMonth, setCurrentMonth] = useState(dayjs());
	const [invoiceMonth, setInvoiceMonth] = useState(dayjs());
	const { message } = App.useApp();
	const handleAddToProject = async () => {
		if (!member || !selectedProjectId) return;

		try {
			await addMemberMutation.mutateAsync({
				projectId: selectedProjectId,
				userId: member.id,
			});

			message.success("Member added to project");
			setSelectedProjectId(undefined);
		} catch (error) {
			message.error((error as Error).message || "Failed to add member");
		}
	};

	const availableProjects =
		projects?.filter(
			(project) => !memberProjects.some((p) => p.id === project.id)
		) ?? [];


	const startDate = currentMonth.startOf("month").format("YYYY-MM-DD");
	const endDate = currentMonth.endOf("month").format("YYYY-MM-DD");

	const { data: presences } = useQuery({
		queryKey: ["member-presences", member?.id, startDate, endDate],
		queryFn: async () => {
			console.log("Query exécutée");

			if (!member) {
				return [];
			}

			const res = await client.api.presence.member[":userId"].$get({
				param: {
					userId: member.id,
				},
				query: {
					startDate,
					endDate,
				},
			});

			return res.json();
		},
		enabled: !!member,
	});

	console.log("presences", presences);

	const presenceByDate = useMemo(() => {
		if (!presences || "error" in presences) {
			return new Map();
		}

		return new Map(presences.map((p: { date: string; status: string }) => [p.date, p.status]));
	}, [presences]);

	console.log("presenceByDate", presenceByDate);

	const dateCellRender = (value: Dayjs) => {
		const dateStr = value.format("YYYY-MM-DD");
		const status = presenceByDate.get(dateStr);

		if (!status) {
			return null;
		}

		const color =
			status === "PRESENT"
				? "green"
				: status === "REMOTE"
					? "blue"
					: status === "LEAVE"
						? "gold"
						: status === "SICK"
							? "red"
							: "default";

		return (
			<div style={{ padding: 2 }}>
				<Badge status="processing" color={color} text={status} />
			</div>
		);
	};

	const handleRemoveFromProject = async (projectId: string) => {
		if (!member) return;

		try {
			await removeMemberMutation.mutateAsync({
				projectId,
				userId: member.id,
			});

			message.success("Member removed from project");
		} catch (error) {
			message.error(
				(error as Error).message || "Failed to remove member"
			);
		}
	};

	const invoicePeriod = invoiceMonth.format("YYYY-MM");

	const { data: invoice } = useQuery({
		queryKey: ["member-invoice", member?.id, invoicePeriod],
		queryFn: async () => {
			if (!member) return null;

			const res = await client.api.invoices.member[":userId"].$get({
				param: {
					userId: member.id,
				},
				query: {
					month: invoicePeriod,
				},
			});

			const data = await res.json();

			if ("error" in data) {
				return null;
			}

			return data;
		},
		enabled: !!member,
	});

	return (
		<Drawer
			title="Member details"
			placement="right"
			width={1500}
			open={open}
			onClose={onClose}
		>
			{member && (
				<Row gutter={24}>
					<Col span={10}>
						<Space direction="vertical" size="large" style={{ width: "100%" }}>
							<Flex align="center" gap={16}>
								<AvatarProfile
									src={member.avatar}
									userName={member.name}
									userEmail={member.email}
									size={64}
								/>

								<div>
									<Typography.Title level={4} style={{ margin: 0 }}>
										{member.name}
									</Typography.Title>

									<Typography.Text type="secondary">
										{member.email}
									</Typography.Text>
								</div>
							</Flex>

							{isOwner && (
								<>
									<Divider>Project management</Divider>

									{availableProjects.length > 0 ? (
										<Card>
											<Select
												placeholder="Select a project"
												value={selectedProjectId}
												style={{ width: "100%", marginBottom: "10px" }}
												onChange={setSelectedProjectId}
												options={availableProjects.map((project) => ({
													value: project.id,
													label: project.name,
												}))}
												allowClear
											/>

											<Button
												type="primary"
												block
												onClick={handleAddToProject}
												loading={addMemberMutation.isPending}
												disabled={!selectedProjectId}
											>
												Add to project
											</Button>
										</Card>
									) : (
										<Alert
											type="success"
											showIcon
											message="This member already has access to all projects."
										/>
									)}

									<Divider>Projects</Divider>

									{memberProjects.length === 0 ? (
										<Typography.Text type="secondary">
											This member doesn't have access to any project.
										</Typography.Text>
									) : (
										<Card>
											{memberProjects.map((project) => (
												<Flex
													key={project.id}
													justify="space-between"
													align="center"
												>
													<Typography.Text>{project.name}</Typography.Text>

													<Button
														danger
														type="text"
														icon={<DeleteOutlined />}
														loading={removeMemberMutation.isPending}
														onClick={() => handleRemoveFromProject(project.id)}
													/>
												</Flex>
											))}
										</Card>
									)}
								</>
							)}
						</Space>

						<Divider>Invoice</Divider>

						<Card style={{ marginTop: "20px" }}>
							<Space direction="vertical" size="large" style={{ width: "100%" }}>

								<DatePicker
									picker="month"
									value={invoiceMonth}
									onChange={(date) => {
										if (date) {
											setInvoiceMonth(date);
										}
									}}
									format="MMMM YYYY"
									style={{ width: "100%" }}
								/>

								{invoice?.lines?.map((line) => (
									<Flex
										key={line.id}
										justify="space-between"
									>
										<div>
											<Typography.Text>
												{line.description}
											</Typography.Text>

											<br />

											<Typography.Text type="secondary">
												{line.type}
											</Typography.Text>
										</div>

										<Typography.Text strong>
											{line.total} €
										</Typography.Text>
									</Flex>
								))}

							</Space>
						</Card>
					</Col>

					<Col span={14}>
						<Card title="Presence">
							<Divider>Invoice</Divider>

							<Calendar
								value={currentMonth}
								cellRender={dateCellRender}
								onPanelChange={(value) => setCurrentMonth(value)}
							/>
						</Card>
					</Col>
				</Row>
			)}
		</Drawer>
	)
}