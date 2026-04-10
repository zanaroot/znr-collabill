"use client";

import {
  Button,
  Flex,
  Input,
  Modal,
  message,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { type ReactNode, useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { RichTextEditor } from "@/app/_components/editor/rich-text-editor";
import { TaskSizeTag } from "@/app/_components/task-size-tag";
import {
  useCreateProjectBranch,
  useProjectBranches,
} from "@/app/(private)/projects/_hooks/use-projects";
import type { TaskSize, TaskStatus } from "@/http/models/task.model";
import { TASK_SIZES } from "@/http/models/task.model";
import type { Role } from "@/http/models/user.model";
import { formatDueDate } from "@/lib/date";
import {
  getPriorityTagColor,
  PRIORITY_LABELS,
  type PriorityLabel,
  type TaskFormValues,
} from "@/lib/priority";
import { formatStatus } from "@/lib/status-task";
import { getAllowedTaskTransitions } from "@/lib/task-workflow";
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
  userRole?: Role;
};

export function TaskForm({
  formValues,
  onFormValuesChange,
  isEditing,
  members,
  projectId,
  userRole,
}: TaskFormProps) {
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

  const renderField = (editComponent: ReactNode, viewComponent?: ReactNode) =>
    isEditing ? editComponent : viewComponent;

  const assignee = formValues.assigneeId
    ? members.find((m) => m.id === formValues.assigneeId)
    : null;

  return (
    <Space vertical size={12} style={{ width: "100%" }}>
      {renderField(
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
        </div>,
      )}

      {renderField(
        <RichTextEditor
          content={formValues.description || ""}
          onChange={(html) => updateField("description", html)}
        />,
        <InfoRow>
          {formValues.description ? (
            <div className="max-w-[50%]">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100 prose-pre:text-zinc-900 dark:prose-pre:text-zinc-100"
                dangerouslySetInnerHTML={{ __html: formValues.description }}
              />
              <Flex className="mt-3" gap={8} wrap>
                {Array.from(
                  new DOMParser()
                    .parseFromString(formValues.description, "text/html")
                    .querySelectorAll("img"),
                ).map((img) => (
                  <Button
                    key={img.src}
                    type="link"
                    onClick={() => setImageModalUrl(img.src)}
                  >
                    View Image
                  </Button>
                ))}
              </Flex>
            </div>
          ) : (
            <Typography.Text type="secondary">No description</Typography.Text>
          )}
        </InfoRow>,
      )}

      {renderField(
        <div className="task-form-grid">
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
                }).map((status) => ({
                  label: <span>{formatStatus(status)}</span>,
                  value: status,
                }))}
                style={{ width: "100%" }}
              />
            </Space>
          </div>
        </div>,

        <>
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
        </>,
      )}

      {renderField(
        <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Space vertical size={12} style={{ width: "100%" }}>
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

            <Space vertical size={8} style={{ width: "100%" }}>
              <Text strong>Size</Text>
              <Segmented
                options={TASK_SIZE_OPTIONS}
                value={formValues.size}
                onChange={(value) => updateField("size", value as TaskSize)}
                block
              />
            </Space>
          </Space>
        </div>,

        <>
          <InfoRow label="Priority">
            <Tag color={getPriorityTagColor(formValues.priorityLabel)}>
              {formValues.priorityLabel}
            </Tag>
          </InfoRow>

          <InfoRow label="Size">
            <TaskSizeTag size={formValues.size} />
          </InfoRow>
        </>,
      )}

      {renderField(
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
        </div>,

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
        </InfoRow>,
      )}

      {renderField(
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
          </Space>
        </div>,

        <InfoRow label="Git Branch">
          <Typography.Text code>{formValues.gitBranch || "—"}</Typography.Text>
        </InfoRow>,
      )}

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
        width="90vw"
        centered
      >
        <div
          style={{
            width: "100%",
            height: "80vh",
            backgroundImage: `url(${imageModalUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </Modal>
    </Space>
  );
}
