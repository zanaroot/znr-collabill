import { describe, expect, it } from "vitest";
import {
  createTaskSchema,
  TASK_SIZES,
  TASK_STATUSES,
  taskSchema,
  updateTaskSchema,
} from "@/http/models/task.model";

describe("task model schemas", () => {
  describe("taskSchema", () => {
    it("parses valid task object", () => {
      const validTask = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "Test Task",
        description: "Test description",
        size: "M",
        priority: 1,
        dueDate: "2024-06-15",
        assignedTo: "123e4567-e89b-12d3-a456-426614174002",
        status: "TODO",
        validatedAt: null,
        validatedBy: null,
        gitRepo: "",
        gitBranch: null,
        gitPullRequest: null,
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = taskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it("rejects task with invalid UUID for id", () => {
      const invalidTask = {
        id: "invalid-uuid",
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "Test Task",
        size: "M",
        status: "TODO",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = taskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it("rejects task with empty title", () => {
      const invalidTask = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "",
        size: "M",
        status: "TODO",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = taskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it("rejects task with invalid size", () => {
      const invalidTask = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "Test Task",
        size: "INVALID",
        status: "TODO",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = taskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it("rejects task with invalid status", () => {
      const invalidTask = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "Test Task",
        size: "M",
        status: "INVALID",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = taskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
    });

    it("accepts optional fields as null", () => {
      const taskWithNulls = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "Test Task",
        size: "M",
        status: "TODO",
        description: null,
        priority: null,
        dueDate: null,
        assignedTo: null,
        validatedAt: null,
        validatedBy: null,
        gitRepo: null,
        gitBranch: null,
        gitPullRequest: null,
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = taskSchema.safeParse(taskWithNulls);
      expect(result.success).toBe(true);
    });

    it("accepts empty string for gitRepo", () => {
      const task = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "Test Task",
        size: "M",
        status: "TODO",
        gitRepo: "",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = taskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("rejects invalid URL for gitRepo", () => {
      const task = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "Test Task",
        size: "M",
        status: "TODO",
        gitRepo: "not-a-url",
        createdAt: "2024-01-01T00:00:00Z",
      };

      const result = taskSchema.safeParse(task);
      expect(result.success).toBe(false);
    });
  });

  describe("createTaskSchema", () => {
    it("parses valid create task input", () => {
      const validInput = {
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "New Task",
        description: "Task description",
        size: "L",
        priority: 2,
        dueDate: "2024-06-15",
        assignedTo: "123e4567-e89b-12d3-a456-426614174002",
        status: "TODO",
      };

      const result = createTaskSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("allows optional description", () => {
      const input = {
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "New Task",
        size: "S",
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("allows null for optional date fields", () => {
      const input = {
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "New Task",
        size: "M",
        dueDate: null,
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects missing required projectId", () => {
      const input = {
        title: "New Task",
        size: "M",
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing required title", () => {
      const input = {
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        size: "M",
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid status in create", () => {
      const input = {
        projectId: "123e4567-e89b-12d3-a456-426614174001",
        title: "New Task",
        size: "M",
        status: "INVALID",
      };

      const result = createTaskSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("updateTaskSchema", () => {
    it("parses valid update input with partial fields", () => {
      const validInput = {
        title: "Updated Title",
      };

      const result = updateTaskSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("allows empty object for full update", () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("allows updating multiple fields", () => {
      const input = {
        title: "New Title",
        description: "New description",
        size: "XL",
        priority: 5,
        status: "IN_PROGRESS",
      };

      const result = updateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("allows null for clearing nullable fields", () => {
      const input = {
        title: "Test",
        dueDate: null,
        assignedTo: null,
      };

      const result = updateTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("TASK_SIZES", () => {
    it("contains expected sizes", () => {
      expect(TASK_SIZES).toEqual(["XS", "S", "M", "L", "XL"]);
    });
  });

  describe("TASK_STATUSES", () => {
    it("contains expected statuses", () => {
      expect(TASK_STATUSES).toEqual([
        "TODO",
        "IN_PROGRESS",
        "IN_REVIEW",
        "VALIDATED",
        "BLOCKED",
        "TRASH",
        "ARCHIVED",
      ]);
    });
  });
});
