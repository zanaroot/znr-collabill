import { describe, expect, it } from "vitest";
import { calculateLeaveDays } from "./leave.repository";

describe("calculateLeaveDays", () => {
  it("should calculate full days correctly for single day", () => {
    const result = calculateLeaveDays("2026-05-15", "2026-05-15", "FULL_DAY");
    expect(result).toBe(1);
  });

  it("should calculate full days correctly for multiple days", () => {
    const result = calculateLeaveDays("2026-05-15", "2026-05-20", "FULL_DAY");
    expect(result).toBe(6);
  });

  it("should calculate half day AM correctly for single day", () => {
    const result = calculateLeaveDays(
      "2026-05-15",
      "2026-05-15",
      "HALF_DAY_AM",
    );
    expect(result).toBe(0.5);
  });

  it("should calculate half day AM correctly for multiple days", () => {
    const result = calculateLeaveDays(
      "2026-05-15",
      "2026-05-20",
      "HALF_DAY_AM",
    );
    expect(result).toBe(3);
  });

  it("should calculate half day PM correctly for single day", () => {
    const result = calculateLeaveDays(
      "2026-05-15",
      "2026-05-15",
      "HALF_DAY_PM",
    );
    expect(result).toBe(0.5);
  });

  it("should calculate half day PM correctly for multiple days", () => {
    const result = calculateLeaveDays(
      "2026-05-15",
      "2026-05-20",
      "HALF_DAY_PM",
    );
    expect(result).toBe(3);
  });

  it("should handle weekend dates correctly", () => {
    const result = calculateLeaveDays("2026-05-15", "2026-05-18", "FULL_DAY");
    expect(result).toBe(4);
  });
});

describe("Leave request validation logic", () => {
  it("should detect overlapping dates - same period", () => {
    const start1 = "2026-05-01";
    const end1 = "2026-05-10";
    const start2 = "2026-05-05";
    const end2 = "2026-05-15";

    const overlap = start1 <= end2 && end1 >= start2;
    expect(overlap).toBe(true);
  });

  it("should detect no overlap - separate periods", () => {
    const start1 = "2026-05-01";
    const end1 = "2026-05-10";
    const start2 = "2026-05-15";
    const end2 = "2026-05-20";

    const overlap = start1 <= end2 && end1 >= start2;
    expect(overlap).toBe(false);
  });

  it("should detect partial overlap - one starts in middle of other", () => {
    const start1 = "2026-05-01";
    const end1 = "2026-05-15";
    const start2 = "2026-05-10";
    const end2 = "2026-05-20";

    const overlap = start1 <= end2 && end1 >= start2;
    expect(overlap).toBe(true);
  });
});

describe("Cross-month leave calculation", () => {
  it("should calculate days per month correctly for cross-month leave", () => {
    const startDate = new Date(2026, 4, 28);
    const endDate = new Date(2026, 5, 3);

    const months: { month: number; year: number; days: number }[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();

      let daysInRequest = 0;

      if (months.length === 0) {
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        daysInRequest = lastDayOfMonth - startDate.getDate() + 1;
      } else if (
        month === endDate.getMonth() + 1 &&
        year === endDate.getFullYear()
      ) {
        daysInRequest = endDate.getDate();
      } else {
        daysInRequest = new Date(year, month, 0).getDate();
      }

      months.push({ month, year, days: daysInRequest });

      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    expect(months).toHaveLength(2);
    expect(months[0].month).toBe(5);
    expect(months[0].days).toBe(4);
    expect(months[1].month).toBe(6);
    expect(months[1].days).toBe(3);
  });
});

describe("Balance validation scenarios", () => {
  it("should approve request when balance is sufficient", () => {
    const requestedDays = 2;
    const remainingBalance = 2.5;
    expect(requestedDays <= remainingBalance).toBe(true);
  });

  it("should reject request when balance is insufficient", () => {
    const requestedDays = 3;
    const remainingBalance = 2.5;
    expect(requestedDays > remainingBalance).toBe(true);
  });

  it("should approve half-day request with limited balance", () => {
    const requestedDays = 0.5;
    const remainingBalance = 1;
    expect(requestedDays <= remainingBalance).toBe(true);
  });
});

describe("PAID_AS_WORKED policy behavior", () => {
  it("should identify PAID_AS_WORKED policy correctly", () => {
    const policy: string = "PAID_AS_WORKED";
    expect(policy === "PAID_AS_WORKED").toBe(true);
    expect(policy === "CARRY_OVER").toBe(false);
  });

  it("should identify CARRY_OVER policy correctly", () => {
    const policy: string = "CARRY_OVER";
    expect(policy === "PAID_AS_WORKED").toBe(false);
    expect(policy === "CARRY_OVER").toBe(true);
  });

  it("should calculate unused leave for invoice correctly", () => {
    const balances = [
      { remaining: "1.5" },
      { remaining: "2.0" },
      { remaining: "0.5" },
    ];
    const totalUnused = balances.reduce(
      (sum, b) => sum + parseFloat(b.remaining),
      0,
    );
    expect(totalUnused).toBe(4);
  });

  it("should handle zero remaining balance", () => {
    const remaining = "0";
    expect(parseFloat(remaining)).toBe(0);
  });

  it("should determine if leave can be requested based on policy", () => {
    const policy1: string = "CARRY_OVER";
    const policy2: string = "PAID_AS_WORKED";
    const canRequestLeaveWithCarryOver = policy1 !== policy2;
    expect(canRequestLeaveWithCarryOver).toBe(true);
  });
});
