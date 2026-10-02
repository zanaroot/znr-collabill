import { describe, expect, it } from "vitest";
import { updateMemberPresenceSchema } from "./presence.model";

describe("updateMemberPresenceSchema", () => {
  it("should accept every presence status", () => {
    const statuses = [
      "OFFICE",
      "REMOTE",
      "HALF_DAY",
      "SICK",
      "VACATION",
      "ON_LEAVE",
    ];

    for (const status of statuses) {
      const result = updateMemberPresenceSchema.safeParse({
        date: "2026-10-02",
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject an unknown status", () => {
    const result = updateMemberPresenceSchema.safeParse({
      date: "2026-10-02",
      status: "WORKING",
    });
    expect(result.success).toBe(false);
  });

  it("should require a date", () => {
    const result = updateMemberPresenceSchema.safeParse({
      status: "OFFICE",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an empty payload", () => {
    const result = updateMemberPresenceSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
