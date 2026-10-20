import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("flips the theme on click and remembers it", async () => {
    localStorage.setItem("elcine.theme", "light");
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("elcine.theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("flips the theme on Ctrl+T", async () => {
    localStorage.setItem("elcine.theme", "dark");
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(document.documentElement).toHaveClass("dark");

    await user.keyboard("{Control>}t{/Control}");

    expect(document.documentElement).not.toHaveClass("dark");
  });
});
