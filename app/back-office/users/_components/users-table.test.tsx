import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsersTable } from "./users-table";

const mocks = vi.hoisted(() => ({
  usersGet: vi.fn(),
  userDelete: vi.fn(),
}));

vi.mock("@/packages/hono", () => ({
  client: {
    api: {
      "back-office": {
        users: {
          $get: mocks.usersGet,
          ":userId": { $delete: mocks.userDelete },
        },
      },
    },
  },
}));

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Alex Example",
  email: "alex@example.com",
  platformRole: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  organizationCount: 2,
};

const response = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <App>{children}</App>
    </QueryClientProvider>
  );
};

describe("UsersTable deletion", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a confirmation with the selected user's name and email", async () => {
    mocks.usersGet.mockResolvedValue(response({ rows: [user], total: 1 }));
    render(<UsersTable />, { wrapper: createWrapper() });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete Alex Example (alex@example.com)",
      }),
    );

    expect(await screen.findAllByText("Delete user")).not.toHaveLength(0);
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          !!element.textContent?.includes("alex@example.com"),
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Delete user")).toBeNull());
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });

  it("deletes the user and refreshes the list after confirmation", async () => {
    mocks.usersGet
      .mockResolvedValueOnce(response({ rows: [user], total: 1 }))
      .mockResolvedValue(response({ rows: [], total: 0 }));
    mocks.userDelete.mockResolvedValue(
      response({ success: true, message: "User deleted" }),
    );
    render(<UsersTable />, { wrapper: createWrapper() });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete Alex Example (alex@example.com)",
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Delete user" }));

    await waitFor(() => expect(mocks.userDelete).toHaveBeenCalledOnce());
    expect(mocks.userDelete).toHaveBeenCalledWith({
      param: { userId: user.id },
    });
    expect(await screen.findByText("User deleted")).toBeInTheDocument();
    await waitFor(() => expect(mocks.usersGet).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: "Delete Alex Example (alex@example.com)",
        }),
      ).toBeNull(),
    );
  });

  it("keeps the confirmation open and displays API errors", async () => {
    mocks.usersGet.mockResolvedValue(response({ rows: [user], total: 1 }));
    mocks.userDelete.mockResolvedValue(
      response(
        { error: "User cannot be deleted while invoices exist" },
        false,
        409,
      ),
    );
    render(<UsersTable />, { wrapper: createWrapper() });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete Alex Example (alex@example.com)",
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Delete user" }));

    expect(
      await screen.findByText("User cannot be deleted while invoices exist"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Delete user")).not.toHaveLength(0);
    expect(screen.getAllByText("Alex Example")).not.toHaveLength(0);
  });
});
