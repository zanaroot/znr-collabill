import { describe, expect, it } from "vitest";
import {
  isPreviewableProjectTextFile,
  isSensitiveProjectFileName,
} from "./project-files";

describe("project file classification", () => {
  it.each([
    ["notes.txt", "application/octet-stream"],
    ["notes.md", "application/octet-stream"],
    ["settings.json", "application/octet-stream"],
    ["config.yaml", "application/octet-stream"],
    [".env", "text/plain"],
    [".env.local", "text/plain"],
  ])("recognizes %s as previewable text", (name, mimeType) => {
    expect(isPreviewableProjectTextFile(name, mimeType)).toBe(true);
  });

  it("does not allow HTML files to be previewed as text based on their extension", () => {
    expect(isPreviewableProjectTextFile("page.html", "text/html")).toBe(false);
  });

  it.each([
    ".env",
    ".env.local",
    ".ENV.production",
  ])("marks %s as sensitive", (name) => {
    expect(isSensitiveProjectFileName(name)).toBe(true);
  });
});
