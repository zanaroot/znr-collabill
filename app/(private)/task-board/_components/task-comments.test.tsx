import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskComments } from "./task-comments";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("TaskComments", () => {
  it("renders nothing when no taskId", () => {
    const { container } = render(<TaskComments taskId={null} />, {
      wrapper: createWrapper(),
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders loading state initially when taskId is provided", () => {
    render(<TaskComments taskId="some-uuid" />, { wrapper: createWrapper() });
    expect(document.querySelector(".ant-spin")).toBeInTheDocument();
  });
});
