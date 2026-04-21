import "server-only";

import { WebClient } from "@slack/web-api";
import { decrypt, encrypt } from "@/lib/crypto";

export type SlackBlock = {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: unknown[];
  accessory?: unknown;
  fields?: { type: string; text: string }[];
};

export type SlackCredentials = {
  botToken: string;
  defaultChannel?: string;
};

export const createSlackClient = (credentials: SlackCredentials) => {
  return new WebClient(credentials.botToken);
};

export const sendSlackMessageWithCredentials = async (
  credentials: SlackCredentials,
  channel: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<boolean> => {
  if (!channel) {
    console.warn("[Slack] No channel configured, skipping notification");
    return false;
  }

  const slack = createSlackClient(credentials);

  try {
    await slack.chat.postMessage({
      channel,
      text,
      blocks,
    });
    return true;
  } catch (error) {
    const err = error as { data?: { error?: string } };
    if (err.data?.error === "not_in_channel") {
      console.error(
        "[Slack] Bot is not in the channel. Invite the bot to the channel first using /invite @bot-name",
      );
    } else {
      console.error("[Slack] Failed to send message:", error);
    }
    return false;
  }
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
    const err = error as { data?: { error?: string } };
    if (err.data?.error === "not_in_channel") {
      console.error(
        "[Slack] Bot is not in the channel. Invite the bot to the channel first using /invite @bot-name",
      );
    } else {
      console.error("[Slack] Failed to send message:", error);
    }
    return false;
  }
};

export const buildTaskReviewMessage = (params: {
  taskId: string;
  taskTitle: string;
  projectName: string;
  assigneeName: string | null;
  taskUrl: string;
  previousStatus?: string;
}) => {
  const {
    taskId,
    taskTitle,
    projectName,
    assigneeName,
    taskUrl,
    previousStatus,
  } = params;

  const headerText = previousStatus
    ? `*Task moved to In Review*`
    : `*New task in Review*`;

  const fields = [];
  if (assigneeName) {
    fields.push({ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` });
  }
  fields.push({ type: "mrkdwn", text: `*Status:*\nIn Review` });
  fields.push({ type: "mrkdwn", text: `*Project:*\n${projectName}` });

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

export const buildTaskCommentMessage = (params: {
  taskId: string;
  taskTitle: string;
  projectName: string;
  assigneeName: string | null;
  taskUrl: string;
}) => {
  const { taskId, taskTitle, projectName, assigneeName, taskUrl } = params;

  const fields = [];
  if (assigneeName) {
    fields.push({ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` });
  }
  fields.push({ type: "mrkdwn", text: `*Project:*\n${projectName}` });

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "💬 New Comment on Task",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New comment added*`,
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

  const fallbackText = `[${taskId}] New comment on "${taskTitle}" (Project: ${projectName})`;

  return { blocks, text: fallbackText };
};

export const buildTaskValidatedMessage = (params: {
  taskId: string;
  taskTitle: string;
  projectName: string;
  assigneeName: string | null;
  taskUrl: string;
}) => {
  const { taskId, taskTitle, projectName, assigneeName, taskUrl } = params;

  const fields = [];
  if (assigneeName) {
    fields.push({ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` });
  }
  fields.push({ type: "mrkdwn", text: `*Status:*\nValidated` });
  fields.push({ type: "mrkdwn", text: `*Project:*\n${projectName}` });

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Task Validated",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task has been validated*`,
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

  const fallbackText = `[${taskId}] Task "${taskTitle}" has been validated (Project: ${projectName})`;

  return { blocks, text: fallbackText };
};

export const buildTaskAssignedMessage = (params: {
  taskId: string;
  taskTitle: string;
  projectName: string;
  assigneeName: string | null;
  taskUrl: string;
}) => {
  const { taskId, taskTitle, projectName, assigneeName, taskUrl } = params;

  const fields = [];
  if (assigneeName) {
    fields.push({ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` });
  }
  fields.push({ type: "mrkdwn", text: `*Status:*\nBacklog` });
  fields.push({ type: "mrkdwn", text: `*Project:*\n${projectName}` });

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "👤 Task Assigned",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task assigned to ${assigneeName || "Unknown"}*`,
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

  const fallbackText = `[${taskId}] Task "${taskTitle}" assigned to ${assigneeName || "Unknown"} (Project: ${projectName})`;

  return { blocks, text: fallbackText };
};

export const buildInvoiceValidatedMessage = (params: {
  invoiceId: string;
  organizationName: string;
  totalAmount: string | null;
  invoiceUrl: string;
}) => {
  const { invoiceId, organizationName, totalAmount, invoiceUrl } = params;

  const fields = [
    { type: "mrkdwn", text: `*Organization:*\n${organizationName}` },
  ];
  if (totalAmount) {
    fields.push({ type: "mrkdwn", text: `*Total Amount:*\n${totalAmount}€` });
  }

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📄 Invoice Validated",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*An invoice has been validated and is ready for payment*`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Invoice",
          emoji: true,
        },
        url: invoiceUrl,
        action_id: "view_invoice",
      },
    },
    {
      type: "section",
      fields: fields,
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Invoice ID: ${invoiceId}`,
        },
      ],
    },
  ];

  const fallbackText = `Invoice validated for ${organizationName}${totalAmount ? ` (Total: ${totalAmount}€)` : ""}`;

  return { blocks, text: fallbackText };
};

export const buildInvoicePaidMessage = (params: {
  invoiceId: string;
  organizationName: string;
  totalAmount: string | null;
  invoiceUrl: string;
}) => {
  const { invoiceId, organizationName, totalAmount, invoiceUrl } = params;

  const fields = [
    { type: "mrkdwn", text: `*Organization:*\n${organizationName}` },
  ];
  if (totalAmount) {
    fields.push({ type: "mrkdwn", text: `*Total Amount:*\n${totalAmount}€` });
  }

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "💰 Invoice Paid",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*An invoice has been marked as paid*`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Invoice",
          emoji: true,
        },
        url: invoiceUrl,
        action_id: "view_invoice",
      },
    },
    {
      type: "section",
      fields: fields,
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Invoice ID: ${invoiceId}`,
        },
      ],
    },
  ];

  const fallbackText = `Invoice paid for ${organizationName}${totalAmount ? ` (Total: ${totalAmount}€)` : ""}`;

  return { blocks, text: fallbackText };
};

export const buildInvoiceCommentMessage = (params: {
  invoiceId: string;
  organizationName: string;
  commenterName: string;
  content: string;
  invoiceUrl: string;
}) => {
  const { invoiceId, organizationName, commenterName, content, invoiceUrl } =
    params;

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "💬 New Comment on Invoice",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${commenterName}* added a comment to an invoice for *${organizationName}*`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Invoice",
          emoji: true,
        },
        url: invoiceUrl,
        action_id: "view_invoice",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> ${content}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Invoice ID: ${invoiceId}`,
        },
      ],
    },
  ];

  const fallbackText = `${commenterName} commented on invoice for ${organizationName}`;

  return { blocks, text: fallbackText };
};

export const encryptSlackToken = (token: string): string => {
  return encrypt(token);
};

export const decryptSlackToken = (encryptedToken: string): string => {
  return decrypt(encryptedToken);
};
