import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Email } from "./email";

const clipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);

const mockClipboard = (writeText: ReturnType<typeof vi.fn>) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
};

const renderEmail = () =>
  render(
    <App>
      <Email email="long-address-that-wraps@example.com" />
    </App>,
  );

afterEach(() => {
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

describe("Email", () => {
  it("copies the address and confirms success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);

    renderEmail();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy long-address-that-wraps@example.com",
      }),
    );

    expect(writeText).toHaveBeenCalledWith(
      "long-address-that-wraps@example.com",
    );
    expect(
      await screen.findByText("Email address copied to clipboard"),
    ).toBeInTheDocument();
  });

  it("reports clipboard failures without showing a success message", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    mockClipboard(writeText);

    renderEmail();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy long-address-that-wraps@example.com",
      }),
    );

    expect(
      await screen.findByText(
        "Unable to copy the email address. Check clipboard permissions and try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Email address copied to clipboard"),
    ).not.toBeInTheDocument();
  });

  it("wraps long addresses and keeps the copy control visible", () => {
    mockClipboard(vi.fn());
    renderEmail();

    expect(screen.getByText("long-address-that-wraps@example.com")).toHaveStyle(
      {
        overflowWrap: "anywhere",
      },
    );
    expect(
      screen.getByRole("button", {
        name: "Copy long-address-that-wraps@example.com",
      }),
    ).toHaveStyle({ flexShrink: "0" });
  });
});
