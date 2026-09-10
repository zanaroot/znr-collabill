import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/_utils/get-pulic-s3-endpoint", () => ({
  getPublicS3Endpoint: () => "/api/storage",
}));

import {
  extractDescriptionImageUrls,
  isAllowedImageSrc,
  isLocalFilesystemPath,
  normalizeDescriptionImageUrl,
  sanitizeDescriptionHtml,
} from "@/lib/description-image-url";

describe("description-image-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isLocalFilesystemPath", () => {
    it("detects Linux home paths", () => {
      expect(isLocalFilesystemPath("/home/luc/Images/offer.png")).toBe(true);
    });

    it("detects macOS paths", () => {
      expect(isLocalFilesystemPath("/Users/luc/Pictures/photo.png")).toBe(true);
    });

    it("detects Windows paths", () => {
      expect(isLocalFilesystemPath("C:\\Users\\luc\\offer.png")).toBe(true);
    });

    it("detects file protocol URLs", () => {
      expect(isLocalFilesystemPath("file:///home/luc/offer.png")).toBe(true);
    });

    it("allows storage proxy paths", () => {
      expect(
        isLocalFilesystemPath("/api/storage/my-buckets/editor/user/offer.png"),
      ).toBe(false);
    });
  });

  describe("isAllowedImageSrc", () => {
    it("rejects local filesystem paths", () => {
      expect(isAllowedImageSrc("/home/luc/Images/offer.png")).toBe(false);
    });

    it("allows HTTPS URLs", () => {
      expect(isAllowedImageSrc("https://example.com/offer.png")).toBe(true);
    });

    it("allows storage proxy URLs", () => {
      expect(
        isAllowedImageSrc("/api/storage/my-buckets/editor/user/offer.png"),
      ).toBe(true);
    });

    it("allows bucket-relative editor paths", () => {
      expect(isAllowedImageSrc("/my-buckets/editor/user/offer.png")).toBe(true);
    });
  });

  describe("normalizeDescriptionImageUrl", () => {
    it("returns null for local paths", () => {
      expect(normalizeDescriptionImageUrl("/home/luc/Images/offer.png")).toBe(
        null,
      );
    });

    it("prefixes bucket paths with the storage proxy", () => {
      expect(
        normalizeDescriptionImageUrl("/my-buckets/editor/u/offer.png"),
      ).toBe("/api/storage/my-buckets/editor/u/offer.png");
    });

    it("keeps valid proxy URLs unchanged", () => {
      const url = "/api/storage/my-buckets/editor/u/offer.png";
      expect(normalizeDescriptionImageUrl(url)).toBe(url);
    });
  });

  describe("extractDescriptionImageUrls", () => {
    it("extracts and normalizes image URLs from HTML", () => {
      const html =
        '<p>Test</p><img src="/my-buckets/editor/u/offer.png" alt="offer">';
      expect(extractDescriptionImageUrls(html)).toEqual([
        "/api/storage/my-buckets/editor/u/offer.png",
      ]);
    });

    it("ignores local filesystem paths", () => {
      const html = '<img src="/home/luc/Images/offer.png">';
      expect(extractDescriptionImageUrls(html)).toEqual([]);
    });
  });

  describe("sanitizeDescriptionHtml", () => {
    it("normalizes bucket paths in img tags", () => {
      const html = '<img src="/my-buckets/editor/u/offer.png">';
      expect(sanitizeDescriptionHtml(html)).toBe(
        '<img src="/api/storage/my-buckets/editor/u/offer.png">',
      );
    });

    it("removes img tags with local filesystem paths", () => {
      const html = '<p>Hi</p><img src="/home/luc/Images/offer.png">';
      expect(sanitizeDescriptionHtml(html)).toBe("<p>Hi</p>");
    });
  });
});
