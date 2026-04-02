import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type PresenceSummary,
  PresenceSummaryTable,
} from "@/app/(private)/invoices/_components/presence-summary-table";

describe("PresenceSummaryTable", () => {
  const mockData: PresenceSummary[] = [
    {
      userId: "user-1",
      userName: "John Doe",
      dailyRate: "100",
      presenceCount: 10,
    },
    {
      userId: "user-2",
      userName: "Jane Smith",
      dailyRate: "150",
      presenceCount: 8,
    },
  ];

  it("renders table with data", () => {
    render(<PresenceSummaryTable data={mockData} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<PresenceSummaryTable data={mockData} />);

    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("Presence Count")).toBeInTheDocument();
    expect(screen.getByText("Daily Rate")).toBeInTheDocument();
    expect(screen.getByText("Total (Theoretical)")).toBeInTheDocument();
  });

  it("renders presence count with days unit", () => {
    render(<PresenceSummaryTable data={mockData} />);

    expect(screen.getByText("10 days")).toBeInTheDocument();
    expect(screen.getByText("8 days")).toBeInTheDocument();
  });

  it("renders daily rate formatted with euro", () => {
    render(<PresenceSummaryTable data={mockData} />);

    expect(screen.getByText("100 €")).toBeInTheDocument();
    expect(screen.getByText("150 €")).toBeInTheDocument();
  });

  it("calculates total correctly", () => {
    render(<PresenceSummaryTable data={mockData} />);

    // John: 10 * 100 = 1000, Jane: 8 * 150 = 1200
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
    expect(screen.getByText(/1,200/)).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    render(<PresenceSummaryTable data={[]} />);

    // Ant Design Table renders empty text
    const emptyTexts = screen.getAllByText(/No data/);
    expect(emptyTexts.length).toBeGreaterThan(0);
  });

  it("handles null daily rate", () => {
    const dataWithNull: PresenceSummary[] = [
      {
        userId: "user-1",
        userName: "John Doe",
        dailyRate: null,
        presenceCount: 5,
      },
    ];

    render(<PresenceSummaryTable data={dataWithNull} />);

    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText("0 €")).toBeInTheDocument();
  });

  it("handles zero presence count", () => {
    const dataWithZero: PresenceSummary[] = [
      {
        userId: "user-1",
        userName: "John Doe",
        dailyRate: "100",
        presenceCount: 0,
      },
    ];

    render(<PresenceSummaryTable data={dataWithZero} />);

    expect(screen.getByText("0 days")).toBeInTheDocument();
    expect(screen.getByText("0 €")).toBeInTheDocument();
  });
});
