import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  getCurrentPeriod,
  getMonthlyPeriods,
  getPeriodById,
} from "@/lib/periods";

describe("periods utilities", () => {
  describe("getMonthlyPeriods", () => {
    it("returns correct number of periods", () => {
      const result = getMonthlyPeriods(6);
      expect(result).toHaveLength(6);
    });

    it("returns periods in reverse chronological order", () => {
      const result = getMonthlyPeriods(3);
      expect(new Date(result[0].id) > new Date(result[1].id)).toBe(true);
      expect(new Date(result[1].id) > new Date(result[2].id)).toBe(true);
    });

    it("returns valid period objects", () => {
      const result = getMonthlyPeriods(1);
      const period = result[0];
      expect(period.id).toMatch(/^\d{4}-\d{2}$/);
      expect(period.name).toMatch(/^\w+ \d{4}$/);
      expect(period.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(period.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("startDate is before endDate", () => {
      const result = getMonthlyPeriods(1);
      expect(new Date(result[0].startDate) < new Date(result[0].endDate)).toBe(
        true,
      );
    });

    it("returns 12 periods by default", () => {
      const result = getMonthlyPeriods();
      expect(result).toHaveLength(12);
    });
  });

  describe("getCurrentPeriod", () => {
    it("returns current month period", () => {
      const result = getCurrentPeriod();
      const now = new Date();
      expect(result.id).toBe(format(now, "yyyy-MM"));
      expect(result.name).toBe(format(now, "MMMM yyyy"));
    });

    it("returns valid date strings", () => {
      const result = getCurrentPeriod();
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getPeriodById", () => {
    it("returns period for valid id", () => {
      const result = getPeriodById("2024-06");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("2024-06");
      expect(result?.name).toBe("June 2024");
    });

    it("returns null for invalid id", () => {
      const result = getPeriodById("invalid");
      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = getPeriodById("");
      expect(result).toBeNull();
    });

    it("handles edge case month values", () => {
      const result = getPeriodById("2024-00");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("2024-00");
    });

    it("generates correct dates for February", () => {
      const result = getPeriodById("2024-02");
      expect(result?.startDate).toBe("2024-02-01");
      expect(result?.endDate).toBe("2024-02-29");
    });
  });
});
