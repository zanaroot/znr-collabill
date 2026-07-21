import { sendEmail } from "@/packages/email";

export const sendInvoiceEmail = async ({
  to,
  pdfBuffer,
  invoiceNumber,
  status,
}: {
  to: string;
  pdfBuffer: Buffer;
  invoiceNumber: string;
  status: "VALIDATED" | "PAID";
}) => {
  await sendEmail({
    to,
    subject:
      status === "PAID"
        ? `Invoice ${invoiceNumber} has been paid`
        : `Invoice ${invoiceNumber} has been validated`,
    html: `<p>Hello,</p>
<p>
The invoice <strong>${invoiceNumber}</strong> has been
<strong>${status.toLowerCase()}</strong>.
</p>

<p>Please find the attached invoice.</p>
`,
    text: `Invoice ${invoiceNumber} is attached. Status: ${status.toLowerCase()}`,
    attachments: [
      {
        name: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  });
};
