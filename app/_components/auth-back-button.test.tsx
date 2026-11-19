import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthBackButton } from "./auth-back-button";

const { navigation, router } = vi.hoisted(() => ({
  navigation: { pathname: "/sign-in" },
  router: { back: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => router,
}));

describe("AuthBackButton", () => {
  beforeEach(() => {
    navigation.pathname = "/sign-in";
    router.back.mockReset();
    router.push.mockReset();
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "",
    });
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 2,
    });
    window.history.replaceState({}, "", "/");
  });

  it("returns to the previous safe authentication page", () => {
    const { rerender } = render(<AuthBackButton />);

    navigation.pathname = "/forgot-password";
    rerender(<AuthBackButton />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("returns to the homepage when opened without a safe previous page", () => {
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    });
    render(<AuthBackButton />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.push).toHaveBeenCalledWith("/");
    expect(router.back).not.toHaveBeenCalled();
  });

  it("returns to a safe same-origin referrer", () => {
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: `${window.location.origin}/pricing`,
    });
    render(<AuthBackButton />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("does not navigate back to a protected referrer", () => {
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: `${window.location.origin}/dashboard`,
    });
    render(<AuthBackButton />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.push).toHaveBeenCalledWith("/");
    expect(router.back).not.toHaveBeenCalled();
  });
});
