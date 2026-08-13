import { describe, expect, it } from "vitest";
import { buildStorageProxyUrl } from "@/lib/storage-proxy";

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
