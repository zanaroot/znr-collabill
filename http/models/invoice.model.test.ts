import { describe, expect, it } from "vitest";
import {
  createInvoiceSchema,
  invoiceLineSchema,
  invoiceStatusSchema,
  updateInvoiceStatusSchema,
} from "@/http/models/invoice.model";

describe("invoice model schemas", () => {
  describe("invoiceStatusSchema", () => {
    it("parses DRAFT status", () => {
      const result = invoiceStatusSchema.safeParse("DRAFT");
      expect(result.success).toBe(true);
    });

    it("parses VALIDATED status", () => {
      const result = invoiceStatusSchema.safeParse("VALIDATED");
      expect(result.success).toBe(true);
    });

    it("parses PAID status", () => {
      const result = invoiceStatusSchema.safeParse("PAID");
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = invoiceStatusSchema.safeParse("INVALID");
      expect(result.success).toBe(false);
    });
  });

  describe("invoiceLineSchema", () => {
    it("parses valid invoice line", () => {
      const validLine = {
        type: "PRESENCE",
        referenceId: "123e4567-e89b-12d3-a456-426614174000",
        label: "Presence for John",
        quantity: 10,
        unitPrice: "100",
        total: "1000",
      };

      const result = invoiceLineSchema.safeParse(validLine);
      expect(result.success).toBe(true);
    });

    it("allows optional referenceId", () => {
      const line = {
        type: "TASK",
        label: "Task line",
        quantity: 5,
      };

      const result = invoiceLineSchema.safeParse(line);
      expect(result.success).toBe(true);
    });

    it("accepts negative quantity (no min validation)", () => {
      const line = {
        type: "PRESENCE",
        label: "Presence line",
        quantity: -1,
      };

      const result = invoiceLineSchema.safeParse(line);
      expect(result.success).toBe(true);
    });

    it("rejects missing required type", () => {
      const line = {
        label: "Line without type",
        quantity: 5,
      };

      const result = invoiceLineSchema.safeParse(line);
      expect(result.success).toBe(false);
    });

    it("rejects missing required label", () => {
      const line = {
        type: "PRESENCE",
        quantity: 5,
      };

      const result = invoiceLineSchema.safeParse(line);
      expect(result.success).toBe(false);
    });
  });

  describe("createInvoiceSchema", () => {
    it("parses valid create invoice input", () => {
      const validInput = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        status: "DRAFT",
        totalAmount: "1000.00",
        note: "Test invoice",
        lines: [
          {
            type: "PRESENCE",
            label: "Presence line",
            quantity: 10,
            unitPrice: "100",
            total: "1000",
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("allows optional status (defaults to undefined)", () => {
      const input = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        lines: [{ type: "PRESENCE", label: "Line", quantity: 1 }],
      };

      const result = createInvoiceSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects missing required userId", () => {
      const input = {
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        lines: [{ type: "PRESENCE", label: "Line", quantity: 1 }],
      };

      const result = createInvoiceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing required organizationId", () => {
      const input = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        lines: [{ type: "PRESENCE", label: "Line", quantity: 1 }],
      };

      const result = createInvoiceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing periodStart", () => {
      const input = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        periodEnd: "2024-01-31",
        lines: [{ type: "PRESENCE", label: "Line", quantity: 1 }],
      };

      const result = createInvoiceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing lines array", () => {
      const input = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
      };

      const result = createInvoiceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("accepts empty lines array (no min validation)", () => {
      const input = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        lines: [],
      };

      const result = createInvoiceSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("allows null for optional totalAmount", () => {
      const input = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        totalAmount: null,
        lines: [{ type: "PRESENCE", label: "Line", quantity: 1 }],
      };

      const result = createInvoiceSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("allows null for optional note", () => {
      const input = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        note: null,
        lines: [{ type: "PRESENCE", label: "Line", quantity: 1 }],
      };

      const result = createInvoiceSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("updateInvoiceStatusSchema", () => {
    it("parses valid status update", () => {
      const validInput = {
        status: "PAID",
      };

      const result = updateInvoiceStatusSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("rejects missing status", () => {
      const input = {};

      const result = updateInvoiceStatusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid status value", () => {
      const input = {
        status: "CANCELLED",
      };

      const result = updateInvoiceStatusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
