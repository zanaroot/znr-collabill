import sgMail from "@sendgrid/mail";
import "server-only";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams) {
  try {
    await sgMail.send({
      to,
      from: process.env.MAIL_FROM!,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("SendGrid error:", error?.response?.body || error);
    throw error;
  }
}
