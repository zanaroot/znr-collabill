import { describe, expect, it } from "vitest";
import { generateSessionToken } from "@/lib/session-token";

describe("session-token", () => {
  it("generates a non-empty string", () => {
    const token = generateSessionToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
  });

  it("generates different tokens on each call", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    expect(token1).not.toBe(token2);
  });

  it("generates a base64url encoded string", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates token of appropriate length", () => {
    const token = generateSessionToken();
    const decoded = Buffer.from(token, "base64url");
    expect(decoded.length).toBe(32);
  });
});
