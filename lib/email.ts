import sgMail from "@sendgrid/mail";
import "server-only";

const getRequiredEnv = (name: "SENDGRID_API_KEY" | "MAIL_FROM"): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
};

const sendgridApiKey = getRequiredEnv("SENDGRID_API_KEY");
const mailFrom = getRequiredEnv("MAIL_FROM");

sgMail.setApiKey(sendgridApiKey);

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  try {
    await sgMail.send({
      to,
      from: mailFrom,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error(
      "SendGrid error:",
      (error as unknown as { response?: { body?: unknown } })?.response?.body ||
        error,
    );
    throw error;
  }
}
