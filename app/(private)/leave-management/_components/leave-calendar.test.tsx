import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LeaveCalendar } from "./leave-calendar";

vi.mock("@/packages/hono", () => {
  const ok = (data: unknown) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

  return {
    client: {
      api: {
        "leave-requests": {
          my: { $get: () => ok([]) },
        },
        presence: {
          my: { $get: () => ok([]) },
          all: { $get: () => ok([]) },
        },
        users: {
          all: { $get: () => ok([]) },
        },
      },
    },
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <App>{children}</App>
    </QueryClientProvider>
  );
};

const clickFirstCell = () => {
  const cells = document.querySelectorAll(".ant-picker-cell-inner");
  expect(cells.length).toBeGreaterThan(0);
  fireEvent.click(cells[0]);
};

describe("LeaveCalendar cell click", () => {
  it("opens the manage presence modal from the team calendar", async () => {
    render(<LeaveCalendar onRequestLeave={vi.fn()} isAdmin />, {
      wrapper: createWrapper(),
    });

    fireEvent.click(await screen.findByText("Team Calendar"));

    clickFirstCell();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Mark presence")).toBeInTheDocument();
  });

  it("keeps my calendar view free of the modal", async () => {
    render(<LeaveCalendar onRequestLeave={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await screen.findByText("Request Leave");

    clickFirstCell();

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
