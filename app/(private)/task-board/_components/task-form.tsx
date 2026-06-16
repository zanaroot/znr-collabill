"use client";

import {
  AppstoreOutlined,
  BranchesOutlined,
  CalendarOutlined,
  FlagOutlined,
  LinkOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const { Text, Title } = Typography;

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

  const [form] = Form.useForm();

  const updateField = useCallback(
    <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => {
      onFormValuesChange({ ...formValues, [field]: value });
    },
    [formValues, onFormValuesChange],
  );

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
    updateField("gitBranch", generatedGitBranch);
  }, [generatedGitBranch, isNewTask, formValues.gitBranch, updateField]); // Refined dependencies to avoid re-triggering unnecessarily

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
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={15}>
        <Card
          title={
            <Space>
              <AppstoreOutlined />
              <span>Description</span>
            </Space>
          }
          className="shadow-sm border-slate-200 dark:border-gray-700 h-full"
          styles={{ body: { padding: 24 } }}
        >
          {formValues.description ? (
            <>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100 prose-pre:text-zinc-900 dark:prose-pre:text-zinc-100"
                dangerouslySetInnerHTML={{ __html: formValues.description }}
              />
              {descriptionImages.length > 0 && (
                <div className="mt-8">
                  <Title level={5} className="mb-4">
                    Attachments
                  </Title>
                  <div className="flex flex-wrap gap-4">
                    {descriptionImages.map((src, idx) => (
                      <button
                        key={src}
                        type="button"
                        className="group relative cursor-pointer overflow-hidden rounded-xl border-2 border-slate-100 transition-all hover:border-blue-400 p-0 shadow-sm"
                        onClick={() => setImageModalUrl(src)}
                      >
                        {/* biome-ignore lint/performance/noImgElement: External dynamic image */}
                        <img
                          src={src}
                          alt={`Attachment ${idx + 1}`}
                          className="h-24 w-24 object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                          <Text className="text-white font-bold drop-shadow-md text-xs">
                            VIEW
                          </Text>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <AppstoreOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <Text type="secondary">No description provided</Text>
            </div>
          )}
        </Card>
      </Col>
      <Col xs={24} lg={9}>
        <Card
          title={
            <Space>
              <FlagOutlined />
              <span>Details</span>
            </Space>
          }
          className="shadow-sm border-slate-200 dark:border-gray-700"
          styles={{ body: { padding: 24 } }}
        >
          <Space direction="vertical" size={20} className="w-full">
            <InfoRow label="Status" icon={<FlagOutlined />}>
              <Tag
                color="blue"
                className="px-3 py-1 rounded-full border-none font-medium"
              >
                {formatStatus(formValues.status)}
              </Tag>
            </InfoRow>

            <InfoRow label="Due Date" icon={<CalendarOutlined />}>
              <Text
                strong={!!formValues.dueDate}
                type={formValues.dueDate ? undefined : "secondary"}
              >
                {formValues.dueDate
                  ? formatDueDate(formValues.dueDate)
                  : "No due date"}
              </Text>
            </InfoRow>

            <InfoRow label="Priority" icon={<FlagOutlined />}>
              <Tag
                color={getPriorityTagColor(formValues.priorityLabel)}
                className="px-3 py-1 rounded-full border-none font-medium"
              >
                {formValues.priorityLabel}
              </Tag>
            </InfoRow>

            <InfoRow label="Complexity" icon={<AppstoreOutlined />}>
              <TaskSizeTag size={formValues.size} />
            </InfoRow>

            <InfoRow label="Assignee" icon={<UserOutlined />}>
              {assignee ? (
                <Space>
                  <AvatarProfile
                    size="small"
                    src={assignee.avatar}
                    userName={assignee.name}
                    userEmail={assignee.email}
                  />
                  <Text strong>{assignee.name}</Text>
                </Space>
              ) : (
                <Text type="secondary">Unassigned</Text>
              )}
            </InfoRow>

            <InfoRow label="Reviewer" icon={<UserOutlined />}>
              {reviewer ? (
                <Space>
                  <AvatarProfile
                    size="small"
                    src={reviewer.avatar}
                    userName={reviewer.name}
                    userEmail={reviewer.email}
                  />
                  <Text strong>{reviewer.name}</Text>
                </Space>
              ) : (
                <Text type="secondary">Auto-assigned</Text>
              )}
            </InfoRow>

            <InfoRow label="Git Branch" icon={<BranchesOutlined />}>
              {formValues.gitBranch ? (
                <Tag
                  color="purple"
                  icon={<BranchesOutlined />}
                  className="m-0 break-all font-mono"
                >
                  {formValues.gitBranch}
                </Tag>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </InfoRow>

            <InfoRow label="Preview" icon={<LinkOutlined />}>
              {formValues.previewLink ? (
                <Button
                  type="link"
                  href={formValues.previewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={<LinkOutlined />}
                  className="p-0 h-auto break-all text-left"
                >
                  Visit Link
                </Button>
              ) : (
                <Text type="secondary">Not available</Text>
              )}
            </InfoRow>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  const editModeContent = (
    <Form
      layout="vertical"
      form={form}
      initialValues={formValues}
      className="task-form-edit"
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={15}>
          <Space direction="vertical" size={24} className="w-full">
            <Card
              className="shadow-sm border-slate-200 dark:border-gray-700"
              styles={{ body: { padding: 24 } }}
            >
              <Form.Item
                label={<Text strong>Task Title</Text>}
                required
                validateStatus={!formValues.title.trim() ? "error" : ""}
                help={!formValues.title.trim() ? "Title is required" : ""}
              >
                <Input
                  value={formValues.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="What needs to be done?"
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>

              <div className="mt-6">
                <Text strong className="block mb-2">
                  Description
                </Text>
                <RichTextEditor
                  content={formValues.description || ""}
                  onChange={(html) => updateField("description", html)}
                />
              </div>
            </Card>

            <Card
              title={
                <Space>
                  <BranchesOutlined />
                  <span>Version Control</span>
                </Space>
              }
              className="shadow-sm border-slate-200 dark:border-gray-700"
              styles={{ body: { padding: 24 } }}
              extra={
                <Button
                  type="link"
                  size="small"
                  onClick={applyGeneratedGitBranch}
                  disabled={!generatedGitBranch}
                >
                  Generate from title
                </Button>
              }
            >
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Form.Item label="Git Branch Name" className="mb-0">
                    <div className="flex gap-2">
                      {branches && branches.length > 0 ? (
                        <Select
                          showSearch
                          loading={isLoadingBranches}
                          value={formValues.gitBranch}
                          onChange={(value) => updateField("gitBranch", value)}
                          placeholder="Select or enter branch"
                          options={branches?.map((branch) => ({
                            label: branch,
                            value: branch,
                          }))}
                          className="flex-1"
                          allowClear
                        />
                      ) : (
                        <Input
                          value={formValues.gitBranch || ""}
                          onChange={(e) =>
                            updateField("gitBranch", e.target.value)
                          }
                          placeholder="feature/branch-name"
                          className="flex-1"
                          allowClear
                        />
                      )}
                      <Button
                        icon={<BranchesOutlined />}
                        onClick={() => setIsModalOpen(true)}
                        disabled={!projectId}
                        title="Create new branch"
                      />
                    </div>
                  </Form.Item>
                </Col>
              </Row>
              <Text type="secondary" className="text-xs mt-2 block">
                Recommended: {generatedGitBranch || "enter title first"}
              </Text>
            </Card>

            <Card
              title={
                <Space>
                  <LinkOutlined />
                  <span>Preview URL</span>
                </Space>
              }
              className="shadow-sm border-slate-200 dark:border-gray-700"
              styles={{ body: { padding: 24 } }}
            >
              <Form.Item className="mb-0">
                <Input
                  value={formValues.previewLink || ""}
                  onChange={(e) => updateField("previewLink", e.target.value)}
                  placeholder="https://preview-link.com"
                  prefix={<LinkOutlined className="text-zinc-400" />}
                  allowClear
                  className="rounded-lg"
                />
              </Form.Item>
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title={
              <Space>
                <FlagOutlined />
                <span>Status & Details</span>
              </Space>
            }
            className="shadow-sm border-slate-200 dark:border-gray-700"
            styles={{ body: { padding: 24 } }}
          >
            <Space direction="vertical" size={20} className="w-full">
              <Form.Item label={<Text strong>Status</Text>} className="mb-0">
                <Select<TaskStatus>
                  value={formValues.status}
                  onChange={(value) => updateField("status", value)}
                  options={getAllowedTaskTransitions({
                    from: formValues.status,
                    userRole,
                    projectRole,
                    reviewerId: formValues.reviewerId,
                    userId,
                  }).map((status) => ({
                    label: formatStatus(status),
                    value: status,
                  }))}
                  className="w-full"
                />
              </Form.Item>

              <Form.Item label={<Text strong>Due Date</Text>} className="mb-0">
                <DatePicker
                  value={formValues.dueDate ? dayjs(formValues.dueDate) : null}
                  onChange={(date) =>
                    updateField(
                      "dueDate",
                      date ? date.format("YYYY-MM-DD") : "",
                    )
                  }
                  className="w-full"
                  placeholder="Select due date"
                />
              </Form.Item>

              <Form.Item label={<Text strong>Priority</Text>} className="mb-0">
                <Segmented
                  block
                  options={PRIORITY_LABELS.map((label) => ({
                    label: <span className="text-xs px-1">{label}</span>,
                    value: label,
                  }))}
                  value={formValues.priorityLabel}
                  onChange={(value) =>
                    updateField("priorityLabel", value as PriorityLabel)
                  }
                />
              </Form.Item>

              <Form.Item
                label={<Text strong>Complexity (Size)</Text>}
                className="mb-0"
              >
                <Segmented
                  block
                  options={TASK_SIZE_OPTIONS}
                  value={formValues.size}
                  onChange={(value) => updateField("size", value as TaskSize)}
                />
              </Form.Item>

              <Form.Item label={<Text strong>Assignee</Text>} className="mb-0">
                <Select
                  value={formValues.assigneeId}
                  onChange={(value) => updateField("assigneeId", value ?? null)}
                  placeholder="Assign to member"
                  allowClear
                  showSearch
                  optionLabelProp="label"
                  filterOption={(input, option) =>
                    (option?.searchValue as string)
                      ?.toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={members.map((m) => ({
                    value: m.id,
                    searchValue: m.name,
                    label: (
                      <Space>
                        <AvatarProfile
                          size="small"
                          src={m.avatar}
                          userName={m.name}
                          userEmail={m.email}
                        />
                        <span>{m.name}</span>
                      </Space>
                    ),
                  }))}
                  className="w-full"
                />
              </Form.Item>

              <Form.Item label={<Text strong>Reviewer</Text>} className="mb-0">
                <Select
                  value={formValues.reviewerId}
                  onChange={(value) => updateField("reviewerId", value ?? null)}
                  placeholder="Select reviewer"
                  allowClear
                  showSearch
                  optionLabelProp="label"
                  filterOption={(input, option) =>
                    (option?.searchValue as string)
                      ?.toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={members.map((m) => ({
                    value: m.id,
                    searchValue: m.name,
                    label: (
                      <Space>
                        <AvatarProfile
                          size="small"
                          src={m.avatar}
                          userName={m.name}
                          userEmail={m.email}
                        />
                        <span>{m.name}</span>
                      </Space>
                    ),
                  }))}
                  className="w-full"
                />
              </Form.Item>
            </Space>
          </Card>
        </Col>
      </Row>
    </Form>
  );

  return (
    <>
      <div className="task-form-container">
        {isEditing ? editModeContent : viewModeContent}
      </div>

      <Modal
        title="Create New Git Branch"
        open={isModalOpen}
        onOk={handleCreateBranch}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={isCreatingBranch}
        okButtonProps={{ disabled: !newBranchName || !sourceBranch }}
        centered
        destroyOnClose
      >
        <Space direction="vertical" size={20} className="w-full mt-4">
          <div>
            <Text strong className="block mb-2">
              Source Branch
            </Text>
            <Select
              showSearch
              value={sourceBranch}
              onChange={setSourceBranch}
              placeholder="Select source branch"
              options={branches?.map((branch) => ({
                label: branch,
                value: branch,
              }))}
              className="w-full"
            />
          </div>
          <div>
            <Text strong className="block mb-2">
              New Branch Name
            </Text>
            <Input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="e.g. feature/add-user-auth"
              prefix={<BranchesOutlined className="text-zinc-400" />}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        open={!!imageModalUrl}
        onCancel={() => setImageModalUrl("")}
        footer={null}
        width={1000}
        centered
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col bg-zinc-950 rounded-lg overflow-hidden">
          <div className="p-4 flex justify-center items-center min-h-[400px]">
            {/* biome-ignore lint/performance/noImgElement: External dynamic image */}
            <img
              src={imageModalUrl}
              alt="Preview"
              className="max-w-full max-h-[75vh] object-contain shadow-2xl"
            />
          </div>
          {descriptionImages.length > 1 && (
            <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center">
                {descriptionImages.map((src, idx) => (
                  <button
                    key={src}
                    type="button"
                    className={cn(
                      "w-16 h-16 shrink-0 overflow-hidden rounded-lg cursor-pointer border-2 transition-all p-0",
                      imageModalUrl === src
                        ? "border-blue-500 scale-105 shadow-lg"
                        : "border-transparent opacity-40 hover:opacity-100",
                    )}
                    onClick={() => setImageModalUrl(src)}
                  >
                    {/* biome-ignore lint/performance/noImgElement: External dynamic image */}
                    <img
                      src={src}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
