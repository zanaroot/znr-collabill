import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { InviteUserModal } from "@/app/(private)/team-management/_components/invite-user-modal";
import type { AuthUser } from "@/http/models/auth.model";

vi.mock("@/packages/hono", () => ({
  client: {
    api: {
      users: {
        invitations: {
          $post: vi.fn(() =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ message: "Invited" }),
            }),
          ),
        },
      },
    },
  },
}));

vi.mock("../_hooks/use-team", () => ({
  useCurrentUser: vi.fn(),
}));

import { useCurrentUser } from "../_hooks/use-team";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createMockUser = (
  role: "OWNER" | "ADMIN" | "COLLABORATOR",
): AuthUser => ({
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  avatar: null,
  organizationId: "org-1",
  organizationName: "Test Org",
  organizationRole: role,
});

describe("InviteUserModal permissions", () => {
  it("renders invite button for OWNER role", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: createMockUser("OWNER"),
      isLoading: false,
    });

    render(<InviteUserModal />, { wrapper: createWrapper() });
    expect(screen.getAllByText("Invite User").length).toBeGreaterThan(0);
  });

  it("renders invite button for ADMIN role", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: createMockUser("ADMIN"),
      isLoading: false,
    });

    render(<InviteUserModal />, { wrapper: createWrapper() });
    expect(screen.getAllByText("Invite User").length).toBeGreaterThan(0);
  });

  it("does not render for COLLABORATOR role", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: createMockUser("COLLABORATOR"),
      isLoading: false,
    });

    const { container } = render(<InviteUserModal />, {
      wrapper: createWrapper(),
    });
    expect(container).toBeEmptyDOMElement();
  });
});
