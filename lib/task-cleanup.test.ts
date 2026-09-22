import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/_utils/get-pulic-s3-endpoint", () => ({
  getPublicS3Endpoint: () => "/api/storage",
}));

import {
  collectStorageKeysFromDescriptions,
  extractStorageKeyFromUrl,
  getCleanupPeriodKeys,
  selectDeletableKeys,
  selectReferencedKeys,
} from "@/lib/task-cleanup";

const BUCKET = "my-buckets";

describe("task-cleanup", () => {
  describe("getCleanupPeriodKeys", () => {
    it("runs the current period on the last day of the month", () => {
      expect(getCleanupPeriodKeys(new Date(2026, 0, 31))).toEqual(["2026-01"]);
      expect(getCleanupPeriodKeys(new Date(2026, 2, 31))).toEqual(["2026-03"]);
      expect(getCleanupPeriodKeys(new Date(2027, 1, 28))).toEqual(["2027-02"]);
      expect(getCleanupPeriodKeys(new Date(2028, 1, 29))).toEqual(["2028-02"]);
      expect(getCleanupPeriodKeys(new Date(2025, 11, 31))).toEqual(["2025-12"]);
    });

    it("does not run mid-month", () => {
      expect(getCleanupPeriodKeys(new Date(2026, 0, 15))).toEqual([]);
      expect(getCleanupPeriodKeys(new Date(2026, 0, 1))).toEqual(["2025-12"]);
      expect(getCleanupPeriodKeys(new Date(2026, 1, 8))).toEqual([]);
    });

    it("allows catch-up for the previous period during the first 7 days", () => {
      expect(getCleanupPeriodKeys(new Date(2026, 1, 1))).toEqual(["2026-01"]);
      expect(getCleanupPeriodKeys(new Date(2026, 1, 7))).toEqual(["2026-01"]);
    });
  });

  describe("extractStorageKeyFromUrl", () => {
    it("extracts keys from storage proxy URLs", () => {
      expect(
        extractStorageKeyFromUrl(
          "/api/storage/my-buckets/editor/u1/a.png",
          BUCKET,
        ),
      ).toBe("editor/u1/a.png");
    });

    it("extracts keys from bucket-relative URLs", () => {
      expect(
        extractStorageKeyFromUrl("/my-buckets/editor/u1/a.png", BUCKET),
      ).toBe("editor/u1/a.png");
    });

    it("extracts keys from absolute URLs", () => {
      expect(
        extractStorageKeyFromUrl(
          "http://minio:9000/my-buckets/editor/u1/a.png",
          BUCKET,
        ),
      ).toBe("editor/u1/a.png");
      expect(
        extractStorageKeyFromUrl(
          "https://app.example.com/api/storage/my-buckets/editor/u1/a.png",
          BUCKET,
        ),
      ).toBe("editor/u1/a.png");
    });

    it("strips query strings", () => {
      expect(
        extractStorageKeyFromUrl(
          "/api/storage/my-buckets/editor/u1/a.png?v=2",
          BUCKET,
        ),
      ).toBe("editor/u1/a.png");
    });

    it("rejects avatar keys", () => {
      expect(
        extractStorageKeyFromUrl(
          "/api/storage/my-buckets/avatars/u1/p.png",
          BUCKET,
        ),
      ).toBe(null);
    });

    it("rejects keys from other buckets", () => {
      expect(
        extractStorageKeyFromUrl(
          "/api/storage/other-bucket/editor/u1/a.png",
          BUCKET,
        ),
      ).toBe(null);
    });

    it("rejects external URLs", () => {
      expect(
        extractStorageKeyFromUrl("https://example.com/x.png", BUCKET),
      ).toBe(null);
    });

    it("rejects path traversal", () => {
      expect(
        extractStorageKeyFromUrl(
          "/api/storage/my-buckets/editor/../secret.png",
          BUCKET,
        ),
      ).toBe(null);
    });

    it("rejects empty values", () => {
      expect(extractStorageKeyFromUrl("", BUCKET)).toBe(null);
      expect(extractStorageKeyFromUrl("   ", BUCKET)).toBe(null);
    });
  });

  describe("collectStorageKeysFromDescriptions", () => {
    it("collects unique editor keys from description HTML", () => {
      const html = '<p><img src="/api/storage/my-buckets/editor/u1/a.png"></p>';
      const other =
        '<p><img src="/my-buckets/editor/u1/a.png"><img src="/api/storage/my-buckets/avatars/u1/p.png"></p>';

      expect(
        collectStorageKeysFromDescriptions([html, other, null], BUCKET),
      ).toEqual(["editor/u1/a.png"]);
    });

    it("returns an empty list for empty descriptions", () => {
      expect(
        collectStorageKeysFromDescriptions([null, undefined, ""], BUCKET),
      ).toEqual([]);
    });
  });

  describe("selectReferencedKeys", () => {
    it("finds keys mentioned in surviving content", () => {
      const keys = ["editor/u1/a.png", "editor/u1/b.png"];
      const contents = [
        'kept <img src="/api/storage/my-buckets/editor/u1/b.png">',
        null,
      ];

      expect(selectReferencedKeys(keys, contents)).toEqual(["editor/u1/b.png"]);
    });

    it("matches case-sensitively", () => {
      expect(
        selectReferencedKeys(
          ["editor/u1/a.png"],
          ["Editor/u1/a.png is not the same object"],
        ),
      ).toEqual([]);
    });
  });

  describe("selectDeletableKeys", () => {
    it("removes referenced keys from candidates", () => {
      const candidates = ["editor/u1/a.png", "editor/u1/b.png"];
      expect(selectDeletableKeys(candidates, ["editor/u1/b.png"])).toEqual([
        "editor/u1/a.png",
      ]);
    });

    it("returns all candidates when nothing is referenced", () => {
      const candidates = ["editor/u1/a.png", "editor/u1/b.png"];
      expect(selectDeletableKeys(candidates, [])).toEqual(candidates);
    });
  });
});
