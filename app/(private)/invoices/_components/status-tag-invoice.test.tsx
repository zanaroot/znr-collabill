import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusTagInvoice } from "@/app/(private)/invoices/_components/status-tag-invoice";

describe("StatusTagInvoice", () => {
  it("renders DRAFT status with geekblue color", () => {
    render(<StatusTagInvoice status="DRAFT" />);

    const tag = screen.getByText("DRAFT");
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass("ant-tag-geekblue");
  });

  it("renders VALIDATED status with processing color", () => {
    render(<StatusTagInvoice status="VALIDATED" />);

    const tag = screen.getByText("VALIDATED");
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass("ant-tag-processing");
  });

  it("renders PAID status with success color", () => {
    render(<StatusTagInvoice status="PAID" />);

    const tag = screen.getByText("PAID");
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass("ant-tag-success");
  });

  it("applies custom className", () => {
    render(<StatusTagInvoice status="DRAFT" />);

    const tag = screen.getByText("DRAFT");
    expect(tag).toHaveClass("mt-2");
    expect(tag).toHaveClass("border-none");
    expect(tag).toHaveClass("px-3");
    expect(tag).toHaveClass("py-1");
    expect(tag).toHaveClass("font-semibold");
    expect(tag).toHaveClass("no-print");
    expect(tag).toHaveClass("text-center");
  });
});
