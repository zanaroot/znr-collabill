import { describe, expect, it } from "vitest";
import {
  buildGuestIdentity,
  buildMemberIdentity,
  CALL_HISTORY_LIMIT,
  generateCallRoomName,
  generateGuestToken,
  generateMeetingRoomName,
  getRingCutoff,
  hashInviteToken,
  PARTICIPANT_TOKEN_TTL_SECONDS,
} from "@/lib/call-utils";

describe("call-utils", () => {
  describe("generateCallRoomName", () => {
    it("prefixes call rooms", () => {
      expect(generateCallRoomName()).toMatch(/^call_[0-9a-f-]{36}$/);
    });

    it("generates unique room names", () => {
      expect(generateCallRoomName()).not.toBe(generateCallRoomName());
    });
  });

  describe("generateMeetingRoomName", () => {
    it("prefixes meeting rooms", () => {
      expect(generateMeetingRoomName()).toMatch(/^meet_[0-9a-f-]{36}$/);
    });

    it("generates unique room names", () => {
      expect(generateMeetingRoomName()).not.toBe(generateMeetingRoomName());
    });
  });

  describe("generateGuestToken", () => {
    it("generates base64url tokens", () => {
      expect(generateGuestToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("generates unique tokens", () => {
      expect(generateGuestToken()).not.toBe(generateGuestToken());
    });
  });

  describe("hashInviteToken", () => {
    it("is deterministic", () => {
      expect(hashInviteToken("abc")).toBe(hashInviteToken("abc"));
    });

    it("produces different hashes for different tokens", () => {
      expect(hashInviteToken("abc")).not.toBe(hashInviteToken("abd"));
    });

    it("returns a hex sha256 digest", () => {
      expect(hashInviteToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("identities", () => {
    it("builds member identities", () => {
      expect(buildMemberIdentity("user-1")).toBe("user_user-1");
    });

    it("builds guest identities", () => {
      expect(buildGuestIdentity()).toMatch(/^guest_[0-9a-f-]{36}$/);
    });
  });

  describe("getRingCutoff", () => {
    it("returns a time 45 seconds in the past", () => {
      const now = new Date("2026-01-01T12:00:00.000Z");
      expect(getRingCutoff(now).toISOString()).toBe("2026-01-01T11:59:15.000Z");
    });
  });

  describe("constants", () => {
    it("exposes history and token ttl", () => {
      expect(CALL_HISTORY_LIMIT).toBe(50);
      expect(PARTICIPANT_TOKEN_TTL_SECONDS).toBe(900);
    });
  });
});
