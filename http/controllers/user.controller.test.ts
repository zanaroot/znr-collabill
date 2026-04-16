import type { Context, Next } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
  adminMiddleware,
  ownerMiddleware,
} from "@/http/middleware/auth.middleware";
import type { Role } from "@/http/models/user.model";

const createMockContext = (
  user: { organizationRole: Role } | undefined,
): Context => {
  return {
    get: () => user,
    json: vi.fn().mockReturnThis(),
  } as unknown as Context;
};

const createMockNext = (): Next => vi.fn() as Next;

describe("auth middleware permissions", () => {
  describe("adminMiddleware", () => {
    it("allows OWNER role", async () => {
      const c = createMockContext({ organizationRole: "OWNER" });
      const next = createMockNext();
      await adminMiddleware(c, next);
      expect(next).toHaveBeenCalled();
    });

    it("allows ADMIN role", async () => {
      const c = createMockContext({ organizationRole: "ADMIN" });
      const next = createMockNext();
      await adminMiddleware(c, next);
      expect(next).toHaveBeenCalled();
    });

    it("blocks COLLABORATOR role", async () => {
      const c = createMockContext({ organizationRole: "COLLABORATOR" });
      const next = createMockNext();
      await adminMiddleware(c, next);
      expect(next).not.toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        { error: "Forbidden: Admin or Owner role required" },
        403,
      );
    });

    it("blocks when no user", async () => {
      const c = createMockContext(undefined);
      const next = createMockNext();
      await adminMiddleware(c, next);
      expect(next).not.toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        { error: "Forbidden: Admin or Owner role required" },
        403,
      );
    });
  });

  describe("ownerMiddleware", () => {
    it("allows OWNER role", async () => {
      const c = createMockContext({ organizationRole: "OWNER" });
      const next = createMockNext();
      await ownerMiddleware(c, next);
      expect(next).toHaveBeenCalled();
    });

    it("blocks ADMIN role", async () => {
      const c = createMockContext({ organizationRole: "ADMIN" });
      const next = createMockNext();
      await ownerMiddleware(c, next);
      expect(next).not.toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        { error: "Forbidden: Owner role required" },
        403,
      );
    });

    it("blocks COLLABORATOR role", async () => {
      const c = createMockContext({ organizationRole: "COLLABORATOR" });
      const next = createMockNext();
      await ownerMiddleware(c, next);
      expect(next).not.toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        { error: "Forbidden: Owner role required" },
        403,
      );
    });
  });
});

describe("permission helper functions", () => {
  const isAdmin = (role: Role): boolean => role === "OWNER" || role === "ADMIN";

  it("should allow OWNER as admin", () => {
    expect(isAdmin("OWNER")).toBe(true);
  });

  it("should allow ADMIN as admin", () => {
    expect(isAdmin("ADMIN")).toBe(true);
  });

  it("should NOT allow COLLABORATOR as admin", () => {
    expect(isAdmin("COLLABORATOR")).toBe(false);
  });
});
