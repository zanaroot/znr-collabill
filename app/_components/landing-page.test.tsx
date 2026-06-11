import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import LandingPage from "@/app/_components/landing-page";
import { ThemeProvider } from "@/app/_components/theme-provider";

const renderWithProviders = (ui: ReactNode) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe("LandingPage", () => {
  it("renders main title", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText(/Manage Projects/)).toBeInTheDocument();
  });

  it("renders Get Started button", () => {
    renderWithProviders(<LandingPage />);

    expect(
      screen.getByRole("link", { name: /Get Started/i }),
    ).toBeInTheDocument();
  });

  it("renders Sign In button", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByRole("link", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("renders Kanban card", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText("Kanban Project Management")).toBeInTheDocument();
  });

  it("renders Collaborator Control card", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText("Collaborator Control")).toBeInTheDocument();
  });

  it("renders Automatic Billing card", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText("Automatic Billing")).toBeInTheDocument();
  });

  it("renders How CollaBill Works section", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText(/How CollaBill works/i)).toBeInTheDocument();
  });

  it("renders Create your account button", () => {
    renderWithProviders(<LandingPage />);

    expect(
      screen.getByRole("button", { name: /Create your account/i }),
    ).toBeInTheDocument();
  });

  it("renders footer with current year", () => {
    renderWithProviders(<LandingPage />);

    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year} CollaBill — All rights reserved`),
    ).toBeInTheDocument();
  });
});
