import { describe, expect, it } from "vitest";
import { getRepoDetails } from "./github";

describe("lib/github.ts", () => {
  describe("getRepoDetails", () => {
    it("should return owner and repo for a standard GitHub URL", () => {
      const result = getRepoDetails("https://github.com/owner/repo");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should return owner and repo for a URL with .git suffix", () => {
      const result = getRepoDetails("https://github.com/owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should return owner and repo for an http URL", () => {
      const result = getRepoDetails("http://github.com/owner/repo");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should return null for a non-github URL", () => {
      const result = getRepoDetails("https://gitlab.com/owner/repo");
      expect(result).toBeNull();
    });

    it("should return null for an invalid URL", () => {
      const result = getRepoDetails("not-a-url");
      expect(result).toBeNull();
    });

    it("should return null for a GitHub URL without repo", () => {
      const result = getRepoDetails("https://github.com/owner");
      expect(result).toBeNull();
    });
  });
});
