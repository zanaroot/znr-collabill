// lib/git-branch-name.test.ts

import { describe, expect, it } from "vitest";
import { generateUniqueGitBranchFromTitle } from "./git-branch-name";

describe("generateUniqueGitBranchFromTitle", () => {
  it("generates a basic slug with prefix 01", () => {
    expect(
      generateUniqueGitBranchFromTitle("Add Preview!!! Link --- Task Card", []),
    ).toBe("01-add-preview-link-task-card");
  });

  it("increments based on existing branches", () => {
    expect(
      generateUniqueGitBranchFromTitle("Add Preview Link Task Card", [
        "01-add-preview-link-task-card",
        "02-other",
      ]),
    ).toBe("03-add-preview-link-task-card");
  });

  it("normalizes unicode accents correctly", () => {
    expect(
      generateUniqueGitBranchFromTitle("Implementación Déploiement", []),
    ).toBe("01-implementacion-deploiement");
  });

  it("returns fallback when title is only special characters", () => {
    expect(generateUniqueGitBranchFromTitle("!!!@@@###", [])).toBe(
      "01-untitled",
    );
  });

  it("returns empty string when title is empty", () => {
    expect(generateUniqueGitBranchFromTitle("", [])).toBe("");
  });

  it("handles whitespace-only title", () => {
    expect(generateUniqueGitBranchFromTitle("   ", [])).toBe("");
  });

  it("handles numbers in title", () => {
    expect(generateUniqueGitBranchFromTitle("2024 Budget Planning", [])).toBe(
      "01-2024-budget-planning",
    );
  });

  it("limits slug length to 50 chars", () => {
    const longTitle = "a".repeat(200);

    const result = generateUniqueGitBranchFromTitle(longTitle, []);

    expect(result.startsWith("01-")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(53);
  });

  it("handles max existing number correctly", () => {
    expect(
      generateUniqueGitBranchFromTitle("Task Card", [
        "01-task-card",
        "09-task-card",
        "03-task-card",
      ]),
    ).toBe("10-task-card");
  });
});
