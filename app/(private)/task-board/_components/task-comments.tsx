"use client";

import {
  CommentOutlined,
  EditOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Card,
  Input,
  List,
  message,
  Spin,
  Typography,
} from "antd";
import { useState } from "react";
import { useCurrentUser } from "@/app/(private)/team-management/_hooks/use-team";
import { client } from "@/packages/hono";

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
};

type TaskCommentsProps = {
  taskId: string | null;
};

const CommentItem = ({
  comment,
  isAuthor,
  onUpdate,
}: {
  comment: Comment;
  isAuthor: boolean;
  onUpdate: (id: string, content: string) => Promise<void>;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(comment.id, editContent.trim());
      setIsEditing(false);
    } catch {
      message.error("Failed to update comment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <List.Item>
      <div className="flex gap-3 w-full">
        <Avatar
          icon={<UserOutlined />}
          src={comment.user.avatar}
          alt={comment.user.name}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Text strong>{comment.user.name}</Text>
              <Text type="secondary" className="text-xs">
                {new Date(comment.createdAt).toLocaleString()}
                {comment.updatedAt !== comment.createdAt && " (edited)"}
              </Text>
            </div>
            {isAuthor && !isEditing && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
              />
            )}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <TextArea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button size="small" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={!editContent.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <Paragraph className="mb-0 whitespace-pre-wrap text-slate-600 dark:text-gray-300">
              {comment.content}
            </Paragraph>
          )}
        </div>
      </div>
    </List.Item>
  );
};

export const TaskComments = ({ taskId }: TaskCommentsProps) => {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await client.api["task-comments"].task[":taskId"].$get({
        param: { taskId },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch comments");
      }
      return res.json() as Promise<Comment[]>;
    },
    enabled: !!taskId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!taskId) throw new Error("Task ID is required");
      const res = await client.api["task-comments"].task[":taskId"].$post({
        param: { taskId },
        json: { content },
      });
      if (!res.ok) {
        throw new Error("Failed to add comment");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({
        queryKey: ["task-comments", taskId],
      });
      message.success("Comment added");
    },
    onError: () => {
      message.error("Failed to add comment");
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await client.api["task-comments"][":commentId"].$put({
        param: { commentId: id },
        json: { content },
      });
      if (!res.ok) {
        throw new Error("Failed to update comment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["task-comments", taskId],
      });
      message.success("Comment updated");
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const handleUpdate = async (id: string, content: string) => {
    await updateCommentMutation.mutateAsync({ id, content });
  };

  if (!taskId) return null;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <CommentOutlined />
          Comments {comments && comments.length > 0 && `(${comments.length})`}
        </span>
      }
      className="mt-8 shadow-sm border-slate-200 dark:border-gray-700"
      styles={{ body: { padding: "16px" } }}
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <>
          <List
            dataSource={comments || []}
            locale={{ emptyText: "No comments yet. Be the first to comment!" }}
            renderItem={(comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isAuthor={currentUser?.id === comment.user.id}
                onUpdate={handleUpdate}
              />
            )}
          />

          <div className="mt-6 flex flex-col gap-3">
            <TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              maxLength={2000}
              showCount
              className="rounded-lg border-slate-200 dark:border-gray-700"
            />
            <div className="flex justify-end">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={addCommentMutation.isPending}
                disabled={!newComment.trim()}
                className="rounded-lg"
              >
                Add Comment
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
