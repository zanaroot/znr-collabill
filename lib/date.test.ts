import { describe, expect, it } from "vitest";
import { formatToDayMonth, getFutureDate, getISODate } from "@/lib/date";

describe("date utilities", () => {
  describe("getISODate", () => {
    it("returns ISO date string (YYYY-MM-DD)", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      const result = getISODate(date);
      expect(result).toBe("2024-06-15");
    });

    it("defaults to current date when no argument", () => {
      const result = getISODate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("handles different time zones", () => {
      const date = new Date("2024-01-01T23:59:59Z");
      const result = getISODate(date);
      expect(result).toBe("2024-01-01");
    });
  });

  describe("formatToDayMonth", () => {
    it("formats date as 'Mon DD'", () => {
      const date = new Date("2024-06-15");
      const result = formatToDayMonth(date);
      expect(result).toBe("Jun 15");
    });

    it("handles single digit day", () => {
      const date = new Date("2024-01-01");
      const result = formatToDayMonth(date);
      expect(result).toBe("Jan 1");
    });

    it("handles different months", () => {
      const date = new Date("2024-12-25");
      const result = formatToDayMonth(date);
      expect(result).toBe("Dec 25");
    });
  });

  describe("getFutureDate", () => {
    it("returns date 7 days in future by default", () => {
      const today = new Date();
      const result = getFutureDate();
      const diffTime = result.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it("returns date with custom days in future", () => {
      const today = new Date();
      const result = getFutureDate(30);
      const diffTime = result.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it("handles zero days", () => {
      const result = getFutureDate(0);
      const today = new Date();
      const diffTime = result.getTime() - today.getTime();
      expect(Math.abs(diffTime)).toBeLessThan(1000);
    });

    it("handles negative days (past date)", () => {
      const result = getFutureDate(-5);
      const today = new Date();
      const diffTime = result.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(-5);
    });
  });
});
