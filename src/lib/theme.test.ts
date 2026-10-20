import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, loadTheme, saveTheme } from "./theme";

function mockOsPrefersDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: dark } as MediaQueryList),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadTheme", () => {
  it("follows the OS on first launch", () => {
    mockOsPrefersDark(true);
    expect(loadTheme()).toBe("dark");
    mockOsPrefersDark(false);
    expect(loadTheme()).toBe("light");
  });

  it("prefers a stored choice over the OS", () => {
    mockOsPrefersDark(true);
    saveTheme("light");
    expect(loadTheme()).toBe("light");
  });

  it("ignores a garbage stored value", () => {
    mockOsPrefersDark(true);
    localStorage.setItem("elcine.theme", "sepia");
    expect(loadTheme()).toBe("dark");
  });

  it("falls back to the OS when storage throws", () => {
    mockOsPrefersDark(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadTheme()).toBe("dark");
  });

  it("defaults to light when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(loadTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  it("toggles the dark class on <html>", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveClass("dark");
    applyTheme("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
