import { describe, expect, it } from "vitest";
import { getInitials } from "@/app/_utils/get-initials-text";

describe("getInitials", () => {
  it("returns empty string for null", () => {
    expect(getInitials(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(getInitials(undefined)).toBe("");
  });

  it("returns single letter for single word name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("returns two letters for two word name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns two letters for three word name (only first two)", () => {
    expect(getInitials("John Doe Smith")).toBe("JD");
  });

  it("respects custom max parameter", () => {
    expect(getInitials("John Doe Smith", 3)).toBe("JDS");
  });

  it("handles names with extra whitespace", () => {
    expect(getInitials("  John   Doe  ")).toBe("JD");
  });

  it("converts lowercase letters to uppercase", () => {
    expect(getInitials("john doe")).toBe("JD");
  });

  it("handles numbers in string", () => {
    expect(getInitials("John123 Doe")).toBe("JD");
  });

  it("handles single character names", () => {
    expect(getInitials("J")).toBe("J");
  });

  it("handles empty string", () => {
    expect(getInitials("")).toBe("");
  });

  it("handles non-string input", () => {
    expect(getInitials(123 as unknown)).toBe("1");
  });
});
