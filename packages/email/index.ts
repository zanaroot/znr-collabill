"server only";

import type { Brevo } from "@getbrevo/brevo";
import { BrevoClient, BrevoError } from "@getbrevo/brevo";
import { getOrgBrevoCredentialsDecrypted } from "@/lib/integrations";

type BrevoSender = {
  email: string;
  name?: string;
};

type BrevoRecipient = {
  email: string;
  name?: string;
};

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
  organizationId?: string;
};

const createBrevoClient = (apiKey: string) => {
  return new BrevoClient({ apiKey });
};

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  organizationId,
}: SendEmailParams): Promise<void> => {
  let apiKey: string | undefined;
  let mailFrom: string | undefined;

  if (organizationId) {
    const orgCreds = await getOrgBrevoCredentialsDecrypted(organizationId);
    if (orgCreds) {
      apiKey = orgCreds.apiKey;
      mailFrom = orgCreds.mailFrom;
    }
  }

  if (!apiKey || !mailFrom) {
    apiKey = process.env.BREVO_API_KEY;
    mailFrom = process.env.MAIL_FROM;
  }

  if (!apiKey) {
    throw new Error("Brevo API key not configured");
  }

  if (!mailFrom) {
    throw new Error("Sender email not configured");
  }

  const brevo = createBrevoClient(apiKey);

  const request: Brevo.SendTransacEmailRequest = {
    sender: parseSender(mailFrom),
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
