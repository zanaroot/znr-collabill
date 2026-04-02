import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "@/app/_components/landing-page";

describe("LandingPage", () => {
  it("renders main title", () => {
    render(<LandingPage />);

    expect(screen.getByText(/Manage Projects/)).toBeInTheDocument();
  });

  it("renders Get Started button", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("link", { name: /Get Started/i }),
    ).toBeInTheDocument();
  });

  it("renders Sign In button", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("renders Kanban card", () => {
    render(<LandingPage />);

    expect(screen.getByText("Kanban Project Management")).toBeInTheDocument();
  });

  it("renders Collaborator Control card", () => {
    render(<LandingPage />);

    expect(screen.getByText("Collaborator Control")).toBeInTheDocument();
  });

  it("renders Automatic Billing card", () => {
    render(<LandingPage />);

    expect(screen.getByText("Automatic Billing")).toBeInTheDocument();
  });

  it("renders How CollaBill Works section", () => {
    render(<LandingPage />);

    expect(screen.getByText("How CollaBill Works")).toBeInTheDocument();
  });

  it("renders Create your account button", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("link", { name: /Create your account/i }),
    ).toBeInTheDocument();
  });

  it("renders footer with current year", () => {
    render(<LandingPage />);

    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year} CollaBill — All rights reserved`),
    ).toBeInTheDocument();
  });
});
