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

    const pageBottom = () => doc.page.height - doc.page.margins.bottom;
    const drawLinesHeader = () => {
      const headerY = doc.y;

      doc.rect(50, headerY - 4, 500, 24).fill("#F2F2F2");
      doc.fillColor("black").font("Helvetica-Bold").fontSize(11);
      doc.text("Description", 55, headerY + 2);
      doc.text("Type", 260, headerY + 2);
      doc.text("Qty", 320, headerY + 2);
      doc.text("Unit", 380, headerY + 2);
      doc.text("Total", 470, headerY + 2);
      doc.y = headerY + 30;
      doc.font("Helvetica").fontSize(10);
    };
    const addPageWithLinesHeader = () => {
      doc.addPage();
      drawLinesHeader();
    };

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

    const periodMonth = new Date(
      invoice.invoice.periodStart,
    ).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    doc.text(`Period       : ${periodMonth}`, {
      lineGap: 5,
    });

    doc.moveDown(2);

    doc
      .fillColor("#1F4E79")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Invoice Lines");

    doc.moveDown();

    if (doc.y + 30 > pageBottom()) {
      doc.addPage();
    }
    drawLinesHeader();
    doc.font("Helvetica").fontSize(10);

    invoice.lines.forEach((line) => {
      const description = line.label || " ";
      const descriptionWidth = 250;
      const lineGap = 4;
      const maxDescriptionHeight =
        pageBottom() - (doc.page.margins.top + 30 + 16);
      const descriptionChunks: string[] = [];
      let chunk = "";

      for (const word of description.match(/\S+\s*/g) ?? [description]) {
        const candidate = chunk + word;
        if (
          chunk &&
          doc.heightOfString(candidate, {
            width: descriptionWidth,
            lineGap,
          }) > maxDescriptionHeight
        ) {
          descriptionChunks.push(chunk);
          chunk = word;
        } else {
          chunk = candidate;
        }

        while (
          doc.heightOfString(chunk, {
            width: descriptionWidth,
            lineGap,
          }) > maxDescriptionHeight
        ) {
          let splitAt = chunk.length;
          while (
            splitAt > 1 &&
            doc.heightOfString(chunk.slice(0, splitAt), {
              width: descriptionWidth,
              lineGap,
            }) > maxDescriptionHeight
          ) {
            splitAt = Math.floor(splitAt / 2);
          }
          descriptionChunks.push(chunk.slice(0, splitAt));
          chunk = chunk.slice(splitAt);
        }
      }

      if (chunk) {
        descriptionChunks.push(chunk);
      }

      descriptionChunks.forEach((descriptionChunk, index) => {
        const descriptionHeight = doc.heightOfString(descriptionChunk, {
          width: descriptionWidth,
          lineGap,
        });
        const rowHeight = Math.max(descriptionHeight, 12) + 16;

        if (doc.y + rowHeight > pageBottom()) {
          addPageWithLinesHeader();
        }

        const rowY = doc.y;

        doc.text(descriptionChunk, 50, rowY, {
          width: descriptionWidth,
          lineGap,
        });

        if (index === 0) {
          doc.text(line.presenceType ?? "", 260, rowY);
          doc.text(String(line.quantity), 320, rowY);
          doc.text(`${formatAmount(line.unitPrice)} €`, 380, rowY, {
            width: 70,
            align: "right",
          });
          doc.text(`${formatAmount(line.total)} €`, 470, rowY, {
            width: 70,
            align: "right",
          });
        }

        const rowBottom = rowY + rowHeight;
        doc
          .strokeColor("#E5E5E5")
          .lineWidth(0.5)
          .moveTo(50, rowBottom - 4)
          .lineTo(550, rowBottom - 4)
          .stroke();
        doc.y = rowBottom;
      });
    });

    const totalY = doc.y + 8;
    if (totalY + 35 > pageBottom()) {
      doc.addPage();
    }
    const finalTotalY = doc.y + 8;

    doc.roundedRect(330, finalTotalY, 220, 35, 5).fill("#F5F5F5");

    doc
      .fillColor("#1F4E79")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(
        `TOTAL : ${formatAmount(invoice.invoice.totalAmount)} €`,
        340,
        finalTotalY + 8,
        {
          width: 200,
          align: "right",
        },
      );

    doc.end();
  });
};
