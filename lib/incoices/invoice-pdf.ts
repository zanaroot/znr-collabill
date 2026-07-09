import PDFDocument from "pdfkit";
import { findInvoiceByIdWithLines } from "@/http/repositories/invoice.repository";

export const generateInvoicePdf = async (invoiceId: string) => {
  const invoice = await findInvoiceByIdWithLines(invoiceId);

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

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(24).text("INVOICE", {
      align: "center",
    });

    doc.moveDown(2);

    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`Organization : ${invoice.organization.name}`)
      .text(`Member       : ${invoice.user.name}`)
      .text(`Email        : ${invoice.user.email}`)
      .text(`Phone        : ${invoice.user.phoneNumber ?? "-"}`)
      .text(`Phone Owner  : ${invoice.user.phoneOwnerName ?? "-"}`)
      .text(`Status       : ${invoice.invoice.status}`);
    doc.moveDown();

    doc
      .text(`Invoice ID   : ${invoice.invoice.id}`)
      .text(
        `Period       : ${invoice.invoice.periodStart} → ${invoice.invoice.periodEnd}`,
      );

    doc.moveDown(2);

    doc.font("Helvetica-Bold").fontSize(16).text("Invoice Lines");

    doc.moveDown();

    const startY = doc.y;

    doc.font("Helvetica-Bold").fontSize(11);

    doc.text("Description", 50, startY);
    doc.text("Qty", 320, startY);
    doc.text("Unit", 380, startY);
    doc.text("Total", 470, startY);

    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(10);

    invoice.lines.forEach((line) => {
      const y = doc.y;

      doc.text(line.label, 50, y, {
        width: 250,
      });

      doc.text(String(line.quantity), 320, y);

      doc.text(`${Number(line.unitPrice).toLocaleString()} €`, 380, y, {
        width: 70,
        align: "right",
      });

      doc.text(`${Number(line.total).toLocaleString()} €`, 470, y, {
        width: 70,
        align: "right",
      });

      doc.moveDown(1.3);
    });

    doc.moveDown();

    doc.moveTo(300, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown();

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(
        `TOTAL : ${Number(invoice.invoice.totalAmount).toLocaleString()} €`,
        {
          align: "right",
        },
      );

    doc.moveDown(2);

    doc.end();
  });
};
