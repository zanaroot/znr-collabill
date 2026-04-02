import { act, render, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/app/_components/theme-provider";
import { useTheme } from "@/app/_hooks/use-theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.body.classList.remove("light", "dark");
});

describe("useTheme", () => {
  it("throws error when used outside ThemeProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within a ThemeProvider");

    consoleError.mockRestore();
  });

  it("returns theme context when used within ThemeProvider", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBeDefined();
    expect(result.current.setTheme).toBeDefined();
    expect(result.current.toggleTheme).toBeDefined();
  });

  it("default theme is light", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe("light");
  });

  it("setTheme updates the theme", async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    await waitFor(() => {
      expect(result.current.theme).toBe("light");
    });

    await act(async () => {
      result.current.setTheme("dark");
    });

    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
    });
  });

  it("toggleTheme switches between light and dark", async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    await waitFor(() => {
      expect(result.current.theme).toBe("light");
    });

    await act(async () => {
      result.current.toggleTheme();
    });

    await waitFor(() => {
      expect(result.current.theme).toBe("dark");
    });

    await act(async () => {
      result.current.toggleTheme();
    });

    await waitFor(() => {
      expect(result.current.theme).toBe("light");
    });
  });
});

describe("ThemeProvider", () => {
  it("renders children", () => {
    const { container } = render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>,
    );

    expect(container.textContent).toBe("Test Child");
  });

  it("applies theme to document", async () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });
});
