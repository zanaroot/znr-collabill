import { describe, expect, it } from "vitest";
import {
  buildStorageProxyUrl,
  isProjectFileBucketPath,
} from "@/lib/storage-proxy";

describe("buildStorageProxyUrl", () => {
  const endpoint = "http://159.89.7.166:9000";

  it("maps /api/storage paths to the upstream endpoint", () => {
    const url = buildStorageProxyUrl(
      "/api/storage/my-buckets/avatars/user1.jpeg",
      "",
      endpoint,
    );
    expect(url.href).toBe(
      "http://159.89.7.166:9000/my-buckets/avatars/user1.jpeg",
    );
  });

  describe("isProjectFileBucketPath", () => {
    it("recognizes the private project-files bucket, including encoded path segments", () => {
      expect(
        isProjectFileBucketPath(
          "/collabill-project-files/organizations/1/file",
          "collabill-project-files",
        ),
      ).toBe(true);
      expect(
        isProjectFileBucketPath(
          "/collabill%2Dproject%2Dfiles/organizations/1/file",
          "collabill-project-files",
        ),
      ).toBe(true);
    });

    it("allows unrelated buckets and blocks malformed encoded paths", () => {
      expect(
        isProjectFileBucketPath("/my-buckets/avatars/file", "project-files"),
      ).toBe(false);
      expect(isProjectFileBucketPath("/bad%zz/path", "project-files")).toBe(
        true,
      );
    });
  });

  it("preserves query parameters", () => {
    const url = buildStorageProxyUrl(
      "/api/storage/my-buckets/avatars/user1.jpeg",
      "?x=1&y=2",
      endpoint,
    );
    expect(url.href).toBe(
      "http://159.89.7.166:9000/my-buckets/avatars/user1.jpeg?x=1&y=2",
    );
  });

  it("strips a trailing slash from the endpoint", () => {
    const url = buildStorageProxyUrl(
      "/api/storage/my-buckets/avatars/user1.jpeg",
      "",
      `${endpoint}/`,
    );
    expect(url.href).toBe(
      "http://159.89.7.166:9000/my-buckets/avatars/user1.jpeg",
    );
  });

  it("resolves to the endpoint root when only the prefix is requested", () => {
    const url = buildStorageProxyUrl("/api/storage", "", endpoint);
    expect(url.href).toBe(`${endpoint}/`);
  });

  it("does not rewrite paths outside the storage prefix", () => {
    const url = buildStorageProxyUrl("/api/users", "", endpoint);
    expect(url.href).toBe(`${endpoint}/api/users`);
  });
});
