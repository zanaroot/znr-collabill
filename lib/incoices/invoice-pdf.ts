import PDFDocument from "pdfkit";
import { findInvoiceByIdWithLines } from "@/http/repositories/invoice.repository";

export const generateInvoicePdf = async (invoiceId: string) => {
  const invoice = await findInvoiceByIdWithLines(invoiceId);
  const formatAmount = (value: string | number | null) =>
    Number(value ?? 0).toLocaleString("de-DE");

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fillColor("#1F4E79")
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("INVOICE", {
        align: "center",
      });

    doc.moveDown(0.5);

    doc
      .strokeColor("#1F4E79")
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(2);

    doc.fillColor("black").font("Helvetica").fontSize(12);

    doc.text(`Organization : ${invoice.organization.name}`, {
      lineGap: 5,
    });

    doc.text(`Member       : ${invoice.user.name}`, {
      lineGap: 5,
    });

    doc.text(`Email        : ${invoice.user.email}`, {
      lineGap: 5,
    });

    doc.text(`Phone        : ${invoice.user.phoneNumber ?? "-"}`, {
      lineGap: 5,
    });

    doc.text(`Phone Owner  : ${invoice.user.phoneOwnerName ?? "-"}`, {
      lineGap: 5,
    });

    doc.text(`Status       : ${invoice.invoice.status}`, {
      lineGap: 5,
    });

    doc.moveDown(1);

    doc.text(`Invoice ID   : ${invoice.invoice.id}`, {
      lineGap: 5,
    });

    doc.text(
      `Period       : ${invoice.invoice.periodStart} - ${invoice.invoice.periodEnd}`,
      {
        lineGap: 5,
      },
    );

    doc.moveDown(2);

    doc
      .fillColor("#1F4E79")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Invoice Lines");

    doc.moveDown();

    const headerY = doc.y;

    doc.rect(50, headerY - 4, 500, 24).fill("#F2F2F2");

    doc.fillColor("black").font("Helvetica-Bold").fontSize(11);

    doc.text("Description", 55, headerY + 2);
    doc.text("Qty", 320, headerY + 2);
    doc.text("Unit", 380, headerY + 2);
    doc.text("Total", 470, headerY + 2);

    doc.moveDown(2);

    doc.font("Helvetica").fontSize(10);

    invoice.lines.forEach((line) => {
      const y = doc.y;

      doc.text(line.label, 50, y, {
        width: 250,
        lineGap: 4,
      });

      doc.text(String(line.quantity), 320, y);

      doc.text(`${formatAmount(line.unitPrice)} €`, 380, y, {
        width: 70,
        align: "right",
      });

      doc.text(`${formatAmount(line.total)} €`, 470, y, {
        width: 70,
        align: "right",
      });

      doc
        .strokeColor("#E5E5E5")
        .lineWidth(0.5)
        .moveTo(50, doc.y + 8)
        .lineTo(550, doc.y + 8)
        .stroke();

      doc.moveDown(1.8);
    });

    doc.moveDown();

    const totalY = doc.y;

    doc.roundedRect(330, totalY, 220, 35, 5).fill("#F5F5F5");

    doc
      .fillColor("#1F4E79")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(
        `TOTAL : ${formatAmount(invoice.invoice.totalAmount)} €`,
        340,
        totalY + 8,
        {
          width: 200,
          align: "right",
        },
      );

    doc.moveDown(4);

    doc.end();
  });
};
