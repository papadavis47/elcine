import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// No Tauri runtime under jsdom: every backend call goes through `invoke`, so
// tests stub that one function. `convertFileSrc` just needs a stable URL.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: (path: string) => `asset://localhost/${path}`,
}));

// Radix measures some controls (Checkbox) with ResizeObserver, which jsdom
// lacks. Nothing here depends on real sizes, so a no-op is enough.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.clearAllMocks();
});
