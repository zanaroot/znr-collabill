import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAvatarUrl, getAvatarUrlByEmail } from "@/lib/get-avatar-url";

describe("getAvatarUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_S3_ENDPOINT", "http://localhost:9000");
  });

  it("returns avatar URL if avatar is a full URL", () => {
    const result = getAvatarUrl(
      "https://example.com/avatar.png",
      "test@example.com",
    );
    expect(result).toBe("https://example.com/avatar.png");
  });

  it("returns S3 endpoint path for relative avatar path", () => {
    const result = getAvatarUrl("/avatars/user1.png", "test@example.com");
    expect(result).toBe("http://localhost:9000/avatars/user1.png");
  });

  it("returns S3 endpoint path for avatar without leading slash", () => {
    const result = getAvatarUrl("avatars/user1.png", "test@example.com");
    expect(result).toBe("http://localhost:9000/avatars/user1.png");
  });

  it("returns DiceBear URL when no avatar provided", () => {
    const result = getAvatarUrl(null, "test@example.com");
    expect(result).toContain("api.dicebear.com");
    expect(result).toContain("test%40example.com");
  });

  it("returns DiceBear URL when avatar is undefined", () => {
    const result = getAvatarUrl(undefined, "test@example.com");
    expect(result).toContain("api.dicebear.com");
    expect(result).toContain("test%40example.com");
  });

  it("handles null email with default seed", () => {
    const result = getAvatarUrl(null, null);
    expect(result).toContain("default");
  });

  it("handles undefined email with default seed", () => {
    const result = getAvatarUrl(null, undefined);
    expect(result).toContain("default");
  });

  it("normalizes email with trimming and lowercase", () => {
    const result = getAvatarUrl(null, "  Test@Example.com  ");
    expect(result).toContain(encodeURIComponent("test@example.com"));
  });
});

describe("getAvatarUrlByEmail", () => {
  it("returns DiceBear URL with email seed", () => {
    const result = getAvatarUrlByEmail("test@example.com");
    expect(result).toContain("api.dicebear.com");
    expect(result).toContain("test%40example.com");
  });

  it("returns default seed for null email", () => {
    const result = getAvatarUrlByEmail(null);
    expect(result).toContain("default");
  });

  it("returns default seed for undefined email", () => {
    const result = getAvatarUrlByEmail(undefined);
    expect(result).toContain("default");
  });

  it("returns default seed for empty string", () => {
    const result = getAvatarUrlByEmail("");
    expect(result).toContain("default");
  });

  it("normalizes email to lowercase", () => {
    const result = getAvatarUrlByEmail("Test@Example.COM");
    expect(result).toContain("test%40example.com");
  });

  it("trims whitespace from email", () => {
    const result = getAvatarUrlByEmail("  test@example.com  ");
    expect(result).toContain("test%40example.com");
  });
});
