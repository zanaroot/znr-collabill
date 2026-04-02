import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type RawTaskSummary,
  TaskSummaryTable,
} from "@/app/(private)/invoices/_components/task-summary-table";

describe("TaskSummaryTable", () => {
  const mockData: RawTaskSummary[] = [
    {
      userId: "user-1",
      userName: "John Doe",
      projectId: "project-1",
      projectName: "Project A",
      projectBaseRate: "1.5",
      size: "M",
      taskCount: 5,
      rateXs: "10",
      rateS: "20",
      rateM: "30",
      rateL: "40",
      rateXl: "50",
    },
    {
      userId: "user-1",
      userName: "John Doe",
      projectId: "project-1",
      projectName: "Project A",
      projectBaseRate: "1.5",
      size: "S",
      taskCount: 3,
      rateXs: "10",
      rateS: "20",
      rateM: "30",
      rateL: "40",
      rateXl: "50",
    },
  ];

  it("renders table with data", () => {
    render(<TaskSummaryTable data={mockData} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Project A")).toBeInTheDocument();
  });

  it("renders size columns", () => {
    render(<TaskSummaryTable data={mockData} />);

    expect(screen.getByText("XS")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByText("XL")).toBeInTheDocument();
  });

  it("renders total column", () => {
    render(<TaskSummaryTable data={mockData} />);

    expect(screen.getByText("Total (€)")).toBeInTheDocument();
  });

  it("aggregates task counts for same user and project", () => {
    render(<TaskSummaryTable data={mockData} />);

    // Should show S: 3 and M: 5, not multiple rows
    const rows = document.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(1);
  });

  it("calculates total correctly", () => {
    render(<TaskSummaryTable data={mockData} />);

    // M: 5 * 30 * 1.5 = 225, S: 3 * 20 * 1.5 = 90, Total = 315
    expect(screen.getByText(/315/)).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    render(<TaskSummaryTable data={[]} />);

    // Ant Design Table renders empty text row
    const emptyTexts = screen.getAllByText(/No data/);
    expect(emptyTexts.length).toBeGreaterThan(0);
  });

  it("handles different users and projects as separate rows", () => {
    const mixedData: RawTaskSummary[] = [
      {
        userId: "user-1",
        userName: "John",
        projectId: "project-1",
        projectName: "Project A",
        projectBaseRate: "1",
        size: "M",
        taskCount: 2,
        rateXs: "10",
        rateS: "20",
        rateM: "30",
        rateL: "40",
        rateXl: "50",
      },
      {
        userId: "user-2",
        userName: "Jane",
        projectId: "project-2",
        projectName: "Project B",
        projectBaseRate: "1",
        size: "L",
        taskCount: 1,
        rateXs: "10",
        rateS: "20",
        rateM: "30",
        rateL: "40",
        rateXl: "50",
      },
    ];

    render(<TaskSummaryTable data={mixedData} />);

    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("Project A")).toBeInTheDocument();
    expect(screen.getByText("Project B")).toBeInTheDocument();
  });
});
