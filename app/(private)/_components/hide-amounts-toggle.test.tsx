import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmountDisplay } from "@/app/(private)/_components/amount-display";
import {
  AmountsVisibilityProvider,
  useAmountsVisibility,
} from "@/app/(private)/_components/amounts-visibility-provider";
import { HideAmountsToggle } from "@/app/(private)/_components/hide-amounts-toggle";

const Probe = () => {
  const { hidden } = useAmountsVisibility();
  return (
    <div>
      <span data-testid="state">{hidden ? "hidden" : "visible"}</span>
      <span data-testid="amount">
        <AmountDisplay>500 €</AmountDisplay>
      </span>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <AmountsVisibilityProvider>
      <HideAmountsToggle />
      <Probe />
    </AmountsVisibilityProvider>,
  );

describe("HideAmountsToggle", () => {
  it("hides amounts by default and shows them when toggled", () => {
    renderWithProvider();

    const amount = screen.getByTestId("amount");
    expect(screen.getByText("••••")).toBeInTheDocument();
    expect(amount.querySelector(".print\\:hidden")).toBeInTheDocument();
    expect(screen.getByTestId("state")).toHaveTextContent("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Show amounts" }));

    expect(screen.queryByText("••••")).not.toBeInTheDocument();
    expect(amount.querySelector(".print\\:hidden")).not.toBeInTheDocument();
    expect(amount).toHaveTextContent("500 €");
    expect(screen.getByTestId("state")).toHaveTextContent("visible");

    fireEvent.click(screen.getByRole("button", { name: "Hide amounts" }));

    expect(screen.getByText("••••")).toBeInTheDocument();
    const mask = amount.querySelector(".print\\:hidden");
    const printOnly = amount.querySelector(".hidden");
    expect(mask).toBeInTheDocument();
    expect(printOnly).toHaveTextContent("500 €");
    expect(screen.getByTestId("state")).toHaveTextContent("hidden");
  });

  it("reflects state via aria-pressed", () => {
    renderWithProvider();

    const button = screen.getByRole("button", { name: "Show amounts" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Hide amounts" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
