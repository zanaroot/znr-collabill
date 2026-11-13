"use client";

import { App, Button, Drawer, Flex, Input, Skeleton, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import {
  type ProjectFile,
  useUpdateProjectFile,
} from "@/app/(private)/projects/_hooks/use-project-files";
import { MAX_PROJECT_FILE_SIZE } from "@/lib/project-files";

const { Text } = Typography;
const { TextArea } = Input;

interface ProjectFileTextDrawerProps {
  projectId: string;
  file: ProjectFile | null;
  canAccessSensitiveFiles: boolean;
  canEdit: boolean;
  onClose: () => void;
}

const getPreviewUrl = (projectId: string, fileId: string) =>
  `/api/projects/${projectId}/files/${fileId}/preview`;

const fetchTextFile = async (
  projectId: string,
  fileId: string,
  signal: AbortSignal,
) => {
  const response = await fetch(getPreviewUrl(projectId, fileId), {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || "Unable to load the file");
  }

  return response.text();
};

export function ProjectFileTextDrawer({
  projectId,
  file,
  canAccessSensitiveFiles,
  canEdit,
  onClose,
}: ProjectFileTextDrawerProps) {
  const { message, modal } = App.useApp();
  const updateMutation = useUpdateProjectFile();
  const requestRef = useRef<AbortController | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const isOpen = file !== null;

  useEffect(() => {
    setContent(null);
    setDraftContent(null);
    setLoadError(null);
    setIsEditing(false);

    if (!file || file.isSensitive) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);

    void fetchTextFile(projectId, file.id, controller.signal)
      .then(setContent)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadError(
          error instanceof Error ? error.message : "Unable to load the file",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
      if (requestRef.current === controller) requestRef.current = null;
    };
  }, [file, projectId]);

  const revealContent = () => {
    if (!file || !file.isSensitive || !canAccessSensitiveFiles) return;

    modal.confirm({
      title: "Reveal sensitive file content?",
      content:
        "The file may contain credentials or other secrets. Its content will be shown only in this drawer.",
      okText: "Reveal content",
      cancelText: "Cancel",
      onOk: async () => {
        const controller = new AbortController();
        requestRef.current = controller;
        setIsLoading(true);
        setLoadError(null);

        try {
          setContent(
            await fetchTextFile(projectId, file.id, controller.signal),
          );
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          const errorMessage =
            error instanceof Error ? error.message : "Unable to load the file";
          setLoadError(errorMessage);
          message.error(errorMessage);
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
          if (requestRef.current === controller) requestRef.current = null;
        }
      },
    });
  };

  const hideSensitiveContent = () => {
    modal.confirm({
      title: "Hide sensitive content?",
      content: isEditing
        ? "The unsaved edits will be discarded."
        : "The content will be hidden from view.",
      okText: isEditing ? "Discard and hide" : "Hide content",
      cancelText: "Keep visible",
      onOk: () => {
        requestRef.current?.abort();
        setContent(null);
        setDraftContent(null);
        setIsEditing(false);
      },
    });
  };

  const closeDrawer = () => {
    if (isEditing && draftContent !== content) {
      modal.confirm({
        title: "Discard unsaved changes?",
        content: "Your edits will be lost.",
        okText: "Discard",
        okButtonProps: { danger: true },
        cancelText: "Continue editing",
        onOk: onClose,
      });
      return;
    }

    onClose();
  };

  const saveChanges = () => {
    if (!file || draftContent === null) return;
    if (!draftContent.length) {
      message.error("The file must not be empty");
      return;
    }

    const replacement = new File([draftContent], file.name, {
      type: file.mimeType || "text/plain",
      lastModified: Date.now(),
    });

    if (replacement.size > MAX_PROJECT_FILE_SIZE) {
      message.error("The file exceeds the 50MB limit");
      return;
    }

    modal.confirm({
      title: "Replace the existing file content?",
      content: `This will permanently replace the content of “${file.name}”.`,
      okText: "Replace content",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await updateMutation.mutateAsync({
            projectId,
            fileId: file.id,
            file: replacement,
            isSensitive: file.isSensitive,
          });
          setContent(draftContent);
          setDraftContent(null);
          setIsEditing(false);
          message.success("File content saved");
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : "Unable to save changes",
          );
        }
      },
    });
  };

  const startEditing = () => {
    if (content === null) return;
    setDraftContent(content);
    setIsEditing(true);
  };

  return (
    <Drawer
      title={file?.name ?? "Text file"}
      open={isOpen}
      onClose={closeDrawer}
      width={720}
      destroyOnHidden
      extra={
        file?.isSensitive && content !== null && !isEditing ? (
          <Button onClick={hideSensitiveContent}>Hide content</Button>
        ) : null
      }
      footer={
        isEditing ? (
          <Flex justify="flex-end" gap={8}>
            <Button
              onClick={() => {
                setDraftContent(null);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={saveChanges}
              loading={updateMutation.isPending}
              disabled={draftContent === content}
            >
              Save changes
            </Button>
          </Flex>
        ) : undefined
      }
    >
      {file?.isSensitive && content === null ? (
        <Flex vertical gap={12}>
          <Text type="warning">
            Sensitive content is hidden by default. Access is restricted to
            organization owners/admins and project product owners.
          </Text>
          {!canAccessSensitiveFiles ? (
            <Text type="secondary">
              You do not have permission to reveal this file.
            </Text>
          ) : (
            <Button
              type="primary"
              onClick={revealContent}
              loading={isLoading}
              disabled={isLoading}
            >
              Reveal sensitive content
            </Button>
          )}
        </Flex>
      ) : isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : loadError ? (
        <Flex vertical gap={12}>
          <Text type="danger">{loadError}</Text>
          <Button
            onClick={() => {
              if (file?.isSensitive) {
                revealContent();
                return;
              }
              if (!file) return;
              const controller = new AbortController();
              requestRef.current = controller;
              setIsLoading(true);
              setLoadError(null);
              void fetchTextFile(projectId, file.id, controller.signal)
                .then(setContent)
                .catch((error: unknown) => {
                  if (error instanceof Error && error.name === "AbortError")
                    return;
                  setLoadError(
                    error instanceof Error
                      ? error.message
                      : "Unable to load the file",
                  );
                })
                .finally(() => {
                  if (!controller.signal.aborted) setIsLoading(false);
                });
            }}
          >
            Retry
          </Button>
        </Flex>
      ) : content !== null ? (
        <Flex vertical gap={12}>
          {!isEditing && (
            <Flex justify="space-between" align="center">
              <Text type="secondary">
                Content is displayed as plain text and is never executed.
              </Text>
              {canEdit && (
                <Button type="primary" onClick={startEditing}>
                  Edit
                </Button>
              )}
            </Flex>
          )}
          <TextArea
            value={isEditing ? (draftContent ?? "") : content}
            onChange={(event) => setDraftContent(event.target.value)}
            readOnly={!isEditing}
            autoSize={{ minRows: 16, maxRows: 32 }}
            spellCheck={false}
            aria-label={isEditing ? "Edit file content" : "File content"}
          />
        </Flex>
      ) : null}
    </Drawer>
  );
}
