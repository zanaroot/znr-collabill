"use client";

import { CommentOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input, List, message, Spin, Typography } from "antd";
import { useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { client } from "@/packages/hono";

const { TextArea } = Input;
const { Paragraph } = Typography;

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

type InvoiceCommentsProps = {
  invoiceId: string | null;
};

export const InvoiceComments = ({ invoiceId }: InvoiceCommentsProps) => {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["invoice-comments", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const res = await client.api["invoice-comments"].invoice[
        ":invoiceId"
      ].$get({
        param: { invoiceId },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch comments");
      }
      return res.json() as Promise<Comment[]>;
    },
    enabled: !!invoiceId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!invoiceId) throw new Error("Invoice ID is required");
      const res = await client.api["invoice-comments"].invoice[
        ":invoiceId"
      ].$post({
        param: { invoiceId },
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
        queryKey: ["invoice-comments", invoiceId],
      });
      message.success("Comment added");
    },
    onError: () => {
      message.error("Failed to add comment");
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  if (!invoiceId) {
    return (
      <Card className="no-print">
        <div className="text-center text-gray-400 py-8">
          <CommentOutlined className="text-3xl mb-2" />
          <p>Validate the invoice to enable comments</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <CommentOutlined />
          Comments {comments && comments.length > 0 && `(${comments.length})`}
        </span>
      }
      className="no-print mt-6"
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
              <List.Item>
                <div className="flex gap-3 w-full">
                  <AvatarProfile
                    src={comment.user.avatar}
                    userName={comment.user.name}
                    userEmail={comment.user.email}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Typography.Text strong>
                        {comment.user.name}
                      </Typography.Text>
                      <Typography.Text type="secondary" className="text-xs">
                        {new Date(comment.createdAt).toLocaleString()}
                      </Typography.Text>
                    </div>
                    <Paragraph className="mb-0 whitespace-pre-wrap">
                      {comment.content}
                    </Paragraph>
                  </div>
                </div>
              </List.Item>
            )}
          />

          <div className="mt-4 flex gap-3">
            <TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              maxLength={2000}
              showCount
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={addCommentMutation.isPending}
              disabled={!newComment.trim()}
            >
              Add Comment
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
