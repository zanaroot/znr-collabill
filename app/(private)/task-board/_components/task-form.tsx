"use client";

import { LinkOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { RichTextEditor } from "@/app/_components/editor/rich-text-editor";
import { TaskSizeTag } from "@/app/_components/task-size-tag";
import { cn } from "@/app/_utils/class-name";
import {
  getPriorityTagColor,
  PRIORITY_LABELS,
  type PriorityLabel,
  type TaskFormValues,
} from "@/app/_utils/priority";
import { formatStatus } from "@/app/_utils/status-task";
import { getAllowedTaskTransitions } from "@/app/_utils/task-workflow";
import {
  useCreateProjectBranch,
  useProjectBranches,
} from "@/app/(private)/projects/_hooks/use-projects";
import type { ProjectMemberRole } from "@/http/models/project.model";
import type { TaskSize, TaskStatus } from "@/http/models/task.model";
import { TASK_SIZES } from "@/http/models/task.model";
import type { Role } from "@/http/models/user.model";
import { formatDueDate } from "@/lib/date";
import { generateUniqueGitBranchFromTitle } from "@/lib/git-branch-name";
import type { TaskMembers } from "./column";
import { InfoRow } from "./info-row";

const { Text } = Typography;

const TASK_SIZE_OPTIONS = TASK_SIZES.map((size) => ({
  label: size.toLowerCase(),
  value: size,
}));

type TaskFormProps = {
  formValues: TaskFormValues;
  onFormValuesChange: (values: TaskFormValues) => void;
  isEditing: boolean;
  members: TaskMembers;
  projectId?: string;
  taskId?: string;
  projectGitBranches?: string[];
  userRole?: Role;
  userId?: string;
  projectRole?: ProjectMemberRole;
};

export const TaskForm = ({
  formValues,
  onFormValuesChange,
  isEditing,
  members,
  projectId,
  taskId,
  projectGitBranches = [],
  userRole,
  userId,
  projectRole,
}: TaskFormProps) => {
  const { message } = App.useApp();
  const { data: branches, isLoading: isLoadingBranches } =
    useProjectBranches(projectId);
  const { mutate: createBranch, isPending: isCreatingBranch } =
    useCreateProjectBranch();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [sourceBranch, setSourceBranch] = useState("main");

  const updateField = <K extends keyof TaskFormValues>(
    field: K,
    value: TaskFormValues[K],
  ) => {
    onFormValuesChange({ ...formValues, [field]: value });
  };

  const existingBranchNames = useMemo(() => {
    const names = new Set<string>();
    for (const branch of branches ?? []) {
      if (branch) names.add(branch);
    }
    for (const branch of projectGitBranches) {
      if (branch) names.add(branch);
    }
    return [...names];
  }, [branches, projectGitBranches]);

  const generatedGitBranch = useMemo(
    () =>
      generateUniqueGitBranchFromTitle(formValues.title, existingBranchNames),
    [existingBranchNames, formValues.title],
  );

  const isNewTask = !taskId;

  useEffect(() => {
    if (!isNewTask || !generatedGitBranch) {
      return;
    }
    if (formValues.gitBranch.trim()) {
      return;
    }
    onFormValuesChange({ ...formValues, gitBranch: generatedGitBranch });
  }, [formValues, generatedGitBranch, isNewTask, onFormValuesChange]);

  const applyGeneratedGitBranch = () => {
    if (!generatedGitBranch) {
      message.warning("Enter a task title to generate a branch name");
      return;
    }
    updateField("gitBranch", generatedGitBranch);
    message.success("Git branch name applied");
  };

  const handleCreateBranch = () => {
    if (!projectId || !newBranchName || !sourceBranch) return;

    const slugifiedName = newBranchName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._/-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slugifiedName) {
      message.error("Please enter a valid branch name");
      return;
    }

    createBranch(
      {
        projectId,
        newBranchName: slugifiedName,
        sourceBranchName: sourceBranch,
      },
      {
        onSuccess: () => {
          message.success(`Branch ${slugifiedName} created successfully`);
          updateField("gitBranch", slugifiedName);
          setIsModalOpen(false);
          setNewBranchName("");
        },
        onError: (error) => {
          message.error(error.message || "Failed to create branch");
        },
      },
    );
  };

  const assignee = formValues.assigneeId
    ? members.find((m) => m.id === formValues.assigneeId)
    : null;

  const reviewer = formValues.reviewerId
    ? members.find((m) => m.id === formValues.reviewerId)
    : null;

  const descriptionImages = useMemo(() => {
    if (typeof window === "undefined" || !formValues.description) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(formValues.description, "text/html");
      return Array.from(doc.querySelectorAll("img")).map((img) => img.src);
    } catch (_e) {
      return [];
    }
  }, [formValues.description]);

  const viewModeContent = (
    <Row gutter={[16, 16]} style={{ width: "100%" }}>
      <Col xs={24} lg={14}>
        <Card
          title="Description"
          className="h-full shadow-sm border-slate-200 dark:border-gray-700"
          styles={{ body: { padding: 16 } }}
        >
          {formValues.description ? (
            <>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100 prose-pre:text-zinc-900 dark:prose-pre:text-zinc-100"
                dangerouslySetInnerHTML={{ __html: formValues.description }}
              />
              {descriptionImages.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {descriptionImages.map((src, idx) => (
                    <button
                      key={src}
                      type="button"
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 transition-all hover:border-blue-400 p-0"
                      onClick={() => setImageModalUrl(src)}
                    >
                      {/* biome-ignore lint/performance/noImgElement: External dynamic image */}
                      <img
                        src={src}
                        alt={`Attachment ${idx + 1}`}
                        className="h-20 w-20 object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Typography.Text className="text-[10px] text-white font-bold drop-shadow-md">
                          VIEW
                        </Typography.Text>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Typography.Text type="secondary">
              No description provided
            </Typography.Text>
          )}
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card
          title="Details"
          className="h-full shadow-sm border-slate-200 dark:border-gray-700"
          styles={{ body: { padding: 16 } }}
        >
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <InfoRow label="Due date">
              <Typography.Text>
                {formValues.dueDate
                  ? formatDueDate(formValues.dueDate)
                  : "No due date"}
              </Typography.Text>
            </InfoRow>

            <InfoRow label="Status">
              <Tag color="blue">{formatStatus(formValues.status)}</Tag>
            </InfoRow>

            <InfoRow label="Priority">
              <Tag color={getPriorityTagColor(formValues.priorityLabel)}>
                {formValues.priorityLabel}
              </Tag>
            </InfoRow>

            <InfoRow label="Size">
              <TaskSizeTag size={formValues.size} />
            </InfoRow>

            <InfoRow label="Assignee">
              {assignee ? (
                <div className="flex items-center gap-2">
                  <AvatarProfile
                    size="small"
                    src={assignee.avatar}
                    userName={assignee.name}
                    userEmail={assignee.email}
                  />
                  <Text>{assignee.name}</Text>
                </div>
              ) : (
                <Text type="secondary">Unassigned</Text>
              )}
            </InfoRow>

            <InfoRow label="Reviewer">
              {reviewer ? (
                <div className="flex items-center gap-2">
                  <AvatarProfile
                    size="small"
                    src={reviewer.avatar}
                    userName={reviewer.name}
                    userEmail={reviewer.email}
                  />
                  <Text>{reviewer.name}</Text>
                </div>
              ) : (
                <Text type="secondary">Auto-assigned</Text>
              )}
            </InfoRow>

            <InfoRow label="Git Branch">
              <Typography.Text code>
                {formValues.gitBranch || "—"}
              </Typography.Text>
            </InfoRow>

            <InfoRow label="Preview Link">
              {formValues.previewLink ? (
                <Button
                  type="link"
                  href={formValues.previewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: 0,
                    height: "auto",
                    maxWidth: "60%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  }}
                >
                  {formValues.previewLink}
                </Button>
              ) : (
                <Text type="secondary">No preview link</Text>
              )}
            </InfoRow>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  const editModeContent = (
    <Space vertical size={12} style={{ width: "100%" }}>
      <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <Space vertical size={8} style={{ width: "100%" }}>
          <Typography.Text strong className="dark:text-white">
            Task title
          </Typography.Text>
          <Input
            value={formValues.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="What needs to be done?"
            size="large"
          />
        </Space>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <Space vertical size={8} style={{ width: "100%" }}>
          <div className="flex items-center justify-between gap-2">
            <Typography.Text strong className="dark:text-white">
              Generated Git branch
            </Typography.Text>
            <Button
              type="link"
              size="small"
              onClick={applyGeneratedGitBranch}
              disabled={!generatedGitBranch}
            >
              Apply to Git branch
            </Button>
          </div>
          {generatedGitBranch ? (
            <Typography.Text code className="block break-all dark:text-white">
              {generatedGitBranch}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary">
              Enter a task title to generate a branch name
            </Typography.Text>
          )}
          <Typography.Text type="secondary" className="text-xs">
            Unique per project — a numeric suffix or task id is added if the
            name already exists.
          </Typography.Text>
        </Space>
      </div>

      <RichTextEditor
        content={formValues.description || ""}
        onChange={(html) => updateField("description", html)}
      />

      <Space vertical size={16} style={{ width: "100%" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <Space vertical size={8} style={{ width: "100%" }}>
              <Typography.Text strong>Due date</Typography.Text>
              <Input
                type="date"
                value={formValues.dueDate ?? ""}
                onChange={(e) => updateField("dueDate", e.target.value || "")}
              />
            </Space>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <Space vertical size={8} style={{ width: "100%" }}>
              <Typography.Text strong>Status</Typography.Text>
              <Select<TaskStatus>
                value={formValues.status}
                optionLabelProp="label"
                placeholder="Select status"
                onChange={(value) => updateField("status", value)}
                options={getAllowedTaskTransitions({
                  from: formValues.status,
                  userRole,
                  projectRole,
                  reviewerId: formValues.reviewerId,
                  userId,
                }).map((status) => ({
                  label: <span>{formatStatus(status)}</span>,
                  value: status,
                }))}
                style={{ width: "100%" }}
              />
            </Space>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <Space vertical size={8} style={{ width: "100%" }}>
              <Text strong>Priority</Text>
              <Segmented
                options={PRIORITY_LABELS}
                value={formValues.priorityLabel}
                onChange={(value) =>
                  updateField("priorityLabel", value as PriorityLabel)
                }
                block
              />
            </Space>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <Space vertical size={8} style={{ width: "100%" }}>
              <Text strong>Size</Text>
              <Segmented
                options={TASK_SIZE_OPTIONS}
                value={formValues.size}
                onChange={(value) => updateField("size", value as TaskSize)}
                block
              />
            </Space>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={8} style={{ width: "100%" }}>
            <Text strong>Assignee</Text>
            <Select
              value={formValues.assigneeId}
              onChange={(value) => updateField("assigneeId", value ?? null)}
              placeholder="Select a member"
              options={members.map((m) => ({
                label: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                    }}
                  >
                    <AvatarProfile
                      size="small"
                      src={m.avatar}
                      userName={m.name}
                      userEmail={m.email}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: 1.2,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{m.name}</Text>
                      {m.role && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {m.role}
                        </Text>
                      )}
                    </div>
                  </div>
                ),
                value: m.id,
                searchValue: m.name,
              }))}
              optionLabelProp="label"
              style={{ width: "100%" }}
              allowClear
              onClear={() => updateField("assigneeId", null)}
              showSearch={{
                filterOption: (input, option) =>
                  (option?.searchValue as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase()),
              }}
            />
          </Space>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={8} style={{ width: "100%" }}>
            <Text strong>Reviewer (optional)</Text>
            <Select
              value={formValues.reviewerId}
              onChange={(value) => updateField("reviewerId", value ?? null)}
              placeholder="Select a reviewer"
              options={members.map((m) => ({
                label: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                    }}
                  >
                    <AvatarProfile
                      size="small"
                      src={m.avatar}
                      userName={m.name}
                      userEmail={m.email}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: 1.2,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{m.name}</Text>
                      {m.role && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {m.role}
                        </Text>
                      )}
                    </div>
                  </div>
                ),
                value: m.id,
                searchValue: m.name,
              }))}
              optionLabelProp="label"
              style={{ width: "100%" }}
              allowClear
              onClear={() => updateField("reviewerId", null)}
              showSearch={{
                filterOption: (input, option) =>
                  (option?.searchValue as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase()),
              }}
            />
          </Space>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={8} style={{ width: "100%" }}>
            <div className="flex items-center justify-between">
              <Text strong>Git Branch</Text>
              <Button
                type="link"
                size="small"
                onClick={() => setIsModalOpen(true)}
                disabled={!projectId}
              >
                Create new branch
              </Button>
            </div>
            {branches && branches.length > 0 ? (
              <Select
                showSearch
                loading={isLoadingBranches}
                value={formValues.gitBranch}
                onChange={(value) => updateField("gitBranch", value)}
                placeholder="Select a branch"
                options={branches?.map((branch) => ({
                  label: branch,
                  value: branch,
                }))}
                style={{ width: "100%" }}
                allowClear
              />
            ) : (
              <Input
                value={formValues.gitBranch || ""}
                onChange={(e) => updateField("gitBranch", e.target.value)}
                placeholder="Enter branch name"
                style={{ width: "100%" }}
                allowClear
              />
            )}
          </Space>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={8} style={{ width: "100%" }}>
            <Text strong>Preview Link</Text>
            <Input
              value={formValues.previewLink || ""}
              onChange={(e) => updateField("previewLink", e.target.value)}
              placeholder="Enter preview link"
              style={{ width: "100%" }}
              prefix={<LinkOutlined />}
              allowClear
            />
          </Space>
        </div>
      </Space>
    </Space>
  );

  return (
    <>
      {isEditing ? editModeContent : viewModeContent}

      <Modal
        title="Create New Git Branch"
        open={isModalOpen}
        onOk={handleCreateBranch}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={isCreatingBranch}
        okButtonProps={{ disabled: !newBranchName || !sourceBranch }}
      >
        <Space vertical size={16} style={{ width: "100%", marginTop: 16 }}>
          <Space vertical size={8} style={{ width: "100%" }}>
            <Text strong>Source Branch</Text>
            <Select
              showSearch
              value={sourceBranch}
              onChange={setSourceBranch}
              placeholder="Select source branch"
              options={branches?.map((branch) => ({
                label: branch,
                value: branch,
              }))}
              style={{ width: "100%" }}
            />
          </Space>
          <Space vertical size={8} style={{ width: "100%" }}>
            <Text strong>New Branch Name</Text>
            <Input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="feature/my-new-task"
            />
          </Space>
        </Space>
      </Modal>
      <Modal
        open={!!imageModalUrl}
        onCancel={() => setImageModalUrl("")}
        footer={null}
        width={800}
        centered
        destroyOnClose
      >
        <div className="mt-4 flex flex-col gap-4">
          {/* biome-ignore lint/performance/noImgElement: External dynamic image */}
          <img
            src={imageModalUrl}
            alt="Task description preview"
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          />
          {descriptionImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {descriptionImages.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  className={cn(
                    "w-16 h-16 shrink-0 overflow-hidden rounded-md cursor-pointer border-2 transition-all p-0",
                    imageModalUrl === src
                      ? "border-blue-500 scale-105"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                  onClick={() => setImageModalUrl(src)}
                >
                  {/* biome-ignore lint/performance/noImgElement: External dynamic image */}
                  <img
                    src={src}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
