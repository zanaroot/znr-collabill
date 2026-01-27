import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject?: string;
  html?: string;
}) => {
  if (!process.env.SMTP_HOST) {
    console.log("----------------------------------------");
    console.log(`[Email Dev Mode] To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("Body:"); 
    console.log(html);
    console.log("----------------------------------------");
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Collabill" <no-reply@collabill.com>',
    to,
    subject: subject || "",
    html: html || "",
  });
};
