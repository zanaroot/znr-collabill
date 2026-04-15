import { describe, expect, it } from "vitest";
import { generateSlug } from "@/lib/text-to-slug";

describe("generateSlug", () => {
  it("converts lowercase letters", () => {
    expect(generateSlug("My Organization")).toBe("my-organization");
  });

  it("removes special characters", () => {
    expect(generateSlug("Org #1!")).toBe("org-1");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("My Company LLC")).toBe("my-company-llc");
  });

  it("handles multiple consecutive spaces", () => {
    expect(generateSlug("My    Organization")).toBe("my-organization");
  });

  it("removes leading hyphens", () => {
    expect(generateSlug("!@#Org")).toBe("org");
  });

  it("removes trailing hyphens", () => {
    expect(generateSlug("Org!@#")).toBe("org");
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("handles unicode characters", () => {
    expect(generateSlug("Orgñé")).toBe("org");
  });

  it("keeps numbers", () => {
    expect(generateSlug("Company 2024")).toBe("company-2024");
  });

  it("handles single word", () => {
    expect(generateSlug("Company")).toBe("company");
  });
});
