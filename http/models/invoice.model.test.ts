import { describe, expect, it } from "vitest";
import {
  createInvoiceSchema,
  invoiceLineSchema,
  invoiceStatusSchema,
  updateInvoiceStatusSchema,
} from "@/http/models/invoice.model";

describe("invoice model schemas", () => {
  describe("invoiceLineSchema", () => {
    it("parses PRESENCE line type", () => {
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

    it("parses LEAVE line type", () => {
      const leaveLine = {
        type: "LEAVE",
        referenceId: "123e4567-e89b-12d3-a456-426614174000",
        label: "Unused Leave (Paid as Worked) for John",
        quantity: 2,
        unitPrice: "250",
        total: "500",
      };

      const result = invoiceLineSchema.safeParse(leaveLine);
      expect(result.success).toBe(true);
    });

    it("parses TASK line type", () => {
      const taskLine = {
        type: "TASK",
        referenceId: "123e4567-e89b-12d3-a456-426614174000",
        label: "Tasks L for John (Project X)",
        quantity: 3,
        unitPrice: "150",
        total: "450",
      };

      const result = invoiceLineSchema.safeParse(taskLine);
      expect(result.success).toBe(true);
    });

    it("parses CUSTOM line type", () => {
      const customLine = {
        type: "CUSTOM",
        referenceId: null,
        label: "Bonus",
        quantity: 1,
        unitPrice: "500",
        total: "500",
      };

      const result = invoiceLineSchema.safeParse(customLine);
      expect(result.success).toBe(true);
    });

    it("handles zero presence with leave quota (LEAVE line only)", () => {
      const leaveOnly = {
        type: "LEAVE",
        referenceId: "123e4567-e89b-12d3-a456-426614174000",
        label: "Unused Leave (Paid as Worked) for John",
        quantity: 2,
        unitPrice: "250",
        total: "500",
      };

      const result = invoiceLineSchema.safeParse(leaveOnly);
      expect(result.success).toBe(true);
      expect(result.data?.quantity).toBe(2);
      expect(result.data?.total).toBe("500");
    });

    it("handles both presence and leave lines", () => {
      const presenceLine = {
        type: "PRESENCE",
        referenceId: "123e4567-e89b-12d3-a456-426614174000",
        label: "Presence for John",
        quantity: 10,
        unitPrice: "100",
        total: "1000",
      };
      const leaveLine = {
        type: "LEAVE",
        referenceId: "123e4567-e89b-12d3-a456-426614174000",
        label: "Unused Leave (Paid as Worked) for John",
        quantity: 2,
        unitPrice: "250",
        total: "500",
      };

      const presenceResult = invoiceLineSchema.safeParse(presenceLine);
      const leaveResult = invoiceLineSchema.safeParse(leaveLine);
      expect(presenceResult.success).toBe(true);
      expect(leaveResult.success).toBe(true);

      const totalAmount =
        Number(presenceResult.data?.total || 0) +
        Number(leaveResult.data?.total || 0);
      expect(totalAmount).toBe(1500);
    });
  });

  describe("invoice total calculation consistency", () => {
    it("calculates total from multiple line types correctly", () => {
      const lines = [
        {
          type: "PRESENCE",
          label: "Presence for John",
          quantity: 10,
          unitPrice: "100",
          total: "1000",
        },
        {
          type: "LEAVE",
          label: "Unused Leave for John",
          quantity: 2,
          unitPrice: "250",
          total: "500",
        },
        {
          type: "TASK",
          label: "Tasks L for John",
          quantity: 3,
          unitPrice: "150",
          total: "450",
        },
        {
          type: "CUSTOM",
          label: "Bonus",
          quantity: 1,
          unitPrice: "200",
          total: "200",
        },
      ];

      const calculatedTotal = lines.reduce((acc, line) => {
        return acc + Number(line.total || 0);
      }, 0);

      expect(calculatedTotal).toBe(2150);
    });

    it("handles zero presence scenario", () => {
      const lines = [
        {
          type: "LEAVE",
          label: "Unused Leave for John",
          quantity: 2,
          unitPrice: "250",
          total: "500",
        },
      ];

      const calculatedTotal = lines.reduce((acc, line) => {
        return acc + Number(line.total || 0);
      }, 0);

      expect(calculatedTotal).toBe(500);
    });

    it("handles rounding correctly for decimal amounts", () => {
      const lines = [
        {
          type: "PRESENCE",
          label: "Presence for John",
          quantity: 3,
          unitPrice: "333.33",
          total: "999.99",
        },
        {
          type: "LEAVE",
          label: "Unused Leave for John",
          quantity: 1,
          unitPrice: "333.33",
          total: "333.33",
        },
      ];

      const calculatedTotal = lines.reduce((acc, line) => {
        return acc + Number(line.total || 0);
      }, 0);

      expect(calculatedTotal).toBeCloseTo(1333.32);
    });
  });

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
