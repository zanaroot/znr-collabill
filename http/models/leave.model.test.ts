import { describe, expect, it } from "vitest";
import {
  createLeaveRequestSchema,
  leaveRequestStatusSchema,
  leaveTypeSchema,
  organizationLeaveSettingsSchema,
} from "./leave.model";

describe("leaveRequestStatusSchema", () => {
  it("should accept PENDING status", () => {
    const result = leaveRequestStatusSchema.safeParse("PENDING");
    expect(result.success).toBe(true);
  });

  it("should accept APPROVED status", () => {
    const result = leaveRequestStatusSchema.safeParse("APPROVED");
    expect(result.success).toBe(true);
  });

  it("should accept REJECTED status", () => {
    const result = leaveRequestStatusSchema.safeParse("REJECTED");
    expect(result.success).toBe(true);
  });

  it("should reject invalid status", () => {
    const result = leaveRequestStatusSchema.safeParse("INVALID");
    expect(result.success).toBe(false);
  });
});

describe("leaveTypeSchema", () => {
  it("should accept FULL_DAY type", () => {
    const result = leaveTypeSchema.safeParse("FULL_DAY");
    expect(result.success).toBe(true);
  });

  it("should accept HALF_DAY_AM type", () => {
    const result = leaveTypeSchema.safeParse("HALF_DAY_AM");
    expect(result.success).toBe(true);
  });

  it("should accept HALF_DAY_PM type", () => {
    const result = leaveTypeSchema.safeParse("HALF_DAY_PM");
    expect(result.success).toBe(true);
  });

  it("should reject invalid type", () => {
    const result = leaveTypeSchema.safeParse("INVALID");
    expect(result.success).toBe(false);
  });
});

describe("createLeaveRequestSchema", () => {
  it("should accept valid leave request", () => {
    const validInput = {
      startDate: "2026-05-15",
      endDate: "2026-05-20",
      type: "FULL_DAY",
      reason: "Vacation",
    };
    const result = createLeaveRequestSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should accept valid half-day request", () => {
    const validInput = {
      startDate: "2026-05-15",
      endDate: "2026-05-15",
      type: "HALF_DAY_AM",
    };
    const result = createLeaveRequestSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should reject when end date is before start date", () => {
    const invalidInput = {
      startDate: "2026-05-20",
      endDate: "2026-05-15",
      type: "FULL_DAY",
    };
    const result = createLeaveRequestSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject invalid date format", () => {
    const invalidInput = {
      startDate: "15-05-2026",
      endDate: "20-05-2026",
      type: "FULL_DAY",
    };
    const result = createLeaveRequestSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject invalid leave type", () => {
    const invalidInput = {
      startDate: "2026-05-15",
      endDate: "2026-05-20",
      type: "FULL",
    };
    const result = createLeaveRequestSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should use default type when not provided", () => {
    const inputWithoutType = {
      startDate: "2026-05-15",
      endDate: "2026-05-20",
    };
    const result = createLeaveRequestSchema.safeParse(inputWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("FULL_DAY");
    }
  });
});

describe("organizationLeaveSettingsSchema", () => {
  it("should accept CARRY_OVER policy", () => {
    const validInput = {
      unusedLeavePolicy: "CARRY_OVER",
      adminLeaveQuota: "5",
      collaboratorLeaveQuota: "3",
    };
    const result = organizationLeaveSettingsSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should accept PAID_AS_WORKED policy", () => {
    const validInput = {
      unusedLeavePolicy: "PAID_AS_WORKED",
      adminLeaveQuota: "5",
      collaboratorLeaveQuota: "3",
    };
    const result = organizationLeaveSettingsSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should reject invalid policy", () => {
    const invalidInput = {
      unusedLeavePolicy: "INVALID",
      adminLeaveQuota: "5",
      collaboratorLeaveQuota: "3",
    };
    const result = organizationLeaveSettingsSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should require leave quotas", () => {
    const invalidInput = {
      unusedLeavePolicy: "CARRY_OVER",
    };
    const result = organizationLeaveSettingsSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});
