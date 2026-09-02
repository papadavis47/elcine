export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "elcine.theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function prefersDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

// Nothing is stored on the first launch, so the app opens in whichever mode
// the OS is set to. After that the stored choice wins and stops tracking it.
export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Storage is unreadable; fall through to the OS preference.
  }
  return prefersDark() ? "dark" : "light";
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The theme is a convenience; losing it is not worth an error.
  }
}

// Every color in App.css hangs off `:root` and `.dark`, so the whole palette
// swaps on this one class.
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
