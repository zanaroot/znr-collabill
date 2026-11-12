import { afterEach, describe, expect, it, vi } from "vitest";

const { findInvoiceByIdWithLines } = vi.hoisted(() => ({
  findInvoiceByIdWithLines: vi.fn(),
}));

vi.mock("@/http/repositories/invoice.repository", () => ({
  findInvoiceByIdWithLines,
}));

import type { findInvoiceByIdWithLines as findInvoice } from "@/http/repositories/invoice.repository";
import { generateInvoicePdf } from "./invoice-pdf";

type InvoiceWithLines = NonNullable<Awaited<ReturnType<typeof findInvoice>>>;

const createInvoice = (labels: string[]): InvoiceWithLines =>
  ({
    invoice: {
      id: "invoice-1",
      userId: "user-1",
      organizationId: "organization-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      status: "VALIDATED",
      totalAmount: "300",
      validatedAt: null,
      paidAt: null,
      note: null,
      draftKey: null,
      createdAt: null,
      updatedAt: null,
    },
    user: {
      id: "user-1",
      name: "Invoice member",
      email: "member@example.com",
      phoneNumber: null,
      phoneOwnerName: null,
    },
    organization: {
      id: "organization-1",
      name: "Invoice organization",
    },
    lines: labels.map((label) => ({
      id: "line-1",
      invoiceId: "invoice-1",
      type: "PRESENCE",
      referenceId: null,
      label,
      presenceType: null,
      quantity: 1,
      unitPrice: "10",
      total: "10",
    })),
  }) as InvoiceWithLines;

const getPageCount = (pdf: Buffer) =>
  (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;

describe("generateInvoicePdf", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps a short invoice on one page", async () => {
    findInvoiceByIdWithLines.mockResolvedValue(
      createInvoice(["Presence for Invoice member"]),
    );

    const pdf = await generateInvoicePdf("invoice-1");

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(getPageCount(pdf)).toBe(1);
  });

  it("paginates invoice lines without creating blank pages", async () => {
    findInvoiceByIdWithLines.mockResolvedValue(
      createInvoice(
        Array.from({ length: 30 }, (_, index) => `Invoice line ${index + 1}`),
      ),
    );

    const pdf = await generateInvoicePdf("invoice-2");
    const pdfSource = pdf.toString("latin1");
    const pageCount = getPageCount(pdf);
    const pageContentReferences = pdfSource.match(
      /\/Contents\s+\d+\s+\d+\s+R/g,
    );

    expect(pageCount).toBe(2);
    expect(pageContentReferences).toHaveLength(pageCount);
  });

  it("splits an unusually long line across pages", async () => {
    findInvoiceByIdWithLines.mockResolvedValue(
      createInvoice([`Detailed invoice item ${"description ".repeat(1_000)}`]),
    );

    const pdf = await generateInvoicePdf("invoice-3");

    expect(getPageCount(pdf)).toBeGreaterThan(1);
    expect(
      pdf.toString("latin1").match(/\/Contents\s+\d+\s+\d+\s+R/g),
    ).toHaveLength(getPageCount(pdf));
  });
});
