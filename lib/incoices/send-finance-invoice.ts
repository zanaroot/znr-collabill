import { findInvoiceById } from "@/http/repositories/invoice.repository";
import * as organizationRepository from "@/http/repositories/organization.repository";
import { sendInvoiceEmail } from "./invoice-email";
import { generateInvoicePdf } from "./invoice-pdf";

export const sendFinanceInvoiceNotification = async (
  invoiceId: string,
  status: "VALIDATED" | "PAID",
) => {
  const invoice = await findInvoiceById(invoiceId);

  if (!invoice) return;

  const financeEmails = await organizationRepository.getFinanceEmails(
    invoice.organizationId,
  );

  if (financeEmails.length === 0) {
    return;
  }

  const pdfBuffer = await generateInvoicePdf(invoice.id);

  for (const financeEmail of financeEmails) {
    try {
      await sendInvoiceEmail({
        to: financeEmail.email,
        pdfBuffer,
        invoiceNumber: invoice.id,
        status,
      });
    } catch (err) {
      console.error(
        `[Finance notification] Failed to send email to ${financeEmail.email}:`,
        err,
      );
    }
  }
};
