import { describe, expect, it } from "vitest";
import {
  createMeetingSchema,
  guestJoinSchema,
  inviteMeetingMembersSchema,
} from "@/http/models/meeting.model";

describe("createMeetingSchema", () => {
  it("accepts a minimal payload", () => {
    const result = createMeetingSchema.safeParse({ title: "Standup" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = createMeetingSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects expiresAt before scheduledAt", () => {
    const result = createMeetingSchema.safeParse({
      title: "Planning",
      scheduledAt: "2026-01-02T10:00:00.000Z",
      expiresAt: "2026-01-01T10:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("accepts expiresAt after scheduledAt", () => {
    const result = createMeetingSchema.safeParse({
      title: "Planning",
      scheduledAt: "2026-01-01T10:00:00.000Z",
      expiresAt: "2026-01-01T11:00:00.000Z",
      guestAccess: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a scheduled meeting without expiresAt", () => {
    const result = createMeetingSchema.safeParse({
      title: "Planning",
      scheduledAt: "2026-01-01T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("inviteMeetingMembersSchema", () => {
  it("accepts a non-empty uuid array", () => {
    const result = inviteMeetingMembersSchema.safeParse({
      userIds: ["3f1a2b3c-4d5e-4f60-8172-839405162738"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(inviteMeetingMembersSchema.safeParse({ userIds: [] }).success).toBe(
      false,
    );
  });

  it("rejects non-uuid entries", () => {
    expect(
      inviteMeetingMembersSchema.safeParse({ userIds: ["nope"] }).success,
    ).toBe(false);
  });
});

describe("guestJoinSchema", () => {
  it("accepts a trimmed name", () => {
    expect(guestJoinSchema.safeParse({ name: "Guest One" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(guestJoinSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  it("rejects names longer than 80 chars", () => {
    expect(guestJoinSchema.safeParse({ name: "a".repeat(81) }).success).toBe(
      false,
    );
  });
});
