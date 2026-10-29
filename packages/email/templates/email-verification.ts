type EmailVerificationTemplateParams = {
  name: string;
  verificationUrl: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

export const emailVerificationTemplate = ({
  name,
  verificationUrl,
}: EmailVerificationTemplateParams) => {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verificationUrl);

  return {
    subject: "Verify your email address - Collabill",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Verify your email address</h2>
        <p>Hello ${safeName},</p>
        <p>Click the button below to verify your email address.</p>
        <p style="margin: 30px 0;">
          <a
            href="${safeUrl}"
            style="background: #1677ff; color: white; padding: 12px 20px;
              text-decoration: none; border-radius: 6px;"
          >
            Verify my email
          </a>
        </p>
        <p>This link expires in 30 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    text: [
      `Hello ${name},`,
      "",
      "Verify your email using this link:",
      verificationUrl,
      "",
      "This link expires in 30 minutes.",
      "If you didn't request this, ignore this email.",
    ].join("\n"),
  };
};
