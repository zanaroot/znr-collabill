import "server-only";

import type { Brevo } from "@getbrevo/brevo";
import { BrevoClient, BrevoError } from "@getbrevo/brevo";
import { serverEnv } from "@/packages/env/server";

type BrevoSender = {
  email: string;
  name?: string;
};

type BrevoRecipient = {
  email: string;
  name?: string;
};

const brevo = new BrevoClient({
  apiKey: serverEnv.BREVO_API_KEY,
});

const parseSender = (value: string): BrevoSender => {
  const namedSenderMatch = value.match(/^(.*?)\s*<([^>]+)>$/);

  if (!namedSenderMatch) {
    return { email: value };
  }

  const [, rawName, rawEmail] = namedSenderMatch;
  const name = rawName.trim();
  const email = rawEmail.trim();

  return name ? { email, name } : { email };
};

const toBrevoRecipients = (to: string | string[]): BrevoRecipient[] => {
  const list = Array.isArray(to) ? to : [to];

  return list.map((email) => ({ email: email.trim() }));
};

const formatBrevoError = (error: BrevoError): string => {
  const status = error.statusCode ?? "unknown";
  const body = error.body ? ` ${JSON.stringify(error.body)}` : "";

  return `Brevo request failed with status ${status}.${body}`;
};

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<void> => {
  const request: Brevo.SendTransacEmailRequest = {
    sender: parseSender(serverEnv.MAIL_FROM),
    to: toBrevoRecipients(to),
    subject,
    htmlContent: html,
    textContent: text,
  };

  try {
    await brevo.transactionalEmails.sendTransacEmail(request);
  } catch (error) {
    if (error instanceof BrevoError) {
      throw new Error(formatBrevoError(error));
    }

    throw error;
  }
};
