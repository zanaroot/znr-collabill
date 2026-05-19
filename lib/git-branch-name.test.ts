import { describe, expect, it } from "vitest";
import { generateUniqueGitBranchFromTitle } from "./git-branch-name";

describe("generateUniqueGitBranchFromTitle", () => {
  it("generates a branch with incremental number and slugified title", () => {
    expect(
      generateUniqueGitBranchFromTitle("Add Preview!!! Link --- Task Card", []),
    ).toBe("01-add-preview-link-task-card");
  });

  it("increments number based on existing branches", () => {
    expect(
      generateUniqueGitBranchFromTitle("Add Preview Link Task Card", [
        "01-add-preview-link-task-card",
      ]),
    ).toBe("02-add-preview-link-task-card");
  });

  it("normalizes multiple spaces and punctuation", () => {
    expect(generateUniqueGitBranchFromTitle("  Fix   API!!!   Bug  ", [])).toBe(
      "01-fix-api-bug",
    );
  });

  it("handles empty title", () => {
    expect(generateUniqueGitBranchFromTitle("", [])).toBe("");
  });

  it("handles null-like whitespace title", () => {
    expect(generateUniqueGitBranchFromTitle("   ", [])).toBe("");
  });
});
