import { describe, expect, it } from "vitest";
import {
  buildGitBranchNameFromTitle,
  ensureUniqueGitBranchName,
  generateUniqueGitBranchFromTitle,
} from "@/lib/git-branch-name";

describe("buildGitBranchNameFromTitle", () => {
  it("slugifies title with numeric prefix", () => {
    expect(buildGitBranchNameFromTitle("Add preview link to task card")).toBe(
      "01-add-preview-link-to-task-card",
    );
  });

  it("returns empty string for blank title", () => {
    expect(buildGitBranchNameFromTitle("   ")).toBe("");
  });
});

describe("ensureUniqueGitBranchName", () => {
  it("returns base name when no conflict", () => {
    expect(ensureUniqueGitBranchName("01-my-task", ["02-other-task"])).toBe(
      "01-my-task",
    );
  });

  it("increments suffix number on conflict", () => {
    expect(
      ensureUniqueGitBranchName("01-my-task", [
        "01-my-task",
        "02-my-task",
        "03-my-task",
      ]),
    ).toBe("04-my-task");
  });

  it("handles large number sequences", () => {
    const existing = ["01-my-task"];

    for (let i = 2; i < 50; i++) {
      const num = String(i).padStart(2, "0");
      existing.push(`${num}-my-task`);
    }

    expect(ensureUniqueGitBranchName("01-my-task", existing)).toBe(
      "50-my-task",
    );
  });
});

describe("generateUniqueGitBranchFromTitle", () => {
  it("generates numbered branch from title", () => {
    expect(
      generateUniqueGitBranchFromTitle("Add preview link to task card", [
        "01-add-preview-link-to-task-card",
      ]),
    ).toBe("02-add-preview-link-to-task-card");
  });

  it("starts at 01 when no existing branches", () => {
    expect(
      generateUniqueGitBranchFromTitle("Add preview link to task card", []),
    ).toBe("01-add-preview-link-to-task-card");
  });
});
