import { describe, expect, it } from "vitest";
import {
  canDeleteTaskByStatus,
  canTransitionTaskStatus,
  getAllowedTaskTransitions,
} from "@/lib/task-workflow";

describe("task-workflow", () => {
  describe("canTransitionTaskStatus", () => {
    it("returns true when transitioning to same status", () => {
      const result = canTransitionTaskStatus({
        from: "TODO",
        to: "TODO",
        isProjectOwner: false,
      });
      expect(result).toBe(true);
    });

    it("allows TODO to IN_PROGRESS", () => {
      const result = canTransitionTaskStatus({
        from: "TODO",
        to: "IN_PROGRESS",
        isProjectOwner: false,
      });
      expect(result).toBe(true);
    });

    it("allows TODO to BLOCKED", () => {
      const result = canTransitionTaskStatus({
        from: "TODO",
        to: "BLOCKED",
        isProjectOwner: false,
      });
      expect(result).toBe(true);
    });

    it("allows TODO to TRASH", () => {
      const result = canTransitionTaskStatus({
        from: "TODO",
        to: "TRASH",
        isProjectOwner: false,
      });
      expect(result).toBe(true);
    });

    it("allows IN_PROGRESS to IN_REVIEW", () => {
      const result = canTransitionTaskStatus({
        from: "IN_PROGRESS",
        to: "IN_REVIEW",
        isProjectOwner: false,
      });
      expect(result).toBe(true);
    });

    it("allows IN_PROGRESS to TODO", () => {
      const result = canTransitionTaskStatus({
        from: "IN_PROGRESS",
        to: "TODO",
        isProjectOwner: false,
      });
      expect(result).toBe(true);
    });

    it("allows BLOCKED to TODO", () => {
      const result = canTransitionTaskStatus({
        from: "BLOCKED",
        to: "TODO",
        isProjectOwner: false,
      });
      expect(result).toBe(true);
    });

    it("allows BLOCKED to TRASH", () => {
      const result = canTransitionTaskStatus({
        from: "BLOCKED",
        to: "TRASH",
        isProjectOwner: false,
      });
      expect(result).toBe(true);
    });

    it("IN_REVIEW cannot transition without project owner", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "VALIDATED",
        isProjectOwner: false,
      });
      expect(result).toBe(false);
    });

    it("IN_REVIEW can transition to TRASH as project owner", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "TRASH",
        isProjectOwner: true,
      });
      expect(result).toBe(true);
    });

    it("IN_REVIEW can transition to IN_PROGRESS as project owner", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "IN_PROGRESS",
        isProjectOwner: true,
      });
      expect(result).toBe(true);
    });

    it("IN_REVIEW can transition to VALIDATED as project owner", () => {
      const result = canTransitionTaskStatus({
        from: "IN_REVIEW",
        to: "VALIDATED",
        isProjectOwner: true,
      });
      expect(result).toBe(true);
    });

    it("VALIDATED cannot transition to any status", () => {
      const result = canTransitionTaskStatus({
        from: "VALIDATED",
        to: "TODO",
        isProjectOwner: true,
      });
      expect(result).toBe(false);
    });

    it("TRASH cannot transition to any status", () => {
      const result = canTransitionTaskStatus({
        from: "TRASH",
        to: "TODO",
        isProjectOwner: true,
      });
      expect(result).toBe(false);
    });

    it("ARCHIVED cannot transition to any status", () => {
      const result = canTransitionTaskStatus({
        from: "ARCHIVED",
        to: "TODO",
        isProjectOwner: true,
      });
      expect(result).toBe(false);
    });
  });

  describe("getAllowedTaskTransitions", () => {
    it("returns all transitions from TODO", () => {
      const result = getAllowedTaskTransitions({
        from: "TODO",
        isProjectOwner: false,
      });
      expect(result).toContain("IN_PROGRESS");
      expect(result).toContain("BLOCKED");
      expect(result).toContain("TRASH");
    });

    it("returns all transitions from IN_PROGRESS", () => {
      const result = getAllowedTaskTransitions({
        from: "IN_PROGRESS",
        isProjectOwner: false,
      });
      expect(result).toContain("BLOCKED");
      expect(result).toContain("TRASH");
      expect(result).toContain("TODO");
      expect(result).toContain("IN_REVIEW");
    });

    it("returns empty array from VALIDATED", () => {
      const result = getAllowedTaskTransitions({
        from: "VALIDATED",
        isProjectOwner: false,
      });
      expect(result).toHaveLength(0);
    });

    it("returns IN_REVIEW transitions for project owner", () => {
      const result = getAllowedTaskTransitions({
        from: "IN_REVIEW",
        isProjectOwner: true,
      });
      expect(result).toContain("TRASH");
      expect(result).toContain("IN_PROGRESS");
      expect(result).toContain("VALIDATED");
    });

    it("returns empty array from IN_REVIEW for non-owner", () => {
      const result = getAllowedTaskTransitions({
        from: "IN_REVIEW",
        isProjectOwner: false,
      });
      expect(result).toHaveLength(0);
    });

    it("returns empty array from TRASH", () => {
      const result = getAllowedTaskTransitions({
        from: "TRASH",
        isProjectOwner: true,
      });
      expect(result).toHaveLength(0);
    });

    it("returns empty array from ARCHIVED", () => {
      const result = getAllowedTaskTransitions({
        from: "ARCHIVED",
        isProjectOwner: true,
      });
      expect(result).toHaveLength(0);
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

    it("returns false for IN_REVIEW", () => {
      expect(canDeleteTaskByStatus("IN_REVIEW")).toBe(false);
    });

    it("returns false for VALIDATED", () => {
      expect(canDeleteTaskByStatus("VALIDATED")).toBe(false);
    });

    it("returns false for ARCHIVED", () => {
      expect(canDeleteTaskByStatus("ARCHIVED")).toBe(false);
    });
  });
});
