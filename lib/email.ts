import * as Brevo from "@getbrevo/brevo";
import "server-only";

const getRequiredEnv = (name: "BREVO_API_KEY" | "MAIL_FROM"): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
};

const brevoApiKey = getRequiredEnv("BREVO_API_KEY");
const mailFrom = getRequiredEnv("MAIL_FROM");

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  const toList = Array.isArray(to) ? to : [to];

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.textContent = text;
  sendSmtpEmail.sender = { email: mailFrom };
  sendSmtpEmail.to = toList.map((email) => ({ email }));

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    console.error("Brevo error:", error);
    throw error;
  }
}
