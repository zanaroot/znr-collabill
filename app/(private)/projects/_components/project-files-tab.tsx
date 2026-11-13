"use client";

import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  InboxOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  App,
  Button,
  Checkbox,
  Empty,
  Flex,
  Image,
  Modal,
  Skeleton,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import {
  type ProjectFile,
  useDeleteProjectFile,
  useDownloadProjectFile,
  useProjectFiles,
  useUpdateProjectFile,
  useUploadProjectFile,
} from "@/app/(private)/projects/_hooks/use-project-files";
import { useProjectMembers } from "@/app/(private)/projects/_hooks/use-projects";
import { useCurrentUser } from "@/app/(private)/team-management/_hooks/use-team";
import {
  isPreviewableProjectTextFile,
  MAX_PROJECT_FILE_SIZE,
} from "@/lib/project-files";
import { ProjectFileTextDrawer } from "./project-file-text-drawer";

const { Dragger } = Upload;
const { Text } = Typography;
const pageSize = 20;
const previewableMimeTypes = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
]);
const imageMimeTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface ProjectFilesTabProps {
  projectId: string;
}

const getExtension = (name: string) =>
  name.includes(".")
    ? (name.split(".").at(-1)?.toUpperCase() ?? "FILE")
    : "FILE";

const getExtensionColor = (extension: string) => {
  if (["PDF", "DOC", "DOCX"].includes(extension)) return "red";
  if (["XLS", "XLSX", "CSV"].includes(extension)) return "green";
  if (["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(extension)) return "blue";
  if (["ZIP", "RAR", "7Z"].includes(extension)) return "purple";
  return "default";
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getFileEndpoint = (
  projectId: string,
  fileId: string,
  action: "download" | "preview",
) => `/api/projects/${projectId}/files/${fileId}/${action}`;

const isTextFile = (file: ProjectFile) =>
  isPreviewableProjectTextFile(file.name, file.mimeType);

const isPreviewableFile = (file: ProjectFile) =>
  previewableMimeTypes.has(file.mimeType) || isTextFile(file);

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const { message, modal } = App.useApp();
  const [page, setPage] = useState(1);
  const [isSensitive, setIsSensitive] = useState(false);
  const [replacementSensitive, setReplacementSensitive] = useState(false);
  const [replacementTarget, setReplacementTarget] =
    useState<ProjectFile | null>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [textFile, setTextFile] = useState<ProjectFile | null>(null);

  const { data: currentUser } = useCurrentUser();
  const { data: members } = useProjectMembers(projectId);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useProjectFiles(projectId, page, pageSize);
  const uploadMutation = useUploadProjectFile();
  const downloadMutation = useDownloadProjectFile();
  const updateMutation = useUpdateProjectFile();
  const deleteMutation = useDeleteProjectFile();

  const canManageFiles = Boolean(
    currentUser?.organizationRole === "OWNER" ||
      currentUser?.organizationRole === "ADMIN" ||
      members?.some(
        (member) =>
          member.id === currentUser?.id &&
          member.projectRole === "PRODUCT_OWNER",
      ),
  );

  const openPreview = (file: ProjectFile) => {
    const showPreview = () => {
      if (isTextFile(file)) {
        setTextFile(file);
      } else {
        setPreviewFile(file);
      }
    };

    if (isTextFile(file)) {
      showPreview();
      return;
    }

    if (file.isSensitive && !canManageFiles) {
      return;
    }

    if (!file.isSensitive) {
      showPreview();
      return;
    }

    modal.confirm({
      title: "Preview sensitive file?",
      content:
        "This file may contain secrets. Only reveal it if you are authorized to view its contents.",
      okText: "Preview file",
      cancelText: "Cancel",
      onOk: showPreview,
    });
  };

  const downloadFile = async (file: ProjectFile) => {
    try {
      await downloadMutation.mutateAsync({
        projectId,
        fileId: file.id,
        fileName: file.name,
      });
    } catch (downloadError) {
      message.error(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the file",
      );
    }
  };

  const handleDownload = (file: ProjectFile) => {
    if (file.isSensitive) {
      modal.confirm({
        title: "Download sensitive file?",
        content:
          "This file may contain secrets. Only download it if you are authorized to access its contents.",
        okText: "Download file",
        cancelText: "Cancel",
        onOk: () => downloadFile(file),
      });
      return;
    }

    void downloadFile(file);
  };

  const customRequest: UploadProps["customRequest"] = ({
    file,
    onError,
    onSuccess,
  }) => {
    if (!(file instanceof File)) {
      const uploadError = new Error("A local file is required");
      message.error(uploadError.message);
      onError?.(uploadError);
      return;
    }

    if (file.size > MAX_PROJECT_FILE_SIZE) {
      const uploadError = new Error("The file exceeds the 50MB limit");
      message.error(uploadError.message);
      onError?.(uploadError);
      return;
    }

    const operation = replacementTarget
      ? updateMutation.mutateAsync({
          projectId,
          fileId: replacementTarget.id,
          file,
          isSensitive: replacementSensitive,
        })
      : uploadMutation.mutateAsync({ projectId, file, isSensitive });

    void operation
      .then(() => {
        message.success(
          replacementTarget
            ? "File replaced successfully"
            : "File uploaded successfully",
        );
        onSuccess?.({});
        if (replacementTarget) {
          setReplacementTarget(null);
          setReplacementSensitive(false);
        }
      })
      .catch((uploadError: unknown) => {
        const errorMessage =
          uploadError instanceof Error
            ? uploadError.message
            : "Unable to upload the file";
        message.error(errorMessage);
        onError?.(
          uploadError instanceof Error ? uploadError : new Error(errorMessage),
        );
      });
  };

  const handleDelete = (file: ProjectFile) => {
    modal.confirm({
      title: "Delete project file?",
      content: `“${file.name}” will be permanently deleted.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync({ projectId, fileId: file.id });
          message.success("File deleted successfully");
          if (data?.files.length === 1 && page > 1) setPage(page - 1);
        } catch (deleteError) {
          message.error(
            deleteError instanceof Error
              ? deleteError.message
              : "Unable to delete the file",
          );
        }
      },
    });
  };

  const columns: ColumnsType<ProjectFile> = [
    {
      title: "File",
      dataIndex: "name",
      key: "name",
      render: (name: string, file) => (
        <Flex vertical gap={4}>
          <Flex align="center" gap={8} wrap>
            <Text strong>{name}</Text>
            {file.isSensitive && <Tag color="volcano">Sensitive</Tag>}
          </Flex>
          <Tag
            color={getExtensionColor(getExtension(name))}
            style={{ width: "fit-content" }}
          >
            {getExtension(name)}
          </Tag>
        </Flex>
      ),
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: formatFileSize,
    },
    {
      title: "Type",
      dataIndex: "mimeType",
      key: "mimeType",
      responsive: ["md", "lg", "xl"],
      render: (mimeType: string) => <Text type="secondary">{mimeType}</Text>,
    },
    {
      title: "Uploaded by",
      dataIndex: "uploadedByName",
      key: "uploadedByName",
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "Uploaded at",
      dataIndex: "createdAt",
      key: "createdAt",
      responsive: ["md", "lg", "xl"],
      render: (createdAt: string) => new Date(createdAt).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 144,
      render: (_, file) => (
        <Flex gap={4}>
          <Tooltip
            title={
              file.isSensitive && !canManageFiles
                ? "Sensitive files are restricted to organization admins and project owners"
                : "Download"
            }
          >
            <Button
              type="text"
              icon={<DownloadOutlined />}
              aria-label={`Download ${file.name}`}
              disabled={file.isSensitive && !canManageFiles}
              loading={
                downloadMutation.isPending &&
                downloadMutation.variables?.fileId === file.id
              }
              onClick={() => handleDownload(file)}
            />
          </Tooltip>
          {isPreviewableFile(file) && (
            <Tooltip
              title={
                file.isSensitive && !canManageFiles
                  ? "Sensitive files are restricted to organization admins and project owners"
                  : "Preview"
              }
            >
              <Button
                type="text"
                icon={<EyeOutlined />}
                aria-label={`Preview ${file.name}`}
                disabled={file.isSensitive && !canManageFiles}
                onClick={() => openPreview(file)}
              />
            </Tooltip>
          )}
          {canManageFiles && (
            <>
              <Tooltip title="Replace">
                <Button
                  type="text"
                  icon={<SwapOutlined />}
                  aria-label={`Replace ${file.name}`}
                  onClick={() =>
                    modal.confirm({
                      title: "Replace project file?",
                      content: `The content of “${file.name}” will be permanently replaced after you select a file.`,
                      okText: "Continue",
                      cancelText: "Cancel",
                      onOk: () => {
                        setReplacementSensitive(file.isSensitive);
                        setReplacementTarget(file);
                      },
                    })
                  }
                />
              </Tooltip>
              <Tooltip title="Delete">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Delete ${file.name}`}
                  loading={
                    deleteMutation.isPending &&
                    deleteMutation.variables?.fileId === file.id
                  }
                  onClick={() => handleDelete(file)}
                />
              </Tooltip>
            </>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Text type="secondary">
          Files are stored privately. Sensitive file content is restricted to
          organization owners/admins and project product owners.
        </Text>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Refresh
        </Button>
      </Flex>

      <Checkbox
        checked={isSensitive}
        onChange={(event) => setIsSensitive(event.target.checked)}
      >
        Mark uploaded files as sensitive
      </Checkbox>
      <Dragger
        multiple
        customRequest={customRequest}
        disabled={uploadMutation.isPending || updateMutation.isPending}
        showUploadList
      >
        <Flex vertical align="center" gap={8}>
          <InboxOutlined style={{ fontSize: 32, color: "#1677ff" }} />
          <Text strong>Click or drag files here to upload</Text>
          <Text type="secondary">Maximum file size: 50 MB</Text>
        </Flex>
      </Dragger>

      {isError ? (
        <Text type="danger">
          {error instanceof Error
            ? error.message
            : "Unable to load project files"}
        </Text>
      ) : isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : data?.files.length ? (
        <Table
          columns={columns}
          dataSource={data.files}
          rowKey="id"
          size="small"
          scroll={{ x: "max-content" }}
          pagination={{
            current: page,
            pageSize,
            total: data.total,
            showSizeChanger: false,
            onChange: setPage,
          }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No files have been added to this project yet"
        />
      )}

      <Modal
        title={`Replace ${replacementTarget?.name ?? "file"}`}
        open={!!replacementTarget}
        onCancel={() => {
          setReplacementTarget(null);
          setReplacementSensitive(false);
        }}
        footer={null}
        destroyOnHidden
      >
        <Flex vertical gap={16}>
          <Checkbox
            checked={replacementSensitive}
            onChange={(event) => setReplacementSensitive(event.target.checked)}
            disabled={replacementTarget?.isSensitive}
          >
            Mark as sensitive
          </Checkbox>
          <Dragger
            maxCount={1}
            customRequest={customRequest}
            disabled={updateMutation.isPending}
            showUploadList
          >
            <Flex vertical align="center" gap={8}>
              <InboxOutlined style={{ fontSize: 32, color: "#1677ff" }} />
              <Text strong>Click or drag a replacement file here</Text>
              <Text type="secondary">Maximum file size: 50 MB</Text>
            </Flex>
          </Dragger>
        </Flex>
      </Modal>

      <ProjectFileTextDrawer
        projectId={projectId}
        file={textFile}
        canAccessSensitiveFiles={canManageFiles}
        canEdit={canManageFiles}
        onClose={() => setTextFile(null)}
      />

      <Modal
        title={previewFile?.name}
        open={!!previewFile}
        onCancel={() => setPreviewFile(null)}
        footer={null}
        width={900}
        destroyOnHidden
      >
        {previewFile &&
          (imageMimeTypes.has(previewFile.mimeType) ? (
            <Image
              src={getFileEndpoint(projectId, previewFile.id, "preview")}
              alt={previewFile.name}
              width="100%"
              style={{ maxHeight: "70vh", objectFit: "contain" }}
              preview={false}
            />
          ) : (
            <iframe
              title={previewFile.name}
              src={getFileEndpoint(projectId, previewFile.id, "preview")}
              width="100%"
              height="650"
              referrerPolicy="no-referrer"
              sandbox=""
            />
          ))}
      </Modal>
    </Flex>
  );
}
