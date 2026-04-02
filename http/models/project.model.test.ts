import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  projectSchema,
  updateProjectSchema,
} from "@/http/models/project.model";

describe("project model schemas", () => {
  describe("projectSchema", () => {
    it("parses valid project object", () => {
      const validProject = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Project",
        description: "A test project",
        gitRepo: "https://github.com/test/repo",
        baseRate: 100,
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        createdBy: "123e4567-e89b-12d3-a456-426614174002",
        createdAt: "2024-01-01",
      };

      const result = projectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it("rejects project with invalid UUID for id", () => {
      const invalidProject = {
        id: "invalid-uuid",
        name: "Test Project",
        baseRate: 100,
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01",
      };

      const result = projectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it("rejects project with empty name", () => {
      const invalidProject = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "",
        baseRate: 100,
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01",
      };

      const result = projectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it("rejects project with invalid URL for gitRepo", () => {
      const invalidProject = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Project",
        gitRepo: "not-a-url",
        baseRate: 100,
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01",
      };

      const result = projectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it("accepts null for optional fields", () => {
      const projectWithNulls = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Project",
        description: null,
        gitRepo: null,
        baseRate: 100,
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        createdBy: null,
        createdAt: "2024-01-01",
      };

      const result = projectSchema.safeParse(projectWithNulls);
      expect(result.success).toBe(true);
    });

    it("handles empty string for gitRepo (requires URL or null)", () => {
      const project = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Project",
        gitRepo: "",
        baseRate: 100,
        organizationId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01",
      };

      const result = projectSchema.safeParse(project);
      expect(result.success).toBe(false);
    });
  });

  describe("createProjectSchema", () => {
    it("parses valid create project input", () => {
      const validInput = {
        name: "New Project",
        description: "Project description",
        gitRepo: "https://github.com/test/repo",
        baseRate: 50,
      };

      const result = createProjectSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("allows optional description", () => {
      const input = {
        name: "New Project",
        baseRate: 50,
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects missing required name", () => {
      const input = {
        baseRate: 50,
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding max length", () => {
      const input = {
        name: "a".repeat(256),
        baseRate: 50,
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects negative baseRate", () => {
      const input = {
        name: "New Project",
        baseRate: -10,
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid gitRepo URL", () => {
      const input = {
        name: "New Project",
        gitRepo: "invalid-url",
        baseRate: 50,
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("allows empty string for gitRepo", () => {
      const input = {
        name: "New Project",
        gitRepo: "",
        baseRate: 50,
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("updateProjectSchema", () => {
    it("parses valid update input with partial fields", () => {
      const validInput = {
        name: "Updated Name",
      };

      const result = updateProjectSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("allows empty object", () => {
      const result = updateProjectSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("allows updating multiple fields", () => {
      const input = {
        name: "New Name",
        description: "New description",
        baseRate: 75,
      };

      const result = updateProjectSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects invalid gitRepo URL", () => {
      const input = {
        name: "Test",
        gitRepo: "not-a-url",
      };

      const result = updateProjectSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects negative baseRate", () => {
      const input = {
        baseRate: -5,
      };

      const result = updateProjectSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
