import { render, screen } from "@testing-library/react";
import { App } from "antd";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/app/(private)/projects/_hooks/use-projects", () => ({
  useAddProjectMember: () => ({ mutateAsync: vi.fn() }),
  useMemberProjects: () => ({ data: [] }),
  useProjects: () => ({ data: [] }),
  useRemoveProjectMember: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/app/(private)/team-management/_hooks/use-team", () => ({
  useCurrentUser: () => ({ data: undefined }),
}));

import { DetailMembers } from "./detail-mebers";

const renderDetails = (phoneNumber: string | null) =>
  render(
    <App>
      <DetailMembers
        open
        onClose={vi.fn()}
        member={{
          id: "user-1",
          name: "John Doe",
          email: "john@example.com",
          avatar: null,
          phoneNumber,
          createdAt: null,
          role: "COLLABORATOR",
          joinedAt: null,
          emailVerified: null,
        }}
      />
    </App>,
  );

describe("DetailMembers phone number", () => {
  it("shows a provided phone number", () => {
    renderDetails("+261 34 12 345 67");

    expect(screen.getByText("+261 34 12 345 67")).toBeInTheDocument();
  });

  it("shows a fallback when no phone number is provided", () => {
    renderDetails(null);

    expect(screen.getByText("Not provided")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });
});
