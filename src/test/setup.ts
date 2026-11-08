import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";

// Animations would leave elements mid-transition (and exits pending) under
// jsdom; jump straight to end states.
MotionGlobalConfig.skipAnimations = true;

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

// Motion's whileInView needs IntersectionObserver, which jsdom lacks. Cards
// never report "in view"; tests only check content, not opacity.
globalThis.IntersectionObserver ??= class {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.clearAllMocks();
});
