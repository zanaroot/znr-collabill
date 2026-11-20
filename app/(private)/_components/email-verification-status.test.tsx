import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import { describe, expect, it, vi } from "vitest";
import { EmailVerificationStatus } from "@/app/(private)/_components/email-verification-status";

describe("EmailVerificationStatus", () => {
  it("allows the email owner to open the verification modal", () => {
    render(
      <App>
        <EmailVerificationStatus
          email="owner@example.com"
          emailVerified={null}
          canVerify
          onVerify={vi.fn().mockResolvedValue(undefined)}
        />
      </App>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Verify email address" }),
    );

    expect(screen.getByText("Email verification")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send verification link" }),
    ).toBeInTheDocument();
  });

  it("shows only the unverified tooltip for another user's email", async () => {
    render(
      <App>
        <EmailVerificationStatus
          email="member@example.com"
          emailVerified={null}
          canVerify={false}
          onVerify={vi.fn()}
        />
      </App>,
    );

    const warning = screen.getByLabelText("Email not verified");
    fireEvent.mouseEnter(warning);
    fireEvent.click(warning);

    expect(await screen.findByText("Email not verified")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Verify email address" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Email verification")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText("Send verification link"),
      ).not.toBeInTheDocument();
    });
  });
});
