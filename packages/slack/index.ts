import "server-only";

import { WebClient } from "@slack/web-api";
import { decrypt } from "@/lib/crypto";
import { publicEnv } from "@/packages/env";

export type SlackBlock = {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: unknown[];
  accessory?: unknown;
  fields?: { type: string; text: string }[];
};

export const sendSlackMessageWithToken = async (
  encryptedToken: string,
  channel: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<boolean> => {
  if (!channel) {
    console.warn("[Slack] No channel configured, skipping notification");
    return false;
  }

  let token: string;
  try {
    token = decrypt(encryptedToken);
  } catch (error) {
    console.error("[Slack] Failed to decrypt token:", error);
    return false;
  }

  const slack = new WebClient(token);

  try {
    await slack.chat.postMessage({
      channel,
      text,
      blocks,
    });
    return true;
  } catch (error) {
    console.error("[Slack] Failed to send message:", error);
    return false;
  }
};

export const buildTaskReviewMessage = (params: {
  taskId: string;
  taskTitle: string;
  assigneeName: string | null;
  taskUrl: string;
  previousStatus?: string;
}) => {
  const { taskId, taskTitle, assigneeName, taskUrl, previousStatus } = params;

  const headerText = previousStatus
    ? `*Task moved to In Review*`
    : `*New task in Review*`;

  const fields = [];
  if (assigneeName) {
    fields.push({ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` });
  }
  fields.push({ type: "mrkdwn", text: `*Status:*\nIn Review` });

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🔍 Task Ready for Review",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: headerText,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Task",
          emoji: true,
        },
        url: taskUrl,
        action_id: "view_task",
      },
    },
    {
      type: "section",
      fields: fields,
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task:* ${taskTitle}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `ID: ${taskId}`,
        },
      ],
    },
  ];

  const fallbackText = previousStatus
    ? `[${taskId}] ${taskTitle} moved from ${previousStatus} to In Review (Assigned: ${assigneeName ?? "Unassigned"})`
    : `[${taskId}] ${taskTitle} is now In Review (Assigned: ${assigneeName ?? "Unassigned"})`;

  return { blocks, text: fallbackText };
};

export const getTaskUrl = (taskId: string): string => {
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  return `${baseUrl}/tasks/${taskId}`;
};

export const encryptSlackToken = (token: string): string => {
  return encrypt(token);
};

export const decryptSlackToken = (encryptedToken: string): string => {
  return decrypt(encryptedToken);
};

import { encrypt } from "@/lib/crypto";
