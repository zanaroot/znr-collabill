import { describe, expect, it } from "vitest";
import {
  canDeleteTaskByStatus,
  canTransitionTaskStatus,
  getAllowedTaskTransitions,
} from "@/app/_utils/task-workflow";

describe("task-workflow", () => {
  describe("canTransitionTaskStatus", () => {
    it("returns true when transitioning to same status", () => {
      const result = canTransitionTaskStatus({
        from: "TODO",
        to: "TODO",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(true);
    });

    it("allows TODO to IN_PROGRESS", () => {
      const result = canTransitionTaskStatus({
        from: "TODO",
        to: "IN_PROGRESS",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(true);
    });

    it("allows TODO to BLOCKED", () => {
      const result = canTransitionTaskStatus({
        from: "TODO",
        to: "BLOCKED",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(true);
    });

    it("allows TODO to TRASH", () => {
      const result = canTransitionTaskStatus({
        from: "TODO",
        to: "TRASH",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(true);
    });

    it("allows IN_PROGRESS to IN_REVIEW", () => {
      const result = canTransitionTaskStatus({
        from: "IN_PROGRESS",
        to: "IN_REVIEW",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(true);
    });

    it("allows IN_PROGRESS to TODO", () => {
      const result = canTransitionTaskStatus({
        from: "IN_PROGRESS",
        to: "TODO",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(true);
    });

    it("allows BLOCKED to TODO", () => {
      const result = canTransitionTaskStatus({
        from: "BLOCKED",
        to: "TODO",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(true);
    });

    it("allows BLOCKED to TRASH", () => {
      const result = canTransitionTaskStatus({
        from: "BLOCKED",
        to: "TRASH",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(true);
    });

    it("IN_REVIEW cannot transition without owner/admin", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "APPROVED",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(false);
    });

    it("IN_REVIEW can transition to TRASH as owner", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "TRASH",
        userRole: "OWNER",
      });
      expect(result).toBe(true);
    });

    it("IN_REVIEW can transition to TRASH as admin", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "TRASH",
        userRole: "ADMIN",
      });
      expect(result).toBe(true);
    });

    it("IN_REVIEW can transition to IN_PROGRESS as owner", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "IN_PROGRESS",
        userRole: "OWNER",
      });
      expect(result).toBe(true);
    });

    it("IN_REVIEW can transition to APPROVED as owner", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "APPROVED",
        userRole: "OWNER",
      });
      expect(result).toBe(true);
    });

    it("BACKLOG cannot be moved without owner/admin", () => {
      const result = canTransitionTaskStatus({
        from: "BACKLOG",
        to: "TODO",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(false);
    });

    it("BACKLOG can be moved to TODO as owner", () => {
      const result = canTransitionTaskStatus({
        from: "BACKLOG",
        to: "TODO",
        userRole: "OWNER",
      });
      expect(result).toBe(true);
    });

    it("BACKLOG can be moved to TODO as admin", () => {
      const result = canTransitionTaskStatus({
        from: "BACKLOG",
        to: "TODO",
        userRole: "ADMIN",
      });
      expect(result).toBe(true);
    });

    it("BACKLOG can be moved to TRASH as owner", () => {
      const result = canTransitionTaskStatus({
        from: "BACKLOG",
        to: "TRASH",
        userRole: "OWNER",
      });
      expect(result).toBe(true);
    });

    it("APPROVED to IN_REVIEW is allowed for reviewer", () => {
      const result = canTransitionTaskStatus({
        from: "APPROVED",
        to: "IN_REVIEW",
        userRole: "COLLABORATOR",
        reviewerId: "user-1",
        userId: "user-1",
      });
      expect(result).toBe(true);
    });

    it("APPROVED to IN_REVIEW is allowed for owner", () => {
      const result = canTransitionTaskStatus({
        from: "APPROVED",
        to: "IN_REVIEW",
        userRole: "OWNER",
      });
      expect(result).toBe(true);
    });

    it("APPROVED to IN_REVIEW is allowed for admin", () => {
      const result = canTransitionTaskStatus({
        from: "APPROVED",
        to: "IN_REVIEW",
        userRole: "ADMIN",
      });
      expect(result).toBe(true);
    });

    it("APPROVED to IN_REVIEW is denied for collaborator non-reviewer", () => {
      const result = canTransitionTaskStatus({
        from: "APPROVED",
        to: "IN_REVIEW",
        userRole: "COLLABORATOR",
        reviewerId: "other-user",
        userId: "user-1",
      });
      expect(result).toBe(false);
    });

    it("APPROVED to VALIDATED is allowed for owner", () => {
      const result = canTransitionTaskStatus({
        from: "APPROVED",
        to: "VALIDATED",
        userRole: "OWNER",
      });
      expect(result).toBe(true);
    });

    it("APPROVED to VALIDATED is allowed for admin", () => {
      const result = canTransitionTaskStatus({
        from: "APPROVED",
        to: "VALIDATED",
        userRole: "ADMIN",
      });
      expect(result).toBe(true);
    });

    it("APPROVED to VALIDATED is denied for collaborator", () => {
      const result = canTransitionTaskStatus({
        from: "APPROVED",
        to: "VALIDATED",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(false);
    });

    it("APPROVED cannot transition to TODO", () => {
      const result = canTransitionTaskStatus({
        from: "APPROVED",
        to: "TODO",
        userRole: "OWNER",
      });
      expect(result).toBe(false);
    });

    it("VALIDATED to APPROVED is allowed for owner", () => {
      const result = canTransitionTaskStatus({
        from: "VALIDATED",
        to: "APPROVED",
        userRole: "OWNER",
      });
      expect(result).toBe(true);
    });

    it("VALIDATED to APPROVED is allowed for admin", () => {
      const result = canTransitionTaskStatus({
        from: "VALIDATED",
        to: "APPROVED",
        userRole: "ADMIN",
      });
      expect(result).toBe(true);
    });

    it("VALIDATED to APPROVED is denied for collaborator", () => {
      const result = canTransitionTaskStatus({
        from: "VALIDATED",
        to: "APPROVED",
        userRole: "COLLABORATOR",
      });
      expect(result).toBe(false);
    });

    it("VALIDATED cannot transition to any status", () => {
      const result = canTransitionTaskStatus({
        from: "VALIDATED",
        to: "TODO",
        userRole: "OWNER",
      });
      expect(result).toBe(false);
    });

    it("TRASH cannot transition to any status", () => {
      const result = canTransitionTaskStatus({
        from: "TRASH",
        to: "TODO",
        userRole: "OWNER",
      });
      expect(result).toBe(false);
    });

    it("ARCHIVED cannot transition to any status", () => {
      const result = canTransitionTaskStatus({
        from: "ARCHIVED",
        to: "TODO",
        userRole: "OWNER",
      });
      expect(result).toBe(false);
    });
  });

  describe("getAllowedTaskTransitions", () => {
    it("returns all transitions from TODO", () => {
      const result = getAllowedTaskTransitions({
        from: "TODO",
        userRole: "COLLABORATOR",
      });
      expect(result).toContain("IN_PROGRESS");
      expect(result).toContain("BLOCKED");
      expect(result).toContain("TRASH");
    });

    it("returns all transitions from IN_PROGRESS", () => {
      const result = getAllowedTaskTransitions({
        from: "IN_PROGRESS",
        userRole: "COLLABORATOR",
      });
      expect(result).toContain("BLOCKED");
      expect(result).toContain("TRASH");
      expect(result).toContain("TODO");
      expect(result).toContain("IN_REVIEW");
    });

    it("returns ARCHIVED from VALIDATED for collaborator", () => {
      const result = getAllowedTaskTransitions({
        from: "VALIDATED",
        userRole: "COLLABORATOR",
      });
      expect(result).toContain("ARCHIVED");
      expect(result).not.toContain("APPROVED");
    });

    it("returns ARCHIVED and APPROVED from VALIDATED for owner", () => {
      const result = getAllowedTaskTransitions({
        from: "VALIDATED",
        userRole: "OWNER",
      });
      expect(result).toContain("ARCHIVED");
      expect(result).toContain("APPROVED");
    });

    it("returns IN_REVIEW transitions for owner", () => {
      const result = getAllowedTaskTransitions({
        from: "IN_REVIEW",
        userRole: "OWNER",
      });
      expect(result).toContain("TRASH");
      expect(result).toContain("IN_PROGRESS");
      expect(result).toContain("APPROVED");
    });

    it("returns IN_REVIEW transitions for admin", () => {
      const result = getAllowedTaskTransitions({
        from: "IN_REVIEW",
        userRole: "ADMIN",
      });
      expect(result).toContain("TRASH");
      expect(result).toContain("IN_PROGRESS");
      expect(result).toContain("APPROVED");
    });

    it("returns empty array from IN_REVIEW for collaborator", () => {
      const result = getAllowedTaskTransitions({
        from: "IN_REVIEW",
        userRole: "COLLABORATOR",
      });
      expect(result).toHaveLength(0);
    });

    it("returns BACKLOG transitions for owner", () => {
      const result = getAllowedTaskTransitions({
        from: "BACKLOG",
        userRole: "OWNER",
      });
      expect(result).toContain("TODO");
      expect(result).toContain("TRASH");
    });

    it("returns BACKLOG transitions for admin", () => {
      const result = getAllowedTaskTransitions({
        from: "BACKLOG",
        userRole: "ADMIN",
      });
      expect(result).toContain("TODO");
      expect(result).toContain("TRASH");
    });

    it("returns empty array from BACKLOG for collaborator", () => {
      const result = getAllowedTaskTransitions({
        from: "BACKLOG",
        userRole: "COLLABORATOR",
      });
      expect(result).toHaveLength(0);
    });

    it("returns empty array from TRASH", () => {
      const result = getAllowedTaskTransitions({
        from: "TRASH",
        userRole: "OWNER",
      });
      expect(result).toHaveLength(0);
    });

    it("returns IN_REVIEW from APPROVED for reviewer", () => {
      const result = getAllowedTaskTransitions({
        from: "APPROVED",
        userRole: "COLLABORATOR",
        reviewerId: "user-1",
        userId: "user-1",
      });
      expect(result).toContain("IN_REVIEW");
      expect(result).not.toContain("VALIDATED");
    });

    it("returns IN_REVIEW and VALIDATED from APPROVED for owner", () => {
      const result = getAllowedTaskTransitions({
        from: "APPROVED",
        userRole: "OWNER",
      });
      expect(result).toContain("IN_REVIEW");
      expect(result).toContain("VALIDATED");
    });

    it("returns IN_REVIEW and VALIDATED from APPROVED for admin", () => {
      const result = getAllowedTaskTransitions({
        from: "APPROVED",
        userRole: "ADMIN",
      });
      expect(result).toContain("IN_REVIEW");
      expect(result).toContain("VALIDATED");
    });

    it("returns empty array from APPROVED for non-reviewer collaborator", () => {
      const result = getAllowedTaskTransitions({
        from: "APPROVED",
        userRole: "COLLABORATOR",
        reviewerId: "other-user",
        userId: "user-1",
      });
      expect(result).toHaveLength(0);
    });

    it("returns empty array from ARCHIVED", () => {
      const result = getAllowedTaskTransitions({
        from: "ARCHIVED",
        userRole: "OWNER",
      });
      expect(result).toContain("VALIDATED");
    });
  });

  describe("canDeleteTaskByStatus", () => {
    it("returns true for TODO", () => {
      expect(canDeleteTaskByStatus("TODO")).toBe(true);
    });

    it("returns true for IN_PROGRESS", () => {
      expect(canDeleteTaskByStatus("IN_PROGRESS")).toBe(true);
    });

    it("returns true for BLOCKED", () => {
      expect(canDeleteTaskByStatus("BLOCKED")).toBe(true);
    });

    it("returns true for TRASH", () => {
      expect(canDeleteTaskByStatus("TRASH")).toBe(true);
    });

    it("returns false for BACKLOG", () => {
      expect(canDeleteTaskByStatus("BACKLOG")).toBe(false);
    });

    it("returns false for IN_REVIEW", () => {
      expect(canDeleteTaskByStatus("IN_REVIEW")).toBe(false);
    });

    it("returns false for APPROVED", () => {
      expect(canDeleteTaskByStatus("APPROVED")).toBe(false);
    });

    it("returns false for VALIDATED", () => {
      expect(canDeleteTaskByStatus("VALIDATED")).toBe(false);
    });

    it("returns false for ARCHIVED", () => {
      expect(canDeleteTaskByStatus("ARCHIVED")).toBe(false);
    });
  });
});
